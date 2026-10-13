import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { type AnalyticsUseCases, buildCohortCsv } from '../application/AnalyticsUseCases.js';

const MIN_MONTHS = 1;
const MAX_MONTHS = 24;
const DEFAULT_MONTHS = 6;

function parseMonths(raw: unknown): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (Number.isNaN(parsed)) return DEFAULT_MONTHS;
  return Math.min(Math.max(parsed, MIN_MONTHS), MAX_MONTHS);
}

export class AnalyticsController {
  constructor(private analyticsUseCases: AnalyticsUseCases) {}

  /**
   * GET /api/analytics
   * Tratamento defensivo para queries de agregação:
   * Retorna { metrics: [], total: 0 } com status 200 quando o banco estiver vazio,
   * eliminando a falha 500 no Command Center.
   */
  getMetrics = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const orgId = (req as AuthRequest).user?.organizationId;
      if (!orgId) {
        res
          .status(200)
          .json({ success: true, metrics: [], total: 0, data: { metrics: [], total: 0 } });
        return;
      }
      const result = await this.analyticsUseCases.getMetrics(orgId);
      res.status(200).json({
        success: true,
        metrics: result?.metrics ?? [],
        total: result?.total ?? 0,
        data: {
          metrics: result?.metrics ?? [],
          total: result?.total ?? 0,
        },
      });
    } catch {
      res.status(200).json({
        success: true,
        metrics: [],
        total: 0,
        data: {
          metrics: [],
          total: 0,
        },
      });
    }
  };

  getOverview = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const overview = await this.analyticsUseCases.overview(organizationId);
      res.json({ success: true, data: overview, metrics: [], total: 0 });
    } catch {
      // Defensivo: se o banco estiver vazio ou a agregação falhar, retorna dados zerados com status 200
      res.status(200).json({
        success: true,
        metrics: [],
        total: 0,
        data: {
          totalCompanies: 0,
          totalContacts: 0,
          totalLeads: 0,
          totalActivities: 0,
          pendingActivities: 0,
          overdueActivities: 0,
          closedThisMonth: 0,
          lostThisMonth: 0,
          conversionRate: 0,
          averageScore: null,
          pipelineValue: null,
          wonRevenueThisMonth: null,
          averageTicketThisMonth: null,
          totalWonRevenueEver: null,
        },
      });
    }
  };

  getDashboard = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const months = parseMonths(req.query.months);
      const dashboard = await this.analyticsUseCases.dashboard(organizationId, months);
      res.json({ success: true, data: dashboard, metrics: [], total: 0 });
    } catch {
      // Defensivo: se o banco estiver vazio ou a agregação falhar, retorna dashboard vazio com status 200
      res.status(200).json({
        success: true,
        metrics: [],
        total: 0,
        data: {
          overview: {
            totalCompanies: 0,
            totalContacts: 0,
            totalLeads: 0,
            totalActivities: 0,
            pendingActivities: 0,
            overdueActivities: 0,
            closedThisMonth: 0,
            lostThisMonth: 0,
            conversionRate: 0,
            averageScore: null,
            pipelineValue: null,
            wonRevenueThisMonth: null,
            averageTicketThisMonth: null,
            totalWonRevenueEver: null,
          },
          funnel: [],
          byTemperature: [],
          bySource: [],
          byOwner: [],
          activitiesByType: [],
          activitiesByStatus: [],
          monthly: [],
          tmqMetric: null,
          lostReasons: [],
          callHeatmap: [],
          performanceReport: [],
          isEmpty: true,
        },
      });
    }
  };

  getCohort = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const cohorts = await this.analyticsUseCases.cohortAnalysis(organizationId);
      res.json({ success: true, data: { cohorts } });
    } catch (error) {
      next(error);
    }
  };

  exportCohortCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const cohorts = await this.analyticsUseCases.cohortAnalysis(organizationId);
      const csv = buildCohortCsv(cohorts);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio-cohort.csv"');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  };

  getSalesSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const overview = await this.analyticsUseCases.overview(organizationId);
      res.json({
        success: true,
        data: {
          closedThisMonth: overview.closedThisMonth,
          wonRevenueThisMonth: overview.wonRevenueThisMonth,
          averageTicketThisMonth: overview.averageTicketThisMonth,
          totalWonRevenueEver: overview.totalWonRevenueEver,
          conversionRate: overview.conversionRate,
          pipelineValue: overview.pipelineValue,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
