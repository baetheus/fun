/**
 * The Refinement type represents a function that takes a type and returns a
 * boolean. It denotes a function that narrows a type at runtime. For example
 * the function `(n: unknown): n is number => typeof n === "number"` is the
 * refinement type `Refinement<unknown, number>`. The primary use for Refinement
 * is to align the runtime value with compile time types.
 *
 * @module Refinement
 * @since 2.0.0
 */
import type { In, Kind, Out } from "./kind.ts";

import type { NonEmptyArray } from "./array.ts";
import type { Option } from "./option.ts";
import type { Either } from "./either.ts";
import type { ReadonlyRecord } from "./record.ts";
import type { Literal, Schemable } from "./schemable.ts";

import { memoize } from "./fn.ts";

/**
 * The refinement type is a function that returns a boolean indicating that a
 * value satisfies a type.
 *
 * @since 2.0.0
 */
export type Refinement<A, B extends A> = (a: A) => a is B;

/**
 * A type that matches any refinement type.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyRefinement = Refinement<unknown, any>;

/**
 * The ToIn type takes a Refinement type and returns the type of its input.
 *
 * @since 2.0.0
 */
export type ToIn<T> = T extends Refinement<infer B, infer _> ? B : never;

/**
 * The ToOut type takes a Refinement type and returns the type of its output
 * refinement.
 *
 * @since 2.0.0
 */
export type ToOut<T> = T extends Refinement<infer _, infer A> ? A : never;

/**
 * Specifies Refinement as a Higher Kinded Type, with covariant
 * parameter B corresponding to the 0th index of any substitutions and
 * contravariant parameter A corresponding to the 0th index of any
 * substitutions.
 *
 * @since 2.0.0
 */
export interface KindRefinement extends Kind {
  readonly kind: Refinement<In<this, 0>, Out<this, 0>>;
}

/**
 * Specifies Refinement<unknown, B> as a Higher Kinded Type, with covariant
 * parameter B corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindUnknownRefinement extends Kind {
  readonly kind: Refinement<unknown, Out<this, 0>>;
}

/**
 * Construct a refinement from a function (a: A) => Option<B> where None denotes
 * that a type does not satisfy the refinement.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 * import * as O from "./option.ts";
 *
 * const refine = R.fromOption((u: unknown) => typeof u === "number" ? O.some(u)
 * : O.none);
 * const value1: unknown = "Hello";
 * const value2: unknown = 0;
 *
 * const result1 = refine(value1); // false, value1: unknown
 * const result2 = refine(value2); // true, value2: number
 * ```
 *
 * @since 2.0.0
 */
export function fromOption<A, B extends A>(
  faob: (a: A) => Option<B>,
): Refinement<A, B> {
  return (a: A): a is B => faob(a).tag === "Some";
}

/**
 * Construct a refinement from a function (a: A) => Either<J, I> where Left denotes
 * that a type does not satisfy the refinement.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 * import * as E from "./either.ts";
 *
 * const refine = R.fromEither((u: unknown) => typeof u === "number" ? E.right(u)
 * : E.left(u));
 * const value1: unknown = "Hello";
 * const value2: unknown = 0;
 *
 * const result1 = refine(value1); // false, value1: unknown
 * const result2 = refine(value2); // true, value2: number
 * ```
 *
 * @since 2.0.0
 */
export function fromEither<A, B extends A>(
  faob: (a: A) => Either<unknown, B>,
): Refinement<A, B> {
  return (a: A): a is B => faob(a).tag === "Right";
}

/**
 * Compose two refinements into a new refinement that returns true if either of
 * the two input refinements return true.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 * import { pipe } from "./fn.ts";
 *
 * const number = (u: unknown): u is number => typeof u === "number";
 * const string = (u: unknown): u is string => typeof u === "string";
 * const refine = pipe(number, R.or(string));
 *
 * const result1 = refine("Hello"); // true
 * const result2 = refine(null); // false
 * ```
 *
 * @since 2.0.0
 */
export function or<A, C extends A>(
  second: Refinement<A, C>,
): <B extends A>(first: Refinement<A, B>) => Refinement<A, B | C> {
  return <B extends A>(first: Refinement<A, B>): Refinement<A, B | C> =>
  (a: A): a is B | C => first(a) || second(a);
}

/**
 * Compose two refinements into a new refinement that returns true if both of
 * the two input refinements return true.
 *
 * @example
 * ```ts
 * import type { Newtype } from "./newtype.ts";
 *
 * import * as R from "./refinement.ts";
 * import { pipe } from "./fn.ts";
 *
 * const isBig = (s: unknown): s is "Big" => s === "Big";
 * const refine = pipe(R.string, R.and(isBig));
 *
 * const result1 = refine(null); // false
 * const result2 = refine("Hello"); // false
 * const result3 = refine("Big"); // false
 * ```
 *
 * @since 2.0.0
 */
export function and<A, C extends A>(
  second: Refinement<A, C>,
): <B extends A>(first: Refinement<A, B>) => Refinement<A, B & C> {
  return <B extends A>(first: Refinement<A, B>): Refinement<A, B & C> =>
  (a: A): a is B & C => first(a) && second(a);
}

/**
 * Create a identity refinement that always returns true as at the type level a
 * type A is always a type A.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const number = R.id<number>();
 *
 * const result = number(1); // true.. but only numbers can be passed here.
 * ```
 *
 * @since 2.0.0
 */
export function id<A>(): Refinement<A, A> {
  return (() => true) as unknown as Refinement<A, A>;
}

/**
 * Compose two refinements, A -> B and B -> C creating a `Refinement<A, C>`.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string };
 * type Rec = Record<string, unknown>;
 *
 * const nonnull = (u: unknown): u is Rec => u !== null && u !== undefined;
 * const hasKey =
 *   <K extends string>(key: K) => (u: Rec): u is Record<K, unknown> =>
 *     Object.hasOwn(u, key);
 * const person = (u: Record<"name", unknown>): u is Person =>
 *   typeof u.name ===
 *     "string";
 *
 * const isPerson = pipe(nonnull, R.compose(hasKey("name")), R.compose(person));
 *
 * const value1 = null;
 * const value2 = {};
 * const value3 = { name: 1 };
 * const value4 = { name: "Brandon" };
 *
 * const result1 = isPerson(value1); // false
 * const result2 = isPerson(value2); // false
 * const result3 = isPerson(value3); // false
 * const result4 = isPerson(value4); // true, value4: Person
 * ```
 *
 * @since 2.0.0
 */
export function compose<A, B extends A, C extends B>(
  second: Refinement<B, C>,
): (first: Refinement<A, B>) => Refinement<A, C> {
  return (first: Refinement<A, B>): Refinement<A, C> => (a: A): a is C =>
    first(a) && second(a);
}

/**
 * An instance of `Refinement<unknown, unknown>`.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const result = R.unknown(null); // true, null is unknown! all is unknown!
 * ```
 *
 * @since 2.0.0
 */
export function unknown(_: unknown): _ is unknown {
  return true;
}

/**
 * An instance of `Refinement<unknown, string>`.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const result1 = R.string(null); // false
 * const result2 = R.string("Hello"); // true, a variable is now typed as string
 * ```
 *
 * @since 2.0.0
 */
export function string(a: unknown): a is string {
  return typeof a === "string";
}

/**
 * An instance of `Refinement<unknown, number>`.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const result1 = R.number(null); // false
 * const result2 = R.number(2); // true, a variable is now typed as number
 * ```
 *
 * @since 2.0.0
 */
export function number(a: unknown): a is number {
  return typeof a === "number";
}

/**
 * An instance of `Refinement<unknown, boolean>`.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const result1 = R.boolean(null); // false
 * const result2 = R.boolean(true); // true, a variable is now typed as true
 * ```
 *
 * @since 2.0.0
 */
export function boolean(a: unknown): a is boolean {
  return typeof a === "boolean";
}

/**
 * An instance of `Refinement<unknown, Record<string, unknown>>`.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const result1 = R.isRecord(null); // false
 * const result2 = R.isRecord({});
 * // true, a variable is now typed as Record<string, unknown>
 * ```
 *
 * @since 2.0.0
 */
export function isRecord(a: unknown): a is Record<string, unknown> {
  return typeof a === "object" && a !== null;
}

/**
 * An instance of `Refinement<unknown, Array<unknown>>`.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const result1 = R.isArray(null); // false
 * const result2 = R.isArray([]);
 * // true, a variable is now typed as Array<unknown>
 * ```
 *
 * @since 2.0.0
 */
export function isArray(a: unknown): a is Array<unknown> {
  return Array.isArray(a);
}

/**
 * Creates an instance `Refinement<unknown, Array<unknown> & { length: N }>`
 * where N is a number.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const isTwoTuple = R.isArrayN(2);
 *
 * const result1 = isTwoTuple(null); // false
 * const result2 = isTwoTuple([]); // false
 * const result3 = isTwoTuple([1, 2]);
 * // true, a variable is now typed as Array<unknown> & { length: 2 }
 * ```
 *
 * @since 2.0.0
 */
export function isArrayN<N extends number>(
  n: N,
): Refinement<unknown, Array<unknown> & { length: N }> {
  return (a): a is Array<unknown> & { length: N } =>
    isArray(a) && a.length == n;
}

/**
 * Creates an instance of `Refinement<unknown, P>` where P is a union of literal
 * values.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const places = R.literal(1, 2, 3);
 *
 * const result1 = places(null); // false
 * const result2 = places(1); // true, variable now typed as 1 | 2 | 3
 * const result3 = places(2); // true, variable now typed as 1 | 2 | 3
 * const result4 = places(10); // false
 * ```
 *
 * @since 2.0.0
 */
export function literal<A extends NonEmptyArray<Literal>>(
  ...literals: A
): Refinement<unknown, A[number]> {
  return (a): a is A[number] => literals.some((l) => l === a);
}

/**
 * Turn a `Refinement<A, B>` into `Refinement<null | A, null | B>`.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const nullOrNum = R.nullable(R.number);
 *
 * const result1 = nullOrNum(null); // true, variable is now null | number
 * const result2 = nullOrNum(1); // true, variable is now null | number
 * const result3 = nullOrNum("hello"); // false
 * ```
 *
 * @since 2.0.0
 */
export function nullable<A, B extends A>(
  or: Refinement<A, B>,
): Refinement<A | null, B | null> {
  return (a): a is B | null => a === null || or(a);
}

/**
 * Turn a `Refinement<A, B>` into `Refinement<undefined | A, undefined | B>`.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const test = R.undefinable(R.number);
 *
 * const result1 = test(null); // false
 * const result2 = test(1); // true, variable is now undefined | number
 * const result3 = test("hello"); // false
 * const result4 = test(undefined); // true, variable is now undefined | number
 * ```
 *
 * @since 2.0.0
 */
export function undefinable<A, B extends A>(
  or: Refinement<A, B>,
): Refinement<A | undefined, B | undefined> {
  return (a): a is B | undefined => a === undefined || or(a);
}

/**
 * Turn a `Refinement<unknown, A>` into `Refinement<unknown, ReadonlyRecord<A>>`.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const numbers = R.record(R.number);
 *
 * const result1 = numbers(null); // false
 * const result2 = numbers({}); // true, {} has type ReadonlyRecord<number>
 * const result3 = numbers({ hello: "world" }); // false
 * const result4 = numbers({ hello: 1 });
 * // true, variable has type ReadonlyRecord<number>
 * ```
 *
 * @since 2.0.0
 */
export function record<A>(
  codomain: Refinement<unknown, A>,
): Refinement<unknown, ReadonlyRecord<A>> {
  return (a): a is ReadonlyRecord<A> =>
    isRecord(a) && Object.values(a).every(codomain);
}

/**
 * Turn a `Refinement<unknown, A>` into `Refinement<unknown, ReadonlyArray<A>>`.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const numbers = R.array(R.number);
 *
 * const result1 = numbers(null); // false
 * const result2 = numbers([]); // true, [] has type ReadonlyArray<number>
 * const result3 = numbers(["Hello"]); // false
 * const result4 = numbers([1]);
 * // true, variable has type ReadonlyArray<number>
 * ```
 *
 * @since 2.0.0
 */
export function array<A>(
  item: Refinement<unknown, A>,
): Refinement<unknown, ReadonlyArray<A>> {
  return (a): a is Array<A> => Array.isArray(a) && a.every(item);
}

/**
 * Create a Refinement from an array of refinements, where each index of a type
 * much match the originated refinement type.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const tuple = R.tuple(R.number, R.string);
 *
 * const result1 = tuple(null); // false
 * const result2 = tuple([]); // false
 * const result3 = tuple(["Hello", 1]); // false
 * const result4 = tuple([1, "Hello"]);
 * // true, variable has type [number, string]
 * const result5 = tuple([1, "Hello", "Goodbye"]); // false
 * ```
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export function tuple<A extends any[]>(
  ...items: { [K in keyof A]: Refinement<unknown, A[K]> }
): Refinement<unknown, { [K in keyof A]: A[K] }> {
  return (a): a is { [K in keyof A]: A[K] } =>
    Array.isArray(a) && items.length === a.length &&
    a.every((value, index) => items[index](value));
}

/**
 * Create a Refinement from a struct of refinements, where each index of a type
 * much match the originated refinement type, key for key.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const struct = R.struct({
 *   num: R.number,
 *   str: R.string
 * });
 *
 * const result1 = struct(null); // false
 * const result2 = struct({}); // false
 * const result3 = struct({ num: "Hello", str: 1 }); // false
 * const result4 = struct({ num: 1, str: "Hello" });
 * // true, variable has type { num: number, str: string }
 * const result5 = struct([1, "Hello", "Goodbye"]); // false
 * ```
 *
 * @since 2.0.0
 */
export function struct<A>(
  items: { [K in keyof A]: Refinement<unknown, A[K]> },
): Refinement<unknown, { readonly [K in keyof A]: A[K] }> {
  const entries: [string, Refinement<unknown, A[keyof A]>][] = Object.entries(
    items,
  );
  return (a): a is { readonly [K in keyof A]: A[K] } =>
    isRecord(a) &&
    entries.every(([key, refine]) => key in a && refine(a[key]));
}

/**
 * Create a Refinement from a struct of refinements, where each index of a type
 * much match the originated refinement type, key for key, or not have that
 * property at all. This is distinct from the property being null or undefined.
 *
 * @example
 * ```ts
 * import * as R from "./refinement.ts";
 *
 * const struct = R.partial({
 *   num: R.number,
 *   str: R.string
 * });
 *
 * const result1 = struct(null); // false
 * const result2 = struct({}); // true,
 * const result3 = struct({ num: "Hello", str: 1 }); // false
 * const result4 = struct({ num: 1, str: "Hello" });
 * // true, variable has type { num?: number, str": string }
 * const result5 = struct({
 *   num: 1,
 *   str: "Hello",
 *   other: "Goodbye"
 * }); // true, variable ahs type { num?: number, str?: string }
 * ```
 *
 * @since 2.0.0
 */
export function partial<A>(
  items: { [K in keyof A]: Refinement<unknown, A[K]> },
): Refinement<unknown, { readonly [K in keyof A]?: A[K] }> {
  const entries: [string, Refinement<unknown, A[keyof A]>][] = Object.entries(
    items,
  );
  return (a): a is { [K in keyof A]?: A[K] } =>
    isRecord(a) &&
    entries.every(([key, refine]) => !(key in a) || refine(a[key]));
}

/**
 * Intersect is an alias of and.
 *
 * @since 2.0.0
 */
export function intersect<B, I extends B>(
  gi: Refinement<B, I>,
): <A extends B>(ga: Refinement<B, A>) => Refinement<B, A & I> {
  return <A extends B>(ga: Refinement<B, A>) => (a): a is A & I =>
    ga(a) && gi(a);
}

/**
 * Union is an alias of or.
 *
 * @since 2.0.0
 */
export function union<B, I extends B>(
  gi: Refinement<B, I>,
): <A extends B>(ga: Refinement<B, A>) => Refinement<B, A | I> {
  return <A extends B>(ga: Refinement<B, A>) => (a): a is A | I =>
    ga(a) || gi(a);
}

/**
 * Lazy is used to handle the case where a refinement is recursive.
 *
 * @example
 * ```ts
 * import type { Refinement } from "./refinement.ts";
 * import * as R from "./refinement.ts";
 *
 * type Person = { name: string; age: number; children: ReadonlyArray<Person> };
 *
 * const person: Refinement<unknown, Person> = R.lazy("Person", () =>
 *   R.struct({
 *     name: R.string,
 *     age: R.number,
 *     children: R.array(person),
 *   }));
 *
 * const rufus = { name: "Rufus", age: 1, children: [] };
 * const brandon = { name: "Brandon", age: 37, children: [rufus] };
 *
 * const result1 = person(null); // false
 * const result2 = person(rufus); // true, rufus: Person
 * const result3 = person(brandon); // true, brandon: Person
 * ```
 *
 * @since 2.0.0
 */
export function lazy<A, B extends A>(
  _: string,
  refinement: () => Refinement<A, B>,
): Refinement<A, B> {
  const get = memoize<void, Refinement<A, B>>(refinement);
  return (u: A): u is B => get()(u);
}

/**
 * The canonical implementation of Schemable for UnknownRefinement. It contains
 * the methods unknown, string, number, boolean, literal, nullable, undefinable,
 * record, array, tuple, struct, partial, intersect, union, and lazy.
 *
 * @since 2.0.0
 */
export const SchemableRefinement: Schemable<KindUnknownRefinement> = {
  unknown: () => unknown,
  string: () => string,
  number: () => number,
  boolean: () => boolean,
  literal,
  nullable,
  undefinable,
  record,
  array,
  tuple: tuple as Schemable<KindUnknownRefinement>["tuple"],
  struct,
  partial,
  intersect: intersect as Schemable<KindUnknownRefinement>["intersect"],
  union,
  lazy,
};
