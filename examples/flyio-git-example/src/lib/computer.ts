import createLightfastComputer from '@lightfastai/computer';

// Create a single SDK instance to be shared across API routes
export const computer = createLightfastComputer({
  provider: 'fly',
  flyApiToken: process.env.FLY_API_TOKEN || '',
  appName: process.env.FLY_APP_NAME || 'lightfast-worker-instances', // required for provider pattern
});

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
