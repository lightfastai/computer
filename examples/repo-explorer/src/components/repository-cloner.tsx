'use client';

import type { LightfastComputerSDK } from '@lightfastai/computer';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface RepositoryClonerProps {
  computer: LightfastComputerSDK;
  instanceId: string;
  onRepositoryCloned: () => void;
  loading: boolean;
}

export const RepositoryCloner = ({ computer, instanceId, onRepositoryCloned, loading }: RepositoryClonerProps) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!repoUrl.trim()) return;

    setCloning(true);
    setError(null);

    try {
      // Ensure the workspace directory exists
      await computer.commands.execute({
        instanceId,
        command: 'mkdir -p /workspace',
      });

      // Clone the repository
      const result = await computer.commands.execute({
        instanceId,
        command: `cd /workspace && git clone ${repoUrl.trim()}`,
      });

      if (result.isErr()) {
        setError(result.error.userMessage);
        return;
      }

      // Check if clone was successful
      if (result.value.output.includes('fatal:') || result.value.exitCode !== 0) {
        setError('Failed to clone repository. Please check the URL and try again.');
        return;
      }

      setRepoUrl('');
      onRepositoryCloned();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clone repository';
      setError(message);
    } finally {
      setCloning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clone Repository</CardTitle>
        <CardDescription>Clone a Git repository to the instance</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleClone} className="space-y-4">
          <div>
            <label htmlFor="repo-url" className="block text-sm font-medium mb-2">
              Repository URL
            </label>
            <Input
              id="repo-url"
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repo.git"
              required
            />
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          <Button type="submit" disabled={loading || cloning || !repoUrl.trim()}>
            {cloning ? 'Cloning...' : 'Clone Repository'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
