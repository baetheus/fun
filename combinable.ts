/**
 * Combinable is a structure that can be combine two fixed values. Some examples
 * of Combinable are Array.combine, addition for numbers, or merging of two
 * structs by combining their internal values.
 *
 * @module Combinable
 * @since 2.0.0
 */

import type { Sortable } from "./sortable.ts";

import * as S from "./sortable.ts";

type ReadonlyRecord<A> = Readonly<Record<string, A>>;
type NonEmptyArray<A> = readonly [A, ...A[]];

/**
 * The Combine function in a Combinable.
 *
 * @since 2.0.0
 */
export type Combine<A> = (second: A) => (first: A) => A;

/**
 * Combinable is a structure that allows the combination of two concrete values
 * of A into a single value of A. In other functional libraries this is called a
 * Semigroup.
 *
 * @since 2.0.0
 */
export interface Combinable<A> {
  readonly combine: Combine<A>;
}

/**
 * A type for Combinable over any, useful as an extension target for
 * functions that take any Combinable and do not need to
 * unwrap the type.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyCombinable = Combinable<any>;

/**
 * A type level unwrapper, used to pull the inner type from a Combinable.
 *
 * @since 2.0.0
 */
export type TypeOf<T> = T extends Combinable<infer A> ? A : never;

/**
 * Create a Combinable<A> from a Combine<A> and an init function.
 *
 * @since 2.0.0
 */
export function fromCombine<A>(
  combine: Combine<A>,
): Combinable<A> {
  return { combine };
}

/**
 * Get an Combinable over A that always returns the first
 * parameter supplied to combine (confusingly this is
 * actually the last parameter since combine is in curried
 * form).
 *
 * @example
 * ```ts
 * import { first, getCombineAll } from "./combinable.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 * const FirstPerson = first<Person>();
 * const getFirstPerson = getCombineAll(FirstPerson);
 *
 * const octavia: Person = { name: "Octavia", age: 42 };
 * const kimbra: Person = { name: "Kimbra", age: 32 };
 * const brandon: Person = { name: "Brandon", age: 37 };
 *
 * const result = getFirstPerson(octavia, kimbra, brandon); // octavia
 * ```
 *
 * @since 2.0.0
 */
export function first<A>(): Combinable<A> {
  return fromCombine(() => (first) => first);
}

/**
 * Get an Combinable over A that always returns the last
 * parameter supplied to combine (confusingly this is
 * actually the first parameter since combine is in curried
 * form).
 *
 * @example
 * ```ts
 * import { last } from "./combinable.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 *
 * const CombinablePerson = last<Person>();
 *
 * const octavia: Person = { name: "Octavia", age: 42 };
 * const kimbra: Person = { name: "Kimbra", age: 32 };
 * const brandon: Person = { name: "Brandon", age: 37 };
 *
 * const lastPerson = pipe(
 *   octavia,
 *   CombinablePerson.combine(kimbra),
 *   CombinablePerson.combine(brandon),
 * ); // lastPerson === brandon
 * ```
 *
 * @since 2.0.0
 */
export function last<A>(): Combinable<A> {
  return fromCombine((second) => () => second);
}

/**
 * Get the "Dual" of an existing Combinable. This effectively reverses
 * the order of the input combinable's application. For example, the
 * dual of the "first" combinable is the "last" combinable. The dual
 * of (boolean, ||) is itself.
 *
 * @example
 * ```ts
 * import * as SG from "./combinable.ts";
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
 *   dual.combine(kimbra),
 *   dual.combine(brandon),
 * ); // dualPerson === octavia
 * ```
 *
 * @since 2.0.0
 */
export function dual<A>({ combine }: Combinable<A>): Combinable<A> {
  return fromCombine((second) => (first) => combine(first)(second));
}

/**
 * Get a Combinable from a tuple of combinables. The resulting
 * combinable will operate over tuples applying the input
 * combinables applying each based on its position,
 *
 * @example
 * ```ts
 * import * as SG from "./combinable.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 *
 * const first = SG.first<Person>();
 * const last = SG.last<Person>();
 * const { combine } = SG.tuple(first, last);
 *
 * const octavia: Person = { name: "Octavia", age: 42 };
 * const kimbra: Person = { name: "Kimbra", age: 32 };
 * const brandon: Person = { name: "Brandon", age: 37 };
 *
 * const tuplePeople = pipe(
 *   [octavia, octavia],
 *   combine([kimbra, kimbra]),
 *   combine([brandon, brandon]),
 * ); // tuplePeople === [octavia, brandon]
 * ```
 *
 * @since 2.0.0
 */
export function tuple<T extends AnyCombinable[]>(
  ...combinables: T
): Combinable<{ readonly [K in keyof T]: TypeOf<T[K]> }> {
  type Return = { [K in keyof T]: TypeOf<T[K]> };
  return fromCombine((second) => (first): Return =>
    combinables.map(({ combine }, index) =>
      combine(second[index])(first[index])
    ) as Return
  );
}

/**
 * Get a Combinable from a struct of combinables. The resulting
 * combinable will operate over similar shaped structs applying
 * the input combinables applying each based on its position,
 *
 * @example
 * ```ts
 * import type { Combinable } from "./combinable.ts";
 * import * as SG from "./combinable.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 * const person = (name: string, age: number): Person => ({ name, age });
 *
 * // Chooses the longest string, defaulting to left when equal
 * const longestString: Combinable<string> = {
 *   combine: (right) => (left) => right.length > left.length ? right : left,
 * };
 *
 * // This combinable will merge two people, choosing the longest
 * // name and the oldest age
 * const { combine } = SG.struct<Person>({
 *   name: longestString,
 *   age: N.InitializableNumberMax,
 * })
 *
 * const brandon = pipe(
 *   person("Brandon Blaylock", 12),
 *   combine(person("Bdon", 17)),
 *   combine(person("Brandon", 30))
 * ); // brandon === { name: "Brandon Blaylock", age: 30 }
 * ```
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export function struct<O extends ReadonlyRecord<any>>(
  combinables: { [K in keyof O]: Combinable<O[K]> },
): Combinable<O> {
  type Entries = [keyof O, typeof combinables[keyof O]][];
  return fromCombine((second) => (first) => {
    const r = {} as Record<keyof O, O[keyof O]>;
    for (const [key, { combine }] of Object.entries(combinables) as Entries) {
      r[key] = combine(second[key])(first[key]);
    }
    return r as { [K in keyof O]: O[K] };
  });
}

/**
 * Create a combinable fron an instance of Sortable that returns
 * that maximum for the type being ordered. This Combinable
 * functions identically to max from Sortable.
 *
 * @example
 * ```ts
 * import * as SG from "./combinable.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { combine } = SG.max(N.SortableNumber);
 *
 * const biggest = pipe(
 *   0,
 *   combine(-1),
 *   combine(10),
 *   combine(1000),
 *   combine(5),
 *   combine(9001)
 * ); // biggest is over 9000
 * ```
 *
 * @since 2.0.0
 */
export function max<A>(sortable: Sortable<A>): Combinable<A> {
  return fromCombine(S.max(sortable));
}

/**
 * Create a combinable fron an instance of Sortable that returns
 * that minimum for the type being ordered. This Combinable
 * functions identically to min from Sortable.
 *
 * @example
 * ```ts
 * import * as SG from "./combinable.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { combine } = SG.min(N.SortableNumber);
 *
 * const smallest = pipe(
 *   0,
 *   combine(-1),
 *   combine(10),
 *   combine(1000),
 *   combine(5),
 *   combine(9001)
 * ); // smallest is -1
 * ```
 *
 * @since 2.0.0
 */
export function min<A>(sortable: Sortable<A>): Combinable<A> {
  return fromCombine(S.min(sortable));
}

/**
 * Create a combinable that works like Array.join,
 * inserting middle between every two values
 * that are combineenated. This can have some interesting
 * results.
 *
 * @example
 * ```ts
 * import * as SG from "./combinable.ts";
 * import * as S from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { combine: toList } = pipe(
 *   S.InitializableString,
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
  return ({ combine }: Combinable<A>): Combinable<A> =>
    fromCombine((second) => (first) => combine(second)(combine(middle)(first)));
}

/**
 * Create a combinable that always returns the
 * given value, ignoring anything that it is
 * combineenated with.
 *
 * @example
 * ```ts
 * import * as SG from "./combinable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { combine } = SG.constant("cake");
 *
 * const whatDoWeWant = pipe(
 *   "apples",
 *   combine("oranges"),
 *   combine("bananas"),
 *   combine("pie"),
 *   combine("money"),
 * ); // whatDoWeWant === "cake"
 * ```
 *
 * @since 2.0.0
 */
export function constant<A>(a: A): Combinable<A> {
  return fromCombine(() => () => a);
}

/**
 * Given a Combinable, create a function that will
 * iterate through an array of values and combine
 * them. This is not much more than Array.fold(combine).
 *
 * @example
 * ```ts
 * import * as C from "./combinable.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const sumAll = C.getCombineAll(N.InitializableNumberSum);
 *
 * const result = sumAll(1, 30, 80, 1000, 52, 42); // 1205
 * ```
 *
 * @since 2.0.0
 */
export function getCombineAll<A>(
  { combine }: Combinable<A>,
): (...as: NonEmptyArray<A>) => A {
  const _combine = (first: A, second: A) => combine(second)(first);
  return (...as) => as.reduce(_combine);
}
