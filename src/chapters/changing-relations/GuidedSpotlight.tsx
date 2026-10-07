import type { ComponentProps } from 'react';
import { Spotlight } from '../../components/ui/Spotlight';

export function GuidedSpotlight(props: Omit<ComponentProps<typeof Spotlight>, 'placement' | 'visual'>) {
  return <Spotlight {...props} placement="above-first" visual={null} />;
}
