/**
 * Wrappable is a structure that allows a value to be wrapped inside of the
 * associated concrete structure.
 *
 * @module Wrappable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";

/**
 * A Wrappable structure has the method wrap.
 *
 * @example
 * ```ts
 * import type { Wrappable } from "./wrappable.ts";
 * import * as O from "./option.ts";
 *
 * // Example with Option wrappable
 * const wrapped = O.WrappableOption.wrap(42);
 * console.log(wrapped); // Some(42)
 * ```
 *
 * @since 2.0.0
 */
export interface Wrappable<U extends Kind> extends Hold<U> {
  readonly wrap: <A, B = never, C = never, D = unknown, E = unknown>(
    a: A,
  ) => $<U, [A, B, C], [D], [E]>;
}
