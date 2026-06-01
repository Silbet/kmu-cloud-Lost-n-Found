export const DEFAULT_AWS_REGION = 'us-east-1';
export const DEFAULT_RESOURCE_PREFIX = 'pj-kmucloud-6-v2';

export function getAwsRegion() {
  return process.env.AWS_REGION || DEFAULT_AWS_REGION;
}

export function getResourcePrefix() {
  return process.env.AWS_RESOURCE_PREFIX || DEFAULT_RESOURCE_PREFIX;
}

export function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
