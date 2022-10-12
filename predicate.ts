import type { In, Kind } from "./kind.ts";
import type { Contravariant } from "./contravariant.ts";
import type { Monoid } from "./monoid.ts";
import type { Semigroup } from "./semigroup.ts";

import { flow } from "./fn.ts";

/**
 * The Predicate<A> type is a function that takes some
 * value of type A and returns boolean, indicating
 * that a property is true or false for the value A.
 *
 * @example
 * ```ts
 * import type { Predicate } from "./predicate.ts";
 * import * as O from "./option.ts";
 *
 * function fromPredicate<A>(predicate: Predicate<A>) {
 *   return (a: A): O.Option<A> => predicate(a)
 *     ? O.some(a) : O.none;
 * }
 *
 * function isPositive(n: number): boolean {
 *   return n > 0;
 * }
 *
 * const isPos = fromPredicate(isPositive);
 *
 * const resultSome = isPos(1); // Some(1)
 * const resultNone = isPos(-1); // None
 * ```
 *
 * @since 2.0.0
 */
export type Predicate<A> = (a: A) => boolean;

/**
 * Specifies Predicate as a Higher Kinded Type, with
 * contravariant parameter A corresponding to the 0th
 * index of any Substitutions.
 *
 * @since 2.0.0
 */
export interface URI extends Kind {
  readonly kind: Predicate<In<this, 0>>;
}

/**
 * Create a Predicate<L> using a Predicate<D> and a function that takes
 * a type L and returns a type D. This maps over the input value of
 * the predicate.
 *
 * @example
 * ```ts
 * import { contramap } from "./predicate.ts";
 * import { pipe } from "./fn.ts";
 *
 * const isGreaterThan3 = (n: number) => n > 3;
 * const isLongerThan3 = pipe(
 *   isGreaterThan3,
 *   contramap((s: string) => s.length),
 * );
 *
 * const result1 = isLongerThan3("Hello"); // true
 * const result2 = isLongerThan3("Hi"); // false
 * ```
 *
 * @since 2.0.0
 */
export function contramap<I, A>(
  fia: (i: I) => A,
): (ua: Predicate<A>) => Predicate<I> {
  return (ua) => flow(fia, ua);
}

/**
 * Negates the result of an existing Predicate.
 *
 * @example
 * ```ts
 * import { not } from "./predicate.ts";
 *
 * const isPositive = (n: number) => n > 0;
 * const isZeroOrNegative = not(isPositive);
 *
 * const result1 = isZeroOrNegative(1); // false
 * const result2 = isZeroOrNegative(0); // true
 * const result3 = isZeroOrNegative(-1); // true
 * ```
 *
 * @since 2.0.0
 */
export function not<A>(predicate: Predicate<A>): Predicate<A> {
  return (a) => !predicate(a);
}

/**
 * Creates the union of two predicates, returning true if either
 * predicate returns true.
 *
 * @example
 * ```ts
 * import { or } from "./predicate.ts";
 * import { string, number } from "./refinement.ts";
 * import { pipe } from "./fn.ts";
 *
 * // A Refinement is also a Predicate
 * const stringOrNumber = pipe(
 *   string,
 *   or(number),
 * );
 *
 * const result1 = stringOrNumber("Hello"); // true
 * const result2 = stringOrNumber(1); // true
 * const result3 = stringOrNumber({}); // false
 * ```
 *
 * @since 2.0.0
 */
export function or<A>(second: Predicate<A>) {
  return (first: Predicate<A>): Predicate<A> => (a) => first(a) || second(a);
}

/**
 * Creates the intersection of two predicates, returning true if both
 * predicates return true.
 *
 * @example
 * ```ts
 * import { and } from "./predicate.ts";
 * import { pipe } from "./fn.ts";
 *
 * const isPositive = (n: number) => n > 0;
 * const isInteger = (n: number) => Number.isInteger(n);
 *
 * const isPositiveInteger = pipe(
 *   isPositive,
 *   and(isInteger),
 * );
 *
 * const result1 = isPositiveInteger(1); // true
 * const result2 = isPositiveInteger(100); // true
 * const result3 = isPositiveInteger(-1); // false
 * ```
 *
 * @since 2.0.0
 */
export function and<A>(second: Predicate<A>) {
  return (first: Predicate<A>): Predicate<A> => (a) => first(a) && second(a);
}

/**
 * The canonical implementation of Contravariant for Predicate. It contains
 * the method contramap.
 *
 * @since 2.0.0
 */
export const ContravariantPredicate: Contravariant<URI> = { contramap };

/**
 * Get a Semigroup<Predicate<A>> for any type A that concats using the
 * Predicate or function.
 *
 * @example
 * ```ts
 * import { getSemigroupAny } from "./predicate.ts";
 * import { pipe } from "./fn.ts";
 *
 * const SemigroupAny = getSemigroupAny<number>();
 *
 * const lessThanZero = (n: number) => n < 0;
 * const greaterThanFifty = (n: number) => n > 50;
 *
 * const notBetweenZeroAndFifty = pipe(
 *   lessThanZero,
 *   SemigroupAny.concat(greaterThanFifty),
 * );
 *
 * const result1 = notBetweenZeroAndFifty(10); // false
 * const result2 = notBetweenZeroAndFifty(-10); // true
 * const result3 = notBetweenZeroAndFifty(100); // true
 * ```
 *
 * @since 2.0.0
 */
export function getSemigroupAny<A = never>(): Semigroup<Predicate<A>> {
  return { concat: or };
}

/**
 * Get a Semigroup<Predicate<A>> for any type A that concats using the
 * Predicate and function.
 *
 * @example
 * ```ts
 * import { getSemigroupAll } from "./predicate.ts";
 * import { pipe } from "./fn.ts";
 *
 * const SemigroupAll = getSemigroupAll<number>();
 *
 * const greaterThanZero = (n: number) => n > 0;
 * const lessThanFifty = (n: number) => n < 50;
 *
 * const betweenZeroAndFifty = pipe(
 *   greaterThanZero,
 *   SemigroupAny.concat(lessThanFifty),
 * );
 *
 * const result1 = betweenZeroAndFifty(10); // true
 * const result2 = betweenZeroAndFifty(-10); // false
 * const result3 = betweenZeroAndFifty(100); // false
 * ```
 *
 * @since 2.0.0
 */
export function getSemigroupAll<A = never>(): Semigroup<Predicate<A>> {
  return { concat: and };
}

/**
 * Get a Monoid<Predicate<A>> for any type A that concats using the
 * Predicate or function and defaults to false.
 *
 * @example
 * ```ts
 * import { getSemigroupAny } from "./predicate.ts";
 * import { equals } from "./number.ts";
 * import { pipe } from "./fn.ts";
 * import * as T from "./traversal.ts";
 * import * as A from "./array.ts";
 *
 * const MonoidAnyNumber = getMonoidAny<number>();
 *
 * const equalsAny = pipe(
 *   // Start with number[]
 *   T.id<number[]>(),
 *   // Focus on each number
 *   T.traverse(A.TraversableArray),
 *   // Turn each number into an equals predicate
 *   T.foldMap(MonoidAnyNumber)(equals),
 * );
 *
 * // Matches 1, 2, 3, 4, or 5
 * const pred1 = equalsAny([1, 2, 3, 4, 5]);
 * // Matches 2, 4, 5, 7, or 11
 * const pred2 = equalsAny([2, 3, 5, 7, 11]);
 *
 * const result1 = pred1(1); // true
 * const result2 = pred1(0); // false
 * const result3 = pred2(5); // true
 * const result4 = pred2(10); // false
 * ```
 *
 * @since 2.0.0
 */
export function getMonoidAny<A = never>(): Monoid<Predicate<A>> {
  return { concat: or, empty: () => () => false };
}

/**
 * Get a Monoid<Predicate<A>> for any type A that concats using the
 * Predicate and function and defaults to true.
 *
 * @example
 * ```ts
 * import { getSemigroupAll } from "./predicate.ts";
 * import { divides } from "./number.ts";
 * import { pipe } from "./fn.ts";
 * import * as T from "./traversal.ts";
 * import * as A from "./array.ts";
 *
 * const MonoidAllNumber = getMonoidAll<number>();
 *
 * const dividesBy = pipe(
 *   // Start with number[]
 *   T.id<number[]>(),
 *   // Focus on each number
 *   T.traverse(A.TraversableArray),
 *   // Turn each number into an divides predicate
 *   T.foldMap(MonoidAllNumber)(divides),
 * );
 *
 * const pred = dividesBy([2, 3]);
 *
 * const result1 = pred(0); // true
 * const result2 = pred(1); // false
 * const result3 = pred(2); // false
 * const result4 = pred(3); // false
 * const result5 = pred(6); // true
 * ```
 *
 * @since 2.0.0
 */
export function getMonoidAll<A = never>(): Monoid<Predicate<A>> {
  return { concat: and, empty: () => () => true };
}
