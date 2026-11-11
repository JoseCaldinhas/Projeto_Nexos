'use client';
import { useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  Mail,
  Pencil,
  Phone,
  Plus,
  UsersRound,
} from 'lucide-react';
import {
  Avatar,
  Button,
  Empty,
  ErrorBox,
  Field,
  Modal,
  PageHeading,
  SearchInput,
  Skeleton,
} from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { errorMessage, patch, post } from '../../lib/api';
import type { Client, Session } from '../../shared/contracts';
export function ClientForm({
  client,
  onClose,
  onSaved,
}: {
  client?: Client;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (client) await patch('clients/' + client.id, data);
      else await post('clients', data);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={client ? 'Cada detalhe conta.' : 'Conheça sua próxima conexão.'}
      eyebrow={client ? 'EDITAR CLIENTE' : 'NOVO CLIENTE'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <Field label="Nome completo">
          <input
            name="name"
            defaultValue={client?.name}
            required
            minLength={2}
            maxLength={100}
            placeholder="Ex.: Marina Costa"
          />
        </Field>
        <Field label="E-mail">
          <input
            name="email"
            type="email"
            defaultValue={client?.email}
            required
            maxLength={150}
            placeholder="contato@empresa.com"
          />
        </Field>
        <Field label="Empresa">
          <input
            name="company"
            defaultValue={client?.company}
            maxLength={120}
            placeholder="Nome da empresa (opcional)"
          />
        </Field>
        <Field label="Telefone">
          <input
            name="phone"
            type="tel"
            defaultValue={client?.phone}
            maxLength={40}
            placeholder="(11) 99999-9999"
          />
        </Field>
        {error && <ErrorBox message={error} />}
        <div className="modal-actions">
          <Button onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button variant="primary" busy={busy} type="submit">
            {client ? 'Salvar alterações' : 'Cadastrar cliente'}
            <ArrowUpRight size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function ClientsPage({
  session,
  version,
  onHistory,
  notify,
  initialCreate = false,
}: {
  session: Session;
  version: number;
  onHistory: (id: string) => void;
  notify: (s: string) => void;
  initialCreate?: boolean;
}) {
  const { data, loading, error, reload } = useResource<Client[]>(
    'clients',
    version,
  );
  const [q, setQ] = useState(''),
    [editing, setEditing] = useState<Client | null | undefined>(
      initialCreate ? null : undefined,
    );
  const list =
    data?.filter((c) =>
      (c.name + ' ' + c.email + ' ' + c.company)
        .toLowerCase()
        .includes(q.toLowerCase()),
    ) || [];
  return (
    <>
      <PageHeading
        eyebrow="PESSOAS ANTES DE NÚMEROS"
        title="Clientes"
        description="Conheça as pessoas por trás de cada conversa."
        actions={
          session.user.role !== 'viewer' && (
            <Button variant="primary" onClick={() => setEditing(null)}>
              <Plus size={16} />
              Novo cliente
            </Button>
          )
        }
      />
      <div className="directory-toolbar">
        <SearchInput
          label="Buscar clientes"
          value={q}
          onChange={setQ}
          placeholder="Buscar por nome, empresa ou e-mail..."
        />
        <span>{data?.length || 0} conexões no workspace</span>
      </div>
      {error ? (
        <ErrorBox message={error} retry={reload} />
      ) : loading ? (
        <Skeleton rows={4} />
      ) : !list.length ? (
        <section className="card">
          <Empty
            title={
              q
                ? 'Nenhum cliente encontrado'
                : 'Seu primeiro cliente, sua próxima conexão'
            }
            description={
              q
                ? 'Tente buscar por outro nome ou e-mail.'
                : 'Cadastre um cliente para começar a organizar seus atendimentos.'
            }
          />
        </section>
      ) : (
        <div className="client-grid">
          {list.map((c) => (
            <article key={c.id} className="card client-card">
              <div className="client-card-top">
                <Avatar name={c.name} size="large" />
                {session.user.role !== 'viewer' && (
                  <button
                    className="icon-button"
                    aria-label={`Editar ${c.name}`}
                    onClick={() => setEditing(c)}
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </div>
              <h2>{c.name}</h2>
              <p className="client-company">
                <Building2 size={13} />
                {c.company || 'Cliente individual'}
              </p>
              <div className="client-contact">
                <span>
                  <Mail size={13} />
                  {c.email}
                </span>
                <span>
                  <Phone size={13} />
                  {c.phone || 'Telefone não informado'}
                </span>
              </div>
              <div className="client-card-footer">
                <span>
                  {c.ticketCount} atendimento{c.ticketCount !== 1 ? 's' : ''}
                </span>
                <button className="text-link" onClick={() => onHistory(c.id)}>
                  Ver histórico
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing !== undefined && (
        <ClientForm
          client={editing || undefined}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
            notify('Cadastro do cliente salvo.');
          }}
        />
      )}
    </>
  );
}
