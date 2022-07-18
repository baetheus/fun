import type { Kind, URIS } from "./kind.ts";
import type * as T from "./types.ts";
import type { Fn, Predicate, Refinement } from "./types.ts";

import * as O from "./option.ts";
import { flow, identity, isNotNil, pipe } from "./fns.ts";
import { createSequenceStruct, createSequenceTuple } from "./apply.ts";
import { createDo } from "./derivations.ts";

export type Left<L> = { tag: "Left"; left: L };

export type Right<R> = { tag: "Right"; right: R };

export type Either<L, R> = Left<L> | Right<R>;

export const URI = "Either";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Either<_[1], _[0]>;
  }
}

export function left<E = never, A = never>(left: E): Either<E, A> {
  return ({
    tag: "Left",
    left,
  });
}

export function right<E = never, A = never>(right: A): Either<E, A> {
  return ({
    tag: "Right",
    right,
  });
}

export function of<A = never, B = never>(a: A): Either<B, A> {
  return right(a);
}

export function throwError<A = never, B = never>(b: B): Either<B, A> {
  return left(b);
}

export function fromNullable<E>(fe: () => E) {
  return <A>(
    a: A,
  ): Either<E, NonNullable<A>> => (isNotNil(a) ? right(a) : left(fe()));
}

export function tryCatch<E, A>(
  fa: () => A,
  onError: (e: unknown) => E,
): Either<E, A> {
  try {
    return right(fa());
  } catch (e) {
    return left(onError(e));
  }
}

export function tryCatchWrap<E, A, AS extends unknown[]>(
  fn: Fn<AS, A>,
  onError: (e: unknown) => E,
): Fn<AS, Either<E, A>> {
  return (...as: AS) => {
    try {
      return right(fn(...as));
    } catch (e) {
      return left(onError(e));
    }
  };
}

export function fromPredicate<E, A, B extends A>(
  refinement: Refinement<A, B>,
  onFalse: (a: A) => E,
): (a: A) => Either<E, B>;
export function fromPredicate<E, A>(
  predicate: Predicate<A>,
  onFalse: (a: A) => E,
): (a: A) => Either<E, A> {
  return (a: A) => predicate(a) ? right(a) : left(onFalse(a));
}

export function fold<L, R, B>(
  onLeft: (left: L) => B,
  onRight: (right: R) => B,
): (ta: Either<L, R>) => B {
  return (ta) => isLeft(ta) ? onLeft(ta.left) : onRight(ta.right);
}

export function getOrElse<E, A>(onLeft: (e: E) => A) {
  return (ma: Either<E, A>): A => isLeft(ma) ? onLeft(ma.left) : ma.right;
}

export function getRight<E, A>(ma: Either<E, A>): O.Option<A> {
  return pipe(ma, fold(O.constNone, O.some));
}

export function getLeft<E, A>(ma: Either<E, A>): O.Option<E> {
  return pipe(ma, fold(O.some, O.constNone));
}

export function isLeft<L, R>(m: Either<L, R>): m is Left<L> {
  return m.tag === "Left";
}

export function isRight<L, R>(m: Either<L, R>): m is Right<R> {
  return m.tag === "Right";
}

export function getShow<A, B>(
  SB: T.Show<B>,
  SA: T.Show<A>,
): T.Show<Either<B, A>> {
  return ({
    show: fold(
      (left) => `Left(${SB.show(left)})`,
      (right) => `Right(${SA.show(right)})`,
    ),
  });
}

export function getSetoid<A, B>(
  SB: T.Setoid<B>,
  SA: T.Setoid<A>,
): T.Setoid<Either<B, A>> {
  return ({
    equals: (b) =>
      (a) => {
        if (isLeft(a)) {
          if (isLeft(b)) {
            return SB.equals(b.left)(a.left);
          }
          return false;
        }

        if (isLeft(b)) {
          return false;
        }
        return SA.equals(b.right)(a.right);
      },
  });
}

export function getOrd<A, B>(
  OB: T.Ord<B>,
  OA: T.Ord<A>,
): T.Ord<Either<B, A>> {
  return ({
    ...getSetoid(OB, OA),
    lte: (b) =>
      (a) => {
        if (isLeft(a)) {
          if (isLeft(b)) {
            return OB.lte(b.left)(a.left);
          }
          return true;
        }

        if (isLeft(b)) {
          return false;
        }
        return OA.lte(b.right)(a.right);
      },
  });
}

export function getLeftSemigroup<E = never, A = never>(
  SE: T.Semigroup<E>,
): T.Semigroup<Either<E, A>> {
  return ({
    concat: (x) =>
      (y) => isRight(x) ? x : isRight(y) ? y : left(SE.concat(x.left)(y.left)),
  });
}

export function getRightSemigroup<E = never, A = never>(
  SA: T.Semigroup<A>,
): T.Semigroup<Either<E, A>> {
  return ({
    concat: (x) =>
      (y) => isLeft(x) ? x : isLeft(y) ? y : right(SA.concat(x.right)(y.right)),
  });
}

export function getRightMonoid<E = never, A = never>(
  MA: T.Monoid<A>,
): T.Monoid<Either<E, A>> {
  return ({
    ...getRightSemigroup(MA),
    empty: () => right(MA.empty()),
  });
}

export function getRightMonad<E>(
  { concat }: T.Semigroup<E>,
): T.Monad<URI, [E]> {
  return ({
    ...Monad,
    ap: (tfai) =>
      // deno-lint-ignore no-explicit-any
      (ta): Either<any, any> =>
        isLeft(tfai)
          ? (isLeft(ta) ? left(concat(tfai.left)(ta.left)) : tfai)
          : (isLeft(ta) ? ta : right(tfai.right(ta.right))),
  });
}

export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): (ta: Either<B, A>) => Either<J, I> {
  return (ta) => isLeft(ta) ? left(fbj(ta.left)) : right(fai(ta.right));
}

export function swap<E, A>(ma: Either<E, A>): Either<A, E> {
  return isLeft(ma) ? right(ma.left) : left(ma.right);
}

export function stringifyJSON<E>(
  u: unknown,
  onError: (reason: unknown) => E,
): Either<E, string> {
  return tryCatch(() => JSON.stringify(u), onError);
}

export function widen<F>(): <E, A>(ta: Either<E, A>) => Either<E | F, A> {
  return identity;
}

export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: Either<B, A>) => Either<B, I> {
  return (ta) => isLeft(ta) ? ta : right(fai(ta.right));
}

export function chainLeft<E, A, J>(fej: (e: E) => Either<J, A>) {
  return (ma: Either<E, A>): Either<J, A> => (isLeft(ma) ? fej(ma.left) : ma);
}

export function ap<A, I, B>(
  tfai: Either<B, (a: A) => I>,
): (ta: Either<B, A>) => Either<B, I> {
  return (ta) =>
    isLeft(ta) ? ta : isLeft(tfai) ? tfai : right(tfai.right(ta.right));
}

export function chain<A, I, B>(
  fati: (a: A) => Either<B, I>,
): (ta: Either<B, A>) => Either<B, I> {
  return (ta) => isLeft(ta) ? ta : fati(ta.right);
}

export function join<A, B>(ta: Either<B, Either<B, A>>): Either<B, A> {
  return isLeft(ta) ? ta : ta.right;
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A>(ta: Either<B, A>) => Either<J, A> {
  return (ta) => isLeft(ta) ? left(fbj(ta.left)) : ta;
}

export function alt<A, B>(
  tb: Either<B, A>,
): (ta: Either<B, A>) => Either<B, A> {
  return (ta) => isLeft(ta) ? tb : ta;
}

export function extend<A, I, B>(
  ftai: (ta: Either<B, A>) => I,
): (ta: Either<B, A>) => Either<B, I> {
  return (ta) => right(ftai(ta));
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): <B>(ta: Either<B, A>) => O {
  return (ta) => isLeft(ta) ? o : foao(o, ta.right);
}

export function traverse<VRI extends URIS>(
  A: T.Applicative<VRI>,
): <A, I, J, K, L>(
  faui: (a: A) => Kind<VRI, [I, J, K, L]>,
) => <B>(ta: Either<B, A>) => Kind<VRI, [Either<B, I>, J, K, L]> {
  return (faui) =>
    fold((l) => A.of(left(l)), flow(faui, A.map((r) => right(r))));
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Applicative: T.Applicative<URI> = { of, ap, map };

export const Chain: T.Chain<URI> = { ap, map, chain };

export const Monad: T.Monad<URI> = { of, ap, map, join, chain };

export const MonadThrow: T.MonadThrow<URI> = { ...Monad, throwError };

export const Bifunctor: T.Bifunctor<URI> = { bimap, mapLeft };

export const Alt: T.Alt<URI> = { alt, map };

export const Extend: T.Extend<URI> = { map, extend };

export const Foldable: T.Foldable<URI> = { reduce };

export const Traversable: T.Traversable<URI> = { map, reduce, traverse };

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);

export const { Do, bind, bindTo } = createDo(Monad);
