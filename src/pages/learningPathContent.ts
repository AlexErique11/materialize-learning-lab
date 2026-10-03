export const labFeatures = [
  {
    title: 'Learn by doing',
    description: 'Follow interactive, hands-on tutorials with a running environment.',
  },
  {
    title: 'Build core skills',
    description: 'From streaming SQL to real-time applications.',
  },
  {
    title: 'Track your progress',
    description: 'See what you’ve completed and pick up where you left off.',
  },
] as const;

// The learning path features two entry points; the full catalog stays at /challenges.
export const featuredChallenges = [
  {
    slug: 'fresh-but-expensive',
    title: 'Challange 1 : Some challange not designed yet',
    description: 'Lorem ipsum dolor sit amet.',
  },
  {
    slug: 'live-order-operations',
    title: 'Challange 2 : Some challange not designed yet',
    description: 'Lorem ipsum dolor sit amet.',
  },
] as const;
