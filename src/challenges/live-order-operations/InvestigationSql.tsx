import { useId } from 'react';
import { ChallengeHelp } from './ChallengeHelp';
import { Play, Upload } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Scope, WorkspacePair } from './InvestigationWorkspace';
import { EvidenceCard, TotalsTable } from './ChallengeEvidence';
import { initialPredicate, rowsAt, traceTimes, type TraceFrame } from './incident';
import { formatTime } from './simulation';
import type { ChallengeRun, RunAction } from './run';
import type { SqlOutput } from './sqlDatabase';

export interface QueryPreview { key: string; output: SqlOutput; inherited?: SqlOutput }
export const previewKey = (run: ChallengeRun, mode: 'repair' | 'diagnostic') => JSON.stringify([run.id, run.config.source, run.frame, mode, mode === 'repair' ? run.draft : run.diagnostic]);
const cell = (value: unknown) => value === null ? 'NULL' : value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
const typeNames: Record<number, string> = { 16: 'boolean', 20: 'bigint', 21: 'smallint', 23: 'integer', 25: 'text', 700: 'real', 701: 'double precision', 1700: 'numeric', 1184: 'timestamp with time zone', 1114: 'timestamp', 1082: 'date' };
const typeName = (id: number) => typeNames[id] ?? 'SQL value';
export function SqlResult({ output }: { output: SqlOutput }) {
  return <><Table caption="Executed SQL result"><thead><tr>{output.fields.map((field, column) => <th scope="col" key={column}>{field.name}</th>)}</tr></thead><tbody>{output.rows.map((row, index) => <tr key={index}>{output.fields.map((field, column) => <td key={column}>{cell(output.values ? output.values[index]?.[column] : row[field.name])}</td>)}</tr>)}{!output.rows.length && <tr><td colSpan={Math.max(1, output.fields.length)}>No result rows</td></tr>}</tbody></Table><p className="incident-caption">{output.rows.length} {output.rows.length === 1 ? 'row' : 'rows'}{output.truncated ? ' shown · display limited to 200 rows' : ''} · columns: {output.fields.map(field => `${field.name} (${typeName(field.dataTypeID)})`).join(', ')}</p></>;
}
export function InvestigationSql({ run, trace, dispatch, mode, setMode, preview, busy, error, onRun, onDeploy }: {
  run: ChallengeRun; trace: readonly TraceFrame[] | null; dispatch: (action: RunAction) => void;
  mode: 'repair' | 'diagnostic'; setMode: (mode: 'repair' | 'diagnostic') => void; preview: QueryPreview | null;
  busy: boolean; error: string; onRun: () => void; onDeploy: () => void;
}) {
  const fieldId = useId();
  const validPreview = preview?.key === previewKey(run, mode) ? preview : null;
  const time = run.frame === null ? null : traceTimes[run.frame]!;
  return <>
    <div className="incident-actions" role="group" aria-label="SQL workspace mode"><Button aria-pressed={mode === 'repair'} onClick={() => setMode('repair')}>Repair deployed query</Button><Button aria-pressed={mode === 'diagnostic'} onClick={() => setMode('diagnostic')}>Diagnostic SELECT</Button></div>
    <WorkspacePair controls={
      <EvidenceCard title={mode === 'repair' ? 'Regional query draft' : 'Read-only diagnostic console'} help={mode === 'repair' ? 'draft' : 'diagnostic'}>
        <Scope>{mode === 'repair' ? run.draft === run.config.predicate ? 'Draft matches applied query' : 'Not applied · query draft' : 'View only · read-only SELECT'}</Scope>
        <div className="incident-label"><div className="incident-info-heading"><label htmlFor={`${fieldId}-historicalSnapshot`}>Scenario replay snapshot</label><ChallengeHelp topic="historicalSnapshot" /></div><select id={`${fieldId}-historicalSnapshot`} value={run.frame ?? ''} onChange={e => dispatch({ type: 'frame', frame: Number(e.target.value) })}><option value="" disabled>Select a snapshot to investigate</option>{traceTimes.map((time, index) => <option key={time} value={index}>{formatTime(time)}</option>)}</select></div>
        <p className="incident-caption">View only · includes scenario records through the selected time, including future test cases. The live incident clock stays unchanged.</p>
        {mode === 'repair' && <pre className="incident-code">{'SELECT c.region, COUNT(*) AS orders, SUM(o.amount) AS total\nFROM orders AS o JOIN customers AS c\n  ON o.customer_id = c.customer_id\nWHERE'}</pre>}
        <label className="incident-label" htmlFor="incident-sql">{mode === 'repair' ? 'Temporal WHERE predicate' : 'Diagnostic SQL'}</label>
        <textarea id="incident-sql" className="incident-editor" spellCheck={false} autoCapitalize="off" autoCorrect="off" rows={mode === 'repair' ? 4 : 7} value={mode === 'repair' ? run.draft : run.diagnostic} maxLength={mode === 'repair' ? 4000 : 12000} onChange={e => dispatch({ type: mode === 'repair' ? 'draft' : 'diagnostic', value: e.target.value })} onKeyDown={event => {
          if (event.ctrlKey && event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (!busy && time !== null && !event.repeat) onRun();
          }
        }} aria-describedby="incident-sql-help" />
        {mode === 'repair' && <pre className="incident-code">GROUP BY c.region;</pre>}
        <p id="incident-sql-help" className="incident-caption">{mode === 'repair' ? 'Use comparisons, AND, parentheses, and timestamp + INTERVAL. With mz_now(), use =, <, <=, >, or >=. Apply query updates shared results, clears the last read, and resets deliveries.' : 'Run a single read-only SELECT. Tables: orders and customers. The fixture clock is frozen at the selected snapshot.'} Ctrl+Enter runs the editor.</p>
        <div className="incident-actions"><Button variant="primary" data-incident-action="run-sql" aria-keyshortcuts="Control+Enter" disabled={busy || time === null} onClick={onRun}><Play size={14} aria-hidden="true" />Run query preview</Button>{mode === 'repair' && <Button disabled={busy || !validPreview || run.draft === run.config.predicate} onClick={onDeploy}><Upload size={14} aria-hidden="true" />Apply query</Button>}</div>
        {error && <p role="alert" className="incident-notice" data-tone="warning">{error}</p>}
        {mode === 'repair' && <div className="incident-details-with-help"><details className="incident-details"><summary>Inspect deployed and inherited SQL</summary><h3>Deployed predicate · version {run.queryRevision + 1}</h3><pre className="incident-code">{run.config.predicate}</pre><h3>Inherited predicate</h3><pre className="incident-code">{initialPredicate}</pre></details><ChallengeHelp topic="inspectSql" /></div>}
      </EvidenceCard>} >
      <EvidenceCard title="Query observations" help="queryObservations" trailing={<Scope>Read-only · scenario snapshot</Scope>}>
        {validPreview && time !== null ? <><p>{mode === 'repair' ? 'Executed draft at' : 'Diagnostic result at'} <strong>{formatTime(time)}</strong>. The applied system is unchanged by this preview.</p><SqlResult output={validPreview.output} />{validPreview.inherited && <div className="incident-details-with-help"><details className="incident-details"><summary>Compare inherited query at the same snapshot</summary><SqlResult output={validPreview.inherited} /><p className="incident-caption">Inherited predicate with the same applied source settings, at exactly the same logical time.</p></details><ChallengeHelp topic="compareSql" /></div>}</>
          : <p>{time === null ? 'Choose a scenario replay snapshot, then run a query to inspect its rows.' : preview ? 'The editor or replay context changed. Run query preview again to observe this draft.' : 'Run a query to inspect its actual rows. Syntax and execution errors appear beside the editor.'}</p>}
        {trace && time !== null && <><div className="incident-section-heading"><h3 className="incident-subheading">Applied query at the same snapshot · {formatTime(time)}</h3><ChallengeHelp topic="deployedQuery" /></div><TotalsTable rows={rowsAt(trace, time)} caption="Deployed scenario query result" /></>}
      </EvidenceCard>
    </WorkspacePair>
  </>;
}
