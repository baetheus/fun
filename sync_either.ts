import type { Kind, Out } from "./kind.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Applicable } from "./applicable.ts";
import type { Mappable } from "./mappable.ts";
import type { Failable } from "./failable.ts";
import type { Reducible } from "./reducible.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Sync } from "./sync.ts";
import type { Either } from "./either.ts";

import * as E from "./either.ts";
import * as I from "./sync.ts";
import { constant, flow, pipe } from "./fn.ts";

export type SyncEither<L, R> = Sync<Either<L, R>>;

export interface KindSyncEither extends Kind {
  readonly kind: SyncEither<Out<this, 1>, Out<this, 0>>;
}

export function left<A = never, B = never>(left: B): SyncEither<B, A> {
  return I.wrap(E.left(left));
}

export function right<A = never, B = never>(right: A): SyncEither<B, A> {
  return I.wrap(E.right(right));
}

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

export function fromEither<A = never, B = never>(
  ta: E.Either<B, A>,
): SyncEither<B, A> {
  return constant(ta);
}

export function fromSync<A = never, B = never>(ta: Sync<A>): SyncEither<B, A> {
  return flow(ta, E.right);
}

export function wrap<A = never, B = never>(a: A): SyncEither<B, A> {
  return right(a);
}

export function fail<A = never, B = never>(b: B): SyncEither<B, A> {
  return left(b);
}

export function apply<B, A>(
  ua: SyncEither<B, A>,
): <J, I>(ufai: SyncEither<J, (a: A) => I>) => SyncEither<B | J, I> {
  return (ufai) => flow(ufai, E.apply(ua()));
}

export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: SyncEither<B, A>) => SyncEither<B, I> {
  return I.map(E.map(fai));
}

export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A>(ta: SyncEither<B, A>) => SyncEither<J, A> {
  return I.map(E.mapSecond(fbj));
}

export function flatmap<A, I, J>(
  faui: (a: A) => SyncEither<J, I>,
): <B>(ua: SyncEither<B, A>) => SyncEither<B | J, I> {
  return (ua) => () => {
    const ea = ua();
    return E.isLeft(ea) ? ea : faui(ea.right)();
  };
}

export function recover<B, J, I>(
  fbui: (b: B) => SyncEither<J, I>,
): <A>(ua: SyncEither<B, A>) => SyncEither<J, A | I> {
  return (ua) => () => {
    const ea = ua();
    return E.isRight(ea) ? ea : fbui(ea.left)();
  };
}

export function alt<A = never, B = never>(
  tb: SyncEither<B, A>,
): (ta: SyncEither<B, A>) => SyncEither<B, A> {
  return (ta) => flow(ta, E.match(tb, E.right));
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): <B>(ta: SyncEither<B, A>) => O {
  return (ta) => pipe(ta(), E.match(() => o, (a) => foao(o, a)));
}

export const MappableSyncEither: Mappable<KindSyncEither> = { map };

export const BimappableSyncEither: Bimappable<KindSyncEither> = {
  map,
  mapSecond,
};

export const ApplicableSyncEither: Applicable<KindSyncEither> = {
  apply,
  map,
  wrap,
};

export const FlatmappableSyncEither: Flatmappable<KindSyncEither> = {
  apply,
  flatmap,
  map,
  wrap,
};

export const FailableSyncEither: Failable<KindSyncEither> = {
  alt,
  apply,
  fail,
  flatmap,
  map,
  recover,
  wrap,
};

export const ReducibleSyncEither: Reducible<KindSyncEither> = { reduce };
