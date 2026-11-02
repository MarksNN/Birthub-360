#!/usr/bin/env python3
"""Monta contexto de um especialista. Não realiza ações nem autorização.
Ex.: python 07_RUNTIME/MONTAR_CONTEXT.py --agent crm --skill-id comercial.crm.inspecionar-fila-bitrix --output crm-context.txt

--output aceita só um nome de arquivo. O arquivo sai em ./commercial-v3-out/,
nunca num caminho absoluto ou com '..'.
"""
import json, argparse, re
from pathlib import Path

SAFE_OUTPUT_NAME = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$')

def confined_output(raw):
    """Aceita somente um nome de arquivo e grava dentro de commercial-v3-out no cwd."""
    if not isinstance(raw, str) or raw != raw.strip() or '\x00' in raw:
        raise ValueError('Caminho de saída inválido')
    # Path.name descarta diretório; se diferir do original, havia separador ou '..'.
    if raw != Path(raw).name or raw in {'.', '..'}:
        raise ValueError('A saída deve ser um nome de arquivo, sem diretório')
    if not SAFE_OUTPUT_NAME.fullmatch(raw):
        raise ValueError('Nome de arquivo de saída inválido')
    base = (Path.cwd().resolve() / 'commercial-v3-out')
    base.mkdir(parents=True, exist_ok=True)
    target = (base / raw).resolve()
    if target.parent != base:
        raise ValueError('Saída fora do diretório permitido')
    return target
ROOT=Path(__file__).resolve().parents[1]

def load(p):return (ROOT/p).read_text(encoding='utf-8')
def context(agent, skill_ids):
    catalog=json.loads(load('03_CATALOGO/INDICE_GERAL_463.json'))
    schema=json.loads(load('03_CONTRATOS/AGENT_RESULT_V3_1_GLOBAL.schema.json'))
    if schema['properties']['schemaVersion'].get('const')!='3.1':raise ValueError('Schema divergente')
    roles={x['id']:x for x in catalog['agents']}
    if agent not in roles:raise ValueError('Agente desconhecido')
    rd=roles[agent]
    aidx=json.loads(load(rd['index']))
    existing={s['id']:s for s in aidx['skills']}
    if len(existing)!=aidx['skillCount'] or len(existing)!=rd['skills']:raise ValueError('Índice incompleto')
    if any(s not in existing for s in skill_ids):raise ValueError('SkillId desconhecida')
    chunks=[load('00_CORE/CORE_COMPARTILHADO_V3_1.txt'),load(rd['prompt']),
        'ÍNDICE OBRIGATÓRIO DE SKILLS (não é grant):\n'+json.dumps(aidx['skills'],ensure_ascii=False),
        'CONTRATO OBRIGATÓRIO JSON V3.1: resumo_humano sempre, UNKNOWN quando sem comprovação, nenhuma ação real sem backend.']
    pbs={p['id']:p for p in aidx['playbooks']}
    missing=[];loaded=[]
    for pb in sorted({existing[s]['playbookId'] for s in skill_ids}):
        p=ROOT/pbs[pb]['path']
        if not p.exists():
            chunks.append('PLAYBOOK AUSENTE '+pb+': usar CONTINGÊNCIA CONSULTIVA do prompt, não executar ação real.');missing.append(pb)
        else:
            chunks.append('PLAYBOOK '+pb+':\n'+p.read_text(encoding='utf-8'));loaded.append(pb)
    return '\n\n---\n\n'.join(chunks),{'agentId':agent,'indexInjected':True,'schemaReady':True,'loadedPlaybooks':loaded,'missingPlaybooks':missing,'operationalAllowedByBootstrap':False}
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--agent',required=True);ap.add_argument('--skill-id',action='append',default=[]);ap.add_argument('--output',required=True);args=ap.parse_args()
    out,state=context(args.agent,args.skill_id)
    p=confined_output(args.output)
    p.write_text(out,encoding='utf-8')
    p.with_suffix('.schema.json').write_text(load('03_CONTRATOS/AGENT_RESULT_V3_1_GLOBAL.schema.json'),encoding='utf-8')
    print(json.dumps(state,ensure_ascii=False))
