/**
 * Team & RBAC Application Layer — BirthHub 360
 * UseCases implementing business rules for membership, roles and permissions
 */

import {
  type ITeamRepository,
  type MemberInvite,
  type TeamMember,
  TeamRole,
} from '../domain/TeamDomain.js';

export class TeamUseCases {
  constructor(private readonly teamRepository: ITeamRepository) {}

  /**
   * List members within the given tenant organization boundary
   */
  async listMembers(organizationId: string): Promise<TeamMember[]> {
    if (!organizationId) {
      throw new Error('Identificador da organização é obrigatório');
    }
    return this.teamRepository.findByOrganizationId(organizationId);
  }

  /**
   * Invite a new team member with RBAC role validation
   */
  async inviteMember(
    organizationId: string,
    invitedBy: string,
    email: string,
    role: TeamRole,
  ): Promise<MemberInvite> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.teamRepository.findByEmail(normalizedEmail, organizationId);
    if (existing) {
      throw new Error('Usuário já é membro desta organização');
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    return this.teamRepository.createInvite({
      organizationId,
      invitedBy,
      email: normalizedEmail,
      role,
      token,
      expiresAt,
    });
  }

  /**
   * Update role preventing removing the last OWNER
   */
  async updateMemberRole(
    organizationId: string,
    targetMemberId: string,
    newRole: TeamRole,
  ): Promise<TeamMember> {
    const member = await this.teamRepository.findById(targetMemberId, organizationId);
    if (!member) {
      throw new Error('Membro não encontrado nesta organização');
    }

    if (member.role === TeamRole.OWNER && newRole !== TeamRole.OWNER) {
      const ownerCount = await this.teamRepository.countOwners(organizationId);
      if (ownerCount <= 1) {
        throw new Error('Não é permitido rebaixar o único proprietário (OWNER) da organização');
      }
    }

    return this.teamRepository.updateRole(targetMemberId, organizationId, newRole);
  }

  /**
   * Remove member respecting organization safety
   */
  async removeMember(organizationId: string, targetMemberId: string): Promise<void> {
    const member = await this.teamRepository.findById(targetMemberId, organizationId);
    if (!member) {
      throw new Error('Membro não encontrado nesta organização');
    }

    if (member.role === TeamRole.OWNER) {
      const ownerCount = await this.teamRepository.countOwners(organizationId);
      if (ownerCount <= 1) {
        throw new Error('Não é possível remover o único proprietário (OWNER) da organização');
      }
    }

    await this.teamRepository.removeMember(targetMemberId, organizationId);
  }
}
