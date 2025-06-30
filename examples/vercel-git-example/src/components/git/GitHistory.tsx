'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Instance } from '@/lib/api-client';
import { 
  GitCommit,
  GitBranch,
  Clock,
  User,
  RefreshCw,
  Loader2,
  ChevronRight,
  FileText,
  Code
} from 'lucide-react';

interface GitHistoryProps {
  instance: Instance;
  onExecuteCommand: (instanceId: string, command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  branch?: string;
}

const GitHistory: React.FC<GitHistoryProps> = ({ instance, onExecuteCommand }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [commitDetails, setCommitDetails] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<string>('');

  const loadCommitHistory = async () => {
    setIsLoading(true);
    try {
      // Get current branch
      const branchResult = await onExecuteCommand(instance.id, 'git branch --show-current 2>/dev/null || echo "unknown"');
      const branch = branchResult.stdout.trim();
      setCurrentBranch(branch);

      // Get commit history with detailed format
      const result = await onExecuteCommand(
        instance.id, 
        'git log --pretty=format:"%H|%h|%s|%an|%ad" --date=relative -30'
      );

      if (result.exitCode === 0 && result.stdout.trim()) {
        const parsedCommits = result.stdout
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            const [hash, shortHash, message, author, date] = line.split('|');
            return {
              hash,
              shortHash,
              message,
              author,
              date,
            };
          });

        setCommits(parsedCommits);
      } else {
        setCommits([]);
      }
    } catch (error) {
      console.error('Error loading commit history:', error);
      setCommits([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommitDetails = async (hash: string) => {
    setIsLoadingDetails(true);
    setSelectedCommit(hash);

    try {
      // Get detailed commit information including diff stats
      const result = await onExecuteCommand(
        instance.id,
        `git show --stat --format=medium ${hash}`
      );

      if (result.exitCode === 0) {
        setCommitDetails(result.stdout);
      } else {
        setCommitDetails(`Error loading commit details: ${result.stderr}`);
      }
    } catch (error) {
      setCommitDetails(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    loadCommitHistory();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Commit List */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="h-5 w-5" />
            Commit History
            {currentBranch && (
              <Badge variant="secondary" className="ml-auto">
                <GitBranch className="h-3 w-3 mr-1" />
                {currentBranch}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Recent commits in the repository
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              variant="outline"
              onClick={loadCommitHistory}
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

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : commits.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <GitCommit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No commits found</p>
                <p className="text-sm mt-2">Make sure you're in a git repository</p>
              </div>
            ) : (
              <div className="space-y-2">
                {commits.map((commit) => (
                  <div
                    key={commit.hash}
                    className={`p-3 rounded border cursor-pointer transition-colors ${
                      selectedCommit === commit.hash 
                        ? 'bg-muted border-primary' 
                        : 'hover:bg-muted/50 border-border'
                    }`}
                    onClick={() => loadCommitDetails(commit.hash)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-1">
                        <GitCommit className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {commit.shortHash}
                          </Badge>
                          <span className="text-sm font-medium truncate">
                            {commit.message}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {commit.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {commit.date}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Commit Details */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Commit Details
            {selectedCommit && (
              <Badge variant="outline" className="ml-2 font-mono text-xs">
                {selectedCommit.substring(0, 7)}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {selectedCommit ? 'Detailed commit information and changes' : 'Select a commit to view details'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {isLoadingDetails ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : commitDetails ? (
            <div className="flex-1 overflow-y-auto">
              <pre className="bg-black text-green-400 font-mono text-sm p-4 rounded border whitespace-pre-wrap">
                {commitDetails}
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a commit to view its details</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GitHistory;