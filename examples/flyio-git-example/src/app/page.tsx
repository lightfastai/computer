'use client';

import { FolderTree, GitBranch, Loader2, Play, Plus, RotateCcw, Square, Trash2, FileText, GitCommit, History, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// SDK is used only in API routes, not client-side
// Define types locally to avoid importing from SDK
interface Instance {
  id: string;
  name: string;
  status: string;
  region: string;
  size: string;
  memoryMb: number;
  createdAt: string;
}

interface FileTreeNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

interface GitInfo {
  branches?: string[];
  commits?: { hash: string; message: string }[];
  status?: string;
  clean?: boolean;
  readme?: {
    file: string;
    content: string;
  };
}

export default function Home() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [gitCloneLoading, setGitCloneLoading] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<Record<string, Record<string, string[]>>>({});
  const [gitInfo, setGitInfo] = useState<Record<string, GitInfo>>({});
  const [repoUrl, setRepoUrl] = useState('https://github.com/vercel/next.js');
  const [selectedBranch, setSelectedBranch] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<Record<string, 'files' | 'commits' | 'readme'>>({});

  // Load instances on mount
  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/instances');
      if (!response.ok) {
        throw new Error('Failed to fetch instances');
      }
      const instanceList = await response.json();
      setInstances(instanceList);
    } catch (error) {
      console.error('Failed to load instances:', error);
      toast.error('Failed to load instances');
    } finally {
      setLoading(false);
    }
  };

  const createInstance = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `demo-${Date.now()}`,
          region: 'iad',
          size: 'shared-cpu-1x',
          memoryMb: 512,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create instance');
      }

      const instance = await response.json();
      toast.success(`Instance ${instance.name} created successfully!`);
      await loadInstances();
    } catch (error) {
      console.error('Failed to create instance:', error);
      toast.error(`Failed to create instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const deleteInstance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this instance?')) return;

    setOperationLoading(id);
    try {
      const response = await fetch(`/api/instances/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete instance');
      }
      
      toast.success('Instance deleted successfully!');
      await loadInstances();
      // Clear file tree and git info for deleted instance
      setFileTree((prev) => {
        const newTree = { ...prev };
        delete newTree[id];
        return newTree;
      });
      setGitInfo((prev) => {
        const newInfo = { ...prev };
        delete newInfo[id];
        return newInfo;
      });
      setSelectedBranch((prev) => {
        const newBranch = { ...prev };
        delete newBranch[id];
        return newBranch;
      });
      setActiveTab((prev) => {
        const newTab = { ...prev };
        delete newTab[id];
        return newTab;
      });
    } catch (error) {
      console.error('Failed to delete instance:', error);
      toast.error(`Failed to delete instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const startInstance = async (id: string) => {
    setOperationLoading(id);
    try {
      const response = await fetch(`/api/instances/${id}/start`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start instance');
      }
      
      toast.success('Instance started successfully!');
      await loadInstances();
    } catch (error) {
      console.error('Failed to start instance:', error);
      toast.error(`Failed to start instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const stopInstance = async (id: string) => {
    setOperationLoading(id);
    try {
      const response = await fetch(`/api/instances/${id}/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stop instance');
      }
      
      toast.success('Instance stopped successfully!');
      await loadInstances();
    } catch (error) {
      console.error('Failed to stop instance:', error);
      toast.error(`Failed to stop instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const restartInstance = async (id: string) => {
    setOperationLoading(id);
    try {
      const response = await fetch(`/api/instances/${id}/restart`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restart instance');
      }
      
      toast.success('Instance restarted successfully!');
      await loadInstances();
    } catch (error) {
      console.error('Failed to restart instance:', error);
      toast.error(`Failed to restart instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(null);
    }
  };

  const cloneRepository = async (instanceId: string, url: string) => {
    setGitCloneLoading(instanceId);
    try {
      // Clone the repository
      const cloneResponse = await fetch('/api/git', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceId,
          operation: 'clone',
          repoUrl: url,
        }),
      });

      if (!cloneResponse.ok) {
        const errorData = await cloneResponse.json();
        throw new Error(errorData.error || 'Failed to clone repository');
      }

      // Load complete git information
      await loadGitInfo(instanceId);
      
      // Set default tab to files
      setActiveTab(prev => ({ ...prev, [instanceId]: 'files' }));

      toast.success('Repository cloned successfully!');
    } catch (error) {
      console.error('Failed to clone repository:', error);
      toast.error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGitCloneLoading(null);
    }
  };

  const loadGitInfo = async (instanceId: string) => {
    try {
      // Load file tree
      const treeResponse = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, operation: 'tree' }),
      });

      // Load branches
      const branchResponse = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, operation: 'branches' }),
      });

      // Load commits
      const commitResponse = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, operation: 'log' }),
      });

      // Load README
      const readmeResponse = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, operation: 'readme' }),
      });

      const [treeData, branchData, commitData, readmeData] = await Promise.all([
        treeResponse.ok ? treeResponse.json() : null,
        branchResponse.ok ? branchResponse.json() : null,
        commitResponse.ok ? commitResponse.json() : null,
        readmeResponse.ok ? readmeResponse.json() : null,
      ]);

      if (treeData) {
        setFileTree(prev => ({ ...prev, [instanceId]: treeData.fileTree }));
      }

      const newGitInfo: GitInfo = {};
      if (branchData?.branches) {
        newGitInfo.branches = branchData.branches;
      }
      if (commitData?.commits) {
        newGitInfo.commits = commitData.commits;
      }
      if (readmeData?.readmeFile) {
        newGitInfo.readme = {
          file: readmeData.readmeFile,
          content: readmeData.content,
        };
      }

      setGitInfo(prev => ({ ...prev, [instanceId]: newGitInfo }));
    } catch (error) {
      console.error('Failed to load git info:', error);
    }
  };

  const switchBranch = async (instanceId: string, branch: string) => {
    try {
      const response = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, operation: 'checkout', branch }),
      });

      if (response.ok) {
        setSelectedBranch(prev => ({ ...prev, [instanceId]: branch }));
        await loadGitInfo(instanceId); // Reload info for new branch
        toast.success(`Switched to branch: ${branch}`);
      }
    } catch (error) {
      console.error('Failed to switch branch:', error);
      toast.error('Failed to switch branch');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'status-running';
      case 'stopped':
        return 'status-stopped';
      case 'failed':
        return 'status-failed';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading instances...</span>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Fly.io Git Explorer</h2>
            <p className="text-gray-600 dark:text-gray-400">Clone repositories, explore files, and manage git operations on Ubuntu instances</p>
          </div>
          <button
            onClick={createInstance}
            disabled={creating}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {creating ? 'Creating...' : 'Create Instance'}
          </button>
        </div>
      </div>

      {/* Git Clone Section */}
      <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <GitBranch className="h-5 w-5 mr-2 text-blue-600" />
          Git Repository Clone
        </h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Repository URL</label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Instances Grid */}
      {instances.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <FolderTree className="h-16 w-16 mx-auto mb-4" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No instances yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first Ubuntu instance to start exploring repositories</p>
          <button
            onClick={createInstance}
            disabled={creating}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {creating ? 'Creating...' : 'Create First Instance'}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => (
            <div key={instance.id} className="instance-card">
              {/* Instance Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{instance.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {instance.region} • {instance.size}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(instance.status)}`}>
                  {instance.status}
                </span>
              </div>

              {/* Instance Details */}
              <div className="space-y-2 mb-4">
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">ID:</span>
                  <span className="ml-2 font-mono text-gray-900 dark:text-white">{instance.id.slice(0, 12)}...</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Memory:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{instance.memoryMb}MB</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Created:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {new Date(instance.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {instance.status === 'stopped' && (
                  <button
                    onClick={() => startInstance(instance.id)}
                    disabled={operationLoading === instance.id}
                    className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                  >
                    {operationLoading === instance.id ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Play className="h-3 w-3 mr-1" />
                    )}
                    Start
                  </button>
                )}
                {instance.status === 'running' && (
                  <>
                    <button
                      onClick={() => stopInstance(instance.id)}
                      disabled={operationLoading === instance.id}
                      className="flex items-center px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                    >
                      {operationLoading === instance.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Square className="h-3 w-3 mr-1" />
                      )}
                      Stop
                    </button>
                    <button
                      onClick={() => restartInstance(instance.id)}
                      disabled={operationLoading === instance.id}
                      className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                    >
                      {operationLoading === instance.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <RotateCcw className="h-3 w-3 mr-1" />
                      )}
                      Restart
                    </button>
                  </>
                )}
                <button
                  onClick={() => deleteInstance(instance.id)}
                  disabled={operationLoading === instance.id}
                  className="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                >
                  {operationLoading === instance.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-3 w-3 mr-1" />
                  )}
                  Delete
                </button>
              </div>

              {/* Git Clone Section */}
              {instance.status === 'running' && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => cloneRepository(instance.id, repoUrl)}
                      disabled={gitCloneLoading === instance.id}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                    >
                      {gitCloneLoading === instance.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <GitBranch className="h-4 w-4 mr-2" />
                      )}
                      {gitCloneLoading === instance.id ? 'Cloning...' : 'Clone Repo'}
                    </button>
                  </div>

                  {/* Branch Selector */}
                  {gitInfo[instance.id]?.branches && (
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Switch Branch
                      </label>
                      <select
                        value={selectedBranch[instance.id] || 'main'}
                        onChange={(e) => switchBranch(instance.id, e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {gitInfo[instance.id].branches?.map((branch) => (
                          <option key={branch} value={branch}>
                            {branch}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Repository Explorer */}
                  {fileTree[instance.id] && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded border">
                      {/* Tab Navigation */}
                      <div className="flex border-b border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => setActiveTab(prev => ({ ...prev, [instance.id]: 'files' }))}
                          className={`flex items-center px-3 py-2 text-xs font-medium ${
                            activeTab[instance.id] === 'files'
                              ? 'text-blue-600 border-b-2 border-blue-600'
                              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                          }`}
                        >
                          <FolderTree className="h-3 w-3 mr-1" />
                          Files
                        </button>
                        <button
                          onClick={() => setActiveTab(prev => ({ ...prev, [instance.id]: 'commits' }))}
                          className={`flex items-center px-3 py-2 text-xs font-medium ${
                            activeTab[instance.id] === 'commits'
                              ? 'text-blue-600 border-b-2 border-blue-600'
                              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                          }`}
                        >
                          <GitCommit className="h-3 w-3 mr-1" />
                          Commits
                        </button>
                        {gitInfo[instance.id]?.readme && (
                          <button
                            onClick={() => setActiveTab(prev => ({ ...prev, [instance.id]: 'readme' }))}
                            className={`flex items-center px-3 py-2 text-xs font-medium ${
                              activeTab[instance.id] === 'readme'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            README
                          </button>
                        )}
                      </div>

                      {/* Tab Content */}
                      <div className="p-3">
                        {/* Files Tab */}
                        {activeTab[instance.id] === 'files' && (
                          <div className="max-h-48 overflow-y-auto">
                            {Object.entries(fileTree[instance.id]).map(([dir, files]) => (
                              <div key={dir} className="mb-3">
                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                  📁 {dir === '.' ? 'Root' : dir}
                                </div>
                                <div className="ml-4 space-y-1">
                                  {files.map((file, index) => (
                                    <div key={index} className="text-xs text-gray-700 dark:text-gray-300 flex items-center">
                                      <FileText className="h-3 w-3 mr-1 text-gray-400" />
                                      {file}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Commits Tab */}
                        {activeTab[instance.id] === 'commits' && gitInfo[instance.id]?.commits && (
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {gitInfo[instance.id].commits?.map((commit, index) => (
                              <div key={index} className="text-xs border-l-2 border-blue-200 pl-2">
                                <div className="font-mono text-gray-500 dark:text-gray-400">
                                  {commit.hash}
                                </div>
                                <div className="text-gray-700 dark:text-gray-300">
                                  {commit.message}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* README Tab */}
                        {activeTab[instance.id] === 'readme' && gitInfo[instance.id]?.readme && (
                          <div className="max-h-48 overflow-y-auto">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                              📄 {gitInfo[instance.id].readme?.file}
                            </div>
                            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {gitInfo[instance.id].readme?.content}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
