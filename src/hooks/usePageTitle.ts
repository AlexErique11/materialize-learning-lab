import { useEffect } from 'react';

export function usePageTitle(title: string, enabled = true) {
  useEffect(() => {
    if (enabled) document.title = `${title} | Materialize Learning Lab`;
  }, [title, enabled]);
}
