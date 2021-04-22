import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import * as E from "./either.ts";
import { flow, identity, pipe } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Left<L> = E.Left<L>;

export type Right<R> = E.Right<R>;

export type Both<L, R> = { tag: "Both"; left: L; right: R };

export type These<L, R> = E.Either<L, R> | Both<L, R>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "These";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: These<_[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const left = E.left;

export const right = E.right;

export const both = <L, R>(left: L, right: R): Both<L, R> => ({
  tag: "Both",
  left,
  right,
});

/*******************************************************************************
 * Destructors
 ******************************************************************************/

export const fold = <E, A, B>(
  onLeft: (e: E) => B,
  onRight: (a: A) => B,
  onBoth: (e: E, a: A) => B,
) =>
  (fa: These<E, A>) => {
    switch (fa.tag) {
      case "Left":
        return onLeft(fa.left);
      case "Right":
        return onRight(fa.right);
      case "Both":
        return onBoth(fa.left, fa.right);
    }
  };

/*******************************************************************************
 * Guards
 ******************************************************************************/

export const isLeft = <L, R>(m: These<L, R>): m is E.Left<L> =>
  m.tag === "Left";

export const isRight = <L, R>(m: These<L, R>): m is E.Right<R> =>
  m.tag === "Right";

export const isBoth = <L, R>(m: These<L, R>): m is Both<L, R> =>
  m.tag === "Both";

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getShow = <E, A>(
  SE: TC.Show<E>,
  SA: TC.Show<A>,
): TC.Show<These<E, A>> => ({
  show: fold(
    (left) => `Left(${SE.show(left)})`,
    (right) => `Right(${SA.show(right)})`,
    (left, right) => `Both(${SE.show(left)}, ${SA.show(right)})`,
  ),
});

export const getSemigroup = <E, A>(
  SE: TC.Semigroup<E>,
  SA: TC.Semigroup<A>,
): TC.Semigroup<These<E, A>> => ({
  concat: (x) =>
    (y) => {
      if (isLeft(x)) {
        if (isLeft(y)) {
          return left(SE.concat(x.left)(y.left));
        } else if (isRight(y)) {
          return both(x.left, y.right);
        }
        return both(SE.concat(x.left)(y.left), y.right);
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
        return both(SE.concat(x.left)(y.left), x.right);
      } else if (isRight(y)) {
        return both(x.left, SA.concat(x.right)(y.right));
      }
      return both(SE.concat(x.left)(y.left), SA.concat(x.right)(y.right));
    },
});

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) =>
    (ta) =>
      isLeft(ta)
        ? ta
        : isRight(ta)
        ? right(fab(ta.right))
        : both(ta.left, fab(ta.right)),
};

export const Bifunctor: TC.Bifunctor<URI> = {
  bimap: (fab, fcd) =>
    (tac) =>
      isLeft(tac)
        ? left(fab(tac.left))
        : isRight(tac)
        ? right(fcd(tac.right))
        : both(fab(tac.left), fcd(tac.right)),
  mapLeft: (fef) => (ta) => pipe(ta, Bifunctor.bimap(fef, identity)),
};

export const Foldable: TC.Foldable<URI> = {
  reduce: (faba, a) =>
    (tb) =>
      isLeft(tb) ? a : isRight(tb) ? faba(a, tb.right) : faba(a, tb.right),
};

export const Traversable: TC.Traversable<URI> = {
  reduce: Foldable.reduce,
  map: Functor.map,
  traverse: (A) =>
    (faub) =>
      fold(
        flow(left, A.of),
        flow(faub, A.map((b) => right(b))),
        // deno-lint-ignore no-explicit-any
        (l, r) => pipe(r, faub, A.map((b) => both(l, b))) as any,
      ),
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { bimap, mapLeft } = Bifunctor;

export const { map, reduce, traverse } = Traversable;
