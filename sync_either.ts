/**
 * This file contains the SyncEither algebraic data type. SyncEither is an
 * lazy function that takes no inputs and returns an Either. The intuition of a
 * SyncEither is an IO call that can fail.
 *
 * @module SyncEither
 * @since 2.0.0
 */

import type { Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Combinable } from "./combinable.ts";
import type { Either } from "./either.ts";
import type { Failable, Tap } from "./failable.ts";
import type { Bind, Flatmappable } from "./flatmappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Initializable } from "./initializable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Sync } from "./sync.ts";
import type { Wrappable } from "./wrappable.ts";

import * as E from "./either.ts";
import * as I from "./sync.ts";
import { constant, flow, pipe } from "./fn.ts";
import { createTap } from "./failable.ts";
import { createBind } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";

/**
 * The SyncEither type represents a lazy computation that returns an Either.
 *
 * @since 2.0.0
 */
export type SyncEither<L, R> = Sync<Either<L, R>>;

/**
 * Specifies SyncEither as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions and covariant
 * parameter B corresponding to the 1st index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindSyncEither extends Kind {
  readonly kind: SyncEither<Out<this, 1>, Out<this, 0>>;
}

/**
 * Specifies SyncEither with a fixed left type as a Higher Kinded Type.
 *
 * @since 2.0.0
 */
export interface KindSyncRight<B> extends Kind {
  readonly kind: SyncEither<B, Out<this, 0>>;
}

/**
 * Create a SyncEither that always fails with the given error.
 *
 * @example
 * ```ts
 * import { left } from "./sync_either.ts";
 *
 * const failure = left("Something went wrong");
 * ```
 *
 * @since 2.0.0
 */
export function left<A = never, B = never>(left: B): SyncEither<B, A> {
  return I.wrap(E.left(left));
}

/**
 * Create a SyncEither that always succeeds with the given value.
 *
 * @example
 * ```ts
 * import { right } from "./sync_either.ts";
 *
 * const success = right(42);
 * const result = success(); // Right(42)
 * ```
 *
 * @since 2.0.0
 */
export function right<A = never, B = never>(right: A): SyncEither<B, A> {
  return I.wrap(E.right(right));
}

/**
 * Wrap a function that can throw in a try/catch block, returning a SyncEither.
 *
 * @example
 * ```ts
 * import { tryCatch } from "./sync_either.ts";
 *
 * const riskyFunction = () => {
 *   if (Math.random() > 0.5) throw new Error("Random failure");
 *   return "Success";
 * };
 *
 * const safe = tryCatch(riskyFunction, (e) => `Error: ${e}`);
 * const result = safe(); // Either Right("Success") or Left("Error: ...")
 * ```
 *
 * @since 2.0.0
 */
export function tryCatch<A = never, B = never>(
  fa: () => A,
  onError: (error: unknown) => B,
): SyncEither<B, A> {
  try {
    return right(fa());
  } catch (e) {
    return left(onError(e));
  }
}

/**
 * Convert an Either to a SyncEither.
 *
 * @example
 * ```ts
 * import { fromEither } from "./sync_either.ts";
 * import * as E from "./either.ts";
 *
 * const either = E.right("Success");
 * const syncEither = fromEither(either);
 * const result = syncEither(); // Right("Success")
 * ```
 *
 * @since 2.0.0
 */
export function fromEither<A = never, B = never>(
  ta: E.Either<B, A>,
): SyncEither<B, A> {
  return constant(ta);
}

/**
 * Convert a Sync to a SyncEither, treating any failure as a Right.
 *
 * @example
 * ```ts
 * import { fromSync } from "./sync_either.ts";
 * import { wrap } from "./sync.ts";
 *
 * const sync = wrap("Hello");
 * const syncEither = fromSync(sync);
 * const result = syncEither(); // Right("Hello")
 * ```
 *
 * @since 2.0.0
 */
export function fromSync<A = never, B = never>(ta: Sync<A>): SyncEither<B, A> {
  return flow(ta, E.right);
}

/**
 * Wrap a value in a SyncEither as a Right.
 *
 * @example
 * ```ts
 * import { wrap } from "./sync_either.ts";
 *
 * const wrapped = wrap("Hello");
 * const result = wrapped(); // Right("Hello")
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A = never, B = never>(a: A): SyncEither<B, A> {
  return right(a);
}

/**
 * Create a SyncEither that always fails with the given error.
 *
 * @example
 * ```ts
 * import { fail } from "./sync_either.ts";
 *
 * const failure = fail("Something went wrong");
 * const result = failure(); // Left("Something went wrong")
 * ```
 *
 * @since 2.0.0
 */
export function fail<A = never, B = never>(b: B): SyncEither<B, A> {
  return left(b);
}

/**
 * Apply a function wrapped in a SyncEither to a value wrapped in a SyncEither.
 *
 * @example
 * ```ts
 * import { apply, right } from "./sync_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const syncEitherFn = right((n: number) => n * 2);
 * const syncEitherValue = right(5);
 * const result = pipe(
 *   syncEitherFn,
 *   apply(syncEitherValue)
 * );
 *
 * const value = result(); // Right(10)
 * ```
 *
 * @since 2.0.0
 */
export function apply<B, A>(
  ua: SyncEither<B, A>,
): <J, I>(ufai: SyncEither<J, (a: A) => I>) => SyncEither<B | J, I> {
  return (ufai) => flow(ufai, E.apply(ua()));
}

/**
 * Apply a function to the Right value of a SyncEither.
 *
 * @example
 * ```ts
 * import { map, right } from "./sync_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   right(5),
 *   map(n => n * 2)
 * );
 *
 * const value = result(); // Right(10)
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: SyncEither<B, A>) => SyncEither<B, I> {
  return I.map(E.map(fai));
}

/**
 * Apply a function to the Left value of a SyncEither.
 *
 * @example
 * ```ts
 * import { mapSecond, left } from "./sync_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   left("error"),
 *   mapSecond(e => `Error: ${e}`)
 * );
 *
 * const value = result(); // Left("Error: error")
 * ```
 *
 * @since 2.0.0
 */
export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A>(ta: SyncEither<B, A>) => SyncEither<J, A> {
  return I.map(E.mapSecond(fbj));
}

/**
 * Chain SyncEither computations together.
 *
 * @example
 * ```ts
 * import { flatmap, right } from "./sync_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   right(5),
 *   flatmap(n => right(n * 2))
 * );
 *
 * const value = result(); // Right(10)
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I, J>(
  faui: (a: A) => SyncEither<J, I>,
): <B>(ua: SyncEither<B, A>) => SyncEither<B | J, I> {
  return (ua) => () => {
    const ea = ua();
    return E.isLeft(ea) ? ea : faui(ea.right)();
  };
}

/**
 * Recover from a Left value by applying a function to it.
 *
 * @example
 * ```ts
 * import { recover, left, right } from "./sync_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   left("error"),
 *   recover(e => right(`Recovered from: ${e}`))
 * );
 *
 * const value = result(); // Right("Recovered from: error")
 * ```
 *
 * @since 2.0.0
 */
export function recover<B, J, I>(
  fbui: (b: B) => SyncEither<J, I>,
): <A>(ua: SyncEither<B, A>) => SyncEither<J, A | I> {
  return (ua) => () => {
    const ea = ua();
    return E.isRight(ea) ? ea : fbui(ea.left)();
  };
}

/**
 * Provide an alternative SyncEither if the current one fails.
 *
 * @example
 * ```ts
 * import { alt, left, right } from "./sync_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   left("error"),
 *   alt(right("fallback"))
 * );
 *
 * const value = result(); // Right("fallback")
 * ```
 *
 * @since 2.0.0
 */
export function alt<A = never, B = never>(
  tb: SyncEither<B, A>,
): (ta: SyncEither<B, A>) => SyncEither<B, A> {
  return (ta) => flow(ta, E.match(tb, E.right));
}

/**
 * Fold over a SyncEither to produce a single value.
 *
 * @example
 * ```ts
 * import { fold, right, left } from "./sync_either.ts";
 *
 * const matcher = fold(
 *   (acc: number, value: number) => acc + value,
 *   0
 * );
 *
 * const result1 = matcher(right(5)); // 5
 * const result2 = matcher(left("error")); // 0
 * ```
 *
 * @since 2.0.0
 */
export function fold<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): <B>(ta: SyncEither<B, A>) => O {
  return (ta) => pipe(ta(), E.match(() => o, (a) => foao(o, a)));
}

/**
 * Create a Combinable instance for SyncEither given Combinable instances for the Left and Right types.
 *
 * @example
 * ```ts
 * import { getCombinableSyncEither, right } from "./sync_either.ts";
 * import * as N from "./number.ts";
 * import * as S from "./string.ts";
 *
 * const combinable = getCombinableSyncEither(N.CombinableNumberSum, S.CombinableString);
 * const se1 = right(2);
 * const se2 = right(3);
 * const result = combinable.combine(se2)(se1)(); // Right(5)
 * ```
 *
 * @since 2.0.0
 */
export function getCombinableSyncEither<A, B>(
  CA: Combinable<A>,
  CB: Combinable<B>,
): Combinable<SyncEither<B, A>> {
  const { combine } = E.getCombinableEither(CA, CB);
  return {
    combine: (second) => (first) => () => combine(second())(first()),
  };
}

/**
 * Create an Initializable instance for SyncEither given Initializable instances for the Left and Right types.
 *
 * @example
 * ```ts
 * import { getInitializableSyncEither, right } from "./sync_either.ts";
 * import * as N from "./number.ts";
 * import * as S from "./string.ts";
 *
 * const initializable = getInitializableSyncEither(N.InitializableNumberSum, S.InitializableString);
 * const se1 = right(2);
 * const se2 = right(3);
 * const result = initializable.combine(se2)(se1)(); // Right(5)
 * const init = initializable.init()(); // Right(0)
 * ```
 *
 * @since 2.0.0
 */
export function getInitializableSyncEither<A, B>(
  IA: Initializable<A>,
  IB: Initializable<B>,
): Initializable<SyncEither<B, A>> {
  const { init } = E.getInitializableEither(IA, IB);
  return {
    init: () => init,
    ...getCombinableSyncEither(IA, IB),
  };
}

/**
 * Create a Flatmappable instance for SyncEither with a fixed left type.
 *
 * @example
 * ```ts
 * import { getFlatmappableSyncRight, right } from "./sync_either.ts";
 * import * as S from "./string.ts";
 *
 * const flatmappable = getFlatmappableSyncRight(S.CombinableString);
 * const se = right(5);
 * const result = flatmappable.flatmap((n: number) => right(n * 2))(se)(); // Right(10)
 * ```
 *
 * @since 2.0.0
 */
export function getFlatmappableSyncRight<B>(
  C: Combinable<B>,
): Flatmappable<KindSyncRight<B>> {
  const right = E.getFlatmappableRight(C);
  return {
    wrap,
    map,
    flatmap,
    apply: (ua) => (ufai) => () => right.apply(ua())(ufai()),
  };
}

/**
 * @since 2.0.0
 */
export const ApplicableSyncEither: Applicable<KindSyncEither> = {
  apply,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const BimappableSyncEither: Bimappable<KindSyncEither> = {
  map,
  mapSecond,
};

/**
 * @since 2.0.0
 */
export const FlatmappableSyncEither: Flatmappable<KindSyncEither> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const FailableSyncEither: Failable<KindSyncEither> = {
  alt,
  apply,
  fail,
  flatmap,
  map,
  recover,
  wrap,
};

/**
 * @since 2.0.0
 */
export const FoldableSyncEither: Foldable<KindSyncEither> = { fold };

/**
 * @since 2.0.0
 */
export const MappableSyncEither: Mappable<KindSyncEither> = { map };

/**
 * @since 2.0.0
 */
export const WrappableSyncEither: Wrappable<KindSyncEither> = { wrap };

/**
 * @since 2.0.0
 */
export const tap: Tap<KindSyncEither> = createTap(FailableSyncEither);

/**
 * @since 2.0.0
 */
export const bind: Bind<KindSyncEither> = createBind(FlatmappableSyncEither);

/**
 * @since 2.0.0
 */
export const bindTo: BindTo<KindSyncEither> = createBindTo(MappableSyncEither);
