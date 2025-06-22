import { NotFoundError, ValidationError } from '@/lib/error-handler';
import * as commandService from '@/services/command-service';
import * as instanceService from '@/services/instance-service';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { z } from 'zod';

export const commandRoutes = new Hono();

// Schema for command execution request
const executeCommandSchema = z.object({
  command: z.string().min(1).max(1000),
  args: z.array(z.string()).optional().default([]),
  timeout: z.number().min(1000).max(300000).optional().default(30000), // 30s default, max 5min
});

// Execute command in instance with streaming output
commandRoutes.post('/:instanceId/exec', zValidator('json', executeCommandSchema), async (c) => {
  const instanceId = c.req.param('instanceId');
  const { command, args, timeout } = c.req.valid('json');

  // Validate instance exists and is running
  const instanceResult = await instanceService.getInstance(instanceId);
  if (instanceResult.isErr()) {
    throw instanceResult.error;
  }

  const instance = instanceResult.value;
  if (instance.status !== 'running') {
    throw new ValidationError(`Instance ${instanceId} is not running`);
  }

  // Security check - validate allowed commands
  const allowedCommands = ['ls', 'grep', 'find', 'cat', 'echo', 'pwd', 'env', 'ps', 'df', 'du'];
  const baseCommand = command.split(' ')[0];
  if (!allowedCommands.includes(baseCommand)) {
    throw new ValidationError(`Command '${baseCommand}' is not allowed`);
  }

  // Set headers for Server-Sent Events
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Stream the command output
  return stream(c, async (stream) => {
    const encoder = new TextEncoder();

    // Send initial event
    await stream.write(
      encoder.encode(
        `data: ${JSON.stringify({
          type: 'status',
          message: `Executing command: ${command} ${args.join(' ')}`,
        })}\n\n`,
      ),
    );

    // Execute command with streaming callbacks
    const result = await commandService.executeCommand({
      instanceId,
      machineId: instance.flyMachineId,
      command,
      args,
      timeout,
      onData: async (data) => {
        await stream.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'stdout',
              data: data,
            })}\n\n`,
          ),
        );
      },
      onError: async (error) => {
        await stream.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'stderr',
              data: error,
            })}\n\n`,
          ),
        );
      },
    });

    // Send completion event
    if (result.isOk()) {
      await stream.write(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'complete',
            exitCode: result.value.exitCode,
            output: result.value.output,
            error: result.value.error,
          })}\n\n`,
        ),
      );
    } else {
      await stream.write(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'error',
            message: result.error.userMessage,
          })}\n\n`,
        ),
      );
    }

    // Close the stream
    await stream.close();
  });
});

// Get command history for an instance
commandRoutes.get('/:instanceId/history', async (c) => {
  const instanceId = c.req.param('instanceId');

  const instanceResult = await instanceService.getInstance(instanceId);
  if (instanceResult.isErr()) {
    throw instanceResult.error;
  }

  const history = await commandService.getCommandHistory(instanceId);

  return c.json({
    instanceId,
    history,
  });
});
