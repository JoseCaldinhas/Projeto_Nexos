import { ArrowUpRight, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { Avatar, Empty, PriorityBadge, StatusBadge } from '../../components/ui';
import { date, sla } from '../../lib/format';
import { channelLabels, type Ticket } from '../../shared/contracts';
export function TicketTable({
  tickets,
  onOpen,
  compact = false,
}: {
  tickets: Ticket[];
  onOpen: (id: string) => void;
  compact?: boolean;
}) {
  if (!tickets.length)
    return (
      <Empty
        title="Nenhum atendimento por aqui"
        description="Crie um atendimento ou ajuste os filtros para encontrar uma conversa."
      />
    );
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Atendimento</th>
            <th>Status</th>
            <th>Prioridade</th>
            <th>Responsável</th>
            {!compact && <th>Prazo alvo</th>}
            <th>
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="person-cell">
                  <Avatar name={t.clientName} />
                  <div>
                    <strong>{t.clientName}</strong>
                    <small>{t.company || t.clientEmail}</small>
                  </div>
                </div>
              </td>
              <td>
                <button className="ticket-subject" onClick={() => onOpen(t.id)}>
                  {t.subject}
                </button>
                <small className="ticket-meta">
                  #NX-{t.number}
                  <span>·</span>
                  {channelLabels[t.channel]}
                  <span>·</span>
                  {date(t.createdAt)}
                </small>
              </td>
              <td>
                <StatusBadge status={t.status} />
              </td>
              <td>
                <PriorityBadge priority={t.priority} />
              </td>
              <td>
                {t.assigneeName ? (
                  <div className="assignee-cell">
                    <Avatar name={t.assigneeName} size="tiny" />
                    {t.assigneeName.split(' ')[0]}
                  </div>
                ) : (
                  <span className="muted">Sem responsável</span>
                )}
              </td>
              {!compact && (
                <td>
                  <span
                    className={`sla-label ${t.status !== 'resolved' && new Date(t.dueAt) < new Date() ? 'late' : ''}`}
                  >
                    {sla(t.dueAt, t.status === 'resolved')}
                  </span>
                </td>
              )}
              <td>
                <button
                  className="icon-button"
                  aria-label={`Abrir atendimento NX-${t.number}`}
                  onClick={() => onOpen(t.id)}
                >
                  <ArrowUpRight size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
