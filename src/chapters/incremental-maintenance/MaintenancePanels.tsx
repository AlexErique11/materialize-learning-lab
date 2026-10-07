import type { ReactNode, RefObject } from 'react';
import { ArrowRight, Clock3 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { RelationHelp } from '../changing-relations/RelationHelp';
export interface MaintenanceStage { id: string; title: string; shortTitle?: string; sql: string; description: string; showChanges?: boolean }
export function MaintenancePanels({ stages, layout, activeStage, setSelectedStage, mobileDiffs, setMobileDiffs, guided = false, time, timeTestId, beforeChange = false, outputChanged = false, renderRows, panelRefs }: {
 stages: readonly MaintenanceStage[]; layout?: 'comparison'; activeStage: string; setSelectedStage: (stage: string) => void;
 mobileDiffs: boolean; setMobileDiffs: (update: (value: boolean) => boolean) => void; guided?: boolean;
 time: number; timeTestId: string; beforeChange?: boolean; outputChanged?: boolean; renderRows: (stage: string) => ReactNode;
 panelRefs?: Record<string, RefObject<HTMLElement | null>>;
}) { return (
        <div className="maintenance-stage-workspace" data-layout={layout} data-guided={guided}>
          <nav className="maintenance-flow join-flow" aria-label={layout === 'comparison' ? 'Maintenance comparison' : stages[1]?.id === 'products' ? 'Join inputs and result' : stages[1]?.id === 'groups' ? 'Aggregation stages' : 'Query stages'}>
            {stages.map((stage, index) => <div key={stage.id}>
              {!layout && <h2 className="maintenance-stage-heading" data-active={guided && activeStage === stage.id}>
                <span>{index + 1}. {stage.title}</span>
                <code>{stage.sql}</code>
              </h2>}
              <Button aria-pressed={activeStage === stage.id} disabled={guided} onClick={() => setSelectedStage(stage.id)}>
                <span>{!layout && `${index + 1}. `}<span className="maintenance-stage-full-title">{stage.title}</span><span className="maintenance-stage-short-title">{stage.shortTitle ?? stage.title}</span></span>
                {!layout && <code>{stage.sql}</code>}
              </Button>
              <span className="maintenance-stage-help"><RelationHelp label={stage.title} text={stage.description} /></span>
              {layout === 'comparison' && index === 0 && <span className="comparison-time" aria-label="Current logical timestamp">
                <Clock3 size={14} aria-hidden="true" /><span data-testid={timeTestId}>t = {time}</span>
              </span>}
              {!layout && index === 0 && stages[1]?.id === 'products' && <span className="maintenance-flow-arrow join-plus" aria-hidden="true">+</span>}
              {!layout && (index === 1 || (index === 0 && stages[1]?.id !== 'products')) && <ArrowRight className="maintenance-flow-arrow" aria-hidden="true" />}
            </div>)}
          </nav>
          {layout === 'comparison' && <div className="comparison-arrows" aria-hidden="true">
            <svg className="comparison-connector-left" viewBox="0 0 64 100" preserveAspectRatio="none" data-active={!beforeChange && time > 0}>
              <path d="M64 0 H24 Q8 0 8 16 V94" />
              <polygon points="3,91 8,98 13,91" />
            </svg>
            <svg className="comparison-connector-right" viewBox="0 0 64 100" preserveAspectRatio="none" data-active={!beforeChange && Boolean(outputChanged)}>
              <path d="M0 0 H40 Q56 0 56 16 V94" />
              <polygon points="51,91 56,98 61,91" />
            </svg>
          </div>}
          <div className="maintenance-panels join-panels" data-join-stage={activeStage} data-selected-stage={activeStage} data-mobile-diffs={mobileDiffs} data-walkthrough="lecture-workspace">
            {stages.map((stage) => <section key={stage.id} ref={panelRefs?.[stage.id]} className="relation-panel" data-stage={stage.id} data-active={activeStage === stage.id} aria-labelledby={`join-${stage.id}-heading`}>
              <h2 id={`join-${stage.id}-heading`}>{stage.title}<RelationHelp label={stage.title} text={stage.description} />
                {stage.id !== 'groups' && stage.showChanges !== false && <Button className="maintenance-mobile-view" aria-pressed={mobileDiffs} onClick={() => setMobileDiffs((value) => !value)}>{mobileDiffs ? 'Show rows' : 'Show changes'}</Button>}
              </h2>
              {renderRows(stage.id)}
            </section>)}
          </div>
        </div>
); }
