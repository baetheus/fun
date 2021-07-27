import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import { createDo } from "./derivations.ts";
import { flow, identity, pipe } from "./fns.ts";

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

export function get<S>(): State<S, S> {
  return (s: S) => [s, s];
}

export function gets<S, A>(fsa: (s: S) => A): State<S, A> {
  return (s: S) => [fsa(s), s];
}

export function put<S>(s: S): State<S, void> {
  return () => [undefined, s];
}

export function modify<S>(fss: (s: S) => S): State<S, void> {
  return (s: S) => [undefined, fss(s)];
}

export function make<S, A>(a: A, s: S): State<S, A> {
  return () => [a, s];
}

/*******************************************************************************
 * Functions
 ******************************************************************************/

export function of<A, B = never>(a: A): State<B, A> {
  return (b) => [a, b];
}

export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: State<B, A>) => State<B, I> {
  return (ta) => flow(ta, ([a, b]) => [fai(a), b]);
}

export function ap<A, I, B>(
  tfai: State<B, (a: A) => I>,
): (ta: State<B, A>) => State<B, I> {
  return (ta) =>
    (s1) => {
      const [fai, s2] = tfai(s1);
      const [a, s3] = ta(s2);
      return [fai(a), s3];
    };
}

export function chain<A, I, B>(
  fati: (a: A) => State<B, I>,
): (ta: State<B, A>) => State<B, I> {
  return (ta) => flow(ta, ([a, s]) => fati(a)(s));
}

export function join<A, B>(tta: State<B, State<B, A>>): State<B, A> {
  return pipe(tta, chain(identity));
}

export function evaluate<S>(s: S): <A>(ta: State<S, A>) => A {
  return (ta) => ta(s)[0];
}

export function execute<S>(s: S): <A>(ta: State<S, A>) => S {
  return (ta) => ta(s)[1];
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
