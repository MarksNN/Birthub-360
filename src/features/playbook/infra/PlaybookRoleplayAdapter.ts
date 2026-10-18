import type { RoleplayPlaybookPort } from '../../../shared/contracts/roleplayPlaybook.contract.js';
import type { ObjectionMatrixItemRepository } from '../objection-matrix/domain/ObjectionMatrixItem.js';
import { PrismaObjectionMatrixRepository } from '../objection-matrix/infra/PrismaObjectionMatrixRepository.js';
import type { QualificationMatrixItemRepository } from '../qualification-matrix/domain/QualificationMatrixItem.js';
import { PrismaQualificationMatrixRepository } from '../qualification-matrix/infra/PrismaQualificationMatrixRepository.js';
import { curatedObjectionService } from '../services/curatedObjection.service.js';

export class PlaybookRoleplayAdapter implements RoleplayPlaybookPort {
  constructor(
    private qualificationRepo: QualificationMatrixItemRepository = new PrismaQualificationMatrixRepository(),
    private objectionRepo: ObjectionMatrixItemRepository = new PrismaObjectionMatrixRepository(),
  ) {}

  async findQualificationCriteria(organizationId: string): Promise<string[]> {
    try {
      const res = await this.qualificationRepo.findAllWithFilters(organizationId, undefined, 1, 50);
      return res.data.map((q) => `${q.questionCategory}: ${q.questionText}`);
    } catch {
      return [];
    }
  }

  async findObjections(organizationId: string): Promise<string[]> {
    let repoObjections: string[] = [];
    try {
      const res = await this.objectionRepo.findAllWithFilters(organizationId, undefined, 1, 50);
      repoObjections = res.data.map((o) => `${o.objectionTitle} (${o.objectionText})`);
    } catch {
      // Fallback defensivo para quando o banco estiver offline
    }

    // Conhecimento vivo originado do Data Flywheel
    const curated = await curatedObjectionService.listEligibleForRoleplay(organizationId);
    const curatedObjections = curated.map((c) => `[Flywheel] ${c.category}: ${c.anonymizedEvidence}`);

    return [...repoObjections, ...curatedObjections];
  }
}


