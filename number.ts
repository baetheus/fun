/**
 * The number module contains combinators for working with numbers.
 *
 * @module number
 * @since 2.0.0
 */

import type { Ordering, Sortable } from "./sortable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Initializable } from "./initializable.ts";
import type { Showable } from "./showable.ts";

import * as O from "./sortable.ts";

/**
 * Compare two numbers and return true if they are equal.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 *
 * const result1 = N.compare(1)(2); // false
 * const result2 = N.compare(1)(1); // true
 * ```
 *
 * @since 2.0.0
 */
export function compare(second: number): (first: number) => boolean {
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
  return (first) => first <= second && mod(first)(second) === 0;
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
 * const result1 = N.compare(1)(1); // 0
 * const result2 = N.compare(2)(1); // 1
 * const result3 = N.compare(1)(2); // -1
 * ```
 *
 * @since 2.0.0
 */
export function sort(first: number, second: number): Ordering {
  return O.sign(first - second);
}

/**
 * A constant function that always returns 0. This is the additive identity and
 * is used as the init value for InitializableNumberSum.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 *
 * const result = N.initZero(); // 0
 * ```
 *
 * @since 2.0.0
 */
export function initZero(): number {
  return 0;
}

/**
 * A constant function that always returns 1. This is the multiplicative identity and
 * is used as the init value for InitializableNumberProduct.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 *
 * const result = N.initOne(); // 1
 * ```
 *
 * @since 2.0.0
 */
export function initOne(): number {
  return 1;
}

/**
 * A constant function that always returns Number.POSITIVE_INFINITY.
 * This is the minimum identity and is used as the init value for
 * InitializableNumberMinimum.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 *
 * const result = N.initPosInf(); // Number.POSITIVE_INFINITY
 * ```
 *
 * @since 2.0.0
 */
export function initPosInf(): number {
  return Number.POSITIVE_INFINITY;
}

/**
 * A constant function that always returns Number.NEGATIVE_INFINITY.
 * This is the maximum identity and is used as the init value for
 * InitializableNumberMiximum.
 *
 * @example
 * ```ts
 * import * as N from "./number.ts";
 *
 * const result = N.initNegInf(); // Number.NEGATIVE_INFINITY
 * ```
 *
 * @since 2.0.0
 */
export function initNegInf(): number {
  return Number.NEGATIVE_INFINITY;
}

/**
 * The canonical implementation of Comparable for number. It contains
 * the method equal.
 *
 * @since 2.0.0
 */
export const ComparableNumber: Comparable<number> = { compare };

/**
 * The canonical implementation of Sortable for number. It contains
 * the method compare.
 *
 * @since 2.0.0
 */
export const SortableNumber: Sortable<number> = O.fromSort(sort);

/**
 * A Combinable instance for number that uses multiplication for combineenation.
 * It contains the method combine.
 *
 * @since 2.0.0
 */
export const CombinableNumberProduct: Combinable<number> = {
  combine: multiply,
};

/**
 * A Combinable instance for number that uses addition for combineenation.
 * It contains the method combine.
 *
 * @since 2.0.0
 */
export const CombinableNumberSum: Combinable<number> = {
  combine: add,
};

/**
 * A Combinable instance for number that uses Math.max for combineenation.
 * It contains the method combine.
 *
 * @since 2.0.0
 */
export const CombinableNumberMax: Combinable<number> = {
  combine: O.max(SortableNumber),
};

/**
 * A Combinable instance for number that uses Math.min for combineenation.
 * It contains the method combine.
 *
 * @since 2.0.0
 */
export const CombinableNumberMin: Combinable<number> = {
  combine: O.min(SortableNumber),
};
/**
 * A Initializable instance for number that uses multiplication for combineenation.
 * It contains the method combine.
 *
 * @since 2.0.0
 */
export const InitializableNumberProduct: Initializable<number> = {
  combine: multiply,
  init: initOne,
};

/**
 * A Initializable instance for number that uses addition for combineenation.
 * It contains the method combine.
 *
 * @since 2.0.0
 */
export const InitializableNumberSum: Initializable<number> = {
  combine: add,
  init: initZero,
};

/**
 * A Initializable instance for number that uses Math.max for combineenation.
 * It contains the method combine.
 *
 * @since 2.0.0
 */
export const InitializableNumberMax: Initializable<number> = {
  combine: O.max(SortableNumber),
  init: initNegInf,
};

/**
 * A Initializable instance for number that uses Math.min for combineenation.
 * It contains the method combine.
 *
 * @since 2.0.0
 */
export const InitializableNumberMin: Initializable<number> = {
  combine: O.min(SortableNumber),
  init: initPosInf,
};

/**
 * The canonical instance of Showable for number. It contains the method show.
 *
 * @since 2.0.0
 */
export const ShowableNumber: Showable<number> = {
  show: String,
};
