export function enrichError(error: unknown, context: string): Error {
  const message = error instanceof Error ? `${context}: ${error.message}` : `${context}: ${String(error)}`;
  const enriched = new Error(message, { cause: error });
  if (error instanceof Error) {
    enriched.name = error.name;
  }
  return enriched;
}
