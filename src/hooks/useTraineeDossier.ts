import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { TraineeDossier } from '../lib/api';

export function useTraineeDossier(traineeId: string) {
  const [data, setData] = useState<TraineeDossier | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(traineeId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traineeId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getTraineeDossier(traineeId)
      .then((dossier) => {
        if (!cancelled) setData(dossier);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load dossier';
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [traineeId]);

  return { data, loading, error };
}
