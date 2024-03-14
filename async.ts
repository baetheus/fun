/**
 * This file contains the Async algebraic data type. Async is a lazy,
 * asynchronous adt that is useful for encapsulating anything from file reads
 * and network requests to timers and loops.
 *
 * @module Async
 * @since 2.0.0
 */

import type { Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Combinable } from "./combinable.ts";
import type { Initializable } from "./initializable.ts";
import type { Bind, Flatmappable, Tap } from "./flatmappable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Sync } from "./sync.ts";
import type { Wrappable } from "./wrappable.ts";

import { createBindTo } from "./mappable.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { resolve, wait } from "./promise.ts";
import { handleThrow } from "./fn.ts";

/**
 * @since 2.0.0
 */
export type Async<A> = Sync<Promise<A>>;

/**
 * @since 2.0.0
 */
export interface KindAsync extends Kind {
  readonly kind: Async<Out<this, 0>>;
}

/**
 * @since 2.0.0
 */
export function delay(ms: number): <A>(ma: Async<A>) => Async<A> {
  return (ta) => () => wait(ms).then(ta);
}

/**
 * @since 2.0.0
 */
export function fromSync<A>(fa: Sync<A>): Async<A> {
  return () => resolve(fa());
}

/**
 * @since 2.0.0
 */
export function tryCatch<AS extends unknown[], A>(
  fasr: (...as: AS) => A | PromiseLike<A>,
  onThrow: (e: unknown, as: AS) => A,
): (...as: AS) => Async<A> {
  return (...as) => {
    const _onThrow = (e: unknown) => onThrow(e, as);
    return handleThrow(
      () => fasr(...as),
      (a) => resolve(a).catch(_onThrow),
      (e) => resolve(_onThrow(e)),
    );
  };
}

/**
 * @since 2.0.0
 */
export function wrap<A>(a: A): Async<A> {
  return () => resolve(a);
}

/**
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ta: Async<A>) => Async<I> {
  return (ta) => () => ta().then(fai);
}

/**
 * @since 2.0.0
 */
export function apply<A>(
  ua: Async<A>,
): <I>(ufai: Async<(a: A) => I>) => Async<I> {
  return (ufai) => () => Promise.all([ufai(), ua()]).then(([fai, a]) => fai(a));
}

/**
 * @since 2.0.0
 */
export function applySequential<A>(
  ua: Async<A>,
): <I>(ufai: Async<(a: A) => I>) => Async<I> {
  return (ufai) => async () => (await ufai())(await ua());
}

/**
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Async<I>,
): (ta: Async<A>) => Async<I> {
  return (ta) => () => ta().then((a) => fati(a)());
}

/**
 * @since 2.0.0
 */
export function getCombinableAsync<A>(
  { combine }: Combinable<A>,
): Combinable<Async<A>> {
  return {
    combine: (second) => (first) => async () =>
      combine(await second())(await first()),
  };
}

/**
 * @since 2.0.0
 */
export function getInitializableAsync<A>(
  I: Initializable<A>,
): Initializable<Async<A>> {
  return {
    init: () => async () => await I.init(),
    ...getCombinableAsync(I),
  };
}

/**
 * @since 2.0.0
 */
export const WrappableAsync: Wrappable<KindAsync> = { wrap };

/**
 * @since 2.0.0
 */
export const ApplicableAsync: Applicable<KindAsync> = { apply, map, wrap };

/**
 * @since 2.0.0
 */
export const MappableAsync: Mappable<KindAsync> = { map };

/**
 * @since 2.0.0
 */
export const FlatmappableAsync: Flatmappable<KindAsync> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * @since 2.0.1
 */
export const FlatmappableAsyncSeq: Flatmappable<KindAsync> = {
  apply: applySequential,
  flatmap,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const tap: Tap<KindAsync> = createTap(FlatmappableAsync);

/**
 * @since 2.0.0
 */
export const bind: Bind<KindAsync> = createBind(FlatmappableAsync);

/**
 * @since 2.0.0
 */
export const bindTo: BindTo<KindAsync> = createBindTo(MappableAsync);
