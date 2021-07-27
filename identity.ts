import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Identity<A> = A;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/
export const URI = "Identity";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Identity<_[0]>;
  }
}

/*******************************************************************************
 * Functions
 ******************************************************************************/

export function of<A>(a: A): Identity<A> {
  return a;
}

export function map<A, I>(
  fai: (a: A) => I,
): ((ta: Identity<A>) => Identity<I>) {
  return fai;
}

export function ap<A, I>(
  tfai: Identity<(a: A) => I>,
): ((ta: Identity<A>) => Identity<I>) {
  return tfai;
}

export function join<A>(ta: Identity<Identity<A>>): Identity<A> {
  return ta;
}

export function chain<A, I>(
  fati: (a: A) => Identity<I>,
): ((ta: Identity<A>) => Identity<I>) {
  return fati;
}

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = { map };

export const Apply: TC.Apply<URI> = { ap, map };

export const Applicative: TC.Applicative<URI> = { of, ap, map };

export const Chain: TC.Chain<URI> = { ap, map, chain };

export const Monad: TC.Monad<URI> = { of, ap, map, join, chain };
