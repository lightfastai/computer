'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Instance } from '@/lib/api-client';
import { 
  Folder, 
  File, 
  RefreshCw, 
  Home, 
  ChevronRight, 
  FolderOpen,
  Code,
  Image,
  FileText,
  Archive,
  Loader2,
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitMerge,
  FileCode,
  FilePlus,
  FileMinus,
  FileQuestion,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

interface GitFileExplorerProps {
  instance: Instance;
  onExecuteCommand: (instanceId: string, command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size?: string;
  permissions?: string;
  modified?: string;
  gitStatus?: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'unchanged';
}

interface GitInfo {
  branch: string;
  isRepo: boolean;
  hasChanges: boolean;
}

const GitFileExplorer: React.FC<GitFileExplorerProps> = ({ instance, onExecuteCommand }) => {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null);
  const [gitStatuses, setGitStatuses] = useState<Map<string, string>>(new Map());

  const getGitStatusIcon = (status?: string) => {
    switch (status) {
      case 'modified':
        return <FileCode className="h-4 w-4 text-orange-500" />;
      case 'added':
        return <FilePlus className="h-4 w-4 text-green-500" />;
      case 'deleted':
        return <FileMinus className="h-4 w-4 text-red-500" />;
      case 'renamed':
        return <GitPullRequest className="h-4 w-4 text-blue-500" />;
      case 'untracked':
        return <FileQuestion className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getFileIcon = (fileName: string, type: 'file' | 'directory') => {
    if (type === 'directory') {
      if (fileName === '.git') {
        return <GitBranch className="h-4 w-4 text-purple-500" />;
      }
      return <Folder className="h-4 w-4 text-blue-500" />;
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'ts':
      case 'tsx':
      case 'jsx':
      case 'py':
      case 'rb':
      case 'go':
      case 'rs':
      case 'java':
      case 'c':
      case 'cpp':
      case 'h':
        return <Code className="h-4 w-4 text-green-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return <Image className="h-4 w-4 text-purple-500" />;
      case 'md':
      case 'txt':
      case 'json':
      case 'yml':
      case 'yaml':
      case 'xml':
      case 'html':
      case 'css':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
        return <Archive className="h-4 w-4 text-red-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const loadGitInfo = async (path: string) => {
    try {
      // Check if we're in a git repository
      const gitCheckResult = await onExecuteCommand(instance.id, `cd "${path}" && git rev-parse --is-inside-work-tree 2>/dev/null && echo "GITREPO" || echo "NOTGIT"`);
      const isGitRepo = gitCheckResult.stdout.includes('GITREPO');

      if (isGitRepo) {
        // Get current branch
        const branchResult = await onExecuteCommand(instance.id, `cd "${path}" && git branch --show-current 2>/dev/null || echo "unknown"`);
        const branch = branchResult.stdout.trim() || 'unknown';

        // Check if there are uncommitted changes
        const statusResult = await onExecuteCommand(instance.id, `cd "${path}" && git status --porcelain 2>/dev/null`);
        const hasChanges = statusResult.stdout.trim().length > 0;

        // Get file statuses
        if (statusResult.stdout) {
          const statusMap = new Map<string, string>();
          const lines = statusResult.stdout.split('\n').filter(line => line.trim());
          
          lines.forEach(line => {
            const status = line.substring(0, 2).trim();
            const file = line.substring(3).trim();
            
            let gitStatus = 'unchanged';
            if (status === 'M' || status === 'MM') gitStatus = 'modified';
            else if (status === 'A' || status === 'AM') gitStatus = 'added';
            else if (status === 'D') gitStatus = 'deleted';
            else if (status === 'R') gitStatus = 'renamed';
            else if (status === '??') gitStatus = 'untracked';
            
            statusMap.set(file, gitStatus);
          });
          
          setGitStatuses(statusMap);
        }

        setGitInfo({ branch, isRepo: true, hasChanges });
      } else {
        setGitInfo(null);
        setGitStatuses(new Map());
      }
    } catch (error) {
      console.error('Error loading git info:', error);
      setGitInfo(null);
      setGitStatuses(new Map());
    }
  };

  const parseFileList = (output: string): FileItem[] => {
    const lines = output.split('\n').filter(line => line.trim());
    const items: FileItem[] = [];

    for (const line of lines) {
      // Parse ls -la output
      const parts = line.split(/\s+/);
      if (parts.length >= 9) {
        const permissions = parts[0];
        const size = parts[4];
        const name = parts.slice(8).join(' ');
        
        // Skip . and .. entries for cleaner display
        if (name === '.' || name === '..') continue;

        const type = permissions.startsWith('d') ? 'directory' : 'file';
        const modified = `${parts[5]} ${parts[6]} ${parts[7]}`;

        // Get git status for this file
        const relativePath = currentPath === '/' ? name : `${currentPath.substring(1)}/${name}`;
        const gitStatus = gitStatuses.get(relativePath) || (gitStatuses.has(name) ? gitStatuses.get(name) : 'unchanged');

        items.push({
          name,
          type,
          size: type === 'file' ? size : undefined,
          permissions,
          modified,
          gitStatus: gitStatus as FileItem['gitStatus'],
        });
      }
    }

    return items.sort((a, b) => {
      // Directories first, then files
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const loadDirectory = async (path: string) => {
    setIsLoading(true);
    setSelectedFile(null);
    setFileContent(null);

    try {
      // Load git info first
      await loadGitInfo(path);

      const result = await onExecuteCommand(instance.id, `ls -la "${path}"`);
      if (result.exitCode === 0) {
        const parsedFiles = parseFileList(result.stdout);
        setFiles(parsedFiles);
        setCurrentPath(path);
      } else {
        console.error('Failed to load directory:', result.stderr);
        setFiles([]);
      }
    } catch (error) {
      console.error('Error loading directory:', error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFileContent = async (fileName: string) => {
    setIsLoadingContent(true);
    setSelectedFile(fileName);

    try {
      const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
      
      // For git files, check if it's a binary file first
      const fileTypeResult = await onExecuteCommand(instance.id, `file -b "${filePath}"`);
      const isBinary = fileTypeResult.stdout.toLowerCase().includes('binary') || 
                      fileTypeResult.stdout.toLowerCase().includes('data');
      
      if (isBinary) {
        setFileContent('[Binary file - cannot display]');
      } else {
        const result = await onExecuteCommand(instance.id, `cat "${filePath}"`);
        
        if (result.exitCode === 0) {
          setFileContent(result.stdout);
        } else {
          setFileContent(`Error reading file: ${result.stderr}`);
        }
      }
    } catch (error) {
      setFileContent(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const navigateToDirectory = (dirName: string) => {
    const newPath = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`;
    loadDirectory(newPath);
  };

  const navigateUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDirectory(parentPath);
  };

  const navigateToRoot = () => {
    loadDirectory('/');
  };

  // Load initial directory
  useEffect(() => {
    loadDirectory('/');
  }, []);

  const pathSegments = currentPath.split('/').filter(Boolean);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* File Browser */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Git Repository Explorer - {instance.name}
            {gitInfo?.isRepo && (
              <div className="flex items-center gap-2 ml-auto">
                <GitBranch className="h-4 w-4" />
                <Badge variant={gitInfo.hasChanges ? "destructive" : "secondary"}>
                  {gitInfo.branch}
                  {gitInfo.hasChanges && " *"}
                </Badge>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Browse repository files with git status indicators
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded">
            <Button
              size="sm"
              variant="ghost"
              onClick={navigateToRoot}
              className="h-8 px-2"
            >
              <Home className="h-4 w-4" />
            </Button>
            
            {pathSegments.map((segment, index) => (
              <React.Fragment key={index}>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const segmentPath = '/' + pathSegments.slice(0, index + 1).join('/');
                    loadDirectory(segmentPath);
                  }}
                  className="h-8 px-2"
                >
                  {segment}
                </Button>
              </React.Fragment>
            ))}
            
            <div className="flex-1" />
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadDirectory(currentPath)}
              disabled={isLoading}
              className="h-8"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No files found in this directory</p>
              </div>
            ) : (
              <div className="space-y-1">
                {currentPath !== '/' && (
                  <div
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={navigateUp}
                  >
                    <Folder className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">..</span>
                    <span className="text-sm text-muted-foreground">Parent directory</span>
                  </div>
                )}
                
                {files.map((file) => (
                  <div
                    key={file.name}
                    className={`flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer ${
                      selectedFile === file.name ? 'bg-muted' : ''
                    }`}
                    onClick={() => {
                      if (file.type === 'directory') {
                        navigateToDirectory(file.name);
                      } else {
                        loadFileContent(file.name);
                      }
                    }}
                  >
                    {getFileIcon(file.name, file.type)}
                    {getGitStatusIcon(file.gitStatus)}
                    <div className="flex-1">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {file.type === 'file' && file.size && `${file.size} bytes`}
                        {file.modified && ` • ${file.modified}`}
                        {file.gitStatus && file.gitStatus !== 'unchanged' && (
                          <span className={`ml-2 font-semibold ${
                            file.gitStatus === 'modified' ? 'text-orange-500' :
                            file.gitStatus === 'added' ? 'text-green-500' :
                            file.gitStatus === 'deleted' ? 'text-red-500' :
                            file.gitStatus === 'untracked' ? 'text-gray-500' :
                            'text-blue-500'
                          }`}>
                            • {file.gitStatus}
                          </span>
                        )}
                      </div>
                    </div>
                    {file.type === 'directory' && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Content Viewer */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            File Content
            {selectedFile && (
              <Badge variant="outline" className="ml-2">
                {selectedFile}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {selectedFile ? `Viewing ${selectedFile}` : 'Select a file to view its content'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {isLoadingContent ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : fileContent ? (
            <div className="flex-1 overflow-y-auto">
              <pre className="bg-black text-green-400 font-mono text-sm p-4 rounded border whitespace-pre-wrap">
                {fileContent}
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a file to view its content</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GitFileExplorer;