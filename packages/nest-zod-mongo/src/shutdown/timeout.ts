export class ShutdownTimeoutError extends Error {
  override readonly name = 'ShutdownTimeoutError';

  constructor(operation: string, timeoutMs: number) {
    super(`${operation} exceeded timeout of ${String(timeoutMs)}ms`);
  }
}

export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, op: string): Promise<T> => {
  // ponytail: let is required — Promise constructor returns void, handle must be captured outside

  let timerId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timerId = setTimeout(() => {
      reject(new ShutdownTimeoutError(op, timeoutMs));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timerId);
  });
};
