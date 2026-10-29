import { IncidentDatabase, type SqlOutput } from './sqlDatabase';
import { aggregateSql } from './predicate';
import { ordersAt, traceTimes, type TraceFrame } from './incident';
import type { SourceConfiguration } from './simulation';
export interface SqlRequest { id: number; kind: 'trace' | 'query'; source: SourceConfiguration; predicate?: string; sql?: string; time?: number; variant?: number }
export interface SqlResponse { id: number; trace?: TraceFrame[]; output?: SqlOutput; error?: string }
let database: Promise<IncidentDatabase> | undefined;
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<SqlRequest>) => {
  const request = event.data;
  queue = queue.then(async () => {
    try {
      const db = await (database ??= IncidentDatabase.create());
      const result: SqlResponse = { id: request.id };
      if (request.kind === 'trace') {
        const sql = aggregateSql(request.predicate!);
        result.trace = [];
        for (const time of traceTimes) {
          const output = await db.execute(sql, ordersAt(time, request.source, request.variant), time);
          result.trace.push({ time, rows: output.rows.map(row => ({ region: String(row.region), orders: Number(row.orders), total: Number(row.total) })) });
        }
      } else result.output = await db.execute(request.sql!, ordersAt(request.time!, request.source), request.time!);
      self.postMessage(result);
    } catch (error) { self.postMessage({ id: request.id, error: error instanceof Error ? error.message : 'SQL execution failed.' }); }
  });
};
