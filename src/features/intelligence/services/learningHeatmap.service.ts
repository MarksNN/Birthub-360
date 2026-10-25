import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';

/**
 * Learning Heatmap - Visualiza padrões aprendidos pelo LearningAgent.
 *
 * Analisa o histórico de perfis de estilo aprendidos e extrai:
 * - Quais padrões são mais frequentes
 * - Quais termos/phrases o agente aprendeu a usar
 * - Tendências de evolução ao longo do tempo
 * - Distribuição de aprovações vs rejeições
 */

export interface LearningPattern {
  category: string; // ex: 'tom_voz', 'criterio_qualificacao', 'abordagem_prospeccao'
  pattern: string; // ex: 'agressivo', 'formal', 'direto'
  frequency: number; // Quantas vezes aparece
  firstSeen: string;
  lastSeen: string;
  approvalRate: number; // 0-1, taxa de aprovação
}

export interface LearningHeatmap {
  organizationId: string;
  tenantId: string;
  patterns: LearningPattern[];
  totalReflections: number;
  totalApproved: number;
  totalRejected: number;
  activeVersion: number;
  averageGuidelineLength: number;
}

/**
 * Analisa o histórico de perfis de estilo aprendidos e extrai padrões.
 */
export async function generateLearningHeatmap(
  organizationId: string,
  tenantId: string,
): Promise<LearningHeatmap> {
  const { getLearningProfileHistory } = await import('../agents/learning.agent.js');

  const history = await getLearningProfileHistory(organizationId, tenantId);

  if (!history || history.versions.length === 0) {
    return {
      organizationId,
      tenantId,
      patterns: [],
      totalReflections: 0,
      totalApproved: 0,
      totalRejected: 0,
      activeVersion: 0,
      averageGuidelineLength: 0,
    };
  }

  const patterns: LearningPattern[] = [];
  const patternMap = new Map<string, LearningPattern>();

  for (const version of history.versions) {
    const guideline = version.guidelines.toLowerCase();

    // Extrair padrões baseados em palavras-chave comuns
    const patternsToDetect = [
      {
        category: 'tom_voz',
        keywords: ['agressivo', 'formal', 'direto', 'sutil', 'técnico', 'casual'],
      },
      {
        category: 'criterio_qualificacao',
        keywords: ['budget', 'frota', 'porte', 'segmento', 'tecnologia', 'localização'],
      },
      {
        category: 'abordagem_prospeccao',
        keywords: ['cold call', 'email frio', 'linkedin', 'introdução', 'follow-up', 'agenda'],
      },
      {
        category: 'foco_objecao',
        keywords: ['dor', 'problema', 'desafio', 'meta', 'objetivo', 'kpi'],
      },
      {
        category: 'negociacao',
        keywords: ['desconto', 'prazo', 'condição', 'alçada', 'margem', 'proposta'],
      },
    ];

    for (const { category, keywords } of patternsToDetect) {
      for (const keyword of keywords) {
        if (guideline.includes(keyword)) {
          const key = `${category}:${keyword}`;
          const existing = patternMap.get(key);

          if (existing) {
            existing.frequency++;
            existing.lastSeen = version.createdAt;
            if (version.approvalStatus === 'APPROVED') {
              existing.approvalRate =
                (existing.approvalRate * (existing.frequency - 1) + 1) / existing.frequency;
            }
          } else {
            patternMap.set(key, {
              category,
              pattern: keyword,
              frequency: 1,
              firstSeen: version.createdAt,
              lastSeen: version.createdAt,
              approvalRate: version.approvalStatus === 'APPROVED' ? 1 : 0,
            });
          }
        }
      }
    }
  }

  patterns.push(...patternMap.values());

  // Estatísticas gerais
  const totalReflections = history.versions.length;
  const totalApproved = history.versions.filter((v) => v.approvalStatus === 'APPROVED').length;
  const totalRejected = history.versions.filter((v) => v.approvalStatus === 'REJECTED').length;
  const averageGuidelineLength =
    history.versions.reduce((sum, v) => sum + v.guidelines.length, 0) / totalReflections;

  const heatmap: LearningHeatmap = {
    organizationId,
    tenantId,
    patterns: patterns.sort((a, b) => b.frequency - a.frequency), // Mais frequentes primeiro
    totalReflections,
    totalApproved,
    totalRejected,
    activeVersion: history.activeVersion,
    averageGuidelineLength,
  };

  logger.info(
    { organizationId, tenantId, patternsCount: patterns.length },
    '[LearningHeatmap] Heatmap gerado',
  );

  return heatmap;
}

/**
 * Retorna heatmap comparativo entre dois tenants (útil para benchmarking).
 */
export async function compareLearningHeatmaps(
  organizationId1: string,
  tenantId1: string,
  organizationId2: string,
  tenantId2: string,
): Promise<{ heatmap1: LearningHeatmap; heatmap2: LearningHeatmap; comparison: string }> {
  const [heatmap1, heatmap2] = await Promise.all([
    generateLearningHeatmap(organizationId1, tenantId1),
    generateLearningHeatmap(organizationId2, tenantId2),
  ]);

  // Análise comparativa simples
  const patterns1 = new Set(heatmap1.patterns.map((p) => p.pattern));
  const patterns2 = new Set(heatmap2.patterns.map((p) => p.pattern));

  const commonPatterns = [...patterns1].filter((p) => patterns2.has(p));
  const unique1 = [...patterns1].filter((p) => !patterns2.has(p));
  const unique2 = [...patterns2].filter((p) => !patterns1.has(p));

  const comparison = `Padrões comuns: ${commonPatterns.length}, Únicos do Tenant 1: ${unique1.length}, Únicos do Tenant 2: ${unique2.length}. Tenant 1 tem ${heatmap1.totalReflections} reflexões (aprovação: ${((heatmap1.totalApproved / heatmap1.totalReflections) * 100).toFixed(1)}%), Tenant 2 tem ${heatmap2.totalReflections} reflexões (aprovação: ${((heatmap2.totalApproved / heatmap2.totalReflections) * 100).toFixed(1)}%).`;

  return { heatmap1, heatmap2, comparison };
}
