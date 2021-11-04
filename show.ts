/**
 * Show
 * Take a type and prints a string for it.
 */
export interface Show<T> {
  readonly show: (t: T) => string;
}
