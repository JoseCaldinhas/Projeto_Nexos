'use client';
import { useState } from 'react';
import { Check, Database, LockKeyhole, Save, ShieldCheck } from 'lucide-react';
import {
  Avatar,
  Button,
  CardHeading,
  ErrorBox,
  Field,
  PageHeading,
} from '../../components/ui';
import { errorMessage, patch } from '../../lib/api';
import { roleLabels, type Session } from '../../shared/contracts';
export function SettingsPage({
  session,
  onUpdated,
  notify,
}: {
  session: Session;
  onUpdated: () => void;
  notify: (s: string) => void;
}) {
  const [busy, setBusy] = useState(''),
    [error, setError] = useState('');
  async function save(e: React.FormEvent<HTMLFormElement>, endpoint: string) {
    e.preventDefault();
    setBusy(endpoint);
    setError('');
    try {
      await patch(endpoint, Object.fromEntries(new FormData(e.currentTarget)));
      onUpdated();
      notify('Alterações salvas.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="UM WORKSPACE COM A SUA IDENTIDADE"
        title="Configurações"
        description="Cuide dos detalhes que fazem a operação ser sua."
      />
      {error && <ErrorBox message={error} />}
      <div className="settings-grid">
        <section className="card">
          <CardHeading
            title="Seu perfil"
            description="Como seu time vê você no Nexo"
          />
          <form className="settings-form" onSubmit={(e) => save(e, 'profile')}>
            <div className="profile-summary">
              <Avatar name={session.user.name} size="large" />
              <div>
                <strong>{session.user.name}</strong>
                <small>{roleLabels[session.user.role]}</small>
              </div>
            </div>
            <Field label="Nome">
              <input
                name="name"
                defaultValue={session.user.name}
                required
                minLength={2}
                maxLength={100}
                disabled={session.user.role === 'viewer'}
              />
            </Field>
            <Field label="E-mail">
              <input value={session.user.email} disabled readOnly />
            </Field>
            <Button
              variant="primary"
              type="submit"
              busy={busy === 'profile'}
              disabled={session.user.role === 'viewer'}
            >
              <Save size={14} />
              Salvar perfil
            </Button>
          </form>
        </section>
        <section className="card">
          <CardHeading
            title="Seu workspace"
            description="O ponto de encontro da sua equipe"
          />
          <form className="settings-form" onSubmit={(e) => save(e, 'settings')}>
            <Field label="Nome do workspace">
              <input
                name="name"
                defaultValue={session.workspace.name}
                required
                minLength={2}
                maxLength={80}
                disabled={session.user.role !== 'admin'}
              />
            </Field>
            <div className="form-notice">
              <ShieldCheck size={16} />
              Apenas administradores podem alterar as configurações do
              workspace.
            </div>
            <Button
              type="submit"
              variant="primary"
              busy={busy === 'settings'}
              disabled={session.user.role !== 'admin'}
            >
              <Save size={14} />
              Salvar workspace
            </Button>
          </form>
        </section>
        <section className="card data-settings">
          <CardHeading
            title="Transparência por padrão"
            description="O que esta versão faz e onde ficam seus dados"
          />
          <div>
            <p>
              <Database size={17} />
              <span>
                <strong>Persistência no servidor</strong>Clientes, atendimentos,
                artigos e histórico são armazenados em banco relacional
                SQLite/D1.
              </span>
            </p>
            <p>
              <LockKeyhole size={17} />
              <span>
                <strong>Identidade e permissões</strong>Senhas com PBKDF2,
                sessões em cookies HttpOnly e verificação de acesso por
                workspace no servidor.
              </span>
            </p>
            <p>
              <Check size={17} />
              <span>
                <strong>Integrações com limites claros</strong>Os canais
                classificam a origem dos chamados. Respostas são registradas no
                Nexo; não há envio por e-mail ou WhatsApp. Sugestões usam regras
                locais e artigos, sem IA generativa.
              </span>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
