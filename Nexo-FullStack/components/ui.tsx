'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  ChevronRight,
  Inbox,
  LoaderCircle,
  Search,
  X,
} from 'lucide-react';
import { initials } from '../lib/format';
import {
  statusLabels,
  priorityLabels,
  type Status,
  type Priority,
} from '../shared/contracts';
export function Avatar({
  name,
  size = '',
  className = '',
}: {
  name: string;
  size?: string;
  className?: string;
}) {
  const colors = ['lavender', 'peach', 'mint', 'blue', 'rose'];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return (
    <span className={`avatar ${size} ${color} ${className}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge ${status}`}>
      <i />
      {statusLabels[status]}
    </span>
  );
}
export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`priority-badge ${priority}`}>
      <i />
      {priorityLabels[priority]}
    </span>
  );
}
export function Button({
  children,
  variant = 'secondary',
  busy = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      className={`button ${variant} ${className}`}
      disabled={props.disabled || busy}
    >
      {busy && <LoaderCircle size={15} className="spin" />}
      {children}
    </button>
  );
}
export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      aria-labelledby={id}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 id={id}>{title}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Fechar janela"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function ErrorBox({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={17} />
      <div>
        {message}
        {retry && <button onClick={retry}>Tentar novamente</button>}
      </div>
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span>
        <Inbox size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-wrap" role="status" aria-label="Carregando dados">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: i === 0 ? 80 : 55 }}
        />
      ))}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  label = 'Buscar',
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div className="search-input">
      <Search size={16} />
      <input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button aria-label="Limpar busca" onClick={() => onChange('')}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}
export function CardHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={14} />
    </button>
  );
}
export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [message, onClose]);
  return (
    <div className="toast" role="status">
      <span>
        <Check size={16} />
      </span>
      {message}
      <button aria-label="Fechar aviso" onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  );
}
export function Breadcrumb({ section }: { section: string }) {
  return (
    <div className="breadcrumbs">
      <span>Workspace</span>
      <ChevronRight size={12} />
      <strong>{section}</strong>
    </div>
  );
}
