import type { Instance } from '@lightfastai/computer';
import createLightfastComputer from '@lightfastai/computer';
import { useCallback, useMemo, useState } from 'react';

interface CreateInstanceRequest {
  name: string;
  region?: string;
  size?: string;
}

import { env } from '@/env';

export type { CreateInstanceRequest };

export const useComputer = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computer = useMemo(() => {
    return createLightfastComputer({
      flyApiToken: env.NEXT_PUBLIC_FLY_API_TOKEN,
      appName: env.NEXT_PUBLIC_FLY_APP_NAME,
    });
  }, []);

  const createInstance = useCallback(
    async (request: CreateInstanceRequest) => {
      setLoading(true);
      setError(null);

      try {
        const result = await computer.instances.create(request);

        if (result.isErr()) {
          setError(result.error.userMessage);
          return null;
        }

        const instance = result.value;
        setInstances((prev) => [...prev, instance]);
        return instance;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create instance';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [computer],
  );

  const refreshInstances = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await computer.instances.list();

      if (result.isErr()) {
        setError(result.error.userMessage);
        return;
      }

      setInstances(result.value);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch instances';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [computer]);

  const destroyInstance = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await computer.instances.destroy(id);

        if (result.isErr()) {
          setError(result.error.userMessage);
          return false;
        }

        setInstances((prev) => prev.filter((instance) => instance.id !== id));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to destroy instance';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [computer],
  );

  return {
    computer,
    instances,
    loading,
    error,
    createInstance,
    refreshInstances,
    destroyInstance,
  };
};
