export const testData = {
  instances: {
    valid: {
      name: 'test-instance-e2e',
      token: process.env.FLY_API_TOKEN || 'fly_test_token_123',
    },
    invalid: {
      name: '',
      token: '',
    },
  },
  repositories: {
    valid: [
      'https://github.com/facebook/react',
      'https://github.com/vercel/next.js',
      'https://github.com/microsoft/vscode',
    ],
    invalid: [
      'not-a-url',
      'http://not-github.com/repo',
      'github.com/missing-protocol',
    ],
  },
};