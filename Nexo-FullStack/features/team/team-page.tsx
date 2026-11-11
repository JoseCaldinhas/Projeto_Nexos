'use client';
import { useState } from 'react';
import {
  ArrowUpRight,
  Eye,
  Headphones,
  Plus,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import {
  Avatar,
  Button,
  ErrorBox,
  Field,
  Modal,
  PageHeading,
  SearchInput,
  Skeleton,
} from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { errorMessage, post } from '../../lib/api';
import { roleLabels, type Member, type Session } from '../../shared/contracts';
export function TeamPage({
  session,
  version,
  notify,
}: {
  session: Session;
  version: number;
  notify: (s: string) => void;
}) {
  const { data, loading, error, reload } = useResource<Member[]>(
    'team',
    version,
  );
  const [q, setQ] = useState(''),
    [create, setCreate] = useState(false),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await post('team', Object.fromEntries(new FormData(e.currentTarget)));
      setCreate(false);
      reload();
      notify('Membro adicionado ao workspace.');
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="JUNTOS, CADA CONEXÃO É MELHOR"
        title="Seu time"
        description="As pessoas que cuidam de cada atendimento."
        actions={
          session.user.role === 'admin' && (
            <Button
              variant="primary"
              onClick={() => {
                setCreate(true);
                setFormError('');
              }}
            >
              <Plus size={16} />
              Adicionar membro
            </Button>
          )
        }
      />
      <div className="role-cards">
        {[
          {
            role: 'admin',
            icon: ShieldCheck,
            text: 'Gerencia o workspace e os membros, além de toda a operação.',
          },
          {
            role: 'agent',
            icon: Headphones,
            text: 'Cuida dos clientes, atendimentos e artigos de conhecimento.',
          },
          {
            role: 'viewer',
            icon: Eye,
            text: 'Acompanha dados e relatórios, com acesso de leitura.',
          },
        ].map((r) => (
          <div className="card role-card" key={r.role}>
            <r.icon size={22} />
            <h3>{roleLabels[r.role as keyof typeof roleLabels]}</h3>
            <p>{r.text}</p>
          </div>
        ))}
      </div>
      <div className="directory-toolbar">
        <SearchInput
          label="Buscar membros"
          value={q}
          onChange={setQ}
          placeholder="Buscar alguém no time..."
        />
        <span>{data?.length || 0} pessoas no workspace</span>
      </div>
      <section className="card">
        {error ? (
          <ErrorBox message={error} retry={reload} />
        ) : loading ? (
          <Skeleton />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>E-mail</th>
                  <th>Perfil de acesso</th>
                  <th>Workspace</th>
                </tr>
              </thead>
              <tbody>
                {data
                  ?.filter((m) =>
                    (m.name + ' ' + m.email)
                      .toLowerCase()
                      .includes(q.toLowerCase()),
                  )
                  .map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="person-cell">
                          <Avatar name={m.name} />
                          <strong>
                            {m.name}
                            {m.id === session.user.id && (
                              <span className="you-label">Você</span>
                            )}
                          </strong>
                        </div>
                      </td>
                      <td>{m.email}</td>
                      <td>
                        <span className={`role-badge ${m.role}`}>
                          {roleLabels[m.role]}
                        </span>
                      </td>
                      <td>{session.workspace.name}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {create && (
        <Modal
          title="Mais uma pessoa para conectar."
          eyebrow="NOVO MEMBRO"
          onClose={() => setCreate(false)}
        >
          <form onSubmit={submit}>
            <Field label="Nome">
              <input name="name" required minLength={2} maxLength={100} />
            </Field>
            <Field label="E-mail">
              <input name="email" type="email" required maxLength={150} />
            </Field>
            <Field
              label="Senha inicial"
              hint="Mínimo de 10 caracteres. Esta versão cria o acesso diretamente, sem enviar convite por e-mail."
            >
              <input
                name="password"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Perfil">
              <select name="role" defaultValue="agent">
                {Object.entries(roleLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            {formError && <ErrorBox message={formError} />}
            <div className="modal-actions">
              <Button onClick={() => setCreate(false)} type="button">
                Cancelar
              </Button>
              <Button variant="primary" busy={busy} type="submit">
                Criar acesso
                <ArrowUpRight size={15} />
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
