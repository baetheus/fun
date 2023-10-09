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
import type { Failable } from "./failable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Initializable } from "./initializable.ts";
import type { Mappable } from "./mappable.ts";
import type { Sync } from "./sync.ts";
import type { Wrappable } from "./wrappable.ts";

import * as E from "./either.ts";
import * as I from "./sync.ts";
import { constant, flow, pipe } from "./fn.ts";
import { createTap } from "./failable.ts";
import { createBind } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";

/**
 * @since 2.0.0
 */
export type SyncEither<L, R> = Sync<Either<L, R>>;

/**
 * @since 2.0.0
 */
export interface KindSyncEither extends Kind {
  readonly kind: SyncEither<Out<this, 1>, Out<this, 0>>;
}

/**
 * @since 2.0.0
 */
export interface KindSyncRight<B> extends Kind {
  readonly kind: SyncEither<B, Out<this, 0>>;
}

/**
 * @since 2.0.0
 */
export function left<A = never, B = never>(left: B): SyncEither<B, A> {
  return I.wrap(E.left(left));
}

/**
 * @since 2.0.0
 */
export function right<A = never, B = never>(right: A): SyncEither<B, A> {
  return I.wrap(E.right(right));
}

/**
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
 * @since 2.0.0
 */
export function fromEither<A = never, B = never>(
  ta: E.Either<B, A>,
): SyncEither<B, A> {
  return constant(ta);
}

/**
 * @since 2.0.0
 */
export function fromSync<A = never, B = never>(ta: Sync<A>): SyncEither<B, A> {
  return flow(ta, E.right);
}

/**
 * @since 2.0.0
 */
export function wrap<A = never, B = never>(a: A): SyncEither<B, A> {
  return right(a);
}

/**
 * @since 2.0.0
 */
export function fail<A = never, B = never>(b: B): SyncEither<B, A> {
  return left(b);
}

/**
 * @since 2.0.0
 */
export function apply<B, A>(
  ua: SyncEither<B, A>,
): <J, I>(ufai: SyncEither<J, (a: A) => I>) => SyncEither<B | J, I> {
  return (ufai) => flow(ufai, E.apply(ua()));
}

/**
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: SyncEither<B, A>) => SyncEither<B, I> {
  return I.map(E.map(fai));
}

/**
 * @since 2.0.0
 */
export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A>(ta: SyncEither<B, A>) => SyncEither<J, A> {
  return I.map(E.mapSecond(fbj));
}

/**
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
 * @since 2.0.0
 */
export function alt<A = never, B = never>(
  tb: SyncEither<B, A>,
): (ta: SyncEither<B, A>) => SyncEither<B, A> {
  return (ta) => flow(ta, E.match(tb, E.right));
}

/**
 * @since 2.0.0
 */
export function fold<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): <B>(ta: SyncEither<B, A>) => O {
  return (ta) => pipe(ta(), E.match(() => o, (a) => foao(o, a)));
}

/**
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
export const tap = createTap(FailableSyncEither);

/**
 * @since 2.0.0
 */
export const bind = createBind(FlatmappableSyncEither);

/**
 * @since 2.0.0
 */
export const bindTo = createBindTo(MappableSyncEither);
