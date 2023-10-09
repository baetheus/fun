/**
 * This file contains the Either algebraic data type. Either is used to
 * represent two exclusive types. Generally, Either is used to represent either
 * a successful computation or a failed computation, with the result of the
 * failed computation being kept in Left.
 *
 * @module Either
 * @since 2.0.0
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Failable } from "./failable.ts";
import type { Filterable } from "./filterable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Initializable } from "./initializable.ts";
import type { Mappable } from "./mappable.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Showable } from "./showable.ts";
import type { Sortable } from "./sortable.ts";
import type { Traversable } from "./traversable.ts";
import type { Wrappable } from "./wrappable.ts";

import * as O from "./option.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { isNotNil } from "./nil.ts";
import { fromCompare } from "./comparable.ts";
import { fromSort } from "./sortable.ts";
import { flow, pipe } from "./fn.ts";

/**
 * @since 2.0.0
 */
export type Left<L> = { tag: "Left"; left: L };

/**
 * @since 2.0.0
 */
export type Right<R> = { tag: "Right"; right: R };

/**
 * @since 2.0.0
 */
export type Either<L, R> = Left<L> | Right<R>;

/**
 * @since 2.0.0
 */
export interface KindEither extends Kind {
  readonly kind: Either<Out<this, 1>, Out<this, 0>>;
}

/**
 * @since 2.0.0
 */
export interface KindRightEither<B> extends Kind {
  readonly kind: Either<B, Out<this, 0>>;
}

/**
 * @since 2.0.0
 */
export function left<E, A = never>(left: E): Either<E, A> {
  return ({ tag: "Left", left });
}

/**
 * @since 2.0.0
 */
export function right<A, E = never>(right: A): Either<E, A> {
  return ({ tag: "Right", right });
}

/**
 * @since 2.0.0
 */
export function wrap<A, B = never>(a: A): Either<B, A> {
  return right(a);
}

/**
 * @since 2.0.0
 */
export function fail<A = never, B = never>(b: B): Either<B, A> {
  return left(b);
}

/**
 * @since 2.0.0
 */
export function fromNullable<E>(fe: () => E) {
  return <A>(
    a: A,
  ): Either<E, NonNullable<A>> => (isNotNil(a) ? right(a) : left(fe()));
}

/**
 * @since 2.0.0
 */
export function tryCatch<E, A, AS extends unknown[]>(
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

/**
 * @since 2.0.0
 */
export function fromPredicate<A, B extends A>(
  refinement: Refinement<A, B>,
): (a: A) => Either<A, B>;
export function fromPredicate<A>(
  predicate: Predicate<A>,
): (a: A) => Either<A, A>;
export function fromPredicate<A>(
  predicate: Predicate<A>,
): (a: A) => Either<A, A> {
  return (a: A) => predicate(a) ? right(a) : left(a);
}

/**
 * @since 2.0.0
 */
export function match<L, R, B>(
  onLeft: (left: L) => B,
  onRight: (right: R) => B,
): (ta: Either<L, R>) => B {
  return (ta) => isLeft(ta) ? onLeft(ta.left) : onRight(ta.right);
}

/**
 * @since 2.0.0
 */
export function getOrElse<E, A>(onLeft: (e: E) => A) {
  return (ma: Either<E, A>): A => isLeft(ma) ? onLeft(ma.left) : ma.right;
}

/**
 * @since 2.0.0
 */
export function getRight<E, A>(ma: Either<E, A>): O.Option<A> {
  return pipe(ma, match(O.constNone, O.some));
}

/**
 * @since 2.0.0
 */
export function getLeft<E, A>(ma: Either<E, A>): O.Option<E> {
  return pipe(ma, match(O.some, O.constNone));
}

/**
 * @since 2.0.0
 */
export function isLeft<L, R>(m: Either<L, R>): m is Left<L> {
  return m.tag === "Left";
}

/**
 * @since 2.0.0
 */
export function isRight<L, R>(m: Either<L, R>): m is Right<R> {
  return m.tag === "Right";
}

/**
 * @since 2.0.0
 */
export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): (ta: Either<B, A>) => Either<J, I> {
  return (ta) => isLeft(ta) ? left(fbj(ta.left)) : right(fai(ta.right));
}

/**
 * @since 2.0.0
 */
export function swap<E, A>(ma: Either<E, A>): Either<A, E> {
  return isLeft(ma) ? right(ma.left) : left(ma.right);
}

/**
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: Either<B, A>) => Either<B, I> {
  return (ta) => isLeft(ta) ? ta : right(fai(ta.right));
}

/**
 * @since 2.0.0
 */
export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A>(ta: Either<B, A>) => Either<J, A> {
  return (ta) => isLeft(ta) ? left(fbj(ta.left)) : ta;
}

/**
 * @since 2.0.0
 */
export function apply<A, B>(
  ua: Either<B, A>,
): <I, J>(ufai: Either<J, (a: A) => I>) => Either<B | J, I> {
  return (ufai) =>
    isLeft(ua) ? ua : isLeft(ufai) ? ufai : right(ufai.right(ua.right));
}

/**
 * @since 2.0.0
 */
export function flatmap<A, I, J>(
  fati: (a: A) => Either<J, I>,
): <B>(ta: Either<B, A>) => Either<B | J, I> {
  return (ta) => isLeft(ta) ? ta : fati(ta.right);
}

/**
 * @since 2.0.0
 */
export function flatmapFirst<A, I = never, J = never>(
  faui: (a: A) => Either<J, I>,
): <B = never>(ta: Either<B, A>) => Either<B | J, A> {
  return (ua) => {
    if (isLeft(ua)) {
      return ua;
    } else {
      const ui = faui(ua.right);
      return isLeft(ui) ? ui : ua;
    }
  };
}

/**
 * @since 2.0.0
 */
export function recover<B, I, J>(
  fbui: (b: B) => Either<J, I>,
): <A>(ua: Either<B, A>) => Either<J, A | I> {
  return (ua) => isRight(ua) ? ua : fbui(ua.left);
}

/**
 * @since 2.0.0
 */
export function alt<A, J>(
  tb: Either<J, A>,
): <B>(ta: Either<B, A>) => Either<B | J, A> {
  return (ta) => isLeft(ta) ? tb : ta;
}

/**
 * @since 2.0.0
 */
export function fold<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): <B>(ta: Either<B, A>) => O {
  return (ta) => isLeft(ta) ? o : foao(o, ta.right);
}

/**
 * @since 2.0.0
 */
export function traverse<V extends Kind>(
  A: Applicable<V> & Mappable<V> & Wrappable<V>,
): <A, I, J, K, L, M>(
  faui: (a: A) => $<V, [I, J, K], [L], [M]>,
) => <B>(ta: Either<B, A>) => $<V, [Either<B, I>, J, K], [L], [M]> {
  //deno-lint-ignore no-explicit-any
  const onLeft: any = flow(left, A.wrap);
  //deno-lint-ignore no-explicit-any
  const mapRight: any = A.map(right);
  return (faui) => match(onLeft, flow(faui, mapRight));
}

/**
 * @since 2.0.0
 */
export function getShowableEither<A, B>(
  SB: Showable<B>,
  SA: Showable<A>,
): Showable<Either<B, A>> {
  return ({
    show: match(
      (left) => `Left(${SB.show(left)})`,
      (right) => `Right(${SA.show(right)})`,
    ),
  });
}

/**
 * @since 2.0.0
 */
export function getComparableEither<A, B>(
  SB: Comparable<B>,
  SA: Comparable<A>,
): Comparable<Either<B, A>> {
  return fromCompare((second) => (first) => {
    if (isLeft(first)) {
      if (isLeft(second)) {
        return SB.compare(second.left)(first.left);
      }
      return false;
    }

    if (isLeft(second)) {
      return false;
    }
    return SA.compare(second.right)(first.right);
  });
}

/**
 * @since 2.0.0
 */
export function getSortableEither<A, B>(
  OB: Sortable<B>,
  OA: Sortable<A>,
): Sortable<Either<B, A>> {
  return fromSort((fst, snd) =>
    isLeft(fst)
      ? isLeft(snd) ? OB.sort(fst.left, snd.left) : -1
      : isLeft(snd)
      ? 1
      : OA.sort(fst.right, snd.right)
  );
}

/**
 * @since 2.0.0
 */
export function getCombinableEither<A, B>(
  CA: Combinable<A>,
  CB: Combinable<B>,
): Combinable<Either<B, A>> {
  return {
    combine: (second) => (first) => {
      if (isLeft(first)) {
        if (isLeft(second)) {
          return left(CB.combine(second.left)(first.left));
        }
        return first;
      } else if (isLeft(second)) {
        return second;
      }
      return right(CA.combine(second.right)(first.right));
    },
  };
}

/**
 * @since 2.0.0
 */
export function getInitializableEither<A, B>(
  CA: Initializable<A>,
  CB: Initializable<B>,
): Initializable<Either<B, A>> {
  return {
    init: () => right(CA.init()),
    ...getCombinableEither(CA, CB),
  };
}

/**
 * @since 2.0.0
 */
export function getFlatmappableRight<E>(
  { combine }: Combinable<E>,
): Flatmappable<KindRightEither<E>> {
  return ({
    wrap,
    apply: (ua) => (ufai) =>
      isLeft(ufai)
        ? (isLeft(ua) ? left(combine(ua.left)(ufai.left)) : ufai)
        : (isLeft(ua) ? ua : right(ufai.right(ua.right))),
    map,
    flatmap,
  });
}

/**
 * @since 2.0.0
 */
export function getFilterableEither<B>(
  I: Initializable<B>,
): Filterable<KindRightEither<B>> {
  type Result = Filterable<KindRightEither<B>>;
  const init = left(I.init());
  return {
    filter: (
      <A, I extends A>(refinement: Refinement<A, I>) =>
      (ua: Either<B, A>): Either<B, I> => {
        if (isLeft(ua)) {
          return ua;
        } else if (refinement(ua.right)) {
          return ua as Right<I>;
        } else {
          return init;
        }
      }
    ) as Result["filter"],
    filterMap: (fai) => (ua) => {
      if (isLeft(ua)) {
        return ua;
      } else {
        const oi = fai(ua.right);
        return O.isNone(oi) ? init : right(oi.value);
      }
    },
    partition: (
      <A, I extends A>(refinement: Refinement<A, I>) =>
      (ua: Either<B, A>): Pair<Either<B, I>, Either<B, A>> => {
        if (isLeft(ua)) {
          return [ua, ua];
        } else if (refinement(ua.right)) {
          return [ua as Either<B, I>, init];
        } else {
          return [init, ua];
        }
      }
    ) as Result["partition"],
    partitionMap: (fai) => (ua) => {
      if (isLeft(ua)) {
        return [ua, ua];
      }
      const ei = fai(ua.right);
      return isLeft(ei) ? [init, right(ei.left)] : [ei, init];
    },
  };
}

/**
 * @since 2.0.0
 */
export const ApplicableEither: Applicable<KindEither> = { apply, map, wrap };

/**
 * @since 2.0.0
 */
export const BimappableEither: Bimappable<KindEither> = { map, mapSecond };

/**
 * @since 2.0.0
 */
export const FailableEither: Failable<KindEither> = {
  alt,
  apply,
  fail,
  flatmap,
  map,
  recover,
  wrap,
};

/**
 * @since 2.0.0
 */
export const FlatmappableEither: Flatmappable<KindEither> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const MappableEither: Mappable<KindEither> = { map };

/**
 * @since 2.0.0
 */
export const FoldableEither: Foldable<KindEither> = { fold };

/**
 * @since 2.0.0
 */
export const TraversableEither: Traversable<KindEither> = {
  map,
  fold,
  traverse,
};

/**
 * @since 2.0.0
 */
export const WrappableEither: Wrappable<KindEither> = { wrap };

/**
 * @since 2.0.0
 */
export const tap = createTap(FlatmappableEither);

/**
 * @since 2.0.0
 */
export const bind = createBind(FlatmappableEither);

/**
 * @since 2.0.0
 */
export const bindTo = createBindTo(MappableEither);
