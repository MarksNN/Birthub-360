# 08 — Release main fix (2026-10-20)

## Falha
Runs 39501881372 (af52074) e 39504974952 (3a1611f), job `application gate`, step **Audit for vulnerabilities (waiver-aware)** (`npm run security:audit-waivers`):
`vite (high): GHSA-698V-4R3X-3VCV, GHSA-R825-W8MM-5PXW, GHSA-587H-7WMJ-H5PM` (vite <=6.4.3, sem waiver). Job `build`/"Consolidar veredito" falha em cascata.
Obs.: waiver vencido (2026-10-10) em docs/security/AUDIT_WAIVERS.md, warning não bloqueante.

## Fix
`vite` ^6.2.3 → ^6.4.4 (lock: 6.4.3 → 6.4.4, patch). Sem waiver novo.

## Gates locais (branch agente/08-release-main-fix)
- security:audit-waivers: ✅ nenhum HIGH/CRITICAL
- format:check ✅ · typecheck ✅ · lint ✅ · check:hotspots ✅ · build ✅
- test:architecture ✅ (Node 22; dependency-cruiser exige ^22, falha em Node 20 local)
- test:unit: inconclusivo localmente (vitest "Worker exited unexpectedly" — ambiente); CI é a referência.
- eval:golden: não executado (precisa de chaves LLM).
