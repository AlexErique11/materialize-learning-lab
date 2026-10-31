import { PGlite } from '@electric-sql/pglite';
import type { Order } from './simulation';

export interface SqlOutput { rows: Record<string, unknown>[]; values?: unknown[][]; fields: { name: string; dataTypeID: number }[]; truncated: boolean }
const origin = Date.UTC(2026, 0, 1);
export const sqlTimestamp = (offset: number) => new Date(origin + offset).toISOString();

/** Real relational execution; time, ingestion and frontiers belong to the incident model. */
export class IncidentDatabase {
  private constructor(private db: PGlite) {}
  static async create() {
    const db = await PGlite.create();
    await db.exec(`
      CREATE TABLE orders (order_id integer, customer_id integer, status text, amount integer, event_at timestamptz, arrived_at timestamptz);
      CREATE TABLE customers (customer_id integer PRIMARY KEY, region text);
      INSERT INTO customers VALUES (1, 'EU'), (2, 'US');
      CREATE TABLE lab_clock (at timestamptz);
      CREATE FUNCTION mz_now() RETURNS timestamptz LANGUAGE SQL STABLE AS 'SELECT at FROM public.lab_clock';
      CREATE ROLE incident_reader;
      GRANT USAGE ON SCHEMA public TO incident_reader;
      GRANT SELECT ON orders, customers, lab_clock TO incident_reader;
      GRANT EXECUTE ON FUNCTION mz_now() TO incident_reader;
    `);
    return new IncidentDatabase(db);
  }
  async execute(sql: string, rows: readonly Order[], time: number): Promise<SqlOutput> {
    if (!sql.trim() || sql.length > 12000) throw new Error('Enter a query of at most 12,000 characters.');
    await this.db.exec('TRUNCATE orders, lab_clock');
    await this.db.query('INSERT INTO lab_clock VALUES ($1)', [sqlTimestamp(time)]);
    for (const row of rows) await this.db.query('INSERT INTO orders VALUES ($1,$2,$3,$4,$5,$6)', [row.orderId, row.customerId, row.status, row.amount, sqlTimestamp(row.eventAt), sqlTimestamp(row.arrivedAt)]);
    await this.db.exec("BEGIN READ ONLY; SET LOCAL ROLE incident_reader; SET LOCAL statement_timeout = '3000ms'");
    try {
      // Extended query protocol accepts one statement. Rollback also isolates SET/config functions.
      await this.db.query(`EXPLAIN (FORMAT JSON) ${sql}`);
      // A cursor bounds transfer/materialization even for an unbounded diagnostic SELECT.
      await this.db.query(`DECLARE incident_result NO SCROLL CURSOR FOR ${sql}`);
      const result = await this.db.query<unknown[]>('FETCH FORWARD 201 FROM incident_result', [], { rowMode: 'array' });
      const values = result.rows.slice(0, 200);
      return { values, rows: values.map(row => Object.fromEntries(result.fields.map((field, index) => [field.name, row[index]]))), fields: result.fields, truncated: result.rows.length > 200 };
    } finally { await this.db.exec('ROLLBACK'); }
  }
  close() { return this.db.close(); }
}
