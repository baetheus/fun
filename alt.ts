/**
 * Alt presents a type level pattern to select over
 * multiple algebraic data types.
 *
 * The basic concept is something along the lines of,
 * "If this one doesn't work, try this other one".
 */

import type { Functor } from "./functor.ts";
import type { $, Kind } from "./kind.ts";

/**
 * An instance of Alt extends Functor and provides a new method
 * called alt. This method takes two matching Kinds, left and right,
 * and returns one of them. A good way to think of this is as
 * a boolean or, where if the left kind is "false" then the right
 * kind is returned.
 *
 * An instance of alt must obey the following laws:
 *
 * 1. Associativity:
 *    pipe(a, alt(b), alt(c)) === pipe(a, alt(pipe(b, alt(c))))
 * 2. Distributivity:
 *    pipe(a, alt(b), map(f)) === pipe(a, map(f), alt(pipe(b, map(f))))
 *
 * The original type came from
 * [here](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#alt)
 */
export type Alt<U extends Kind> =
  & Functor<U>
  & {
    readonly alt: <A, B, C, D>(
      right: $<U, [A, B, C, D]>,
    ) => (left: $<U, [A, B, C, D]>) => $<U, [A, B, C, D]>;
  };
