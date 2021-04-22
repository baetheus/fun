import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import { call, identity } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

/*******************************************************************************
 * Identity<A>
 *
 * The identity type returns exactly the type that is passed into it.
 ******************************************************************************/
export type Identity<A> = A;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

/*******************************************************************************
 * The Kinds URI for Identity
 ******************************************************************************/
export const URI = "Identity";

/*******************************************************************************
 * The Kinds URI Type for Identity
 ******************************************************************************/
export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Identity<_[0]>;
  }
}

/*******************************************************************************
 * Modules
 ******************************************************************************/

/*******************************************************************************
 * The standard Functor instance for Identity
 ******************************************************************************/
export const Functor: TC.Functor<URI> = {
  map: identity,
};

/*******************************************************************************
 * The standard Apply instance for Identity
 ******************************************************************************/
export const Apply: TC.Apply<URI> = {
  ap: call,
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: identity,
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: identity,
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: identity,
  chain: Chain.chain,
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain } = Monad;
