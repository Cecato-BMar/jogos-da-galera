const LOCAL_FRONTEND_URL = 'http://localhost:3000';

export function getAllowedOrigins() {
  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return Array.from(new Set([LOCAL_FRONTEND_URL, ...configuredOrigins]));
}
