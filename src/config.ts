
export const CONFIG = Object.freeze({
  isProduction: process.env['PRODUCTION_FLAG'] || false,
  port: process.env['PORT'] || 8080,
  jwtSecret: process.env['JWT_SECRET'] || 'MxnflwpEKNPgyYHfFZ7iMQHemtb4sJXt',
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] || '30m',
} as const)
