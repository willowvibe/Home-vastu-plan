import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract a human-readable message from an unknown caught value.
 *
 * Use this at every `catch (error: unknown)` site that wants to surface the
 * error to the user. The previous pattern of `catch (error: any)` and
 * `error.message` was unsound: throwing a non-Error value (string, number,
 * `throw 'oops'`, a network `ErrorEvent`, etc.) would either crash the catch
 * block or render `undefined` to the user.
 *
 * Returns an empty string for non-Error throws (the caller can fall back
 * to a domain-specific default like "Failed to import JSON").
 *
 * Examples:
 *   getErrorMessage(new Error('boom'))                  // 'boom'
 *   getErrorMessage('boom')                             // 'boom'
 *   getErrorMessage({ message: 'boom' })                // 'boom'
 *   getErrorMessage({ code: 42 })                       // ''
 *   getErrorMessage(null)                               // ''
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return '';
}
