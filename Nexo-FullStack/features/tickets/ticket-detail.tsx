'use client';
import { useState } from 'react';
import {
  CheckCheck,
  Clock3,
  CornerUpLeft,
  FileText,
  LockKeyhole,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  Avatar,
  Button,
  ErrorBox,
  Field,
  Modal,
  PriorityBadge,
  Skeleton,
  StatusBadge,
} from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { errorMessage, patch, post } from '../../lib/api';
import { fullDate, sla } from '../../lib/format';
import {
  channelLabels,
  priorityLabels,
  statusLabels,
  type Member,
  type Session,
  type TicketDetail,
} from '../../shared/contracts';
export function TicketDetailPanel({
  id,
  session,
  onClose,
  onChanged,
  notify,
}: {
  id: string;
  session: Session;
  onClose: () => void;
  onChanged: () => void;
  notify: (s: string) => void;
}) {
  const { data, loading, error, reload } = useResource<TicketDetail>(
      `tickets/${id}`,
    ),
    members = useResource<Member[]>('team');
  const [busy, setBusy] = useState(false),
    [localError, setLocalError] = useState(''),
    [reply, setReply] = useState(''),
    [internal, setInternal] = useState(false),
    [source, setSource] = useState<{ title: string } | null>(null);
  const writable = session.user.role !== 'viewer';
  async function update(changes: Record<string, unknown>) {
    if (!data) return;
    setBusy(true);
    setLocalError('');
    try {
      await patch(`tickets/${id}`, {
        ...changes,
        version: data.ticket.version,
      });
      reload();
      onChanged();
      notify('Atendimento atualizado.');
    } catch (e) {
      setLocalError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLocalError('');
    try {
      await post(`tickets/${id}/messages`, { body: reply, internal });
      setReply('');
      setSource(null);
      reload();
      onChanged();
      notify(
        internal ? 'Nota interna registrada.' : 'Resposta salva no histórico.',
      );
    } catch (e) {
      setLocalError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function suggest() {
    setBusy(true);
    setLocalError('');
    try {
      const r = await post<{ text: string; source: { title: string } | null }>(
        `tickets/${id}/suggestion`,
        {},
      );
      setReply(r.text);
      setSource(r.source);
    } catch (e) {
      setLocalError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={data?.ticket.subject || 'Carregando atendimento...'}
      eyebrow={data ? `ATENDIMENTO #NX-${data.ticket.number}` : 'ATENDIMENTO'}
      wide
      onClose={onClose}
    >
      {error ? (
        <ErrorBox message={error} retry={reload} />
      ) : !data ? (
        <Skeleton rows={4} />
      ) : (
        <div className="ticket-detail-layout">
          <div className="conversation">
            <div className="conversation-person">
              <Avatar name={data.ticket.clientName} />
              <div>
                <strong>{data.ticket.clientName}</strong>
                <small>{data.ticket.clientEmail}</small>
              </div>
              <span>{channelLabels[data.ticket.channel]}</span>
            </div>
            <div className="thread">
              <div className="thread-divider">
                <span>
                  INÍCIO DA CONVERSA · {fullDate(data.ticket.createdAt)}
                </span>
              </div>
              <div className="message customer-message">
                <p>{data.ticket.description}</p>
                <small>{data.ticket.clientName}</small>
              </div>
              {data.messages.map((m) => (
                <article
                  key={m.id}
                  className={`message ${m.internal ? 'internal-message' : 'team-message'}`}
                >
                  <div className="message-head">
                    <Avatar name={m.author} size="tiny" />
                    <strong>{m.author}</strong>
                    {m.internal && (
                      <span>
                        <LockKeyhole size={11} />
                        Nota interna
                      </span>
                    )}
                    <time>{fullDate(m.createdAt)}</time>
                  </div>
                  <p>{m.body}</p>
                </article>
              ))}
            </div>
            {writable && data.ticket.status !== 'resolved' ? (
              <form className="reply-composer" onSubmit={send}>
                <div className="composer-tabs">
                  <button
                    type="button"
                    className={!internal ? 'selected' : ''}
                    onClick={() => setInternal(false)}
                  >
                    <MessageSquare size={13} />
                    Resposta
                  </button>
                  <button
                    type="button"
                    className={internal ? 'selected' : ''}
                    onClick={() => setInternal(true)}
                  >
                    <LockKeyhole size={13} />
                    Nota interna
                  </button>
                </div>
                <textarea
                  aria-label={
                    internal ? 'Escrever nota interna' : 'Escrever resposta'
                  }
                  placeholder={
                    internal
                      ? 'Compartilhe um contexto com sua equipe...'
                      : 'Escreva uma resposta cuidadosa...'
                  }
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  required
                  maxLength={10000}
                  rows={4}
                />
                {source && (
                  <div className="source-note">
                    <FileText size={12} />
                    Fonte: {source.title}. Revise o texto antes de salvar.
                  </div>
                )}
                <div className="composer-actions">
                  <button
                    type="button"
                    className="text-link"
                    onClick={suggest}
                    disabled={busy || loading}
                  >
                    <Sparkles size={14} />
                    Sugerir resposta
                  </button>
                  <Button
                    variant="primary"
                    type="submit"
                    busy={busy || loading}
                    disabled={!reply.trim()}
                  >
                    <Send size={13} />
                    {internal ? 'Salvar nota' : 'Registrar resposta'}
                  </Button>
                </div>
                <p className="composer-disclaimer">
                  Sugestões por regras e artigos · respostas são registradas
                  aqui, sem envio externo.
                </p>
              </form>
            ) : (
              <div className="form-notice">
                {writable
                  ? 'Este atendimento foi concluído. Reabra para registrar novas mensagens.'
                  : 'Você está no modo leitura. O histórico está disponível para consulta.'}
              </div>
            )}
            {localError && <ErrorBox message={localError} retry={reload} />}
          </div>
          <aside className="ticket-properties">
            <div className="properties-section">
              <h3>Detalhes do atendimento</h3>
              <Field label="Status">
                <select
                  aria-label="Status do atendimento"
                  value={data.ticket.status}
                  disabled={!writable || busy || loading}
                  onChange={(e) => update({ status: e.target.value })}
                >
                  {Object.entries(statusLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prioridade">
                <select
                  aria-label="Prioridade do atendimento"
                  value={data.ticket.priority}
                  disabled={!writable || busy || loading}
                  onChange={(e) => update({ priority: e.target.value })}
                >
                  {Object.entries(priorityLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Responsável">
                <select
                  aria-label="Responsável do atendimento"
                  value={data.ticket.assigneeId || ''}
                  disabled={
                    !writable ||
                    busy ||
                    loading ||
                    members.loading ||
                    !!members.error
                  }
                  onChange={(e) =>
                    update({ assigneeId: e.target.value || null })
                  }
                >
                  <option value="">Não atribuído</option>
                  {members.data
                    ?.filter((m) => m.role !== 'viewer')
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </Field>
              <div
                className={`sla-box ${new Date(data.ticket.dueAt) < new Date() && data.ticket.status !== 'resolved' ? 'late' : ''}`}
              >
                <Clock3 size={16} />
                <div>
                  <strong>
                    {sla(data.ticket.dueAt, data.ticket.status === 'resolved')}
                  </strong>
                  <small>Prazo alvo: {fullDate(data.ticket.dueAt)}</small>
                </div>
              </div>
              {writable && (
                <Button
                  variant={
                    data.ticket.status === 'resolved' ? 'secondary' : 'primary'
                  }
                  className="full"
                  busy={busy || loading}
                  onClick={() =>
                    update({
                      status:
                        data.ticket.status === 'resolved' ? 'open' : 'resolved',
                    })
                  }
                >
                  {data.ticket.status === 'resolved' ? (
                    <CornerUpLeft size={15} />
                  ) : (
                    <CheckCheck size={15} />
                  )}{' '}
                  {data.ticket.status === 'resolved'
                    ? 'Reabrir atendimento'
                    : 'Marcar como resolvido'}
                </Button>
              )}
            </div>
            <div className="properties-section">
              <h3>Histórico de atividades</h3>
              <div className="ticket-audit">
                {data.activities.map((a) => (
                  <div key={a.id}>
                    <i />
                    <div>
                      <strong>{a.actor}</strong>
                      <p>{a.detail}</p>
                      <small>{fullDate(a.createdAt)}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="version-label">
              Versão {data.ticket.version} · controle de concorrência
            </p>
          </aside>
        </div>
      )}
    </Modal>
  );
}
