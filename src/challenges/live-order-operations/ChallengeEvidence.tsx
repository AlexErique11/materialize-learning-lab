import { useId, type ReactNode } from 'react';
import { Database } from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
import { PanelHeader } from '../../components/ui/PanelHeader';
import { Table } from '../../components/ui/Table';
import type { ResultRow } from '../../chapters/live-applications-subscribe/simulation';
import type { Order } from './simulation';
export function EvidenceCard({ title, children, trailing, icon = <Database size={17} aria-hidden="true" /> }: { title: string; children: ReactNode; trailing?: ReactNode; icon?: ReactNode }) {
  const id = useId();
  return <Panel className="relation-panel incident-card" aria-labelledby={id}><PanelHeader title={title} titleId={id} icon={icon} trailing={trailing} /><div className="incident-card-body">{children}</div></Panel>;
}
export function TotalsTable({ rows, caption = 'Regional order totals' }: { rows: readonly ResultRow[]; caption?: string }) {
  return <Table caption={caption}><thead><tr><th scope="col">Region</th><th scope="col">Orders</th><th scope="col">Total</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index}><th scope="row">{row.region}</th><td>{row.orders}</td><td>{row.total}</td></tr>)}{!rows.length && <tr><td colSpan={3}>No result rows</td></tr>}</tbody></Table>;
}
export function OrdersTable({ rows, caption = 'Current source rows' }: { rows: readonly Order[]; caption?: string }) {
  return <Table caption={caption}><thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Status</th><th scope="col">Amount</th><th scope="col">Event time</th><th scope="col">Arrival</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index}><th scope="row">{row.orderId}</th><td>{row.customerId}</td><td>{row.status}</td><td>{row.amount}</td><td>{(row.eventAt / 1000).toFixed(3)} s</td><td>{(row.arrivedAt / 1000).toFixed(3)} s</td></tr>)}</tbody></Table>;
}
