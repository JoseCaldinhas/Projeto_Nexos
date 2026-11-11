import { z } from 'zod';
import { all, one, run, uid, now, type Database } from './database.ts';
import {
  ApiError,
  checkOrigin,
  digest,
  getSession,
  hashPassword,
  rateLimit,
  requireAdmin,
  requireWrite,
  sessionToken,
  startSession,
  verifyPassword,
} from './security.ts';
import * as v from './validation.ts';
import { seedWorkspace } from './seed.ts';
import {
  statusLabels,
  priorityLabels,
  type Session,
  type Ticket,
  type Article,
} from '../shared/contracts.ts';
const ticketSelect = `SELECT t.id,t.number,t.subject,t.description,t.status,t.priority,t.channel,t.client_id AS clientId,c.name AS clientName,c.email AS clientEmail,c.company,t.assignee_id AS assigneeId,u.name AS assigneeName,t.created_at AS createdAt,t.updated_at AS updatedAt,t.due_at AS dueAt,t.version FROM tickets t JOIN clients c ON c.id=t.client_id LEFT JOIN users u ON u.id=t.assignee_id`;
const articleSelect = `SELECT id,title,category,body,published,updated_at AS updatedAt FROM articles`;
const clientSelect = `SELECT c.id,c.name,c.email,c.company,c.phone,c.created_at AS createdAt,(SELECT count(*) FROM tickets t WHERE t.client_id=c.id) AS ticketCount FROM clients c`;
const auditSelect = `SELECT a.id,u.name AS actor,a.action,a.detail,a.ticket_id AS ticketId,a.created_at AS createdAt FROM audit a JOIN users u ON u.id=a.actor_id`;
const statuses = ['open', 'in_progress', 'waiting', 'resolved'];
const priorities = ['low', 'normal', 'high', 'urgent'];
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const text = await req.text();
  if (new TextEncoder().encode(text).length > 40000)
    throw new ApiError(413, 'Conteúdo muito grande.');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError(400, 'JSON inválido.');
  }
  return schema.parse(data);
}
async function audit(
  db: Database,
  s: Session,
  action: string,
  detail: string,
  ticketId: string | null = null,
) {
  await run(
    db,
    'INSERT INTO audit (id,workspace_id,actor_id,ticket_id,action,detail,created_at) VALUES (?,?,?,?,?,?,?)',
    uid(),
    s.workspace.id,
    s.user.id,
    ticketId,
    action,
    detail,
    now(),
  );
}
async function ticket(db: Database, id: string, workspace: string) {
  const t = await one<Ticket>(
    db,
    `${ticketSelect} WHERE t.id=? AND t.workspace_id=?`,
    id,
    workspace,
  );
  if (!t) throw new ApiError(404, 'Atendimento não encontrado.');
  return t;
}
async function validateAssignee(
  db: Database,
  id: string | null | undefined,
  workspace: string,
) {
  if (
    id &&
    !(await one(
      db,
      'SELECT id FROM users WHERE id=? AND workspace_id=? AND role IN (?,?)',
      id,
      workspace,
      'admin',
      'agent',
    ))
  )
    throw new ApiError(
      400,
      'Escolha um responsável deste workspace com permissão de atendimento.',
    );
}
function filters(url: URL, workspace: string) {
  let sql = 't.workspace_id=?';
  const args: unknown[] = [workspace];
  const q = url.searchParams.get('q')?.trim().slice(0, 150);
  if (q) {
    sql +=
      " AND (t.subject LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\' OR CAST(t.number AS TEXT) LIKE ? ESCAPE '\\')";
    const safe = '%' + q.replace(/[\\%_]/g, '\\$&') + '%';
    args.push(safe, safe, safe, safe);
  }
  for (const [key, allowed, column] of [
    ['status', statuses, 't.status'],
    ['priority', priorities, 't.priority'],
    ['channel', ['email', 'chat', 'whatsapp'], 't.channel'],
  ] as const) {
    const value = url.searchParams.get(key);
    if (value) {
      if (!(allowed as readonly string[]).includes(value))
        throw new ApiError(400, 'Filtro inválido.');
      sql += ` AND ${column}=?`;
      args.push(value);
    }
  }
  const assignee = url.searchParams.get('assignee');
  if (assignee) {
    sql += ' AND t.assignee_id=?';
    args.push(assignee);
  }
  if (url.searchParams.get('client')) {
    sql += ' AND t.client_id=?';
    args.push(url.searchParams.get('client'));
  }
  if (url.searchParams.get('overdue') === 'true') {
    sql += " AND t.status!='resolved' AND t.due_at<?";
    args.push(now());
  }
  return { sql, args };
}
export async function handleApi(req: Request, db: Database): Promise<Response> {
  try {
    checkOrigin(req);
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
    const method = req.method;
    if (path === 'health' && method === 'GET')
      return json({ status: 'ok', service: 'nexo', version: '2.0.0' });
    if (
      ['auth/login', 'auth/register', 'auth/demo'].includes(path) &&
      method === 'POST'
    ) {
      const ip = req.headers.get('cf-connecting-ip') || 'local';
      await rateLimit(db, 'auth:' + ip, 30, 15 * 60000);
      if (path === 'auth/login') {
        const data = await body(req, v.loginSchema);
        const row = await one<{ id: string; password_hash: string }>(
          db,
          'SELECT id,password_hash FROM users WHERE email=?',
          data.email,
        );
        // Run a password derivation even for unknown users to reduce timing differences.
        const valid = await verifyPassword(
          data.password,
          row?.password_hash ??
            'pbkdf2:100000:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000',
        );
        if (!row || !valid)
          throw new ApiError(401, 'E-mail ou senha inválidos.');
        return json({ ok: true }, 200, {
          'Set-Cookie': await startSession(db, row.id, req),
        });
      }
      const demo = path === 'auth/demo';
      const data = demo
        ? {
            name: 'José Caldas',
            email: `demo.${uid()}@nexo.test`,
            password: uid() + uid(),
            workspace: 'Studio workspace',
          }
        : await body(req, v.registerSchema);
      const demoOptions = demo
        ? await body(
            req,
            z.object({ role: v.roleSchema.default('admin') }).strict(),
          )
        : { role: 'admin' as const };
      if (await one(db, 'SELECT id FROM users WHERE email=?', data.email))
        throw new ApiError(409, 'Este e-mail já está cadastrado.');
      const workspaceId = uid(),
        userId = uid(),
        stamp = now();
      const passwordHash = await hashPassword(data.password);
      await db.batch([
        db
          .prepare(
            'INSERT INTO workspaces (id,name,demo,created_at) VALUES (?,?,?,?)',
          )
          .bind(workspaceId, data.workspace, demo ? 1 : 0, stamp),
        db
          .prepare(
            'INSERT INTO users (id,workspace_id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?,?)',
          )
          .bind(
            userId,
            workspaceId,
            data.name,
            data.email,
            passwordHash,
            demo ? demoOptions.role : 'admin',
            stamp,
          ),
      ]);
      if (demo) await seedWorkspace(db, workspaceId, userId);
      return json({ ok: true }, 201, {
        'Set-Cookie': await startSession(db, userId, req),
      });
    }
    const s = await getSession(db, req);
    const workspace = s.workspace.id;
    if (path === 'auth/me' && method === 'GET') return json(s);
    if (path === 'auth/logout' && method === 'POST') {
      await run(
        db,
        'DELETE FROM sessions WHERE id=?',
        await digest(sessionToken(req)),
      );
      return json({ ok: true }, 200, {
        'Set-Cookie': `nexo_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${url.protocol === 'https:' ? '; Secure' : ''}`,
      });
    }
    if (!['GET', 'HEAD'].includes(method)) {
      requireWrite(s);
      await rateLimit(db, 'write:' + s.user.id, 150, 10 * 60000);
    }
    if (path === 'tickets' && method === 'GET') {
      const { sql, args } = filters(url, workspace);
      const page = z.coerce
        .number()
        .int()
        .min(1)
        .max(100000)
        .parse(url.searchParams.get('page') || 1);
      const pageSize = z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .parse(url.searchParams.get('pageSize') || 12);
      const sort =
        url.searchParams.get('sort') === 'oldest'
          ? 't.created_at ASC,t.number ASC'
          : url.searchParams.get('sort') === 'priority'
            ? "CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,t.created_at DESC"
            : 't.created_at DESC,t.number DESC';
      const count = await one<{ total: number }>(
        db,
        `SELECT count(*) AS total FROM tickets t JOIN clients c ON c.id=t.client_id WHERE ${sql}`,
        ...args,
      );
      return json({
        items: await all(
          db,
          `${ticketSelect} WHERE ${sql} ORDER BY ${sort} LIMIT ? OFFSET ?`,
          ...args,
          pageSize,
          (page - 1) * pageSize,
        ),
        total: count?.total || 0,
        page,
        pageSize,
      });
    }
    if (path === 'tickets/export' && method === 'GET') {
      const { sql, args } = filters(url, workspace);
      const count = await one<{ n: number }>(
        db,
        `SELECT count(*) AS n FROM tickets t JOIN clients c ON c.id=t.client_id WHERE ${sql}`,
        ...args,
      );
      if ((count?.n || 0) > 5000)
        throw new ApiError(
          400,
          'Refine os filtros para exportar até 5.000 registros.',
        );
      const rows = await all<Ticket>(
        db,
        `${ticketSelect} WHERE ${sql} ORDER BY t.created_at DESC LIMIT 5000`,
        ...args,
      );
      const cell = (value: unknown) => {
        let text = String(value ?? '');
        if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      };
      const csv =
        '\uFEFF' +
        [
          [
            'Número',
            'Cliente',
            'E-mail',
            'Assunto',
            'Status',
            'Prioridade',
            'Canal',
            'Responsável',
            'Criado em',
          ],
          ...rows.map((t) => [
            t.number,
            t.clientName,
            t.clientEmail,
            t.subject,
            statusLabels[t.status],
            t.priority,
            t.channel,
            t.assigneeName,
            t.createdAt,
          ]),
        ]
          .map((row) => row.map(cell).join(';'))
          .join('\r\n');
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="nexo-atendimentos.csv"',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    if (path === 'tickets' && method === 'POST') {
      const data = await body(req, v.ticketSchema);
      if (
        !(await one(
          db,
          'SELECT id FROM clients WHERE id=? AND workspace_id=?',
          data.clientId,
          workspace,
        ))
      )
        throw new ApiError(400, 'Cliente não encontrado neste workspace.');
      await validateAssignee(db, data.assigneeId, workspace);
      const id = uid(),
        stamp = now(),
        dueAt = new Date(
          Date.now() +
            { urgent: 4, high: 8, normal: 24, low: 48 }[data.priority] *
              3600000,
        ).toISOString();
      await db.batch([
        db
          .prepare(
            `INSERT INTO tickets (id,workspace_id,number,client_id,subject,description,status,priority,channel,assignee_id,created_at,updated_at,due_at,version) SELECT ?,?,COALESCE(MAX(number),1000)+1,?,?,?,'open',?,?,?,?,?,?,1 FROM tickets WHERE workspace_id=?`,
          )
          .bind(
            id,
            workspace,
            data.clientId,
            data.subject,
            data.description,
            data.priority,
            data.channel,
            data.assigneeId,
            stamp,
            stamp,
            dueAt,
            workspace,
          ),
        db
          .prepare(
            'INSERT INTO audit (id,workspace_id,actor_id,ticket_id,action,detail,created_at) VALUES (?,?,?,?,?,?,?)',
          )
          .bind(
            uid(),
            workspace,
            s.user.id,
            id,
            'ticket.created',
            'Atendimento criado',
            stamp,
          ),
      ]);
      return json(await ticket(db, id, workspace), 201);
    }
    const match = path.match(/^tickets\/([^/]+)(?:\/(messages|suggestion))?$/);
    if (match) {
      const [, id, action] = match;
      const current = await ticket(db, id, workspace);
      if (!action && method === 'GET')
        return json({
          ticket: current,
          messages: (
            await all<Record<string, unknown>>(
              db,
              'SELECT m.id,u.name AS author,m.body,m.internal,m.created_at AS createdAt FROM messages m JOIN users u ON u.id=m.author_id WHERE m.ticket_id=? ORDER BY m.created_at',
              id,
            )
          ).map((m) => ({ ...m, internal: !!m.internal })),
          activities: await all(
            db,
            `${auditSelect} WHERE a.ticket_id=? AND a.workspace_id=? ORDER BY a.created_at DESC LIMIT 50`,
            id,
            workspace,
          ),
        });
      if (!action && method === 'PATCH') {
        const data = await body(req, v.updateTicketSchema);
        if (data.version !== current.version)
          throw new ApiError(
            409,
            'Este chamado mudou. Reabra os detalhes para carregar a versão atual.',
          );
        await validateAssignee(db, data.assigneeId, workspace);
        const updated = { ...current, ...data };
        const stamp = now();
        const detail = [
          data.status
            ? `Status alterado para ${statusLabels[data.status]}`
            : '',
          data.priority
            ? `Prioridade alterada para ${priorityLabels[data.priority]}`
            : '',
          data.assigneeId !== undefined ? 'Responsável atualizado' : '',
          data.subject ? 'Assunto atualizado' : '',
        ]
          .filter(Boolean)
          .join(' · ');
        const results = await db.batch([
          db
            .prepare(
              "UPDATE tickets SET subject=?,status=?,priority=?,assignee_id=?,updated_at=?,resolved_at=CASE WHEN ?='resolved' THEN COALESCE(resolved_at,?) ELSE NULL END,version=version+1 WHERE id=? AND workspace_id=? AND version=?",
            )
            .bind(
              updated.subject,
              updated.status,
              updated.priority,
              updated.assigneeId,
              stamp,
              updated.status,
              stamp,
              id,
              workspace,
              data.version,
            ),
          db
            .prepare(
              'INSERT INTO audit (id,workspace_id,actor_id,ticket_id,action,detail,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()>0',
            )
            .bind(
              uid(),
              workspace,
              s.user.id,
              id,
              'ticket.updated',
              detail,
              stamp,
            ),
        ]);
        if (!(results[0] as { meta: { changes: number } }).meta.changes)
          throw new ApiError(
            409,
            'Outra pessoa atualizou este chamado. Reabra os detalhes.',
          );
        return json(await ticket(db, id, workspace));
      }
      if (action === 'messages' && method === 'POST') {
        const data = await body(req, v.messageSchema);
        if (current.status === 'resolved')
          throw new ApiError(
            409,
            'Reabra o chamado antes de adicionar uma mensagem.',
          );
        const stamp = now();
        const messageId = uid();
        const results = await db.batch([
          db
            .prepare(
              'INSERT INTO messages (id,ticket_id,author_id,body,internal,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM tickets WHERE id=? AND workspace_id=? AND status<>?)',
            )
            .bind(
              messageId,
              id,
              s.user.id,
              data.body,
              data.internal ? 1 : 0,
              stamp,
              id,
              workspace,
              'resolved',
            ),
          db
            .prepare(
              'INSERT INTO audit (id,workspace_id,actor_id,ticket_id,action,detail,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()>0',
            )
            .bind(
              uid(),
              workspace,
              s.user.id,
              id,
              data.internal ? 'ticket.note' : 'ticket.reply',
              data.internal
                ? 'Nota interna registrada'
                : 'Resposta registrada no histórico',
              stamp,
            ),
          db
            .prepare(
              'UPDATE tickets SET updated_at=?,version=version+1 WHERE id=? AND workspace_id=? AND EXISTS(SELECT 1 FROM messages WHERE id=?)',
            )
            .bind(stamp, id, workspace, messageId),
        ]);
        if (!(results[0] as { meta: { changes: number } }).meta.changes)
          throw new ApiError(
            409,
            'O chamado foi resolvido por outra pessoa. Reabra os detalhes.',
          );
        return json({ ok: true }, 201);
      }
      if (action === 'suggestion' && method === 'POST') {
        await body(req, z.object({}).strict());
        const articles = await all<Article>(
          db,
          `${articleSelect} WHERE workspace_id=? AND published=1 LIMIT 100`,
          workspace,
        );
        const words =
          (current.subject + ' ' + current.description)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .match(/[a-z]{4,}/g) || [];
        const ranked = articles
          .map((a) => ({
            a,
            score: words.reduce(
              (n, w) =>
                (a.title + ' ' + a.body)
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .includes(w)
                  ? n + 1
                  : n,
              0,
            ),
          }))
          .sort((a, b) => b.score - a.score);
        const source = ranked[0]?.score > 0 ? ranked[0].a : null;
        const text = `Olá, ${current.clientName.split(' ')[0]}! Obrigado por entrar em contato. Recebemos sua solicitação sobre “${current.subject}”. ${source ? 'A orientação da nossa base é: ' + source.body.slice(0, 650) : 'Para entender melhor o caso, você pode informar em qual etapa encontrou dificuldade e se apareceu alguma mensagem de erro?'} Vamos acompanhar o atendimento por aqui.`;
        return json({
          text,
          source: source ? { id: source.id, title: source.title } : null,
          mode: 'rules',
          notice:
            'Sugestão por regras e busca textual. Revise antes de registrar. Não utiliza IA generativa.',
        });
      }
    }
    if (path === 'clients' && method === 'GET')
      return json(
        await all(
          db,
          `${clientSelect} WHERE c.workspace_id=? ORDER BY c.name LIMIT 500`,
          workspace,
        ),
      );
    if (path === 'clients' && method === 'POST') {
      const data = await body(req, v.clientSchema);
      const id = uid();
      await run(
        db,
        'INSERT INTO clients (id,workspace_id,name,email,company,phone,created_at) VALUES (?,?,?,?,?,?,?)',
        id,
        workspace,
        data.name,
        data.email,
        data.company,
        data.phone,
        now(),
      );
      await audit(db, s, 'client.created', `Cliente ${data.name} cadastrado`);
      return json(
        await one(
          db,
          `${clientSelect} WHERE c.id=? AND c.workspace_id=?`,
          id,
          workspace,
        ),
        201,
      );
    }
    if (path.startsWith('clients/') && method === 'PATCH') {
      const id = path.slice(8),
        data = await body(req, v.clientSchema);
      if (
        !(await one(
          db,
          'SELECT id FROM clients WHERE id=? AND workspace_id=?',
          id,
          workspace,
        ))
      )
        throw new ApiError(404, 'Cliente não encontrado.');
      await run(
        db,
        'UPDATE clients SET name=?,email=?,company=?,phone=? WHERE id=? AND workspace_id=?',
        data.name,
        data.email,
        data.company,
        data.phone,
        id,
        workspace,
      );
      await audit(
        db,
        s,
        'client.updated',
        `Cadastro de ${data.name} atualizado`,
      );
      return json({ ok: true });
    }
    if (path === 'articles' && method === 'GET')
      return json(
        (
          await all<Record<string, unknown>>(
            db,
            `${articleSelect} WHERE workspace_id=? ${s.user.role === 'viewer' ? 'AND published=1' : ''} ORDER BY updated_at DESC LIMIT 200`,
            workspace,
          )
        ).map((a) => ({ ...a, published: !!a.published })),
      );
    if (path === 'articles' && method === 'POST') {
      const data = await body(req, v.articleSchema),
        id = uid();
      await run(
        db,
        'INSERT INTO articles (id,workspace_id,title,category,body,published,updated_at) VALUES (?,?,?,?,?,?,?)',
        id,
        workspace,
        data.title,
        data.category,
        data.body,
        data.published ? 1 : 0,
        now(),
      );
      await audit(db, s, 'article.created', `Artigo “${data.title}” criado`);
      return json({ id }, 201);
    }
    if (path.startsWith('articles/') && method === 'PATCH') {
      const id = path.slice(9),
        data = await body(req, v.articleSchema);
      if (
        !(await one(
          db,
          'SELECT id FROM articles WHERE id=? AND workspace_id=?',
          id,
          workspace,
        ))
      )
        throw new ApiError(404, 'Artigo não encontrado.');
      await run(
        db,
        'UPDATE articles SET title=?,category=?,body=?,published=?,updated_at=? WHERE id=? AND workspace_id=?',
        data.title,
        data.category,
        data.body,
        data.published ? 1 : 0,
        now(),
        id,
        workspace,
      );
      await audit(
        db,
        s,
        'article.updated',
        `Artigo “${data.title}” atualizado`,
      );
      return json({ ok: true });
    }
    if (path === 'team' && method === 'GET')
      return json(
        await all(
          db,
          'SELECT id,name,email,role FROM users WHERE workspace_id=? ORDER BY name',
          workspace,
        ),
      );
    if (path === 'team' && method === 'POST') {
      requireAdmin(s);
      const data = await body(req, v.memberSchema);
      if (await one(db, 'SELECT id FROM users WHERE email=?', data.email))
        throw new ApiError(409, 'Este e-mail já está cadastrado.');
      const id = uid();
      await run(
        db,
        'INSERT INTO users (id,workspace_id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?,?)',
        id,
        workspace,
        data.name,
        data.email,
        await hashPassword(data.password),
        data.role,
        now(),
      );
      await audit(
        db,
        s,
        'team.created',
        `Membro ${data.name} adicionado como ${data.role}`,
      );
      return json({ id }, 201);
    }
    if (path === 'settings' && method === 'PATCH') {
      requireAdmin(s);
      const data = await body(
        req,
        z.object({ name: z.string().trim().min(2).max(80) }).strict(),
      );
      await run(
        db,
        'UPDATE workspaces SET name=? WHERE id=?',
        data.name,
        workspace,
      );
      await audit(db, s, 'workspace.updated', 'Nome do workspace atualizado');
      return json({ ok: true });
    }
    if (path === 'profile' && method === 'PATCH') {
      const data = await body(
        req,
        z.object({ name: z.string().trim().min(2).max(100) }).strict(),
      );
      await run(
        db,
        'UPDATE users SET name=? WHERE id=? AND workspace_id=?',
        data.name,
        s.user.id,
        workspace,
      );
      return json({ ok: true });
    }
    if (path === 'metrics' && method === 'GET') {
      const counts = await one<{
        total: number;
        active: number;
        resolved: number;
        urgent: number;
        overdue: number;
      }>(
        db,
        `SELECT count(*) AS total,COALESCE(SUM(status!='resolved'),0) AS active,COALESCE(SUM(status='resolved'),0) AS resolved,COALESCE(SUM(priority='urgent' AND status!='resolved'),0) AS urgent,COALESCE(SUM(status!='resolved' AND due_at<?),0) AS overdue FROM tickets WHERE workspace_id=?`,
        now(),
        workspace,
      );
      const since = new Date(Date.now() - 13 * 86400000)
        .toISOString()
        .slice(0, 10);
      const created = await all<{ date: string; value: number }>(
        db,
        'SELECT substr(created_at,1,10) AS date,count(*) AS value FROM tickets WHERE workspace_id=? AND created_at>=? GROUP BY date',
        workspace,
        since,
      );
      const resolved = await all<{ date: string; value: number }>(
        db,
        "SELECT substr(resolved_at,1,10) AS date,count(*) AS value FROM tickets WHERE workspace_id=? AND status='resolved' AND resolved_at>=? GROUP BY date",
        workspace,
        since,
      );
      const daily = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(Date.now() - (13 - i) * 86400000)
          .toISOString()
          .slice(0, 10);
        return {
          date,
          created: created.find((d) => d.date === date)?.value || 0,
          resolved: resolved.find((d) => d.date === date)?.value || 0,
        };
      });
      return json({
        ...counts,
        resolutionRate: counts?.total
          ? Math.round((counts.resolved / counts.total) * 100)
          : 0,
        byStatus: await all(
          db,
          'SELECT status AS name,count(*) AS value FROM tickets WHERE workspace_id=? GROUP BY status',
          workspace,
        ),
        byChannel: await all(
          db,
          'SELECT channel AS name,count(*) AS value FROM tickets WHERE workspace_id=? GROUP BY channel',
          workspace,
        ),
        daily,
        workload: await all(
          db,
          `SELECT u.id,u.name,COALESCE(SUM(t.status!='resolved'),0) AS active,COALESCE(SUM(t.status='resolved'),0) AS resolved FROM users u LEFT JOIN tickets t ON t.assignee_id=u.id AND t.workspace_id=u.workspace_id WHERE u.workspace_id=? AND u.role!='viewer' GROUP BY u.id ORDER BY active DESC`,
          workspace,
        ),
        recent: await all(
          db,
          `${ticketSelect} WHERE t.workspace_id=? ORDER BY t.created_at DESC,t.number DESC LIMIT 5`,
          workspace,
        ),
        activity: await all(
          db,
          `${auditSelect} WHERE a.workspace_id=? ORDER BY a.created_at DESC LIMIT 12`,
          workspace,
        ),
      });
    }
    if (path === 'activity' && method === 'GET')
      return json(
        await all(
          db,
          `${auditSelect} WHERE a.workspace_id=? ORDER BY a.created_at DESC LIMIT 100`,
          workspace,
        ),
      );
    throw new ApiError(404, 'Endpoint não encontrado.');
  } catch (error) {
    if (error instanceof ApiError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json(
        {
          error: error.issues[0]?.message || 'Dados inválidos.',
          fields: error.flatten().fieldErrors,
        },
        422,
      );
    const message = error instanceof Error ? error.message : '';
    if (/UNIQUE constraint failed/.test(message))
      return json(
        { error: 'Já existe um registro com este e-mail neste workspace.' },
        409,
      );
    console.error('Nexo API error:', error);
    return json(
      { error: 'Não foi possível concluir a operação. Tente novamente.' },
      500,
    );
  }
}
