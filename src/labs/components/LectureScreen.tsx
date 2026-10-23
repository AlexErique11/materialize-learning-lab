import { useState, type ComponentProps } from 'react';
import { GuidedLabScreen } from './GuidedLabScreen';
import { LectureWorkspace, type LectureWorkspaceProps } from './LectureWorkspace';

type LectureScreenProps = Omit<ComponentProps<typeof GuidedLabScreen>, 'workspace' | 'showTip'>
  & Omit<LectureWorkspaceProps, 'afterVisualization'>;
type LectureProgress = Pick<NonNullable<LectureScreenProps['simulation']>, 'completed' | 'total' | 'progressLabel'>;

export function LectureScreen({ layout, metrics, visualization, playback, guided, simulation, className = '', ...screen }: LectureScreenProps) {
  const [guidedProgress, setGuidedProgress] = useState<LectureProgress | null>(null);
  return <GuidedLabScreen {...screen} className={`${className} lecture-layout-page${layout === 'without-tip' ? ' lecture-subtitle-layout' : ''}`} showTip={layout === 'with-tip' ? 'when-space' : false}
    simulation={simulation && {
      ...simulation,
      ...(guided ? guidedProgress : null),
      onStartGuidedRun: () => {
        setGuidedProgress({ completed: simulation.completed, total: simulation.total, progressLabel: simulation.progressLabel });
        simulation.onStartGuidedRun();
      },
    }}
    workspace={<LectureWorkspace layout={layout} metrics={metrics} visualization={visualization} playback={playback} guided={guided} />} />;
}
