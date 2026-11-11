import { ArrowDownToLine, Download, Info } from 'lucide-react';
import {
  Avatar,
  CardHeading,
  ErrorBox,
  PageHeading,
  Skeleton,
} from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import type { Metrics } from '../../shared/contracts';
import { ChannelChart, StatusChart, VolumeChart } from '../dashboard/charts';
import { MetricCards } from '../dashboard/dashboard';
export function ReportsPage({ version }: { version: number }) {
  const { data, loading, error, reload } = useResource<Metrics>(
    'metrics',
    version,
  );
  return (
    <>
      <PageHeading
        eyebrow="CLAREZA PARA O PRÓXIMO PASSO"
        title="Relatórios da operação"
        description="Dados reais do workspace. Uma visão mais clara para decidir."
        actions={
          <a className="button secondary" href="/api/tickets/export">
            <ArrowDownToLine size={15} />
            Exportar atendimentos
          </a>
        }
      />
      {error ? (
        <ErrorBox message={error} retry={reload} />
      ) : loading || !data ? (
        <Skeleton rows={6} />
      ) : (
        <>
          <MetricCards data={data} />
          <div className="charts-grid">
            <VolumeChart metrics={data} />
            <StatusChart metrics={data} />
          </div>
          <div className="charts-grid">
            <section className="card">
              <CardHeading
                title="Distribuição por responsável"
                description="Carga atual e histórico de resolução"
              />
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Responsável</th>
                      <th>Ativos</th>
                      <th>Resolvidos</th>
                      <th>Participação nos ativos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.workload.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div className="person-cell">
                            <Avatar name={m.name} />
                            <strong>{m.name}</strong>
                          </div>
                        </td>
                        <td>{m.active}</td>
                        <td>{m.resolved}</td>
                        <td>
                          <div className="report-share">
                            <div className="progress">
                              <span
                                style={{
                                  width: `${data.active ? (m.active / data.active) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <span>
                              {data.active
                                ? Math.round((m.active / data.active) * 100)
                                : 0}
                              %
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="report-footnote">
                <Info size={14} />
                Chamados sem responsável entram no total, mas não são atribuídos
                a uma pessoa.
              </div>
            </section>
            <ChannelChart metrics={data} />
          </div>
          <div className="report-methodology">
            <Info size={17} />
            <div>
              <strong>Como lemos esses números</strong>
              <p>
                Os cartões e distribuições consideram todos os atendimentos. O
                gráfico diário cobre os últimos 14 dias em UTC. A taxa de
                resolução é o número de chamados atualmente resolvidos dividido
                pelo total. Prazos alvo são metas calculadas na criação; reabrir
                um chamado mantém o prazo original.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
