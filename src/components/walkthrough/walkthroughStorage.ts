export const TOUR_SEEN_KEY = 'materialize-learning-lab-chapter-tour-seen';
export const WORK_COMPLETED_KEY = 'materialize-learning-lab-work-completed';
let seenThisSession = false;
let completedThisSession = false;

export function shouldStartChapterTour(): boolean {
  if (seenThisSession || completedThisSession) return false;
  try { return localStorage.getItem(TOUR_SEEN_KEY) !== 'true' && localStorage.getItem(WORK_COMPLETED_KEY) !== 'true'; }
  catch { return true; }
}

export function rememberChapterTour(): void {
  seenThisSession = true;
  try { localStorage.setItem(TOUR_SEEN_KEY, 'true'); } catch { /* Session memory keeps the tour dismissible without browser storage. */ }
}

export function rememberCompletedWork(): void {
  completedThisSession = true;
  try { localStorage.setItem(WORK_COMPLETED_KEY, 'true'); } catch { /* Completion must not depend on browser storage. */ }
}
