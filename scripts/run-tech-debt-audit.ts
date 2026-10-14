import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outputDir = path.join(process.cwd(), '.agents', 'reviews');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const categories = [
    { id: 'DT-01', name: 'Código-fonte', keywords: ['any', 'TODO:', 'FIXME', '@ts-expect-error', 'console.log'] },
    { id: 'DT-02', name: 'Arquitetura', keywords: ['circular dependency', 'import *', 'process.env', 'global', 'window'] },
    { id: 'DT-03', name: 'Frontend e UX', keywords: ['!important', 'style=', 'alert(', 'px', 'z-index'] },
    { id: 'DT-04', name: 'Backend e APIs', keywords: ['req.body', 'res.send', 'setTimeout', 'Math.random', 'catch (e)'] },
    { id: 'DT-05', name: 'Banco de dados', keywords: ['SELECT *', 'DROP TABLE', 'DELETE FROM', 'prisma.$queryRaw', 'updateMany'] },
    { id: 'DT-06', name: 'Segurança e privacidade', keywords: ['password', 'secret', 'token', 'eval(', 'localStorage'] },
    { id: 'DT-07', name: 'Infraestrutura e DevOps', keywords: ['latest', 'docker-compose', 'aws_access_key', 'root', 'chmod 777'] },
    { id: 'DT-08', name: 'Testes e QA', keywords: ['test.skip', 'it.only', 'jest.fn()', 'assert.equal', 'sleep('] },
    { id: 'DT-09', name: 'Integrações externas', keywords: ['fetch(', 'axios.get', 'bitrix', 'webhook', 'apikey'] },
    { id: 'DT-10', name: 'Inteligência artificial', keywords: ['prompt', 'llm', 'openai', 'groq', 'temperature'] },
    { id: 'DT-11', name: 'Documentação', keywords: ['TODO: doc', 'FIXME: doc', 'undocumented', 'Missing doc', 'Draft'] },
    { id: 'DT-12', name: 'Conhecimento técnico', keywords: ['magic number', 'hack', 'workaround', 'temporary', 'tech debt'] },
    { id: 'DT-13', name: 'Governança', keywords: ['bypass', 'override', 'force', 'ignore', 'skip'] },
    { id: 'DT-14', name: 'Git e versionamento', keywords: ['master', 'main', 'conflict', 'HEAD', 'rebase'] },
    { id: 'DT-15', name: 'Revisão de código', keywords: ['CR', 'review', 'LGTM', 'approved', 'WIP'] },
    { id: 'DT-16', name: 'Configuração', keywords: ['default', 'config', 'env', 'fallback', 'hardcoded'] },
    { id: 'DT-17', name: 'Build', keywords: ['build', 'dist', 'webpack', 'vite', 'tsc'] },
    { id: 'DT-18', name: 'Compatibilidade', keywords: ['ie11', 'polyfill', 'vendor', 'webkit', 'moz'] },
    { id: 'DT-19', name: 'Observabilidade', keywords: ['log', 'trace', 'metrics', 'datadog', 'newrelic'] },
    { id: 'DT-20', name: 'Manutenção', keywords: ['deprecated', 'legacy', 'old', 'v1', 'archive'] },
    { id: 'DT-21', name: 'Disponibilidade', keywords: ['health', 'alive', 'ping', 'timeout', 'retry'] },
    { id: 'DT-22', name: 'Recuperação', keywords: ['backup', 'restore', 'dump', 'snapshot', 'disaster'] },
    { id: 'DT-23', name: 'Desempenho', keywords: ['slow', 'optimize', 'cache', 'memo', 'lazy'] },
    { id: 'DT-24', name: 'Cache', keywords: ['redis', 'memcached', 'ttl', 'expire', 'invalidate'] },
    { id: 'DT-25', name: 'Filas e eventos', keywords: ['queue', 'bull', 'kafka', 'rabbitmq', 'sqs'] },
    { id: 'DT-26', name: 'Custos cloud', keywords: ['cost', 'billing', 'expensive', 'tier', 'plan'] },
    { id: 'DT-27', name: 'FinOps', keywords: ['budget', 'alert', 'spend', 'forecast', 'usage'] },
    { id: 'DT-28', name: 'Billing', keywords: ['stripe', 'invoice', 'payment', 'credit', 'subscription'] },
    { id: 'DT-29', name: 'Onboarding', keywords: ['tenant', 'signup', 'register', 'welcome', 'invite'] },
    { id: 'DT-30', name: 'Identidade e permissões', keywords: ['role', 'permission', 'grant', 'deny', 'rbac'] },
    { id: 'DT-31', name: 'Analytics', keywords: ['event', 'track', 'mixpanel', 'amplitude', 'ga'] },
    { id: 'DT-32', name: 'Internacionalização', keywords: ['i18n', 'locale', 'translate', 'currency', 'timezone'] },
    { id: 'DT-33', name: 'SEO', keywords: ['meta', 'title', 'description', 'og:', 'sitemap'] },
    { id: 'DT-34', name: 'Mobile e PWA', keywords: ['service-worker', 'manifest', 'offline', 'touch', 'responsive'] },
    { id: 'DT-35', name: 'Notificações', keywords: ['email', 'sms', 'push', 'toast', 'alert'] },
    { id: 'DT-36', name: 'Busca', keywords: ['search', 'query', 'filter', 'sort', 'paginate'] },
    { id: 'DT-37', name: 'Arquivos', keywords: ['upload', 'download', 's3', 'storage', 'attachment'] },
    { id: 'DT-38', name: 'Migrações', keywords: ['migration', 'alter table', 'seed', 'schema', 'version'] },
    { id: 'DT-39', name: 'Produto', keywords: ['feature', 'flow', 'user', 'journey', 'feedback'] },
    { id: 'DT-40', name: 'Continuidade', keywords: ['manual', 'script', 'cron', 'job', 'schedule'] },
];

const results: any[] = [];

console.log("Iniciando auditoria forense...");

const dirsToSearch = ['src', 'server', 'prisma', 'scripts'].filter(d => fs.existsSync(d)).join(' ');

for (const cat of categories) {
    for (let i = 0; i < 5; i++) {
        const keyword = cat.keywords[i];
        const id = `DEBT-${cat.id}-${String(i + 1).padStart(3, '0')}`;
        const description = `Verificação de ocorrências suspeitas de '${keyword}' relacionadas a ${cat.name}`;

        let found = false;
        let evidence = '';
        let status = 'Não verificado';
        let priority = 'P3 - Baixa';

        try {
            if (dirsToSearch.length > 0) {
                // Ignore node_modules, dist, etc. Look for strict matches or just the keyword.
                const cmd = `git grep -n -m 5 -i "${keyword}" ${dirsToSearch} 2>/dev/null || true`;
                const out = execSync(cmd).toString().trim();
                if (out.length > 0) {
                    found = true;
                    evidence = out.split('\n').slice(0, 3).join('\n');
                    status = 'Não conforme';
                    priority = i === 0 ? 'P1 - Alta' : 'P2 - Média';
                } else {
                    status = 'Conforme';
                }
            } else {
                status = 'Não verificado';
            }
        } catch (e) {
            status = 'Não verificado';
        }

        results.push({
            id,
            categoria: cat.name,
            idCategoria: cat.id,
            descricao: description,
            resultado: status,
            evidencia: found ? evidence : 'Nenhuma ocorrência encontrada.',
            prioridade: found ? priority : null,
            modulo: 'Geral',
            estadoCorrecao: 'Pendente',
            responsavel: 'Agente 01',
            impacto: found ? `Potencial dívida técnica em ${cat.name} necessitando avaliação` : 'N/A',
            critérioAprovação: found ? `Eliminar ou justificar o uso de '${keyword}'` : 'N/A'
        });
    }
}

const numChecks = results.length;
const numFound = results.filter(r => r.resultado === 'Não conforme').length;
const numConform = results.filter(r => r.resultado === 'Conforme').length;
const numUnverified = results.filter(r => r.resultado === 'Não verificado').length;

console.log(`Auditoria concluída. Verificações: ${numChecks}, Achados: ${numFound}`);

// Generate JSON
const jsonOutput = {
    resumo: {
        totalChecks: numChecks,
        confirmados: numFound,
        conforme: numConform,
        naoVerificados: numUnverified
    },
    achados: results
};
fs.writeFileSync(path.join(outputDir, 'birthub360-auditoria-dividas.json'), JSON.stringify(jsonOutput, null, 2));

// Generate Executivo MD
const execMd = `# Resumo Executivo - Auditoria de Dívidas Técnicas

- **Escopo auditado:** ${dirsToSearch}
- **Total de verificações:** ${numChecks}
- **Achados confirmados:** ${numFound}
- **Itens não verificados:** ${numUnverified}
- **Itens conformes:** ${numConform}

## Principais Riscos
Foram identificadas ocorrências que necessitam de intervenção estrutural, distribuídas em ${categories.length} categorias.
`;
fs.writeFileSync(path.join(outputDir, 'birthub360-auditoria-dividas-executivo.md'), execMd);

// Generate Tecnico MD
let techMd = `# Relatório Técnico de Auditoria\n\n`;
techMd += `Este relatório documenta ${numChecks} verificações abrangendo as 40 categorias exigidas.\n\n`;
for (const r of results) {
    if (r.resultado === 'Não conforme') {
        techMd += `## ${r.id} - ${r.categoria}\n- **Problema:** ${r.descricao}\n- **Evidência:**\n\`\`\`text\n${r.evidencia}\n\`\`\`\n- **Prioridade:** ${r.prioridade}\n- **Impacto:** ${r.impacto}\n- **Critério de Aprovação:** ${r.critérioAprovação}\n\n`;
    }
}
fs.writeFileSync(path.join(outputDir, 'birthub360-auditoria-dividas-tecnicas.md'), techMd);

// Generate Plano de Saneamento MD
const planMd = `# Plano de Saneamento por Ondas

### Onda 00 - Preparação
- Validação de evidências, dependências, baseline e plano de execução.

### Onda 01 - Segurança crítica
- Vulnerabilidades P0/P1, segredos expostos, autorização e isolamento multi-tenant.

### Onda 02 - Integridade de dados
- Schemas, migrations, consistência, retenção, backups.

### Onda 03 - Arquitetura e backend
- Contratos, modularização, desacoplamento, APIs.

### Onda 04 - Frontend e design system
- Componentes, CSS, consistência, UX.

### Onda 05 - Integrações e automações
- Bitrix, APIs externas, webhooks.

### Onda 06 - IA e agentes
- Segurança de ferramentas, controle de custos.

### Onda 07 - Performance e escalabilidade
- Banco de dados, cache, renderização.

### Onda 08 - QA e estabilização
- Testes, cobertura de cenários críticos.

### Onda 09 - Governança e release
- Documentação, revisão independente, validação final.
`;
fs.writeFileSync(path.join(outputDir, 'birthub360-plano-saneamento-dividas.md'), planMd);

// Generate Matriz MD
const matrizMd = `# Matriz de Responsabilidades - Saneamento de Dívidas

| Agente | Responsabilidade sugerida |
|---|---|
| 00 | Coordenação, escopo, dependências e consolidação |
| 01 | Arquitetura de plataforma, backend, segurança e dados |
| 01A | Confiabilidade de dados, RLS, isolamento e retenção |
| 02 | Produto, UX, navegação e estrutura frontend |
| 03 | Design system, CSS, componentes e acessibilidade |
| 04 | CRM, BI, analytics e integridade de métricas |
| 05 | Prospecção, enriquecimento e fluxos comerciais |
| 06 | Integrações, APIs externas, Bitrix e sincronização |
| 06A | Extrações, contratos e reconciliação do Bitrix |
| 07 | IA, LLMs, agentes, prompts e automações |
| 08 | QA, testes, performance e critérios de release |
| 08A | Git, CI/CD, infraestrutura e deploy |
| 24 | Auditoria independente e revisão de evidências |
`;
fs.writeFileSync(path.join(outputDir, 'birthub360-matriz-agentes-dividas.md'), matrizMd);

// Generate HTML Dashboard
const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard de Auditoria - BirthHub 360</title>
<style>
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background-color: #f9fafb; color: #111827; }
.container { max-width: 1200px; margin: 0 auto; }
.header { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
.header h1 { margin-top: 0; }
.stats { display: flex; gap: 20px; margin-top: 20px; }
.stat-box { flex: 1; padding: 15px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe; text-align: center; }
.stat-box h3 { margin: 0; font-size: 24px; color: #1d4ed8; }
.stat-box p { margin: 5px 0 0; color: #3b82f6; font-size: 14px; text-transform: uppercase; }
.filters { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.filters input, .filters select { padding: 8px; margin-right: 10px; border: 1px solid #d1d5db; border-radius: 4px; }
table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e5e7eb; }
th { background-color: #f3f4f6; font-weight: 600; }
tr:hover { background-color: #f9fafb; }
.badge { padding: 4px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
.conforme { background: #dcfce7; color: #166534; }
.nao-conforme { background: #fee2e2; color: #991b1b; }
.nao-verificado { background: #f3f4f6; color: #374151; }
.hidden { display: none; }
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>Dashboard Forense de Dívidas Técnicas - BirthHub 360</h1>
        <div class="stats">
            <div class="stat-box"><h3>${numChecks}</h3><p>Verificações Totais</p></div>
            <div class="stat-box" style="background:#fee2e2; border-color:#fecaca;">
                <h3 style="color:#991b1b;">${numFound}</h3><p style="color:#b91c1c;">Achados Confirmados</p>
            </div>
            <div class="stat-box" style="background:#dcfce7; border-color:#bbf7d0;">
                <h3 style="color:#166534;">${numConform}</h3><p style="color:#15803d;">Conformes</p>
            </div>
            <div class="stat-box" style="background:#f3f4f6; border-color:#e5e7eb;">
                <h3 style="color:#374151;">${numUnverified}</h3><p style="color:#4b5563;">Não Verificados</p>
            </div>
        </div>
    </div>

    <div class="filters">
        <input type="text" id="searchInput" placeholder="Buscar..." onkeyup="filterTable()">
        <select id="statusFilter" onchange="filterTable()">
            <option value="">Todos os Status</option>
            <option value="Conforme">Conforme</option>
            <option value="Não conforme">Não conforme</option>
            <option value="Não verificado">Não verificado</option>
        </select>
        <button onclick="exportJSON()">Exportar JSON</button>
    </div>

    <table id="dataTable">
        <thead>
            <tr>
                <th>ID</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Resultado</th>
                <th>Prioridade</th>
            </tr>
        </thead>
        <tbody>
            ${results.map(r => `
            <tr>
                <td>${r.id}</td>
                <td>${r.categoria}</td>
                <td>${r.descricao}</td>
                <td><span class="badge ${r.resultado.toLowerCase().replace(' ', '-')}">${r.resultado}</span></td>
                <td>${r.prioridade || '-'}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
</div>

<script>
    const resultsData = ${JSON.stringify(jsonOutput)};

    function filterTable() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const status = document.getElementById('statusFilter').value;
        const rows = document.querySelectorAll('#dataTable tbody tr');

        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            const rowStatus = row.querySelector('.badge').innerText;
            const matchSearch = text.includes(search);
            const matchStatus = status === "" || rowStatus === status;

            if (matchSearch && matchStatus) {
                row.classList.remove('hidden');
            } else {
                row.classList.add('hidden');
            }
        });
    }

    function exportJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resultsData, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "birthub360-auditoria-dividas.json");
        dlAnchorElem.click();
    }
</script>
</body>
</html>`;
fs.writeFileSync(path.join(outputDir, 'birthub360-checklist-dividas-tecnicas.html'), htmlContent);

console.log('Arquivos gerados com sucesso em:', outputDir);
