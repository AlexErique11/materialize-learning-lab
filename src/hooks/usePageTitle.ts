import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Materialize Learning Lab`;
  }, [title]);
}
