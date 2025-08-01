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
 * The Sync type represents a lazy computation that returns a value of type A.
 *
 * @since 2.0.0
 */
export type Sync<A> = () => A;

/**
 * Specifies Sync as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindSync extends Kind {
  readonly kind: Sync<Out<this, 0>>;
}

/**
 * Wrap a value in a Sync computation.
 *
 * @example
 * ```ts
 * import { wrap } from "./sync.ts";
 *
 * const syncValue = wrap("Hello");
 * const result = syncValue(); // "Hello"
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A>(a: A): Sync<A> {
  return constant(a);
}

/**
 * Apply a function wrapped in a Sync to a value wrapped in a Sync.
 *
 * @example
 * ```ts
 * import { apply, wrap } from "./sync.ts";
 * import { pipe } from "./fn.ts";
 *
 * const syncFn = wrap((n: number) => n * 2);
 * const syncValue = wrap(5);
 * const result = pipe(
 *   syncFn,
 *   apply(syncValue)
 * );
 *
 * const value = result(); // 10
 * ```
 *
 * @since 2.0.0
 */
export function apply<A>(ua: Sync<A>): <I>(ta: Sync<(a: A) => I>) => Sync<I> {
  return (ufai) => flow(ua, ufai());
}

/**
 * Apply a function to the result of a Sync computation.
 *
 * @example
 * ```ts
 * import { map, wrap } from "./sync.ts";
 * import { pipe } from "./fn.ts";
 *
 * const syncValue = wrap(5);
 * const result = pipe(
 *   syncValue,
 *   map(n => n * 2)
 * );
 *
 * const value = result(); // 10
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ta: Sync<A>) => Sync<I> {
  return (ta) => flow(ta, fai);
}

/**
 * Chain Sync computations together.
 *
 * @example
 * ```ts
 * import { flatmap, wrap } from "./sync.ts";
 * import { pipe } from "./fn.ts";
 *
 * const syncValue = wrap(5);
 * const result = pipe(
 *   syncValue,
 *   flatmap(n => wrap(n * 2))
 * );
 *
 * const value = result(); // 10
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Sync<I>,
): (ta: Sync<A>) => Sync<I> {
  return (ta) => flow(ta, fati, (x) => x());
}

/**
 * Fold over a Sync computation to produce a single value.
 *
 * @example
 * ```ts
 * import { fold, wrap } from "./sync.ts";
 *
 * const syncValue = wrap(5);
 * const result = fold(
 *   (acc: number, value: number) => acc + value,
 *   0
 * )(syncValue);
 *
 * console.log(result); // 5
 * ```
 *
 * @since 2.0.0
 */
export function fold<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: Sync<A>) => O {
  return (ta) => foao(o, ta());
}

/**
 * Traverse over a Sync using the supplied Applicable.
 *
 * @example
 * ```ts
 * import { traverse, wrap } from "./sync.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const syncValue = wrap(5);
 * const faui = (n: number) => O.some(n * 2);
 * const traverseOption = traverse(O.ApplicableOption)(faui);
 *
 * const result = traverseOption(syncValue); // Some(Sync(10))
 * ```
 *
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
 * Create a Combinable instance for Sync given a Combinable for the inner type.
 *
 * @example
 * ```ts
 * import { getCombinableSync, wrap } from "./sync.ts";
 * import * as N from "./number.ts";
 *
 * const combinableSync = getCombinableSync(N.CombinableNumberSum);
 * const sync1 = wrap(2);
 * const sync2 = wrap(3);
 * const result = combinableSync.combine(sync2)(sync1)(); // 5
 * ```
 *
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
 * Create an Initializable instance for Sync given an Initializable for the inner type.
 *
 * @example
 * ```ts
 * import { getInitializableSync, wrap } from "./sync.ts";
 * import * as N from "./number.ts";
 *
 * const initializableSync = getInitializableSync(N.InitializableNumberSum);
 * const sync1 = wrap(2);
 * const sync2 = wrap(3);
 * const result = initializableSync.combine(sync2)(sync1)(); // 5
 * const init = initializableSync.init()(); // 0
 * ```
 *
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
