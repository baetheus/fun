/**
 * Mappable is a structure that allows a function to be applied inside of the
 * associated concrete structure.
 *
 * @module Mappable
 * @since 2.0.0
 */

import type { $, Hold, Kind } from "./kind.ts";

/**
 * A Mappable structure has the method map.
 *
 * @since 2.0.0
 */
export interface Mappable<U extends Kind> extends Hold<U> {
  readonly map: <A, I>(
    fai: (value: A) => I,
  ) => <B = never, C = never, D = unknown, E = unknown>(
    ta: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [I, B, C], [D], [E]>;
}

/**
 * Create a bindTo function from a structure with an instance of Mappable. A
 * bindTo function takes the inner value of the structure and maps it to the
 * value of a struct with the given name. It is useful for lifting the value
 * such that it can then be used with a `bind` function, effectively allowing
 * for `Do`-like notation in typescript.
 *
 * @since 2.0.0
 */
export function createBindTo<U extends Kind>(
  { map }: Mappable<U>,
): <N extends string>(
  name: N,
) => <A, B = never, C = never, D = unknown, E = unknown>(
  ua: $<U, [A, B, C], [D], [E]>,
) => $<U, [{ readonly [K in N]: A }, B, C], [D], [E]> {
  // deno-lint-ignore no-explicit-any
  return (name) => map((value) => ({ [name]: value }) as any);
}
