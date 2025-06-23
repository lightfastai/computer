'use client';

import type { Instance } from '@lightfastai/computer';
import { useEffect, useState } from 'react';
import { FileTree } from '@/components/file-tree';
import { InstanceCreator } from '@/components/instance-creator';
import { InstanceList } from '@/components/instance-list';
import { RepositoryCloner } from '@/components/repository-cloner';
import { ThemeToggle } from '@/components/theme-toggle';
import { useComputer } from '@/hooks/use-computer';
import { type FileNode, useFileTree } from '@/hooks/use-file-tree';

export default function App() {
  const {
    computer,
    instances,
    loading: computerLoading,
    error: computerError,
    createInstance,
    refreshInstances,
    destroyInstance,
  } = useComputer();

  const {
    fileTree,
    selectedFile,
    loading: fileTreeLoading,
    error: fileTreeError,
    initializeFileTree,
    expandDirectory,
    collapseDirectory,
    loadFileContent,
  } = useFileTree();

  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);

  useEffect(() => {
    refreshInstances();
  }, [refreshInstances]);

  const handleSelectInstance = async (instance: Instance) => {
    setSelectedInstance(instance);
    await initializeFileTree(computer, instance.id);
  };

  const handleRepositoryCloned = async () => {
    if (selectedInstance) {
      await initializeFileTree(computer, selectedInstance.id);
    }
  };

  const handleDirectoryToggle = async (node: FileNode) => {
    if (!selectedInstance) return;

    if (node.expanded) {
      collapseDirectory(node);
    } else {
      await expandDirectory(computer, selectedInstance.id, node);
    }
  };

  const handleFileClick = async (node: FileNode) => {
    if (!selectedInstance || node.type !== 'file') return;
    await loadFileContent(computer, selectedInstance.id, node);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1 space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Repo Explorer</h1>
            <p className="text-lg text-muted-foreground">Create instances, clone repositories, and explore code</p>
          </div>
          <ThemeToggle />
        </div>

        {(computerError || fileTreeError) && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {computerError || fileTreeError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InstanceCreator onCreateInstance={createInstance} loading={computerLoading} />

          <InstanceList
            instances={instances}
            selectedInstance={selectedInstance}
            onSelectInstance={handleSelectInstance}
            onDestroyInstance={destroyInstance}
            onRefresh={refreshInstances}
            loading={computerLoading}
          />
        </div>

        {selectedInstance && (
          <RepositoryCloner
            computer={computer}
            instanceId={selectedInstance.id}
            onRepositoryCloned={handleRepositoryCloned}
            loading={computerLoading}
          />
        )}

        {selectedInstance && (
          <FileTree
            fileTree={fileTree}
            selectedFile={selectedFile}
            loading={fileTreeLoading}
            onNodeClick={handleFileClick}
            onDirectoryToggle={handleDirectoryToggle}
          />
        )}
      </div>
    </div>
  );
}
