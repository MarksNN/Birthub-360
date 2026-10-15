import symbol from '../../../identidade-visual/birthhub360/logos/birthhub360-simbolo.svg';
import icon from '../../../identidade-visual/birthhub360/logos/birthhub360-icone.svg';
import horizontal from '../../../identidade-visual/birthhub360/logos/birthhub360-logo-horizontal.svg';

export type BirthHubLogoVariant = 'core' | 'mark' | 'micro' | 'horizontal' | 'symbol' | 'icon';
interface BirthHubLogoProps {
  variant?: BirthHubLogoVariant;
  className?: string;
  title?: string;
  animated?: boolean;
}

export function BirthHubLogo({
  variant = 'mark',
  className,
  title,
  animated = true,
}: BirthHubLogoProps) {
  const src =
    variant === 'horizontal'
      ? horizontal
      : variant === 'core' || variant === 'symbol'
        ? symbol
        : icon;

  const imageElement = (
    <img
      src={src}
      className={`birthhub-logo-img ${animated ? 'birthhub-logo-animated' : ''} ${className ?? ''}`}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      draggable={false}
      style={{ objectFit: 'contain' }}
    />
  );

  if (animated) {
    return (
      <span className="birthhub-logo-animated-wrapper inline-flex items-center justify-center relative group">
        <span className="birthhub-logo-glow-aura pointer-events-none absolute -inset-1 rounded-full opacity-60 blur-md group-hover:opacity-100 transition-opacity" />
        {imageElement}
      </span>
    );
  }

  return imageElement;
}

export function BirthHubSignature({ className }: { className?: string }) {
  return <BirthHubLogo variant="horizontal" className={className} title="Birth Hub 360º" />;
}

export function BirthHubWordmark({ className }: { className?: string }) {
  return (
    <span className={`font-display font-bold text-ink ${className ?? ''}`}>Birth Hub 360º</span>
  );
}
