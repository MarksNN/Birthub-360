import type React from 'react';
import { Button } from '@/components/ui/Button';
import type { AuthFormState } from '../hooks/useAuthForm';

interface LoginFormCardProps {
  formState: AuthFormState;
  onEmailChange: (email: string) => void;
  onRememberChange: (remember: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function LoginFormCard({
  formState,
  onEmailChange,
  onRememberChange,
  onSubmit,
}: LoginFormCardProps) {
  return (
    <div className="w-full max-w-md space-y-8 rounded-card-lg bg-surface p-8 shadow-card border border-border-subtle">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Acesse a Plataforma</h2>
        <p className="text-sm text-ink-muted">
          Entre com seu e-mail corporativo para acessar o hub comercial.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {formState.errorMessage && (
          <div
            role="alert"
            className="rounded-card border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
          >
            {formState.errorMessage}
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="auth-email"
            className="block text-xs font-semibold uppercase tracking-wider text-ink-muted"
          >
            E-mail Corporativo
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={formState.email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={formState.isLoading}
            placeholder="nome@empresa.com.br"
            className="w-full rounded-md border border-border-subtle bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none text-ink-muted">
            <input
              type="checkbox"
              checked={formState.rememberMe}
              onChange={(e) => onRememberChange(e.target.checked)}
              disabled={formState.isLoading}
              className="h-4 w-4 rounded border-border-subtle text-brand focus:ring-brand"
            />
            Manter sessão ativa
          </label>
          <a
            href="/recuperar-senha"
            className="font-medium text-brand hover:underline focus:outline-none"
          >
            Esqueceu a senha?
          </a>
        </div>

        <Button type="submit" className="w-full" disabled={formState.isLoading}>
          {formState.isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
        </Button>
      </form>
    </div>
  );
}
