/**
 * Wraps a promise with a timeout.
 * If the promise doesn't resolve within the specified time, it rejects with a timeout error.
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param label - Optional label for the timeout error message
 * @returns A promise that resolves or rejects based on whichever completes first
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string = "Operation",
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}
