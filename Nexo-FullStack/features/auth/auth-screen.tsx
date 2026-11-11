'use client';
import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Command,
  Layers3,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button, ErrorBox, Field } from '../../components/ui';
import { post, errorMessage } from '../../lib/api';
import type { Role } from '../../shared/contracts';
export function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [role, setRole] = useState<Role>('admin');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await post(`auth/${mode}`, f);
      onAuthenticated();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function demo() {
    setBusy(true);
    setError('');
    try {
      await post('auth/demo', { role });
      onAuthenticated();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <a className="brand" href="#">
          <span className="brand-mark">n</span>nexo
          <span className="brand-dot">.</span>
        </a>
        <div className="auth-story-content">
          <span className="auth-kicker">
            <span /> CUSTOMER OPERATIONS, EM SINTONIA
          </span>
          <h1>
            Boas conversas.
            <br />
            Grandes <em>conexões.</em>
          </h1>
          <p>
            Um lugar para cuidar de cada cliente.
            <br />
            Uma visão para conectar todo o seu time.
          </p>
          <div className="auth-preview">
            <div className="auth-preview-top">
              <span>
                <i />
                <i />
                <i />
              </span>
              <small>nexo / visão da operação</small>
              <Layers3 size={15} />
            </div>
            <div className="auth-mini-metrics">
              <div>
                <small>Uma operação</small>
                <strong>
                  conectada<span>↗</span>
                </strong>
              </div>
              <div className="mini-bars">
                {[25, 45, 35, 65, 50, 80, 75, 100, 85, 115].map((h, i) => (
                  <i key={i} style={{ height: h }} />
                ))}
              </div>
            </div>
            <div className="auth-mini-row">
              <span className="avatar mint">MC</span>
              <div>
                <b>Marina Costa</b>
                <small>Atendimento em andamento</small>
              </div>
              <span className="mini-pill">● Em sintonia</span>
            </div>
            <div className="auth-mini-row">
              <span className="avatar peach">LO</span>
              <div>
                <b>Lucas Oliveira</b>
                <small>Mais uma conexão fortalecida</small>
              </div>
              <Check size={18} />
            </div>
          </div>
          <div className="auth-benefits">
            <span>
              <Check size={14} />
              Atendimentos organizados
            </span>
            <span>
              <Check size={14} />
              Dados que orientam
            </span>
            <span>
              <Check size={14} />
              Time conectado
            </span>
          </div>
        </div>
        <div className="auth-story-footer">
          UM PRODUTO DE PORTFÓLIO POR JOSÉ CALDAS <ArrowUpRight size={15} />
        </div>
        <div className="auth-orbit" />
      </section>
      <section className="auth-form-side">
        <div className="auth-topline">
          <span>Seu próximo bom atendimento começa aqui.</span>
          <ShieldCheck size={17} />
        </div>
        <div className="auth-form-content">
          <div className="auth-symbol">
            <Command size={27} />
          </div>
          <span className="eyebrow">BEM-VINDO AO SEU WORKSPACE</span>
          <h2>
            {mode === 'login'
              ? 'Que bom ter você aqui.'
              : 'Vamos conectar seu time.'}
          </h2>
          <p>
            {mode === 'login'
              ? 'Entre na sua conta ou explore uma operação de demonstração.'
              : 'Crie sua conta e comece um workspace vazio, só seu.'}
          </p>
          <div className="auth-tabs">
            <button
              className={mode === 'login' ? 'selected' : ''}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Entrar na conta
            </button>
            <button
              className={mode === 'register' ? 'selected' : ''}
              onClick={() => {
                setMode('register');
                setError('');
              }}
            >
              Criar conta
            </button>
          </div>
          <form onSubmit={submit}>
            {mode === 'register' && (
              <>
                <Field label="Seu nome">
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Como podemos chamar você?"
                  />
                </Field>
                <Field label="Nome do workspace">
                  <input
                    name="workspace"
                    required
                    minLength={2}
                    maxLength={80}
                    placeholder="Ex.: Studio Caldas"
                  />
                </Field>
              </>
            )}
            <Field label="E-mail">
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={150}
                placeholder="voce@empresa.com"
              />
            </Field>
            <Field
              label="Senha"
              hint={
                mode === 'register'
                  ? 'Use pelo menos 10 caracteres.'
                  : undefined
              }
            >
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                minLength={mode === 'register' ? 10 : 1}
                maxLength={128}
                required
                placeholder={
                  mode === 'register' ? 'Crie uma senha segura' : 'Sua senha'
                }
              />
            </Field>
            {error && <ErrorBox message={error} />}
            <Button
              type="submit"
              variant="primary"
              busy={busy}
              className="full"
            >
              {mode === 'login' ? 'Entrar no workspace' : 'Criar meu workspace'}
              <ArrowRight size={16} />
            </Button>
          </form>
          <div className="auth-divider">
            <span>OU EXPLORE SEM CADASTRO</span>
          </div>
          <div className="demo-entry">
            <div>
              <Sparkles size={18} />
              <strong>Uma operação pronta para explorar</strong>
            </div>
            <p>Dados fictícios. Workspace isolado. Funcionalidades reais.</p>
            <div className="demo-controls">
              <select
                aria-label="Perfil da demonstração"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="admin">Como administrador</option>
                <option value="agent">Como agente</option>
                <option value="viewer">Como leitor</option>
              </select>
              <Button onClick={demo} busy={busy}>
                Explorar demo
                <ArrowUpRight size={15} />
              </Button>
            </div>
          </div>
          <p className="auth-footnote">
            <ShieldCheck size={13} />
            Sessão protegida · dados persistidos no servidor
          </p>
        </div>
        <div className="auth-bottom">
          Nexo © {new Date().getFullYear()}
          <span>Feito para aproximar.</span>
        </div>
      </section>
    </div>
  );
}
