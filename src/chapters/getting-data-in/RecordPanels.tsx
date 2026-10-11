import { CircleAlert } from 'lucide-react';
import { DiffBadge } from '../../components/lesson/DiffBadge';
import { EmptyTableRows } from '../../components/ui/EmptyTableRows';
import { Table } from '../../components/ui/Table';
import { ProductTable, ProductTuple, productFields } from './ProductTable';
import type { IncomingRecord, RecordStage } from './record-scenarios';
import type { RecordState } from './record-simulation';
import type { ProductDiff } from './scenario';

function InputRecord({ record, upcoming, highlight, diffs, nameKey }: {
  record: IncomingRecord; upcoming: boolean; highlight: boolean; diffs: readonly ProductDiff[]; nameKey: boolean;
}) {
  if (record.kind === 'debezium') {
    const before = record.before && productFields(record.before);
    const after = record.after && productFields(record.after);
    const fields = productFields((record.after ?? record.before)!);
    return <div className="record-input-frame record-before-after" data-testid="incoming-record" data-upcoming={upcoming}>
      <Table caption="Decoded Debezium record" className="record-version-table">
        <thead><tr><th>Field</th><th>Before{!before && <span className="record-null-label">NULL</span>}</th><th>After{!after && <span className="record-null-label">NULL</span>}</th></tr></thead>
        <tbody>{fields.map((field, index) => <tr key={field.key}>
          <th scope="row" aria-label={field.label}>{field.key === 'productId' ? <><span className="snapshot-id-full">product_id</span><span className="snapshot-id-short">ID</span></> : field.label}</th>
          <td data-column={field.key} data-changed={highlight && before?.[index]?.value !== after?.[index]?.value}>{before?.[index]?.value ?? '—'}</td>
          <td data-column={field.key} data-changed={highlight && before?.[index]?.value !== after?.[index]?.value}>{after?.[index]?.value ?? '—'}</td>
        </tr>)}</tbody>
      </Table>
    </div>;
  }
  const old = record.kind === 'value' && record.value ? diffs.find((entry) => entry.diff === -1 && entry.row.productId === record.value!.productId)?.row : undefined;
  const oldFields = old && productFields(old);
  return <div className="record-input-frame" data-testid="incoming-record" data-upcoming={upcoming}>
    <div className="record-key" data-error={record.key === null}>
      <span>{upcoming ? 'Next record · Key' : 'Key'}</span><strong data-testid="record-key" data-column={nameKey ? 'name' : 'productId'}>{record.key ?? 'NULL'}</strong>
    </div>
    <span className="record-value-label">{record.kind === 'malformed' ? 'Raw value (invalid Avro)' : 'Value'}</span>
    {record.kind === 'value' && record.value ? <Table caption="Incoming value" className="record-value-table">
      <tbody>{productFields(record.value).map((field) => <tr key={field.key}>
        <th scope="row">{field.label}</th><td data-column={field.key}
          data-changed={highlight && (!oldFields || oldFields.find((other) => other.key === field.key)?.value !== field.value)}>{field.value}</td>
      </tr>)}</tbody>
    </Table> : <div className="record-null-value" data-error={record.kind === 'malformed'}>
      <code>{record.kind === 'malformed' ? record.raw : 'NULL'}</code>
      <span>{record.kind === 'malformed' ? 'Cannot decode the non-null value.' : 'Tombstone: null whole value'}</span>
    </div>}
  </div>;
}

function Unavailable({ label, detail }: { label: string; detail: string }) {
  return <div className="record-table-message" role="status" aria-label={label}>
    <CircleAlert size={22} aria-hidden="true" /><strong>{label}</strong><p>{detail}</p>
  </div>;
}

export function RecordPanelContent({ stage, state, record, upcoming, pending, highlight }: {
  stage: RecordStage; state: RecordState; record: IncomingRecord;
  upcoming: boolean; pending: boolean; highlight: boolean;
}) {
  if (stage === 'record') return <>
    <InputRecord record={record} upcoming={upcoming} highlight={highlight} diffs={state.diffs} nameKey={state.fixture.keyLabel === 'Product name'} />
    <section className="record-summary" aria-label="Producer fixture">
      <h3>{state.fixture.label}</h3><p>{state.fixture.keyLabel}</p>
      {state.fixture.initial.length > 0 && <p>Starts with {state.fixture.initial.length} catalog {state.fixture.initial.length === 1 ? 'row' : 'rows'}.</p>}
      {record.kind === 'debezium' && <p>{upcoming ? 'Next record · decoded Avro projection' : 'Decoded Avro projection'}</p>}
    </section>
  </>;
  if (stage === 'changes') {
    const diffs = pending || state.errors.length ? [] : state.diffs;
    return <>
      <div className="record-table-frame">
        <Table caption="Interpreted changes" className="record-diff-table">
          <thead><tr><th>Diff</th><th>Row <span className="record-tuple-schema">(ID, name, price, note)</span></th></tr></thead>
          <tbody>{diffs.map(({ row, diff }, index) => <tr key={index}>
            <td><DiffBadge diff={diff} /></td><td><ProductTuple row={row} opposite={diffs.find((entry) => entry.diff !== diff && entry.row.productId === row.productId)?.row} /></td>
          </tr>)}<EmptyTableRows count={2 - diffs.length} columns={2} /></tbody>
        </Table>
        {state.errors.length > 0 ? <Unavailable label="Input error" detail="Correct the offending input." />
          : diffs.length === 0 && <div className="record-table-message record-table-neutral" role="status" aria-label="Record interpretation">
            <strong>{pending || upcoming ? 'Next record not applied' : 'No net changes'}</strong>
          </div>}
      </div>
      <section className="record-summary" aria-label="Interpretation explanation"><h3>Interpretation</h3>
        <p>{state.errors[0] ?? (pending ? 'Predict the effect before applying this record.' : state.explanation)}</p>
      </section>
    </>;
  }
  return <>
    <div className="record-table-frame">
      <ProductTable rows={state.relation ?? []} caption="Current products" diffs={pending ? [] : state.diffs} highlight={highlight} />
      {state.relation === null && <Unavailable label="Relation unavailable" detail="An input error prevents queries." />}
    </div>
    <section className="record-summary" aria-label="Relation identity">
      <h3>{state.fixture.envelope === 'UPSERT' ? 'Current keys' : 'Retained rows'}</h3>
      <p>{state.relation === null ? 'Queries wait for the input error to be corrected.'
        : state.fixture.envelope === 'UPSERT' ? state.entries.map((entry) => entry.identity).join(', ') || 'No keys retained'
          : state.entries.length + (state.fixture.envelope === 'NONE' ? ' event rows' : ' current products')}</p>
    </section>
  </>;
}
