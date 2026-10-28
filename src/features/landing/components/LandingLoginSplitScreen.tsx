import { lazy, Suspense } from 'react';
import { useAuthForm } from '../hooks/useAuthForm';
import { LoginFormCard } from './LoginFormCard';

const LandingHeroScene = lazy(() =>
  import('./LandingHeroScene').then((mod) => ({ default: mod.LandingHeroScene })),
);

export function LandingLoginSplitScreen() {
  const { formState, setEmail, setRememberMe, handleLoginSubmit } = useAuthForm();

  return (
    <main className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-12 bg-background text-foreground">
      <section className="relative hidden lg:flex lg:col-span-7 flex-col justify-between overflow-hidden p-12">
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted/20" />}>
          <LandingHeroScene />
        </Suspense>
      </section>

      <section className="flex col-span-1 lg:col-span-5 items-center justify-center p-6 sm:p-12">
        <LoginFormCard
          formState={formState}
          onEmailChange={setEmail}
          onRememberChange={setRememberMe}
          onSubmit={handleLoginSubmit}
        />
      </section>
    </main>
  );
}
