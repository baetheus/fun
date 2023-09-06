/**
 * Reducible is a structure that allows a function to all values inside of a
 * structure. The reduction is accumulative and ordered.
 *
 * @module Reducible
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";
import type { Initializable } from "./initializable.ts";

/**
 * A Reducible structure has the method reduce.
 *
 * @since 2.0.0
 */
export interface Reducible<U extends Kind> extends Hold<U> {
  readonly reduce: <A, O>(
    reducer: (accumulator: O, value: A) => O,
    accumulator: O,
  ) => <B = never, C = never, D = unknown, E = unknown>(
    ua: $<U, [A, B, C], [D], [E]>,
  ) => O;
}

/**
 * @experimental
 * @since 2.0.0
 */
export function collect<U extends Kind, A>(
  { reduce }: Reducible<U>,
  { combine, init }: Initializable<A>,
): <B = never, C = never, D = unknown, E = unknown>(
  ua: $<U, [A, B, C], [D], [E]>,
) => A {
  return (ua) =>
    reduce<A, A>((first, second) => combine(second)(first), init())(ua);
}
