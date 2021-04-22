import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";
import type { Fn, Lazy, Predicate, Refinement } from "./types.ts";

import * as O from "./option.ts";
import { constant, identity, isNotNil, pipe } from "./fns.ts";
import { createSequenceStruct, createSequenceTuple } from "./sequence.ts";
import { createDo } from "./derivations.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Left<L> = { tag: "Left"; left: L };

export type Right<R> = { tag: "Right"; right: R };

export type Either<L, R> = Left<L> | Right<R>;

/*******************************************************************************
 * Kind Registration
 ******************************************************************************/

export const URI = "Either";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Either<_[1], _[0]>;
  }
}

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const left = <E = never, A = never>(left: E): Either<E, A> => ({
  tag: "Left",
  left,
});

export const right = <E = never, A = never>(right: A): Either<E, A> => ({
  tag: "Right",
  right,
});

export const fromNullable = <E>(e: Lazy<E>) =>
  <A>(a: A): Either<E, NonNullable<A>> => (isNotNil(a) ? right(a) : left(e()));

export const tryCatch = <E, A>(
  f: Lazy<A>,
  onError: (e: unknown) => E,
): Either<E, A> => {
  try {
    return right(f());
  } catch (e) {
    return left(onError(e));
  }
};

export const tryCatchWrap = <E, A, AS extends unknown[]>(
  fn: Fn<AS, A>,
  onError: (e: unknown) => E,
): Fn<AS, Either<E, A>> =>
  (...as: AS) => {
    try {
      return right(fn(...as));
    } catch (e) {
      return left(onError(e));
    }
  };

export const fromPredicate: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (
    a: A,
  ) => Either<E, B>;
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A>;
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) =>
  (a: A) => predicate(a) ? right(a) : left(onFalse(a));

/*******************************************************************************
 * Destructors
 ******************************************************************************/

export const fold = <L, R, B>(
  onLeft: (left: L) => B,
  onRight: (right: R) => B,
) => (ma: Either<L, R>): B => isLeft(ma) ? onLeft(ma.left) : onRight(ma.right);

export const getOrElse = <E, A>(onLeft: (e: E) => A) =>
  (ma: Either<E, A>): A => isLeft(ma) ? onLeft(ma.left) : ma.right;

export const getRight = <E, A>(ma: Either<E, A>): O.Option<A> =>
  pipe(ma, fold(O.constNone, O.some));

export const getLeft = <E, A>(ma: Either<E, A>): O.Option<E> =>
  pipe(ma, fold(O.some, O.constNone));

/*******************************************************************************
 * Guards
 ******************************************************************************/

export const isLeft = <L, R>(m: Either<L, R>): m is Left<L> => m.tag === "Left";

export const isRight = <L, R>(m: Either<L, R>): m is Right<R> =>
  m.tag === "Right";

/*******************************************************************************
 * Combinators
 ******************************************************************************/

export const swap = <E, A>(ma: Either<E, A>): Either<A, E> =>
  isLeft(ma) ? right(ma.left) : left(ma.right);

export const stringifyJSON = <E>(
  u: unknown,
  onError: (reason: unknown) => E,
): Either<E, string> => tryCatch(() => JSON.stringify(u), onError);

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getShow = <E, A>(
  SE: TC.Show<E>,
  SA: TC.Show<A>,
): TC.Show<Either<E, A>> => ({
  show: fold(
    (left) => `Left(${SE.show(left)})`,
    (right) => `Right(${SA.show(right)})`,
  ),
});

export const getSetoid = <E, A>(
  SE: TC.Setoid<E>,
  SA: TC.Setoid<A>,
): TC.Setoid<Either<E, A>> => ({
  equals: (x) =>
    (y) => {
      if (isLeft(x)) {
        if (isLeft(y)) {
          return SE.equals(x.left)(y.left);
        }
        return false;
      }

      if (isLeft(y)) {
        return false;
      }
      return SA.equals(x.right)(y.right);
    },
});

export const getOrd = <E, A>(
  OE: TC.Ord<E>,
  OA: TC.Ord<A>,
): TC.Ord<Either<E, A>> => ({
  ...getSetoid(OE, OA),
  lte: (x) => {
    if (isLeft(x)) {
      return fold(OE.lte(x.left), constant(true));
    }
    return fold(constant(false), OA.lte(x.right));
  },
});

export const getLeftSemigroup = <E = never, A = never>(
  SE: TC.Semigroup<E>,
): TC.Semigroup<Either<E, A>> => ({
  concat: (x) =>
    (y) => isRight(x) ? x : isRight(y) ? y : left(SE.concat(x.left)(y.left)),
});

export const getRightSemigroup = <E = never, A = never>(
  SA: TC.Semigroup<A>,
): TC.Semigroup<Either<E, A>> => ({
  concat: (x) =>
    (y) => isLeft(x) ? x : isLeft(y) ? y : right(SA.concat(x.right)(y.right)),
});

export const getRightMonoid = <E = never, A = never>(
  MA: TC.Monoid<A>,
): TC.Monoid<Either<E, A>> => ({
  ...getRightSemigroup(MA),
  empty: () => right(MA.empty()),
});

export const getRightMonad = <E>(
  { concat }: TC.Semigroup<E>,
): TC.Monad<URI, [E]> => ({
  ...Monad,
  ap: (tfai) =>
    // deno-lint-ignore no-explicit-any
    (ta): Either<any, any> =>
      isLeft(tfai)
        ? (isLeft(ta) ? left(concat(tfai.left)(ta.left)) : tfai)
        : (isLeft(ta) ? ta : right(tfai.right(ta.right))),
});

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fai) => (ta) => isLeft(ta) ? ta : right(fai(ta.right)),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfai) =>
    (ta) => isLeft(ta) ? ta : isLeft(tfai) ? tfai : right(tfai.right(ta.right)),
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: right,
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: (fati) => (ta) => (isRight(ta) ? fati(ta.right) : ta),
};

export const Monad: TC.Monad<URI> = {
  of: Applicative.of,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

export const MonadThrow: TC.MonadThrow<URI> = ({
  ...Monad,
  throwError: left,
});

export const Bifunctor: TC.Bifunctor<URI> = {
  bimap: (fbj, fai) =>
    (ta) => isLeft(ta) ? left(fbj(ta.left)) : right(fai(ta.right)),
  mapLeft: (fbj) => (ta) => isLeft(ta) ? left(fbj(ta.left)) : ta,
};

export const Alt: TC.Alt<URI> = {
  map: Functor.map,
  alt: (tb) => (ta) => isLeft(ta) ? tb : ta,
};

export const Extend: TC.Extend<URI> = {
  map: Functor.map,
  extend: (ftab) => (ta) => right(ftab(ta)),
};

export const Foldable: TC.Foldable<URI> = {
  reduce: (fovo, v) => (tb) => (isRight(tb) ? fovo(v, tb.right) : v),
};

export const Traversable: TC.Traversable<URI> = {
  map: Functor.map,
  reduce: Foldable.reduce,
  traverse: (A) =>
    (fasi) =>
      (ta) => {
        if (isRight(ta)) {
          return pipe(
            fasi(ta.right),
            // deno-lint-ignore no-explicit-any
            A.map((i) => right<any, any>(i)),
          );
        }
        // deno-lint-ignore no-explicit-any
        return A.of(ta as Either<any, any>);
      },
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain, throwError } = MonadThrow;

export const { reduce, traverse } = Traversable;

export const { bimap, mapLeft } = Bifunctor;

export const { extend } = Extend;

export const { alt } = Alt;

export const chainLeft = <E, A, J>(fej: (e: E) => Either<J, A>) =>
  (ma: Either<E, A>): Either<J, A> => (isLeft(ma) ? fej(ma.left) : ma);

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);

export const { Do, bind, bindTo } = createDo(Monad);

export const widen: <F>() => <E, A>(ta: Either<E, A>) => Either<E | F, A> =
  constant(identity);
