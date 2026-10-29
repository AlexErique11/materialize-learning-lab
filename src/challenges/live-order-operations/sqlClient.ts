import type { SqlRequest, SqlResponse } from './sql.worker';

/** One disposable worker per mounted challenge; no database state is persisted. */
export class SqlClient {
  private worker: Worker | null = null;
  private sequence = 0;
  private pending = new Map<number, { resolve: (value: SqlResponse) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  request(input: Omit<SqlRequest, 'id'>): Promise<SqlResponse> {
    if (!this.worker) {
      this.worker = new Worker(new URL('./sql.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<SqlResponse>) => {
        const pending = this.pending.get(event.data.id);
        if (!pending) return;
        clearTimeout(pending.timer); this.pending.delete(event.data.id);
        if (event.data.error) pending.reject(new Error(event.data.error)); else pending.resolve(event.data);
      };
      this.worker.onerror = event => { event.preventDefault(); this.cancel('The SQL runtime could not start. Retry the SQL engine.'); };
    }
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.cancel('SQL execution timed out. Your saved work is preserved; retry the engine.'), 30000);
      this.pending.set(id, { resolve, reject, timer });
      this.worker!.postMessage({ ...input, id });
    });
  }
  cancel(message = 'SQL execution cancelled.') {
    this.worker?.terminate(); this.worker = null;
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error(message)); }
    this.pending.clear();
  }
}
