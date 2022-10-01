import type {
  Applicative,
  Apply,
  Bifunctor,
  Contravariant,
  Functor,
  Kind,
  Monoid,
  Ord,
  Out,
  Semigroup,
  Setoid,
  Show,
} from "./types.ts";

import { identity } from "./fns.ts";

export type Const<E, _ = never> = E;

export interface URI extends Kind {
  readonly kind: Const<Out<this, 1>, Out<this, 0>>;
}

export interface RightURI<B> extends Kind {
  readonly kind: Const<B, Out<this, 0>>;
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

export const getShow = <E, A>(S: Show<E>): Show<Const<E, A>> => ({
  show: (c) => `Const(${S.show(c)})`,
});

export const getSetoid: <E, A>(
  E: Setoid<E>,
) => Setoid<Const<E, A>> = identity;

export const getOrd: <E, A>(O: Ord<E>) => Ord<Const<E, A>> = identity;

export const getSemigroup: <E, A>(
  S: Semigroup<E>,
) => Semigroup<Const<E, A>> = identity;

export const getMonoid: <E, A>(
  M: Monoid<E>,
) => Monoid<Const<E, A>> = identity;

export const getApply = <E>(
  S: Semigroup<E>,
): Apply<RightURI<E>> => ({
  map: (_) => (ta) => ta,
  ap: (tfai) => (ta) => make(S.concat(ta)(tfai)),
});

export const getApplicative = <E>(
  M: Monoid<E>,
): Applicative<RightURI<E>> => ({
  of: () => make(M.empty()),
  ...getApply(M),
});

export const FunctorConst: Functor<URI> = { map };

export const ContravariantConst: Contravariant<URI> = { contramap };

export const BifunctorConst: Bifunctor<URI> = { bimap, mapLeft };
