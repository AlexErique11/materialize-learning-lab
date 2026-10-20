import type { ComponentProps } from 'react';
import { GuidedLabScreen } from './GuidedLabScreen';
import { LectureWorkspace, type LectureWorkspaceProps } from './LectureWorkspace';

type LectureScreenProps = Omit<ComponentProps<typeof GuidedLabScreen>, 'workspace' | 'showTip'>
  & Omit<LectureWorkspaceProps, 'afterVisualization'>;

export function LectureScreen({ layout, metrics, visualization, playback, guided, className = '', ...screen }: LectureScreenProps) {
  return <GuidedLabScreen {...screen} className={`${className} lecture-layout-page${layout === 'without-tip' ? ' lecture-subtitle-layout' : ''}`} showTip={layout === 'with-tip' ? 'when-space' : false}
    workspace={<LectureWorkspace layout={layout} metrics={metrics} visualization={visualization} playback={playback} guided={guided} />} />;
}
