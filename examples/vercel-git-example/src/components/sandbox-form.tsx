'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, GitBranch, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SandboxFormProps {
  onSubmit: (data: { name: string; repoUrl?: string }) => Promise<void>;
  isLoading: boolean;
}

const SandboxForm: React.FC<SandboxFormProps> = ({ onSubmit, isLoading }) => {
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  
  // Popular repository examples
  const exampleRepos = [
    { name: 'Next.js', url: 'https://github.com/vercel/next.js' },
    { name: 'React', url: 'https://github.com/facebook/react' },
    { name: 'Vue', url: 'https://github.com/vuejs/core' },
  ];

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
          <GitBranch className="h-5 w-5" />
          Create Git Repository Sandbox
        </CardTitle>
        <CardDescription>
          Create a sandbox to explore and analyze any git repository
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
              Git Repository URL
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
              Enter a public repository URL to clone and explore
            </p>
            
            {/* Example Repos */}
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Try these examples:</p>
              <div className="flex flex-wrap gap-1">
                {exampleRepos.map((repo) => (
                  <Button
                    key={repo.url}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-xs h-6 px-2"
                    onClick={() => setRepoUrl(repo.url)}
                  >
                    {repo.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              The sandbox will start with git pre-installed. You can explore branches,
              view commit history, analyze code changes, and run git commands.
            </AlertDescription>
          </Alert>

          <Button type="submit" disabled={isLoading || !name.trim()} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Git Sandbox...
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