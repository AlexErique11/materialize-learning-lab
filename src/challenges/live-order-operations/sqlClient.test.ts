import { afterEach, describe, expect, it, vi } from 'vitest';
import { SqlClient } from './sqlClient';
class WorkerProbe {
  static instances: WorkerProbe[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: { id: number }[] = [];
  terminated = false;
  constructor() { WorkerProbe.instances.push(this); }
  postMessage(message: { id: number }) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  reply(id: number) { this.onmessage?.({ data: { id, output: { rows: [], fields: [], truncated: false } } } as MessageEvent); }
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); WorkerProbe.instances = []; });
const query = { kind: 'query' as const, sql: 'SELECT 1', time: 630000, source: { envelope: 'UPSERT', key: 'order_id' } };
describe('SQL worker lifecycle', () => {
  it('cancels outstanding work, rejects its promise and recreates the worker without accepting an obsolete reply', async () => {
    vi.stubGlobal('Worker', WorkerProbe);
    const client = new SqlClient();
    const first = client.request(query); const rejected = expect(first).rejects.toThrow('cancelled');
    const old = WorkerProbe.instances[0]!; const oldId = old.messages[0]!.id;
    client.cancel(); await rejected; expect(old.terminated).toBe(true);
    const second = client.request(query); const fresh = WorkerProbe.instances[1]!;
    let resolved = false; void second.then(() => { resolved = true; });
    old.reply(oldId); await Promise.resolve(); expect(resolved).toBe(false);
    fresh.reply(fresh.messages[0]!.id); await expect(second).resolves.toMatchObject({ output: { rows: [] } });
    client.cancel();
  });
  it('terminates a nonresponsive worker at its external deadline and permits retry', async () => {
    vi.useFakeTimers(); vi.stubGlobal('Worker', WorkerProbe);
    const client = new SqlClient(); const waiting = client.request(query);
    const rejected = expect(waiting).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(30000); await rejected;
    expect(WorkerProbe.instances[0]!.terminated).toBe(true);
    const retry = client.request(query); const worker = WorkerProbe.instances[1]!;
    worker.reply(worker.messages[0]!.id); await expect(retry).resolves.toBeDefined(); client.cancel();
  });
});
