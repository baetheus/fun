/**
 * Showable is a structure that indicates that an instance can be converted to a
 * string.
 *
 * @module Showable
 * @since 2.0.0
 */
import type { Hold } from "./kind.ts";

/**
 * A Showable structure has the method show.
 *
 * @since 2.0.0
 */
export interface Showable<U> extends Hold<U> {
  readonly show: (value: U) => string;
}

/**
 * @since 2.10.0
 */
export function struct<A>(
  shows: { [K in keyof A]: Showable<A[K]> },
): Showable<{ readonly [K in keyof A]: A[K] }> {
  const entries = Object.entries(shows) as [
    keyof A & string,
    Showable<A[keyof A]>,
  ][];
  return {
    show: (struct) => {
      const inner = entries
        .map(([key, { show }]) => `${key}: ${show(struct[key])}`)
        .join(", ");
      return inner.length > 0 ? `{ ${inner} }` : "{}";
    },
  };
}

/**
 * @since 2.10.0
 */
export const tuple = <A extends ReadonlyArray<unknown>>(
  ...shows: { [K in keyof A]: Showable<A[K]> }
): Showable<Readonly<A>> => ({
  show: (tuple) => `[${tuple.map((a, i) => shows[i].show(a)).join(", ")}]`,
});
