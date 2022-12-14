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

import type { Monoid } from "./monoid.ts";
import type { Ord } from "./ord.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Eq } from "./eq.ts";
import type { Predicate } from "./predicate.ts";
import type { Iso, Prism } from "./optics.ts";
import type { Option } from "./option.ts";

import { fromPredicate } from "./option.ts";
import { iso as _iso, prism as _prism } from "./optics.ts";
import { identity, unsafeCoerce } from "./fn.ts";

/**
 * These are phantom types used by Newtype to both identify and distinquish
 * between a Newtype and its representation value.
 */
declare const Brand: unique symbol;
declare const Value: unique symbol;

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
export type Newtype<B, A> = { readonly [Brand]: B; readonly [Value]: A };

/**
 * Extracts the inner type value from a Newtype.
 *
 * @example
 * ```ts
 * import type { Newtype, ToValue } from "./newtype.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 *
 * type InnerInteger = ToValue<Integer>; // number
 * ```
 *
 * @since 2.0.0
 */
export type ToValue<T extends Newtype<unknown, unknown>> = T[typeof Value];

/**
 * A type alias for Newtype<any, any> that is useful when constructing
 * Newtype related runtime instances.
 *
 * @since 2.0.0
 */
export type AnyNewtype = Newtype<unknown, unknown>;

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
  eq: Eq<ToValue<T>>,
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
export function getOrd<T extends AnyNewtype>(ord: Ord<ToValue<T>>): Ord<T> {
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
  semigroup: Semigroup<ToValue<T>>,
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
  monoid: Monoid<ToValue<T>>,
): Monoid<T> {
  return monoid as unknown as Monoid<T>;
}

// deno-lint-ignore no-explicit-any
const _anyIso: Iso<any, any> = _iso(unsafeCoerce, unsafeCoerce);

/**
 * If the Newtype and its underlying value are referentially transparent
 * (meaning they can always be swapped) then you can create an instance of Iso
 * for the Newtype for mapping back and forth.
 *
 * @example
 * ```ts
 * import * as N from "./newtype.ts";
 *
 * type Real = N.Newtype<"Real", number>;
 *
 * const isoReal = N.iso<Real>();
 *
 * const result1: Real = isoReal.view(1); // Turn number into Real
 * const result2: number = isoReal.review(result1); // Turn Real into number
 * ```
 *
 * @since 2.0.0
 */
export function iso<T extends AnyNewtype>(): Iso<ToValue<T>, T> {
  return _anyIso;
}

/**
 * If the Newtype and its underlying value are not referentially transparent
 * (meaning they can always be swapped) then you can create an instance of Prism
 * for the Newtype in order to optionally map into the Newtype given some
 * Predicate.
 *
 * @example
 * ```ts
 * import type { Option } from "./option.ts";
 *
 * import * as N from "./newtype.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Integer = N.Newtype<"Integer", number>;
 *
 * const prismInteger = N.prism<Integer>(Number.isInteger);
 *
 * // Turn number into an Option<Integer>
 * const result1: Option<Integer> = prismInteger.view(1);
 *
 * // Turn an Option<Integer> into a number or fall back to 0 if Option is None
 * const result2: number = pipe(
 *   result1,
 *   O.map(prismInteger.review),
 *   O.getOrElse(() => 0)
 * );
 * ```
 *
 * @since 2.0.0
 */
export function prism<T extends AnyNewtype>(
  predicate: Predicate<ToValue<T>>,
): Prism<ToValue<T>, T> {
  return _prism<ToValue<T>, T>(
    fromPredicate(predicate) as (s: ToValue<T>) => Option<T>,
    identity,
  );
}
