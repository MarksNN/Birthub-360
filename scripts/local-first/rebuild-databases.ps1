#requires -Version 5.1
<#
.SYNOPSIS
  Birth Hub 360 - backup verificavel e reconstrucao controlada dos bancos locais.
.DESCRIPTION
  Executa backup de prospectordb e prospectordb_test FORA do repositorio,
  testa a instalacao de migrations em banco descartavel e, SOMENTE com
  -ExecuteCutover, recria os dois bancos originais.
  Nao altera a main, workflows, volumes Docker nem arquivos .env.
  Nomes dos bancos/roles antigos permanecem por compatibilidade ate a migracao
  conjunta dos contratos de runtime, CI, roles e RLS.
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\local-first\rebuild-databases.ps1
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\local-first\rebuild-databases.ps1 -ExecuteCutover
#>
[CmdletBinding()]
param([switch]$ExecuteCutover)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$container = 'birthhub_postgres'
$bootstrapUser = 'prospector'
$databases = @('prospectordb', 'prospectordb_test')
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$validation = 'birthhub360_validation_' + $stamp
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$prisma = Join-Path $root 'node_modules\.bin\prisma.cmd'
$backupDirectory = Join-Path ([Environment]::GetFolderPath('MyDocuments')) ('Birthub360-DB-Backups\' + $stamp)
$originalDirect = $env:DIRECT_URL
$originalDatabase = $env:DATABASE_URL
$originalShadow = $env:SHADOW_DATABASE_URL
$cutoverStarted = $false

function Assert-Code([string]$description) {
    if ($LASTEXITCODE -ne 0) {
        throw ("Falha em " + $description + " (exit code " + $LASTEXITCODE + ").")
    }
}

function Sql-Scalar([string]$database, [string]$sql) {
    $result = & docker exec $container psql -X -A -t -q -U $bootstrapUser -d $database -c $sql
    Assert-Code ("SQL em " + $database)
    return (($result | Select-Object -First 1) -as [string]).Trim()
}

function Validate-Schema([string]$database) {
    $userTable = Sql-Scalar $database 'SELECT CASE WHEN to_regclass(''public."user"'') IS NOT NULL THEN 1 ELSE 0 END;'
    if ($userTable -ne '1') { throw ("Tabela public.user ausente em " + $database) }
    $migrations = Sql-Scalar $database 'SELECT COUNT(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;'
    $failed = Sql-Scalar $database 'SELECT COUNT(*) FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL;'
    if ([int]$migrations -lt 1 -or [int]$failed -ne 0) {
        throw ("Migrations invalidas em " + $database + " (aplicadas=" + $migrations + ", falhas=" + $failed + ").")
    }
    Write-Host ("OK: " + $database + " - " + $migrations + " migrations e public.user presente.") -ForegroundColor Green
}

function Apply-Migrations([string]$database, [string]$encodedPassword) {
    # Credenciais de bootstrap sao usadas SOMENTE no processo Prisma de migration.
    # Nunca usar esse superusuario como DATABASE_URL do servidor em runtime.
    $url = 'postgresql://' + $bootstrapUser + ':' + $encodedPassword + '@127.0.0.1:5434/' + $database
    $env:DIRECT_URL = $url
    $env:DATABASE_URL = $url
    & $prisma migrate deploy
    Assert-Code ("prisma migrate deploy em " + $database)
    & $prisma migrate status
    Assert-Code ("prisma migrate status em " + $database)
    Validate-Schema $database
}

function Bootstrap-RestrictedRoles([string]$database) {
    # O SQL oficial reconfigura owner e permissoes RLS por banco.
    # As senhas ficam somente dentro do container e nao sao impressas.
    $cmd = 'test -f /docker-entrypoint-initdb.d/create-app-role.sql.tpl && test -n "$APP_DB_PASSWORD" && psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -v app_password="$APP_DB_PASSWORD" -v migrator_password="$MIGRATOR_DB_PASSWORD" -f /docker-entrypoint-initdb.d/create-app-role.sql.tpl'
    & docker exec $container sh -c $cmd sh $database | Out-Null
    Assert-Code ("bootstrap de roles em " + $database)
    $roleCheck = Sql-Scalar $database "SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname='prospector_app' AND rolsuper=false AND rolbypassrls=false) THEN 1 ELSE 0 END;"
    if ($roleCheck -ne '1') { throw ("Role de aplicacao sem garantia RLS em " + $database) }
    $connectCmd = 'PGPASSWORD="$APP_DB_PASSWORD" psql -X -h 127.0.0.1 -U prospector_app -d "$1" -A -t -q -c "SELECT current_user"'
    $connectedRole = & docker exec $container sh -c $connectCmd sh $database
    Assert-Code ("teste de login da role restrita em " + $database)
    if (($connectedRole | Select-Object -First 1).Trim() -ne 'prospector_app') {
        throw ("Usuario de runtime inesperado em " + $database)
    }
}

Push-Location $root
try {
    if (-not (Test-Path $prisma)) { throw 'Prisma local nao encontrado. Rode npm ci no repositorio antes de reconstruir.' }
    & docker info --format '{{.ServerVersion}}' | Out-Null
    Assert-Code 'Docker Engine'
    $present = Sql-Scalar 'postgres' "SELECT COUNT(*) FROM pg_database WHERE datname IN ('prospectordb','prospectordb_test');"
    if ($present -ne '2') { throw 'Os dois bancos esperados nao estao presentes. Operacao interrompida.' }
    $currentUser = Sql-Scalar 'prospectordb' 'SELECT current_user;'
    if ($currentUser -ne $bootstrapUser) { throw 'Usuario administrador inesperado. Operacao interrompida.' }
    New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
    Write-Host ('Backup privado fora do repositorio: ' + $backupDirectory) -ForegroundColor Cyan

    foreach ($database in $databases) {
        $temp = '/tmp/bh360_' + $stamp + '_' + $database + '.dump'
        $destination = Join-Path $backupDirectory ($database + '.dump')
        & docker exec $container pg_dump -U $bootstrapUser -d $database -Fc -f $temp
        Assert-Code ('pg_dump de ' + $database)
        & docker exec $container pg_restore -l $temp | Out-Null
        Assert-Code ('validacao estrutural do dump de ' + $database)
        & docker exec $container pg_restore -f /dev/null $temp | Out-Null
        Assert-Code ('leitura integral do dump de ' + $database)
        & docker cp ($container + ':' + $temp) $destination
        Assert-Code ('copia do backup de ' + $database)
        & docker exec $container rm -f $temp | Out-Null
        Assert-Code ('limpeza do arquivo temporario de ' + $database)
        if ((Get-Item $destination).Length -lt 1024) {
            throw ('Backup incompleto: ' + $destination)
        }
        Write-Host ('Backup validado: ' + $database) -ForegroundColor Green
    }

    $tempGlobals = '/tmp/bh360_' + $stamp + '_globals.sql'
    & docker exec $container pg_dumpall -U $bootstrapUser --globals-only -f $tempGlobals
    Assert-Code 'backup de roles globais'
    & docker cp ($container + ':' + $tempGlobals) (Join-Path $backupDirectory 'roles-globals.sql')
    Assert-Code 'copia das roles'
    & docker exec $container rm -f $tempGlobals | Out-Null
    Assert-Code 'limpeza do arquivo temporario de roles'
    Get-ChildItem $backupDirectory -File | ForEach-Object {
        $hash = Get-FileHash -Path $_.FullName -Algorithm SHA256
        ($hash.Hash + '  ' + $_.Name)
    } | Set-Content -Path (Join-Path $backupDirectory 'SHA256.txt') -Encoding UTF8

    $password = & docker exec $container printenv POSTGRES_PASSWORD
    Assert-Code 'leitura local de credencial de bootstrap do container'
    $password = ($password | Select-Object -First 1)
    if ([string]::IsNullOrWhiteSpace($password)) { throw 'POSTGRES_PASSWORD ausente no container.' }
    $encodedPassword = [Uri]::EscapeDataString($password.Trim())
    $password = $null

    Write-Host 'Criando banco descartavel de validacao das migrations...' -ForegroundColor Cyan
    & docker exec $container createdb -U $bootstrapUser -T template0 $validation
    Assert-Code 'createdb de validacao'
    Apply-Migrations $validation $encodedPassword

    # Testar a role de aplicacao antes de qualquer bootstrap (alterar senhas globais
    # poderia interromper a aplicacao antiga se as credenciais estivessem divergentes).
    $testRoleCmd = 'PGPASSWORD="$APP_DB_PASSWORD" psql -X -h 127.0.0.1 -U prospector_app -d prospectordb -A -t -q -c "SELECT 1"'
    $login = & docker exec $container sh -c $testRoleCmd
    Assert-Code 'preflight de credencial da role de runtime'
    if (($login | Select-Object -First 1).Trim() -ne '1') { throw 'Credencial da role de runtime nao validada.' }
    $testMigratorCmd = 'test -n "$MIGRATOR_DB_PASSWORD" && PGPASSWORD="$MIGRATOR_DB_PASSWORD" psql -X -h 127.0.0.1 -U prospector_migrator -d prospectordb -A -t -q -c "SELECT 1"'
    $migratorLogin = & docker exec $container sh -c $testMigratorCmd
    Assert-Code 'preflight de credencial da role migradora'
    if (($migratorLogin | Select-Object -First 1).Trim() -ne '1') { throw 'Credencial da role migradora nao validada.' }

    # Provar que o SQL oficial de bootstrap/restricao tambem funciona num banco limpo.
    Bootstrap-RestrictedRoles $validation
    Validate-Schema $validation

    Write-Host 'Validando TypeScript e testes unitarios antes de qualquer exclusao...' -ForegroundColor Cyan
    & npm.cmd run typecheck
    Assert-Code 'typecheck'
    & npm.cmd run test:unit
    Assert-Code 'testes unitarios'

    if (-not $ExecuteCutover) {
        & docker exec $container dropdb -U $bootstrapUser --if-exists --force $validation
        Assert-Code 'limpeza do banco descartavel de validacao'
        Write-Host ('VALIDACAO CONCLUIDA. Bancos originais preservados. Backup: ' + $backupDirectory) -ForegroundColor Green
        Write-Host 'Para recriar os bancos, execute novamente com -ExecuteCutover (gera novo backup).' -ForegroundColor Yellow
        return
    }

    # Nao interromper processos conectados sem que o operador os tenha encerrado.
    $sessions = Sql-Scalar 'postgres' "SELECT COUNT(*) FROM pg_stat_activity WHERE datname IN ('prospectordb','prospectordb_test') AND pid <> pg_backend_pid();"
    if ([int]$sessions -gt 0) {
        throw ("Existem " + $sessions + " conexoes usando os bancos. Pare servidor/workers e rode novamente.")
    }

    Write-Host 'Iniciando cutover: os dois bancos serao recriados a partir de migrations.' -ForegroundColor Yellow
    $cutoverStarted = $true
    foreach ($database in $databases) {
        & docker exec $container dropdb -U $bootstrapUser --if-exists --force $database
        Assert-Code ('dropdb de ' + $database)
        & docker exec $container createdb -U $bootstrapUser -T template0 $database
        Assert-Code ('createdb de ' + $database)
        Apply-Migrations $database $encodedPassword
        Bootstrap-RestrictedRoles $database
        Validate-Schema $database
    }

    & docker exec $container dropdb -U $bootstrapUser --if-exists --force $validation
    Assert-Code 'limpeza do banco descartavel de validacao'
    Write-Host ('RECONSTRUCAO DE SCHEMA CONCLUIDA. Backup preservado em: ' + $backupDirectory) -ForegroundColor Green
    Write-Host 'ATENCAO: nao foi feito merge, deploy ou mudanca em .env. Validar smoke e integracao antes de uso.' -ForegroundColor Yellow
}
catch {
    Write-Host ('PROCESSO INTERROMPIDO: ' + $_.Exception.Message) -ForegroundColor Red
    if ($cutoverStarted) {
        Write-Host ('Um banco pode ter sido recriado parcialmente. Nao inicie a aplicacao. Backups: ' + $backupDirectory) -ForegroundColor Red
        Write-Host 'Restauracao deve usar os arquivos .dump guardados fora do repositorio; nenhum dump sera apagado.' -ForegroundColor Red
    }
    throw
}
finally {
    $env:DIRECT_URL = $originalDirect
    $env:DATABASE_URL = $originalDatabase
    $env:SHADOW_DATABASE_URL = $originalShadow
    Pop-Location
}
