# Política de Privacidade — Birth Hub 360

**Data de Vigência:** 25 de Outubro de 2026
**Última Atualização:** 25 de Outubro de 2026
**Controlador:** Birth Hub 360
**Encarregado de Dados (DPO):** privacy@birthhub360.com (Agente 21 — Privacidade e LGPD)

Bem-vindo à Política de Privacidade do **Birth Hub 360**. Nossa missão é fornecer uma plataforma robusta de inteligência de vendas e CRM, respeitando integralmente a sua privacidade e a legislação vigente de proteção de dados, especialmente a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).

Esta política descreve de forma clara e transparente como coletamos, utilizamos, armazenamos, compartilhamos e descartamos seus dados pessoais, além de detalhar os seus direitos como titular de dados e como exercê-los.

---

## 1. Princípios de Privacidade
O Birth Hub 360 fundamenta-se nos seguintes princípios inegociáveis de privacidade:
- **Minimização de Dados:** Coletamos e mantemos apenas os dados estritamente necessários para as finalidades especificadas.
- **Transparência:** Você tem o direito de saber exatamente quais dados processamos e por quê.
- **Segurança por Design:** A privacidade e a segurança são construídas na base de nossa arquitetura (ex: criptografia em repouso e trânsito, RLS para isolamento Multi-Tenant).
- **Imutabilidade de Auditoria:** Mantemos trilhas inalteráveis de consentimentos e operações de tratamento.

---

## 2. Dados que Coletamos, Finalidades e Bases Legais

Conforme o nosso Inventário de Operações de Tratamento (ROPA), processamos as seguintes categorias de dados:

### A. Usuários da Plataforma (Operadores)
- **Dados:** Nome, e-mail corporativo, logs de acesso e endereço IP.
- **Finalidade:** Autenticação na plataforma, controle de acesso (RBAC), auditoria de segurança e suporte técnico.
- **Base Legal:** Cumprimento de obrigação legal (Marco Civil da Internet) e Execução de contrato.

### B. Contatos Comerciais (Leads B2B)
- **Dados:** Nome, e-mail comercial, telefone/WhatsApp, cargo e empresa.
- **Finalidade:** Qualificação, prospecção B2B e comunicação de negócios.
- **Base Legal:** Legítimo interesse ou Contrato preliminar, balanceado com o direito de opt-out incondicional.

### C. Interlocutores em Ligações (VoiceHub)
- **Dados:** Voz, transcrição de chamadas e áudio gravado.
- **Finalidade:** Coaching da equipe comercial, registro unificado de reuniões e sumarização por Inteligência Artificial.
- **Base Legal:** Consentimento explícito e inequívoco coletado no início da chamada, e Legítimo interesse para arquivamento operacional.

### D. Assinantes de Propostas Comerciais
- **Dados:** Nome, CPF, e-mail e hash criptográfico de assinatura.
- **Finalidade:** Formalização, assinatura e celebração de contratos mercantis e legais.
- **Base Legal:** Execução de contrato e Cumprimento de obrigação legal/fiscal.

---

## 3. Como Protegemos Seus Dados

Adotamos rigorosas medidas técnicas e organizacionais para proteger as suas informações contra acessos não autorizados, perdas, destruições ou alterações:

- **Isolamento de Dados (Multi-Tenancy):** Utilizamos Row Level Security (RLS) avançado para garantir que os dados de uma organização jamais se cruzem com os de outra.
- **Criptografia:** Tráfego 100% encriptado via TLS 1.3 (em trânsito) e criptografia AES-256 no banco de dados (em repouso).
- **Anonimização (K-Anonymity):** PIIs (Informações Pessoalmente Identificáveis) como CPF, números de cartão de crédito e telefones são automaticamente mascaradas (tokenização) antes de qualquer repasse para provedores externos (ex: IA/LLMs).

---

## 4. Retenção e Exclusão de Dados

Retemos seus dados pelo tempo estritamente necessário para cumprir a finalidade para a qual foram coletados:

- **Contatos Comerciais (Leads):** Retidos durante a duração do ciclo comercial ativo, acrescido de 12 meses. Após isso, os dados sofrem anonimização irreversível.
- **Logs de Conexão de Usuários:** Retidos por 6 meses para cumprimento do Marco Civil da Internet, seguido de exclusão ou arquivamento frio.
- **Áudios de Ligações:** O áudio bruto (blob) é mantido por 90 dias e posteriormente deletado. Transcrições são anonimizadas preservando apenas contexto, sem PII.
- **Assinaturas Contratuais:** Retidos por 5 anos pós-encerramento contratual para fins de auditoria fiscal e contábil, conforme o Código Civil, e então descartados de forma segura.

O descarte é garantido por nossos serviços automatizados e idempotentes de "Data Subject Erasure", preservando unicamente identificadores opacos para integridade do sistema.

---

## 5. Seus Direitos (LGPD - Arts. 18 e 19)

Sob a LGPD, você, titular dos dados, possui direitos amplos, incluindo:

1. **Confirmação e Acesso:** Saber se tratamos seus dados e obter cópia das informações tratadas.
2. **Correção:** Solicitar a correção de dados incompletos, inexatos ou desatualizados.
3. **Anonimização, Bloqueio ou Eliminação:** Para dados desnecessários, excessivos ou tratados em desconformidade com a lei (DSR).
4. **Portabilidade:** Transferência de seus dados a outro fornecedor de serviços ou produtos.
5. **Revogação do Consentimento:** Direito de retirar seu consentimento a qualquer momento (sem afetar a legalidade do processamento anterior), de maneira simples e gratuita.

### Como Exercer Seus Direitos
Para abrir uma Solicitação de Direitos do Titular (DSR), como o esquecimento ou a cópia dos seus dados, entre em contato via e-mail: **privacy@birthhub360.com**.

Nossos fluxos garantem atendimento ágil e rastreável a todas as solicitações válidas.

---

## 6. Alterações a Esta Política
Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças tecnológicas ou normativas. Notificaremos os usuários da plataforma caso ocorram modificações substanciais.

---
*Para dúvidas técnicas sobre segurança da plataforma ou relatórios sobre compliance, consulte também nossa [Segurança e Compliance](SECURITY.md).*