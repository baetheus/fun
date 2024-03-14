/**
 * This file contains the Sync algebraic data type. Sync is an lazy function
 * that takes no inputs. In other functional languages and runtimes sync is
 * referred to as IO.
 *
 * @module Sync
 * @since 2.0.0
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Combinable } from "./combinable.ts";
import type { Bind, Flatmappable, Tap } from "./flatmappable.ts";
import type { Initializable } from "./initializable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Traversable } from "./traversable.ts";
import type { Wrappable } from "./wrappable.ts";

import { constant, flow, pipe } from "./fn.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";

/**
 * @since 2.0.0
 */
export type Sync<A> = () => A;

/**
 * @since 2.0.0
 */
export interface KindSync extends Kind {
  readonly kind: Sync<Out<this, 0>>;
}

/**
 * @since 2.0.0
 */
export function wrap<A>(a: A): Sync<A> {
  return constant(a);
}

/**
 * @since 2.0.0
 */
export function apply<A>(ua: Sync<A>): <I>(ta: Sync<(a: A) => I>) => Sync<I> {
  return (ufai) => flow(ua, ufai());
}

/**
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ta: Sync<A>) => Sync<I> {
  return (ta) => flow(ta, fai);
}

/**
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Sync<I>,
): (ta: Sync<A>) => Sync<I> {
  return (ta) => flow(ta, fati, (x) => x());
}

/**
 * @since 2.0.0
 */
export function fold<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: Sync<A>) => O {
  return (ta) => foao(o, ta());
}

/**
 * @since 2.0.0
 */
export function traverse<V extends Kind>(
  A: Applicable<V> & Mappable<V>,
): <A, I, J, K, L, M>(
  faui: (a: A) => $<V, [I, J, K], [L], [M]>,
) => (ta: Sync<A>) => $<V, [Sync<I>, J, K], [L], [M]> {
  return (faui) => (ta) => pipe(faui(ta()), A.map(wrap));
}

/**
 * @since 2.0.0
 */
export function getCombinableSync<A>(
  { combine }: Combinable<A>,
): Combinable<Sync<A>> {
  return {
    combine: (second) => (first) => () => combine(second())(first()),
  };
}

/**
 * @since 2.0.0
 */
export function getInitializableSync<A>(
  I: Initializable<A>,
): Initializable<Sync<A>> {
  return {
    init: () => I.init,
    ...getCombinableSync(I),
  };
}

/**
 * @since 2.0.0
 */
export const ApplicableSync: Applicable<KindSync> = { apply, map, wrap };

/**
 * @since 2.0.0
 */
export const FlatmappableSync: Flatmappable<KindSync> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const FoldableSync: Foldable<KindSync> = { fold };

/**
 * @since 2.0.0
 */
export const MappableSync: Mappable<KindSync> = { map };

/**
 * @since 2.0.0
 */
export const TraversableSync: Traversable<KindSync> = { map, fold, traverse };

/**
 * @since 2.0.0
 */
export const WrappableSync: Wrappable<KindSync> = { wrap };

/**
 * @since 2.0.0
 */
export const tap: Tap<KindSync> = createTap(FlatmappableSync);

/**
 * @since 2.0.0
 */
export const bind: Bind<KindSync> = createBind(FlatmappableSync);

/**
 * @since 2.0.0
 */
export const bindTo: BindTo<KindSync> = createBindTo(MappableSync);
