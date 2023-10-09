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
 * @since 2.0.0
 */
export type Identity<A> = A;

/**
 * @since 2.0.0
 */
export interface KindIdentity extends Kind {
  readonly kind: Identity<Out<this, 0>>;
}

/**
 * @since 2.0.0
 */
export function wrap<A>(a: A): Identity<A> {
  return a;
}

/**
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): (ta: Identity<A>) => Identity<I> {
  return fai;
}

/**
 * @since 2.0.0
 */
export function apply<A>(
  ua: Identity<A>,
): <I>(ufai: Identity<(a: A) => I>) => Identity<I> {
  return (ufai) => ufai(ua);
}

/**
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Identity<I>,
): (ta: Identity<A>) => Identity<I> {
  return fati;
}

/**
 * @since 2.0.0
 */
export const ApplicableIdentity: Applicable<KindIdentity> = {
  apply,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const MappableIdentity: Mappable<KindIdentity> = { map };

/**
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
