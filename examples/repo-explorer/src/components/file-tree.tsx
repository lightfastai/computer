'use client';

import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FileNode } from '@/hooks/use-file-tree';

interface FileTreeProps {
  fileTree: FileNode[];
  selectedFile: FileNode | null;
  loading: boolean;
  onNodeClick: (node: FileNode) => void;
  onDirectoryToggle: (node: FileNode) => void;
}

const FileTreeNode = ({
  node,
  level = 0,
  onNodeClick,
  onDirectoryToggle,
}: {
  node: FileNode;
  level?: number;
  onNodeClick: (node: FileNode) => void;
  onDirectoryToggle: (node: FileNode) => void;
}) => {
  const handleClick = () => {
    if (node.type === 'directory') {
      onDirectoryToggle(node);
    } else {
      onNodeClick(node);
    }
  };

  return (
    <div>
      <div
        className="flex items-center py-1.5 px-2 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm transition-colors"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'directory' && (
          <>
            {node.expanded ? (
              <ChevronDown className="h-4 w-4 mr-1 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground" />
            )}
            {node.expanded ? (
              <FolderOpen className="h-4 w-4 mr-2 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 mr-2 text-blue-500" />
            )}
          </>
        )}
        {node.type === 'file' && <File className="h-4 w-4 mr-2 ml-5 text-muted-foreground" />}
        <span className="text-sm truncate">{node.name}</span>
      </div>

      {node.type === 'directory' && node.expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
              onDirectoryToggle={onDirectoryToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree = ({ fileTree, selectedFile, loading, onNodeClick, onDirectoryToggle }: FileTreeProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px]">
      <Card>
        <CardHeader>
          <CardTitle>File Explorer</CardTitle>
          <CardDescription>Browse repository files and directories</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[480px] overflow-y-auto border-t">
            {loading && fileTree.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">Loading file tree...</div>
            ) : fileTree.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No files found. Clone a repository first.</div>
            ) : (
              <div className="py-2">
                {fileTree.map((node) => (
                  <FileTreeNode
                    key={node.path}
                    node={node}
                    onNodeClick={onNodeClick}
                    onDirectoryToggle={onDirectoryToggle}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>File Viewer</CardTitle>
          <CardDescription>{selectedFile ? selectedFile.name : 'Select a file to view its contents'}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[480px] overflow-auto border-t">
            {selectedFile && selectedFile.content !== undefined ? (
              <pre className="p-4 text-xs font-mono whitespace-pre-wrap bg-muted/50">
                {selectedFile.content || '(empty file)'}
              </pre>
            ) : selectedFile && loading ? (
              <div className="p-4 text-center text-muted-foreground">Loading file content...</div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                Click on a file in the tree to view its contents
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
