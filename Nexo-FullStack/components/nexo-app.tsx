'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
  Command,
  Headphones,
  House,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  Search,
  Settings2,
  ShieldCheck,
  SidebarClose,
  Smile,
  Sun,
  Ticket,
  UsersRound,
  X,
} from 'lucide-react';
import { api, errorMessage, post, RequestError } from '../lib/api';
import { useResource } from '../hooks/use-resource';
import { fullDate } from '../lib/format';
import {
  roleLabels,
  type Audit,
  type Session,
  type Ticket as TicketContract,
} from '../shared/contracts';
import {
  Avatar,
  Breadcrumb,
  Button,
  Empty,
  ErrorBox,
  Modal,
  Skeleton,
  Toast,
} from './ui';
import { AuthScreen } from '../features/auth/auth-screen';
import { Dashboard } from '../features/dashboard/dashboard';
import { TicketsPage } from '../features/tickets/tickets-page';
import { TicketForm } from '../features/tickets/ticket-form';
import { TicketDetailPanel } from '../features/tickets/ticket-detail';
import { ClientsPage } from '../features/clients/clients-page';
import { KnowledgePage } from '../features/knowledge/knowledge-page';
import { TeamPage } from '../features/team/team-page';
import { ReportsPage } from '../features/reports/reports-page';
import { SettingsPage } from '../features/settings/settings-page';
import { CommandPalette } from './command-palette';
const navigation = [
  { id: 'overview', label: 'Visão geral', icon: House },
  { id: 'tickets', label: 'Atendimentos', icon: Ticket },
  { id: 'clients', label: 'Clientes', icon: UsersRound },
  { id: 'knowledge', label: 'Base de conhecimento', icon: BookOpen },
  { id: 'reports', label: 'Relatórios', icon: ChartNoAxesCombined },
  { id: 'team', label: 'Equipe', icon: Headphones },
];
function ActivityModal({
  onClose,
  version,
}: {
  onClose: () => void;
  version: number;
}) {
  const { data, loading, error, reload } = useResource<Audit[]>(
    'activity',
    version,
  );
  return (
    <Modal
      title="Sua operação, em movimento."
      eyebrow="ATIVIDADE DO WORKSPACE"
      onClose={onClose}
    >
      {error ? (
        <ErrorBox message={error} retry={reload} />
      ) : loading ? (
        <Skeleton />
      ) : !data?.length ? (
        <Empty
          title="Tudo tranquilo por aqui"
          description="Novos registros e alterações aparecerão neste histórico."
        />
      ) : (
        <div className="full-activity-list">
          {data.map((a) => (
            <article key={a.id}>
              <Avatar name={a.actor} size="small" />
              <div>
                <strong>{a.actor}</strong>
                <p>{a.detail}</p>
                <small>{fullDate(a.createdAt)}</small>
              </div>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}
export default function NexoApp() {
  const [session, setSession] = useState<Session | null>(null),
    [booting, setBooting] = useState(true),
    [bootError, setBootError] = useState(''),
    [page, setPage] = useState('overview'),
    [version, setVersion] = useState(0),
    [newTicket, setNewTicket] = useState(false),
    [ticketId, setTicketId] = useState<string | null>(null),
    [command, setCommand] = useState(false),
    [activity, setActivity] = useState(false),
    [sidebar, setSidebar] = useState(false),
    [dark, setDark] = useState(false),
    [toast, setToast] = useState(''),
    [ticketFilter, setTicketFilter] = useState(''),
    [clientFilter, setClientFilter] = useState(''),
    [createClient, setCreateClient] = useState(false),
    [loggingOut, setLoggingOut] = useState(false);
  const notify = useCallback((s: string) => setToast(s), []),
    clearToast = useCallback(() => setToast(''), []);
  const loadSession = useCallback(async () => {
    setBootError('');
    try {
      const s = await api<Session>('auth/me');
      setSession(s);
    } catch (e) {
      if (e instanceof RequestError && e.status === 401) setSession(null);
      else setBootError(errorMessage(e));
    } finally {
      setBooting(false);
    }
  }, []);
  useEffect(() => {
    loadSession();
    const saved = localStorage.getItem('nexo-v2-theme') === 'dark';
    setDark(saved);
    const p = location.hash.slice(1);
    if ([...navigation.map((n) => n.id), 'settings'].includes(p)) setPage(p);
    const onHash = () => {
      const p = location.hash.slice(1);
      if ([...navigation.map((n) => n.id), 'settings'].includes(p)) {
        setPage(p);
        setTicketFilter('');
        setClientFilter('');
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loadSession]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && session) {
        e.preventDefault();
        setCommand((c) => !c);
      }
      if (e.key === 'Escape') setSidebar(false);
    };
    const expired = () => {
      setSession(null);
      notify('Sua sessão expirou. Entre novamente.');
    };
    window.addEventListener('keydown', key);
    window.addEventListener('nexo-session-expired', expired);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('nexo-session-expired', expired);
    };
  }, [session, notify]);
  function navigate(next: string, filter = '') {
    setPage(next);
    setTicketFilter(filter);
    setClientFilter('');
    setCreateClient(false);
    history.replaceState(null, '', '#' + next);
    setSidebar(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function refresh() {
    setVersion((v) => v + 1);
  }
  async function logout() {
    setLoggingOut(true);
    try {
      await post('auth/logout', {});
      setSession(null);
      setTicketId(null);
      setNewTicket(false);
      navigate('overview');
      notify('Você saiu do workspace.');
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setLoggingOut(false);
    }
  }
  if (booting)
    return (
      <div className="boot-screen">
        <a className="brand dark-brand" href="#">
          <span className="brand-mark">n</span>nexo
          <span className="brand-dot">.</span>
        </a>
        <div className="boot-loader" />
        <p>Conectando seu workspace...</p>
      </div>
    );
  if (bootError)
    return (
      <div className="boot-screen">
        <ErrorBox message={bootError} retry={loadSession} />
      </div>
    );
  if (!session)
    return (
      <>
        <AuthScreen
          onAuthenticated={() => {
            loadSession();
            navigate('overview');
          }}
        />
        {toast && <Toast message={toast} onClose={clearToast} />}
      </>
    );
  const current =
    navigation.find((n) => n.id === page)?.label || 'Configurações';
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Fechar navegação"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`app-sidebar ${sidebar ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <a
            href="#overview"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              navigate('overview');
            }}
          >
            <span className="brand-mark">n</span>nexo
            <span className="brand-dot">.</span>
          </a>
          <button
            className="mobile-close icon-button"
            aria-label="Fechar menu"
            onClick={() => setSidebar(false)}
          >
            <X size={19} />
          </button>
        </div>
        <button
          className="workspace-switch"
          onClick={() => navigate('settings')}
        >
          <span className="workspace-letter">
            {session.workspace.name[0]?.toUpperCase()}
          </span>
          <span>
            <strong>{session.workspace.name}</strong>
            <small>
              {session.workspace.demo
                ? 'Workspace de demonstração'
                : 'Customer Operations'}
            </small>
          </span>
          <ChevronDown size={13} />
        </button>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {navigation.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? 'active' : ''}
              aria-current={page === n.id ? 'page' : undefined}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={17} />
              <span>{n.label}</span>
              {n.id === 'tickets' && <span className="nav-shortcut">↗</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-separator" />
        <button
          className={`sidebar-settings ${page === 'settings' ? 'active' : ''}`}
          onClick={() => navigate('settings')}
        >
          <Settings2 size={17} />
          Configurações
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span>
              <Smile size={16} />
              Feito para aproximar.
            </span>
            <p>
              Menos ruído na operação.
              <br />
              Mais atenção em cada conexão.
            </p>
            <button onClick={() => navigate('knowledge')}>
              Conhecer a base
              <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="sidebar-profile">
            <Avatar name={session.user.name} />
            <div>
              <strong>{session.user.name}</strong>
              <small>{roleLabels[session.user.role]}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Sair do workspace"
              title="Sair do workspace"
              onClick={logout}
              disabled={loggingOut}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-shell">
        <header className="app-header">
          <div className="header-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setSidebar(true)}
            >
              <Menu size={21} />
            </button>
            <Breadcrumb section={current} />
          </div>
          <div className="header-actions">
            <button
              className="global-search"
              onClick={() => setCommand(true)}
              aria-label="Abrir busca rápida"
            >
              <Search size={15} />
              <span>Buscar no workspace</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="server-indicator">
              <i />
              Conectado
            </span>
            <button
              className="icon-button theme-button"
              aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
              onClick={() => {
                setDark(!dark);
                localStorage.setItem('nexo-v2-theme', !dark ? 'dark' : 'light');
              }}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              className="icon-button activity-button"
              aria-label="Ver atividades"
              onClick={() => setActivity(true)}
            >
              <Bell size={18} />
              <i />
            </button>
            <button
              className="profile-trigger"
              aria-label="Abrir meu perfil"
              onClick={() => navigate('settings')}
            >
              <Avatar name={session.user.name} size="small" />
            </button>
          </div>
        </header>
        {session.workspace.demo && (
          <div className="demo-mode-strip">
            <span>
              <span className="demo-dot" />
              DEMONSTRAÇÃO INTERATIVA
            </span>
            <p>
              Dados fictícios, workspace isolado e persistência real no
              servidor.
            </p>
            <span className="demo-role">{roleLabels[session.user.role]}</span>
          </div>
        )}
        <main className="main-content" id="main-content">
          {page === 'overview' && (
            <Dashboard
              session={session}
              version={version}
              onCreate={() => setNewTicket(true)}
              onTicket={setTicketId}
              onNavigate={navigate}
            />
          )}{' '}
          {page === 'tickets' && (
            <TicketsPage
              key={ticketFilter + clientFilter}
              session={session}
              version={version}
              initialFilter={ticketFilter}
              clientFilter={clientFilter}
              onCreate={() => setNewTicket(true)}
              onOpen={setTicketId}
            />
          )}{' '}
          {page === 'clients' && (
            <ClientsPage
              key={String(createClient)}
              session={session}
              version={version}
              initialCreate={createClient}
              notify={notify}
              onHistory={(id) => {
                navigate('tickets');
                setClientFilter(id);
              }}
            />
          )}{' '}
          {page === 'knowledge' && (
            <KnowledgePage
              session={session}
              version={version}
              notify={notify}
            />
          )}{' '}
          {page === 'team' && (
            <TeamPage session={session} version={version} notify={notify} />
          )}{' '}
          {page === 'reports' && <ReportsPage version={version} />}{' '}
          {page === 'settings' && (
            <SettingsPage
              session={session}
              onUpdated={() => {
                loadSession();
                refresh();
              }}
              notify={notify}
            />
          )}
        </main>
        <footer className="app-footer">
          <span>
            Nexo<span className="footer-dot">.</span>{' '}
            <span>Boas conversas. Grandes conexões.</span>
          </span>
          <span>
            Desenvolvido por José Caldas
            <ArrowUpRight size={11} />
          </span>
        </footer>
      </div>
      {newTicket && (
        <TicketForm
          onClose={() => setNewTicket(false)}
          onCreated={(t) => {
            setNewTicket(false);
            refresh();
            setTicketId(t.id);
            notify(`Atendimento NX-${t.number} criado.`);
          }}
          onCreateClient={() => {
            setNewTicket(false);
            navigate('clients');
            setCreateClient(true);
          }}
        />
      )}
      {ticketId && (
        <TicketDetailPanel
          key={ticketId}
          id={ticketId}
          session={session}
          onClose={() => setTicketId(null)}
          onChanged={refresh}
          notify={notify}
        />
      )}{' '}
      {command && (
        <CommandPalette
          onClose={() => setCommand(false)}
          onNavigate={navigate}
          onTicket={setTicketId}
        />
      )}{' '}
      {activity && (
        <ActivityModal version={version} onClose={() => setActivity(false)} />
      )}{' '}
      {toast && <Toast message={toast} onClose={clearToast} />}
    </div>
  );
}
