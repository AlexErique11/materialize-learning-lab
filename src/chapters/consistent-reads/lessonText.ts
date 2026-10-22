import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';

const references = [
  ['Paid orders', 'join'], ['Orders', 'orders'], ['Payments', 'payments'],
  ['(?:query|snapshot|logical) time(?: \\d+(?:\\.\\d+)?(?: s)?)?', 'query'],
  ['(?:write )?frontier(?: \\d+(?:\\.\\d+)?)?', 'frontier'],
  ['retained (?:boundary|history)|compaction', 'retained'],
] as const;
const pattern = new RegExp(`\\b(?:${references.map(([text], i) => `(?<r${i}>${text})`).join('|')})\\b`, 'gi');
export function readText(text: string): LessonTextContent {
  const result: LessonTextContent[number][] = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > end) result.push(text.slice(end, match.index));
    const reference = references.find((_, i) => match.groups?.[`r${i}`] !== undefined)!;
    result.push({ kind: 'term', text: match[0], column: reference[1] });
    end = match.index + match[0].length;
  }
  if (end < text.length) result.push(text.slice(end));
  return result;
}
