import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { TraineeDossier } from '../lib/api';

export function useTraineeDossier(traineeId: string) {
  const [data, setData] = useState<TraineeDossier | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDossier = useCallback(async () => {
    if (!traineeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dossier = await api.getTraineeDossier(traineeId);
      setData(dossier);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to KaushalSetu services. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [traineeId]);

  useEffect(() => {
    fetchDossier();
  }, [fetchDossier]);

  return { data, loading, error, refetch: fetchDossier };
}
