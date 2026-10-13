import { BirthHubLogo } from './BirthHubLogo.js';

export function BrandEmblemBadge({ className, title }: { className?: string; title?: string }) {
  return <BirthHubLogo variant="symbol" className={className} title={title} />;
}
