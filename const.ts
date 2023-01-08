import type { Applicative } from "./applicative.ts";
import type { Apply } from "./apply.ts";
import type { Bifunctor } from "./bifunctor.ts";
import type { Contravariant } from "./contravariant.ts";
import type { Functor } from "./functor.ts";
import type { Kind, Out } from "./kind.ts";
import type { Monoid } from "./monoid.ts";
import type { Ord } from "./ord.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Eq } from "./eq.ts";
import type { Show } from "./show.ts";

import { identity } from "./fn.ts";

export type Const<E, _ = never> = E;

export interface KindConst extends Kind {
  readonly kind: Const<Out<this, 1>, Out<this, 0>>;
}

export interface KindRightConst<B> extends Kind {
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

export const getEq: <E, A>(
  E: Eq<E>,
) => Eq<Const<E, A>> = identity;

export const getOrd: <E, A>(O: Ord<E>) => Ord<Const<E, A>> = identity;

export const getSemigroup: <E, A>(
  S: Semigroup<E>,
) => Semigroup<Const<E, A>> = identity;

export const getMonoid: <E, A>(
  M: Monoid<E>,
) => Monoid<Const<E, A>> = identity;

export const getApply = <E>(
  S: Semigroup<E>,
): Apply<KindRightConst<E>> => ({
  map: (_) => (ta) => ta,
  ap: (tfai) => (ta) => make(S.concat(ta)(tfai)),
});

export const getApplicative = <E>(
  M: Monoid<E>,
): Applicative<KindRightConst<E>> => ({
  of: () => make(M.empty()),
  ...getApply(M),
});

export const FunctorConst: Functor<KindConst> = { map };

export const ContravariantConst: Contravariant<KindConst> = { contramap };

export const BifunctorConst: Bifunctor<KindConst> = { bimap, mapLeft };
