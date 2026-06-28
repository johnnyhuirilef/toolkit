/** Default configuration values for graceful shutdown behavior. */
export const SHUTDOWN_DEFAULTS = {
  /** Maximum time (ms) to wait for all connections to close. */
  TIMEOUT_MS: 10_000,
  /** Wait for graceful close by default. */
  FORCE_CLOSE: false,
  /** Retry attempts when closing a connection fails. */
  RETRY_ATTEMPTS: 2,
  /** Base delay (ms) between retries. Uses exponential backoff: delay × 2^attempt. */
  RETRY_DELAY_MS: 100,
} as const;

/** Wide event identifier. One structured event per shutdown operation. */
export const SHUTDOWN_EVENTS = {
  SHUTDOWN: 'mongodb.shutdown',
} as const;
