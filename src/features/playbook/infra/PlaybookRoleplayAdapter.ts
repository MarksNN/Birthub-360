import type { RoleplayPlaybookPort } from '../../../shared/contracts/roleplayPlaybook.contract.js';
import type { ObjectionMatrixItemRepository } from '../objection-matrix/domain/ObjectionMatrixItem.js';
import { PrismaObjectionMatrixRepository } from '../objection-matrix/infra/PrismaObjectionMatrixRepository.js';
import type { QualificationMatrixItemRepository } from '../qualification-matrix/domain/QualificationMatrixItem.js';
import { PrismaQualificationMatrixRepository } from '../qualification-matrix/infra/PrismaQualificationMatrixRepository.js';

export class PlaybookRoleplayAdapter implements RoleplayPlaybookPort {
  constructor(
    private qualificationRepo: QualificationMatrixItemRepository = new PrismaQualificationMatrixRepository(),
    private objectionRepo: ObjectionMatrixItemRepository = new PrismaObjectionMatrixRepository(),
  ) {}

  async findQualificationCriteria(organizationId: string): Promise<string[]> {
    const res = await this.qualificationRepo.findAllWithFilters(organizationId, undefined, 1, 50);
    return res.data.map((q) => `${q.questionCategory}: ${q.questionText}`);
  }

  async findObjections(organizationId: string): Promise<string[]> {
    const res = await this.objectionRepo.findAllWithFilters(organizationId, undefined, 1, 50);
    return res.data.map((o) => `${o.objectionTitle} (${o.objectionText})`);
  }
}
