/**
 * The number module contains combinators for working with numbers.
 *
 * @module number
 *
 * @since 2.0.0
 */

import type { Monoid } from "./monoid.ts";
import type { Ord, Ordering } from "./ord.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Eq } from "./eq.ts";
import type { Show } from "./show.ts";

import * as O from "./ord.ts";
import { map, pipe } from "./fn.ts";

/**
 * Compare two numbers and return true if they are equal.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(1, N.equals(2)); // false
 * const result2 = pipe(1, N.equals(1)); // true
 * ```
 *
 * @since 2.0.0
 */
export function equals(second: number): (first: number) => boolean {
  return (first) => first === second;
}

/**
 * Compare two numbers and return true if first is less than or equal to second.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(1, N.lte(2)); // true
 * const result2 = pipe(1, N.lte(1)); // true
 * const result3 = pipe(2, N.lte(1)); // false
 * ```
 *
 * @since 2.0.0
 */
export function lte(second: number): (first: number) => boolean {
  return (first) => first <= second;
}

/**
 * Multiply two numbers.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(2, N.multiply(2)); // 4
 * ```
 *
 * @since 2.0.0
 */
export function multiply(second: number): (first: number) => number {
  return (first) => first * second;
}

/**
 * Add two numbers.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(2, N.add(2)); // 4
 * ```
 *
 * @since 2.0.0
 */
export function add(second: number): (first: number) => number {
  return (first) => first + second;
}

/**
 * Return the positive modulus of two numbers.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(11, N.mod(2)); // 1
 * ```
 *
 * @since 2.0.0
 */
export function mod(second: number): (first: number) => number {
  return (first) => ((first % second) + second) % second;
}

/**
 * Return true if first evenly divides second.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(2, N.divides(3)); // false
 * const result2 = pipe(2, N.divides(4)); // true
 * ```
 *
 * @since 2.0.0
 */
export function divides(second: number): (first: number) => boolean {
  return (first) => first <= second && pipe(second, mod(first)) === 0;
}

/**
 * Compare two numbers and return their Ordering. 0 denotes equality, -1 denotes
 * that first is less than second, and 1 denotes that first is greater than
 * second.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = N.compare(1, 1); // 0
 * const result2 = N.compare(2, 1); // 1
 * const result3 = N.compare(1, 2); // -1
 * ```
 *
 * @since 2.0.0
 */
export function compare(first: number, second: number): Ordering {
  return O.sign(first - second);
}

/**
 * A constant function that always returns 0. This is the additive identity and
 * is used as the empty value for MonoidNumberSum.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 *
 * const result = N.emptyZero(); // 0
 * ```
 *
 * @since 2.0.0
 */
export function emptyZero(): number {
  return 0;
}

/**
 * A constant function that always returns 1. This is the multiplicative identity and
 * is used as the empty value for MonoidNumberProduct.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 *
 * const result = N.emptyOne(); // 1
 * ```
 *
 * @since 2.0.0
 */
export function emptyOne(): number {
  return 1;
}

/**
 * A constant function that always returns Number.POSITIVE_INFINITY.
 * This is the minimum identity and is used as the empty value for
 * MonoidNumberMinimum.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 *
 * const result = N.emptyPosInf(); // Number.POSITIVE_INFINITY
 * ```
 *
 * @since 2.0.0
 */
export function emptyPosInf(): number {
  return Number.POSITIVE_INFINITY;
}

/**
 * A constant function that always returns Number.NEGATIVE_INFINITY.
 * This is the maximum identity and is used as the empty value for
 * MonoidNumberMiximum.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 *
 * const result = N.emptyNegInf(); // Number.NEGATIVE_INFINITY
 * ```
 *
 * @since 2.0.0
 */
export function emptyNegInf(): number {
  return Number.NEGATIVE_INFINITY;
}

/**
 * The canonical implementation of Eq for number. It contains
 * the method equal.
 *
 * @since 2.0.0
 */
export const EqNumber: Eq<number> = { equals };

/**
 * The canonical implementation of Ord for number. It contains
 * the method compare.
 *
 * @since 2.0.0
 */
export const OrdNumber: Ord<number> = O.fromCompare(compare);

/**
 * A Semigroup instance for number that uses multiplication for concatenation.
 * It contains the method concat.
 *
 * @since 2.0.0
 */
export const SemigroupNumberProduct: Semigroup<number> = {
  concat: multiply,
};

/**
 * A Semigroup instance for number that uses addition for concatenation.
 * It contains the method concat.
 *
 * @since 2.0.0
 */
export const SemigroupNumberSum: Semigroup<number> = {
  concat: add,
};

/**
 * A Semigroup instance for number that uses Math.max for concatenation.
 * It contains the method concat.
 *
 * @since 2.0.0
 */
export const SemigroupNumberMax: Semigroup<number> = {
  concat: O.max(OrdNumber),
};

/**
 * A Semigroup instance for number that uses Math.min for concatenation.
 * It contains the method concat.
 *
 * @since 2.0.0
 */
export const SemigroupNumberMin: Semigroup<number> = {
  concat: O.min(OrdNumber),
};

/**
 * A Monoid instance for number that uses multiplication for concatenation.
 * It contains the method concat.
 *
 * @since 2.0.0
 */
export const MonoidNumberProduct: Monoid<number> = {
  concat: multiply,
  empty: emptyOne,
};

/**
 * A Monoid instance for number that uses addition for concatenation.
 * It contains the method concat.
 *
 * @since 2.0.0
 */
export const MonoidNumberSum: Monoid<number> = {
  concat: add,
  empty: emptyZero,
};

/**
 * A Monoid instance for number that uses Math.max for concatenation.
 * It contains the method concat.
 *
 * @since 2.0.0
 */
export const MonoidNumberMax: Monoid<number> = {
  concat: SemigroupNumberMax.concat,
  empty: emptyNegInf,
};

/**
 * A Monoid instance for number that uses Math.min for concatenation.
 * It contains the method concat.
 *
 * @since 2.0.0
 */
export const MonoidNumberMin: Monoid<number> = {
  concat: SemigroupNumberMax.concat,
  empty: emptyPosInf,
};

/**
 * The canonical instance of Show for number. It contains the method show.
 *
 * @since 2.0.0
 */
export const ShowNumber: Show<number> = {
  show: String,
};
