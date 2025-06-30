'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';

interface SandboxFormProps {
  onSubmit: (data: { name: string; repoUrl?: string }) => Promise<void>;
  isLoading: boolean;
}

const SandboxForm: React.FC<SandboxFormProps> = ({ onSubmit, isLoading }) => {
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSubmit({
      name: name.trim(),
      repoUrl: repoUrl.trim() || undefined,
    });

    // Reset form
    setName('');
    setRepoUrl('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Sandbox
        </CardTitle>
        <CardDescription>
          Create a new Vercel Sandbox instance with optional Git repository
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Sandbox Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-sandbox"
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label htmlFor="repoUrl" className="block text-sm font-medium mb-1">
              Git Repository URL (Optional)
            </label>
            <Input
              id="repoUrl"
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repo.git"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              If provided, the repository will be cloned into the sandbox
            </p>
          </div>

          <Button type="submit" disabled={isLoading || !name.trim()} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Sandbox...
              </>
            ) : (
              'Create Sandbox'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SandboxForm;