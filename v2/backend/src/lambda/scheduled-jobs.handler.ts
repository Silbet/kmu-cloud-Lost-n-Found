export async function handler(event: unknown) {
  // Placeholder for future automatic cancellation/disposal policies.
  // Keep this Lambda entrypoint ready so EventBridge Scheduler can be wired later.
  return {
    status: 'scheduled-jobs-ready',
    receivedAt: new Date().toISOString(),
    event,
  };
}
