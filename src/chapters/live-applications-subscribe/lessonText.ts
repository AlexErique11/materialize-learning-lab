import type { LessonTextContent } from '../../components/lesson/lessonTextTypes';

type Reference = Exclude<LessonTextContent[number], string>;
const reference = (text: string, column: string, kind: Reference['kind'] = 'term'): Reference => ({ kind, text, column });
const pattern = /\((EU|US)(,\s*)(\d+)(,\s*)(\d+)\)|\bP\(\d+\)|[+−-]\d+\b|\b(?:\d+|one|two)\s+(?:identical\s+)?(?:orders?|copies|copy|rows?)\b|\b(?:SUBSCRIBE|SELECT|FETCH|SNAPSHOT(?:\s+(?:=\s*)?(?:false|true))?|row_copies|open_order_totals|mz_timestamp|mz_progressed|mz_diff|timestamps?|times?|boundar(?:y|ies)|pending|published|EU|US|regions?|orders?|totals?|totaling|copies|multiplicit(?:y|ies)|\d+)\b/gi;

export function subscriptionText(text: string): LessonTextContent {
  const parts: LessonTextContent[number][] = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > end) parts.push(text.slice(end, match.index));
    const value = match[0];
    if (match[1]) {
      // Keep tuple punctuation intact while coloring each field independently.
      parts.push('(', reference(match[1], 'region'), match[2]!, reference(match[3]!, 'orders', 'count'),
        match[4]!, reference(match[5]!, 'total', 'row'), ')');
    } else if (/^[+−-]\d+$/.test(value)) {
      parts.push({ kind: 'diff', text: value });
    } else if (/^\d+$/.test(value)) {
      const before = text.slice(0, match.index);
      if (/\b(?:EU|US|totals?|totaling)(?:\s+(?:of|is|becomes|stays))?\s*$/i.test(before)) parts.push(reference(value, 'total', 'row'));
      else if (/\b(?:times?|timestamps?|before|below|at|boundary(?: is| to| of| advances to)?)\s*$|\bmz_timestamp\s*=\s*$/i.test(before)) parts.push(reference(value, 'time', 'time'));
      else if (/\bhas\s*$/i.test(before)) parts.push(reference(value, 'orders', 'count'));
      else parts.push(value);
    } else if (/^(?:EU|US|regions?)$/i.test(value)) parts.push(reference(value, 'region'));
    else if (/\borders?$/i.test(value)) parts.push(reference(value, 'orders'));
    else if (/\b(?:copies|copy|multiplicity|multiplicities|rows?)$/i.test(value)) parts.push(reference(value, 'copies'));
    else if (/^(?:totals?|totaling)$/i.test(value)) parts.push(reference(value, 'total'));
    else if (/^(?:P\(|times?\b|timestamps?\b|boundar|mz_timestamp|mz_progressed)/i.test(value)) parts.push(reference(value, 'time', 'time'));
    else if (/^pending$/i.test(value)) parts.push(reference(value, 'pending'));
    else if (/^published$/i.test(value)) parts.push(reference(value, 'published'));
    else parts.push(reference(value, 'subscription'));
    end = match.index + match[0].length;
  }
  if (end < text.length) parts.push(text.slice(end));
  return parts;
}
