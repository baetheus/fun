import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import { createSequenceStruct, createSequenceTuple } from "./sequence.ts";
import { apply, constant, flow, pipe } from "./fns.ts";
import { createApplySemigroup, createDo } from "./derivations.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type IO<A> = () => A;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "IO";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: IO<_[0]>;
  }
}

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) => (ta) => flow(ta, fab),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfab) => (ta) => () => tfab()(ta()),
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
  chain: (fatb) => (ta) => flow(ta, fatb, apply()),
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: apply(),
  chain: Chain.chain,
};

export const Extends: TC.Extend<URI> = {
  map: Monad.map,
  extend: (ftab) => (ta) => () => ftab(ta),
};

export const Foldable: TC.Foldable<URI> = {
  reduce: (faba, a) => (tb) => faba(a, tb()),
};

export const Traversable: TC.Traversable<URI> = {
  map: Monad.map,
  reduce: Foldable.reduce,
  traverse: (A) => (faub) => (ta) => pipe(faub(ta()), A.map(of)),
};

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getSemigroup = createApplySemigroup(Apply);

export const getMonoid = <A>(M: TC.Monoid<A>): TC.Monoid<IO<A>> => ({
  ...getSemigroup(M),
  empty: constant(M.empty),
});

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain } = Monad;

export const { reduce, traverse } = Traversable;

export const { extend } = Extends;

/*******************************************************************************
 * Sequenec
 ******************************************************************************/

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);

/*******************************************************************************
 * Do Notation
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
