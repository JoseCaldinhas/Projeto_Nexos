export const date = (
  value: string,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' },
) => new Intl.DateTimeFormat('pt-BR', options).format(new Date(value));
export const fullDate = (value: string) =>
  date(value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
export function timeAgo(value: string) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 1440) return `há ${Math.floor(minutes / 60)} h`;
  return `há ${Math.floor(minutes / 1440)} d`;
}
export function sla(dueAt: string, resolved = false) {
  if (resolved) return 'Concluído';
  const hours = (new Date(dueAt).getTime() - Date.now()) / 3600000;
  return hours < 0
    ? 'Prazo excedido'
    : hours < 1
      ? 'Vence em menos de 1h'
      : `Vence em ${Math.ceil(hours)}h`;
}
