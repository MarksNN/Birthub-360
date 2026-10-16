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

/**
 * Logotipo Horizontal Oficial Vetorial Birth Hub 360° (Catálogo #1).
 * Wordmark institucional oficial com anel orbital e tipografia de precisão.
 */
export function BirthHubOfficialLogoHorizontal({
  className = '',
  width = 320,
}: {
  className?: string;
  width?: number | string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 946 256"
      width={width}
      height="auto"
      role="img"
      aria-label="Birth Hub 360"
      className={className}
    >
      <defs>
        <linearGradient id="bh-o0" gradientUnits="userSpaceOnUse" x1="127" y1="46" x2="199" y2="87">
          <stop offset="0" stopColor="#00D4FF" />
          <stop offset="1" stopColor="#FF2D9B" />
        </linearGradient>
        <linearGradient
          id="bh-o1"
          gradientUnits="userSpaceOnUse"
          x1="198"
          y1="86"
          x2="198"
          y2="170"
        >
          <stop offset="0" stopColor="#FF2D9B" />
          <stop offset="1" stopColor="#FFC107" />
        </linearGradient>
        <linearGradient
          id="bh-o2"
          gradientUnits="userSpaceOnUse"
          x1="199"
          y1="168"
          x2="127"
          y2="210"
        >
          <stop offset="0" stopColor="#FFC107" />
          <stop offset="1" stopColor="#00D4FF" />
        </linearGradient>
        <radialGradient id="bh-sheen" cx="0.3" cy="0.25" r="0.55">
          <stop offset="0" stopColor="#FFF" stopOpacity="0.34" />
          <stop offset="1" stopColor="#FFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bh-gold-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7E9B8" />
          <stop offset="0.42" stopColor="#FFC107" />
          <stop offset="0.68" stopColor="#D97706" />
          <stop offset="1" stopColor="#FDE68A" />
        </linearGradient>
      </defs>
      <g id="bh-emblem">
        <circle
          cx="128"
          cy="128"
          r="118"
          fill="none"
          stroke="#FFC107"
          strokeWidth="11"
          opacity="0.6"
          strokeDasharray="1.5 10"
        />
        <g fill="none" strokeWidth="16">
          <path stroke="url(#bh-o0)" d="M127 46 A82 82 0 0 1 199 87" />
          <path stroke="url(#bh-o1)" d="M198 86 A82 82 0 0 1 198 170" />
          <path stroke="url(#bh-o2)" d="M199 168 A82 82 0 0 1 127 210" />
        </g>
        <circle cx="128" cy="128" r="90" fill="url(#bh-sheen)" />
        <circle cx="128" cy="128" r="74" fill="#0D0D0D" />
        <circle cx="128" cy="128" r="61" fill="none" stroke="#FFC107" strokeWidth="5" />
        <line x1="64" y1="128" x2="192" y2="128" stroke="#FFC107" strokeWidth="3" opacity="0.5" />
        <path
          fill="#F8F9FF"
          transform="matrix(0.074 0 0 -0.074 104.45 154.2)"
          d="M450.4 707Q574.2 707 627.9 670.8Q681.6 634.6 681.6 573.4Q681.6 520.8 646.8 476.7Q612 432.6 547 404.5Q482 376.4 391 370.8Q511 369.4 573.8 326.1Q636.6 282.8 636.6 218.2Q636.6 165.8 612.2 125.1Q587.8 84.4 543.2 56.4Q498.6 28.4 436 14.2Q373.4 0 297 0Q267.8 0 227.6 1.5Q187.4 3 121 3Q94.8 3 63.8 2.5Q32.8 2 3.7 1.5Q-25.4 1 -45 0L-41 20Q-7 22 12 28Q31 34 42 52Q53 70 62 106L194 602Q201.8 632.8 202.4 651.3Q203 669.8 188.5 678.5Q174 687.2 135 688L140 708Q159.6 707 188.2 706.5Q216.8 706 247.7 705.5Q278.6 705 303 705Q353.2 705 385.7 706Q418.2 707 450.4 707ZM266 359 270 376H339.2Q393.8 376 430.6 407.9Q467.4 439.8 486.2 490.8Q505 541.8 505 596.8Q505 636.6 491.5 662.3Q478 688 438.6 688Q413 688 401 674.1Q389 660.2 378 617L243 106Q238.2 86.4 235.7 67.1Q233.2 47.8 242.2 35.4Q251.2 23 278.8 23Q331.6 23 368.9 53.4Q406.2 83.8 426.6 132.9Q447 182 447 237.2Q447 270.4 437.2 297.9Q427.4 325.4 404.3 342.2Q381.2 359 341.6 359Z"
        />
      </g>
      <text
        x="280"
        y="155"
        fontFamily="Sora, sans-serif"
        fontWeight="800"
        fontSize="82"
        fill="url(#bh-gold-metal)"
        letterSpacing="-2"
      >
        BIRTH HUB <tspan fill="#00D4FF">360°</tspan>
      </text>
    </svg>
  );
}

/**
 * Emblema Orbital Oficial (Core Icon) (Catálogo #2).
 * Símbolo circular autônomo com anel de órbita 360° e monograma 'B'.
 */
export function BirthHubOfficialEmblem({
  className = '',
  size = 56,
}: {
  className?: string;
  size?: number | string;
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="emblem-arc-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="50%" stopColor="#FF2D9B" />
          <stop offset="100%" stopColor="#FFC107" />
        </linearGradient>
      </defs>
      <circle
        cx="128"
        cy="128"
        r="118"
        fill="none"
        stroke="url(#emblem-arc-core)"
        strokeWidth="12"
        strokeDasharray="6 14"
      />
      <circle cx="128" cy="128" r="82" fill="#0D0D0D" />
      <circle cx="128" cy="128" r="66" fill="none" stroke="#FFC107" strokeWidth="3" opacity="0.6" />
      <line x1="62" y1="128" x2="194" y2="128" stroke="#FFC107" strokeWidth="2" opacity="0.4" />
      <path
        fill="#F8F9FF"
        transform="matrix(0.074 0 0 -0.074 104.45 154.2)"
        d="M450.4 707Q574.2 707 627.9 670.8Q681.6 634.6 681.6 573.4Q681.6 520.8 646.8 476.7Q612 432.6 547 404.5Q482 376.4 391 370.8Q511 369.4 573.8 326.1Q636.6 282.8 636.6 218.2Q636.6 165.8 612.2 125.1Q587.8 84.4 543.2 56.4Q498.6 28.4 436 14.2Q373.4 0 297 0Q267.8 0 227.6 1.5Q187.4 3 121 3Q94.8 3 63.8 2.5Q32.8 2 3.7 1.5Q-25.4 1 -45 0L-41 20Q-7 22 12 28Q31 34 42 52Q53 70 62 106L194 602Q201.8 632.8 202.4 651.3Q203 669.8 188.5 678.5Q174 687.2 135 688L140 708Q159.6 707 188.2 706.5Q216.8 706 247.7 705.5Q278.6 705 303 705Q353.2 705 385.7 706Q418.2 707 450.4 707ZM266 359 270 376H339.2Q393.8 376 430.6 407.9Q467.4 439.8 486.2 490.8Q505 541.8 505 596.8Q505 636.6 491.5 662.3Q478 688 438.6 688Q413 688 401 674.1Q389 660.2 378 617L243 106Q238.2 86.4 235.7 67.1Q233.2 47.8 242.2 35.4Q251.2 23 278.8 23Q331.6 23 368.9 53.4Q406.2 83.8 426.6 132.9Q447 182 447 237.2Q447 270.4 437.2 297.9Q427.4 325.4 404.3 342.2Q381.2 359 341.6 359Z"
      />
    </svg>
  );
}
