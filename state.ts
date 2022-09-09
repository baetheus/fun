import type { Kind } from "./kind.ts";
import type * as T from "./types.ts";

import { traverse } from "./array.ts";
import { flow, identity, pipe } from "./fns.ts";
import { createSequenceStruct, createSequenceTuple } from "./apply.ts";

export type State<S, A> = (s: S) => [A, S];

export const URI = "State";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: State<_[1], _[0]>;
  }
}

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

export function traverseArray<A, S, I>(
  fati: (a: A, i: number) => State<S, I>,
): (ta: ReadonlyArray<A>) => State<S, ReadonlyArray<I>> {
  return pipe(fati, traverse(Applicative));
}

export function sequenceArray<A, B>(
  ta: ReadonlyArray<State<B, A>>,
): State<B, ReadonlyArray<A>> {
  return pipe(ta, traverseArray(identity));
}

export function evaluate<S>(s: S): <A>(ta: State<S, A>) => A {
  return (ta) => ta(s)[0];
}

export function execute<S>(s: S): <A>(ta: State<S, A>) => S {
  return (ta) => ta(s)[1];
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Applicative: T.Applicative<URI> = { of, ap, map };

export const Chain: T.Chain<URI> = { ap, map, chain };

export const Monad: T.Monad<URI> = { of, ap, map, join, chain };

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);
