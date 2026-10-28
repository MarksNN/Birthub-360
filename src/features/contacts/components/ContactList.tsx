import { motion } from 'framer-motion';
import {
  Building,
  Edit,
  Eye,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  Users,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button.js';
import { useConfirmDialog } from '../../../components/ui/ConfirmDialog.js';
import { EmptyState } from '../../../components/ui/EmptyState.js';
import { Input } from '../../../components/ui/Input.js';
import { LinkedinIcon as Linkedin } from '../../../components/ui/icons/LinkedinIcon.js';
import { PageTitleCard } from '../../../components/ui/PageTitleCard.js';
import { Pagination } from '../../../components/ui/Pagination.js';
import { type ColumnDef, VirtualTable } from '../../../components/ui/VirtualTable.js';
import { useContacts } from '../../../hooks/useDatabase.js';
import { clientLogger } from '../../../lib/clientLogger.js';
import { contactsDB } from '../../../lib/db.js';
import type { PaletteIntent } from '../../../lib/paletteIntent.js';
import { toast } from '../../../lib/toast.js';
import { getWhatsAppLink } from '../../../shared/utils/contact-links.js';
import type { Contact } from '../../../types/index.js';
import { ContactDetail } from './ContactDetail.js';
import { ContactForm } from './ContactForm.js';

// Cor categórica por senioridade (sem significado semântico de estado — não é ok/warn/danger, por
// isso não usa os tokens de marca/semânticos do projeto). Achado real: só tinha a variante clara
// (bg-*-100/text-*-700), ilegível no tema escuro (pastel claro sobre superfície escura). Cada tom
// ganhou o par `dark:` correspondente, mesma convenção já usada em Badge.tsx.
const SENIORITY_COLORS: Record<string, string> = {
  'C-Level':
    'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
  Director:
    'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
  VP: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
  Manager:
    'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
  Analyst: 'bg-surface-2 text-ink-2 border-line',
};

export function ContactList() {
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [detailContactId, setDetailContactId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirmDialog();

  // Se o Command Palette navegou aqui com um termo de busca, aplica antes do primeiro fetch.
  // Limpa o state da entrada de histórico logo em seguida (replace) pra um F5 nesta tela não
  // reaplicar a mesma busca de novo — location.state, ao contrário do singleton antigo, sobrevive
  // a reload porque é persistido pelo próprio navegador junto da entrada de histórico.
  useEffect(() => {
    const intent = location.state as PaletteIntent | null;
    if (intent?.type === 'prefill-search') {
      setInputValue(intent.value);
      setSearchTerm(intent.value);
      navigate(location.pathname, { replace: true, state: null });
    } else if (intent?.type === 'open-create') {
      setIsFormOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [navigate, location.state, location.pathname]);

  // Espera o usuário parar de digitar antes de disparar a busca no servidor — evita uma
  // requisição por tecla (mesmo padrão de debounce já usado em CommandPalette.tsx:82-108).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(inputValue);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [inputValue]);

  const { contacts, meta, loading, error, refetch, deleteContact } = useContacts({
    page,
    limit: pageSize,
    search: searchTerm || undefined,
  });

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const totalPages = meta?.totalPages ?? 1;

  const handleDelete = useCallback(
    async (id: string) => {
      if (
        !(await confirm({
          title: 'Excluir contato',
          description: 'Excluir este contato?',
          confirmLabel: 'Excluir',
          variant: 'danger',
        }))
      )
        return;
      try {
        await deleteContact(id);
        toast.success('Contato excluído.');
      } catch (error: any) {
        clientLogger.error({ err: error }, 'Error deleting contact');
        toast.error(
          error instanceof Error
            ? error.message
            : 'Falha ao excluir o contato — confira se você tem permissão.',
        );
      }
    },
    [confirm, deleteContact],
  );

  const handleEnrich = useCallback(
    async (id: string) => {
      setEnrichingId(id);
      try {
        await contactsDB.enrich(id);
        await refetch();
        toast.success('Contato enriquecido com sucesso.');
      } catch (error: any) {
        clientLogger.error({ err: error }, 'Error enriching contact');
        toast.error(error instanceof Error ? error.message : 'Falha ao enriquecer o contato.');
      } finally {
        setEnrichingId(null);
      }
    },
    [refetch],
  );

  const handleSave = () => {
    setIsFormOpen(false);
    setSelectedContact(null);
    refetch();
  };

  const columns: ColumnDef<Contact>[] = useMemo(
    () => [
      {
        key: 'contato',
        header: 'Contato',
        width: '28%',
        render: (contact) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand-ink dark:text-brand font-black text-sm shrink-0 border border-brand/20 shadow-sm">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-ink text-sm truncate">{contact.name}</p>
              <p className="text-xs text-ink-2 font-medium truncate">
                {contact.role || contact.department || '—'}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'empresa',
        header: 'Empresa',
        width: '20%',
        render: (contact) => (
          <div className="flex items-center gap-1.5 text-xs text-ink-2 font-semibold">
            <Building className="w-3.5 h-3.5 text-ink-2 shrink-0" />
            <span className="truncate max-w-[180px]">
              {contact.company?.tradeName || contact.company?.legalName || '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'canais',
        header: 'Canais',
        width: '24%',
        render: (contact) => (
          <div className="space-y-0.5">
            {contact.email && (
              <div className="flex items-center gap-1.5 text-[11px] text-ink-2">
                <Mail className="w-3 h-3 text-brand shrink-0" />
                <span className="truncate max-w-[160px] font-medium">{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-1.5 text-[11px] text-ink-2">
                <Phone className="w-3 h-3 text-sky-500 shrink-0" />
                <span className="font-medium">{contact.phone}</span>
              </div>
            )}
            {(contact.whatsapp || contact.phone) &&
              getWhatsAppLink(contact.whatsapp || contact.phone) && (
                <a
                  href={getWhatsAppLink(contact.whatsapp || contact.phone)}
                  target="_blank"
                  rel="noreferrer"
                  title="Número coletado — a existência de WhatsApp não foi verificada"
                  className="flex items-center gap-1.5 text-[11px] text-emerald-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="w-3 h-3 shrink-0" />
                  <span className="font-medium">WhatsApp</span>
                </a>
              )}
            {contact.linkedin && (
              <a
                href={contact.linkedin}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-info-active dark:text-info hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Linkedin className="w-3 h-3 shrink-0" />
                <span className="font-medium">LinkedIn</span>
              </a>
            )}
          </div>
        ),
      },
      {
        key: 'seniority',
        header: 'Seniority',
        width: 120,
        render: (contact) =>
          contact.seniority ? (
            <span
              className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${SENIORITY_COLORS[contact.seniority] ?? 'bg-surface-2 text-ink-2 border-line'}`}
            >
              {contact.seniority}
            </span>
          ) : (
            <span className="text-xs text-ink-2">—</span>
          ),
      },
      {
        key: 'acoes',
        header: <span className="text-right block w-full">Ações</span>,
        width: 160,
        align: 'right',
        render: (contact) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setDetailContactId(contact.id)}
              className="p-2 rounded-xl bg-surface-2 text-ink-2 border border-line hover:bg-line transition-colors cursor-pointer"
              title="Ver detalhes"
              aria-label={`Ver detalhes de ${contact.name}`}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleEnrich(contact.id)}
              disabled={!!enrichingId}
              className="p-2 rounded-xl bg-brand/10 text-brand-ink dark:text-brand border border-brand/20 hover:bg-brand/20 transition-colors cursor-pointer disabled:opacity-40"
              title="Validar e enriquecer contato"
              aria-label={`Validar e enriquecer ${contact.name}`}
            >
              {enrichingId === contact.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedContact(contact);
                setIsFormOpen(true);
              }}
              className="p-2 rounded-xl bg-info/10 text-info-active dark:text-info border border-info/20 hover:bg-info/20 transition-colors cursor-pointer"
              title="Editar contato"
              aria-label={`Editar ${contact.name}`}
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(contact.id)}
              className="p-2 rounded-xl bg-danger/10 text-danger-active dark:text-danger border border-danger/20 hover:bg-danger/20 transition-colors cursor-pointer"
              title="Excluir contato"
              aria-label={`Excluir ${contact.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    [enrichingId, handleDelete, handleEnrich],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8"
    >
      <div className="w-full space-y-6">
        {/* Header */}
        <PageTitleCard
          title="Contatos & Decisores"
          subtitle={
            loading
              ? 'Carregando...'
              : `${meta?.total ?? contacts.length} contato${(meta?.total ?? contacts.length) !== 1 ? 's' : ''} no banco de dados`
          }
          icon={<Users className="h-5 w-5" />}
          accent="iris"
          actions={
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-ink-2 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  aria-label="Buscar contatos"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Buscar por nome, cargo, e-mail..."
                  className="pl-10 text-xs font-semibold w-56 sm:w-64"
                />
              </div>
              <Button
                type="button"
                onClick={() => {
                  setSelectedContact(null);
                  setIsFormOpen(true);
                }}
                size="default"
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Novo Contato
              </Button>
            </>
          }
        />

        {/* Virtualized Table Container */}
        <div className="bg-surface/95 backdrop-blur-2xl rounded-2xl border border-line shadow-card overflow-hidden flex flex-col">
          <div className="h-[600px] flex flex-col">
            <VirtualTable
              data={contacts}
              columns={columns}
              getRowKey={(contact) => contact.id}
              rowHeight={72}
              loading={loading}
              emptyState={
                error ? (
                  <EmptyState
                    icon={<WifiOff className="w-8 h-8 text-brand" />}
                    title="Não foi possível carregar os contatos"
                    description={error}
                    actionLabel="Tentar novamente"
                    onAction={refetch}
                  />
                ) : (
                  <EmptyState
                    icon={<User className="w-8 h-8 text-brand" />}
                    title="Nenhum contato encontrado"
                    description="Cadastre o primeiro decisor pra começar a acompanhar essa conta."
                    actionLabel="Adicionar Primeiro Contato"
                    onAction={() => {
                      setSelectedContact(null);
                      setIsFormOpen(true);
                    }}
                  />
                )
              }
            />
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={meta?.total}
            itemLabel="contatos"
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            loading={loading}
          />
        </div>
      </div>

      {isFormOpen && (
        <ContactForm
          contact={selectedContact}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedContact(null);
          }}
          onSave={handleSave}
        />
      )}

      <ContactDetail contactId={detailContactId} onClose={() => setDetailContactId(null)} />

      {dialog}
    </motion.div>
  );
}
