import type { Kind } from "./kind.ts";
import type * as T from "./types.ts";

import { identity } from "./fns.ts";

export type Const<E, _ = never> = E;

export const URI = "Const";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Const<_[1], _[0]>;
  }
}

export function make<E, A = never>(e: E): Const<E, A> {
  return e;
}

export function map<A, I>(
  _fai: (a: A) => I,
): <B = never>(ta: Const<B, A>) => Const<B, I> {
  return identity;
}

export function contramap<A, I>(
  _fai: (a: A) => I,
): <B = never>(ta: Const<B, I>) => Const<B, A> {
  return identity;
}

export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  _fai: (a: A) => I,
): (tab: Const<B, A>) => Const<J, I> {
  return (tab) => make(fbj(tab));
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A = never>(tab: Const<B, A>) => Const<J, A> {
  return bimap(fbj, identity);
}

export const getShow = <E, A>(S: T.Show<E>): T.Show<Const<E, A>> => ({
  show: (c) => `Const(${S.show(c)})`,
});

export const getSetoid: <E, A>(
  E: T.Setoid<E>,
) => T.Setoid<Const<E, A>> = identity;

export const getOrd: <E, A>(O: T.Ord<E>) => T.Ord<Const<E, A>> = identity;

export const getSemigroup: <E, A>(
  S: T.Semigroup<E>,
) => T.Semigroup<Const<E, A>> = identity;

export const getMonoid: <E, A>(
  M: T.Monoid<E>,
) => T.Monoid<Const<E, A>> = identity;

export const getApply = <E>(
  S: T.Semigroup<E>,
): T.Apply<URI, [E]> => ({
  map: (_) => (ta) => ta,
  // deno-lint-ignore no-explicit-any
  ap: (tfai) => (ta): Const<any, any> => make(S.concat(ta)(tfai)),
});

export const getApplicative = <E>(
  M: T.Monoid<E>,
): T.Applicative<URI, [E]> => ({
  // deno-lint-ignore no-explicit-any
  of: (): Const<any, any> => make(M.empty()),
  ...getApply(M),
});

export const Functor: T.Functor<URI> = { map };

export const Contravariant: T.Contravariant<URI> = { contramap };

export const Bifunctor: T.Bifunctor<URI> = { bimap, mapLeft };
