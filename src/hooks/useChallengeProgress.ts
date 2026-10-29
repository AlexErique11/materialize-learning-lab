import { useSyncExternalStore } from 'react';
import { getChallengeProgress, subscribeChallengeProgress } from '../progress/challengeProgress';

export function useChallengeProgress() {
  return useSyncExternalStore(subscribeChallengeProgress, getChallengeProgress);
}
