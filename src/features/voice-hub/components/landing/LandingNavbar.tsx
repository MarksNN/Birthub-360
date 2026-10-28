import { ArrowRight, Menu, Sparkles, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BirthHubLogo } from '../../../../components/brand/BirthHubLogo.js';

export function LandingNavbar(): React.ReactElement {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NAV_LINKS = [
    { label: 'Benefícios', href: '#beneficios' },
    { label: 'Módulos', href: '#modulos' },
    { label: 'Como Funciona', href: '#funcionamento' },
    { label: 'Diferenciais', href: '#comparativo' },
    { label: 'Segurança', href: '#seguranca' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-midnight/90 backdrop-blur-xl border-b border-white/5 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <BirthHubLogo variant="micro" animated className="h-9 w-9" />
          <div className="leading-tight text-left">
            <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              Birth Hub 360°
              <Sparkles className="w-3.5 h-3.5 text-brand" />
            </span>
            <span className="text-[10px] text-white/50 tracking-widest uppercase block">
              Command Center
            </span>
          </div>
        </Link>

        {/* Links Desktop */}
        <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-white/70">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        {/* Ações Desktop */}
        <div className="hidden lg:flex items-center gap-4">
          <Link
            to="/login"
            className="text-xs font-semibold text-white/80 hover:text-white px-3 py-2 transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-midnight font-bold text-xs shadow-md hover:bg-amber-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Acessar Plataforma</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Botão Mobile */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white"
            aria-label="Abrir menu de navegação"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu Mobile Retrátil */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-white/10 bg-midnight/98 px-4 pt-3 pb-6 space-y-3 text-left">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-white/80 hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
            <Link
              to="/login"
              className="w-full py-2.5 text-center text-sm font-semibold rounded-xl bg-brand text-midnight"
            >
              Acessar Plataforma
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
