/**
 * Foldable is a structure that allows a function to all values inside of a
 * structure. The reduction is accumulative and ordered.
 *
 * @module Foldable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";
import type { Initializable } from "./initializable.ts";

/**
 * A Foldable structure has the method fold.
 *
 * @since 2.0.0
 */
export interface Foldable<U extends Kind> extends Hold<U> {
  readonly fold: <A, O>(
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
  { fold }: Foldable<U>,
  { combine, init }: Initializable<A>,
): <B = never, C = never, D = unknown, E = unknown>(
  ua: $<U, [A, B, C], [D], [E]>,
) => A {
  return (ua) =>
    fold<A, A>((first, second) => combine(second)(first), init())(ua);
}
