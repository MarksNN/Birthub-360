/**
 * shadowCopywriting.contract.ts
 *
 * Contrato tipado para Shadow Copywriting (Eixo 15).
 * Personalização consentida do estilo de comunicação comercial por vendedor,
 * preservando integridade factual, isolamento e direitos LGPD.
 */

export interface SellerStylePreferences {
  formalityLevel: 'CASUAL' | 'PROFESSIONAL' | 'FORMAL';
  sentenceLengthPreference: 'SHORT_CONCISE' | 'BALANCED' | 'DETAILED';
  useEmojis: boolean;
  salutationStyle: string; // Ex: "Olá, [Nome]!", "Prezado(a) [Nome],"
  signOffStyle: string; // Ex: "Um abraço,", "Atenciosamente,"
  vocabularyPreferences: string[]; // Termos favoritos permitidos
  avoidedTerms: string[]; // Termos que o vendedor não gosta de usar
  consultativeHookPattern: string; // Padrão de abertura consultiva
}

export interface SellerStyleProfile {
  sellerId: string;
  organizationId: string;
  consentGranted: boolean;
  consentTimestamp: string;
  preferences: SellerStylePreferences;
  sampleCount: number;
  lastUpdatedAt: string;
  isRevoked: boolean;
}

export interface GenerateShadowCopyInput {
  organizationId: string;
  sellerId: string;
  recipientName: string;
  recipientCompany: string;
  recipientRole: string;
  channel: 'LINKEDIN' | 'WHATSAPP' | 'EMAIL';
  factualPointsToInclude: string[]; // Fatos rígidos do RAG/Playbook que não podem mudar
  offerDetails: string;
}

export interface GenerateShadowCopyResult {
  messageText: string;
  styleApplied: SellerStylePreferences;
  factsPreservedCount: number;
  wordCount: number;
  requiresHumanReview: true; // Garantia contratual: NUNCA envia sem revisão humana
  disclaimer: string;
}

export interface IShadowCopywritingPort {
  registerConsentAndSamples(params: {
    organizationId: string;
    sellerId: string;
    consentGranted: boolean;
    sampleTexts: string[];
    initialPreferences?: Partial<SellerStylePreferences>;
  }): Promise<SellerStyleProfile>;

  getSellerProfile(organizationId: string, sellerId: string): Promise<SellerStyleProfile | null>;

  updateSellerPreferences(
    organizationId: string,
    sellerId: string,
    preferences: Partial<SellerStylePreferences>,
  ): Promise<SellerStyleProfile>;

  revokeConsentAndPurgeSamples(
    organizationId: string,
    sellerId: string,
  ): Promise<{ revoked: boolean; samplesPurged: boolean }>;

  generatePersonalizedOutreach(input: GenerateShadowCopyInput): Promise<GenerateShadowCopyResult>;
}
