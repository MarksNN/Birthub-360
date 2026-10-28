import { Lock } from 'lucide-react';
import type React from 'react';
import type { ProductModuleKey } from '../../config/product-modules.js';
import { useOrganizationModules } from '../../hooks/useOrganizationModules.js';
import { Card } from '../ui/Card.js';

interface Props {
  module: ProductModuleKey;
  children: React.ReactNode;
}

export function RequireProductModule({ module, children }: Props) {
  const { isModuleActive, isLoading } = useOrganizationModules();

  if (isLoading) {
    return <div className="p-8 flex justify-center text-ink-2">Verificando acesso...</div>;
  }

  if (!isModuleActive(module)) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Card padding="lg" className="max-w-md text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-ink-2" />
          <h2 className="text-xl font-bold mb-2">Módulo não ativado</h2>
          <p className="text-ink-2 mb-6">
            A sua organização não ativou o módulo correspondente a esta funcionalidade.
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
