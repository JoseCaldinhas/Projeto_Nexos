'use client';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  House,
  Search,
  Ticket,
  UsersRound,
} from 'lucide-react';
import { Empty, Modal, SearchInput } from './ui';
import { useResource } from '../hooks/use-resource';
import type { TicketList } from '../shared/contracts';
export function CommandPalette({
  onClose,
  onNavigate,
  onTicket,
}: {
  onClose: () => void;
  onNavigate: (p: string) => void;
  onTicket: (id: string) => void;
}) {
  const [q, setQ] = useState(''),
    [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(q), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data, loading } = useResource<TicketList>(
    search.trim() ? `tickets?q=${encodeURIComponent(search)}&pageSize=5` : null,
  );
  const pages = [
    ['overview', 'Visão geral', House],
    ['tickets', 'Atendimentos', Ticket],
    ['clients', 'Clientes', UsersRound],
    ['knowledge', 'Base de conhecimento', BookOpen],
    ['reports', 'Relatórios', ChartNoAxesCombined],
  ] as const;
  return (
    <Modal
      title="O que você procura?"
      eyebrow="BUSCA RÁPIDA · CTRL / ⌘ K"
      onClose={onClose}
    >
      <SearchInput
        label="Busca rápida"
        value={q}
        onChange={setQ}
        placeholder="Busque páginas, clientes ou chamados..."
      />
      <div className="command-list">
        <span>NAVEGAR</span>
        {pages
          .filter((p) => p[1].toLowerCase().includes(q.toLowerCase()))
          .map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => {
                onClose();
                onNavigate(id);
              }}
            >
              <Icon size={16} />
              {label}
              <ArrowRight size={14} />
            </button>
          ))}
        {search && (
          <>
            <span>ATENDIMENTOS {loading ? '· BUSCANDO...' : ''}</span>
            {data?.items.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onClose();
                  onTicket(t.id);
                }}
              >
                <Ticket size={16} />
                <div>
                  <strong>{t.subject}</strong>
                  <small>
                    #NX-{t.number} · {t.clientName}
                  </small>
                </div>
                <ArrowRight size={14} />
              </button>
            ))}
            {!loading && !data?.items.length && (
              <p className="muted">Nenhum atendimento encontrado.</p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
