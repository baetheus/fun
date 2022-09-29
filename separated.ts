/**
 * Separated represents two types held at the same
 * time. It's uses include being the result of the
 * partitioning or for creating a Bifunctor over
 * a type.
 */
import type { Bifunctor, Functor, Kind, Monad, Monoid, Out } from "./types.ts";

import { createMonad } from "./monad.ts";
import { pipe } from "./fns.ts";

/**
 * Separated is used when one wants to keep two types separate. A
 * simple example of this is
 */
export type Separated<B, A> = { readonly left: B; readonly right: A };

export interface URI extends Kind {
  readonly kind: Separated<Out<this, 1>, Out<this, 0>>;
}

export function separated<A, B>(left: B, right: A): Separated<B, A> {
  return { left, right };
}

export function swap<A, B>({ left, right }: Separated<B, A>): Separated<A, B> {
  return separated(right, left);
}

export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: Separated<B, A>) => Separated<B, I> {
  return ({ left, right }) => separated(left, fai(right));
}

export function mapLeft<B, J>(
  fbj: (a: B) => J,
): <A>(ta: Separated<B, A>) => Separated<J, A> {
  return ({ left, right }) => separated(fbj(left), right);
}

export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): (ta: Separated<B, A>) => Separated<J, I> {
  return ({ left, right }) => separated(fbj(left), fai(right));
}

export const FunctorSeparated: Functor<URI> = { map };

export const BifunctorSeparated: Bifunctor<URI> = { mapLeft, bimap };

export interface RightURI<B> extends Kind {
  readonly kind: Separated<B, Out<this, 0>>;
}

export function getRightMonad<L>(S: Monoid<L>): Monad<RightURI<L>> {
  return createMonad<RightURI<L>>({
    of: (a) => separated(S.empty(), a),
    chain: (fati) => (ta) => pipe(fati(ta.right), mapLeft(S.concat(ta.left))),
  });
}
