import { AppError } from '@/lib/error-handler';
import * as flyService from '@/services/fly-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('fly-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMachine', () => {
    it('should create a machine successfully', async () => {
      const mockMachine = {
        id: 'machine-123',
        name: 'test-machine',
        state: 'started',
        region: 'iad',
        image: 'ubuntu-22.04',
        private_ip: 'fdaa:0:1234::5',
      };

      // Mock the createMachine call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMachine,
      });

      // Mock the waitForMachineReady calls (getMachine)
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockMachine,
      });

      const result = await flyService.createMachine({
        name: 'test-machine',
        region: 'iad',
      });

      expect(result).toEqual(mockMachine);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/machines'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should throw AppError when API returns error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => 'Invalid machine configuration',
      });

      await expect(flyService.createMachine({ name: 'test' })).rejects.toThrow(AppError);
    });
  });

  describe('getMachine', () => {
    it('should get a machine by id', async () => {
      const mockMachine = {
        id: 'machine-123',
        state: 'started',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMachine,
      });

      const result = await flyService.getMachine('machine-123');

      expect(result).toEqual(mockMachine);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/machines/machine-123'),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });
  });

  describe('destroyMachine', () => {
    it('should destroy a machine', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await flyService.destroyMachine('machine-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/machines/machine-123'),
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });
  });

  describe('parseMachineSize', () => {
    it('should parse machine sizes correctly', () => {
      expect(flyService.parseMachineSize('shared-cpu-1x')).toEqual({
        kind: 'shared',
        cpus: 1,
      });

      expect(flyService.parseMachineSize('performance-2x')).toEqual({
        kind: 'performance',
        cpus: 2,
      });

      expect(flyService.parseMachineSize('unknown-size')).toEqual({
        kind: 'shared',
        cpus: 1,
      });
    });
  });
});
