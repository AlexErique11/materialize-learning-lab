export function DiffBadge({ diff }: { diff: number }) {
  return (
    <span
      className={`relation-count ${diff < 0 ? 'relation-count-negative' : diff === 0 ? 'relation-count-neutral' : ''}`}
      aria-label={
        diff === 0
          ? 'No net change'
          : `${diff < 0 ? 'Retract' : 'Add'} ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'copy' : 'copies'}`
      }
    >
      {diff > 0 ? '+' : diff < 0 ? '−' : ''}
      {Math.abs(diff)}
    </span>
  );
}
