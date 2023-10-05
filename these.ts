import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Combinable } from "./combinable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Mappable } from "./mappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Showable } from "./showable.ts";
import type { Traversable } from "./traversable.ts";

import * as E from "./either.ts";
import { pipe } from "./fn.ts";

export type Left<B> = E.Left<B>;

export type Right<A> = E.Right<A>;

export type Both<B, A> = { tag: "Both"; left: B; right: A };

export type These<B, A> = Left<B> | Right<A> | Both<B, A>;

export interface KindThese extends Kind {
  readonly kind: These<Out<this, 1>, Out<this, 0>>;
}

export interface KindRightThese<E> extends Kind {
  readonly kind: These<E, Out<this, 0>>;
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

export function wrap<A, B = never>(a: A): These<B, A> {
  return right(a);
}

export function fail<A = never, B = never>(b: B): These<B, A> {
  return left(b);
}

export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: These<B, A>) => These<B, I> {
  return match(
    left,
    (value) => right(fai(value)),
    (left, right) => both(left, fai(right)),
  );
}

export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A>(ta: These<B, A>) => These<J, A> {
  return match(
    (value) => left(fbj(value)),
    right,
    (left, right) => both(fbj(left), right),
  );
}

export function fold<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): <B>(ta: These<B, A>) => O {
  return (ta) => isLeft(ta) ? o : foao(o, ta.right);
}

export function traverse<U extends Kind>(
  A: Applicable<U>,
): <A, I, J, K, L, M>(
  favi: (a: A) => $<U, [I, J, K], [L], [M]>,
) => <B>(ta: These<B, A>) => $<U, [These<B, I>, J, K], [L], [M]> {
  return (favi) =>
    match(
      (b) => A.wrap(left(b)),
      (a) => pipe(favi(a), A.map((i) => right(i))),
      (b, a) => pipe(favi(a), A.map((i) => both(b, i))),
    );
}

export const BimappableThese: Bimappable<KindThese> = { map, mapSecond };

export const MappableThese: Mappable<KindThese> = { map };

export const FoldableThese: Foldable<KindThese> = { fold };

export const TraversableThese: Traversable<KindThese> = {
  map,
  fold,
  traverse,
};

export function getShowable<A, B>(
  SB: Showable<B>,
  SA: Showable<A>,
): Showable<These<B, A>> {
  return ({
    show: match(
      (left) => `Left(${SB.show(left)})`,
      (right) => `Right(${SA.show(right)})`,
      (left, right) => `Both(${SB.show(left)}, ${SA.show(right)})`,
    ),
  });
}

export function getCombinable<A, B>(
  SB: Combinable<B>,
  SA: Combinable<A>,
): Combinable<These<B, A>> {
  return ({
    combine: (x) => (y) => {
      if (isLeft(x)) {
        if (isLeft(y)) {
          return left(SB.combine(x.left)(y.left));
        } else if (isRight(y)) {
          return both(x.left, y.right);
        }
        return both(SB.combine(x.left)(y.left), y.right);
      }

      if (isRight(x)) {
        if (isLeft(y)) {
          return both(y.left, x.right);
        } else if (isRight(y)) {
          return right(SA.combine(x.right)(y.right));
        }
        return both(y.left, SA.combine(x.right)(y.right));
      }

      if (isLeft(y)) {
        return both(SB.combine(x.left)(y.left), x.right);
      } else if (isRight(y)) {
        return both(x.left, SA.combine(x.right)(y.right));
      }
      return both(SB.combine(x.left)(y.left), SA.combine(x.right)(y.right));
    },
  });
}

export function getRightFlatmappable<B>(
  { combine }: Combinable<B>,
): Flatmappable<KindRightThese<B>> {
  const Flatmappable: Flatmappable<KindRightThese<B>> = {
    wrap,
    map,
    apply: (ua) => (ufai) => {
      if (isRight(ua)) {
        if (isRight(ufai)) {
          return right(ufai.right(ua.right));
        } else if (isLeft(ufai)) {
          return ufai;
        } else {
          return both(ufai.left, ufai.right(ua.right));
        }
      } else if (isLeft(ua)) {
        if (isRight(ufai)) {
          return ua;
        } else {
          return left(combine(ua.left)(ufai.left));
        }
      } else {
        if (isRight(ufai)) {
          return both(ua.left, ufai.right(ua.right));
        } else if (isLeft(ufai)) {
          return left(combine(ua.left)(ufai.left));
        } else {
          return both(combine(ua.left)(ufai.left), ufai.right(ua.right));
        }
      }
    },
    flatmap: (faui) => (ua) => {
      if (isLeft(ua)) {
        return ua;
      } else if (isRight(ua)) {
        return faui(ua.right);
      } else {
        const result = faui(ua.right);
        if (isLeft(result)) {
          return left(combine(result.left)(ua.left));
        } else if (isRight(result)) {
          return both(ua.left, result.right);
        } else {
          return both(combine(result.left)(ua.left), result.right);
        }
      }
    },
  };
  return Flatmappable;
}
