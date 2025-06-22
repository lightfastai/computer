# Lightfast Computer - Next.js Example

This is a Next.js example application demonstrating how to use the **@lightfast/computer** SDK to create and manage Ubuntu instances on Fly.io.

## Features

🚀 **Instance Management**
- Create new Ubuntu instances on Fly.io
- Start, stop, and restart instances
- Delete instances when no longer needed
- Real-time status monitoring

💻 **Git Integration**
- Clone GitHub repositories directly to instances
- View file tree structure of cloned repositories
- Execute commands on remote instances

🎨 **Modern UI**
- Responsive design with Tailwind CSS
- Dark mode support
- Real-time notifications with react-hot-toast
- Loading states and error handling

## Getting Started

### Prerequisites

- Node.js 18+
- A Fly.io account and API token
- The parent `@lightfast/computer` package built locally

### Installation

1. **Clone and navigate to this directory:**
   ```bash
   cd examples/nextjs-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Fly.io API token:
   ```env
   FLY_API_TOKEN=your_actual_fly_api_token_here
   ```

4. **Build the parent SDK package:**
   ```bash
   cd ../..
   bun run build
   cd examples/nextjs-app
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How to Use

### Creating Instances

1. Click the **"Create Instance"** button
2. Wait for the instance to be provisioned on Fly.io
3. The instance will appear in the grid with a "running" status

### Managing Instances

For each instance, you can:
- **Start/Stop**: Control the instance state
- **Restart**: Reboot the instance
- **Delete**: Permanently remove the instance

### Cloning Repositories

1. Enter a GitHub repository URL (default: `https://github.com/vercel/next.js`)
2. For running instances, click **"Clone Repo"**
3. The repository will be cloned to the instance
4. View the file tree showing the cloned files

## Technical Implementation

### SDK Usage

```typescript
import createLightfastComputer from '@lightfast/computer';

// Initialize the SDK
const sdk = createLightfastComputer();

// Create an instance
const result = await sdk.instances.create({
  name: 'my-instance',
  region: 'iad',
  size: 'shared-cpu-1x',
  memoryMb: 512,
});

if (result.isOk()) {
  console.log('Instance created:', result.value);
} else {
  console.error('Error:', result.error.message);
}
```

### Error Handling

The SDK uses the `neverthrow` Result pattern for type-safe error handling:

```typescript
const result = await sdk.instances.get('instance-id');

result.match(
  (instance) => {
    // Success case
    console.log('Instance:', instance);
  },
  (error) => {
    // Error case
    console.error('Failed to get instance:', error.message);
  }
);
```

### Real-time Updates

The app uses React state management to provide real-time updates:
- Instance list refreshes after operations
- Loading states during API calls
- Toast notifications for user feedback
- Optimistic UI updates where appropriate

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `FLY_API_TOKEN` | Your Fly.io API token | Yes | - |
| `NODE_ENV` | Environment mode | No | `development` |
| `LOG_LEVEL` | Logging level | No | `info` |

## Getting Your Fly.io API Token

1. Go to [Fly.io Personal Access Tokens](https://fly.io/user/personal_access_tokens)
2. Click **"Create Token"**
3. Give it a name (e.g., "Lightfast Computer SDK")
4. Copy the token and add it to your `.env.local` file

## Project Structure

```
src/
├── app/
│   ├── globals.css      # Tailwind styles and custom CSS
│   ├── layout.tsx       # Root layout with header and toast provider
│   └── page.tsx         # Main application page
└── components/          # (Future: reusable components)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Dependencies

### Core
- **Next.js 14** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon components

### SDK & Utilities
- **@lightfast/computer** - Fly.io instance management SDK
- **react-hot-toast** - Toast notifications
- **clsx** - Conditional className utility

## Troubleshooting

### "Failed to load instances"
- Check that your `FLY_API_TOKEN` is set correctly
- Verify the token has the necessary permissions
- Check the browser console for detailed error messages

### Instance creation fails
- Ensure your Fly.io account has sufficient resources
- Check if the region `iad` is available for your account
- Try a different instance size if needed

### Repository cloning fails
- Ensure the instance is in "running" state
- Check that the repository URL is accessible
- Large repositories may take longer to clone

## Contributing

This example is part of the Lightfast Computer project. To contribute:

1. Fork the main repository
2. Create a feature branch
3. Make your changes
4. Test with this example app
5. Submit a pull request

## License

MIT - see the main project license for details.
