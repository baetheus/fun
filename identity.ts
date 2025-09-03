/**
 * This file contains the Identity algebraic data type. Identity is one of the
 * simplest data types in that it represents a type AS IS, allowing one to
 * create algebraic structures for the inner type. This is most useful for
 * constructing arrow optics.
 *
 * @module Identity
 * @since 2.0.0
 */
import type { Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Mappable } from "./mappable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Wrappable } from "./wrappable.ts";

/**
 * Represents the Identity type constructor.
 * @since 2.0.0
 */
export type Identity<A> = A;

/**
 * Specifies Identity as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindIdentity extends Kind {
  readonly kind: Identity<Out<this, 0>>;
}

/**
 * Wraps a value into an Identity type.
 * This function allows any value to be lifted into the context of an Identity,
 * making it possible to interact with other functions that operate on the Identity type.
 *
 * @example
 * ```ts
 * import { wrap } from "./identity.ts";
 *
 * // numberIdentity is Identity<number> with value 5
 * const numberIdentity = wrap(5);
 *
 * // stringIdentity is Identity<string> with value "hello"
 * const stringIdentity = wrap("hello");
 * ```
 *
 * @param a - The value to wrap.
 * @returns The wrapped value as an Identity.
 * @since 2.0.0
 */
export function wrap<A>(a: A): Identity<A> {
  return a;
}

/**
 * Apply a function to the value in an Identity.
 *
 * @example
 * ```ts
 * import { map, wrap } from "./identity.ts";
 * import { pipe } from "./fn.ts";
 *
 * const identity = wrap(5);
 * const doubled = pipe(
 *   identity,
 *   map(n => n * 2)
 * );
 *
 * console.log(doubled); // 10
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ta: Identity<A>) => Identity<I> {
  return fai;
}

/**
 * Apply a function wrapped in an Identity to a value wrapped in an Identity.
 *
 * @example
 * ```ts
 * import { apply, wrap } from "./identity.ts";
 * import { pipe } from "./fn.ts";
 *
 * const identityFn = wrap((n: number) => n * 2);
 * const identityValue = wrap(5);
 * const result = pipe(
 *   identityFn,
 *   apply(identityValue)
 * );
 *
 * console.log(result); // 10
 * ```
 *
 * @since 2.0.0
 */
export function apply<A>(
  ua: Identity<A>,
): <I>(ufai: Identity<(a: A) => I>) => Identity<I> {
  return (ufai) => ufai(ua);
}

/**
 * Chain Identity computations together.
 *
 * @example
 * ```ts
 * import { flatmap, wrap } from "./identity.ts";
 * import { pipe } from "./fn.ts";
 *
 * const identity = wrap(5);
 * const chained = pipe(
 *   identity,
 *   flatmap(n => wrap(n * 2))
 * );
 *
 * console.log(chained); // 10
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Identity<I>,
): (ta: Identity<A>) => Identity<I> {
  return fati;
}

/**
 * The canonical implementation of Applicable for Identity.
 *
 * @since 2.0.0
 */
export const ApplicableIdentity: Applicable<KindIdentity> = {
  apply,
  map,
  wrap,
};

/**
 * The canonical implementation of Mappable for Identity.
 *
 * @since 2.0.0
 */
export const MappableIdentity: Mappable<KindIdentity> = { map };

/**
 * The canonical implementation of Flatmappable for Identity.
 *
 * @since 2.0.0
 */
export const FlatmappableIdentity: Flatmappable<KindIdentity> = {
  apply,
  map,
  flatmap,
  wrap,
};

/**
 * @since 2.0.0
 */
export const WrappableIdentity: Wrappable<KindIdentity> = { wrap };
