import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import { createDo } from "./derivations.ts";
import { flow, identity } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type State<S, A> = (s: S) => [A, S];

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "State";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: State<_[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const get = <S>(): State<S, S> => (s: S) => [s, s];

export const gets = <S, A>(fsa: (s: S) => A): State<S, A> =>
  (s: S) => [fsa(s), s];

export const put = <S>(s: S): State<S, void> => () => [undefined, s];

export const modify = <S>(fss: (s: S) => S): State<S, void> =>
  (s: S) => [undefined, fss(s)];

export const make = <S, A>(a: A, s: S): State<S, A> => () => [a, s];

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) => (ta) => flow(ta, ([a, s]) => [fab(a), s]),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfab) =>
    (ta) =>
      (s1) => {
        const [fab, s2] = tfab(s1);
        const [a, s3] = ta(s2);
        return [fab(a), s3];
      },
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: (a) => (s) => [a, s],
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: (fatb) => (ta) => flow(ta, ([a, s]) => fatb(a)(s)),
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain } = Monad;

export const evaluate = <S>(s: S) => <A>(ma: State<S, A>): A => ma(s)[0];

export const execute = <S>(s: S) => <A>(ma: State<S, A>): S => ma(s)[1];

/*******************************************************************************
 * Do
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
