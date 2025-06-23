'use client';

import type { Instance } from '@lightfastai/computer';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CreateInstanceRequest } from '@/hooks/use-computer';

interface InstanceCreatorProps {
  onCreateInstance: (request: CreateInstanceRequest) => Promise<Instance | null>;
  loading: boolean;
}

export const InstanceCreator = ({ onCreateInstance, loading }: InstanceCreatorProps) => {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('iad');
  const [size, setSize] = useState('shared-cpu-1x');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    const request: CreateInstanceRequest = {
      name: name.trim(),
      region,
      size,
    };

    const instance = await onCreateInstance(request);

    if (instance) {
      setName('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Instance</CardTitle>
        <CardDescription>Create a new Ubuntu instance on Fly.io</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Instance Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-instance"
              required
            />
          </div>

          <div>
            <label htmlFor="region" className="block text-sm font-medium mb-2">
              Region
            </label>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="iad">US East (iad)</option>
              <option value="ord">US Central (ord)</option>
              <option value="lax">US West (lax)</option>
              <option value="lhr">Europe (lhr)</option>
              <option value="nrt">Asia (nrt)</option>
            </select>
          </div>

          <div>
            <label htmlFor="size" className="block text-sm font-medium mb-2">
              Machine Size
            </label>
            <select
              id="size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="shared-cpu-1x">Shared CPU 1x (256MB RAM)</option>
              <option value="shared-cpu-2x">Shared CPU 2x (512MB RAM)</option>
              <option value="shared-cpu-4x">Shared CPU 4x (1GB RAM)</option>
              <option value="performance-1x">Performance 1x (2GB RAM)</option>
              <option value="performance-2x">Performance 2x (4GB RAM)</option>
            </select>
          </div>

          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create Instance'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
