import { one, run, uid, type Database } from './database.ts';
import type { Session, Role } from '../shared/contracts.ts';
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
export async function digest(value: string) {
  return hex(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  );
}
export async function hashPassword(
  password: string,
  salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer),
) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256,
  );
  return `pbkdf2:100000:${salt}:${hex(hash)}`;
}
export async function verifyPassword(password: string, stored: string) {
  const salt = stored.split(':')[2];
  if (!salt) return false;
  const actual = await hashPassword(password, salt);
  let mismatch = actual.length ^ stored.length;
  for (let i = 0; i < actual.length; i++)
    mismatch |= actual.charCodeAt(i) ^ stored.charCodeAt(i);
  return mismatch === 0;
}
export function sessionToken(req: Request) {
  return (
    req.headers
      .get('cookie')
      ?.match(/(?:^|;\s*)nexo_session=([a-f0-9-]+)/)?.[1] ?? ''
  );
}
export async function startSession(
  db: Database,
  userId: string,
  request: Request,
) {
  const token = uid() + uid();
  await run(
    db,
    'INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)',
    await digest(token),
    userId,
    Date.now() + 7 * 86400000,
  );
  return `nexo_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function getSession(db: Database, req: Request): Promise<Session> {
  const token = sessionToken(req);
  if (!token) throw new ApiError(401, 'Entre na sua conta para continuar.');
  const row = await one<{
    id: string;
    name: string;
    email: string;
    role: Role;
    workspaceId: string;
    workspaceName: string;
    demo: number;
  }>(
    db,
    `SELECT u.id,u.name,u.email,u.role,u.workspace_id AS workspaceId,w.name AS workspaceName,w.demo FROM sessions s JOIN users u ON u.id=s.user_id JOIN workspaces w ON w.id=u.workspace_id WHERE s.id=? AND s.expires_at>?`,
    await digest(token),
    Date.now(),
  );
  if (!row) throw new ApiError(401, 'Sua sessão expirou. Entre novamente.');
  return {
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      workspaceId: row.workspaceId,
    },
    workspace: {
      id: row.workspaceId,
      name: row.workspaceName,
      demo: !!row.demo,
    },
  };
}
export function requireWrite(s: Session) {
  if (s.user.role === 'viewer')
    throw new ApiError(403, 'Seu perfil permite apenas leitura.');
}
export function requireAdmin(s: Session) {
  if (s.user.role !== 'admin')
    throw new ApiError(403, 'Esta ação exige um administrador.');
}
export async function rateLimit(
  db: Database,
  key: string,
  max: number,
  windowMs: number,
) {
  const time = Date.now();
  await run(
    db,
    `INSERT INTO rate_limits (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END`,
    key,
    time + windowMs,
    time,
    time,
  );
  const row = await one<{ count: number }>(
    db,
    'SELECT count FROM rate_limits WHERE key=?',
    key,
  );
  if ((row?.count ?? 0) > max)
    throw new ApiError(
      429,
      'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    );
}
export function checkOrigin(req: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    throw new ApiError(403, 'Origem da requisição não autorizada.');
  if (req.headers.get('content-type')?.split(';')[0] !== 'application/json')
    throw new ApiError(415, 'Envie o conteúdo em JSON.');
}
