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

export function make<E, A = never>(e: E): Const<E, A> {
  return e;
}

/*******************************************************************************
 * Functions
 ******************************************************************************/

export function map<A, I>(
  _fai: (a: A) => I,
): (<B = never>(ta: Const<B, A>) => Const<B, I>) {
  return identity;
}

export function contramap<A, I>(
  _fai: (a: A) => I,
): (<B = never>(ta: Const<B, I>) => Const<B, A>) {
  return identity;
}

export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  _fai: (a: A) => I,
): ((tab: Const<B, A>) => Const<J, I>) {
  return (tab) => make(fbj(tab));
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): (<A = never>(tab: Const<B, A>) => Const<J, A>) {
  return bimap(fbj, identity);
}

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
  ap: (tfai) => (ta): Const<any, any> => make(S.concat(ta)(tfai)),
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

export const Functor: TC.Functor<URI> = { map };

export const Contravariant: TC.Contravariant<URI> = { contramap };

export const Bifunctor: TC.Bifunctor<URI> = { bimap, mapLeft };
