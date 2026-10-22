# Termos de Uso e Política de Inteligência Artificial Responsável — Birth Hub 360

**Data de Vigência:** 22 de outubro de 2026  
**Controlador:** Birth Hub 360  
**Versão:** 1.0.0  

---

## 1. Princípios de IA Responsável

1. **Supervisão Humana Ativa (Human-in-the-Loop):** Todas as decisões de qualificação crítica, fechamento contratual e rebalanceamento de carteiras exigem validação e aprovação de operadores humanos. A IA atua estritamente como copiloto e recomendador consultivo.
2. **Transparência e Explicabilidade:** Recomendações e scores preditivos apresentam os fatores ponderadores e justificativas contextuais que embasaram o cálculo.
3. **Privacidade e Minimização (LGPD):** Nenhum dado pessoal não anonimizado é utilizado para treinamento de modelos fundacionais públicos. Todas as chamadas de inferência passam por tokenização prévia (`piiTokenizer.service.ts`).
4. **Resiliência e Continuidade:** O ecossistema opera em cascata com múltiplos provedores e fallback transparente em caso de indisponibilidade de modelos centrais.
