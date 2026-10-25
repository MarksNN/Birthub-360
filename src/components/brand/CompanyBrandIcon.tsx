import type React from 'react';
import type { SVGProps } from 'react';

export type BrandIconProps = SVGProps<SVGSVGElement> & {
  className?: string;
  size?: number | string;
};

// WhatsApp Official SVG (Green circle with phone receiver inside speech bubble)
export function WhatsAppIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="#25D366"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2z"
      />
      <path
        fill="#FFFFFF"
        d="M17.5 14.33c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.17.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.68-1.63-.93-2.24-.24-.58-.49-.5-.68-.51-.18-.01-.38-.01-.58-.01-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.51 0 1.48 1.08 2.91 1.23 3.11.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.07-.13-.27-.2-.57-.35z"
      />
    </svg>
  );
}

// Bitrix24 Official Brand Logo (B24 Blue-to-Orange dynamic circular emblem)
export function Bitrix24Icon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="16" cy="16" r="16" fill="#00AEEF" />
      <circle cx="16" cy="16" r="12" fill="#FFFFFF" />
      <path
        d="M11 11h5a3 3 0 0 1 2.8 4 3 3 0 0 1-2.8 4H11v-8zm3 2.5v1.8h2a.9.9 0 0 0 0-1.8h-2zm0 3.2v1.8h2.2a.9.9 0 0 0 0-1.8H14z"
        fill="#00AEEF"
      />
      <circle cx="21.5" cy="13.5" r="2.2" fill="#F7941D" />
      <path
        d="M20 17.5h3.2v4H20v-4zm0 2.2h1.6"
        stroke="#F7941D"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Gmail Official 4-color SVG
export function GmailIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5v-11z"
        fill="#F2F2F2"
      />
      <path
        d="M22 6.5l-10 7L2 6.5V17.5A2.5 2.5 0 0 0 4.5 20h15a2.5 2.5 0 0 0 2.5-2.5V6.5z"
        fill="#EA4335"
        opacity="0.1"
      />
      <path
        d="M2 6.5C2 5.12 3.12 4 4.5 4L12 9.5 19.5 4c1.38 0 2.5 1.12 2.5 2.5V8L12 14.5 2 8V6.5z"
        fill="#EA4335"
      />
      <path d="M2 8v9.5C2 18.88 3.12 20 4.5 20h2V9.5L2 8z" fill="#4285F4" />
      <path d="M22 8v9.5c0 1.38-1.12 2.5-2.5 2.5h-2V9.5L22 8z" fill="#34A853" />
      <path d="M17.5 20h2c1.38 0 2.5-1.12 2.5-2.5V8l-4.5 3.5V20z" fill="#FBBC05" />
    </svg>
  );
}

// Google Official 4-color 'G'
export function GoogleIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

// Google Calendar Official SVG
export function GoogleCalendarIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="3" y="4" width="18" height="17" rx="3" fill="#FFFFFF" />
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V9H3V7.5z" fill="#4285F4" />
      <path d="M7 2v4M17 2v4" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" />
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontSize="8"
        fontWeight="bold"
        fill="#1F2937"
        fontFamily="sans-serif"
      >
        31
      </text>
    </svg>
  );
}

// HubSpot Official SVG (Sprocket Logo)
export function HubSpotIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="#FF7A59"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M18.1 7.2V4.5a1.8 1.8 0 1 0-1.8 0v2.7a5.2 5.2 0 0 0-2.3 1.3L8.3 4.8a2.1 2.1 0 1 0-1.1 1.6l5.5 3.6a5.2 5.2 0 0 0-.2 1.5c0 .6.1 1.1.2 1.6L7.2 14.7a2.1 2.1 0 1 0 1.1 1.6l5.7-3.7a5.2 5.2 0 1 0 4.1-5.4zm-5.7 6.4a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4z" />
    </svg>
  );
}

// Pipedrive Official SVG (Green circle with white P)
export function PipedriveIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="12" cy="12" r="11" fill="#00A859" />
      <path
        d="M9 7h4a3.5 3.5 0 0 1 0 7H9v4H7V7h2zm0 2.2v2.6h4a1.3 1.3 0 0 0 0-2.6H9z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

// RD Station Official SVG
export function RDStationIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="24" height="24" rx="5" fill="#00C896" />
      <path
        d="M6 7h4.8a3 3 0 0 1 3 3c0 1.3-.8 2.4-2 2.8l2.4 4.2h-2.5L9.6 13H8v4H6V7zm2 4.2h2.8a1.2 1.2 0 0 0 0-2.4H8v2.4z"
        fill="#002244"
      />
      <circle cx="17" cy="9" r="1.5" fill="#002244" />
    </svg>
  );
}

// Monday.com Official SVG (3 colorful curves)
export function MondayIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="6.5" cy="15" r="3" fill="#FF3D57" />
      <path
        d="M10 16a2 2 0 0 1 4 0v-4a2 2 0 0 1 4 0v4"
        stroke="#FFCB00"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="17.5" cy="9.5" r="3" fill="#00C875" />
    </svg>
  );
}

// Slack Official 4-color Hashtag
export function SlackIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5.5 10.5a2 2 0 1 1 0-4h2v4h-2zm3 0a2 2 0 0 1 4 0v5a2 2 0 1 1-4 0v-5z"
        fill="#36C5F0"
      />
      <path
        d="M13.5 5.5a2 2 0 1 1 4 0v2h-4v-2zm0 3a2 2 0 0 1 0 4h-5a2 2 0 1 1 0-4h5z"
        fill="#2EB67D"
      />
      <path
        d="M18.5 13.5a2 2 0 1 1 0 4h-2v-4h2zm-3 0a2 2 0 0 1-4 0v-5a2 2 0 1 1 4 0v5z"
        fill="#E01E5A"
      />
      <path
        d="M10.5 18.5a2 2 0 1 1-4 0v-2h4v2zm0-3a2 2 0 0 1 0-4h5a2 2 0 1 1 0 4h-5z"
        fill="#ECB22E"
      />
    </svg>
  );
}

// Stripe Official Brand SVG
export function StripeIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="#635BFF"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="24" height="24" rx="5" fill="#635BFF" />
      <path
        d="M13.8 9.5c0-.7-.6-1.1-1.6-1.1-1.4 0-2.8.5-3.8 1.1l-.6-2.1c1.2-.6 2.9-1 4.6-1 2.8 0 4.6 1.4 4.6 3.9 0 3.7-5.1 3.2-5.1 4.8 0 .8.7 1.2 1.8 1.2 1.6 0 3.2-.6 4.3-1.3l.6 2.1c-1.4.8-3.2 1.3-5 1.3-3 0-4.8-1.5-4.8-4 0-4 5-3.4 5-4.9z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

// Omie Official ERP Brand SVG
export function OmieIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="24" height="24" rx="5" fill="#001E62" />
      <circle cx="8" cy="12" r="3.5" stroke="#00D2D3" strokeWidth="2" />
      <circle cx="16" cy="12" r="3.5" stroke="#00D2D3" strokeWidth="2" />
      <path d="M8 8.5v7M16 8.5v7" stroke="#00D2D3" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 3CX Official Telephony Brand SVG
export function ThreeCXIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="24" height="24" rx="5" fill="#0099DE" />
      <path
        d="M6 8h3.5a2 2 0 0 1 1.8 2.8L10 12l1.3 1.2A2 2 0 0 1 9.5 16H6v-2h3.2a.5.5 0 0 0 0-1H7v-1.5h2.2a.5.5 0 0 0 0-1H6V8zm7 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zm4-4l2.5 3.5L22 8h-1.6l-1.7 2.4L17 8h-1.6z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

// Salesforce Official Cloud SVG
export function SalesforceIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="#00A1E0"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
    </svg>
  );
}

// Calendly Official SVG
export function CalendlyIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="24" height="24" rx="5" fill="#006BFF" />
      <path
        d="M12 6a6 6 0 1 0 6 6 1 1 0 1 1 2 0 8 8 0 1 1-8-8c1.3 0 2.6.3 3.7.9l-1.3 1.8A6 6 0 0 0 12 6z"
        fill="#FFFFFF"
      />
      <circle cx="15.5" cy="8.5" r="1.5" fill="#00E5FF" />
    </svg>
  );
}

// Zoom Official SVG
export function ZoomIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="24" height="24" rx="5" fill="#2D8CFF" />
      <rect x="4" y="7" width="10" height="10" rx="2" fill="#FFFFFF" />
      <path d="M14 10l5-3v10l-5-3v-4z" fill="#FFFFFF" />
    </svg>
  );
}

// Notion Official SVG
export function NotionIcon({ className = 'w-5 h-5', size, ...props }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M4.46 3.01c.78.07 1.42.3 2.12.87l10.96 8.78V4.86c0-.98-.53-1.57-1.74-1.85L15.8.31l6.73.5-.06.72c-.87.2-1.47.74-1.47 1.77v16.14c0 .88.42 1.4 1.34 1.63l-.06.7-5.96-.36-11.4-9.1v8.28c0 1.25.68 1.79 2.02 1.94l-.06.72-6.42-.47.06-.72c.98-.17 1.55-.77 1.55-1.92V4.86c0-1.07-.63-1.63-1.63-1.85l.06-.7z" />
    </svg>
  );
}

// Dynamic Company Brand Icon Dispatcher
export interface CompanyBrandIconProps extends BrandIconProps {
  name: string;
}

export const CompanyBrandIcon: React.FC<CompanyBrandIconProps> = ({
  name,
  className = 'w-5 h-5',
  size,
  ...props
}) => {
  const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (norm.includes('whatsapp') || norm === 'wpp') {
    return <WhatsAppIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('bitrix')) {
    return <Bitrix24Icon className={className} size={size} {...props} />;
  }
  if (norm.includes('gmail')) {
    return <GmailIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('calendar') || norm.includes('gcal')) {
    return <GoogleCalendarIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('google') || norm.includes('gsuite') || norm.includes('workspace')) {
    return <GoogleIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('hubspot')) {
    return <HubSpotIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('pipedrive')) {
    return <PipedriveIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('rdstation') || norm.includes('rd')) {
    return <RDStationIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('monday')) {
    return <MondayIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('slack')) {
    return <SlackIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('stripe')) {
    return <StripeIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('omie')) {
    return <OmieIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('3cx') || norm.includes('threecx')) {
    return <ThreeCXIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('salesforce')) {
    return <SalesforceIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('calendly')) {
    return <CalendlyIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('zoom')) {
    return <ZoomIcon className={className} size={size} {...props} />;
  }
  if (norm.includes('notion')) {
    return <NotionIcon className={className} size={size} {...props} />;
  }

  // Fallback to Google Icon if unidentified
  return <GoogleIcon className={className} size={size} {...props} />;
};

/**
 * Reusable Company Badge with official SVG icon and formatted company name
 */
export const CompanyBadge: React.FC<{
  name: string;
  label?: string;
  className?: string;
  iconClassName?: string;
}> = ({ name, label, className = '', iconClassName = 'w-4 h-4' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-line bg-surface-2 text-ink shadow-xs transition-colors hover:border-brand/40 ${className}`}
    >
      <CompanyBrandIcon name={name} className={`${iconClassName} shrink-0`} />
      <span>{label || name}</span>
    </span>
  );
};
