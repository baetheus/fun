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
 * @since 2.0.0
 */

import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Initializable } from "./initializable.ts";
import type { Iso, Prism } from "./optic.ts";
import type { Option } from "./option.ts";
import type { Predicate } from "./predicate.ts";
import type { Sortable } from "./sortable.ts";

import { fromPredicate } from "./option.ts";
import { iso as _iso, prism as _prism } from "./optic.ts";
import { identity, unsafeCoerce } from "./fn.ts";

const BrandSymbol = Symbol("Brand");
const ValueSymbol = Symbol("Value");

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
 * const int = 1 as Integer;
 * const num = 1 as number;
 *
 * const addOne = (n: Integer): number => (n as unknown as number) + 1;
 *
 * addOne(int); // This is ok!
 * // addOne(num); // This is not
 * ```
 *
 * @since 2.0.0
 */
export type Newtype<B, A> = A & {
  readonly [ValueSymbol]: A;
  readonly [BrandSymbol]: B;
};

/**
 * A type alias for Newtype<any, any> that is useful when constructing
 * Newtype related runtime instances.
 *
 * @since 2.0.0
 */
export type AnyNewtype = Newtype<unknown, unknown>;

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
export type ToValue<T extends AnyNewtype> = T extends Newtype<infer _, infer A>
  ? A
  : never;

/**
 * Retype an existing Comparable from an inner type to a Newtype.
 *
 * @example
 * ```ts
 * import { Newtype, getComparable } from "./newtype.ts";
 * import * as N from "./number.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 *
 * const eqInteger = getComparable<Integer>(N.ComparableNumber);
 * ```
 *
 * @since 2.0.0
 */
export function getComparable<T extends AnyNewtype>(
  eq: Comparable<ToValue<T>>,
): Comparable<T> {
  return eq as unknown as Comparable<T>;
}

/**
 * Retype an existing Sortable from an inner type to a Newtype.
 *
 * @example
 * ```ts
 * import { Newtype, getSortable } from "./newtype.ts";
 * import * as N from "./number.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 *
 * const ordInteger = getSortable<Integer>(N.SortableNumber);
 * ```
 *
 * @since 2.0.0
 */
export function getSortable<T extends AnyNewtype>(
  ord: Sortable<ToValue<T>>,
): Sortable<T> {
  return ord as unknown as Sortable<T>;
}

/**
 * Retype an existing Combinable from an inner type to a Newtype.
 *
 * @example
 * ```ts
 * import { Newtype, getCombinable } from "./newtype.ts";
 * import * as N from "./number.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 *
 * const monoidInteger = getCombinable<Integer>(N.InitializableNumberSum);
 * ```
 *
 * @since 2.0.0
 */
export function getCombinable<T extends AnyNewtype>(
  combinable: Combinable<ToValue<T>>,
): Combinable<T> {
  return combinable as unknown as Combinable<T>;
}

/**
 * Retype an existing Initializable from an inner type to a Newtype.
 *
 * @example
 * ```ts
 * import { Newtype, getInitializable } from "./newtype.ts";
 * import * as N from "./number.ts";
 *
 * type Integer = Newtype<'Integer', number>;
 *
 * const monoidInteger = getInitializable<Integer>(N.InitializableNumberSum);
 * ```
 *
 * @since 2.0.0
 */
export function getInitializable<T extends AnyNewtype>(
  initializable: Initializable<ToValue<T>>,
): Initializable<T> {
  return initializable as unknown as Initializable<T>;
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
    identity as (a: T) => ToValue<T>,
  );
}
