'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SandboxForm from '@/components/sandbox-form';
import SandboxList from '@/components/sandbox-list';
import CommandTerminal from '@/components/command-terminal';
import FileExplorer from '@/components/file-explorer';
import { apiClient, type Instance } from '@/lib/api-client';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function HomePage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const setInstanceLoading = (id: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [id]: loading }));
  };

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    setError(message);
    console.error('Operation failed:', err);
  };

  const loadInstances = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const instances = await apiClient.listInstances();
      setInstances(instances);
      
      // Update selected instance if it still exists
      if (selectedInstance) {
        const updatedInstance = instances.find(i => i.id === selectedInstance.id);
        if (updatedInstance) {
          setSelectedInstance(updatedInstance);
        } else {
          setSelectedInstance(null);
          setActiveTab('overview');
        }
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const createSandbox = async (data: { name: string; repoUrl?: string }) => {
    setError(null);
    
    try {
      await apiClient.createInstance({
        name: data.name,
        repoUrl: data.repoUrl,
      });
      
      await loadInstances();
    } catch (err) {
      handleError(err);
    }
  };

  const startInstance = async (id: string) => {
    setInstanceLoading(id, true);
    setError(null);
    
    try {
      await apiClient.startInstance(id);
      await loadInstances();
    } catch (err) {
      handleError(err);
    } finally {
      setInstanceLoading(id, false);
    }
  };

  const stopInstance = async (id: string) => {
    setInstanceLoading(id, true);
    setError(null);
    
    try {
      await apiClient.stopInstance(id);
      await loadInstances();
    } catch (err) {
      handleError(err);
    } finally {
      setInstanceLoading(id, false);
    }
  };

  const restartInstance = async (id: string) => {
    setInstanceLoading(id, true);
    setError(null);
    
    try {
      await apiClient.restartInstance(id);
      await loadInstances();
    } catch (err) {
      handleError(err);
    } finally {
      setInstanceLoading(id, false);
    }
  };

  const destroyInstance = async (id: string) => {
    setInstanceLoading(id, true);
    setError(null);
    
    try {
      await apiClient.destroyInstance(id);
      
      // Remove from selected instance if it was destroyed
      if (selectedInstance?.id === id) {
        setSelectedInstance(null);
        setActiveTab('overview');
      }
      await loadInstances();
    } catch (err) {
      handleError(err);
    } finally {
      setInstanceLoading(id, false);
    }
  };

  const executeCommand = async (instanceId: string, command: string) => {
    return await apiClient.executeCommand(instanceId, command);
  };

  const handleSelectInstance = (instance: Instance) => {
    setSelectedInstance(instance);
    setActiveTab('terminal');
  };

  // Load instances on component mount
  useEffect(() => {
    loadInstances();
  }, []);

  // Auto-refresh instances every 10 seconds
  useEffect(() => {
    const interval = setInterval(loadInstances, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setError(null)}
              className="ml-2"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {selectedInstance && (
              <>
                <TabsTrigger value="terminal">Terminal</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </>
            )}
          </TabsList>
          
          <Button
            variant="outline"
            onClick={loadInstances}
            disabled={isLoading}
            className="ml-auto"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <SandboxForm
                onSubmit={createSandbox}
                isLoading={isLoading}
              />
            </div>
            
            <div className="lg:col-span-2">
              <SandboxList
                instances={instances}
                onStart={startInstance}
                onStop={stopInstance}
                onRestart={restartInstance}
                onDestroy={destroyInstance}
                onSelectInstance={handleSelectInstance}
                loadingStates={loadingStates}
              />
            </div>
          </div>
        </TabsContent>

        {selectedInstance && (
          <>
            <TabsContent value="terminal">
              <CommandTerminal
                instance={selectedInstance}
                onExecuteCommand={executeCommand}
              />
            </TabsContent>

            <TabsContent value="files">
              <FileExplorer
                instance={selectedInstance}
                onExecuteCommand={executeCommand}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}