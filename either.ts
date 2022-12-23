import type { $, Kind, Out } from "./kind.ts";
import type { Alt } from "./alt.ts";
import type { Applicative } from "./applicative.ts";
import type { Bifunctor } from "./bifunctor.ts";
import type { Extend } from "./extend.ts";
import type { Monad } from "./monad.ts";
import type { Monoid } from "./monoid.ts";
import type { Ord } from "./ord.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Eq } from "./eq.ts";
import type { Show } from "./show.ts";
import type { Traversable } from "./traversable.ts";

import * as O from "./option.ts";
import { isNotNil } from "./nilable.ts";
import { fromCompare } from "./ord.ts";
import { flow, pipe } from "./fn.ts";

export type Left<L> = { tag: "Left"; left: L };

export type Right<R> = { tag: "Right"; right: R };

export type Either<L, R> = Left<L> | Right<R>;

export interface URI extends Kind {
  readonly kind: Either<Out<this, 1>, Out<this, 0>>;
}

export interface RightURI<B> extends Kind {
  readonly kind: Either<B, Out<this, 0>>;
}

export function left<E, A = never>(left: E): Either<E, A> {
  return ({ tag: "Left", left });
}

export function right<A, E = never>(right: A): Either<E, A> {
  return ({ tag: "Right", right });
}

export function of<A, B = never>(a: A): Either<B, A> {
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
  fn: (...as: AS) => A,
  onError: (e: unknown) => E,
): (...as: AS) => Either<E, A> {
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

export function match<L, R, B>(
  onLeft: (left: L) => B,
  onRight: (right: R) => B,
): (ta: Either<L, R>) => B {
  return (ta) => isLeft(ta) ? onLeft(ta.left) : onRight(ta.right);
}

export function getOrElse<E, A>(onLeft: (e: E) => A) {
  return (ma: Either<E, A>): A => isLeft(ma) ? onLeft(ma.left) : ma.right;
}

export function getRight<E, A>(ma: Either<E, A>): O.Option<A> {
  return pipe(ma, match(O.constNone, O.some));
}

export function getLeft<E, A>(ma: Either<E, A>): O.Option<E> {
  return pipe(ma, match(O.some, O.constNone));
}

export function isLeft<L, R>(m: Either<L, R>): m is Left<L> {
  return m.tag === "Left";
}

export function isRight<L, R>(m: Either<L, R>): m is Right<R> {
  return m.tag === "Right";
}

export function getShow<A, B>(
  SB: Show<B>,
  SA: Show<A>,
): Show<Either<B, A>> {
  return ({
    show: match(
      (left) => `Left(${SB.show(left)})`,
      (right) => `Right(${SA.show(right)})`,
    ),
  });
}

export function getEq<A, B>(
  SB: Eq<B>,
  SA: Eq<A>,
): Eq<Either<B, A>> {
  return ({
    equals: (b) => (a) => {
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
  OB: Ord<B>,
  OA: Ord<A>,
): Ord<Either<B, A>> {
  return fromCompare((fst, snd) =>
    isLeft(fst)
      ? isLeft(snd) ? OB.compare(fst.left, snd.left) : -1
      : isLeft(snd)
      ? 1
      : OA.compare(fst.right, snd.right)
  );
}

export function getLeftSemigroup<E = never, A = never>(
  SE: Semigroup<E>,
): Semigroup<Either<E, A>> {
  return ({
    concat: (x) => (y) =>
      isRight(x) ? x : isRight(y) ? y : left(SE.concat(x.left)(y.left)),
  });
}

export function getRightSemigroup<E = never, A = never>(
  SA: Semigroup<A>,
): Semigroup<Either<E, A>> {
  return ({
    concat: (x) => (y) =>
      isLeft(x) ? x : isLeft(y) ? y : right(SA.concat(x.right)(y.right)),
  });
}

export function getRightMonoid<E = never, A = never>(
  MA: Monoid<A>,
): Monoid<Either<E, A>> {
  return ({
    ...getRightSemigroup(MA),
    empty: () => right(MA.empty()),
  });
}

export function getRightMonad<E>(
  { concat }: Semigroup<E>,
): Monad<RightURI<E>> {
  return ({
    of,
    ap: (ua) => (ufai) =>
      isLeft(ufai)
        ? (isLeft(ua) ? left(concat(ua.left)(ufai.left)) : ufai)
        : (isLeft(ua) ? ua : right(ufai.right(ua.right))),
    map,
    join,
    chain,
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

export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: Either<B, A>) => Either<B, I> {
  return (ta) => isLeft(ta) ? ta : right(fai(ta.right));
}

export function chainLeft<B, I, J>(
  fbj: (b: B) => Either<J, I>,
): <A>(ta: Either<B, A>) => Either<J, A | I> {
  return (tab) => (isLeft(tab) ? fbj(tab.left) : tab);
}

export function ap<A, B>(
  ua: Either<B, A>,
): <I, J>(ufai: Either<J, (a: A) => I>) => Either<B | J, I> {
  return (ufai) =>
    isLeft(ua) ? ua : isLeft(ufai) ? ufai : right(ufai.right(ua.right));
}

export function chain<A, I, J>(
  fati: (a: A) => Either<J, I>,
): <B>(ta: Either<B, A>) => Either<B | J, I> {
  return (ta) => isLeft(ta) ? ta : fati(ta.right);
}

export function join<A, B, J = never>(
  ta: Either<J, Either<B, A>>,
): Either<B | J, A> {
  return isLeft(ta) ? ta : ta.right;
}

export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A>(ta: Either<B, A>) => Either<J, A> {
  return (ta) => isLeft(ta) ? left(fbj(ta.left)) : ta;
}

export function alt<A, J>(
  tb: Either<J, A>,
): <B>(ta: Either<B, A>) => Either<B | J, A> {
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

export function traverse<V extends Kind>(
  A: Applicative<V>,
): <A, I, J, K, L, M>(
  faui: (a: A) => $<V, [I, J, K], [L], [M]>,
) => <B>(ta: Either<B, A>) => $<V, [Either<B, I>, J, K], [L], [M]> {
  //deno-lint-ignore no-explicit-any
  const onLeft: any = flow(left, A.of);
  //deno-lint-ignore no-explicit-any
  const mapRight: any = A.map(right);
  return (faui) => match(onLeft, flow(faui, mapRight));
}

export const MonadEither: Monad<URI> = {
  of,
  ap,
  map,
  join,
  chain,
};

export const BifunctorEither: Bifunctor<URI> = { bimap, mapLeft };

export const AltEither: Alt<URI> = { alt, map };

export const ExtendEither: Extend<URI> = { map, extend };

export const TraversableEither: Traversable<URI> = { map, reduce, traverse };
