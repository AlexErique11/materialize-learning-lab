import { createContext, useContext } from 'react';

export const ChapterCompletionContext = createContext<{ open: () => void; close: () => void } | null>(null);

export function useChapterCompletion() {
  const completion = useContext(ChapterCompletionContext);
  if (!completion) throw new Error('Chapter completion controls require a chapter provider.');
  return completion;
}
