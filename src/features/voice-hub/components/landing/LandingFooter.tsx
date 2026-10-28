import { Heart, ShieldCheck } from 'lucide-react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { BirthHubLogo } from '../../../../components/brand/BirthHubLogo.js';

export function LandingFooter(): React.ReactElement {
  return (
    <footer className="bg-slate-950 text-white py-16 border-t border-white/5 relative text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-10">
        {/* Coluna 1 & 2: Identidade e Missão */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <BirthHubLogo variant="micro" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">Birth Hub 360°</span>
          </div>
          <p className="text-xs text-white/60 max-w-sm leading-relaxed">
            Plataforma unificada de inteligência comercial, orquestração de agentes autônomos e
            Voice Hub para operações B2B de alta escala.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Conformidade estrita com LGPD & GDPR</span>
          </div>
        </div>

        {/* Coluna 3: Produto */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Plataforma</h4>
          <ul className="space-y-2 text-xs text-white/70">
            <li>
              <a href="#modulos" className="hover:text-white transition-colors">
                SDR Autônomo
              </a>
            </li>
            <li>
              <a href="#modulos" className="hover:text-white transition-colors">
                Voice Hub Neural
              </a>
            </li>
            <li>
              <a href="#modulos" className="hover:text-white transition-colors">
                Commercial Intelligence
              </a>
            </li>
            <li>
              <a href="#modulos" className="hover:text-white transition-colors">
                Pipeline CRM 360°
              </a>
            </li>
          </ul>
        </div>

        {/* Coluna 4: Integrações */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Ecossistema</h4>
          <ul className="space-y-2 text-xs text-white/70">
            <li>
              <a href="#comparativo" className="hover:text-white transition-colors">
                Bitrix24 Conector
              </a>
            </li>
            <li>
              <a href="#comparativo" className="hover:text-white transition-colors">
                WhatsApp Cloud API
              </a>
            </li>
            <li>
              <a href="#comparativo" className="hover:text-white transition-colors">
                Apollo & Hunter
              </a>
            </li>
            <li>
              <a href="#seguranca" className="hover:text-white transition-colors">
                Multi-LLM Routing
              </a>
            </li>
          </ul>
        </div>

        {/* Coluna 5: Institucional & Legal */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">
            Legal & Suporte
          </h4>
          <ul className="space-y-2 text-xs text-white/70">
            <li>
              <Link to="/terms" className="hover:text-white transition-colors">
                Termos de Uso
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-white transition-colors">
                Política de Privacidade
              </Link>
            </li>
            <li>
              <a href="#faq" className="hover:text-white transition-colors">
                FAQ & Documentação
              </a>
            </li>
            <li>
              <Link to="/login" className="hover:text-white transition-colors">
                Área do Cliente
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 mt-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-white/40 gap-4">
        <p>© {new Date().getFullYear()} Birth Hub 360°. Todos os direitos reservados.</p>
        <p className="flex items-center gap-1">
          Feito com <Heart className="w-3 h-3 text-rose-500 fill-current" /> para operações de alta
          performance.
        </p>
      </div>
    </footer>
  );
}
