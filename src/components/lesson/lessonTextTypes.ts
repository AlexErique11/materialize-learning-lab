export type LessonTextContent = readonly (string | {
  readonly kind: 'row' | 'diff' | 'time' | 'count' | 'term';
  readonly text: string;
  readonly column?: string;
})[];
