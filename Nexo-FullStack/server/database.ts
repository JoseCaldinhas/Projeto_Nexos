/** Small D1-compatible port; Node SQLite implements the same interface in tests. */
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown[]>;
}
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export async function all<T>(
  db: Database,
  sql: string,
  ...args: unknown[]
): Promise<T[]> {
  return (
    await db
      .prepare(sql)
      .bind(...args)
      .all<T>()
  ).results;
}
export async function one<T>(
  db: Database,
  sql: string,
  ...args: unknown[]
): Promise<T | null> {
  return db
    .prepare(sql)
    .bind(...args)
    .first<T>();
}
export const run = (db: Database, sql: string, ...args: unknown[]) =>
  db
    .prepare(sql)
    .bind(...args)
    .run();
