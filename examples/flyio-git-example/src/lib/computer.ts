import createLightfastComputer from '@lightfastai/computer';

// Lazy initialization to avoid errors during build
let computerInstance: ReturnType<typeof createLightfastComputer> | null = null;

// Create a single SDK instance to be shared across API routes
export function getComputer() {
  if (!computerInstance) {
    computerInstance = createLightfastComputer({
      provider: 'fly',
      flyApiToken: process.env.FLY_API_TOKEN || '',
      appName: process.env.FLY_APP_NAME || 'lightfast-worker-instances', // required for provider pattern
    });
  }
  return computerInstance;
}

// Helper to format error responses with optional technical details
export function formatErrorResponse(error: any) {
  const errorResponse = {
    error: error.message || 'An error occurred',
    ...(process.env.NODE_ENV === 'development' &&
      error.technicalDetails && {
        details: error.technicalDetails,
      }),
  };

  return {
    data: errorResponse,
    status: error.statusCode || 500,
  };
}
