'use client';
import { useState } from 'react';
import { ArrowUpRight, UserPlus } from 'lucide-react';
import {
  Button,
  Empty,
  ErrorBox,
  Field,
  Modal,
  Skeleton,
} from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { errorMessage, post } from '../../lib/api';
import {
  channelLabels,
  priorityLabels,
  type Client,
  type Member,
  type Ticket,
} from '../../shared/contracts';
export function TicketForm({
  onClose,
  onCreated,
  onCreateClient,
}: {
  onClose: () => void;
  onCreated: (t: Ticket) => void;
  onCreateClient: () => void;
}) {
  const clients = useResource<Client[]>('clients'),
    members = useResource<Member[]>('team');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const ticket = await post<Ticket>('tickets', {
        ...f,
        assigneeId: f.assigneeId || null,
      });
      onCreated(ticket);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Uma nova conversa começa aqui."
      eyebrow="NOVO ATENDIMENTO"
      onClose={onClose}
    >
      {clients.loading || members.loading ? (
        <Skeleton />
      ) : clients.error || members.error ? (
        <ErrorBox
          message={clients.error || members.error}
          retry={() => {
            clients.reload();
            members.reload();
          }}
        />
      ) : !clients.data?.length ? (
        <Empty
          title="Primeiro, conheça seu cliente"
          description="Cadastre um cliente para vincular o primeiro atendimento."
          action={
            <Button variant="primary" onClick={onCreateClient}>
              <UserPlus size={15} />
              Cadastrar cliente
            </Button>
          }
        />
      ) : (
        <form onSubmit={submit}>
          <Field label="Cliente">
            <select name="clientId" required defaultValue="">
              <option value="" disabled>
                Selecione um cliente
              </option>
              {clients.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.company || c.email}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assunto">
            <input
              name="subject"
              required
              minLength={3}
              maxLength={150}
              placeholder="Uma descrição curta do que precisa ser resolvido"
            />
          </Field>
          <Field label="Mensagem inicial">
            <textarea
              name="description"
              required
              minLength={5}
              maxLength={10000}
              rows={4}
              placeholder="Conte os detalhes para que o time possa ajudar..."
            />
          </Field>
          <div className="form-grid">
            <Field label="Prioridade">
              <select name="priority" defaultValue="normal">
                {Object.entries(priorityLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Canal de origem">
              <select name="channel">
                {Object.entries(channelLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Responsável">
            <select name="assigneeId">
              <option value="">Atribuir depois</option>
              {members.data
                ?.filter((m) => m.role !== 'viewer')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </Field>
          <div className="form-notice">
            Os prazos alvo são calculados pela prioridade: urgente 4h, alta 8h,
            normal 24h e baixa 48h.
          </div>
          {error && <ErrorBox message={error} />}
          <div className="modal-actions">
            <Button type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" busy={busy} type="submit">
              Criar atendimento
              <ArrowUpRight size={15} />
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
