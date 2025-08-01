/**
 * Bimappable is a structure that allows a function to be applied inside of the
 * associated concrete structure but is specific to a second held value of that
 * structure..
 *
 * @module Bimappable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";
import type { Mappable } from "./mappable.ts";

import { pipe } from "./fn.ts";

/**
 * The Bimappable interface. Bimapple includes the methods map and mapSecond.
 *
 * @since 2.0.0
 */
export interface Bimappable<U extends Kind> extends Mappable<U>, Hold<U> {
  readonly mapSecond: <B, J>(
    fbj: (value: B) => J,
  ) => <A = never, C = never, D = unknown, E = unknown>(
    ta: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [A, J, C], [D], [E]>;
}

/**
 * Apply two functions simultaneously to the first and second values in a Bimappable structure.
 *
 * @example
 * ```ts
 * import * as B from "./bimappable.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const bimap = B.bimap(E.BimappableEither);
 * const transform = bimap(
 *   (n: number) => n * 2,
 *   (s: string) => s.toUpperCase()
 * );
 *
 * const result1 = pipe(E.right("hello"), transform); // Right("HELLO")
 * const result2 = pipe(E.left(5), transform); // Left(10)
 * ```
 *
 * @since 2.0.0
 */
export function bimap<U extends Kind>(
  { map, mapSecond }: Bimappable<U>,
): <A, B, I, J>(
  fai: (a: A) => I,
  fbj: (b: B) => J,
) => <C = never, D = unknown, E = unknown>(
  ua: $<U, [A, B, C], [D], [E]>,
) => $<U, [I, J, C], [D], [E]> {
  return (fai, fbj) => (ua) => pipe(ua, map(fai), mapSecond(fbj));
}
