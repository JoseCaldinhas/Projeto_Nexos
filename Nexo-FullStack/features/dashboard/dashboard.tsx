import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  Clock3,
  Headphones,
  MessageSquarePlus,
  Plus,
  Sparkles,
  Target,
  Ticket as TicketIcon,
  TriangleAlert,
} from 'lucide-react';
import {
  Avatar,
  Button,
  CardHeading,
  ErrorBox,
  PageHeading,
  Skeleton,
  TextLink,
} from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { timeAgo } from '../../lib/format';
import type { Metrics, Session } from '../../shared/contracts';
import { TicketTable } from '../tickets/ticket-table';
import { ChannelChart, VolumeChart } from './charts';
export function MetricCards({ data }: { data: Metrics }) {
  return (
    <div className="metric-grid">
      {[
        {
          label: 'Total de atendimentos',
          value: data.total,
          icon: TicketIcon,
          foot: 'Registros do workspace',
          accent: 'lavender',
        },
        {
          label: 'Em atendimento',
          value: String(data.active).padStart(2, '0'),
          icon: Headphones,
          foot: `${data.urgent} com prioridade urgente`,
          accent: 'blue',
        },
        {
          label: 'Chamados resolvidos',
          value: data.resolved,
          icon: CheckCheck,
          foot: 'Conversas concluídas',
          accent: 'mint',
        },
        {
          label: 'Taxa de resolução',
          value: `${data.resolutionRate}%`,
          icon: Target,
          foot: 'Resolvidos / total de chamados',
          accent: 'peach',
        },
      ].map((m) => (
        <section key={m.label} className="card metric">
          <div className="metric-top">
            <span>{m.label}</span>
            <span className={`metric-icon ${m.accent}`}>
              <m.icon size={17} />
            </span>
          </div>
          <strong className="metric-value">{m.value}</strong>
          <p>
            <span className="metric-dot" />
            {m.foot}
          </p>
        </section>
      ))}
    </div>
  );
}
export function Dashboard({
  session,
  version,
  onCreate,
  onTicket,
  onNavigate,
}: {
  session: Session;
  version: number;
  onCreate: () => void;
  onTicket: (id: string) => void;
  onNavigate: (page: string, filter?: string) => void;
}) {
  const { data, loading, error, reload } = useResource<Metrics>(
    'metrics',
    version,
  );
  return (
    <>
      <PageHeading
        title={`Olá, ${session.user.name.split(' ')[0]} 👋`}
        description="Tudo o que você precisa para criar boas conexões, em um só lugar."
        actions={
          <>
            <a className="button secondary" href="/api/tickets/export">
              <ArrowDownToLine size={15} />
              Exportar
            </a>
            {session.user.role !== 'viewer' && (
              <Button variant="primary" onClick={onCreate}>
                <Plus size={16} />
                Novo atendimento
              </Button>
            )}
          </>
        }
      />
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">
            <Sparkles size={12} /> INTELIGÊNCIA QUE APROXIMA
          </span>
          <h2>
            Seu time mais próximo.
            <br className="mobile-only" /> Seus clientes, mais felizes.
          </h2>
          <p>
            Transforme conversas em conexões e dados em decisões.
            <br />O próximo grande atendimento começa aqui.
          </p>
        </div>
        <Button onClick={() => onNavigate('knowledge')}>
          Explorar a base
          <ArrowUpRight size={15} />
        </Button>
        <div className="banner-orbit" />
      </section>
      {error ? (
        <ErrorBox message={error} retry={reload} />
      ) : loading || !data ? (
        <Skeleton rows={4} />
      ) : (
        <>
          <MetricCards data={data} />
          {data.overdue > 0 && (
            <button
              className="attention-strip"
              onClick={() => onNavigate('tickets', 'overdue')}
            >
              <span>
                <TriangleAlert size={15} />
                <strong>{data.overdue} atendimentos precisam de atenção</strong>
                <span>
                  O prazo alvo foi ultrapassado. Organize os próximos passos.
                </span>
              </span>
              <ArrowRight size={17} />
            </button>
          )}
          <div className="charts-grid">
            <VolumeChart metrics={data} />
            <ChannelChart metrics={data} />
          </div>
          <section className="card">
            <CardHeading
              title="As conversas mais recentes"
              description="Do primeiro contato à solução, tudo sob seu cuidado."
              action={
                <TextLink onClick={() => onNavigate('tickets')}>
                  Ver atendimentos
                </TextLink>
              }
            />
            <TicketTable tickets={data.recent} onOpen={onTicket} compact />
            <div className="table-footer">
              <span>Atualizado com os registros do servidor</span>
              <span>{data.total} atendimentos no workspace</span>
            </div>
          </section>
          <div className="dashboard-bottom">
            <section className="card">
              <CardHeading
                title="Seu time, em sintonia"
                description="Distribuição real de atendimentos"
                action={
                  <TextLink onClick={() => onNavigate('team')}>
                    Ver equipe
                  </TextLink>
                }
              />
              <div className="workload-list">
                {data.workload.map((m) => (
                  <div key={m.id}>
                    <Avatar name={m.name} />
                    <div>
                      <strong>{m.name}</strong>
                      <small>{m.resolved} resolvidos</small>
                    </div>
                    <span className="workload-number">
                      {m.active}
                      <small>ativos</small>
                    </span>
                    <div className="mini-progress">
                      <span
                        style={{
                          width: `${Math.min(100, (m.active / Math.max(1, data.active)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="card">
              <CardHeading
                title="A operação em movimento"
                description="Últimas atividades do workspace"
              />
              <div className="activity-list">
                {data.activity.length ? (
                  data.activity.slice(0, 4).map((a) => (
                    <div key={a.id}>
                      <span className="activity-dot" />
                      <div>
                        <p>
                          <strong>{a.actor}</strong> · {a.detail}
                        </p>
                        <small>{timeAgo(a.createdAt)}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    As próximas atividades aparecerão aqui.
                  </p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
