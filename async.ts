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
 * The Async type represents a lazy, asynchronous computation that returns a value of type A.
 *
 * @since 2.0.0
 */
export type Async<A> = Sync<Promise<A>>;

/**
 * Specifies Async as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindAsync extends Kind {
  readonly kind: Async<Out<this, 0>>;
}

/**
 * Add a delay to an Async computation.
 *
 * @example
 * ```ts
 * import { delay } from "./async.ts";
 * import { wrap } from "./async.ts";
 * import { pipe } from "./fn.ts";
 *
 * const delayed = pipe(
 *   wrap("Hello"),
 *   delay(1000)
 * );
 *
 * // This will wait 1 second before resolving to "Hello"
 * const result = await delayed();
 * ```
 *
 * @since 2.0.0
 */
export function delay(ms: number): <A>(ma: Async<A>) => Async<A> {
  return (ta) => () => wait(ms).then(ta);
}

/**
 * Convert a synchronous computation to an asynchronous one.
 *
 * @example
 * ```ts
 * import { fromSync } from "./async.ts";
 * import { wrap } from "./sync.ts";
 *
 * const sync = wrap(() => "Hello");
 * const async = fromSync(sync);
 *
 * const result = await async(); // "Hello"
 * ```
 *
 * @since 2.0.0
 */
export function fromSync<A>(fa: Sync<A>): Async<A> {
  return () => resolve(fa());
}

/**
 * Wrap a function that can throw in a try/catch block, returning an Async.
 *
 * @example
 * ```ts
 * import { tryCatch } from "./async.ts";
 *
 * const riskyFunction = (n: number) => {
 *   if (n < 0) throw new Error("Negative number");
 *   return n * 2;
 * };
 *
 * const safe = tryCatch(riskyFunction, (e, args) => 0);
 *
 * const result1 = await safe(5)(); // 10
 * const result2 = await safe(-1)(); // 0
 * ```
 *
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
 * Wrap a value in an Async computation.
 *
 * @example
 * ```ts
 * import { wrap } from "./async.ts";
 *
 * const asyncValue = wrap("Hello");
 * const result = await asyncValue(); // "Hello"
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A>(a: A): Async<A> {
  return () => resolve(a);
}

/**
 * Apply a function to the result of an Async computation.
 *
 * @example
 * ```ts
 * import { map } from "./async.ts";
 * import { wrap } from "./async.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   wrap(5),
 *   map(n => n * 2)
 * );
 *
 * const value = await result(); // 10
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ta: Async<A>) => Async<I> {
  return (ta) => () => ta().then(fai);
}

/**
 * Apply a function wrapped in an Async to a value wrapped in an Async.
 *
 * @example
 * ```ts
 * import { apply } from "./async.ts";
 * import { wrap } from "./async.ts";
 * import { pipe } from "./fn.ts";
 *
 * const asyncFn = wrap((n: number) => n * 2);
 * const asyncValue = wrap(5);
 *
 * const result = pipe(
 *   asyncFn,
 *   apply(asyncValue)
 * );
 *
 * const value = await result(); // 10
 * ```
 *
 * @since 2.0.0
 */
export function apply<A>(
  ua: Async<A>,
): <I>(ufai: Async<(a: A) => I>) => Async<I> {
  return (ufai) => () => Promise.all([ufai(), ua()]).then(([fai, a]) => fai(a));
}

/**
 * Apply a function wrapped in an Async to a value wrapped in an Async, sequentially.
 *
 * @example
 * ```ts
 * import { applySequential } from "./async.ts";
 * import { wrap } from "./async.ts";
 * import { pipe } from "./fn.ts";
 *
 * const asyncFn = wrap((n: number) => n * 2);
 * const asyncValue = wrap(5);
 *
 * const result = pipe(
 *   asyncFn,
 *   applySequential(asyncValue)
 * );
 *
 * const value = await result(); // 10
 * ```
 *
 * @since 2.0.0
 */
export function applySequential<A>(
  ua: Async<A>,
): <I>(ufai: Async<(a: A) => I>) => Async<I> {
  return (ufai) => async () => (await ufai())(await ua());
}

/**
 * Chain Async computations together.
 *
 * @example
 * ```ts
 * import { flatmap } from "./async.ts";
 * import { wrap } from "./async.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   wrap(5),
 *   flatmap(n => wrap(n * 2))
 * );
 *
 * const value = await result(); // 10
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Async<I>,
): (ta: Async<A>) => Async<I> {
  return (ta) => () => ta().then(fati).then((ti) => ti());
}

/**
 * Create a Combinable instance for Async given a Combinable for the inner type.
 *
 * @example
 * ```ts
 * import { getCombinableAsync, wrap } from "./async.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const combinableAsync = getCombinableAsync(N.CombinableNumberSum);
 * const async1 = wrap(2);
 * const async2 = wrap(3);
 *
 * const result = await pipe(
 *   async1,
 *   combinableAsync.combine(async2),
 * ); // 5
 * ```
 *
 * @since 2.0.0
 */
export function getCombinableAsync<A>(
  { combine }: Combinable<A>,
): Combinable<Async<A>> {
  return {
    combine: (second) => (first) => () =>
      Promise.all([first(), second()]).then(([a, b]) => combine(b)(a)),
  };
}

/**
 * Create an Initializable instance for Async given an Initializable for the inner type.
 *
 * @example
 * ```ts
 * import { getInitializableAsync, wrap } from "./async.ts";
 * import * as N from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const initializableAsync = getInitializableAsync(N.InitializableNumberSum);
 * const async1 = wrap(2);
 * const async2 = wrap(3);
 *
 * const result = await pipe(
 *   async1,
 *   initializableAsync.combine(async2),
 * ); // 5
 *
 * const init = await pipe(
 *   initializableAsync,
 *   initializableAsync.init()
 * ); // 0
 * ```
 *
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
