import type { Kind } from "./kind.ts";
import type * as T from "./types.ts";

/**
 * Separated
 *
 * A type used during partitioning
 */
export type Separated<B, A> = { readonly left: B; readonly right: A };

export interface URI extends Kind {
  readonly type: Separated<this[1], this[0]>;
}

export function separated<A, B>(left: B, right: A): Separated<B, A> {
  return { left, right };
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

export const Functor: T.Functor<URI> = { map };

export const Bifunctor: T.Bifunctor<URI> = { mapLeft, bimap };
