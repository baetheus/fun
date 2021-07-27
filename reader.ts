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

export function make<A>(a: A): Reader<A, A> {
  return constant(a);
}

export function ask<A>(): Reader<A, A> {
  return identity;
}

export function asks<A, I>(fai: (a: A) => I): Reader<A, I> {
  return fai;
}

/*******************************************************************************
 * Functions
 ******************************************************************************/

export function of<A, B = never>(a: A): Reader<B, A> {
  return () => a;
}

export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: Reader<B, A>) => Reader<B, I> {
  return (ta) => flow(ta, fai);
}

export function ap<A, I, B>(
  tfai: Reader<B, (a: A) => I>,
): (ta: Reader<B, A>) => Reader<B, I> {
  return (ta) => (b) => pipe(ta(b), tfai(b));
}

export function chain<A, I, B>(
  fati: (a: A) => Reader<B, I>,
): (ta: Reader<B, A>) => Reader<B, I> {
  return (ta) => (b) => fati(ta(b))(b);
}

export function join<A, B>(tta: Reader<B, Reader<B, A>>): Reader<B, A> {
  return (b) => tta(b)(b);
}

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = { map };

export const Apply: TC.Apply<URI> = { ap, map };

export const Applicative: TC.Applicative<URI> = { of, ap, map };

export const Chain: TC.Chain<URI> = { ap, map, chain };

export const Monad: TC.Monad<URI> = { of, ap, map, join, chain };

/*******************************************************************************
 * Derived Functions
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
