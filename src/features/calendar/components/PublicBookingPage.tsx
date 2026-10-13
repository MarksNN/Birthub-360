import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';

interface BookingLinkData {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  durationMin: number;
  host: {
    name: string;
    role: string;
    organization: string;
  };
  availableSlots: string[];
}

export function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<BookingLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    host: string;
    title: string;
    date: string;
    time: string;
    meetUrl: string | null;
  } | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .get<BookingLinkData>(`/api/calendar/book/${slug}`)
      .then((res) => {
        setData(res);
        if (res.availableSlots?.length > 0) {
          setSelectedSlot(res.availableSlots[0]);
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'Link de agendamento não encontrado ou inativo.',
        );
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setSubmitting(true);
    try {
      const res = await api.post<{
        host: string;
        title: string;
        date: string;
        time: string;
        meetUrl: string | null;
      }>(`/api/calendar/book/${slug}`, {
        ...form,
        date: selectedDate,
        time: selectedSlot,
      });
      setSuccessData(res);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Falha ao realizar agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--color-heading-gold)] animate-spin" />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            Carregando calendário do consultor...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--color-surface)] border border-[var(--color-heading-cyan)] rounded-[var(--radius-card)] p-8 text-center space-y-4 shadow-[var(--shadow-card)]">
          <AlertCircle className="w-12 h-12 text-[var(--color-heading-danger)] mx-auto" />
          <h2 className="text-xl font-bold text-[var(--color-heading-cyan)]">
            Agendamento Indisponível
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {error || 'Este link de agendamento expirou ou não existe mais.'}
          </p>
        </div>
      </div>
    );
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-[var(--color-surface)] border border-[var(--color-heading-cyan)] rounded-[var(--radius-card)] p-8 text-center space-y-5 shadow-[var(--shadow-card)] motion-safe:animate-in motion-safe:zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-[color-mix(in_srgb,var(--color-heading-success)_10%,var(--color-surface))] text-[var(--color-heading-success)] border border-[var(--color-heading-success)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-[var(--color-heading-cyan)]">
              Reunião Confirmada!
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{successData.title}</p>
          </div>

          <div className="bg-[var(--color-background)] p-4 rounded-[var(--radius-card)] border border-[var(--color-heading-cyan)] space-y-2 text-left text-sm">
            <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
              <span className="text-[var(--color-text-muted)]">Consultor:</span>
              <span className="font-bold">{successData.host}</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
              <span className="text-[var(--color-text-muted)]">Data e Hora:</span>
              <span className="font-bold">
                {new Date(`${successData.date}T12:00:00`).toLocaleDateString('pt-BR', {
                  dateStyle: 'full',
                })}{' '}
                às {successData.time}
              </span>
            </div>
          </div>

          {successData.meetUrl && (
            <a
              href={successData.meetUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-[var(--radius-control)] bg-brand-active px-4 py-3 text-sm font-bold text-on-brand transition-colors duration-200 hover:bg-brand-2"
            >
              Entrar na reunião (Google Meet)
            </a>
          )}

          <p className="text-sm text-[var(--color-text-muted)]">
            Um convite com o link da videoconferência foi enviado para o seu e-mail cadastrado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-4xl w-full bg-[var(--color-surface)] border border-[var(--color-heading-cyan)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] grid grid-cols-1 md:grid-cols-5 overflow-hidden">
        {/* Lateral Esquerda com Info do Host */}
        <div className="md:col-span-2 p-8 border-b md:border-b-0 md:border-r border-[var(--color-border-subtle)] bg-[var(--color-background)] space-y-6">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-heading-gold)]">
              {data.host.organization}
            </span>
            <h1 className="text-2xl font-black text-[var(--color-heading-cyan)] leading-tight">
              {data.title}
            </h1>
            {data.description && (
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {data.description}
              </p>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--color-heading-gold)] shrink-0" />
              <span>
                {data.host.name} ({data.host.role})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--color-heading-gold)] shrink-0" />
              <span>Duração de {data.durationMin} minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-heading-gold)] shrink-0" />
              <span>Videoconferência / Reunião Online</span>
            </div>
          </div>
        </div>

        {/* Formulário de Agendamento */}
        <form
          onSubmit={handleSubmit}
          className="md:col-span-3 p-8 space-y-5 bg-[var(--color-surface)]"
        >
          <h2 className="text-base font-black text-[var(--color-heading-cyan)]">
            Escolha a data e o horário
          </h2>

          {/* Seleção de Data e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="booking-date"
                className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1.5"
              >
                Data Desejada
              </label>
              <input
                id="booking-date"
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-[var(--color-background)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-heading-gold)]"
                required
              />
            </div>
            <div>
              <label
                htmlFor="booking-slot"
                className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1.5"
              >
                Horário Disponível
              </label>
              <select
                id="booking-slot"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full bg-[var(--color-background)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-heading-gold)]"
                required
              >
                {data.availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label
                htmlFor="booking-name"
                className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1"
              >
                Seu Nome Completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="booking-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Carlos Mendes"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[var(--color-background)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-heading-gold)]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="booking-email"
                  className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1"
                >
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="booking-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="carlos@transportes.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[var(--color-background)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-heading-gold)]"
                    required
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="booking-phone"
                  className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1"
                >
                  WhatsApp / Telefone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="booking-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(11) 99999-8888"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[var(--color-background)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-heading-gold)]"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="booking-company"
                className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1"
              >
                Nome da Empresa
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="booking-company"
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Ex: Transportadora Rápido Sol"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[var(--color-background)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-heading-gold)]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="booking-notes"
                className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1"
              >
                Notas / Assunto (opcional)
              </label>
              <textarea
                id="booking-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Gostaria de falar sobre dimensionamento de telemetria CAN..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-[var(--color-background)] border border-[var(--color-border-subtle)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-heading-gold)] resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[var(--color-interactive-primary)] hover:bg-[var(--color-interactive-hover)] text-on-brand font-bold rounded-[var(--radius-control)] text-sm transition-colors focus-visible:outline-[var(--color-focus)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
            Confirmar Agendamento
          </button>
        </form>
      </div>
    </div>
  );
}
