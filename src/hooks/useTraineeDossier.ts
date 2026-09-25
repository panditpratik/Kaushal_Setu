// src/hooks/useTraineeDossier.ts
// Drop-in replacement for the hardcoded Priya object.
// Usage: const { data, loading, error } = useTraineeDossier(traineeId);

import { useEffect, useState } from 'react';
import { api, type TraineeDossier } from '../lib/api';

export function useTraineeDossier(traineeId: string) {
  const [data, setData] = useState<TraineeDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getTraineeDossier(traineeId)
      .then((dossier) => {
        if (!cancelled) setData(dossier);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load dossier');
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
