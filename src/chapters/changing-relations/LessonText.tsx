import { Fragment } from 'react';

export type LessonTextContent = readonly (string | {
  readonly kind: 'row' | 'diff' | 'time' | 'count' | 'term';
  readonly text: string;
})[];

// Explicitly mark lesson references so prose and table values share a visual language.
export function LessonText({ content }: { content: LessonTextContent }) {
  return content.map((part, index) => typeof part === 'string'
    ? <Fragment key={index}>{part}</Fragment>
    : <span key={index} className={`relation-inline relation-inline-${part.kind}${part.kind === 'diff' && part.text.startsWith('−') ? ' relation-inline-negative' : ''}`}>{part.text}</span>);
}
