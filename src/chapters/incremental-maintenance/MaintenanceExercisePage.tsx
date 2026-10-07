import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Filter, GitMerge, Sigma } from 'lucide-react';
import type { ChapterDefinition } from '../chapterRegistry';
import { chapterPath, chapters } from '../chapterRegistry';
import { ExerciseAnswers } from './ExerciseAnswers';
import { ExerciseFrame } from '../../components/lab/ExerciseFrame';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useExerciseStages } from '../changing-relations/useExerciseStages';
import { MaintenancePanels } from './MaintenancePanels';
import { JoinTable, ComparisonPanel } from './MaintenanceTables';
import { joinStages, joinReference } from './join-scenario';
import { comparisonStages, comparisonReference } from './comparison-scenario';
import { gradePrediction, maintenanceExercises, resultDiffs, resultFor, solutionFor, type Prediction } from './exercise-scenarios';
import { consolidate } from './simulation';
import './exercises.css';

const emptyAnswer = (): Prediction => ({ selections: [] });
const joinFilterStages = joinStages.map(stage => ({ ...stage, showChanges: false, ...(stage.id === 'result' ? { title: 'Qualifying result', sql: 'WHERE o.amount >= 50', description: 'A result row needs a matching product and amount >= 50. SELECT keeps order_id, name and amount.' } : {}) }));
const revenueStages = comparisonStages.map(stage => ({ ...stage,
 ...(stage.id === 'orders' ? { title: 'Shared orders and customers', shortTitle: 'Input', description: 'Orders retain customer_id and amount. Each chip shows the matching customer and current region. Both methods use the same input tables.' } : {}),
 ...(stage.id === 'incremental' ? { description: 'Retain joined matches and count/revenue by region. Update the groups affected by the complete batch.' } : {}),
}));

export function MaintenanceExercisePage({ chapter, navigation, exerciseIndex }: { chapter: ChapterDefinition; navigation: ReactNode; exerciseIndex: number }) {
 const navigate = useNavigate();
 const exercise = maintenanceExercises[exerciseIndex]!;
 const nextExercise = maintenanceExercises[exerciseIndex + 1];
 const nextChapter = chapters[chapters.findIndex(item => item.slug === chapter.slug) + 1];
 const nextDestination = nextExercise
  ? { label: `Exercise ${exerciseIndex + 2}`, to: `/labs/${chapter.slug}/exercises/${nextExercise.slug}` }
  : nextChapter ? { label: 'Finish chapter', to: chapterPath(nextChapter) } : undefined;
 const [completionOpen, setCompletionOpen] = useState(false);
 const flow = useExerciseStages(exercise.checkpoints.length);
 const [answers, setAnswers] = useState<Record<number, Prediction>>({});
 const answer = answers[flow.stage] ?? emptyAnswer();
 const setAnswer = (prediction: Prediction) => setAnswers(previous => ({ ...previous, [flow.stage]: prediction }));
 const [activeStage, setActiveStage] = useState('orders');
 const [mobileDiffs, setMobileDiffs] = useState(false);
 const checkpoint = exercise.checkpoints[flow.stage]!;
 const before = flow.stage === 0 ? exercise.initial : exercise.checkpoints[flow.stage - 1]!.next;
 const current = flow.accepted ? checkpoint.next : before;
 const time = flow.stage + Number(flow.accepted);
 const diffs = flow.accepted ? resultDiffs(exercise.kind, before, current) : [];
 const edit = (update: (previous: Prediction) => Prediction) => { setAnswers(previous => ({ ...previous, [flow.stage]: update(previous[flow.stage] ?? emptyAnswer()) })); flow.dispatch({ type: 'edit' }); };
 const selectedStages = exercise.kind === 'region' ? revenueStages : joinFilterStages;
 const reference = exercise.kind === 'region' ? comparisonReference : joinReference;
 const output = resultFor(exercise.kind, current);
 const renderRows = (stage: string) => {
  if (exercise.kind === 'join-filter') {
   const stageDefinition = joinFilterStages.find(item => item.id === stage)!;
   const changedProduct = flow.accepted ? diffRows(before.products, current.products)[0]?.row.productId : undefined;
   const rows = stage === 'orders' ? current.orders : stage === 'products' ? current.products : output as { orderId: number; name: string; amount: number }[];
   return <JoinTable rows={rows} stage={stageDefinition} showNote={stage === 'orders'} affectedProductId={changedProduct} affectedOrderIds={diffs.flatMap(entry => 'orderId' in entry.row ? [entry.row.orderId] : [])} />;
  }
  const results = output as { region: string; count: number; total: number }[];
  const affectedKeys = [...new Set(diffs.flatMap(entry => 'region' in entry.row ? [entry.row.region] : []))];
  const changedOrders = flow.accepted ? current.orders.filter(row => !before.orders.some(old => JSON.stringify(row) === JSON.stringify(old)) || before.customers.find(c => c.customerId === row.productId)?.region !== current.customers.find(c => c.customerId === row.productId)?.region).map(row => row.orderId) : [];
  return <ComparisonPanel stage={stage} customers={current.customers} showContributions={false} state={{ orders: current.orders, output: results, recomputed: results,
   previous: flow.accepted ? resultFor('region', before) as typeof results : [], changedOrders,
   changeTitle: flow.accepted ? checkpoint.title : 'Current input: predict the next batch', affectedKeys, contributionCount: 0 }} />;

 };
 return <><ExerciseFrame chapter={chapter} navigation={navigation} title={`Exercise ${exerciseIndex + 1}`} description={`${exercise.title}. ${exercise.description}`}
  preserveQuestion pageClass={`changing-relations-page incremental-maintenance-page join-maintenance-page maintenance-exercise-page ${exercise.kind === 'join-filter' ? 'join-filter-exercise-page' : 'grouped-revenue-exercise-page'}`} reference={{ ...reference, sql: exercise.sql, objective: 'Predict one complete logical timestamp before revealing its effects. Use hints on request. Initial state is t = 0. Work counts are illustrative contributions and group keys, not measured performance.' }}
  nextExerciseLabel={nextDestination?.label}
  flow={flow} progressLabel="Questions" checkpointTitle={checkpoint.title} question={[checkpoint.question]} hint={[checkpoint.hint]}
  visualization={(_questionOpen, setQuestionOpen) => <><div className="exercise-time" aria-live="polite">t = {time} · {flow.accepted ? 'Complete batch applied' : 'Current state · next batch awaits your prediction'}</div>
   <MaintenancePanels stages={selectedStages} layout={exercise.kind === 'region' ? 'comparison' : undefined} activeStage={activeStage} setSelectedStage={stage => { setActiveStage(stage); if (exercise.kind === 'join-filter') setQuestionOpen(false); }}
    mobileDiffs={mobileDiffs} setMobileDiffs={setMobileDiffs} time={time} timeTestId="exercise-time" beforeChange={!flow.accepted} outputChanged={diffs.length > 0} renderRows={renderRows} /></>}
  answers={<ExerciseAnswers key={flow.stage} checkpoint={checkpoint} answer={answer} grade={flow.grade} accepted={flow.accepted} reviewChoices onEdit={edit} />}
  onCheck={() => flow.dispatch({ type: 'check', grade: gradePrediction(exercise, flow.stage, answer) })}
  onShowAnswer={() => { const solution = solutionFor(exercise, flow.stage); setAnswer(solution); flow.dispatch({ type: 'check', grade: gradePrediction(exercise, flow.stage, solution) }); }}
  onNext={() => {
   if (!flow.accepted) return;
   if (flow.stage === flow.total - 1 && nextDestination) {
    if (nextExercise) navigate(nextDestination.to);
    else setCompletionOpen(true);
    return;
   }
   flow.dispatch({ type: 'next' }); setMobileDiffs(false);
  }}
  onReset={() => { flow.dispatch({ type: 'reset' }); setAnswers({}); setMobileDiffs(false); setActiveStage(selectedStages[0]!.id); }} />
  <Dialog open={completionOpen} onClose={() => setCompletionOpen(false)} title={`You finished Chapter ${chapter.number}`} eyebrow="Chapter complete" className="chapter-completion-dialog">
   <div className="chapter-completion-intro">
    <div className="chapter-completion-copy">
     <h3>How one change travels through SQL</h3>
     <p>You explored incremental maintenance: how input changes travel through filters, joins, and grouped aggregates.</p>
    </div>
    <img src={chapter.overviewImage} alt="" aria-hidden="true" className="chapter-completion-art" />
   </div>
   <div className="chapter-completion-topics">
    <section><Filter aria-hidden="true" /><h3>Filters & projections</h3><p>Predict when rows enter or leave a result, and when an unused-column edit leaves it unchanged.</p></section>
    <section><GitMerge aria-hidden="true" /><h3>Joins & retained matches</h3><p>Follow late matches and see how one product edit can change several joined rows.</p></section>
    <section><Sigma aria-hidden="true" /><h3>Grouped counts & revenue</h3><p>Track COUNT and SUM as values change, rows move between groups, or the last row disappears.</p></section>
   </div>
   <div className="chapter-completion-takeaway"><strong>The key idea</strong><p>Incremental maintenance reuses retained state to apply changes. You compared this with rebuilding the full result, and predicted the complete rows inserted or retracted at each timestamp.</p></div>
   {nextChapter && <div className="chapter-completion-next"><div><span className="eyebrow">Up next · Chapter {nextChapter.number}</span><p>{nextChapter.shortTitle}</p></div><Button variant="primary" onClick={() => navigate(chapterPath(nextChapter))}>Go to next chapter<ArrowRight size={16} aria-hidden="true" /></Button></div>}
  </Dialog></>;
}

function diffRows<Row>(before: readonly Row[], after: readonly Row[]) { return consolidate([...before.map(row => ({ row, diff: -1 })), ...after.map(row => ({ row, diff: 1 }))]); }
