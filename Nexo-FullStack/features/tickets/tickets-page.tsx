'use client';
import { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Columns3,
  LayoutList,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Avatar,
  Button,
  Empty,
  ErrorBox,
  PageHeading,
  PriorityBadge,
  SearchInput,
  Skeleton,
} from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import {
  channelLabels,
  priorityLabels,
  statusLabels,
  type Member,
  type Session,
  type TicketList,
  type Status,
} from '../../shared/contracts';
import { sla } from '../../lib/format';
import { TicketTable } from './ticket-table';
export function TicketsPage({
  session,
  version,
  onCreate,
  onOpen,
  initialFilter = '',
  clientFilter = '',
}: {
  session: Session;
  version: number;
  onCreate: () => void;
  onOpen: (id: string) => void;
  initialFilter?: string;
  clientFilter?: string;
}) {
  const [q, setQ] = useState(''),
    [debounced, setDebounced] = useState(''),
    [status, setStatus] = useState(''),
    [priority, setPriority] = useState(''),
    [channel, setChannel] = useState(''),
    [assignee, setAssignee] = useState(''),
    [overdue, setOverdue] = useState(initialFilter === 'overdue'),
    [page, setPage] = useState(1),
    [view, setView] = useState<'list' | 'board'>('list'),
    [sort, setSort] = useState('newest');
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const params = new URLSearchParams({
    page: String(page),
    pageSize: view === 'board' ? '100' : '10',
    sort,
  });
  if (debounced) params.set('q', debounced);
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (channel) params.set('channel', channel);
  if (assignee) params.set('assignee', assignee);
  if (overdue) params.set('overdue', 'true');
  if (clientFilter) params.set('client', clientFilter);
  const { data, loading, error, reload } = useResource<TicketList>(
    'tickets?' + params,
    version,
  );
  const team = useResource<Member[]>('team', version);
  const activeFilters = !!(
    q ||
    status ||
    priority ||
    channel ||
    assignee ||
    overdue ||
    clientFilter
  );
  function filter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }
  function reset() {
    setQ('');
    setStatus('');
    setPriority('');
    setChannel('');
    setAssignee('');
    setOverdue(false);
    setPage(1);
  }
  return (
    <>
      <PageHeading
        eyebrow="CADA CONVERSA IMPORTA"
        title="Atendimentos"
        description="Organize os próximos passos. Cuide de cada conexão."
        actions={
          <>
            <a
              className="button secondary"
              href={'/api/tickets/export?' + params}
            >
              <ArrowDownToLine size={15} />
              Exportar CSV
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
      <div className="ticket-toolbar">
        <div className="view-tabs">
          <button
            className={view === 'list' ? 'selected' : ''}
            onClick={() => {
              setView('list');
              setPage(1);
            }}
          >
            <LayoutList size={15} />
            Lista
          </button>
          <button
            className={view === 'board' ? 'selected' : ''}
            onClick={() => {
              setView('board');
              setPage(1);
            }}
          >
            <Columns3 size={15} />
            Quadro
          </button>
        </div>
        <span className="toolbar-count">
          {data?.total ?? '…'} atendimentos
          {clientFilter ? ' · cliente selecionado' : ''}
        </span>
        <select
          aria-label="Ordenar atendimentos"
          value={sort}
          onChange={(e) => filter(setSort, e.target.value)}
        >
          <option value="newest">Mais recentes</option>
          <option value="oldest">Mais antigos</option>
          <option value="priority">Maior prioridade</option>
        </select>
      </div>
      <section
        className={`card ticket-list-card ${view === 'board' ? 'board-container' : ''}`}
      >
        <div className="ticket-filters">
          <SearchInput
            value={q}
            onChange={setQ}
            label="Buscar atendimentos"
            placeholder="Busque por cliente, assunto ou número..."
          />
          <select
            aria-label="Filtrar status"
            value={status}
            onChange={(e) => filter(setStatus, e.target.value)}
          >
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar prioridade"
            value={priority}
            onChange={(e) => filter(setPriority, e.target.value)}
          >
            <option value="">Prioridade</option>
            {Object.entries(priorityLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar responsável"
            value={assignee}
            onChange={(e) => filter(setAssignee, e.target.value)}
          >
            <option value="">Responsável</option>
            {team.data
              ?.filter((m) => m.role !== 'viewer')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
          <select
            aria-label="Filtrar canal"
            value={channel}
            onChange={(e) => filter(setChannel, e.target.value)}
          >
            <option value="">Canal</option>
            {Object.entries(channelLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-bottom">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={overdue}
              onChange={(e) => {
                setOverdue(e.target.checked);
                setPage(1);
              }}
            />
            Somente com prazo excedido
          </label>
          {activeFilters && (
            <button className="text-link" onClick={reset}>
              <RotateCcw size={12} />
              Limpar filtros{clientFilter ? ' (cliente mantido)' : ''}
            </button>
          )}
        </div>
        {error ? (
          <ErrorBox message={error} retry={reload} />
        ) : loading || !data ? (
          <Skeleton rows={5} />
        ) : view === 'list' ? (
          <>
            <TicketTable tickets={data.items} onOpen={onOpen} />
            <div className="pagination">
              <span>
                {data.total
                  ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, data.total)}`
                  : '0'}{' '}
                de {data.total} atendimentos
              </span>
              <div>
                <Button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={15} />
                </Button>
                <span>
                  {page} / {Math.max(1, Math.ceil(data.total / 10))}
                </span>
                <Button
                  disabled={page * 10 >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Próxima página"
                >
                  <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="kanban-board">
              {(Object.keys(statusLabels) as Status[]).map((s) => (
                <section key={s} className={`kanban-column ${s}`}>
                  <div className="kanban-heading">
                    <span>
                      <i />
                      {statusLabels[s]}
                    </span>
                    <b>{data.items.filter((t) => t.status === s).length}</b>
                  </div>
                  <div className="kanban-cards">
                    {data.items
                      .filter((t) => t.status === s)
                      .map((t) => (
                        <button
                          key={t.id}
                          className="kanban-card"
                          onClick={() => onOpen(t.id)}
                        >
                          <div>
                            <small>#NX-{t.number}</small>
                            <PriorityBadge priority={t.priority} />
                          </div>
                          <h3>{t.subject}</h3>
                          <p>
                            {t.clientName} ·{' '}
                            {t.company || channelLabels[t.channel]}
                          </p>
                          <div className="kanban-card-bottom">
                            <span
                              className={
                                s !== 'resolved' &&
                                new Date(t.dueAt) < new Date()
                                  ? 'late'
                                  : ''
                              }
                            >
                              {sla(t.dueAt, s === 'resolved')}
                            </span>
                            {t.assigneeName && (
                              <Avatar name={t.assigneeName} size="tiny" />
                            )}
                          </div>
                        </button>
                      ))}
                    {!data.items.some((t) => t.status === s) && (
                      <div className="kanban-empty">
                        Tudo em ordem por aqui.
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
            <p className="board-hint">
              Abra um cartão para atualizar o status e acompanhar a conversa.{' '}
              {data.total > 100
                ? 'Mostrando os primeiros 100 resultados. Refine os filtros para ver outros chamados.'
                : ''}
            </p>
          </>
        )}
      </section>
    </>
  );
}
