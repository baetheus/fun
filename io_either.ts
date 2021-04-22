import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Lazy } from "./types.ts";

import * as E from "./either.ts";
import * as I from "./io.ts";
import * as S from "./sequence.ts";
import { createDo } from "./derivations.ts";
import { constant, flow, identity, pipe } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type IOEither<L, R> = I.IO<E.Either<L, R>>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "IOEither";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: IOEither<_[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const left = <E = never, A = never>(left: E): IOEither<E, A> =>
  I.of(E.left(left));

export const right = <E = never, A = never>(right: A): IOEither<E, A> =>
  I.of(E.right(right));

export const tryCatch = <E, A>(
  f: Lazy<A>,
  onError: (e: unknown) => E,
): IOEither<E, A> => {
  try {
    return right(f());
  } catch (e) {
    return left(onError(e));
  }
};

export const fromEither = <E, A>(ta: E.Either<E, A>): IOEither<E, A> =>
  constant(ta);

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) => (ta) => flow(ta, E.map(fab)),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfab) =>
    (ta) =>
      () =>
        pipe(
          E.sequenceTuple(tfab(), ta()),
          E.map((s) => s[0](s[1])),
        ),
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: right,
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: (fatb) => (ta) => flow(ta, E.fold(E.left, (a) => fatb(a)())),
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

export const Bifunctor: TC.Bifunctor<URI> = {
  bimap: flow(E.bimap, I.map),
  mapLeft: (fef) => (ta) => pipe(ta, I.map(E.mapLeft(fef))),
};

export const MonadThrow: TC.MonadThrow<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Monad.join,
  chain: Chain.chain,
  throwError: left,
};

export const Alt: TC.Alt<URI> = ({
  map: Monad.map,
  alt: (tb) => (ta) => flow(ta, E.fold(tb, E.right)),
});

export const Extends: TC.Extend<URI> = {
  map: Functor.map,
  extend: (tfab) => flow(tfab, right),
};

export const Foldable: TC.Foldable<URI> = {
  reduce: (faba, a) =>
    (tb) =>
      pipe(
        tb(),
        E.fold(() => a, (b) => faba(a, b)),
      ),
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain, throwError } = MonadThrow;

export const { bimap, mapLeft } = Bifunctor;

export const { reduce } = Foldable;

export const { extend } = Extends;

export const { alt } = Alt;

export const chainLeft = <E, A, M>(onLeft: (e: E) => IOEither<M, A>) =>
  (ma: IOEither<E, A>): IOEither<M, A> =>
    pipe(
      ma,
      I.chain(E.fold(onLeft, right)),
    );

export const widen: <F>() => <E = never, A = never>(
  ta: IOEither<E, A>,
) => IOEither<E | F, A> = constant(identity);

/*******************************************************************************
 * Sequence
 ******************************************************************************/

export const sequenceTuple = S.createSequenceTuple(Apply);

export const sequenceStruct = S.createSequenceStruct(Apply);

/*******************************************************************************
 * Do Notation
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
