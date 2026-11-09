import pg from "pg";
import { readFile, readdir } from "node:fs/promises";
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 12,
});
export type DB = Pick<pg.PoolClient, "query">;
export async function transaction<T>(
  fn: (db: pg.PoolClient) => Promise<T>,
  isolation: "READ COMMITTED" | "REPEATABLE READ" = "READ COMMITTED",
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN ISOLATION LEVEL "+isolation);
    await c.query("SELECT pg_advisory_xact_lock_shared(481920)");
    const v = await fn(c);
    await c.query("COMMIT");
    return v;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function migrate() {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS migrations(name text PRIMARY KEY)",
  );
  if ((await pool.query("SELECT 1 FROM migrations WHERE name='001_initial.sql'")).rowCount &&
      !(await pool.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='operators' AND column_name='age_confirmed_at'")).rowCount)
    throw Error('Fresh NullTopic schema required. Existing databases are not altered automatically; use an explicitly authorized rebuild.');
  for (const name of (
    await readdir(new URL("../migrations/", import.meta.url))
  ).sort()) {
    await transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(481914)");
      if (
        !(await c.query("SELECT 1 FROM migrations WHERE name=$1", [name]))
          .rowCount
      ) {
        await c.query(
          await readFile(
            new URL("../migrations/" + name, import.meta.url),
            "utf8",
          ),
        );
        await c.query("INSERT INTO migrations VALUES($1)", [name]);
      }
    });
  }
}
export async function event(db: DB, kind: string, id: string) {
  await db.query("SELECT pg_advisory_xact_lock(481916)");
  await db.query("INSERT INTO events(kind,conversation_id) VALUES($1,$2)", [
    kind,
    id,
  ]);
  await db.query("SELECT pg_notify('nulltopic_changes','changed')");
}
export class Fault extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public retryAt?: string,
  ) {
    super(message);
  }
}
export const fail = (status: number, code: string, message: string): never => {
  throw new Fault(status, code, message);
};
export async function limit(
  db: DB,
  identity: string,
  action: string,
  max: number,
  seconds: number,
  now = new Date(),
) {
  const configured = Number(
    process.env["LIMIT_" + action.toUpperCase()] || max,
  );
  const start = Math.floor(now.getTime() / (seconds * 1000)) * seconds * 1000;
  const expires = new Date(start + seconds * 1000);
  const bucket = `${action}:${identity}:${start}`;
  const r = await db.query(
    "INSERT INTO limits VALUES($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET count=limits.count+1 WHERE limits.count<$3 RETURNING count",
    [bucket, expires, configured],
  );
  if (!r.rowCount)
    throw new Fault(
      429,
      "RATE_LIMIT",
      "Rate limit reached",
      expires.toISOString(),
    );
}
export async function cleanup(dryRun = false, reference = new Date()) {
  const c = await pool.connect();
  let count = 0;
  try {
    const lock = await c.query("SELECT pg_try_advisory_lock(481915) AS locked");
    if (!lock.rows[0].locked) return { locked: true, count: 0, dryRun };
    const cutoff = new Date(reference.getTime() - 30 * 86400000);
    if (dryRun) {
      count = Number(
        (
          await c.query(
            "SELECT count(*) FROM conversations WHERE last_activity_at <= $1",
            [cutoff],
          )
        ).rows[0].count,
      );
      return { count, dryRun, reference };
    }
    for (;;) {
      await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock_shared(481920)");
      try {
        const rows = (
          await c.query(
            "SELECT id FROM conversations WHERE last_activity_at <= $1 ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED",
            [cutoff],
          )
        ).rows;
        if (!rows.length) {
          await c.query("COMMIT");
          break;
        }
        for (const { id } of rows) {
          await c.query(
            "DELETE FROM conversations WHERE id=$1 AND last_activity_at <= $2",
            [id, cutoff],
          );
          await event(c, "removed", id);
          count++;
        }
        await c.query("COMMIT");
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      }
    }
    await c.query('DELETE FROM operator_email_tokens WHERE expires_at <= $1',[reference]);
    await c.query(
      "DELETE FROM agents WHERE status='pending' AND confirmation_expires < $1",
      [reference],
    );
    await c.query("DELETE FROM limits WHERE expires_at<$1", [reference]);
    await c.query("DELETE FROM sessions WHERE expires_at<$1", [reference]);
    await c.query(
      "DELETE FROM events WHERE created_at < $1::timestamptz-interval '7 days'",
      [reference],
    );
    return { count, dryRun, reference };
  } finally {
    await c.query("SELECT pg_advisory_unlock(481915)");
    c.release();
  }
}
