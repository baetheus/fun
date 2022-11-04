import type { Monoid } from "./monoid.ts";
import type { Ord, Ordering } from "./ord.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Eq } from "./eq.ts";
import type { Show } from "./show.ts";

import { fromCompare } from "./ord.ts";

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
 * import { equals } from "./boolean.ts";
 *
 * const result1 = equals(true)(false); // false
 * const result2 = equals(true)(true); // true
 * ```
 *
 * @since 2.0.0
 */
export function equals(second: boolean): (first: boolean) => boolean {
  return (first) => first === second;
}

/**
 * Compares two booleans, returning an Ordering. True is greater than
 * False in this ordering, generally, but the specifics are always
 * decided by the runtime.
 *
 * @example
 * ```ts
 * import { compare } from "./boolean.ts";
 *
 * const result1 = compare(true, true); // 0
 * const result2 = compare(true, false); // 1
 * const result3 = compare(false, true); // -1
 * ```
 *
 * @since 2.0.0
 */
export function compare(first: boolean, second: boolean): Ordering {
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
 * The canonical implementation of Ord for boolean. It contains
 * the method lt, lte, equals, gte, gt, min, max, clamp, between,
 * and compare.
 *
 * @since 2.0.0
 */
export const OrdBoolean: Ord<boolean> = fromCompare(compare);

/**
 * The canonical implementation of Eq for boolean. It contains
 * the method equals.
 *
 * @since 2.0.0
 */
export const EqBoolean: Eq<boolean> = { equals };

/**
 * The canonical implementation of Semigroup for boolean that
 * combines using the logical and operator. It contains the
 * method concat.
 *
 * @since 2.0.0
 */
export const SemigroupBooleanAll: Semigroup<boolean> = {
  concat: and,
};

/**
 * The canonical implementation of Semigroup for boolean that
 * combines using the logical or operator. It contains the
 * method concat.
 *
 * @since 2.0.0
 */
export const SemigroupBooleanAny: Semigroup<boolean> = {
  concat: or,
};

/**
 * The canonical implementation of Monoid for boolean that
 * combines using the logical and operator. It contains the
 * methods concat and empty(constTrue).
 *
 * @since 2.0.0
 */
export const MonoidBooleanAll: Monoid<boolean> = {
  concat: and,
  empty: constTrue,
};

/**
 * The canonical implementation of Monoid for boolean that
 * combines using the logical or operator. It contains the
 * methods concat and equal(constFalse).
 *
 * @since 2.0.0
 */
export const MonoidBooleanAny: Monoid<boolean> = {
  concat: or,
  empty: constFalse,
};

/**
 * The canoncial implementation of Show for boolean. It
 * uses JSON.stringify to turn a boolean into a string.
 * It contains the method show.
 */
export const ShowBoolean: Show<boolean> = {
  show: JSON.stringify,
};
