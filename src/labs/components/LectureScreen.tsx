import { useLayoutEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { Clock3 } from 'lucide-react';
import { GuidedLabScreen } from './GuidedLabScreen';
import { WorkspaceMetric } from '../../components/lab/WorkspaceMetric';
import './lecture-layout.css';

type LectureLayout = 'with-tip' | 'without-tip';
interface LectureScreenProps extends Omit<ComponentProps<typeof GuidedLabScreen>, 'workspace' | 'showTip'> {
  layout: LectureLayout;
  metrics?: ReactNode;
  visualization: ReactNode;
  playback: ReactNode;
  guided: boolean;
}

export function LectureScreen({ layout, metrics, visualization, playback, guided, className = '', ...screen }: LectureScreenProps) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (layout !== 'without-tip') return;
    const workspace = workspaceRef.current!;
    const content = workspace.querySelector<HTMLElement>('.lecture-visualization-content')!;
    const measure = () => {
      const css = getComputedStyle(workspace);
      const number = (name: string) => parseFloat(css.getPropertyValue(name));
      const metricsHeight = workspace.querySelector('.relation-metrics')?.getBoundingClientRect().height ?? 0;
      const referenceMetricsHeight = workspace.querySelector('.lecture-metric-measure .relation-metric')!.getBoundingClientRect().height;
      const playbackHeight = workspace.querySelector('.relation-playback-controls')!.getBoundingClientRect().height;
      const pagePadding = parseFloat(getComputedStyle(workspace.closest('.guided-lab-page')!).paddingBottom);
      const available = innerHeight - workspace.getBoundingClientRect().top - pagePadding;
      const metricGap = metricsHeight ? number('--lecture-metrics-gap') : 0;
      const naturalHeight = content.getBoundingClientRect().height + metricsHeight + playbackHeight;
      // A visualization without metric cards still shares the same playback baseline.
      const preferredHeight = number('--lecture-panel-height') + referenceMetricsHeight + number('--lecture-playback-height')
        + number('--lecture-title-spacing') + number('--lecture-metrics-gap') + 14 + number('--lecture-tip-space')
        + number('--lecture-playback-offset');
      const contentFrameHeight = Math.min(preferredHeight, available);
      const frameHeight = Math.min(available, Math.max(preferredHeight, available - number('--lecture-playback-bottom-space')));
      const fullSpacingFits = naturalHeight + metricGap + 14 <= contentFrameHeight;
      const appliedMetricGap = fullSpacingFits ? metricGap : metricsHeight ? 10 : 0;
      const footerGap = fullSpacingFits ? 14 : 6;
      const inset = Math.min(number('--lecture-title-spacing'), Math.max(0, contentFrameHeight - naturalHeight - appliedMetricGap - footerGap));
      workspace.style.setProperty('--lecture-frame-height', `${frameHeight}px`);
      workspace.style.setProperty('--lecture-content-inset', `${inset}px`);
      workspace.style.setProperty('--lecture-applied-metrics-gap', `${appliedMetricGap}px`);
      workspace.style.setProperty('--lecture-applied-footer-gap', `${footerGap}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    const metricsElement = workspace.querySelector('.relation-metrics');
    if (metricsElement) observer.observe(metricsElement);
    const metricMeasure = workspace.querySelector('.lecture-metric-measure');
    if (metricMeasure) observer.observe(metricMeasure);
    observer.observe(workspace.querySelector('.relation-playback-controls')!);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [layout]);

  return <GuidedLabScreen {...screen} className={`${className} lecture-layout-page`} showTip={layout === 'with-tip' ? 'when-space' : false}
    workspace={<div ref={workspaceRef} className="relation-workspace lecture-workspace" data-guided={guided} data-lecture-layout={layout}>
      {metrics}
      {layout === 'without-tip' && <div className="lecture-metric-measure" aria-hidden="true">
        <WorkspaceMetric icon={<Clock3 size={25} />} label={<>Current logical timestamp<span className="lecture-metric-help" /></>} value="t = 0" />
      </div>}
      <div className="lecture-visualization"><div className="lecture-visualization-content">{visualization}</div></div>
      {playback}
    </div>} />;
}
