import { Fragment } from 'react';

export type LessonTextContent = readonly (string | {
  readonly kind: 'row' | 'diff' | 'time' | 'count' | 'term';
  readonly text: string;
  readonly column?: string;
})[];

// Explicitly mark lesson references so prose and table values share a visual language.
export function LessonText({ content }: { content: LessonTextContent }) {
  return content.map((part, index) => typeof part === 'string'
    ? <Fragment key={index}>{part}</Fragment>
    : <span key={index} data-column={part.column} className={`relation-inline relation-inline-${part.kind}${part.kind === 'diff' && /^[−-]/.test(part.text) ? ' relation-inline-negative' : ''}`}>{part.text}</span>);
}
