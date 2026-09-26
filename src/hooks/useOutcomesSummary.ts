import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { OutcomesSummary } from '../lib/api';

export function useOutcomesSummary() {
  const [data, setData] = useState<OutcomesSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const summary = await api.getOutcomesSummary();
      setData(summary);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to KaushalSetu services. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { data, loading, error, refetch: fetchSummary };
}
