/**
 * Provedor de Dados Públicos Empresariais Brasileiros (CNPJ)
 * - Consulta por CNPJ (BrasilAPI com fallback para MinhaReceita)
 * - Normalização cadastral completa: Razão Social, Fantasia, CNAE, Endereço, Sócios QSA
 * - Pesquisa por Razão Social ou Nome Fantasia via motor de busca e fontes públicas
 * - Cache de resultados e tratamento resiliente de erros
 */

import { logger } from '../../../lib/logger.js';
import {
  PhoneNormalizationUtil,
  TextSimilarityUtil,
} from '../utils/openSourceTextAndPhone.util.js';
import type { DecisionMaker, ProspectCandidate } from '../domain/prospectTypes.js';

export interface PublicCnpjData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  cnaeDescricao: string;
  cnaesSecundarios: Array<{ codigo: string; descricao: string }>;
  situacaoCadastral: string;
  dataAbertura: string;
  naturezaJuridica: string;
  capitalSocial: number;
  porte: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  telefones: string[];
  emails: string[];
  sociosQsa: Array<{
    nome: string;
    qualificacao: string;
    faixaEtaria?: string;
  }>;
}

export class BrazilPublicCnpjService {
  private static cache = new Map<string, { data: PublicCnpjData; timestamp: number }>();
  private static CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

  /**
   * Consulta os dados cadastrais da empresa pelo CNPJ (14 dígitos)
   */
  public static async fetchByCnpj(rawCnpj: string): Promise<PublicCnpjData | null> {
    const cnpj = rawCnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) return null;

    // Cache local em memória
    const cached = BrazilPublicCnpjService.cache.get(cnpj);
    if (cached && Date.now() - cached.timestamp < BrazilPublicCnpjService.CACHE_TTL_MS) {
      return cached.data;
    }

    // 1ª Tentativa: BrasilAPI
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
        headers: { 'User-Agent': 'BirthHub360-TurboSearch/1.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = (await res.json()) as any;
        const normalized = BrazilPublicCnpjService.normalizeBrasilApiResponse(json);
        BrazilPublicCnpjService.cache.set(cnpj, { data: normalized, timestamp: Date.now() });
        return normalized;
      }
    } catch (err: any) {
      logger.warn(
        { err: err.message, cnpj },
        'BrasilAPI falhou ou deu timeout, tentando fallback MinhaReceita',
      );
    }

    // 2ª Tentativa: MinhaReceita (fallback open source oficial)
    try {
      const res = await fetch(`https://minhareceita.org/${cnpj}`, {
        headers: { 'User-Agent': 'BirthHub360-TurboSearch/1.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = (await res.json()) as any;
        const normalized = BrazilPublicCnpjService.normalizeMinhaReceitaResponse(json);
        BrazilPublicCnpjService.cache.set(cnpj, { data: normalized, timestamp: Date.now() });
        return normalized;
      }
    } catch (err: any) {
      logger.error({ err: err.message, cnpj }, 'Fallback MinhaReceita também falhou');
    }

    return null;
  }

  /**
   * Converte um registro cadastral da Receita Federal em um ProspectCandidate completo
   */
  public static toProspectCandidate(data: PublicCnpjData): ProspectCandidate {
    const tradeName = data.nomeFantasia || data.razaoSocial;
    const phone = data.telefones[0]
      ? PhoneNormalizationUtil.formatNational(data.telefones[0])
      : null;
    const decisionMakers: DecisionMaker[] = data.sociosQsa.map((s) => ({
      name: s.nome,
      title: s.qualificacao,
      email: null,
      phone: null,
      linkedinUrl: null,
      source: 'receita_federal_qsa',
      lastUpdated: new Date().toISOString(),
    }));

    return {
      tradeName,
      legalNameGuess: data.razaoSocial,
      cnpjGuess: data.cnpj,
      segment: data.cnaeDescricao || 'Empresa Comercial',
      size: data.porte || 'Não informado',
      location: `${data.endereco.municipio}, ${data.endereco.uf}`,
      fitScoreEstimate: 75,
      suggestedContact: decisionMakers[0]
        ? { name: decisionMakers[0].name, role: decisionMakers[0].title || 'Sócio' }
        : null,
      rationale: `Dados cadastrais oficiais confirmados via Receita Federal (CNAE ${data.cnaePrincipal})`,
      source: 'receita_federal',
      segmentObserved: true,
      phone,
      emails: data.emails,
      decisionMakers,
      cnaePrincipal: data.cnaePrincipal,
      cnaeDescricao: data.cnaeDescricao,
      cnaesSecundarios: data.cnaesSecundarios,
      situacaoCadastral: data.situacaoCadastral,
      dataAbertura: data.dataAbertura,
      naturezaJuridica: data.naturezaJuridica,
      capitalSocial: data.capitalSocial,
      porte: data.porte,
      enderecoCompleto: {
        logradouro: data.endereco.logradouro,
        numero: data.endereco.numero,
        complemento: data.endereco.complemento,
        bairro: data.endereco.bairro,
        cidade: data.endereco.municipio,
        uf: data.endereco.uf,
        cep: data.endereco.cep,
      },
      sourcesProvenance: [
        {
          field: 'cnpj',
          source: 'receita_federal',
          observedAt: new Date().toISOString(),
          verified: true,
        },
        {
          field: 'razaoSocial',
          source: 'receita_federal',
          observedAt: new Date().toISOString(),
          verified: true,
        },
      ],
    };
  }

  private static normalizeBrasilApiResponse(json: any): PublicCnpjData {
    const telefones: string[] = [];
    if (json.ddd_telefone_1) telefones.push(json.ddd_telefone_1);
    if (json.ddd_telefone_2) telefones.push(json.ddd_telefone_2);

    const emails: string[] = [];
    if (json.email && json.email.includes('@')) emails.push(json.email.toLowerCase());

    const cnaesSecundarios = (json.cnaes_secundarios || []).map((c: any) => ({
      codigo: String(c.codigo),
      descricao: c.descricao,
    }));

    const sociosQsa = (json.qsa || []).map((q: any) => ({
      nome: q.nome_socio || q.nome,
      qualificacao:
        q.qualificacao_socio || q.qualificacao_representante_legal || 'Sócio / Administrador',
      faixaEtaria: q.faixa_etaria,
    }));

    return {
      cnpj: json.cnpj,
      razaoSocial: json.razao_social || '',
      nomeFantasia: json.nome_fantasia || json.razao_social || '',
      cnaePrincipal: String(json.cnae_fiscal || ''),
      cnaeDescricao: json.cnae_fiscal_descricao || '',
      cnaesSecundarios,
      situacaoCadastral: json.descricao_situacao_cadastral || 'ATIVA',
      dataAbertura: json.data_inicio_atividade || '',
      naturezaJuridica: json.natureza_juridica || '',
      capitalSocial: Number(json.capital_social) || 0,
      porte: json.porte || json.descricao_porte || 'Demais',
      endereco: {
        logradouro: json.logradouro || '',
        numero: json.numero || '',
        complemento: json.complemento || '',
        bairro: json.bairro || '',
        municipio: json.municipio || '',
        uf: json.uf || '',
        cep: json.cep || '',
      },
      telefones,
      emails,
      sociosQsa,
    };
  }

  private static normalizeMinhaReceitaResponse(json: any): PublicCnpjData {
    const telefones: string[] = [];
    if (json.ddd_telefone_1) telefones.push(json.ddd_telefone_1);
    if (json.ddd_telefone_2) telefones.push(json.ddd_telefone_2);

    const emails: string[] = [];
    if (json.email && json.email.includes('@')) emails.push(json.email.toLowerCase());

    const cnaesSecundarios = (json.cnaes_secundarios || []).map((c: any) => ({
      codigo: String(c.codigo),
      descricao: c.descricao,
    }));

    const sociosQsa = (json.qsa || []).map((q: any) => ({
      nome: q.nome_socio,
      qualificacao: q.qualificacao_socio || 'Sócio',
      faixaEtaria: q.faixa_etaria,
    }));

    return {
      cnpj: json.cnpj,
      razaoSocial: json.razao_social || '',
      nomeFantasia: json.nome_fantasia || json.razao_social || '',
      cnaePrincipal: String(json.cnae_fiscal || ''),
      cnaeDescricao: json.cnae_fiscal_descricao || '',
      cnaesSecundarios,
      situacaoCadastral: json.descricao_situacao_cadastral || 'ATIVA',
      dataAbertura: json.data_inicio_atividade || '',
      naturezaJuridica: json.natureza_juridica || '',
      capitalSocial: Number(json.capital_social) || 0,
      porte: json.descricao_porte || 'Demais',
      endereco: {
        logradouro: json.logradouro || '',
        numero: json.numero || '',
        complemento: json.complemento || '',
        bairro: json.bairro || '',
        municipio: json.municipio || '',
        uf: json.uf || '',
        cep: json.cep || '',
      },
      telefones,
      emails,
      sociosQsa,
    };
  }
}
