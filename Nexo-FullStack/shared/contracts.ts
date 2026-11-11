export type Role = 'admin' | 'agent' | 'viewer';
export type Status = 'open' | 'in_progress' | 'waiting' | 'resolved';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type Channel = 'email' | 'chat' | 'whatsapp';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  workspaceId: string;
}
export interface Workspace {
  id: string;
  name: string;
  demo: boolean;
}
export interface Session {
  user: User;
  workspace: Workspace;
}
export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
}
export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  createdAt: string;
  ticketCount: number;
}
export interface Ticket {
  id: string;
  number: number;
  subject: string;
  description: string;
  status: Status;
  priority: Priority;
  channel: Channel;
  clientId: string;
  clientName: string;
  clientEmail: string;
  company: string;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  version: number;
}
export interface TicketList {
  items: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Message {
  id: string;
  author: string;
  body: string;
  internal: boolean;
  createdAt: string;
}
export interface Audit {
  id: string;
  actor: string;
  action: string;
  detail: string;
  ticketId: string | null;
  createdAt: string;
}
export interface TicketDetail {
  ticket: Ticket;
  messages: Message[];
  activities: Audit[];
}
export interface Article {
  id: string;
  title: string;
  category: string;
  body: string;
  published: boolean;
  updatedAt: string;
}
export interface Metrics {
  total: number;
  active: number;
  resolved: number;
  urgent: number;
  overdue: number;
  resolutionRate: number;
  byStatus: { name: Status; value: number }[];
  byChannel: { name: Channel; value: number }[];
  daily: { date: string; created: number; resolved: number }[];
  workload: { id: string; name: string; active: number; resolved: number }[];
  recent: Ticket[];
  activity: Audit[];
}
export const statusLabels: Record<Status, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  waiting: 'Aguardando',
  resolved: 'Resolvido',
};
export const priorityLabels: Record<Priority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};
export const channelLabels: Record<Channel, string> = {
  email: 'E-mail',
  chat: 'Chat',
  whatsapp: 'WhatsApp',
};
export const roleLabels: Record<Role, string> = {
  admin: 'Administrador',
  agent: 'Agente',
  viewer: 'Leitor',
};
