import { useEffect, useState, useCallback } from 'react';
import { api, errorMessage } from '../lib/api';
export function useResource<T>(path: string | null, version = 0) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    api<T>(path)
      .then((v) => {
        if (!cancelled) setData(v);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, version, retry]);
  const reload = useCallback(() => setRetry((r) => r + 1), []);
  return { data, loading, error, reload };
}
