import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Lazy } from "./types.ts";

import * as E from "./either.ts";
import * as T from "./task.ts";
import * as TE from "./task_either.ts";
import * as R from "./reader.ts";
import { createDo } from "./derivations.ts";
import { apply, constant, flow, identity, pipe } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type ReaderTaskEither<S, L, R> = R.Reader<S, TE.TaskEither<L, R>>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "ReaderTaskEither";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: ReaderTaskEither<_[2], _[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const ask: <A, E = never>() => ReaderTaskEither<A, E, A> = () =>
  TE.right;

export const asks: <R, A, E = never>(
  f: (r: R) => A,
) => ReaderTaskEither<R, E, A> = (fra) => flow(fra, TE.right);

export const left = <B, A = never>(left: B): ReaderTaskEither<unknown, B, A> =>
  R.of(TE.left(left));

export const right = <A, B = never>(
  right: A,
): ReaderTaskEither<unknown, B, A> => R.of(TE.right(right));

export const tryCatch = <S, E, A>(
  f: Lazy<A>,
  onError: (e: unknown) => E,
): ReaderTaskEither<S, E, A> => {
  try {
    return R.of(TE.right(f()));
  } catch (e) {
    return R.of(TE.left(onError(e)));
  }
};

export const fromEither = <E, A>(
  ta: E.Either<E, A>,
): ReaderTaskEither<unknown, E, A> =>
  pipe(
    ta,
    E.fold((e) => left(e), right),
  );

export const fromTaskEither = <S, E, A>(
  ta: TE.TaskEither<E, A>,
): ReaderTaskEither<S, E, A> => R.of(ta);

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) => (ta) => flow(ta, TE.map(fab)),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfab) =>
    (ta) =>
      (r) =>
        pipe(
          tfab(r),
          TE.chain((fab) => pipe(ta(r), TE.map(fab))),
        ),
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: flow(TE.right, constant),
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: (fatb) =>
    (ta) =>
      (r) =>
        async () => {
          const ea = await ta(r)();
          if (E.isLeft(ea)) {
            return ea;
          }
          return await fatb(ea.right)(r)();
        },
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

export const Bifunctor: TC.Bifunctor<URI> = {
  bimap: (fai, fbj) => (tab) => flow(tab, TE.bimap(fai, fbj)),
  mapLeft: (fbj) => (tab) => flow(tab, TE.mapLeft(fbj)),
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
  alt: (tb) => (ta) => (r) => pipe(ta(r), TE.alt(tb(r))),
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain, throwError } = MonadThrow;

export const { bimap, mapLeft } = Bifunctor;

export const { alt } = Alt;

export const chainLeft = <A, B, C, J>(
  fbtj: (b: B) => ReaderTaskEither<C, J, A>,
) =>
  (ma: ReaderTaskEither<C, B, A>): ReaderTaskEither<C, J, A> =>
    (r) =>
      async () => {
        const ea = await ma(r)();
        if (E.isRight(ea)) {
          return ea;
        }
        return await fbtj(ea.left)(r)();
      };

export const compose = <E, B, C>(rbc: ReaderTaskEither<B, E, C>) =>
  <A>(rab: ReaderTaskEither<A, E, B>): ReaderTaskEither<A, E, C> =>
    flow(rab, TE.chain(rbc));

export const widen: <F>() => <R, E, A>(
  ta: ReaderTaskEither<R, E, A>,
) => ReaderTaskEither<R, E | F, A> = constant(identity);

/*******************************************************************************
 * Do
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
