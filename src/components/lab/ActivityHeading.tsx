import type { ReactNode } from 'react';

/** Shared title and control row for lectures, exercises, and the incident workspace. */
export function ActivityHeading({ title, description, controls, controlsAvailable = true, controlsLabel = 'Lab controls', titleDescription }: {
  title: ReactNode;
  description: ReactNode;
  controls: ReactNode;
  controlsAvailable?: boolean;
  controlsLabel?: string;
  titleDescription?: string;
}) {
  return <div className="guided-lab-heading">
    <div className="guided-lab-title">
      <h1 aria-description={titleDescription}>{title}</h1>
      <p>{description}</p>
    </div>
    <div className={`guided-lab-controls${controlsAvailable ? '' : ' reserved-controls'}`}
      aria-label={controlsAvailable ? controlsLabel : undefined}
      aria-hidden={!controlsAvailable || undefined} inert={!controlsAvailable || undefined}>
      {controls}
    </div>
  </div>;
}
