import { CircleHelp } from 'lucide-react';
import { useWalkthrough } from './WalkthroughProvider';

export function LectureControlsTourButton() {
  const { startLectureHelp } = useWalkthrough();

  return (
    <button
      type="button"
      className="chapter-walkthrough-button"
      aria-label="Lecture controls walkthrough"
      onClick={startLectureHelp}
    >
      <CircleHelp size={16} aria-hidden="true" />
      <span>Controls tour</span>
    </button>
  );
}
