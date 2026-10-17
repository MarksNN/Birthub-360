export type SocialSellingChannel = 'linkedin' | 'email' | 'whatsapp';
export type SocialSellingTone = 'consultivo' | 'executivo' | 'provocativo' | 'storytelling';

export interface GenerateApproachInput {
  targetCompany?: string;
  targetRole?: string;
  segment?: string;
  triggerEvent?: string;
  channel?: SocialSellingChannel;
  tone?: SocialSellingTone;
}

export interface GeneratedApproachResult {
  headline: string;
  hook: string;
  body: string;
  callToAction: string;
  fullMessage: string;
  channel: SocialSellingChannel;
  tone: SocialSellingTone;
  modelUsed: string;
  estimatedTokens: number;
}
