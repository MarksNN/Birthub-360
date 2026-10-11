import { describe, expect, it } from 'vitest';
import { getSidebarNavSections } from '../sidebarSections.js';
import { isNavHiddenTab, NAV_HIDDEN_TABS, NAV_TAB_ALIASES, TAB_META } from '../tabMeta.js';

// P0 #693 item 6 (handoff 17→02): voice-hub/outbound/dialer atrás de legacyModuleGate (503).
describe('nav — módulos no gate MODULE_NOT_READY', () => {
  it('esconde voice-hub, outbound e dialer', () => {
    expect([...NAV_HIDDEN_TABS].sort()).toEqual(['dialer', 'outbound', 'voice-hub']);
    expect(isNavHiddenTab('cadence')).toBe(false);
  });

  it('dialer é alias de cadence e não usa mais o rótulo "Discador 3CX"', () => {
    expect(NAV_TAB_ALIASES.dialer).toBe('cadence');
    expect(TAB_META.dialer.label).not.toMatch(/3CX/i);
  });

  it('rótulos remanescentes (palette) marcam indisponível', () => {
    expect(TAB_META['voice-hub'].label).toMatch(/indispon/i);
    expect(TAB_META.outbound.label).toMatch(/indispon/i);
  });

  it('Sidebar não lista nenhum tab escondido, mesmo com todas as permissões', () => {
    const sections = getSidebarNavSections({
      canAccessCommercialIntelligence: true,
      canAccessCopilotoIa: true,
      canManageOperations: true,
      isAdmin: true,
    });
    const tabs = sections.flatMap((s) =>
      s.groups.flatMap((g) => [g.primaryTab, ...(g.subItems ?? []).map((i) => i.tab)]),
    );
    for (const hidden of NAV_HIDDEN_TABS) expect(tabs).not.toContain(hidden);
  });
});
