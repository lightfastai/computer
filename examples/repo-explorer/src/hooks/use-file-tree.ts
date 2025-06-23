import type { LightfastComputerSDK } from '@lightfastai/computer';
import { useCallback, useState } from 'react';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  content?: string;
  expanded?: boolean;
}

export const useFileTree = () => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDirectoryContents = useCallback(async (computer: LightfastComputerSDK, instanceId: string, path = '.') => {
    setLoading(true);
    setError(null);

    try {
      const result = await computer.commands.execute({
        instanceId,
        command: `find ${path} -maxdepth 1 -type f -o -type d | head -100 | sort`,
      });

      if (result.isErr()) {
        setError(result.error.userMessage);
        return [];
      }

      const output = result.value.output;
      const lines = output.split('\n').filter((line: string) => line.trim() && line !== path);

      const nodes: FileNode[] = [];

      for (const line of lines) {
        const trimmedPath = line.trim();
        const name = trimmedPath.split('/').pop() || trimmedPath;

        const typeResult = await computer.commands.execute({
          instanceId,
          command: `test -d "${trimmedPath}" && echo "directory" || echo "file"`,
        });

        if (typeResult.isOk()) {
          const type = typeResult.value.output.trim() as 'file' | 'directory';

          nodes.push({
            name,
            path: trimmedPath,
            type,
            children: type === 'directory' ? [] : undefined,
            expanded: false,
          });
        }
      }

      return nodes;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load directory contents';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const expandDirectory = useCallback(
    async (computer: LightfastComputerSDK, instanceId: string, node: FileNode) => {
      if (node.type !== 'directory' || node.expanded) return;

      const children = await loadDirectoryContents(computer, instanceId, node.path);

      setFileTree((prev) => {
        const updateNode = (nodes: FileNode[]): FileNode[] => {
          return nodes.map((n) => {
            if (n.path === node.path) {
              return { ...n, children, expanded: true };
            }
            if (n.children) {
              return { ...n, children: updateNode(n.children) };
            }
            return n;
          });
        };
        return updateNode(prev);
      });
    },
    [loadDirectoryContents],
  );

  const collapseDirectory = useCallback((node: FileNode) => {
    setFileTree((prev) => {
      const updateNode = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((n) => {
          if (n.path === node.path) {
            return { ...n, expanded: false };
          }
          if (n.children) {
            return { ...n, children: updateNode(n.children) };
          }
          return n;
        });
      };
      return updateNode(prev);
    });
  }, []);

  const loadFileContent = useCallback(async (computer: LightfastComputerSDK, instanceId: string, file: FileNode) => {
    if (file.type !== 'file') return;

    setLoading(true);
    setError(null);

    try {
      const result = await computer.commands.execute({
        instanceId,
        command: `cat "${file.path}" | head -1000`,
      });

      if (result.isErr()) {
        setError(result.error.userMessage);
        return;
      }

      const content = result.value.output;
      const updatedFile = { ...file, content };
      setSelectedFile(updatedFile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load file content';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const initializeFileTree = useCallback(
    async (computer: LightfastComputerSDK, instanceId: string) => {
      const rootNodes = await loadDirectoryContents(computer, instanceId, '.');
      setFileTree(rootNodes);
    },
    [loadDirectoryContents],
  );

  return {
    fileTree,
    selectedFile,
    loading,
    error,
    initializeFileTree,
    expandDirectory,
    collapseDirectory,
    loadFileContent,
    setSelectedFile,
  };
};
