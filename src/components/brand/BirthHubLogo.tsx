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

export function BirthHubLogo({ variant = 'mark', className, title }: BirthHubLogoProps) {
  const src =
    variant === 'horizontal'
      ? horizontal
      : variant === 'core' || variant === 'symbol'
        ? symbol
        : icon;
  return (
    <img
      src={src}
      className={className}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      draggable={false}
      style={{ objectFit: 'contain' }}
    />
  );
}

export function BirthHubSignature({ className }: { className?: string }) {
  return <BirthHubLogo variant="horizontal" className={className} title="Birth Hub 360º" />;
}

export function BirthHubWordmark({ className }: { className?: string }) {
  return (
    <span className={`font-display font-bold text-ink ${className ?? ''}`}>Birth Hub 360º</span>
  );
}
