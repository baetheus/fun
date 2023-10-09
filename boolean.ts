/**
 * The boolean module contains combinators for working with boolean.
 *
 * @module number
 * @since 2.0.0
 */

import type { Ordering, Sortable } from "./sortable.ts";
import type { Combinable } from "./combinable.ts";
import type { Initializable } from "./initializable.ts";
import type { Comparable } from "./comparable.ts";
import type { Showable } from "./showable.ts";

import { fromSort } from "./sortable.ts";

/**
 * A function that always returns true.
 *
 * @example
 * ```ts
 * import { constTrue } from "./boolean.ts";
 *
 * const result = constTrue(); // true
 * ```
 *
 * @since 2.0.0
 */
export const constTrue = () => true;

/**
 * A function that always returns false.
 *
 * @example
 * ```ts
 * import { constFalse } from "./boolean.ts";
 *
 * const result = constFalse(); // false
 * ```
 *
 * @since 2.0.0
 */
export const constFalse = () => false;

/**
 * A type guard, indicating that a value is a boolean.
 *
 * @since 2.0.0
 */
export function isBoolean(a: unknown): a is boolean {
  return typeof a === "boolean";
}

/**
 * Create a match function over boolean
 *
 * @example
 * ```ts
 * import { match } from "./boolean.ts";
 * import * as O from "./option.ts";
 *
 * const match1 = match(() => "Tina", () => "Turner");
 * const match2 = match(() => O.some("Hi"), () => O.none);
 *
 * const result1 = match1(true); // "Tina"
 * const result2 = match1(false); // "Turner"
 * const result3 = match2(true); // Some("Hi")
 * const result4 = match2(false); // None
 * ```
 *
 * @since 2.0.0
 */
export function match<A, B>(
  onTrue: () => A,
  onFalse: () => B,
): (a: boolean) => A | B {
  return (a) => a ? onTrue() : onFalse();
}

/**
 * Negate a given boolean.
 *
 * @example
 * ```ts
 * import { not } from "./boolean.ts";
 *
 * const result1 = not(true); // false
 * const result2 = not(false); // true
 * ```
 *
 * @since 2.0.0
 */
export function not(ua: boolean): boolean {
  return !ua;
}

/**
 * Test the equality of two booleans.
 *
 * @example
 * ```ts
 * import { compare } from "./boolean.ts";
 *
 * const result1 = compare(true)(false); // false
 * const result2 = compare(true)(true); // true
 * ```
 *
 * @since 2.0.0
 */
export function compare(second: boolean): (first: boolean) => boolean {
  return (first) => first === second;
}

/**
 * Compares two booleans, returning an Ordering. True is greater than
 * False in this ordering, generally, but the specifics are always
 * decided by the runtime.
 *
 * @example
 * ```ts
 * import { sort } from "./boolean.ts";
 *
 * const result1 = sort(true, true); // 0
 * const result2 = sort(true, false); // 1
 * const result3 = sort(false, true); // -1
 * ```
 *
 * @since 2.0.0
 */
export function sort(first: boolean, second: boolean): Ordering {
  return first < second ? -1 : second < first ? 1 : 0;
}

/**
 * A curried form of logical Or.
 *
 * @example
 * ```ts
 * import { or } from "./boolean.ts";
 *
 * const result1 = or(true)(true); // true
 * const result2 = or(true)(false); // true
 * const result3 = or(false)(false); // false
 * ```
 *
 * @since 2.0.0
 */
export function or(second: boolean): (first: boolean) => boolean {
  return (first) => first || second;
}

/**
 * A curried form of logical And.
 *
 * @example
 * ```ts
 * import { and } from "./boolean.ts";
 *
 * const result1 = and(true)(true); // true
 * const result2 = and(true)(false); // false
 * const result3 = and(false)(false); // false
 * ```
 *
 * @since 2.0.0
 */
export function and(second: boolean): (first: boolean) => boolean {
  return (first) => first && second;
}

/**
 * The canonical implementation of Sortable for boolean. It contains
 * the method lt, lte, equals, gte, gt, min, max, clamp, between,
 * and compare.
 *
 * @since 2.0.0
 */
export const SortableBoolean: Sortable<boolean> = fromSort(sort);

/**
 * The canonical implementation of Comparable for boolean. It contains
 * the method equals.
 *
 * @since 2.0.0
 */
export const ComparableBoolean: Comparable<boolean> = { compare };

/**
 * The canonical implementation of Combinable for boolean that
 * combines using the logical and operator. It contains the
 * method combine.
 *
 * @since 2.0.0
 */
export const CombinableBooleanAll: Combinable<boolean> = {
  combine: and,
};

/**
 * The canonical implementation of Combinable for boolean that
 * combines using the logical or operator. It contains the
 * method combine.
 *
 * @since 2.0.0
 */
export const CombinableBooleanAny: Combinable<boolean> = {
  combine: or,
};

/**
 * The canonical implementation of Initializable for boolean that
 * combines using the logical and operator. It contains the
 * method combine.
 *
 * @since 2.0.0
 */
export const InitializableBooleanAll: Initializable<boolean> = {
  combine: and,
  init: constTrue,
};

/**
 * The canonical implementation of Initializable for boolean that
 * combines using the logical or operator. It contains the
 * method combine.
 *
 * @since 2.0.0
 */
export const InitializableBooleanAny: Initializable<boolean> = {
  combine: or,
  init: constFalse,
};

/**
 * The canoncial implementation of Showable for boolean. It
 * uses JSON.stringify to turn a boolean into a string.
 * It contains the method show.
 */
export const ShowableBoolean: Showable<boolean> = {
  show: JSON.stringify,
};
