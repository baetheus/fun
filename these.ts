import type { $, Kind, Out } from "./kind.ts";
import type { Applicative } from "./applicative.ts";
import type { Bifunctor } from "./bifunctor.ts";
import type { Foldable } from "./foldable.ts";
import type { Functor } from "./functor.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Show } from "./show.ts";
import type { Traversable } from "./traversable.ts";

import * as E from "./either.ts";
import { id, pipe } from "./fn.ts";

export type Left<B> = E.Left<B>;

export type Right<A> = E.Right<A>;

export type Both<B, A> = { tag: "Both"; left: B; right: A };

export type These<B, A> = Left<B> | Right<A> | Both<B, A>;

export interface URI extends Kind {
  readonly kind: These<Out<this, 1>, Out<this, 0>>;
}

export function left<A = never, B = never>(left: B): These<B, A> {
  return ({ tag: "Left", left });
}

export function right<A = never, B = never>(right: A): These<B, A> {
  return ({ tag: "Right", right });
}

export function both<A, B>(left: B, right: A): These<B, A> {
  return ({ tag: "Both", left, right });
}

export function match<A, B, O>(
  onLeft: (b: B) => O,
  onRight: (a: A) => O,
  onBoth: (b: B, a: A) => O,
): (ta: These<B, A>) => O {
  const _fold = E.match(onLeft, onRight);
  return (ta) => ta.tag === "Both" ? onBoth(ta.left, ta.right) : _fold(ta);
}

export function isLeft<A, B>(ta: These<B, A>): ta is Left<B> {
  return ta.tag === "Left";
}

export function isRight<A, B>(ta: These<B, A>): ta is Right<A> {
  return ta.tag === "Right";
}

export function isBoth<A, B>(ta: These<B, A>): ta is Both<B, A> {
  return ta.tag === "Both";
}

export function of<A, B = never>(a: A): These<B, A> {
  return right(a);
}

export function throwError<A = never, B = never>(b: B): These<B, A> {
  return left(b);
}

export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): (ta: These<B, A>) => These<J, I> {
  return (ta) =>
    isLeft(ta)
      ? left(fbj(ta.left))
      : isRight(ta)
      ? right(fai(ta.right))
      : both(fbj(ta.left), fai(ta.right));
}

export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: These<B, A>) => These<B, I> {
  return bimap(id(), fai);
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A>(ta: These<B, A>) => These<J, A> {
  return bimap(fbj, id());
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): <B>(ta: These<B, A>) => O {
  return (ta) => isLeft(ta) ? o : foao(o, ta.right);
}

export function traverse<U extends Kind>(
  A: Applicative<U>,
): <A, I, J, K, L, M>(
  favi: (a: A) => $<U, [I, J, K], [L], [M]>,
) => <B>(ta: These<B, A>) => $<U, [These<B, I>, J, K], [L], [M]> {
  return (favi) =>
    match(
      (b) => A.of(left(b)),
      (a) => pipe(favi(a), A.map((i) => right(i))),
      (b, a) => pipe(favi(a), A.map((i) => both(b, i))),
    );
}

export const BifunctorThese: Bifunctor<URI> = { bimap, mapLeft };

export const FunctorThese: Functor<URI> = { map };

export const FoldableThese: Foldable<URI> = { reduce };

export const TraversableThese: Traversable<URI> = { map, reduce, traverse };

export function getShow<A, B>(
  SB: Show<B>,
  SA: Show<A>,
): Show<These<B, A>> {
  return ({
    show: match(
      (left) => `Left(${SB.show(left)})`,
      (right) => `Right(${SA.show(right)})`,
      (left, right) => `Both(${SB.show(left)}, ${SA.show(right)})`,
    ),
  });
}

export function getSemigroup<A, B>(
  SB: Semigroup<B>,
  SA: Semigroup<A>,
): Semigroup<These<B, A>> {
  return ({
    concat: (x) => (y) => {
      if (isLeft(x)) {
        if (isLeft(y)) {
          return left(SB.concat(x.left)(y.left));
        } else if (isRight(y)) {
          return both(x.left, y.right);
        }
        return both(SB.concat(x.left)(y.left), y.right);
      }

      if (isRight(x)) {
        if (isLeft(y)) {
          return both(y.left, x.right);
        } else if (isRight(y)) {
          return right(SA.concat(x.right)(y.right));
        }
        return both(y.left, SA.concat(x.right)(y.right));
      }

      if (isLeft(y)) {
        return both(SB.concat(x.left)(y.left), x.right);
      } else if (isRight(y)) {
        return both(x.left, SA.concat(x.right)(y.right));
      }
      return both(SB.concat(x.left)(y.left), SA.concat(x.right)(y.right));
    },
  });
}
