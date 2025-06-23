# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-06-23

### Fixed
- Serverless platform compatibility by changing build target from `node` to `browser`
- Removed Node.js-specific imports (`node:module`) from bundled output
- Reduced bundle size from 298KB to 184KB
- Fixed import errors in Convex and other serverless environments

## [0.2.0] - 2025-06-23

### Added
- Custom `appName` parameter to `createLightfastComputer()` for configuring Fly.io app names
- Custom `logger` parameter to `createLightfastComputer()` for flexible logging implementations
- Enhanced error propagation with `technicalDetails` property on all error classes
- Better error logging with technical details from Fly.io API responses
- Support for `provisioning` and `unknown` instance statuses

### Changed
- **BREAKING** (Internal): Service methods now require `appName` and `logger` parameters (SDK handles this automatically)
- Replaced `node:child_process` dependency with REST API calls for serverless compatibility
- Command execution now uses Fly.io's REST API exec endpoint instead of CLI wrapper
- Improved error messages to include Fly.io API error details for better debugging

### Fixed
- Fly.io exec API integration: corrected request format (cmd as string, timeout in seconds)
- Next.js example app to use shared computer instance
- Import ordering and code formatting issues

### Removed
- Dependency on `node:child_process` for full serverless platform compatibility

## [0.1.1] - 2025-06-22

### Fixed
- Suppressed Pino logger output during test execution for cleaner test runs
- Resolved CI test failures and circular import issues
- Updated documentation to reflect removal of environment variable dependency

### Changed
- Updated Claude AI settings for better development experience

## [0.1.0] - 2025-06-22

### Added
- Initial release of @lightfastai/computer SDK
- Core instance management functionality (create, start, stop, restart, destroy)
- Command execution support with streaming output
- GitHub repository integration for cloning and authentication
- Comprehensive error handling with neverthrow Result types
- TypeScript support with full type definitions
- Instance health checking and statistics
- Batch operations (stopAll, destroyAll)
- Zod schema validation for all inputs
- Pino structured logging
- Support for multiple Fly.io regions and machine sizes

### Security
- Input validation for all API endpoints
- Secure handling of GitHub tokens and credentials
- Command execution whitelist for security

[0.2.1]: https://github.com/lightfastai/computer/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/lightfastai/computer/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/lightfastai/computer/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/lightfastai/computer/releases/tag/v0.1.0