export interface ChallengeDefinition {
  readonly number: number;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly afterChapter: number;
}

// Capstones match CURRICULUM.md and the prototype catalog.
export const challenges: readonly ChallengeDefinition[] = [
  {
    number: 1,
    slug: 'live-order-operations',
    title: 'Live Order Operations',
    description: 'Bring together changing sources, updates, and time in a live recent-orders view.',
    afterChapter: 5,
  },
  {
    number: 2,
    slug: 'fresh-but-expensive',
    title: 'The Dashboard Is Fresh but Expensive',
    description:
      'Combine maintained state, freshness, and query plans to rethink a costly dashboard.',
    afterChapter: 9,
  },
  {
    number: 3,
    slug: 'recover-without-corrupting-delivery',
    title: 'Recover Without Corrupting Delivery',
    description: 'Connect recovery, live-client reconnection, and reliable downstream delivery.',
    afterChapter: 12,
  },
];

export function findChallenge(slug: string | undefined) {
  return challenges.find((challenge) => challenge.slug === slug);
}

export function challengePath(challenge: ChallengeDefinition) {
  return `/challenges/${challenge.slug}`;
}
