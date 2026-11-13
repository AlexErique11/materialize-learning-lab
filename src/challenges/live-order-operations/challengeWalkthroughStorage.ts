import { challengeTourSteps } from './challengeWalkthroughContent';

export const CHALLENGE_TOUR_KEY = 'materialize-learning-lab-challenge-tour-v1';
interface TourPreference { dismissed: boolean; resumeId: string | null }
let memory: TourPreference = { dismissed: false, resumeId: null };

export function getChallengeTourPreference(): TourPreference {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(CHALLENGE_TOUR_KEY) ?? 'null');
    if (raw && typeof raw === 'object' && 'dismissed' in raw && typeof raw.dismissed === 'boolean'
      && 'resumeId' in raw && (raw.resumeId === null || challengeTourSteps.some(step => step.id === raw.resumeId))) {
      memory = { dismissed: raw.dismissed, resumeId: raw.resumeId as string | null };
    }
  } catch { /* Tour preferences remain usable without browser storage. */ }
  return memory;
}

export function saveChallengeTourPreference(patch: Partial<TourPreference>): TourPreference {
  memory = { ...getChallengeTourPreference(), ...patch };
  try { localStorage.setItem(CHALLENGE_TOUR_KEY, JSON.stringify(memory)); }
  catch { /* The interface tour must not depend on persistent storage. */ }
  return memory;
}
