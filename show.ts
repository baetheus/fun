/**
 * Show is the "fun" version of JavaScripts toString
 * method. For algebraic data types that can be
 * stringified it allows a structured way to do so.
 */
export interface Show<T> {
  readonly show: (t: T) => string;
}
