import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Initializable } from "./initializable.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Failable } from "./failable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Mappable } from "./mappable.ts";
import type { Predicate } from "./predicate.ts";
import type { Reducible } from "./reducible.ts";
import type { Refinement } from "./refinement.ts";
import type { Showable } from "./showable.ts";
import type { Sortable } from "./sortable.ts";
import type { Traversable } from "./traversable.ts";
import type { Wrappable } from "./wrappable.ts";

import * as O from "./option.ts";
import { isNotNil } from "./nilable.ts";
import { fromCompare } from "./comparable.ts";
import { fromSort } from "./sortable.ts";
import { flow, pipe } from "./fn.ts";

export type Left<L> = { tag: "Left"; left: L };

export type Right<R> = { tag: "Right"; right: R };

export type Either<L, R> = Left<L> | Right<R>;

export interface KindEither extends Kind {
  readonly kind: Either<Out<this, 1>, Out<this, 0>>;
}

export interface KindRightEither<B> extends Kind {
  readonly kind: Either<B, Out<this, 0>>;
}

export function left<E, A = never>(left: E): Either<E, A> {
  return ({ tag: "Left", left });
}

export function right<A, E = never>(right: A): Either<E, A> {
  return ({ tag: "Right", right });
}

export function wrap<A, B = never>(a: A): Either<B, A> {
  return right(a);
}

export function fail<A = never, B = never>(b: B): Either<B, A> {
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

export function getShowable<A, B>(
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

export function getComparable<A, B>(
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

export function getSortable<A, B>(
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

export function getLeftInitializable<E = never, A = never>(
  { combine, init }: Initializable<E>,
): Initializable<Either<E, A>> {
  return {
    init: () => left(init()),
    combine: (second) => (first) =>
      isRight(first)
        ? first
        : isRight(second)
        ? second
        : left(combine(second.left)(first.left)),
  };
}

export function getRightInitializable<E = never, A = never>(
  { combine, init }: Initializable<A>,
): Initializable<Either<E, A>> {
  return {
    init: () => right(init()),
    combine: (second) => (first) =>
      isLeft(first)
        ? first
        : isLeft(second)
        ? second
        : right(combine(second.right)(first.right)),
  };
}

export function getRightFlatmappable<E>(
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

export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A>(ta: Either<B, A>) => Either<J, A> {
  return (ta) => isLeft(ta) ? left(fbj(ta.left)) : ta;
}

export function apply<A, B>(
  ua: Either<B, A>,
): <I, J>(ufai: Either<J, (a: A) => I>) => Either<B | J, I> {
  return (ufai) =>
    isLeft(ua) ? ua : isLeft(ufai) ? ufai : right(ufai.right(ua.right));
}

export function flatmap<A, I, J>(
  fati: (a: A) => Either<J, I>,
): <B>(ta: Either<B, A>) => Either<B | J, I> {
  return (ta) => isLeft(ta) ? ta : fati(ta.right);
}

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

export function recover<B, I, J>(
  fbui: (b: B) => Either<J, I>,
): <A>(ua: Either<B, A>) => Either<J, A | I> {
  return (ua) => isRight(ua) ? ua : fbui(ua.left);
}

export function alt<A, J>(
  tb: Either<J, A>,
): <B>(ta: Either<B, A>) => Either<B | J, A> {
  return (ta) => isLeft(ta) ? tb : ta;
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): <B>(ta: Either<B, A>) => O {
  return (ta) => isLeft(ta) ? o : foao(o, ta.right);
}

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

export const ApplicableEither: Applicable<KindEither> = { apply, map, wrap };

export const BimappableEither: Bimappable<KindEither> = { map, mapSecond };

export const FailableEither: Failable<KindEither> = {
  alt,
  apply,
  fail,
  flatmap,
  map,
  recover,
  wrap,
};

export const FlatmappableEither: Flatmappable<KindEither> = {
  apply,
  flatmap,
  map,
  wrap,
};

export const MappableEither: Mappable<KindEither> = { map };

export const ReducibleEither: Reducible<KindEither> = { reduce };

export const TraversableEither: Traversable<KindEither> = {
  map,
  reduce,
  traverse,
};

export const WrappableEither: Wrappable<KindEither> = { wrap };
