import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import { createDo } from "./derivations.ts";
import { constant, flow, identity, pipe } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Reader<R, A> = (r: R) => A;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Reader";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Reader<_[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const make: <R>(r: R) => Reader<R, R> = constant;

export const ask: <R>() => Reader<R, R> = () => identity;

export const asks: <R, A>(f: (r: R) => A) => Reader<R, A> = identity;

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) => (ta) => flow(ta, fab),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfai) => (ta) => (r) => pipe(ta(r), tfai(r)),
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: constant,
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: (fatb) => (ta) => (r) => fatb(ta(r))(r),
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: (tta) => (r) => tta(r)(r),
  chain: Chain.chain,
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain } = Monad;

/*******************************************************************************
 * Do
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
