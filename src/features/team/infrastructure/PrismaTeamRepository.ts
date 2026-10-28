/**
 * Team & RBAC Infrastructure Layer — BirthHub 360
 * Clean Architecture Modular Prisma Implementation of ITeamRepository
 */

import { prisma } from '../../../lib/prisma.js';
import {
  type ITeamRepository,
  type MemberInvite,
  type TeamMember,
  TeamRole,
} from '../domain/TeamDomain.js';

export class PrismaTeamRepository implements ITeamRepository {
  async findByOrganizationId(organizationId: string): Promise<TeamMember[]> {
    const users = await prisma.user.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => this.mapToDomain(u));
  }

  async findById(id: string, organizationId: string): Promise<TeamMember | null> {
    const user = await prisma.user.findFirst({
      where: { id, organizationId },
    });

    return user ? this.mapToDomain(user) : null;
  }

  async findByEmail(email: string, organizationId: string): Promise<TeamMember | null> {
    const user = await prisma.user.findFirst({
      where: { email, organizationId },
    });

    return user ? this.mapToDomain(user) : null;
  }

  async createMember(
    member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<TeamMember> {
    const created = await prisma.user.create({
      data: {
        organizationId: member.organizationId,
        name: member.name,
        email: member.email,
        role: member.role as any,
      },
    });

    return this.mapToDomain(created);
  }

  async updateRole(id: string, _organizationId: string, role: TeamRole): Promise<TeamMember> {
    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as any },
    });

    return this.mapToDomain(updated);
  }

  async updateStatus(
    id: string,
    organizationId: string,
    _status: TeamMember['status'],
  ): Promise<TeamMember> {
    const user = await prisma.user.findFirst({ where: { id, organizationId } });
    if (!user) throw new Error('Membro não encontrado');
    return this.mapToDomain(user);
  }

  async removeMember(id: string, organizationId: string): Promise<void> {
    await prisma.user.deleteMany({
      where: { id, organizationId },
    });
  }

  async countOwners(organizationId: string): Promise<number> {
    return prisma.user.count({
      where: {
        organizationId,
        role: TeamRole.OWNER as any,
      },
    });
  }

  async createInvite(invite: Omit<MemberInvite, 'id' | 'createdAt'>): Promise<MemberInvite> {
    return {
      id: crypto.randomUUID(),
      organizationId: invite.organizationId,
      email: invite.email,
      role: invite.role,
      invitedBy: invite.invitedBy,
      token: invite.token,
      expiresAt: invite.expiresAt,
      createdAt: new Date(),
    };
  }

  async findInviteByToken(_token: string): Promise<MemberInvite | null> {
    return null;
  }

  async deleteInvite(_token: string): Promise<void> {
    // invite deletion logic
  }

  private mapToDomain(user: any): TeamMember {
    return {
      id: user.id,
      organizationId: user.organizationId || '',
      userId: user.id,
      name: user.name || '',
      email: user.email,
      role: (user.role as TeamRole) || TeamRole.VIEWER,
      status: 'ACTIVE',
      avatarUrl: user.avatarUrl || user.image || undefined,
      customPermissions: [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
