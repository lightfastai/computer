import { nanoid } from 'nanoid';
import pino from 'pino';
import { FlyService } from './fly-service';
import { SSHService, CommandResult } from './ssh-service';
import {
  Instance,
  InstanceStatus,
  CreateInstanceOptions,
  CommandExecution,
  CommandStatus,
} from '../types';
import { NotFoundError } from '../lib/error-handler';

const log = pino();

export class InstanceService {
  private instances: Map<string, Instance> = new Map();
  private commandExecutions: Map<string, CommandExecution> = new Map();

  constructor(
    private flyService: FlyService,
    private sshService: SSHService
  ) {}

  async createInstance(options: CreateInstanceOptions): Promise<Instance> {
    const instanceId = nanoid();
    
    // Create instance record
    const instance: Instance = {
      id: instanceId,
      flyMachineId: '',
      name: options.name || `instance-${instanceId}`,
      region: options.region || 'sea',
      image: options.image || 'ubuntu:22.04',
      size: options.size || 'shared-cpu-1x',
      memoryMb: options.memoryMb || 512,
      status: InstanceStatus.CREATING,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: options.metadata,
    };

    this.instances.set(instanceId, instance);

    try {
      // Create Fly machine
      const flyMachine = await this.flyService.createMachine(options);
      
      // Update instance with Fly machine details
      instance.flyMachineId = flyMachine.id;
      instance.privateIpAddress = flyMachine.private_ip;
      instance.status = InstanceStatus.RUNNING;
      instance.updatedAt = new Date();
      
      // Get public IP (if available)
      // Note: Fly.io machines might not have public IPs by default
      // You might need to allocate one separately
      
      this.instances.set(instanceId, instance);
      
      log.info(`Instance ${instanceId} created successfully`);
      return instance;
    } catch (error) {
      instance.status = InstanceStatus.FAILED;
      instance.updatedAt = new Date();
      this.instances.set(instanceId, instance);
      throw error;
    }
  }

  async getInstance(instanceId: string): Promise<Instance> {
    const instance = this.instances.get(instanceId);
    
    if (!instance) {
      throw new NotFoundError('Instance', instanceId);
    }

    // Update status from Fly.io
    if (instance.flyMachineId && instance.status === InstanceStatus.RUNNING) {
      try {
        const flyMachine = await this.flyService.getMachine(instance.flyMachineId);
        
        // Map Fly machine state to instance status
        switch (flyMachine.state) {
          case 'started':
            instance.status = InstanceStatus.RUNNING;
            break;
          case 'stopped':
            instance.status = InstanceStatus.STOPPED;
            break;
          case 'destroyed':
            instance.status = InstanceStatus.DESTROYED;
            break;
          default:
            // Keep current status
        }
        
        instance.updatedAt = new Date();
        this.instances.set(instanceId, instance);
      } catch (error) {
        log.error(`Failed to update instance ${instanceId} status:`, error);
      }
    }

    return instance;
  }

  async listInstances(): Promise<Instance[]> {
    // Update all instance statuses
    const instances = Array.from(this.instances.values());
    
    // Filter out destroyed instances older than 1 hour
    const activeInstances = instances.filter(instance => {
      if (instance.status === InstanceStatus.DESTROYED) {
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return instance.updatedAt > hourAgo;
      }
      return true;
    });

    return activeInstances;
  }

  async stopInstance(instanceId: string): Promise<Instance> {
    const instance = await this.getInstance(instanceId);
    
    if (instance.status !== InstanceStatus.RUNNING) {
      throw new Error(`Instance ${instanceId} is not running`);
    }

    await this.flyService.stopMachine(instance.flyMachineId);
    
    instance.status = InstanceStatus.STOPPED;
    instance.updatedAt = new Date();
    this.instances.set(instanceId, instance);
    
    // Disconnect SSH
    this.sshService.disconnect(instanceId);
    
    return instance;
  }

  async startInstance(instanceId: string): Promise<Instance> {
    const instance = await this.getInstance(instanceId);
    
    if (instance.status !== InstanceStatus.STOPPED) {
      throw new Error(`Instance ${instanceId} is not stopped`);
    }

    await this.flyService.startMachine(instance.flyMachineId);
    
    instance.status = InstanceStatus.RUNNING;
    instance.updatedAt = new Date();
    this.instances.set(instanceId, instance);
    
    return instance;
  }

  async destroyInstance(instanceId: string): Promise<void> {
    const instance = await this.getInstance(instanceId);
    
    if (instance.status === InstanceStatus.DESTROYED) {
      return;
    }

    instance.status = InstanceStatus.DESTROYING;
    instance.updatedAt = new Date();
    this.instances.set(instanceId, instance);

    try {
      // Disconnect SSH first
      this.sshService.disconnect(instanceId);
      
      // Destroy Fly machine
      await this.flyService.destroyMachine(instance.flyMachineId);
      
      instance.status = InstanceStatus.DESTROYED;
      instance.updatedAt = new Date();
      this.instances.set(instanceId, instance);
      
      log.info(`Instance ${instanceId} destroyed successfully`);
    } catch (error) {
      instance.status = InstanceStatus.FAILED;
      instance.updatedAt = new Date();
      this.instances.set(instanceId, instance);
      throw error;
    }
  }

  async executeCommand(
    instanceId: string,
    command: string,
    options?: { timeout?: number }
  ): Promise<CommandExecution> {
    const instance = await this.getInstance(instanceId);
    
    if (instance.status !== InstanceStatus.RUNNING) {
      throw new Error(`Instance ${instanceId} is not running`);
    }

    const executionId = nanoid();
    const execution: CommandExecution = {
      id: executionId,
      instanceId,
      command,
      status: CommandStatus.PENDING,
      startedAt: new Date(),
    };

    this.commandExecutions.set(executionId, execution);

    try {
      // Ensure SSH connection
      await this.ensureSSHConnection(instance);
      
      execution.status = CommandStatus.RUNNING;
      this.commandExecutions.set(executionId, execution);
      
      // Execute command
      const result = await this.sshService.executeCommand(
        instanceId,
        command,
        options
      );
      
      execution.status = CommandStatus.COMPLETED;
      execution.output = result.stdout;
      execution.error = result.stderr;
      execution.exitCode = result.exitCode;
      execution.completedAt = new Date();
      
      this.commandExecutions.set(executionId, execution);
      
      log.info(`Command executed on instance ${instanceId}: ${command}`);
      return execution;
    } catch (error) {
      execution.status = CommandStatus.FAILED;
      execution.error = error.message;
      execution.completedAt = new Date();
      
      this.commandExecutions.set(executionId, execution);
      throw error;
    }
  }

  async getCommandExecution(executionId: string): Promise<CommandExecution> {
    const execution = this.commandExecutions.get(executionId);
    
    if (!execution) {
      throw new NotFoundError('CommandExecution', executionId);
    }

    return execution;
  }

  async createShellSession(instanceId: string): Promise<NodeJS.ReadWriteStream> {
    const instance = await this.getInstance(instanceId);
    
    if (instance.status !== InstanceStatus.RUNNING) {
      throw new Error(`Instance ${instanceId} is not running`);
    }

    await this.ensureSSHConnection(instance);
    
    return this.sshService.createShellSession(instanceId);
  }

  private async ensureSSHConnection(instance: Instance): Promise<void> {
    // Try to connect if not already connected
    try {
      await this.sshService.connect(instance.id, {
        host: instance.ipAddress || instance.privateIpAddress!,
        username: 'root',
      });
    } catch (error) {
      // Connection might already exist, which is fine
      log.debug(`SSH connection check for instance ${instance.id}:`, error.message);
    }
  }
}