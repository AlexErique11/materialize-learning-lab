import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';

// Only the chapter's named objects and measurements are references; other prose
// and bare numbers stay neutral. Longer names precede their shorter forms.
const references = [
  { pattern: 'Paid orders', column: 'join' },
  { pattern: 'Orders', column: 'orders' },
  { pattern: 'Payments', column: 'payments' },
  { pattern: 'Revenue', column: 'revenue' },
  { pattern: '(?:business )?event time(?:\\s+\\d+)?', column: 'eventTime' },
  { pattern: '(?:logical timestamps?|logical time|time)(?:\\s+\\d+)', column: 'logicalTime' },
  { pattern: 'logical (?:timestamps?|time)', column: 'logicalTime' },
  { pattern: '(?:actual |write )?frontiers?(?:\\s+\\d+)?', column: 'frontier' },
  { pattern: 'input limit(?:\\s+\\d+)?', column: 'limit' },
  { pattern: 'observed (?:change|logical time)(?:\\s+\\d+)?', column: 'observed' },
  { pattern: 'local (?:lag|delay)', column: 'localLag' },
  { pattern: 'inherited (?:lag|delay)', column: 'inheritedLag' },
  { pattern: '(?:global )?materialization lag|wall-clock lag|freshness(?: delay)?', column: 'lag' },
  { pattern: 'query(?: latency| duration)?', column: 'queryLatency' },
  { pattern: 'reaction(?: time)?', column: 'reactionTime' },
] as const;
const referencePattern = new RegExp(`\\b(?:${references.map((reference, i) => `(?<ref${i}>${reference.pattern})`).join('|')})\\b`, 'gi');

export function progressText(text: string): LessonTextContent {
  const parts: (LessonTextContent[number])[] = [];
  let end = 0;
  for (const match of text.matchAll(referencePattern)) {
    if (match.index > end) parts.push(text.slice(end, match.index));
    const reference = references.find((_, i) => match.groups?.[`ref${i}`] !== undefined)!;
    parts.push({ kind: 'term', text: match[0], column: reference.column });
    end = match.index + match[0].length;
  }
  if (end < text.length) parts.push(text.slice(end));
  return parts;
}
