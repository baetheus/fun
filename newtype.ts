/**
 * Newtype presents a type level "rebranding" of an existing type.
 *
 * It's basic purpose is to create a branded type from an existing
 * type. This is much like using TypeScript type aliases, ie.
 * `type MyNumber = number`. However, Newtype will prevent the
 * existing type from being used where the Branded type is
 * specified.
 */

import type { Hold } from "./kind.ts";
import type { Iso } from "./iso.ts";
import type { Monoid } from "./monoid.ts";
import type { Ord } from "./ord.ts";
import type { Predicate } from "./predicate.ts";
import type { Prism } from "./prism.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Setoid } from "./setoid.ts";

import * as I from "./iso.ts";
import * as P from "./prism.ts";
import { unsafeCoerce } from "./fns.ts";

// ---
// Locals
// ---

/**
 * We use a single Iso<any, any> when constructing an iso for
 * Newtype. This is only for optimization.
 */
// deno-lint-ignore no-explicit-any
const anyIso = I.iso<any, any>(unsafeCoerce, unsafeCoerce);

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

// ---
// Combinators
// ---

/**
 * Construct an Iso instance for a Newtype. This is useful to
 * keep from using manual hacks to retype a Newtype. This
 * should only be used if the representation can always
 * be used in place of the Newtype.
 *
 * @example
 * ```ts
 * import { Newtype, iso } from "./newtype.ts";
 *
 * type Real = Newtype<'Real', number>;
 * const isoReal = iso<Real>();
 *
 * const real: Real = isoReal.get(1);
 * const num: number = isoReal.reverseGet(real);
 * ```
 */
export function iso<T extends AnyNewtype>(): Iso<From<T>, T> {
  return anyIso;
}

/**
 * Construct a Prism instance for a Newtype from a predicate.
 * Use this when the Newtype is a strict subset of the
 * representation.
 *
 * @example
 * ```ts
 * import { Newtype, prism } from "./newtype.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fns.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 * const prismInteger = prism<Integer>(Number.isInteger);
 *
 * const int = prismInteger.getOption(1); // Option<Integer>
 * const num = pipe(int, O.map(prismInteger.reverseGet)); // Option<number>
 * ```
 */
export function prism<T extends AnyNewtype>(
  predicate: Predicate<From<T>>,
): Prism<From<T>, T> {
  return P.fromPredicate(predicate) as unknown as Prism<From<T>, T>;
}
// ---
// Instance Getters
// ---

/**
 * Retype an existing Setoid from an inner type to a Newtype.
 *
 * @example
 * ```ts
 * import { Newtype, getSetoid } from "./newtype.ts";
 * import * as N from "./number.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 *
 * const setoidInteger = getSetoid<Integer>(N.SetoidNumber);
 * ```
 *
 * @since 2.0.0
 */
export function getSetoid<T extends AnyNewtype>(
  setoid: Setoid<From<T>>,
): Setoid<T> {
  return setoid as Setoid<T>;
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
