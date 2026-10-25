import { Link } from 'react-router-dom';

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-bg py-12 px-4 sm:px-6 lg:px-8 font-sans text-ink">
      <main className="max-w-5xl mx-auto vancouver-card p-8 md:p-10 shadow-vancouver">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2 font-display">
            <span className="vancouver-gradient-text">Termos de Uso</span>
          </h1>
          <p className="text-sm text-ink-2 mb-2">
            <strong>Última atualização:</strong> 25 de Setembro de 2026
          </p>
          <div className="bg-alert/10 border border-alert/20 text-alert p-3 rounded text-sm font-semibold inline-block">
            MINUTA SUJEITA À HOMOLOGAÇÃO JURÍDICA
          </div>
        </header>

        <nav aria-label="Sumário" className="mb-10 bg-bg-surface p-6 rounded-lg border border-border">
          <h2 className="text-lg font-semibold font-display text-ink mb-4">Sumário</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-ink-2">
            <li><a href="#aceitacao" className="hover:text-primary transition-colors">1. Identificação e Aceitação</a></li>
            <li><a href="#definicoes" className="hover:text-primary transition-colors">2. Definições e Abrangência dos Serviços</a></li>
            <li><a href="#cadastro" className="hover:text-primary transition-colors">3. Cadastro, Contas e Credenciais</a></li>
            <li><a href="#planos" className="hover:text-primary transition-colors">4. Planos, Assinaturas e Pagamentos</a></li>
            <li><a href="#uso-permitido" className="hover:text-primary transition-colors">5. Uso Permitido e Condutas Proibidas</a></li>
            <li><a href="#crm-dados" className="hover:text-primary transition-colors">6. CRM, Prospecção e Tratamento de Dados Comerciais</a></li>
            <li><a href="#integracoes" className="hover:text-primary transition-colors">7. Integrações Externas</a></li>
            <li><a href="#inteligencia-artificial" className="hover:text-primary transition-colors">8. Inteligência Artificial e Limitações</a></li>
            <li><a href="#protecao-dados" className="hover:text-primary transition-colors">9. Proteção de Dados e LGPD</a></li>
            <li><a href="#cookies" className="hover:text-primary transition-colors">10. Cookies e Consentimento</a></li>
            <li><a href="#confidencialidade" className="hover:text-primary transition-colors">11. Confidencialidade e Segurança</a></li>
            <li><a href="#propriedade-intelectual" className="hover:text-primary transition-colors">12. Propriedade Intelectual</a></li>
            <li><a href="#disponibilidade" className="hover:text-primary transition-colors">13. Disponibilidade, Manutenção e Suporte</a></li>
            <li><a href="#responsabilidades" className="hover:text-primary transition-colors">14. Responsabilidades e Limitações Legais</a></li>
            <li><a href="#suspensao" className="hover:text-primary transition-colors">15. Suspensão e Encerramento de Contas</a></li>
            <li><a href="#atualizacao" className="hover:text-primary transition-colors">16. Atualização dos Termos</a></li>
            <li><a href="#legislacao" className="hover:text-primary transition-colors">17. Legislação Aplicável e Foro</a></li>
            <li><a href="#contato" className="hover:text-primary transition-colors">18. Canais de Contato</a></li>
          </ul>
        </nav>

        <div className="space-y-8">
          <section id="aceitacao">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">1. Identificação e Aceitação</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              O Birth Hub 360 é um Sistema Operacional de Revenue Intelligence licenciado para uso corporativo.
              Ao acessar ou utilizar a plataforma Birth Hub 360, você manifesta sua concordância integral com estes Termos de Uso.
              Caso não concorde com qualquer disposição, você não deve acessar ou utilizar os serviços.
            </p>
          </section>

          <section id="definicoes">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">2. Definições e Abrangência dos Serviços</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              A plataforma é projetada para unificar inteligência preditiva, orquestração de vendas e execução em tempo real, abrangendo pilares como Hub Central, Intelligence & Scoring, Sales Orchestration, Real-time Performance, Revenue Forecast, Copiloto IA, Automações e Cadência & Engajamento. A plataforma atua em ambiente de "Dados em Movimento", unindo sincronização bidirecional, recomendações e ações ativas.
            </p>
          </section>

          <section id="cadastro">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">3. Cadastro, Contas e Credenciais</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              O acesso à plataforma exige credenciais válidas. O usuário é o único responsável por manter a confidencialidade de sua senha e conta. A plataforma utiliza autenticação segura e recursos baseados no cargo/função do usuário. Qualquer atividade realizada sob a sua conta é de sua inteira responsabilidade.
            </p>
          </section>

          <section id="planos">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">4. Planos, Assinaturas e Pagamentos</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              A utilização de módulos executivos, integrações telefônicas, IA de ponta e demais funcionalidades premium está sujeita à concessão de acessos ("Module Access") vinculados ao contrato comercial firmado entre a sua organização e a Birth Hub 360. As condições de cobrança, faturamento, downgrade e upgrade são regidas pelos respectivos contratos vigentes, sem prejuízo da governança global da plataforma.
            </p>
          </section>

          <section id="uso-permitido">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">5. Uso Permitido e Condutas Proibidas</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              O sistema deve ser utilizado estritamente para gestão e orquestração de vendas corporativas. É expressamente proibida a extração em massa indevida de dados, engenharia reversa, inserção de dados fabricados para distorcer métricas comerciais (zero mock), e o compartilhamento de credenciais. O desrespeito a estas regras configura violação grave, passível de bloqueio imediato e responsabilização civil e criminal.
            </p>
          </section>

          <section id="crm-dados">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">6. CRM, Prospecção e Tratamento de Dados Comerciais</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              O Birth Hub 360 processa informações comerciais e leads visando a gestão do pipeline e cadência de engajamento B2B. As organizações são as únicas responsáveis pela origem e legitimidade dos dados que inserem na plataforma, e devem certificar-se de agir de acordo com a legalidade ao executar campanhas, sequenciamentos (E-mail, WhatsApp, LinkedIn e Voz) e registros de CRM.
            </p>
          </section>

          <section id="integracoes">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">7. Integrações Externas</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              A plataforma possui integrações nativas com ferramentas externas como Bitrix24, telefonia 3CX e outros provedores de comunicação. O Birth Hub 360 não se responsabiliza pela disponibilidade ou mudanças nas políticas dessas plataformas de terceiros. A sincronização de dados ocorre de modo resiliente, mas os usuários devem atentar-se às condições dos fornecedores conectados.
            </p>
          </section>

          <section id="inteligencia-artificial">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">8. Inteligência Artificial e Limitações</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Conforme nossos Termos de IA Responsável, a plataforma fornece scores preditivos, assistentes de voz (VoiceHub) e recomendações de um Copiloto IA. Todas as decisões críticas (ex: fechamento contratual) exigem supervisão humana (Human-in-the-Loop). A IA atua como recomendador consultivo. Não utilizamos dados pessoais de nossos clientes para treinar modelos fundacionais abertos, garantindo isolamento através de nossa arquitetura RAG (Vector Database).
            </p>
          </section>

          <section id="protecao-dados">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">9. Proteção de Dados e LGPD</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              A privacidade e a proteção de dados são primordiais. Realizamos sanitização de PII e tratamento de acordo com a LGPD. O tratamento, retenção, e controle dos dados pessoais estão detalhados em nossa <Link to="/privacy" className="text-primary hover:underline font-semibold">Política de Privacidade</Link>.
            </p>
          </section>

          <section id="cookies">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">10. Cookies e Consentimento</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Utilizamos cookies e tecnologias similares estritamente para manter a sessão do usuário (autenticação segura e RBAC) e garantir o funcionamento correto e performático do sistema.
            </p>
          </section>

          <section id="confidencialidade">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">11. Confidencialidade e Segurança</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Adotamos práticas robustas de segurança, incluindo criptografia, controle de acesso e isolamento multi-tenant via Row Level Security (RLS) no banco de dados. Informações sigilosas de negócio e inteligência de mercado estão blindadas na arquitetura do sistema, devendo o usuário também colaborar para o não-vazamento de suas telas e informações operacionais.
            </p>
          </section>

          <section id="propriedade-intelectual">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">12. Propriedade Intelectual</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Todos os direitos sobre a plataforma Birth Hub 360, seus sistemas (front-end, back-end, banco de dados, modelos de IA), logotipos, interfaces, manuais e conteúdos proprietários, pertencem exclusivamente à Birth Hub 360 e/ou seus licenciadores. Nenhuma permissão de uso do software implica em transferência de titularidade.
            </p>
          </section>

          <section id="disponibilidade">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">13. Disponibilidade, Manutenção e Suporte</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Buscamos oferecer alta disponibilidade para a plataforma por meio de arquitetura moderna (Kubernetes, Postgres, Redis). Contudo, manutenções preventivas, atualizações de sistema ou incidentes imprevisíveis podem causar indisponibilidades temporárias. O suporte técnico é provido de acordo com as diretrizes do plano contratado.
            </p>
          </section>

          <section id="responsabilidades">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">14. Responsabilidades e Limitações Legais</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              O Birth Hub 360 é fornecido "no estado em que se encontra" e foca em potencializar processos. Não garantimos fechamento de negócios ou elevação automática de lucros, vez que estes dependem da operação humana. Nosso dever concentra-se no funcionamento adequado das ferramentas de orquestração e recomendação.
            </p>
          </section>

          <section id="suspensao">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">15. Suspensão e Encerramento de Contas</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Reservamo-nos o direito de suspender ou encerrar imediatamente o acesso de organizações ou usuários que violem estes Termos de Uso, a Política de Privacidade ou que incorram em inadimplência contratual.
            </p>
          </section>

          <section id="atualizacao">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">16. Atualização dos Termos</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Estes Termos podem ser atualizados periodicamente para refletir mudanças na plataforma, na legislação, ou em nossos modelos de negócio. Alterações significativas serão comunicadas através do acesso à plataforma.
            </p>
          </section>

          <section id="legislacao">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">17. Legislação Aplicável e Foro</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial o Marco Civil da Internet e a LGPD. Fica eleito o foro da Comarca de Ribeirão Preto - São Paulo para dirimir eventuais litígios oriundos deste documento.
            </p>
          </section>

          <section id="contato">
            <h2 className="text-xl font-semibold font-display text-ink mb-3">18. Canais de Contato</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Para dúvidas sobre o serviço, suporte ou termos legais e de uso, entre em contato através dos canais de suporte providenciados pelo seu administrador ou via e-mail oficial designado no seu contrato. Para questões de privacidade e dados, consulte nossa Política de Privacidade.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
