De: 00
Para: 11 (+ decisao humana)
Onda: ui-1 (modernizacao visual, Onda A)
Status: aberto
Prioridade: alto
Bloqueador-ref: n/a
Sprint destino: Onda B

## Problema
globals.css define brand #00d4ff/#ff2d9b, docs documentam ouro #D4AF37 e elegance.css redefine --brand para ouro. Nao ha paleta oficial unica.

## Arquivo(s) envolvido(s)
src/styles/globals.css, src/styles/elegance.css, docs/DESIGN_SYSTEM.md, docs/design/*

## Evidencia
docs/design/MODERNIZACAO-UI-ONDA-A.md (secao 1, achados criticos).

## Alteracao necessaria
Decidir e registrar a paleta oficial com papeis semanticos. Nao alterar logo/ativos sem aprovacao humana.

## Teste esperado
Tabela de tokens com razao de contraste WCAG AA (texto e foco) para claro e escuro.

## Contexto adicional
Nenhum codigo foi alterado na Onda A. Ver matriz de ferramentas e plano de ondas no documento acima.

## Atualização 2026-10-11
O usuário enviou a referência "Paleta de Cores Neon": rosa `#FF2D9B`, azul `#00D4FF`, dourado `#FFC107`, preto `#0D0D0D`, branco `#F8F9FF`. Registrada como direção proposta na seção 8 de MODERNIZACAO-UI-ONDA-A.md. Falta: confirmação do 11, aprovação humana formal e contraste por token (variantes `*-ink` para o tema claro).
