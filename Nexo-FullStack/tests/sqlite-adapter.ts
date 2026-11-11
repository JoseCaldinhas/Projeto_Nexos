import { DatabaseSync } from 'node:sqlite';
import type { Database, Statement } from '../server/database.ts';
export function createDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  class SqlStatement implements Statement {
    sql: string;
    values: unknown[] = [];
    constructor(sql: string) {
      this.sql = sql;
    }
    bind(...values: unknown[]) {
      this.values = values;
      return this;
    }
    async first<T>() {
      return (
        (sqlite.prepare(this.sql).get(...(this.values as never[])) as T) || null
      );
    }
    async all<T>() {
      return {
        results: sqlite
          .prepare(this.sql)
          .all(...(this.values as never[])) as T[],
      };
    }
    async run() {
      const r = sqlite.prepare(this.sql).run(...(this.values as never[]));
      return { meta: { changes: Number(r.changes) } };
    }
  }
  const db: Database = {
    prepare: (sql) => new SqlStatement(sql),
    batch: async (stmts) => {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const s of stmts) results.push(await s.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { db, sqlite };
}
