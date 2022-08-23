import type { Kind, URIS } from "./kind.ts";
import type * as T from "./types.ts";

import * as E from "./either.ts";
import { identity, pipe } from "./fns.ts";

export type Left<B> = E.Left<B>;

export type Right<A> = E.Right<A>;

export type Both<B, A> = { tag: "Both"; left: B; right: A };

export type These<B, A> = Left<B> | Right<A> | Both<B, A>;

export const URI = "These";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: These<_[1], _[0]>;
  }
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

export function fold<A, B, O>(
  onLeft: (b: B) => O,
  onRight: (a: A) => O,
  onBoth: (b: B, a: A) => O,
): (ta: These<B, A>) => O {
  const _fold = E.fold(onLeft, onRight);
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
  return bimap(identity, fai);
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A>(ta: These<B, A>) => These<J, A> {
  return bimap(fbj, identity);
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): <B>(ta: These<B, A>) => O {
  return (ta) => isLeft(ta) ? o : foao(o, ta.right);
}

export function traverse<VRI extends URIS>(
  A: T.Applicative<VRI>,
): <A, I, J, K, L>(
  favi: (a: A) => Kind<VRI, [I, J, K, L]>,
) => <B>(ta: These<B, A>) => Kind<VRI, [These<B, I>, J, K, L]> {
  return (favi) =>
    fold(
      (b) => A.of(left(b)),
      (a) => pipe(favi(a), A.map((i) => right(i))),
      (b, a) => pipe(favi(a), A.map((i) => both(b, i))),
    );
}

export const Bifunctor: T.Bifunctor<URI> = { bimap, mapLeft };

export const Functor: T.Functor<URI> = { map };

export const Foldable: T.Foldable<URI> = { reduce };

export const Traversable: T.Traversable<URI> = { map, reduce, traverse };

export function getShow<A, B>(
  SB: T.Show<B>,
  SA: T.Show<A>,
): T.Show<These<B, A>> {
  return ({
    show: fold(
      (left) => `Left(${SB.show(left)})`,
      (right) => `Right(${SA.show(right)})`,
      (left, right) => `Both(${SB.show(left)}, ${SA.show(right)})`,
    ),
  });
}

export function getSemigroup<A, B>(
  SB: T.Semigroup<B>,
  SA: T.Semigroup<A>,
): T.Semigroup<These<B, A>> {
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
