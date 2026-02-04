export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

// Helper functions
export function ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}
