import { Context, Next } from 'hono';
import { config } from '../../lib/config';
import { AuthenticationError } from '../../lib/error-handler';

export async function authMiddleware(c: Context, next: Next) {
  // Skip auth if no API key is configured (development mode)
  if (!config.apiKey) {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    throw new AuthenticationError('Authorization header required');
  }

  const [scheme, token] = authHeader.split(' ');
  
  if (scheme !== 'Bearer' || !token) {
    throw new AuthenticationError('Invalid authorization format. Use: Bearer <token>');
  }

  if (token !== config.apiKey) {
    throw new AuthenticationError('Invalid API key');
  }

  return next();
}