export const labFeatures = [
  {
    title: 'Learn by doing',
    description: 'Follow interactive SQL simulations and guided predictions.',
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
export const featuredChallenges = ['fresh-but-expensive', 'live-order-operations'] as const;
