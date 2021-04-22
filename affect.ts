import type * as TC from "./type_classes.ts";
import type * as HKT from "./hkt.ts";

import * as E from "./either.ts";
import { createDo } from "./derivations.ts";
import { flow, identity, pipe } from "./fns.ts";
import { createSequenceStruct, createSequenceTuple } from "./sequence.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Affect<R, E, A> = (r: R) => Promise<E.Either<E, A>>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Affect";

export type URI = typeof URI;

export type URIS = HKT.URIS;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Affect<_[2], _[1], _[0]>;
  }
}

/*******************************************************************************
 * Utilites
 ******************************************************************************/

export const make = <A>(a: A): Promise<A> => Promise.resolve(a);

export const then = <A, B>(fab: (a: A) => B) =>
  (p: Promise<A>): Promise<B> => p.then(fab);

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const ask = <R, L = never>(): Affect<R, L, R> => flow(E.right, make);

export const askLeft = <L, R = never>(): Affect<L, L, R> => flow(E.left, make);

export const asks = <R, E = never, A = never>(
  fra: (r: R) => Promise<A>,
): Affect<R, E, A> => flow(fra, then(E.right));

export const asksLeft = <R, E = never, A = never>(
  fre: (r: R) => Promise<E>,
): Affect<R, E, A> => flow(fre, then(E.left));

export const right = <R = never, E = never, A = never>(
  right: A,
): Affect<R, E, A> => () => make(E.right(right));

export const left = <R = never, E = never, A = never>(
  left: E,
): Affect<R, E, A> => () => make(E.left(left));

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fai) => (ta) => flow(ta, then(E.map(fai))),
};

export const Bifunctor: TC.Bifunctor<URI> = {
  bimap: (fbj, fai) => (ta) => flow(ta, then(E.bimap(fbj, fai))),
  mapLeft: (fbj) => (ta) => flow(ta, then(E.mapLeft(fbj))),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfab) =>
    (ta) =>
      async (r) => {
        const efab = await tfab(r);
        const ea = await ta(r);
        return pipe(
          ea,
          E.ap(efab),
        );
      },
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
  chain: (fati) =>
    (ta) =>
      async (r) => {
        const ea = await ta(r);
        return E.isLeft(ea) ? ea : fati(ea.right)(r);
      },
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

export const MonadThrow: TC.MonadThrow<URI> = {
  ...Monad,
  throwError: left,
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain, throwError } = MonadThrow;

export const { bimap, mapLeft } = Bifunctor;

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);

export const compose = <E = never, A = never, B = never>(
  aeb: Affect<A, E, B>,
) =>
  <R>(rea: Affect<R, E, A>): Affect<R, E, B> =>
    async (r) => {
      const ea = await rea(r);
      return E.isLeft(ea) ? ea : await aeb(ea.right);
    };

export const recover = <E, A>(fea: (e: E) => A) =>
  <R>(ta: Affect<R, E, A>): Affect<R, E, A> =>
    flow(ta, then(E.fold(flow(fea, E.right), E.right)));

/*******************************************************************************
 * Do
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
