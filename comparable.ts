/**
 * Comparable is a structure that has an idea of comparability. Comparability
 * means that two of the same type of object can be compared such that the
 * condition of comparison can be true or false. The canonical comparison is
 * equality.
 *
 * @module Comparable
 * @since 2.0.0
 */

import type { Hold, In, Kind, Out, Spread } from "./kind.ts";
import type { Premappable } from "./premappable.ts";
import type { NonEmptyArray } from "./array.ts";
import type { ReadonlyRecord } from "./record.ts";
import type { Literal, Schemable } from "./schemable.ts";

import { handleThrow, identity, memoize, uncurry2 } from "./fn.ts";
import { isSubrecord } from "./record.ts";

/**
 * The compare function in a Comparable.
 *
 * @since 2.0.0
 */
export type Compare<A> = (second: A) => (first: A) => boolean;

/**
 * @since 2.0.0
 */
export type TypeOf<U> = U extends Comparable<infer A> ? A : never;

/**
 * A Comparable<T> is an algebra with a notion of equality. Specifically,
 * a Comparable for a type T has an equal method that determines if the
 * two objects are the same. Comparables can be combined, like many
 * algebraic structures. The combinators for Comparable in fun can be found
 * in [comparable.ts](./comparable.ts).
 *
 * An instance of a Comparable must obey the following laws:
 *
 * 1. Reflexivity: compare(a, a) === true
 * 2. Symmetry: compare(a, b) === compare(b, a)
 * 3. Transitivity: if compare(a, b) and compare(b, c), then compare(a, c)
 *
 * @since 2.0.0
 */
export interface Comparable<A> extends Hold<A> {
  readonly compare: Compare<A>;
}

/**
 * Specifies Comparable as a Higher Kinded Type, with
 * covariant parameter A corresponding to the 0th
 * index of any Substitutions.
 *
 * @since 2.0.0
 */
export interface KindComparable extends Kind {
  readonly kind: Comparable<Out<this, 0>>;
}

/**
 * Specifies Comparable as a Higher Kinded Type, with
 * contravariant parameter D corresponding to the 0th
 * index of any Substitutions.
 *
 * @since 2.0.0
 */
export interface KindContraComparable extends Kind {
  readonly kind: Comparable<In<this, 0>>;
}

/**
 * Create a Comparable from a Compare function.
 *
 * @example
 * ```ts
 * import { fromCompare } from "./comparable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { compare } = fromCompare<number>(
 *   (second) => (first) => first === second
 * );
 *
 * const result = compare(1)(1); // true
 * ```
 *
 * @since 2.0.0
 */
export function fromCompare<A>(
  compare: Compare<A> = (second) => (first) => first === second,
): Comparable<A> {
  return { compare };
}

/**
 * A single instance of Camparable that uses strict equality for comparison.
 */
// deno-lint-ignore no-explicit-any
const STRICT_EQUALITY: Comparable<any> = fromCompare();

/**
 * Create a Comparable that casts the inner type of another Comparable to
 * Readonly.
 *
 * @example
 * ```ts
 * import { readonly, fromCompare } from "./comparable.ts";
 *
 * // This has type Comparable<Array<string>>
 * const ComparableMutableArray = fromCompare<Array<string>>(
 *   (second) => (first) => first.length === second.length
 *   && first.every((value, index) => value === second[index])
 * );
 *
 * // This has type Comparable<Readonly<Array<string>>>
 * const ComparableReadonlyArray = readonly(ComparableMutableArray);
 * ```
 *
 * @since 2.0.0
 */
export function readonly<A>(
  comparable: Comparable<A>,
): Comparable<Readonly<A>> {
  return comparable;
}

/**
 * A Comparable that can compare any unknown values (and thus can
 * compare any values). Underneath it uses strict equality
 * for the comparison.
 *
 * @example
 * ```ts
 * import { unknown } from "./comparable.ts";
 *
 * const result1 = unknown.compare(1)("Hello"); // false
 * const result2 = unknown.compare(1)(1); // true
 * ```
 *
 * @since 2.0.0
 */
export const unknown: Comparable<unknown> = STRICT_EQUALITY;

/**
 * A Comparable that compares strings using strict equality.
 *
 * @example
 * ```ts
 * import { string } from "./comparable.ts";
 *
 * const result1 = string.compare("World")("Hello"); // false
 * const result2 = string.compare("")(""); // true
 * ```
 *
 * @since 2.0.0
 */
export const string: Comparable<string> = STRICT_EQUALITY;

/**
 * A Comparable that compares number using strict equality.
 *
 * @example
 * ```ts
 * import { number } from "./comparable.ts";
 *
 * const result1 = number.compare(1)(2); // false
 * const result2 = number.compare(1)(1); // true
 * ```
 *
 * @since 2.0.0
 */
export const number: Comparable<number> = STRICT_EQUALITY;

/**
 * A Comparable that compares booleans using strict equality.
 *
 * @example
 * ```ts
 * import { boolean } from "./comparable.ts";
 *
 * const result1 = boolean.compare(true)(false); // false
 * const result2 = boolean.compare(true)(true); // true
 * ```
 *
 * @since 2.0.0
 */
export const boolean: Comparable<boolean> = STRICT_EQUALITY;

/**
 * Creates a Comparable that compares a union of literals
 * using strict equality.
 *
 * @example
 * ```ts
 * import { literal } from "./comparable.ts";
 *
 * const { compare } = literal(1, 2, "Three");
 *
 * const result1 = compare(1)("Three"); // false
 * const result2 = compare("Three")("Three"); // true
 * ```
 *
 * @since 2.0.0
 */
export function literal<A extends NonEmptyArray<Literal>>(
  ..._: A
): Comparable<A[number]> {
  return STRICT_EQUALITY;
}

/**
 * Creates a derivative Comparable that can also compare null
 * values in addition to the source eq.
 *
 * @example
 * ```ts
 * import { nullable, number } from "./comparable.ts";
 *
 * const { compare } = nullable(number);
 *
 * const result1 = compare(1)(null); // false
 * const result2 = compare(null)(null); // true
 * ```
 *
 * @since 2.0.0
 */
export function nullable<A>({ compare }: Comparable<A>): Comparable<A | null> {
  return fromCompare((second) => (first) =>
    first === null || second === null
      ? first === second
      : compare(second)(first)
  );
}

/**
 * Creates a derivative Comparable that can also compare undefined
 * values in addition to the source eq.
 *
 * @example
 * ```ts
 * import { undefinable, number } from "./comparable.ts";
 *
 * const { compare } = undefinable(number);
 *
 * const result1 = compare(1)(undefined); // false
 * const result2 = compare(undefined)(undefined); // true
 * ```
 *
 * @since 2.0.0
 */
export function undefinable<A>(
  { compare }: Comparable<A>,
): Comparable<A | undefined> {
  return fromCompare((second) => (first) =>
    first === undefined || second === undefined
      ? first === second
      : compare(second)(first)
  );
}

/**
 * Creates a Comparable that compares readonly records with items
 * that have the type compared in the supplied eq.
 *
 * @example
 * ```ts
 * import { record, number } from "./comparable.ts";
 *
 * const { compare } = record(number);
 *
 * const result1 = compare({ one: 1 })({ one: 2 }); // false
 * const result2 = compare({ one: 1 })({ one: 1 }); // true
 * ```
 *
 * @since 2.0.0
 */
export function record<A>(eq: Comparable<A>): Comparable<ReadonlyRecord<A>> {
  const isSub = isSubrecord(eq);
  return fromCompare((second) => (first) =>
    isSub(second)(first) && isSub(first)(second)
  );
}

/**
 * Creates a Comparable that compares readonly array with items
 * that have the type compared in the supplied eq.
 *
 * @example
 * ```ts
 * import { array, number } from "./comparable.ts";
 *
 * const { compare } = array(number);
 *
 * const result1 = compare([1, 2])([1, 2, 3]); // false
 * const result2 = compare([1, 2])([1, 2]); // true
 * ```
 *
 * @since 2.0.0
 */
export function array<A>(
  { compare }: Comparable<A>,
): Comparable<ReadonlyArray<A>> {
  return fromCompare((second) => (first) =>
    Array.isArray(first) && Array.isArray(second) &&
    first.length === second.length &&
    first.every((value, index) => compare(second[index])(value))
  );
}

/**
 * Creates a eq that compares, index for index, tuples according
 * to the order and eqs passed into tuple.
 *
 * @example
 * ```ts
 * import { tuple, number, string } from "./comparable.ts";
 *
 * const { compare } = tuple(number, string);
 *
 * const result1 = compare([1, "Hello"])([1, "Goodbye"]); // false
 * const result2 = compare([1, ""])([1, ""]); // true
 * ```
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export function tuple<T extends ReadonlyArray<Comparable<any>>>(
  ...comparables: T
): Comparable<
  { [K in keyof T]: T[K] extends Comparable<infer A> ? A : never }
> {
  return fromCompare((second) => (first) =>
    Array.isArray(first) && Array.isArray(second) &&
    first.length === second.length &&
    comparables.every(({ compare }, index) =>
      compare(second[index])(first[index])
    )
  );
}

/**
 * Create a eq that compares, key for key, structs according
 * to the structure of the eqs passed into struct.
 *
 * @example
 * ```ts
 * import { struct, number, string } from "./comparable.ts";
 *
 * const { compare } = struct({ name: string, age: number });
 *
 * const brandon = { name: "Brandon", age: 37 };
 * const emily = { name: "Emily", age: 32 };
 *
 * const result1 = compare(brandon)(emily); // false
 * const result2 = compare(brandon)(brandon); // true
 * ```
 *
 * @since 2.0.0
 */
export function struct<A>(
  comparables: { readonly [K in keyof A]: Comparable<A[K]> },
): Comparable<{ readonly [K in keyof A]: A[K] }> {
  const _comparables = Object.entries(comparables) as [
    keyof A,
    Comparable<A[keyof A]>,
  ][];
  return fromCompare((second) => (first) =>
    _comparables.every(([key, { compare }]) => compare(second[key])(first[key]))
  );
}

/**
 * Create a eq that compares, key for key, structs according
 * to the structure of the eqs passed into struct. It allows
 * the values in the struct to be optional or null.
 *
 * @example
 * ```ts
 * import { struct, number, string } from "./comparable.ts";
 *
 * const { compare } = struct({ name: string, age: number });
 *
 * const brandon = { name: "Brandon", age: 37 };
 * const emily = { name: "Emily", age: 32 };
 *
 * const result1 = compare(brandon)(emily); // false
 * const result2 = compare(brandon)(brandon); // true
 * ```
 *
 * @since 2.0.0
 */
export function partial<A>(
  comparables: { readonly [K in keyof A]: Comparable<A[K]> },
): Comparable<{ readonly [K in keyof A]?: A[K] }> {
  const _comparables = Object.entries(comparables) as [
    keyof A,
    Comparable<A[keyof A]>,
  ][];
  return fromCompare((second) => (first) =>
    _comparables.every(([key, { compare }]) => {
      if (key in first && key in second) {
        return compare(second[key] as A[keyof A])(first[key] as A[keyof A]);
      }
      return first[key] === second[key];
    })
  );
}

/**
 * Create a eq from two other eqs. The resultant eq checks
 * that any two values are equal according to both supplied eqs.
 *
 * @example
 * ```ts
 * import { intersect, struct, partial, string } from "./comparable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { compare } = pipe(
 *   struct({ firstName: string }),
 *   intersect(partial({ lastName: string }))
 * );
 *
 * const batman = { firstName: "Batman" };
 * const grace = { firstName: "Grace", lastName: "Hopper" };
 *
 * const result1 = compare(batman)(grace); // false
 * const result2 = compare(grace)(grace); // true
 * ```
 *
 * @since 2.0.0
 */
export function intersect<I>(
  second: Comparable<I>,
): <A>(first: Comparable<A>) => Comparable<Spread<A & I>> {
  return <A>(first: Comparable<A>): Comparable<Spread<A & I>> =>
    fromCompare((snd: A & I) => (fst: A & I) =>
      first.compare(snd)(fst) && second.compare(snd)(fst)
    ) as Comparable<Spread<A & I>>;
}

/**
 * Create a Comparable from two other Comparables. The resultant Comparable checks
 * that any two values are equal according to at least one of the supplied
 * eqs.
 *
 * It should be noted that we cannot differentiate the eq used to
 * compare two disparate types like number and number[]. Thus, internally
 * union must type cast to any and treat thrown errors as a false
 * equivalence.
 *
 * @example
 * ```ts
 * import { union, number, string } from "./comparable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { compare } = pipe(number, union(string));
 *
 * const result1 = compare(1)("Hello"); // false
 * const result2 = compare(1)(1); // true
 * ```
 *
 * @since 2.0.0
 */
export function union<I>(
  second: Comparable<I>,
): <A>(first: Comparable<A>) => Comparable<A | I> {
  return <A>(first: Comparable<A>) => {
    const _first = handleThrow(uncurry2(first.compare), identity, () => false);
    const _second = handleThrow(
      uncurry2(second.compare),
      identity,
      () => false,
    );
    // deno-lint-ignore no-explicit-any
    return fromCompare((snd: any) => (fst: any) =>
      _first(fst, snd) || _second(fst, snd)
    );
  };
}

/**
 * Create a eq that evaluates lazily. This is useful for equality
 * of recursive types (either mutual or otherwise).
 *
 * @example
 * ```ts
 * import { lazy, intersect, struct, partial, string, Comparable } from "./comparable.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, child?: Person };
 *
 * // Annotating the type is required for recursion
 * const person: Comparable<Person> = lazy('Person', () => pipe(
 *   struct({ name: string }),
 *   intersect(partial({ child: person }))
 * ));
 *
 * const icarus = { name: "Icarus" };
 * const daedalus = { name: "Daedalus", child: icarus };
 *
 * const result1 = person.compare(icarus)(daedalus); // false
 * const result2 = person.compare(daedalus)(daedalus); // true
 * ```
 *
 * @since 2.0.0
 */
export function lazy<A>(_: string, f: () => Comparable<A>): Comparable<A> {
  const memo = memoize<void, Comparable<A>>(f);
  return fromCompare((second) => (first) => memo().compare(second)(first));
}

/**
 * Create a eq that tests the output of a thunk (IO). This assumes that
 * the output of the thunk is always the same, which for true IO is not
 * the case. This assumes that the context for the function is undefined,
 * which means that it doesn't rely on "this" to execute.
 *
 * @example
 * ```ts
 * import { struct, thunk, number } from "./comparable.ts";
 *
 * const { compare } = struct({ asNumber: thunk(number) });
 *
 * const one = { asNumber: () => 1 };
 * const two = { asNumber: () => 2 };
 *
 * const result1 = compare(one)(two); // false
 * const result2 = compare(one)(one); // true
 * ```
 *
 * @since 2.0.0
 */
export function thunk<A>({ compare }: Comparable<A>): Comparable<() => A> {
  return fromCompare((second) => (first) => compare(second())(first()));
}

/**
 * Create a eq from a method on a class or prototypical object. This
 * exists because many objects in javascript do now allow you to pass an
 * object method around on its own without its parent object. For example,
 * if you pass Date.valueOf (type () => number) into another function and
 * call it, the call will fail because valueOf does not carry the reference
 * of its parent object around.
 *
 * @example
 * ```ts
 * import { method, number } from "./comparable.ts";
 *
 * // This eq will work for date, but also for any objects that have
 * // a valueOf method that returns a number.
 * const date = method("valueOf", number);
 *
 * const now = new Date();
 * const alsoNow = new Date(Date.now());
 * const later = new Date(Date.now() + 60 * 60 * 1000);
 *
 * const result1 = date.compare(now)(alsoNow); // true
 * const result2 = date.compare(now)(later); // false
 * ```
 *
 * @since 2.0.0
 */
export function method<M extends string, A>(
  method: M,
  { compare }: Comparable<A>,
): Comparable<{ readonly [K in M]: () => A }> {
  return fromCompare((second) => (first) =>
    compare(second[method]())(first[method]())
  );
}

/**
 * Create a Comparable<L> using a Comparable<D> and a function that takes
 * a type L and returns a type D.
 *
 * @example
 * ```ts
 * import { premap, number } from "./comparable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const dateToNumber = (d: Date): number => d.valueOf();
 * const date = pipe(number, premap(dateToNumber));
 *
 * const now = new Date();
 * const alsoNow = new Date(Date.now());
 * const later = new Date(Date.now() + 60 * 60 * 1000);
 *
 * const result1 = date.compare(now)(alsoNow); // true
 * const result2 = date.compare(now)(later); // false
 * ```
 *
 * Another use for premap with eq is to check for
 * equality after normalizing data. In the following we
 * can compare strings ignoring case by normalizing to
 * lowercase strings.
 *
 * @example
 * ```ts
 * import { premap, string } from "./comparable.ts";
 * import { pipe } from "./fn.ts";
 *
 * const lowercase = (s: string) => s.toLowerCase();
 * const insensitive = pipe(
 *   string, // exact string compare
 *   premap(lowercase), // makes all strings lowercase
 * );
 *
 * const result1 = insensitive.compare("Hello")("World"); // false
 * const result2 = insensitive.compare("hello")("Hello"); // true
 * ```
 *
 * @since 2.0.0
 */
export function premap<L, D>(
  fld: (l: L) => D,
): (eq: Comparable<D>) => Comparable<L> {
  return ({ compare }) =>
    fromCompare((second) => (first) => compare(fld(second))(fld(first)));
}

/**
 * The canonical implementation of Premappable for Comparable.
 *
 * @since 2.0.0
 */
export const PremappableComparable: Premappable<KindContraComparable> = {
  premap,
};

/**
 * The canonical implementation of Schemable for a Comparable. It contains
 * the methods unknown, string, number, boolean, literal, nullable,
 * undefinable, record, array, tuple, struct, partial, intersect,
 * union, and lazy.
 *
 * @since 2.0.0
 */
export const SchemableComparable: Schemable<KindComparable> = {
  unknown: () => unknown,
  string: () => string,
  number: () => number,
  boolean: () => boolean,
  literal,
  nullable,
  undefinable,
  record,
  array,
  tuple,
  struct,
  partial,
  intersect,
  union,
  lazy,
};
