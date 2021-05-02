import type * as TC from "./type_classes.ts";
import type * as HKT from "./hkt.ts";
import type { Reader } from "./reader.ts";
import type { Either } from "./either.ts";

import * as E from "./either.ts";
import { createDo } from "./derivations.ts";
import { flow, identity, pipe, resolve, then } from "./fns.ts";
import { createSequenceStruct, createSequenceTuple } from "./sequence.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

/**
 * The Affect type can best be thought of as an asynchronous function that
 * returns an `Either`. ie. `async (r: R) => Promise<Either<E, A>>`. This
 * forms the basis of most Promise based asynchronous communication in
 * TypeScript.
 */
export type Affect<R, E, A> = Reader<R, Promise<Either<E, A>>>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

/**
 * URI constant for Affect
 */
export const URI = "Affect";

/**
 * URI constant type for Affect
 */
export type URI = typeof URI;

/**
 * Kind declaration for Affect
 */
declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Affect<_[2], _[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

/**
 * A thunk that takes a type level value. Like Reader.ask this function is
 * used to set type constraints on a value without supplying a value.
 *
 *       const p1 = ask<number>();
 *       const p2 = p1(1); // Promise(Right(1))
 */
export const ask = <R, L = never>(): Affect<R, L, R> => flow(E.right, resolve);

/**
 * A thunk that takes a type level value. Like Reader.ask this function is
 * used to set type constraints on a value without supplying a value.
 *
 *       const p1 = ask<number>();
 *       const p2 = p1(1); // Promise(Left(1))
 */
export const askLeft = <L, R = never>(): Affect<L, L, R> =>
  flow(E.left, resolve);

/**
 * Constructs an Affect from an asynchronous computation
 *
 *       const p1 = asks((n: URL) => fetch(n))
 *       const p2 = p1(1); // Promise(Right(Response))
 */
export const asks = <R, E = never, A = never>(
  fra: (r: R) => Promise<A>,
): Affect<R, E, A> => flow(fra, then(E.right));

/**
 * Constructs an Affect from an asynchronous computation
 *
 *       const p1 = asks((n: URL) => fetch(n))
 *       const p2 = p1(1); // Promise(Left(Response))
 */
export const asksLeft = <R, E = never, A = never>(
  fre: (r: R) => Promise<E>,
): Affect<R, E, A> => flow(fre, then(E.left));

/**
 * Constructs an Affect from a value
 *
 *       const p1 = right(1) // (n: never) => Promise(Right(1))
 */
export const right = <R = never, E = never, A = never>(
  right: A,
): Affect<R, E, A> => () => resolve(E.right(right));

/**
 * Constructs an Affect from a value
 *
 *       const p1 = left(1) // (n: never) => Promise(Left(1))
 */
export const left = <R = never, E = never, A = never>(
  left: E,
): Affect<R, E, A> => () => resolve(E.left(left));

/*******************************************************************************
 * Modules
 ******************************************************************************/

/**
 * The Functor module for Affect
 */
export const Functor: TC.Functor<URI> = {
  map: (fai) => (ta) => flow(ta, then(E.map(fai))),
};

/**
 * The Bifunctor module for Affect
 */
export const Bifunctor: TC.Bifunctor<URI> = {
  bimap: (fbj, fai) => (ta) => flow(ta, then(E.bimap(fbj, fai))),
  mapLeft: (fbj) => (ta) => flow(ta, then(E.mapLeft(fbj))),
};

/**
 * The Apply module for Affect
 */
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

/**
 * The Applicative module for Affect
 */
export const Applicative: TC.Applicative<URI> = {
  of: right,
  ap: Apply.ap,
  map: Functor.map,
};

/**
 * The Chain module for Affect
 */
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

/**
 * The Monad module for Affect
 */
export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

/**
 * The MonadThrow module for Affect
 */
export const MonadThrow: TC.MonadThrow<URI> = {
  ...Monad,
  throwError: left,
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

/**
 * An alias for `right`. Constructs an Affect from a value.
 *
 *      const p1 = of(1);
 *      const p2 = p1(10); // Promise(Right(1))
 */
export const of = MonadThrow.of;

/**
 * The applicative function for Affect.
 *
 *      const p1 = ask<number, string>()
 *      const p2 = pipe(p1, map(n => (m: number) => n + 1))
 *      const p3 = pipe(p1, ap(p2))
 *      const p4 = p3(1); // Promise(Right(2))
 */
export const ap = MonadThrow.ap;

/**
 * The functor function for Affect.
 *
 *      const p1 = ask<number, string>();
 *      const p2 = map((n: number) => n + 1);
 *      const p3 = p2(p1);
 *      const p4 = p3(1); // Promise(Right(2))
 */
export const map = MonadThrow.map;

export const { join, chain, throwError } = MonadThrow;

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
