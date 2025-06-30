'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Instance } from '@/lib/api-client';
import { 
  GitBranch,
  GitMerge,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  GitCommit,
  ChevronRight
} from 'lucide-react';

interface GitBranchSelectorProps {
  instance: Instance;
  onExecuteCommand: (instanceId: string, command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  onBranchChange?: (branch: string) => void;
}

interface Branch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  lastCommit?: string;
  ahead?: number;
  behind?: number;
}

const GitBranchSelector: React.FC<GitBranchSelectorProps> = ({ instance, onExecuteCommand, onBranchChange }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [isChangingBranch, setIsChangingBranch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBranches = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get current branch
      const currentResult = await onExecuteCommand(instance.id, 'git branch --show-current 2>/dev/null');
      const current = currentResult.stdout.trim();
      setCurrentBranch(current);

      // Get all branches with detailed info
      const branchesResult = await onExecuteCommand(
        instance.id,
        'git branch -a -v --no-abbrev'
      );

      if (branchesResult.exitCode === 0) {
        const parsedBranches: Branch[] = [];
        const lines = branchesResult.stdout.split('\n').filter(line => line.trim());

        for (const line of lines) {
          const isCurrent = line.startsWith('*');
          const cleanLine = line.replace('*', '').trim();
          
          // Parse branch info
          const parts = cleanLine.split(/\s+/);
          let name = parts[0];
          const isRemote = name.startsWith('remotes/');
          
          if (isRemote) {
            name = name.replace('remotes/origin/', '');
            // Skip HEAD reference
            if (name.includes('HEAD')) continue;
          }

          // Get last commit hash
          const lastCommit = parts[1];

          parsedBranches.push({
            name,
            isCurrent,
            isRemote,
            lastCommit: lastCommit?.substring(0, 7),
          });
        }

        // Remove duplicates (prefer local over remote)
        const uniqueBranches = new Map<string, Branch>();
        parsedBranches.forEach(branch => {
          const existing = uniqueBranches.get(branch.name);
          if (!existing || (!branch.isRemote && existing.isRemote)) {
            uniqueBranches.set(branch.name, branch);
          }
        });

        setBranches(Array.from(uniqueBranches.values()).sort((a, b) => {
          // Current branch first
          if (a.isCurrent) return -1;
          if (b.isCurrent) return 1;
          // Then local branches
          if (!a.isRemote && b.isRemote) return -1;
          if (a.isRemote && !b.isRemote) return 1;
          // Then alphabetically
          return a.name.localeCompare(b.name);
        }));
      } else {
        setError('Failed to load branches');
        setBranches([]);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      setError('Error loading branches');
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  };

  const switchBranch = async (branchName: string) => {
    setIsChangingBranch(true);
    setError(null);

    try {
      // Check for uncommitted changes
      const statusResult = await onExecuteCommand(instance.id, 'git status --porcelain');
      
      if (statusResult.stdout.trim()) {
        setError('You have uncommitted changes. Please commit or stash them before switching branches.');
        return;
      }

      // Switch to the branch
      const checkoutResult = await onExecuteCommand(
        instance.id,
        `git checkout ${branchName}`
      );

      if (checkoutResult.exitCode === 0) {
        setCurrentBranch(branchName);
        await loadBranches();
        if (onBranchChange) {
          onBranchChange(branchName);
        }
      } else {
        setError(`Failed to switch branch: ${checkoutResult.stderr}`);
      }
    } catch (error) {
      setError(`Error switching branch: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsChangingBranch(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Git Branches
          {currentBranch && (
            <Badge variant="default" className="ml-auto">
              <Check className="h-3 w-3 mr-1" />
              {currentBranch}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Switch between repository branches
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={loadBranches}
            disabled={isLoading || isChangingBranch}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No branches found</p>
            </div>
          ) : (
            branches.map((branch) => (
              <div
                key={`${branch.name}-${branch.isRemote}`}
                className={`flex items-center gap-3 p-3 rounded border transition-colors ${
                  branch.isCurrent 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-muted/50 border-border cursor-pointer'
                }`}
                onClick={() => !branch.isCurrent && !branch.isRemote && switchBranch(branch.name)}
              >
                <GitBranch className={`h-4 w-4 ${
                  branch.isCurrent ? 'text-primary' : 'text-muted-foreground'
                }`} />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      branch.isCurrent ? 'text-primary' : ''
                    }`}>
                      {branch.name}
                    </span>
                    {branch.isCurrent && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                    {branch.isRemote && (
                      <Badge variant="secondary" className="text-xs">
                        Remote
                      </Badge>
                    )}
                  </div>
                  {branch.lastCommit && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <GitCommit className="h-3 w-3" />
                      <span className="font-mono">{branch.lastCommit}</span>
                    </div>
                  )}
                </div>

                {!branch.isCurrent && !branch.isRemote && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))
          )}
        </div>

        {isChangingBranch && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Switching branch...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GitBranchSelector;