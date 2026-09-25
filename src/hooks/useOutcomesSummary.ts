import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { OutcomesSummary } from '../lib/api';

export function useOutcomesSummary() {
  const [data, setData] = useState<OutcomesSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getOutcomesSummary()
      .then((summary) => {
        if (!cancelled) setData(summary);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load outcomes summary';
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
