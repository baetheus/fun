/**
 * This file contains all of the tools for creating and
 * composing Eqs. Since a Eq encapsulates the concept
 * of equality, this file contains a lot of tools for
 * comparing objects to see if they are the same, or can
 * be treated the same.
 */

import type { In, Kind, Out } from "./kind.ts";
import type { Contravariant } from "./contravariant.ts";
import type { NonEmptyArray } from "./array.ts";
import type { ReadonlyRecord } from "./record.ts";
import type { Literal, Schemable, Spread } from "./schemable.ts";

import { isNil } from "./nilable.ts";
import { memoize } from "./fn.ts";
import { isSubrecord } from "./record.ts";

/**
 * A Eq<T> is an algebra with a notion of equality. Specifically,
 * a Eq for a type T has an equal method that determines if the
 * two objects are the same. Eqs can be combined, like many
 * algebraic structures. The combinators for Eq in fun can be found
 * in [eq.ts](./eq.ts).
 *
 * An instance of a Eq must obey the following laws:
 *
 * 1. Reflexivity: equals(a)(a) === true
 * 2. Symmetry: equals(a)(b) === equals(b)(a)
 * 3. Transitivity: if equals(a)(b) and equals(b)(c), then equals(a)(c)
 *
 * The original type came from [static-land](https://github.com/fantasyland/static-land/blob/master/docs/spec.md#Eq)
 *
 * @since 2.0.0
 */
export interface Eq<T> {
  readonly equals: (second: T) => (first: T) => boolean;
}

/**
 * Specifies Eq as a Higher Kinded Type, with
 * covariant parameter A corresponding to the 0th
 * index of any Substitutions.
 *
 * @since 2.0.0
 */
export interface URI extends Kind {
  readonly kind: Eq<Out<this, 0>>;
}

/**
 * Specifies Eq as a Higher Kinded Type, with
 * contravariant parameter D corresponding to the 0th
 * index of any Substitutions.
 *
 * @since 2.0.0
 */
export interface URIContravariant extends Kind {
  readonly kind: Eq<In<this, 0>>;
}

/**
 * Create a Eq from an uncurried function that checks equality.
 *
 * @example
 * ```ts
 * import { fromEquals } from "./eq.ts";
 * import { pipe } from "./fn.ts";
 *
 * const EqNumber = fromEquals<number>(
 *   (first, second) => first === second
 * );
 *
 * const result = pipe(
 *   1,
 *   EqNumber.equals(1)
 * ); // true
 * ```
 *
 * @since 2.0.0
 */
export function fromEquals<A>(
  equals: (first: A, second: A) => boolean,
): Eq<A> {
  return ({
    equals: (second) => (first) => first === second || equals(first, second),
  });
}

/**
 * Create a Eq that casts the inner type of another Eq to
 * Readonly.
 *
 * @example
 * ```ts
 * import { readonly, fromEquals } from "./eq.ts";
 *
 * // This has type Eq<Array<string>>
 * const EqMutableArray = fromEquals<Array<string>>(
 *   (first, second) => first.length === second.length
 *   && first.every((value, index) => value === second[index])
 * );
 *
 * // This has type Eq<Readonly<Array<string>>>
 * const EqReadonlyArray = readonly(EqMutableArray);
 * ```
 *
 * @since 2.0.0
 */
export function readonly<A>(eq: Eq<A>): Eq<Readonly<A>> {
  return eq;
}

/**
 * A Eq that can compare any unknown values (and thus can
 * compare any values). Underneath it uses strict equality
 * for the comparison.
 *
 * @example
 * ```ts
 * import { unknown } from "./eq.ts";
 *
 * const result1 = unknown.equals(1)("Hello"); // false
 * const result2 = unknown.equals(1)(1); // true
 * ```
 *
 * @since 2.0.0
 */
export const unknown: Eq<unknown> = {
  equals: (second) => (first) => first === second,
};

/**
 * A Eq that compares strings using strict equality.
 *
 * @example
 * ```ts
 * import { string } from "./eq.ts";
 *
 * const result1 = string.equals("World")("Hello"); // false
 * const result2 = string.equals("")(""); // true
 * ```
 *
 * @since 2.0.0
 */
export const string: Eq<string> = unknown;

/**
 * A Eq that compares number using strict equality.
 *
 * @example
 * ```ts
 * import { number } from "./eq.ts";
 *
 * const result1 = number.equals(1)(2); // false
 * const result2 = number.equals(1)(1); // true
 * ```
 *
 * @since 2.0.0
 */
export const number: Eq<number> = unknown;

/**
 * A Eq that compares booleans using strict equality.
 *
 * @example
 * ```ts
 * import { boolean } from "./eq.ts";
 *
 * const result1 = boolean.equals(true)(false); // false
 * const result2 = boolean.equals(true)(true); // true
 * ```
 *
 * @since 2.0.0
 */
export const boolean: Eq<boolean> = unknown;

/**
 * Creates a Eq that compares a union of literals
 * using strict equality.
 *
 * @example
 * ```ts
 * import { literal } from "./eq.ts";
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
): Eq<A[number]> {
  return unknown;
}

/**
 * Creates a derivative Eq that can also compare null
 * values in addition to the source eq.
 *
 * @example
 * ```ts
 * import { nullable, number } from "./eq.ts";
 *
 * const { equals } = nullable(number);
 *
 * const result1 = equals(1)(null); // false
 * const result2 = equals(null)(null); // true
 * ```
 *
 * @since 2.0.0
 */
export function nullable<A>(eq: Eq<A>): Eq<A | null> {
  return {
    equals: (second) => (first) =>
      (isNil(first) || isNil(second))
        ? first === second
        : eq.equals(second)(first),
  };
}

/**
 * Creates a derivative Eq that can also compare undefined
 * values in addition to the source eq.
 *
 * @example
 * ```ts
 * import { undefinable, number } from "./eq.ts";
 *
 * const { equals } = undefinable(number);
 *
 * const result1 = equals(1)(undefined); // false
 * const result2 = equals(undefined)(undefined); // true
 * ```
 *
 * @since 2.0.0
 */
export function undefinable<A>(eq: Eq<A>): Eq<A | undefined> {
  return {
    equals: (second) => (first) =>
      (isNil(first) || isNil(second))
        ? first === second
        : eq.equals(second)(first),
  };
}

/**
 * Creates a Eq that compares readonly records with items
 * that have the type compared in the supplied eq.
 *
 * @example
 * ```ts
 * import { record, number } from "./eq.ts";
 *
 * const { equals } = record(number);
 *
 * const result1 = equals({ one: 1 })({ one: 2 }); // false
 * const result2 = equals({ one: 1 })({ one: 1 }); // true
 * ```
 *
 * @since 2.0.0
 */
export function record<A>(eq: Eq<A>): Eq<ReadonlyRecord<A>> {
  const isSub = isSubrecord(eq);
  return {
    equals: (second) => (first) => isSub(second)(first) && isSub(first)(second),
  };
}

/**
 * Creates a Eq that compares readonly array with items
 * that have the type compared in the supplied eq.
 *
 * @example
 * ```ts
 * import { array, number } from "./eq.ts";
 *
 * const { equals } = array(number);
 *
 * const result1 = equals([1, 2])([1, 2, 3]); // false
 * const result2 = equals([1, 2])([1, 2]); // true
 * ```
 *
 * @since 2.0.0
 */
export function array<A>(eq: Eq<A>): Eq<ReadonlyArray<A>> {
  return {
    equals: (second) => (first) =>
      first.length === second.length &&
      first.every((value, index) => eq.equals(second[index])(value)),
  };
}

/**
 * Creates a eq that compares, index for index, tuples according
 * to the order and eqs passed into tuple.
 *
 * @example
 * ```ts
 * import { tuple, number, string } from "./eq.ts";
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
export function tuple<T extends ReadonlyArray<Eq<any>>>(
  ...Eqs: T
): Eq<{ [K in keyof T]: T[K] extends Eq<infer A> ? A : never }> {
  return fromEquals((first, second) =>
    Eqs.every((E, i) => E.equals(first[i])(second[i]))
  );
}

/**
 * Create a eq that compares, key for key, structs according
 * to the structure of the eqs passed into struct.
 *
 * @example
 * ```ts
 * import { struct, number, string } from "./eq.ts";
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
  eqs: { readonly [K in keyof A]: Eq<A[K]> },
): Eq<{ readonly [K in keyof A]: A[K] }> {
  const _eqs = Object.entries(eqs) as [keyof A, Eq<A[keyof A]>][];
  return fromEquals((first, second) =>
    _eqs.every(([key, { equals }]) => equals(second[key])(first[key]))
  );
}

/**
 * Create a eq that compares, key for key, structs according
 * to the structure of the eqs passed into struct. It allows
 * the values in the struct to be optional or null.
 *
 * @example
 * ```ts
 * import { struct, number, string } from "./eq.ts";
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
  Eqs: { readonly [K in keyof A]: Eq<A[K]> },
): Eq<{ readonly [K in keyof A]?: A[K] }> {
  const eqs = Object.entries(Eqs) as [keyof A, Eq<A[keyof A]>][];
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
 * Create a eq from two other eqs. The resultant eq checks
 * that any two values are equal according to both supplied eqs.
 *
 * @example
 * ```ts
 * import { intersect, struct, partial, string } from "./eq.ts";
 * import { pipe } from "./fn.ts";
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
  second: Eq<I>,
): <A>(first: Eq<A>) => Eq<Spread<A & I>> {
  return <A>(first: Eq<A>): Eq<Spread<A & I>> => ({
    equals: (snd) => (fst) =>
      first.equals(snd as A)(fst as A) && second.equals(snd as I)(fst as I),
  });
}

/**
 * Create a eq from two other eqs. The resultant eq checks
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
 * import { union, number, string } from "./eq.ts";
 * import { pipe } from "./fn.ts";
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
  ui: Eq<I>,
): <A>(first: Eq<A>) => Eq<A | I> {
  return (ua) => ({
    equals: (second) => (first) => {
      if (first === second) {
        return true;
      } else {
        try {
          // deno-lint-ignore no-explicit-any
          return ua.equals(second as any)(first as any) ||
            // deno-lint-ignore no-explicit-any
            ui.equals(second as any)(first as any);
        } catch {
          return false;
        }
      }
    },
  });
}

/**
 * Create a eq that evaluates lazily. This is useful for equality
 * of recursive types (either mutual or otherwise).
 *
 * @example
 * ```ts
 * import { lazy, intersect, struct, partial, string, Eq } from "./eq.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, child?: Person };
 *
 * // Annotating the type is required for recursion
 * const person: Eq<Person> = lazy('Person', () => pipe(
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
export function lazy<A>(_: string, f: () => Eq<A>): Eq<A> {
  const memo = memoize<void, Eq<A>>(f);
  return { equals: (second) => (first) => memo().equals(second)(first) };
}

/**
 * Create a eq that tests the output of a thunk (IO). This assumes that
 * the output of the thunk is always the same, which for true IO is not
 * the case. This assumes that the context for the function is undefined,
 * which means that it doesn't rely on "this" to execute.
 *
 * @example
 * ```ts
 * import { struct, io, number } from "./eq.ts";
 * import { of as constant } from "./fn.ts";
 *
 * const { equals } = struct({ asNumber: io(number) });
 *
 * const one = { asNumber: () => 1 };
 * const two = { asNumber: () => 2 };
 *
 * const result1 = equals(one)(two); // false
 * const result2 = equals(one)(one); // true
 * ```
 *
 * @since 2.0.0
 */
export function io<A>(eq: Eq<A>): Eq<() => A> {
  return { equals: (second) => (first) => eq.equals(second())(first()) };
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
 * import { method, number } from "./eq.ts";
 *
 * // This eq will work for date, but also for any objects that have
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
  eq: Eq<A>,
): Eq<{ readonly [K in M]: () => A }> {
  return {
    equals: (second) => (first) => eq.equals(second[method]())(first[method]()),
  };
}

/**
 * Create a Eq<L> using a Eq<D> and a function that takes
 * a type L and returns a type D.
 *
 * @example
 * ```ts
 * import { contramap, number } from "./eq.ts";
 * import { pipe } from "./fn.ts";
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
 * Another use for contramap with eq is to check for
 * equality after normalizing data. In the following we
 * can compare strings ignoring case by normalizing to
 * lowercase strings.
 *
 * @example
 * ```ts
 * import { contramap, string } from "./eq.ts";
 * import { pipe } from "./fn.ts";
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
): (eq: Eq<D>) => Eq<L> {
  return ({ equals }) => ({
    equals: ((second) => (first) => equals(fld(second))(fld(first))),
  });
}

/**
 * The canonical implementation of Contravariant for Eq. It contains
 * the method contramap.
 *
 * @since 2.0.0
 */
export const ContravariantEq: Contravariant<URIContravariant> = {
  contramap,
};

/**
 * The canonical implementation of Schemable for a Eq. It contains
 * the methods unknown, string, number, boolean, literal, nullable,
 * undefinable, record, array, tuple, struct, partial, intersect,
 * union, and lazy.
 *
 * @since 2.0.0
 */
export const SchemableEq: Schemable<URI> = {
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
