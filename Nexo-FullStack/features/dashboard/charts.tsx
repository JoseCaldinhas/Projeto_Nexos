import {
  channelLabels,
  statusLabels,
  type Metrics,
} from '../../shared/contracts';
import { CardHeading } from '../../components/ui';
export function VolumeChart({ metrics }: { metrics: Metrics }) {
  const max = Math.max(
    4,
    ...metrics.daily.map((d) => Math.max(d.created, d.resolved)),
  );
  const points = (field: 'created' | 'resolved') =>
    metrics.daily
      .map((d, i) => `${43 + i * 35},${175 - (d[field] / max) * 130}`)
      .join(' ');
  return (
    <section className="card chart-card">
      <CardHeading
        title="O ritmo da sua operação"
        description="Atendimentos criados e resolvidos · últimos 14 dias"
        action={<span className="chart-period">14 dias</span>}
      />
      <div className="chart-legend">
        <span>
          <i />
          Recebidos
        </span>
        <span>
          <i />
          Resolvidos
        </span>
      </div>
      <div className="volume-chart">
        <svg
          viewBox="0 0 530 220"
          role="img"
          aria-label={`Volume diário dos últimos 14 dias. ${metrics.daily.reduce((n, d) => n + d.created, 0)} criados e ${metrics.daily.reduce((n, d) => n + d.resolved, 0)} resolvidos.`}
        >
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9d84dc" stopOpacity=".21" />
              <stop offset="1" stopColor="#9d84dc" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <line
                x1="35"
                y1={45 + i * 43.33}
                x2="508"
                y2={45 + i * 43.33}
                stroke="var(--border)"
                strokeDasharray="3 4"
              />
              <text x="12" y={49 + i * 43.33}>
                {Math.round(max * (1 - i / 3))}
              </text>
            </g>
          ))}
          <polygon
            points={`43,175 ${points('created')} 498,175`}
            fill="url(#area)"
          />
          <polyline
            points={points('resolved')}
            fill="none"
            stroke="#d0c2ea"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
          <polyline
            points={points('created')}
            fill="none"
            stroke="#9478d1"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          {metrics.daily.map((d, i) => (
            <g key={d.date}>
              <circle
                cx={43 + i * 35}
                cy={175 - (d.created / max) * 130}
                r="3"
                fill="var(--surface)"
                stroke="#9478d1"
                strokeWidth="2"
              >
                <title>
                  {d.date}: {d.created} criados, {d.resolved} resolvidos
                </title>
              </circle>
              {i % 2 === 0 && (
                <text x={33 + i * 35} y="205">
                  {d.date.slice(8)}/{d.date.slice(5, 7)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
export function ChannelChart({ metrics }: { metrics: Metrics }) {
  const colors = ['#8b70ce', '#b4a1e0', '#e0d8ef'];
  let progress = 0;
  const stops = metrics.byChannel.map((c, i) => {
    const start = progress;
    progress += metrics.total ? (c.value / metrics.total) * 100 : 0;
    return `${colors[i % 3]} ${start}% ${progress}%`;
  });
  return (
    <section className="card channel-card">
      <CardHeading
        title="De onde vêm as conversas"
        description="Distribuição por canal"
      />
      <div
        className="channel-donut"
        style={{
          background: metrics.total
            ? `conic-gradient(${stops.join(',')})`
            : 'var(--border)',
        }}
        role="img"
        aria-label={metrics.byChannel
          .map((c) => `${channelLabels[c.name]}: ${c.value}`)
          .join(', ')}
      >
        <div>
          <strong>{metrics.total}</strong>
          <span>atendimentos</span>
        </div>
      </div>
      <div className="channel-legend">
        {metrics.byChannel.map((c, i) => (
          <div key={c.name}>
            <span>
              <i style={{ background: colors[i % 3] }} />
              {channelLabels[c.name]}
            </span>
            <strong>
              {c.value}
              <small>{Math.round((c.value / metrics.total) * 100)}%</small>
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
export function StatusChart({ metrics }: { metrics: Metrics }) {
  return (
    <section className="card">
      <CardHeading
        title="Situação dos atendimentos"
        description="Todos os registros do workspace"
      />
      <div className="status-chart">
        {(['open', 'in_progress', 'waiting', 'resolved'] as const).map((s) => {
          const value = metrics.byStatus.find((d) => d.name === s)?.value || 0;
          return (
            <div key={s}>
              <div>
                <span>{statusLabels[s]}</span>
                <strong>{value}</strong>
              </div>
              <div className={`progress ${s}`}>
                <span
                  style={{
                    width: `${metrics.total ? (value / metrics.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
