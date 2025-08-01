/**
 * The Showable module contains utilities for working with the Showable algebraic
 * data type. Showable is a structure that indicates that an instance can be
 * converted to a string representation.
 *
 * Showable provides a standardized way to convert any value to a human-readable
 * string format. This is particularly useful for debugging, logging, and
 * displaying values in user interfaces. The module includes utilities for
 * creating Showable instances for complex data structures like objects and tuples.
 *
 * @module Showable
 * @since 2.0.0
 */

import type { Hold } from "./kind.ts";

/**
 * A Showable structure has the method show, which converts a value to a string
 * representation. This interface extends Hold to ensure type safety and
 * consistency with other algebraic structures in the library.
 *
 * @example
 * ```ts
 * import * as S from "./showable.ts";
 *
 * const ShowableNumber: S.Showable<number> = {
 *   show: (n: number) => n.toString()
 * };
 *
 * const result = ShowableNumber.show(42); // "42"
 * ```
 *
 * @since 2.0.0
 */
export interface Showable<U> extends Hold<U> {
  readonly show: (value: U) => string;
}

/**
 * Create a Showable instance for an object type by providing Showable instances
 * for each of its properties. The resulting show function will format the object
 * as a string with property names and their string representations.
 *
 * @example
 * ```ts
 * import * as S from "./showable.ts";
 * import * as N from "./number.ts";
 * import * as Str from "./string.ts";
 *
 * type Person = {
 *   name: string;
 *   age: number;
 * };
 *
 * const ShowablePerson = S.struct<Person>({
 *   name: Str.ShowableString,
 *   age: N.ShowableNumber
 * });
 *
 * const person: Person = { name: "Alice", age: 30 };
 * const result = ShowablePerson.show(person);
 * // "{ name: Alice, age: 30 }"
 *
 * const emptyPerson: Person = { name: "", age: 0 };
 * const emptyResult = ShowablePerson.show(emptyPerson);
 * // "{ name: , age: 0 }"
 * ```
 *
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
 * Create a Showable instance for a tuple type by providing Showable instances
 * for each element in the tuple. The resulting show function will format the
 * tuple as a string with square brackets and comma-separated values.
 *
 * @example
 * ```ts
 * import * as S from "./showable.ts";
 * import * as N from "./number.ts";
 * import * as Str from "./string.ts";
 *
 * const ShowableTuple = S.tuple<[string, number, boolean]>(
 *   Str.ShowableString,
 *   N.ShowableNumber,
 *   { show: (b: boolean) => b.toString() }
 * );
 *
 * const tuple: [string, number, boolean] = ["hello", 42, true];
 * const result = ShowableTuple.show(tuple);
 * // "[hello, 42, true]"
 *
 * const emptyTuple: [string, number, boolean] = ["", 0, false];
 * const emptyResult = ShowableTuple.show(emptyTuple);
 * // "[, 0, false]"
 * ```
 *
 * @since 2.10.0
 */
export const tuple = <A extends ReadonlyArray<unknown>>(
  ...shows: { [K in keyof A]: Showable<A[K]> }
): Showable<Readonly<A>> => ({
  show: (tuple) => `[${tuple.map((a, i) => shows[i].show(a)).join(", ")}]`,
});
