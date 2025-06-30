import { createLightfastComputer, type Instance } from '@lightfastai/computer';

let _computer: ReturnType<typeof createLightfastComputer> | null = null;

function getComputer() {
  if (!_computer) {
    if (!process.env.VERCEL_TOKEN) {
      throw new Error('VERCEL_TOKEN environment variable is required');
    }

    _computer = createLightfastComputer({
      provider: 'vercel',
      vercelToken: process.env.VERCEL_TOKEN,
      projectId: process.env.VERCEL_PROJECT_ID,
      teamId: process.env.VERCEL_TEAM_ID,
      logger: {
        info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
        error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
        debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || ''),
        warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
        level: 'info',
      },
    });
  }
  return _computer;
}

export const computer = {
  get instances() { return getComputer().instances; },
  get commands() { return getComputer().commands; },
};

export type ComputerInstance = Instance;