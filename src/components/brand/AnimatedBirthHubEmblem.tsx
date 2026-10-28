import { BirthHubLogo } from './BirthHubLogo.js';

interface AnimatedBirthHubEmblemProps {
  size?: number;
  className?: string;
  showCta?: boolean;
  ctaText?: string;
  onAction?: () => void;
}
export function AnimatedBirthHubEmblem({
  size = 210,
  className = '',
  showCta = true,
  ctaText = 'Acessar Command Center →',
  onAction,
}: AnimatedBirthHubEmblemProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={onAction}
        aria-label="Acessar Birth Hub 360"
        className="border-0 bg-transparent p-2 rounded-[var(--radius-control)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)] motion-safe:transition-transform motion-safe:hover:scale-105"
      >
        <span style={{ width: size, height: size }} className="block">
          <BirthHubLogo variant="symbol" className="h-full w-full" />
        </span>
        {showCta && <span className="block mt-3 font-sans text-brand">{ctaText}</span>}
      </button>
    </div>
  );
}
