import type { InOut, Kind, Out } from "./kind.ts";
import type { Monad } from "./monad.ts";

import { traverse } from "./array.ts";
import { flow, identity, pipe } from "./fn.ts";

export type State<E, A> = (e: E) => [A, E];

export interface URI extends Kind {
  readonly kind: State<InOut<this, 1>, Out<this, 0>>;
}

export interface RightURI<E> extends Kind {
  readonly kind: State<E, Out<this, 0>>;
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

export function state<S, A>(a: A, s: S): State<S, A> {
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

export function ap<E, A>(
  ua: State<E, A>,
): <I>(ufai: State<E, (a: A) => I>) => State<E, I> {
  return (ufai) => (s1) => {
    const [fai, s2] = ufai(s1);
    const [a, s3] = ua(s2);
    return [fai(a), s3];
  };
}

export function chain<A, M, I>(
  fati: (a: A) => State<M, I>,
): (ta: State<M, A>) => State<M, I> {
  return (ta) => flow(ta, ([a, s]) => fati(a)(s));
}

export function join<A, B>(tta: State<B, State<B, A>>): State<B, A> {
  return pipe(tta, chain(identity));
}

export function traverseArray<A, S, I>(
  fati: (a: A, i: number) => State<S, I>,
): (ta: ReadonlyArray<A>) => State<S, ReadonlyArray<I>> {
  return pipe(fati, traverse(MonadState));
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

export const MonadState: Monad<URI> = { of, ap, map, join, chain };
