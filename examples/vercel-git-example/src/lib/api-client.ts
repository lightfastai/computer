export interface Instance {
  id: string;
  name: string;
  status: 'creating' | 'running' | 'stopped' | 'destroyed';
  createdAt: string;
  lastActivity?: string;
  error?: string;
}

export interface CreateInstanceData {
  name: string;
  repoUrl?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export const apiClient = {
  async listInstances(): Promise<Instance[]> {
    const response = await fetch('/api/instances');
    if (!response.ok) {
      throw new Error('Failed to fetch instances');
    }
    const data = await response.json();
    return data.instances;
  },

  async createInstance(data: CreateInstanceData): Promise<Instance> {
    const response = await fetch('/api/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create instance');
    }
    const result = await response.json();
    return result.instance;
  },

  async startInstance(id: string): Promise<void> {
    const response = await fetch(`/api/instances/${id}/start`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to start instance');
    }
  },

  async stopInstance(id: string): Promise<void> {
    const response = await fetch(`/api/instances/${id}/stop`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to stop instance');
    }
  },

  async restartInstance(id: string): Promise<void> {
    const response = await fetch(`/api/instances/${id}/restart`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to restart instance');
    }
  },

  async destroyInstance(id: string): Promise<void> {
    const response = await fetch(`/api/instances/${id}/destroy`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to destroy instance');
    }
  },

  async executeCommand(instanceId: string, command: string): Promise<CommandResult> {
    const response = await fetch('/api/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId, command }),
    });
    if (!response.ok) {
      throw new Error('Failed to execute command');
    }
    return response.json();
  },
};