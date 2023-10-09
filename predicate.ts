/**
 * The Predicate type represents unary functions that return boolean values.
 * Typically, these functions indicate the existence of some quality for the
 * values passed as inputs. Some simple examples of Predicates are postive for
 * numbers, non-null values, etc.
 *
 * @module Predicate
 * @since 2.0.0
 */

import type { In, Kind } from "./kind.ts";
import type { Combinable } from "./combinable.ts";
import type { Initializable } from "./initializable.ts";

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
export interface KindPredicate extends Kind {
  readonly kind: Predicate<In<this, 0>>;
}

/**
 * Create a Predicate<L> using a Predicate<D> and a function that takes
 * a type L and returns a type D. This maps over the input value of
 * the predicate.
 *
 * @example
 * ```ts
 * import { premap } from "./predicate.ts";
 * import { pipe } from "./fn.ts";
 *
 * const isGreaterThan3 = (n: number) => n > 3;
 * const isLongerThan3 = pipe(
 *   isGreaterThan3,
 *   premap((s: string) => s.length),
 * );
 *
 * const result1 = isLongerThan3("Hello"); // true
 * const result2 = isLongerThan3("Hi"); // false
 * ```
 *
 * @since 2.0.0
 */
export function premap<I, A>(
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
 * @since 2.0.0
 */
export function getCombinableAny<A = never>(): Combinable<Predicate<A>> {
  return { combine: or };
}

/**
 * @since 2.0.0
 */
export function getCombinableAll<A = never>(): Combinable<Predicate<A>> {
  return { combine: and };
}

/**
 * Get a Initializable<Predicate<A>> for any type A that combines using the
 * Predicate or function.
 *
 * @example
 * ```ts
 * import { getInitializableAny } from "./predicate.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { combine } = getInitializableAny<number>();
 *
 * const lessThanZero = (n: number) => n < 0;
 * const greaterThanFifty = (n: number) => n > 50;
 *
 * const notBetweenZeroAndFifty = pipe(
 *   lessThanZero,
 *   combine(greaterThanFifty),
 * );
 *
 * const result1 = notBetweenZeroAndFifty(10); // false
 * const result2 = notBetweenZeroAndFifty(-10); // true
 * const result3 = notBetweenZeroAndFifty(100); // true
 * ```
 *
 * @since 2.0.0
 */
export function getInitializableAny<A = never>(): Initializable<Predicate<A>> {
  return {
    combine: or,
    init: () => () => false,
  };
}

/**
 * Get a Initializable<Predicate<A>> for any type A that combines using the
 * Predicate and function.
 *
 * @example
 * ```ts
 * import { getInitializableAll } from "./predicate.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { combine } = getInitializableAll<number>();
 *
 * const greaterThanZero = (n: number) => n > 0;
 * const lessThanFifty = (n: number) => n < 50;
 *
 * const betweenZeroAndFifty = pipe(
 *   greaterThanZero,
 *   combine(lessThanFifty)
 * );
 *
 * const result1 = betweenZeroAndFifty(10); // true
 * const result2 = betweenZeroAndFifty(-10); // false
 * const result3 = betweenZeroAndFifty(100); // false
 * ```
 *
 * @since 2.0.0
 */
export function getInitializableAll<A = never>(): Initializable<Predicate<A>> {
  return {
    combine: and,
    init: () => () => true,
  };
}
