'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Instance } from '@/lib/api-client';
import { 
  GitBranch,
  GitCommit,
  RefreshCw,
  Loader2,
  FileCode,
  FilePlus,
  FileMinus,
  FileQuestion,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

interface GitStatusPanelProps {
  instance: Instance;
  onExecuteCommand: (instanceId: string, command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

interface FileStatus {
  file: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
}

interface RepositoryStatus {
  branch: string;
  isClean: boolean;
  ahead: number;
  behind: number;
  files: FileStatus[];
  hasUntracked: boolean;
  hasStagedChanges: boolean;
}

const GitStatusPanel: React.FC<GitStatusPanelProps> = ({ instance, onExecuteCommand }) => {
  const [status, setStatus] = useState<RepositoryStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'modified':
        return <FileCode className="h-4 w-4 text-orange-500" />;
      case 'added':
        return <FilePlus className="h-4 w-4 text-green-500" />;
      case 'deleted':
        return <FileMinus className="h-4 w-4 text-red-500" />;
      case 'untracked':
        return <FileQuestion className="h-4 w-4 text-gray-500" />;
      default:
        return <FileCode className="h-4 w-4 text-blue-500" />;
    }
  };

  const loadGitStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if we're in a git repository
      const repoCheck = await onExecuteCommand(instance.id, 'git rev-parse --is-inside-work-tree 2>/dev/null');
      
      if (repoCheck.exitCode !== 0) {
        setError('Not in a git repository');
        setStatus(null);
        return;
      }

      // Get current branch
      const branchResult = await onExecuteCommand(instance.id, 'git branch --show-current 2>/dev/null');
      const branch = branchResult.stdout.trim() || 'unknown';

      // Get status porcelain
      const statusResult = await onExecuteCommand(instance.id, 'git status --porcelain');
      
      // Parse file statuses
      const files: FileStatus[] = [];
      let hasUntracked = false;
      let hasStagedChanges = false;

      if (statusResult.stdout) {
        const lines = statusResult.stdout.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          const indexStatus = line[0];
          const workTreeStatus = line[1];
          const fileName = line.substring(3).trim();
          
          let status: FileStatus['status'] = 'modified';
          let staged = false;

          // Determine status based on git status codes
          if (indexStatus === 'A' || workTreeStatus === 'A') {
            status = 'added';
            staged = indexStatus === 'A';
          } else if (indexStatus === 'D' || workTreeStatus === 'D') {
            status = 'deleted';
            staged = indexStatus === 'D';
          } else if (indexStatus === 'R' || workTreeStatus === 'R') {
            status = 'renamed';
            staged = indexStatus === 'R';
          } else if (indexStatus === '?' && workTreeStatus === '?') {
            status = 'untracked';
            hasUntracked = true;
          } else if (indexStatus === 'M' || workTreeStatus === 'M') {
            status = 'modified';
            staged = indexStatus === 'M';
          }

          if (staged) hasStagedChanges = true;

          files.push({
            file: fileName,
            status,
            staged,
          });
        });
      }

      // Get ahead/behind info
      let ahead = 0;
      let behind = 0;
      
      const upstreamResult = await onExecuteCommand(
        instance.id,
        'git rev-list --count --left-right @{upstream}...HEAD 2>/dev/null'
      );
      
      if (upstreamResult.exitCode === 0 && upstreamResult.stdout) {
        const [behindStr, aheadStr] = upstreamResult.stdout.trim().split('\t');
        behind = parseInt(behindStr) || 0;
        ahead = parseInt(aheadStr) || 0;
      }

      setStatus({
        branch,
        isClean: files.length === 0,
        ahead,
        behind,
        files,
        hasUntracked,
        hasStagedChanges,
      });
    } catch (error) {
      console.error('Error loading git status:', error);
      setError('Failed to load git status');
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGitStatus();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <GitCommit className="h-5 w-5" />
          Repository Status
          {status && (
            <Badge 
              variant={status.isClean ? "secondary" : "destructive"} 
              className="ml-auto"
            >
              {status.isClean ? "Clean" : `${status.files.length} changes`}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Current git repository status and changes
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={loadGitStatus}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : status ? (
          <div className="space-y-4">
            {/* Branch Info */}
            <div className="flex items-center justify-between p-3 rounded bg-muted">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span className="font-medium">{status.branch}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {status.ahead > 0 && (
                  <Badge variant="secondary">
                    ↑ {status.ahead} ahead
                  </Badge>
                )}
                {status.behind > 0 && (
                  <Badge variant="secondary">
                    ↓ {status.behind} behind
                  </Badge>
                )}
              </div>
            </div>

            {/* Status Summary */}
            {status.isClean ? (
              <div className="flex items-center gap-2 p-4 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span>Working tree clean - no changes to commit</span>
              </div>
            ) : (
              <>
                {status.hasStagedChanges && (
                  <div className="flex items-center gap-2 p-3 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Info className="h-4 w-4" />
                    <span className="text-sm">You have staged changes ready to commit</span>
                  </div>
                )}

                {/* File Changes */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Changed Files</h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {status.files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                      >
                        {getStatusIcon(file.status)}
                        <span className="flex-1 font-mono text-sm truncate">
                          {file.file}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={file.staged ? "default" : "outline"}
                            className="text-xs"
                          >
                            {file.staged ? "staged" : "unstaged"}
                          </Badge>
                          <Badge 
                            variant="secondary"
                            className="text-xs"
                          >
                            {file.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <GitCommit className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No git repository detected</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GitStatusPanel;