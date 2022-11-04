/**
 * Semigroup is an algebra over associativity and totality. It's
 * basic purpose can be understood as "a way to merge, concatenate,
 * or combine" two of a thing into one thing.
 *
 * This file contains the Semigroup algebra, a collection of
 * instance getters, and some utilities around Semigroups.
 *
 * @module Semigroup
 */

import type { ReadonlyRecord } from "./record.ts";
import type { Ord } from "./ord.ts";

import * as O from "./ord.ts";
import { reduce } from "./array.ts";
import { pipe } from "./fn.ts";

/**
 * A Semigroup<T> is an algebra with a notion of concatenation. This
 * means that it's used to merge two Ts into one T. The only rule
 * that this merging must follow is that if you merge A, B, and C,
 * that it doesn't matter if you start by merging A and B or start
 * by merging B and C. There are many ways to merge values that
 * follow these rules. A simple example is addition for numbers.
 * It doesn't matter if you add (A + B) + C or if you add A + (B + C).
 * The resulting sum will be the same. Thus, (number, +) can be
 * used to make a Semigroup<number> (see [SemigroupNumberSum](./number.ts)
 * for this exact instance).
 *
 * An instance of concat must obey the following laws:
 *
 * 1. Associativity:
 *    pipe(a, concat(b), concat(c)) === pipe(a, concat(pipe(b, concat(c))))
 *
 * The original type came from
 * [static-land](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#semigroup)
 *
 * @since 2.0.0
 */
export interface Semigroup<D> {
  readonly concat: (right: D) => (left: D) => D;
}

/**
 * A type for Semigroup over any, useful as an extension target for
 * functions that take any Semigroup and do not need to
 * extract the type.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnySemigroup = Semigroup<any>;

/**
 * A type level extractor, used to pull the inner type from a Semigroup.
 *
 * @since 2.0.0
 */
export type TypeOf<T> = T extends Semigroup<infer A> ? A : never;

/**
 * Get an Semigroup over A that always returns the first
 * parameter supplied to concat (confusingly this is
 * actually the last parameter since concat is in curried
 * form).
 *
 * @example
 * ```ts
 * import { first } from "./semigroup.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 *
 * const SemigroupPerson = first<Person>();
 *
 * const octavia: Person = { name: "Octavia", age: 42 };
 * const kimbra: Person = { name: "Kimbra", age: 32 };
 * const brandon: Person = { name: "Brandon", age: 37 };
 *
 * const firstPerson = pipe(
 *   octavia,
 *   SemigroupPerson.concat(kimbra),
 *   SemigroupPerson.concat(brandon),
 * ); // firstPerson === octavia
 * ```
 *
 * @since 2.0.0
 */
export function first<A = never>(): Semigroup<A> {
  return ({ concat: () => (left) => left });
}

/**
 * Get an Semigroup over A that always returns the last
 * parameter supplied to concat (confusingly this is
 * actually the first parameter since concat is in curried
 * form).
 *
 * @example
 * ```ts
 * import { last } from "./semigroup.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 *
 * const SemigroupPerson = last<Person>();
 *
 * const octavia: Person = { name: "Octavia", age: 42 };
 * const kimbra: Person = { name: "Kimbra", age: 32 };
 * const brandon: Person = { name: "Brandon", age: 37 };
 *
 * const lastPerson = pipe(
 *   octavia,
 *   SemigroupPerson.concat(kimbra),
 *   SemigroupPerson.concat(brandon),
 * ); // lastPerson === brandon
 * ```
 *
 * @since 2.0.0
 */
export function last<A = never>(): Semigroup<A> {
  return ({ concat: (right) => () => right });
}

/**
 * Get the "Dual" of an existing Semigroup. This effectively reverses
 * the order of the input semigroup's application. For example, the
 * dual of the "first" semigroup is the "last" semigroup. The dual
 * of (boolean, ||) is itself.
 *
 * @example
 * ```ts
 * import * as SG from "./semigroup.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 *
 * const last = SG.last<Person>();
 * const dual = SG.dual(last);
 *
 * const octavia: Person = { name: "Octavia", age: 42 };
 * const kimbra: Person = { name: "Kimbra", age: 32 };
 * const brandon: Person = { name: "Brandon", age: 37 };
 *
 * const dualPerson = pipe(
 *   octavia,
 *   dual.concat(kimbra),
 *   dual.concat(brandon),
 * ); // dualPerson === octavia
 * ```
 *
 * @since 2.0.0
 */
export function dual<A>(S: Semigroup<A>): Semigroup<A> {
  return ({ concat: (right) => (left) => S.concat(left)(right) });
}

/**
 * Get a Semigroup from a tuple of semigroups. The resulting
 * semigroup will operate over tuples applying the input
 * semigroups applying each based on its position,
 *
 * @example
 * ```ts
 * import * as SG from "./semigroup.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 *
 * const first = SG.first<Person>();
 * const last = SG.last<Person>();
 * const { concat } = SG.tuple(first, last);
 *
 * const octavia: Person = { name: "Octavia", age: 42 };
 * const kimbra: Person = { name: "Kimbra", age: 32 };
 * const brandon: Person = { name: "Brandon", age: 37 };
 *
 * const tuplePeople = pipe(
 *   [octavia, octavia],
 *   concat([kimbra, kimbra]),
 *   concat([brandon, brandon]),
 * ); // tuplePeople === [octavia, brandon]
 * ```
 *
 * @since 2.0.0
 */
export function tuple<T extends AnySemigroup[]>(
  ...semigroups: T
): Semigroup<{ readonly [K in keyof T]: TypeOf<T[K]> }> {
  type Return = { [K in keyof T]: TypeOf<T[K]> };
  return ({
    concat: (right) => (left): Return =>
      semigroups.map((s, i) =>
        s.concat(right[i])(left[i])
      ) as unknown as Return,
  });
}

/**
 * Get a Semigroup from a struct of semigroups. The resulting
 * semigroup will operate over similar shaped structs applying
 * the input semigroups applying each based on its position,
 *
 * @example
 * ```ts
 * import type { Semigroup } from "./semigroup.ts";
 * import * as SG from "./semigroup.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 * const person = (name: string, age: number): Person => ({ name, age });
 *
 * // Chooses the longest string, defaulting to left when equal
 * const longestString: Semigroup<string> = {
 *   concat: (right) => (left) => right.length > left.length ? right : left,
 * };
 *
 * // This semigroup will merge two people, choosing the longest
 * // name and the oldest age
 * const { concat } = SG.struct<Person>({
 *   name: longestString,
 *   age: N.SemigroupNumberMax,
 * })
 *
 * const brandon = pipe(
 *   person("Brandon Blaylock", 12),
 *   concat(person("Bdon", 17)),
 *   concat(person("Brandon", 30))
 * ); // brandon === { name: "Brandon Blaylock", age: 30 }
 * ```
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export function struct<O extends ReadonlyRecord<any>>(
  semigroups: { [K in keyof O]: Semigroup<O[K]> },
): Semigroup<O> {
  type Entries = [keyof O, typeof semigroups[keyof O]][];
  return ({
    concat: (right) => (left) => {
      const r = {} as Record<keyof O, O[keyof O]>;
      for (const [key, semigroup] of Object.entries(semigroups) as Entries) {
        r[key] = semigroup.concat(right[key])(left[key]);
      }
      return r as { [K in keyof O]: O[K] };
    },
  });
}

/**
 * Create a semigroup fron an instance of Ord that returns
 * that maximum for the type being ordered. This Semigroup
 * functions identically to max from Ord.
 *
 * @example
 * ```ts
 * import * as SG from "./semigroup.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { concat } = SG.max(N.OrdNumber);
 *
 * const biggest = pipe(
 *   0,
 *   concat(-1),
 *   concat(10),
 *   concat(1000),
 *   concat(5),
 *   concat(9001)
 * ); // biggest is over 9000
 * ```
 *
 * @since 2.0.0
 */
export function max<A>(ord: Ord<A>): Semigroup<A> {
  return { concat: O.max(ord) };
}

/**
 * Create a semigroup fron an instance of Ord that returns
 * that minimum for the type being ordered. This Semigroup
 * functions identically to min from Ord.
 *
 * @example
 * ```ts
 * import * as SG from "./semigroup.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { concat } = SG.min(N.OrdNumber);
 *
 * const smallest = pipe(
 *   0,
 *   concat(-1),
 *   concat(10),
 *   concat(1000),
 *   concat(5),
 *   concat(9001)
 * ); // smallest is -1
 * ```
 *
 * @since 2.0.0
 */
export function min<A>(ord: Ord<A>): Semigroup<A> {
  return { concat: O.min(ord) };
}

/**
 * Create a semigroup that works like Array.join,
 * inserting middle between every two values
 * that are concatenated. This can have some interesting
 * results.
 *
 * @example
 * ```ts
 * import * as SG from "./semigroup.ts";
 * import * as S from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { concat: toList } = pipe(
 *   S.SemigroupString,
 *   SG.intercalcate(", "),
 * );
 *
 * const list = pipe(
 *   "apples",
 *   toList("oranges"),
 *   toList("and bananas"),
 * ); // list === "apples, oranges, and bananas"
 * ```
 *
 * @since 2.0.0
 */
export function intercalcate<A>(middle: A) {
  return (S: Semigroup<A>): Semigroup<A> => ({
    concat: (right) => S.concat(pipe(middle, S.concat(right))),
  });
}

/**
 * Create a semigroup that always returns the
 * given value, ignoring anything that it is
 * concatenated with.
 *
 * @example
 * ```ts
 * import * as SG from "./semigroup.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { concat } = SG.constant("cake");
 *
 * const whatDoWeWant = pipe(
 *   "apples",
 *   concat("oranges"),
 *   concat("bananas"),
 *   concat("pie"),
 *   concat("money"),
 * ); // whatDoWeWant === "cake"
 * ```
 *
 * @since 2.0.0
 */
export function constant<A>(a: A): Semigroup<A> {
  return { concat: () => () => a };
}

/**
 * Given a semigroup, create a function that will
 * iterate through an array of values and concat
 * them. This is not much more than Array.reduce(concat).
 *
 * @example
 * ```ts
 * import * as SG from "./semigroup.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const sumAll = SG.concatAll(N.SemigroupNumberSum);
 *
 * const sum = pipe(
 *   [1, 30, 80, 1000, 52, 42],
 *   sumAll(0),
 * ); // sum === 1205
 * ```
 *
 * @since 2.0.0
 */
export function concatAll<A>(
  S: Semigroup<A>,
): (startWith: A) => (as: ReadonlyArray<A>) => A {
  return (startWith) => reduce((a, c) => S.concat(c)(a), startWith);
}
