import { gradeRepair, acceptanceChecks } from './grading';
import { SCENARIO_VERSION, STAGE_IDS, stageDefinition, type Answers, type StageId } from './scenario';

export interface Assessment { readonly attempts: number; readonly hints: number; readonly workedRepair: boolean }
export interface CommittedRepair { readonly stage: StageId; readonly answers: Answers }
export interface ChallengeRun {
  readonly scenarioVersion: number;
  readonly id: string;
  readonly revision: number;
  readonly phase: 'briefing' | 'active' | 'handover' | 'completed';
  readonly stage: number;
  readonly commits: readonly CommittedRepair[];
  readonly drafts: Readonly<Partial<Record<StageId, Answers>>>;
  readonly assessments: Readonly<Partial<Record<StageId, Assessment>>>;
  readonly activeDurationMs: number;
  readonly exploration: { readonly event: number; readonly readStep: number; readonly deliveries: number; readonly disconnected: boolean };
}
export type RunAction =
  | { readonly type: 'start' | 'apply' | 'hint' | 'worked' | 'test' | 'retry' | 'handover' | 'complete' }
  | { readonly type: 'edit'; readonly field: string; readonly value: string }
  | { readonly type: 'review'; readonly stage: number }
  | { readonly type: 'event'; readonly index: number }
  | { readonly type: 'read-next' | 'delivery-next' | 'delivery-reset' | 'disconnect' }
  | { readonly type: 'time'; readonly milliseconds: number };

export function createRun(id: string): ChallengeRun {
  return { scenarioVersion: SCENARIO_VERSION, id, revision: 0, phase: 'briefing', stage: 0, commits: [], drafts: {}, assessments: {}, activeDurationMs: 0, exploration: { event: 0, readStep: 0, deliveries: 0, disconnected: false } };
}
export const assessmentAt = (run: ChallengeRun, id: StageId): Assessment => run.assessments[id] ?? { attempts: 0, hints: 0, workedRepair: false };
export const assistedRun = (run: ChallengeRun) => Object.values(run.assessments).some(item => item?.workedRepair);
export function updateRun(run: ChallengeRun, action: RunAction): ChallengeRun {
  const id = STAGE_IDS[run.stage]!;
  const assessment = assessmentAt(run, id);
  const revise = (patch: Partial<ChallengeRun>) => ({ ...run, ...patch, revision: run.revision + 1 });
  switch (action.type) {
    case 'start': return run.phase === 'briefing' ? revise({ phase: 'active' }) : run;
    case 'review': return Number.isInteger(action.stage) && action.stage >= 0 && action.stage <= Math.min(run.commits.length, 5) ? revise({ phase: 'active', stage: action.stage }) : run;
    case 'handover': return run.commits.length === 6 ? revise({ phase: 'handover' }) : run;
    case 'complete': return run.phase === 'handover' && acceptanceChecks(run.commits).every(check => check.passed) ? revise({ phase: 'completed' }) : run;
    case 'time': return run.phase === 'active' && Number.isFinite(action.milliseconds) && action.milliseconds > 0 && action.milliseconds <= 60000 ? revise({ activeDurationMs: run.activeDurationMs + action.milliseconds }) : run;
  }
  if (run.phase !== 'active') return run;
  const drafts = run.drafts[id] ?? {};
  const resetCommits = () => run.commits.slice(0, run.stage);
  const resetDownstream = () => ({ ...run.exploration,
    ...(run.stage <= 4 ? { readStep: 0 } : {}),
    deliveries: 0, disconnected: false,
  });
  switch (action.type) {
    case 'event': return Number.isInteger(action.index) && action.index >= 0 && action.index <= 7 ? revise({ exploration: { ...run.exploration, event: action.index } }) : run;
    case 'read-next': return id === 'reads' ? revise({ exploration: { ...run.exploration, readStep: Math.min(3, run.exploration.readStep + 1) } }) : run;
    case 'delivery-next': return id === 'client' && !run.exploration.disconnected ? revise({ exploration: { ...run.exploration, deliveries: Math.min(8, run.exploration.deliveries + 1) } }) : run;
    case 'delivery-reset': return revise({ exploration: { ...run.exploration, deliveries: 0, disconnected: false } });
    case 'disconnect': return id === 'client' ? revise({ exploration: { ...run.exploration, disconnected: true } }) : run;
    case 'edit': {
      const field = stageDefinition(id).fields.find(field => field.id === action.field);
      if (!field || action.value.length > 64 || (field.options && action.value !== '' && !field.options.some(([value]) => value === action.value))) return run;
      return revise({ commits: resetCommits(), drafts: { ...run.drafts, [id]: { ...drafts, [action.field]: action.value } }, ...(run.commits.length > run.stage ? { exploration: resetDownstream() } : {}) });
    }
    case 'retry': return revise({ commits: resetCommits(), drafts: { ...run.drafts, [id]: {} }, exploration: resetDownstream() });
    case 'hint': return revise({ assessments: { ...run.assessments, [id]: { ...assessment, hints: Math.min(2, assessment.hints + 1) } } });
    case 'test': return revise({ assessments: { ...run.assessments, [id]: { ...assessment, attempts: assessment.attempts + 1 } } });
    case 'worked': return revise({ commits: resetCommits(), drafts: { ...run.drafts, [id]: stageDefinition(id).solution }, assessments: { ...run.assessments, [id]: { ...assessment, workedRepair: true } }, ...(run.commits.length > run.stage ? { exploration: resetDownstream() } : {}) });
    case 'apply': {
      if (run.commits.length > run.stage) return revise({ stage: Math.min(5, run.stage + 1), phase: run.stage === 5 ? 'handover' : 'active' });
      if (run.commits.length !== run.stage || !gradeRepair(id, drafts).correct) return run;
      if ((id === 'reads' && run.exploration.readStep < 3) || (id === 'client' && (run.exploration.deliveries < 8 || run.exploration.disconnected))) return run;
      return revise({ commits: [...run.commits, { stage: id, answers: { ...drafts } }], stage: Math.min(5, run.stage + 1), phase: run.stage === 5 ? 'handover' : 'active' });
    }
  }
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const boundedInteger = (value: unknown, max: number): value is number => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= max;
function validAnswers(value: unknown, id: StageId): value is Answers {
  if (!object(value)) return false;
  return Object.entries(value).every(([key, answer]) => {
    const field = stageDefinition(id).fields.find(item => item.id === key);
    return field && typeof answer === 'string' && answer.length <= 64 && (!field.options || answer === '' || field.options.some(([option]) => option === answer));
  });
}
export function parseRun(value: unknown): ChallengeRun | null {
  if (!object(value) || value.scenarioVersion !== SCENARIO_VERSION || typeof value.id !== 'string' || value.id.length === 0 || value.id.length > 100
    || !boundedInteger(value.revision, 10000000) || !['briefing', 'active', 'handover', 'completed'].includes(String(value.phase)) || !boundedInteger(value.stage, 5)
    || !Array.isArray(value.commits) || value.commits.length > 6 || !object(value.drafts) || !object(value.assessments) || !boundedInteger(value.activeDurationMs, 31536000000)
    || !object(value.exploration) || !boundedInteger(value.exploration.event, 7) || !boundedInteger(value.exploration.readStep, 3) || !boundedInteger(value.exploration.deliveries, 8) || typeof value.exploration.disconnected !== 'boolean') return null;
  if (!value.commits.every((commit: unknown, index: number) => object(commit) && commit.stage === STAGE_IDS[index] && validAnswers(commit.answers, STAGE_IDS[index]!) && gradeRepair(STAGE_IDS[index]!, commit.answers).correct)) return null;
  if (!Object.entries(value.drafts).every(([id, answers]) => STAGE_IDS.includes(id as StageId) && validAnswers(answers, id as StageId))) return null;
  if (!Object.entries(value.assessments).every(([id, assessment]) => STAGE_IDS.includes(id as StageId) && object(assessment) && boundedInteger(assessment.attempts, 1000000) && boundedInteger(assessment.hints, 2) && typeof assessment.workedRepair === 'boolean')) return null;
  if (value.stage > value.commits.length || (['handover', 'completed'].includes(String(value.phase)) && value.commits.length !== 6) || (value.phase === 'briefing' && (value.commits.length > 0 || value.stage !== 0))) return null;
  const run = value as unknown as ChallengeRun;
  if (run.commits.some(commit => !validAnswers(run.drafts[commit.stage], commit.stage) || JSON.stringify(Object.entries(run.drafts[commit.stage]!).sort()) !== JSON.stringify(Object.entries(commit.answers).sort()))) return null;
  return run;
}
