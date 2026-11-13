import type { WalkthroughStep } from '../../components/walkthrough/walkthroughContent';
import { challenge } from '../challengeRegistry';
import type { Workspace } from './incident';

export const challengeTourSections = [
  { id: 'overview', label: 'Overview & controls' },
  { id: 'Dashboard', label: 'Dashboard' },
  { id: 'Data', label: 'Data' },
  { id: 'SQL', label: 'SQL' },
  { id: 'System', label: 'System' },
  { id: 'Client', label: 'Client' },
  { id: 'handover', label: 'Help & handover' },
] as const;

export interface ChallengeWalkthroughStep extends WalkthroughStep {
  id: string;
  section: typeof challengeTourSections[number]['id'];
  surface: 'overview' | 'workspace' | 'handover';
  workspace?: Workspace;
}

type StepContent = Omit<ChallengeWalkthroughStep, 'path' | 'target'>;
function step(content: StepContent): ChallengeWalkthroughStep {
  return { ...content, path: challenge.path, target: `challenge-${content.id}`, page: content.surface === 'workspace' ? content.workspace : content.surface,
    navigationTarget: content.surface === 'workspace' ? `challenge-${content.workspace?.toLowerCase()}-page` : `challenge-${content.surface}-link`,
    navigationFallbackTarget: 'challenge-start' };
}

function workspaceIntroduction(workspace: Workspace, description: string) {
  return step({ id: `${workspace.toLowerCase()}-page`, section: workspace, surface: 'workspace', workspace, title: workspace, description });
}

export const challengeTourWelcome = {
  title: 'How the challenge works',
  description: "Learn how to investigate Save the Flash Sale. We'll visit each workspace and explain what its controls and results mean. Your investigation stays as it is while you look around. You can leave at any time and investigate in any order.",
};

export const challengeTourFinish = {
  title: "You're ready to investigate",
  description: 'Choose any workspace, compare what you observe with the operating contract, and test your ideas. When you are ready, Review handover checks the applied system. You can reopen this walkthrough at any time.',
};

export const challengeTourSteps: readonly ChallengeWalkthroughStep[] = [
  step({ id: 'contract', section: 'overview', surface: 'overview', title: 'Start with the operating contract',
    description: 'You have inherited a flash-sale dashboard that operations cannot yet trust. The contract defines what the finished system must do; your job is to investigate, make reversible changes, and verify its behavior.',
    detail: 'Check paid-order counts and totals by region, the five-minute event-time window, replacement corrections, normal snapshots at most three seconds old, complete application results, and shared serving within eight illustrative units.' }),
  step({ id: 'environment', section: 'overview', surface: 'overview', title: 'Work locally and return whenever you need',
    description: 'SQL runs locally in PostgreSQL through PGlite. Streaming, connections, progress, clusters, and deliveries use the lab simulation; no credentials are needed. Start investigation begins an attempt, and Continue resumes it.',
    detail: 'Drafts and applied changes save automatically in this browser when storage is available. An unavailable-storage notice means progress lasts only for this session. The interface walkthrough gives no completion credit and does not count as a worked repair.' }),
  workspaceIntroduction('Dashboard', 'Use Dashboard to compare regional totals in the database with what application users see. Check snapshot age and serving availability before deciding whether you can trust a result.'),
  step({ id: 'workspaces', section: 'Dashboard', surface: 'workspace', workspace: 'Dashboard', title: 'Explore one system through five workspaces',
    description: 'Dashboard compares results, Data shows inputs, SQL tests the query, System explains progress and serving, and Client shows application deliveries. These are views of the same system. After this tour, investigate in any order.' }),
  step({ id: 'shared', section: 'Dashboard', surface: 'workspace', workspace: 'Dashboard', title: 'Read the shared applied state',
    description: 'Shared system shows incident time, applied query version, customer connection, processing status, and client delivery position. Show details expands these values on smaller screens. Draft settings appear here only after you apply them.' }),
  step({ id: 'advance', section: 'Dashboard', surface: 'workspace', workspace: 'Dashboard', title: 'Move the incident clock deliberately',
    description: 'Advance incident moves time forward to the named next event. It does not process pending work or apply a repair. Reading, editing, and changing workspaces leave the clock alone.',
    detail: 'View only changes what you inspect. Not applied means a saved draft. Changes shared system means an applied intervention; read requests and received deliveries have their own labeled effects. Time moves forward only, and there is no automatic playback.',
    unavailable: 'There are no more named incident events to advance to.' }),
  step({ id: 'compare', section: 'Dashboard', surface: 'workspace', workspace: 'Dashboard', title: 'Compare the database and the application',
    description: 'Show results displays the database, application, or both. Explore the incident links open other workspaces. These are view and navigation controls; neither applies a change.' }),
  step({ id: 'dashboard', section: 'Dashboard', surface: 'workspace', workspace: 'Dashboard', title: 'Separate freshness from serving speed',
    description: 'Region, Orders, and Total come from the deployed query at the last complete database snapshot. Snapshot time says which result you see; Age says how far it trails incident time. Serving duration is illustrative query speed, so a quick response can still contain old data.',
    detail: 'A serving-unavailable notice means computed observations cannot currently be served through the configured path. Logical freshness does not prove that external changes which have not been sent have arrived.' }),
  step({ id: 'application', section: 'Dashboard', surface: 'workspace', workspace: 'Dashboard', title: 'See what application users actually see',
    description: 'This table contains published client results. Delivery position and publication policy can make it differ from the database. An empty client waiting for a starting snapshot does not establish that there are no business orders; inspect deliveries in Client.' }),
  workspaceIntroduction('Data', 'Use Data to inspect current orders, retained producer messages, and customer regions. Compare the incoming history with stored rows, then test how source settings interpret those messages.'),
  step({ id: 'inspect-data', section: 'Data', surface: 'workspace', workspace: 'Data', title: 'Choose which input evidence to inspect',
    description: 'Current orders reflects the applied source interpretation; Retained producer messages preserves incoming history; Customers maps customer IDs to regions. Filter by order ID narrows orders and message history. It is unavailable for Customers and never changes records.' }),
  step({ id: 'input-columns', section: 'Data', surface: 'workspace', workspace: 'Data', title: 'Read the input rows and their two times',
    description: 'Order identifies the order, Customer links it to a region, and Status and Amount describe its value. Event time is when the business event happened; Arrival is when it entered the lab. These inputs are separate from regional aggregates and complete serving snapshots.',
    detail: 'All displayed times are seconds from the same UTC origin, 1 January 2026. Retained history can include multiple messages for the same order. A delayed message can arrive after its event time.' }),
  step({ id: 'source', section: 'Data', surface: 'workspace', workspace: 'Data', title: 'Distinguish source drafts from applied settings',
    description: 'Order envelope chooses whether messages append independently or replace the latest full keyed value. Order identity chooses which key defines a replacement. Changes stay as saved drafts until Apply changes; Discard edits restores the applied source values.',
    detail: 'Applying rebuilds current orders from retained messages, affects query and dashboard results, clears the last read, and resets client deliveries. Producer history itself stays intact. Choose settings from the evidence you inspect.' }),
  workspaceIntroduction('SQL', 'Use SQL to inspect data with read-only queries, test a temporal filter against scenario snapshots, and deploy a previewed repair. Running a preview never changes the live query.'),
  step({ id: 'sql-modes', section: 'SQL', surface: 'workspace', workspace: 'SQL', title: 'Choose repair or read-only diagnosis',
    description: 'Repair deployed query edits the temporal WHERE predicate within the supplied regional query. Diagnostic SELECT runs one read-only query against orders and customers. Diagnostics help you test ideas but cannot be deployed as the repair.' }),
  step({ id: 'sql-snapshot', section: 'SQL', surface: 'workspace', workspace: 'SQL', title: 'Choose a separate SQL scenario snapshot',
    description: 'Select a snapshot before executing SQL. It supplies scenario data and a frozen logical clock, including future test cases. Changing it does not advance or rewind the live incident and does not establish live freshness.' }),
  step({ id: 'sql-editor', section: 'SQL', surface: 'workspace', workspace: 'SQL', title: 'Edit the temporal filter',
    description: 'The supplied SELECT joins orders to customers and groups by region. You edit its WHERE condition using comparisons, AND, parentheses, and timestamp plus INTERVAL. mz_now() represents the selected scenario clock.',
    detail: 'The surrounding projection, join, and grouping stay fixed. Reference explains the supported temporal form: compare mz_now() with a row timestamp expression and place interval arithmetic on that row expression. Your editor remains a draft until applied.' }),
  step({ id: 'sql-preview', section: 'SQL', surface: 'workspace', workspace: 'SQL', title: 'Test a query before applying it',
    description: 'Run query preview, or Ctrl+Enter, executes the editor and shows actual rows in Query observations. Running does not apply a repair. An error appears beside the editor; a changed editor or execution context requires another preview.',
    detail: 'Results include column types, empty-result messages, and a clearly labeled 200-row display limit. Cancel execution preserves drafts and applied changes. Retry SQL engine rebuilds the local engine after a failure. Select a snapshot first; wait for any current execution to finish.',
    unavailable: 'Choose a snapshot first and wait for any current execution to finish.' }),
  step({ id: 'sql-apply', section: 'SQL', surface: 'workspace', workspace: 'SQL', title: 'Compare results, then make a tested draft live',
    description: 'Compare your draft with the applied query and optional inherited-query result at the same snapshot and applied source settings. Inspect deployed and inherited SQL shows their definitions. Apply query makes a current, successfully previewed repair draft live.',
    detail: 'Applying changes shared results, clears the last read, and resets deliveries. Previewing alone changes none of these. Apply query is unavailable when the draft already matches the deployed query, no current successful preview exists, or execution is busy.',
    unavailable: 'Apply needs a changed draft with a current successful repair preview and no execution in progress.' }),
  workspaceIntroduction('System', 'Use System to inspect input progress, connection status, complete snapshot requests, and serving objects. This is where you check whether a correct query can be served fresh and within budget.'),
  step({ id: 'connection', section: 'System', surface: 'workspace', workspace: 'System', title: 'Separate connection progress from processing',
    description: 'Pause or Resume customer connection controls whether input progress can continue. Process pending updates separately catches up available work without advancing incident time. Processing waits for a connection and is unavailable when there is no pending work.' }),
  step({ id: 'progress', section: 'System', surface: 'workspace', workspace: 'System', title: 'Read the completeness boundary',
    description: 'Orders and Customers feed Recent orders, Regional totals, and serving. Complete strictly below means every earlier timestamp is complete; the boundary timestamp is still open. The limiting required input can hold back the result even when a query runs quickly.',
    detail: 'Quiet inputs can report progress without changing business rows. Connection history helps distinguish missing progress from slow processing. A serving index can also be absent or waiting for its maintained result.' }),
  step({ id: 'reads', section: 'System', surface: 'workspace', workspace: 'System', title: 'Request and assess a complete snapshot',
    description: 'Request normal read tests the three-second age bound against one retained, complete timestamp across the inputs. Authorize labeled ten-second fallback enables a separate temporary incident request. Inspect the diagram and the saved available, waiting, or age-bound outcome.',
    detail: 'A successful fallback alone does not restore normal service. The last request records its snapshot, bound, age, and request clock; it does not update automatically. Request again to test a changed system. Serving must also be available.' }),
  step({ id: 'serving', section: 'System', surface: 'workspace', workspace: 'System', title: 'Understand the serving objects and their budget',
    description: 'A regular helper view stores a query definition; a materialized result maintains output; local indexes support serving in each cluster. Serving settings shows a draft budget, while Applied serving design shows the live objects. Apply changes or Discard edits explicitly.',
    detail: 'The helper costs 0 or 4 units, the final result 0 or 4, and indexes 0, 2, or 4. Units are a teaching budget, not memory measurements. Applying serving settings clears the last read while preserving input records, SQL previews, and client deliveries.' }),
  workspaceIntroduction('Client', 'Use Client to follow database result changes into the application. Receive deliveries, inspect pending and completed timestamps, and check when the publication policy makes rows visible to users.'),
  step({ id: 'deliveries', section: 'Client', surface: 'workspace', workspace: 'Client', title: 'Receive one delivery at a time',
    description: 'The next delivery is a signed row change or a progress record. Receive and process delivery processes upstream output through that timestamp and can advance shared time as labeled. Replay deliveries clears the client replay without undoing repairs or rewinding time.',
    detail: 'Delivery requires a connected, processed upstream and an available next record. Receiving progress reports completeness rather than changing order amounts. Some deliveries are expected to leave the visible application unchanged.' }),
  step({ id: 'subscription', section: 'Client', surface: 'workspace', workspace: 'Client', title: 'Follow received changes into the application',
    description: 'The diagram separates pending timestamp changes, completed changes, and the published application. Positive diffs add full rows, negative diffs remove them, and Copies shows multiplicity. Several deliveries can belong to one timestamp.',
    detail: 'The progress boundary reports completeness. Tray selectors inspect already received history without receiving more data or rewinding the connection. Diagram key explains the notation. Empty trays and a waiting baseline describe replay state, not empty business data.' }),
  step({ id: 'client-settings', section: 'Client', surface: 'workspace', workspace: 'Client', title: 'Understand when received rows become visible',
    description: 'Publication settings expose each record, publish when progress reaches its timestamp, or wait until progress passes it. A coordinated starting snapshot supplies a complete baseline before later changes. Select settings as drafts, then Apply changes or Discard edits.',
    detail: 'Applying client settings restarts deliveries while preserving database reads and SQL previews. The currently applied publication policy, received progress, and client position determine the visible result. Inspect behavior before choosing a setting.' }),
  step({ id: 'reference', section: 'handover', surface: 'workspace', workspace: 'Dashboard', title: 'Find reference material and controls help',
    description: 'Tools includes Challenge overview and Reference. Reference contains schemas, time conventions, the operating contract, documentation, and lecture links. Nearby question icons explain individual concepts; keyboard shortcut help lists the page controls.',
    detail: 'These resources remain available after the tour. While touring, Left/Right and Enter navigate the tour, Escape exits, and challenge action shortcuts are disabled. Use Tab to reach the section picker, More detail, and navigation buttons.' }),
  step({ id: 'history', section: 'handover', surface: 'workspace', workspace: 'Dashboard', title: 'Use help and recover from changes',
    description: 'Applied change history records interventions automatically. Undo last change restores the previous configuration, rather than rewinding time. Investigation help offers workspace-specific hints and optional worked repairs.',
    detail: 'Hints are recorded. Worked repairs mark completion as assisted: SQL fills a draft to preview, while other worked repairs apply immediately. Taking this interface walkthrough never counts as a worked repair or changes your hints.' }),
  step({ id: 'acceptance', section: 'handover', surface: 'handover', title: 'Verify the applied system at handover',
    description: 'Review handover opens acceptance without submitting completion. Run acceptance checks tests the applied system, including additional query cases and client deliveries. All five current checks must pass before Complete handover is available.',
    detail: 'Unapplied edits remain drafts. Passed and Needs investigation feedback guide further investigation; Return to investigation reopens the workspace. Relevant incident changes require revalidation. No written submission is needed.' }),
  step({ id: 'restart', section: 'handover', surface: 'handover', title: 'Finish, leave, or start a fresh investigation',
    description: 'Complete handover records success and opens the completion celebration; reopening a completed attempt does not replay it. Back to main page preserves the saved attempt. Restart challenge asks before replacing the active investigation and its drafts.',
    detail: 'Restart preserves prior achievements and chapter progress. Independent completion stays available after an interface tour. Finishing this walkthrough returns you to where you opened it without starting, submitting, or completing the challenge.' }),
];
