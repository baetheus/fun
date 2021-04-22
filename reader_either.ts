import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Lazy } from "./types.ts";

import * as E from "./either.ts";
import * as R from "./reader.ts";
import { createDo } from "./derivations.ts";
import { apply, constant, flow, identity, pipe } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type ReaderEither<S, L, R> = R.Reader<S, E.Either<L, R>>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "ReaderEither";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: ReaderEither<_[2], _[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const ask: <A, E = never>() => ReaderEither<A, E, A> = () => E.right;

export const asks: <R, A, E = never>(
  f: (r: R) => A,
) => ReaderEither<R, E, A> = (fra) => flow(fra, E.right);

export const left = <B, A = never>(
  left: B,
): ReaderEither<unknown, B, A> => R.of(E.left(left));

export const right = <A, B = never>(
  right: A,
): ReaderEither<unknown, B, A> => R.of(E.right(right));

export const tryCatch = <S, E, A>(
  f: Lazy<A>,
  onError: (e: unknown) => E,
): ReaderEither<S, E, A> => {
  try {
    return R.of(E.right(f()));
  } catch (e) {
    return R.of(E.left(onError(e)));
  }
};

export const fromEither = <S, E, A>(
  ta: E.Either<E, A>,
): ReaderEither<S, E, A> => R.of(ta);

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) => (ta) => flow(ta, E.map(fab)),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfab) =>
    (ta) => (r) => pipe(tfab(r), E.chain((fab) => pipe(ta(r), E.map(fab)))),
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: flow(E.right, constant),
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: (fatb) => R.chain(E.fold(left, fatb)),
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

export const Bifunctor: TC.Bifunctor<URI> = {
  bimap: (fai, fbj) => (tab) => flow(tab, E.bimap(fai, fbj)),
  mapLeft: (fbj) => (tab) => flow(tab, E.mapLeft(fbj)),
};

export const MonadThrow: TC.MonadThrow<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Monad.join,
  chain: Chain.chain,
  throwError: left,
};

export const Alt: TC.Alt<URI> = {
  map: Monad.map,
  alt: (tb) =>
    (ta) =>
      (r) =>
        pipe(
          ta(r),
          E.fold(() => tb(r), E.right),
        ),
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain, throwError } = MonadThrow;

export const { bimap, mapLeft } = Bifunctor;

export const { alt } = Alt;

export const chainLeft = <A, B, C, J>(fbtj: (b: B) => ReaderEither<C, J, A>) =>
  (ma: ReaderEither<C, B, A>): ReaderEither<C, J, A> =>
    pipe(ma, R.chain(E.fold(fbtj, right)));

export const compose = <E, B, C>(rbc: ReaderEither<B, E, C>) =>
  <A>(rab: ReaderEither<A, E, B>): ReaderEither<A, E, C> =>
    flow(rab, E.chain(rbc));

export const widen: <F>() => <R, E, A>(
  ta: ReaderEither<R, E, A>,
) => ReaderEither<R, E | F, A> = constant(identity);

/*******************************************************************************
 * Do
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
