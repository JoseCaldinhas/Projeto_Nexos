import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  demo: integer('demo').notNull().default(0),
  createdAt: text('created_at').notNull(),
});
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    name: text('name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    index('users_workspace_idx').on(t.workspaceId),
  ],
);
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);
export const clients = sqliteTable(
  'clients',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    name: text('name').notNull(),
    email: text('email').notNull(),
    company: text('company').notNull().default(''),
    phone: text('phone').notNull().default(''),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('clients_workspace_idx').on(t.workspaceId),
    uniqueIndex('clients_email_workspace_unique').on(t.workspaceId, t.email),
  ],
);
export const tickets = sqliteTable(
  'tickets',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    number: integer('number').notNull(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id),
    subject: text('subject').notNull(),
    description: text('description').notNull(),
    status: text('status').notNull().default('open'),
    priority: text('priority').notNull().default('normal'),
    channel: text('channel').notNull(),
    assigneeId: text('assignee_id').references(() => users.id),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    resolvedAt: text('resolved_at'),
    dueAt: text('due_at').notNull(),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    index('tickets_workspace_created_idx').on(t.workspaceId, t.createdAt),
    index('tickets_workspace_status_idx').on(t.workspaceId, t.status),
    uniqueIndex('tickets_workspace_number_unique').on(t.workspaceId, t.number),
  ],
);
export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    ticketId: text('ticket_id')
      .notNull()
      .references(() => tickets.id),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    internal: integer('internal').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('messages_ticket_idx').on(t.ticketId)],
);
export const articles = sqliteTable(
  'articles',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    title: text('title').notNull(),
    category: text('category').notNull(),
    body: text('body').notNull(),
    published: integer('published').notNull().default(1),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('articles_workspace_idx').on(t.workspaceId)],
);
export const audit = sqliteTable(
  'audit',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    actorId: text('actor_id')
      .notNull()
      .references(() => users.id),
    ticketId: text('ticket_id').references(() => tickets.id),
    action: text('action').notNull(),
    detail: text('detail').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('audit_workspace_idx').on(t.workspaceId, t.createdAt)],
);
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: integer('reset_at').notNull(),
});
