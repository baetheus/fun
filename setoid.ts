/**
 * This file contains all of the tools for creating and
 * composing Setoids. Since a Setoid encapsulates the concept
 * of equality, this file contains a lot of tools for
 * comparing objects to see if they are the same, or can
 * be treated the same.
 */

import type { In, Kind, Out } from "./kind.ts";
import type { Contravariant } from "./contravariant.ts";
import type { NonEmptyArray } from "./array.ts";
import type { ReadonlyRecord } from "./record.ts";
import type { Literal, Schemable } from "./schemable.ts";

import { isNil, memoize, tryCatch } from "./fns.ts";
import { isSubrecord } from "./record.ts";

/**
 * A Setoid<T> is an algebra with a notion of equality. Specifically,
 * a Setoid for a type T has an equal method that determines if the
 * two objects are the same. Setoids can be combined, like many
 * algebraic structures. The combinators for Setoid in fun can be found
 * in [setoid.ts](./setoid.ts).
 *
 * An instance of a Setoid must obey the following laws:
 *
 * 1. Reflexivity: equals(a)(a) === true
 * 2. Symmetry: equals(a)(b) === equals(b)(a)
 * 3. Transitivity: if equals(a)(b) and equals(b)(c), then equals(a)(c)
 *
 * The original type came from [static-land](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#Setoid)
 *
 * @since 2.0.0
 */
export interface Setoid<T> {
  readonly equals: (second: T) => (first: T) => boolean;
}

/**
 * Specifies Setoid as a Higher Kinded Type, with
 * covariant parameter A corresponding to the 0th
 * index of any Substitutions.
 *
 * @since 2.0.0
 */
export interface URI extends Kind {
  readonly kind: Setoid<Out<this, 0>>;
}

/**
 * Specifies Setoid as a Higher Kinded Type, with
 * contravariant parameter D corresponding to the 0th
 * index of any Substitutions.
 *
 * @since 2.0.0
 */
export interface URIContravariant extends Kind {
  readonly kind: Setoid<In<this, 0>>;
}

/**
 * Create a Setoid from an uncurried function that checks equality.
 *
 * @example
 * ```ts
 * import { fromEquals } from "./setoid.ts";
 * import { pipe } from "./fns.ts";
 *
 * const SetoidNumber = fromEquals<number>(
 *   (first, second) => first === second
 * );
 *
 * const result = pipe(
 *   1,
 *   SetoidNumber.equals(1)
 * ); // true
 * ```
 *
 * @since 2.0.0
 */
export function fromEquals<A>(
  equals: (first: A, second: A) => boolean,
): Setoid<A> {
  return ({
    equals: (second) => (first) => first === second || equals(first, second),
  });
}

/**
 * Create a Setoid that casts the inner type of another Setoid to
 * Readonly.
 *
 * @example
 * ```ts
 * import { readonly, fromEquals } from "./setoid.ts";
 *
 * // This has type Setoid<Array<string>>
 * const SetoidMutableArray = fromEquals<Array<string>>(
 *   (first, second) => first.length === second.length
 *   && first.every((value, index) => value === second[index])
 * );
 *
 * // This has type Setoid<Readonly<Array<string>>>
 * const SetoidReadonlyArray = readonly(SetoidMutableArray);
 * ```
 *
 * @since 2.0.0
 */
export function readonly<A>(setoid: Setoid<A>): Setoid<Readonly<A>> {
  return setoid;
}

/**
 * A Setoid that can compare any unknown values (and thus can
 * compare any values). Underneath it uses strict equality
 * for the comparison.
 *
 * @example
 * ```ts
 * import { unknown } from "./setoid.ts";
 *
 * const result1 = unknown.equals(1)("Hello"); // false
 * const result2 = unknown.equals(1)(1); // true
 * ```
 *
 * @since 2.0.0
 */
export const unknown: Setoid<unknown> = {
  equals: (second) => (first) => first === second,
};

/**
 * A Setoid that compares strings using strict equality.
 *
 * @example
 * ```ts
 * import { string } from "./setoid.ts";
 *
 * const result1 = string.equals("World")("Hello"); // false
 * const result2 = string.equals("")(""); // true
 * ```
 *
 * @since 2.0.0
 */
export const string: Setoid<string> = unknown;

/**
 * A Setoid that compares number using strict equality.
 *
 * @example
 * ```ts
 * import { number } from "./setoid.ts";
 *
 * const result1 = number.equals(1)(2); // false
 * const result2 = number.equals(1)(1); // true
 * ```
 *
 * @since 2.0.0
 */
export const number: Setoid<number> = unknown;

/**
 * A Setoid that compares booleans using strict equality.
 *
 * @example
 * ```ts
 * import { boolean } from "./setoid.ts";
 *
 * const result1 = boolean.equals(true)(false); // false
 * const result2 = boolean.equals(true)(true); // true
 * ```
 *
 * @since 2.0.0
 */
export const boolean: Setoid<boolean> = unknown;

/**
 * Creates a Setoid that compares a union of literals
 * using strict equality.
 *
 * @example
 * ```ts
 * import { literal } from "./setoid.ts";
 *
 * const { equals } = literal(1, 2, "Three");
 *
 * const result1 = equals(1)("Three"); // false
 * const result2 = equals("Three")("Three"); // true
 * ```
 *
 * @since 2.0.0
 */
export function literal<A extends NonEmptyArray<Literal>>(
  ..._: A
): Setoid<A[number]> {
  return unknown;
}

/**
 * Creates a derivative Setoid that can also compare null
 * values in addition to the source setoid.
 *
 * @example
 * ```ts
 * import { nullable, number } from "./setoid.ts";
 *
 * const { equals } = nullable(number);
 *
 * const result1 = equals(1)(null); // false
 * const result2 = equals(null)(null); // true
 * ```
 *
 * @since 2.0.0
 */
export function nullable<A>(setoid: Setoid<A>): Setoid<A | null> {
  return {
    equals: (second) => (first) =>
      (isNil(first) || isNil(second))
        ? first === second
        : setoid.equals(second)(first),
  };
}

/**
 * Creates a derivative Setoid that can also compare undefined
 * values in addition to the source setoid.
 *
 * @example
 * ```ts
 * import { undefinable, number } from "./setoid.ts";
 *
 * const { equals } = undefinable(number);
 *
 * const result1 = equals(1)(undefined); // false
 * const result2 = equals(undefined)(undefined); // true
 * ```
 *
 * @since 2.0.0
 */
export function undefinable<A>(setoid: Setoid<A>): Setoid<A | undefined> {
  return {
    equals: (second) => (first) =>
      (isNil(first) || isNil(second))
        ? first === second
        : setoid.equals(second)(first),
  };
}

/**
 * Creates a Setoid that compares readonly records with items
 * that have the type compared in the supplied setoid.
 *
 * @example
 * ```ts
 * import { record, number } from "./setoid.ts";
 *
 * const { equals } = record(number);
 *
 * const result1 = equals({ one: 1 })({ one: 2 }); // false
 * const result2 = equals({ one: 1 })({ one: 1 }); // true
 * ```
 *
 * @since 2.0.0
 */
export function record<A>(setoid: Setoid<A>): Setoid<ReadonlyRecord<A>> {
  const isSub = isSubrecord(setoid);
  return {
    equals: (second) => (first) => isSub(second)(first) && isSub(first)(second),
  };
}

/**
 * Creates a Setoid that compares readonly array with items
 * that have the type compared in the supplied setoid.
 *
 * @example
 * ```ts
 * import { array, number } from "./setoid.ts";
 *
 * const { equals } = array(number);
 *
 * const result1 = equals([1, 2])([1, 2, 3]); // false
 * const result2 = equals([1, 2])([1, 2]); // true
 * ```
 *
 * @since 2.0.0
 */
export function array<A>(setoid: Setoid<A>): Setoid<ReadonlyArray<A>> {
  return {
    equals: (second) => (first) =>
      first.length === second.length &&
      first.every((value, index) => setoid.equals(second[index])(value)),
  };
}

/**
 * Creates a setoid that compares, index for index, tuples according
 * to the order and setoids passed into tuple.
 *
 * @example
 * ```ts
 * import { tuple, number, string } from "./setoid.ts";
 *
 * const { equals } = tuple(number, string);
 *
 * const result1 = equals([1, "Hello"])([1, "Goodbye"]); // false
 * const result2 = equals([1, ""])([1, ""]); // true
 * ```
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export function tuple<T extends ReadonlyArray<Setoid<any>>>(
  ...Setoids: T
): Setoid<{ [K in keyof T]: T[K] extends Setoid<infer A> ? A : never }> {
  return fromEquals((first, second) =>
    Setoids.every((E, i) => E.equals(first[i])(second[i]))
  );
}

/**
 * Create a setoid that compares, key for key, structs according
 * to the structure of the setoids passed into struct.
 *
 * @example
 * ```ts
 * import { struct, number, string } from "./setoid.ts";
 *
 * const { equals } = struct({ name: string, age: number });
 *
 * const brandon = { name: "Brandon", age: 37 };
 * const emily = { name: "Emily", age: 32 };
 *
 * const result1 = equals(brandon)(emily); // false
 * const result2 = equals(brandon)(brandon); // true
 * ```
 *
 * @since 2.0.0
 */
export function struct<A>(
  setoids: { readonly [K in keyof A]: Setoid<A[K]> },
): Setoid<{ readonly [K in keyof A]: A[K] }> {
  const eqs = Object.entries(setoids) as [keyof A, Setoid<A[keyof A]>][];
  return fromEquals((first, second) =>
    eqs.every(([key, { equals }]) => equals(second[key])(first[key]))
  );
}

/**
 * Create a setoid that compares, key for key, structs according
 * to the structure of the setoids passed into struct. It allows
 * the values in the struct to be optional or null.
 *
 * @example
 * ```ts
 * import { struct, number, string } from "./setoid.ts";
 *
 * const { equals } = struct({ name: string, age: number });
 *
 * const brandon = { name: "Brandon", age: 37 };
 * const emily = { name: "Emily", age: 32 };
 *
 * const result1 = equals(brandon)(emily); // false
 * const result2 = equals(brandon)(brandon); // true
 * ```
 *
 * @since 2.0.0
 */
export function partial<A>(
  Setoids: { readonly [K in keyof A]: Setoid<A[K]> },
): Setoid<{ readonly [K in keyof A]?: A[K] | null }> {
  const eqs = Object.entries(Setoids) as [keyof A, Setoid<A[keyof A]>][];
  return fromEquals((first, second) =>
    eqs.every(([key, { equals }]) => {
      const firstValue = first[key] as A[keyof A] | null | undefined;
      const secondValue = second[key] as A[keyof A] | null | undefined;
      if (isNil(firstValue) || isNil(secondValue)) {
        return firstValue === secondValue;
      } else {
        return equals(secondValue)(firstValue);
      }
    })
  );
}

/**
 * Create a setoid from two other setoids. The resultant setoid checks
 * that any two values are equal according to both supplied setoids.
 *
 * @example
 * ```ts
 * import { intersect, struct, partial, string } from "./setoid.ts";
 * import { pipe } from "./fns.ts";
 *
 * const { equals } = pipe(
 *   struct({ firstName: string }),
 *   intersect(partial({ lastName: string }))
 * );
 *
 * const batman = { firstName: "Batman" };
 * const grace = { firstName: "Grace", lastName: "Hopper" };
 *
 * const result1 = equals(batman)(grace); // false
 * const result2 = equals(grace)(grace); // true
 * ```
 *
 * @since 2.0.0
 */
export function intersect<I>(
  ui: Setoid<I>,
): <A>(first: Setoid<A>) => Setoid<A & I> {
  return (ua) => ({
    equals: (second) => (first) =>
      ua.equals(second)(first) && ui.equals(second)(first),
  });
}

/**
 * Create a setoid from two other setoids. The resultant setoid checks
 * that any two values are equal according to at least one of the supplied
 * setoids.
 *
 * It should be noted that we cannot differentiate the setoid used to
 * compare two disparate types like number and number[]. Thus, internally
 * union must type cast to any and treat thrown errors as a false
 * equivalence. To mitigate most of these issues we first test if the
 * 'typeof' the values matches, but keep in mind that if you are doing
 * any nonsense by mutating within a setoid that union will find and
 * expose such nonsense in inconsistent ways.
 *
 * @example
 * ```ts
 * import { union, number, string } from "./setoid.ts";
 * import { pipe } from "./fns.ts";
 *
 * const { equals } = pipe(number, union(string));
 *
 * const result1 = equals(1)("Hello"); // false
 * const result2 = equals(1)(1); // true
 * ```
 *
 * @since 2.0.0
 */
export function union<I>(
  ui: Setoid<I>,
): <A>(first: Setoid<A>) => Setoid<A | I> {
  return (ua) => ({
    equals: (second) => (first) =>
      first === second ||
      (
        typeof first === typeof second &&
        (
          // deno-lint-ignore no-explicit-any
          tryCatch(() => ua.equals(second as any)(first as any), () => false) ||
          // deno-lint-ignore no-explicit-any
          tryCatch(() => ui.equals(second as any)(first as any), () => false)
        )
      ),
  });
}

/**
 * Create a setoid that evaluates lazily. This is useful for equality
 * of recursive types (either mutual or otherwise).
 *
 * @example
 * ```ts
 * import { lazy, intersect, struct, partial, string, Setoid } from "./setoid.ts";
 * import { pipe } from "./fns.ts";
 *
 * type Person = { name: string, child?: Person };
 *
 * // Annotating the type is required for recursion
 * const person: Setoid<Person> = lazy('Person', () => pipe(
 *   struct({ name: string }),
 *   intersect(partial({ child: person }))
 * ));
 *
 * const icarus = { name: "Icarus" };
 * const daedalus = { name: "Daedalus", child: icarus };
 *
 * const result1 = person.equals(icarus)(daedalus); // false
 * const result2 = person.equals(daedalus)(daedalus); // true
 * ```
 *
 * @since 2.0.0
 */
export function lazy<A>(_: string, f: () => Setoid<A>): Setoid<A> {
  const memo = memoize<void, Setoid<A>>(f);
  return { equals: (second) => (first) => memo().equals(second)(first) };
}

/**
 * Create a setoid that tests the output of a thunk (IO). This assumes that
 * the output of the thunk is always the same, which for true IO is not
 * the case. This assumes that the context for the function is undefined,
 * which means that it doesn't rely on "this" to execute.
 *
 * @example
 * ```ts
 * import { struct, io, number } from "./setoid.ts";
 * import { constant } from "./fns.ts";
 *
 * const { equals } = struct({ asNumber: io(number) });
 *
 * const one = { asNumber: constant(1) };
 * const two = { asNumber: constant(2) };
 *
 * const result1 = equals(one)(two); // false
 * const result2 = equals(one)(one); // true
 * ```
 *
 * @since 2.0.0
 */
export function io<A>(setoid: Setoid<A>): Setoid<() => A> {
  return { equals: (second) => (first) => setoid.equals(second())(first()) };
}

/**
 * Create a setoid from a method on a class or prototypical object. This
 * exists because many objects in javascript do now allow you to pass an
 * object method around on its own without its parent object. For example,
 * if you pass Date.valueOf (type () => number) into another function and
 * call it, the call will fail because valueOf does not carry the reference
 * of its parent object around.
 *
 * @example
 * ```ts
 * import { method, number } from "./setoid.ts";
 *
 * // This setoid will work for date, but also for any objects that have
 * // a valueOf method that returns a number.
 * const date = method("valueOf", number);
 *
 * const now = new Date();
 * const alsoNow = new Date(Date.now());
 * const later = new Date(Date.now() + 60 * 60 * 1000);
 *
 * const result1 = date.equals(now)(alsoNow); // true
 * const result2 = date.equals(now)(later); // false
 * ```
 *
 * @since 2.0.0
 */
export function method<M extends string, A>(
  method: M,
  setoid: Setoid<A>,
): Setoid<{ readonly [K in M]: () => A }> {
  return {
    equals: (second) => (first) =>
      setoid.equals(second[method]())(first[method]()),
  };
}

/**
 * Create a Setoid<L> using a Setoid<D> and a function that takes
 * a type L and returns a type D.
 *
 * @example
 * ```ts
 * import { contramap, number } from "./setoid.ts";
 * import { pipe } from "./fns.ts";
 *
 * const dateToNumber = (d: Date): number => d.valueOf();
 * const date = pipe(number, contramap(dateToNumber));
 *
 * const now = new Date();
 * const alsoNow = new Date(Date.now());
 * const later = new Date(Date.now() + 60 * 60 * 1000);
 *
 * const result1 = date.equals(now)(alsoNow); // true
 * const result2 = date.equals(now)(later); // false
 * ```
 *
 * Another use for contramap with setoid is to check for
 * equality after normalizing data. In the following we
 * can compare strings ignoring case by normalizing to
 * lowercase strings.
 *
 * @example
 * ```ts
 * import { contramap, string } from "./setoid.ts";
 * import { pipe } from "./fns.ts";
 *
 * const lowercase = (s: string) => s.toLowerCase();
 * const insensitive = pipe(
 *   string, // exact string compare
 *   contramap(lowercase), // makes all strings lowercase
 * );
 *
 * const result1 = insensitive.equals("Hello")("World"); // false
 * const result2 = insensitive.equals("hello")("Hello"); // true
 * ```
 *
 * @since 2.0.0
 */
export function contramap<L, D>(
  fld: (l: L) => D,
): (setoid: Setoid<D>) => Setoid<L> {
  return ({ equals }) => ({
    equals: ((second) => (first) => equals(fld(second))(fld(first))),
  });
}

/**
 * The canonical implementation of Contravariant for Setoid. It contains
 * the method contramap.
 *
 * @since 2.0.0
 */
export const ContravariantSetoid: Contravariant<URIContravariant> = {
  contramap,
};

/**
 * The canonical implementation of Schemable for a Setoid. It contains
 * the methods unknown, string, number, boolean, literal, nullable,
 * undefinable, record, array, tuple, struct, partial, intersect,
 * union, and lazy.
 *
 * @since 2.0.0
 */
export const SchemableSetoid: Schemable<URI> = {
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
