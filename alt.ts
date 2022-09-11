/**
 * Alt presents a type level pattern to select over
 * multiple algebraic data types.
 *
 * The basic concept is something along the lines of,
 * "If this one doesn't work, try this other one".
 */

// deno-lint-ignore-file no-explicit-any
import type { Functor } from "./functor.ts";
import type { Kind, URIS } from "./kind.ts";

/**
 * An instance of Alt extends Functor and provides a new method
 * called alt. This method takes two matching Kinds, left and right,
 * and returns one of them. A good way to think of this is as
 * a boolean or, where if the left kind is "false" then the right
 * kind is returned.
 *
 * An instance of alt must obay the following laws:
 *
 * 1. Associativity:
 *    pipe(a, alt(b), alt(c)) === pipe(a, alt(pipe(b, alt(c))))
 * 2. Distributivity:
 *    pipe(a, alt(b), map(f)) === pipe(a, map(f), alt(pipe(b, map(f))))
 *
 * The original type came from
 * [here](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#alt)
 */
export type Alt<URI extends URIS, _ extends any[] = any[]> =
  & Functor<URI, _>
  & {
    readonly alt: <A, B extends _[0], C extends _[1], D extends _[2]>(
      right: Kind<URI, [A, B, C, D]>,
    ) => (left: Kind<URI, [A, B, C, D]>) => Kind<URI, [A, B, C, D]>;
  };
