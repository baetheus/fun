import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import { identity } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Const<E, _ = never> = E;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Const";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Const<_[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const make = <E, A = never>(e: E): Const<E, A> => e;

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getShow = <E, A>(S: TC.Show<E>): TC.Show<Const<E, A>> => ({
  show: (c) => `Const(${S.show(c)})`,
});

export const getSetoid: <E, A>(
  E: TC.Setoid<E>,
) => TC.Setoid<Const<E, A>> = identity;

export const getOrd: <E, A>(O: TC.Ord<E>) => TC.Ord<Const<E, A>> = identity;

export const getSemigroup: <E, A>(
  S: TC.Semigroup<E>,
) => TC.Semigroup<Const<E, A>> = identity;

export const getMonoid: <E, A>(
  M: TC.Monoid<E>,
) => TC.Monoid<Const<E, A>> = identity;

export const getApply = <E>(
  S: TC.Semigroup<E>,
): TC.Apply<URI, [E]> => ({
  map: (_) => (ta) => ta,
  // deno-lint-ignore no-explicit-any
  ap: (tfai) => (ta): Const<any, any> => make(S.concat(tfai)(ta)),
});

export const getApplicative = <E>(
  M: TC.Monoid<E>,
): TC.Applicative<URI, [E]> => ({
  // deno-lint-ignore no-explicit-any
  of: (): Const<any, any> => make(M.empty()),
  ...getApply(M),
});

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (_) => (ta) => ta,
};

export const Contravariant: TC.Contravariant<URI> = {
  contramap: (_) => (tb) => tb,
};

export const Bifunctor: TC.Bifunctor<URI> = {
  bimap: (fab, _) => (tac) => make(fab(tac)),
  mapLeft: (fef) => Bifunctor.bimap(fef, identity),
};
