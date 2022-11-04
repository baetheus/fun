/**
 * Newtype presents a type level "rebranding" of an existing type.
 *
 * It's basic purpose is to create a branded type from an existing
 * type. This is much like using TypeScript type aliases, ie.
 * `type MyNumber = number`. However, Newtype will prevent the
 * existing type from being used where the Branded type is
 * specified.
 *
 * @module Newtype
 */

import type { Hold } from "./kind.ts";
import type { Monoid } from "./monoid.ts";
import type { Ord } from "./ord.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Eq } from "./eq.ts";

// ---
// Types
// ---

/**
 * Create a branded type from an existing type. The branded
 * type can be used anywhere the existing type can, but the
 * existing type cannot be used where the branded one can.
 *
 * It is important to note that while a Newtype looks like
 * a struct, its actual representation is that of the
 * inner type.
 *
 * @example
 * ```ts
 * import type { Newtype } from "./newtype.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 *
 * const int = 1 as unknown as Integer;
 * const num = 1;
 *
 * declare function addOne(n: Integer): number;
 *
 * addOne(int); // This is ok!
 * // addOne(num); // This is not
 * ```
 *
 * @since 2.0.0
 */
export type Newtype<Brand, Representation> = Hold<Brand> & Representation;

/**
 * Extracts the inner type value from a Newtype.
 *
 * @example
 * ```ts
 * import type { Newtype, From } from "./newtype.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 *
 * type InnerInteger = From<Integer>; // number
 * ```
 *
 * @since 2.0.0
 */
export type From<T> = T extends Newtype<infer _, infer A> ? A : never;

/**
 * A type alias for Newtype<any, any> that is useful when constructing
 * Newtype related runtime instances.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyNewtype = Newtype<any, any>;

/**
 * Retype an existing Eq from an inner type to a Newtype.
 *
 * @example
 * ```ts
 * import { Newtype, getEq } from "./newtype.ts";
 * import * as N from "./number.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 *
 * const eqInteger = getEq<Integer>(N.EqNumber);
 * ```
 *
 * @since 2.0.0
 */
export function getEq<T extends AnyNewtype>(
  eq: Eq<From<T>>,
): Eq<T> {
  return eq as Eq<T>;
}

/**
 * Retype an existing Ord from an inner type to a Newtype.
 *
 * @example
 * ```ts
 * import { Newtype, getOrd } from "./newtype.ts";
 * import * as N from "./number.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 *
 * const ordInteger = getOrd<Integer>(N.OrdNumber);
 * ```
 *
 * @since 2.0.0
 */
export function getOrd<T extends AnyNewtype>(ord: Ord<From<T>>): Ord<T> {
  return ord as Ord<T>;
}

/**
 * Retype an existing Semigroup from an inner type to a Newtype.
 *
 * @example
 * ```ts
 * import { Newtype, getSemigroup } from "./newtype.ts";
 * import * as N from "./number.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 *
 * const semigroupInteger = getSemigroup<Integer>(N.SemigroupNumberSum);
 * ```
 *
 * @since 2.0.0
 */
export function getSemigroup<T extends AnyNewtype>(
  semigroup: Semigroup<From<T>>,
): Semigroup<T> {
  return semigroup as unknown as Semigroup<T>;
}

/**
 * Retype an existing Monoid from an inner type to a Newtype.
 *
 * @example
 * ```ts
 * import { Newtype, getMonoid } from "./newtype.ts";
 * import * as N from "./number.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 *
 * const monoidInteger = getMonoid<Integer>(N.MonoidNumberSum);
 * ```
 *
 * @since 2.0.0
 */
export function getMonoid<T extends AnyNewtype>(
  monoid: Monoid<From<T>>,
): Monoid<T> {
  return monoid as unknown as Monoid<T>;
}
