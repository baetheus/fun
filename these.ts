/**
 * This file contains the These algebraic data type. These is a sort of
 * combination of Either and Pair. It can represent a complete failure or a
 * partial failure.
 *
 * @module These
 * @since 2.0.0
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Combinable } from "./combinable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Initializable } from "./initializable.ts";
import type { Mappable } from "./mappable.ts";
import type { Foldable } from "./foldable.ts";
import type { Showable } from "./showable.ts";
import type { Traversable } from "./traversable.ts";

import * as E from "./either.ts";
import { pipe } from "./fn.ts";

/**
 * The Left type represents a complete failure with only a left value.
 *
 * @since 2.0.0
 */
export type Left<B> = E.Left<B>;

/**
 * The Right type represents a complete success with only a right value.
 *
 * @since 2.0.0
 */
export type Right<A> = E.Right<A>;

/**
 * The Both type represents a partial success with both left and right values.
 *
 * @since 2.0.0
 */
export type Both<B, A> = { tag: "Both"; left: B; right: A };

/**
 * The These type represents either a complete failure (Left), complete success (Right), or partial success (Both).
 *
 * @since 2.0.0
 */
export type These<B, A> = Left<B> | Right<A> | Both<B, A>;

/**
 * Specifies These as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions and covariant
 * parameter B corresponding to the 1st index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindThese extends Kind {
  readonly kind: These<Out<this, 1>, Out<this, 0>>;
}

/**
 * Specifies These with a fixed left type as a Higher Kinded Type.
 *
 * @since 2.0.0
 */
export interface KindRightThese<E> extends Kind {
  readonly kind: These<E, Out<this, 0>>;
}

/**
 * Create a These that represents a complete failure.
 *
 * @example
 * ```ts
 * import { left } from "./these.ts";
 *
 * const failure = left("Error occurred");
 * console.log(failure); // { tag: "Left", left: "Error occurred" }
 * ```
 *
 * @since 2.0.0
 */
export function left<A = never, B = never>(left: B): These<B, A> {
  return ({ tag: "Left", left });
}

/**
 * Create a These that represents a complete success.
 *
 * @example
 * ```ts
 * import { right } from "./these.ts";
 *
 * const success = right(42);
 * console.log(success); // { tag: "Right", right: 42 }
 * ```
 *
 * @since 2.0.0
 */
export function right<A = never, B = never>(right: A): These<B, A> {
  return ({ tag: "Right", right });
}

/**
 * Create a These that represents a partial success with both values.
 *
 * @example
 * ```ts
 * import { both } from "./these.ts";
 *
 * const partial = both("Warning", 42);
 * console.log(partial); // { tag: "Both", left: "Warning", right: 42 }
 * ```
 *
 * @since 2.0.0
 */
export function both<A, B>(left: B, right: A): These<B, A> {
  return ({ tag: "Both", left, right });
}

/**
 * Pattern match on a These to extract values.
 *
 * @example
 * ```ts
 * import { match, left, right, both } from "./these.ts";
 *
 * const matcher = match(
 *   (error) => `Error: ${error}`,
 *   (value) => `Success: ${value}`,
 *   (warning, value) => `Partial: ${warning} - ${value}`
 * );
 *
 * console.log(matcher(left("Failed"))); // "Error: Failed"
 * console.log(matcher(right(42))); // "Success: 42"
 * console.log(matcher(both("Warning", 42))); // "Partial: Warning - 42"
 * ```
 *
 * @since 2.0.0
 */
export function match<A, B, O>(
  onLeft: (b: B) => O,
  onRight: (a: A) => O,
  onBoth: (b: B, a: A) => O,
): (ta: These<B, A>) => O {
  const _fold = E.match(onLeft, onRight);
  return (ta) => ta.tag === "Both" ? onBoth(ta.left, ta.right) : _fold(ta);
}

/**
 * Check if a These is a Left (complete failure).
 *
 * @example
 * ```ts
 * import { isLeft, left, right, both } from "./these.ts";
 *
 * console.log(isLeft(left("Error"))); // true
 * console.log(isLeft(right(42))); // false
 * console.log(isLeft(both("Warning", 42))); // false
 * ```
 *
 * @since 2.0.0
 */
export function isLeft<A, B>(ta: These<B, A>): ta is Left<B> {
  return ta.tag === "Left";
}

/**
 * Check if a These is a Right (complete success).
 *
 * @example
 * ```ts
 * import { isRight, left, right, both } from "./these.ts";
 *
 * console.log(isRight(left("Error"))); // false
 * console.log(isRight(right(42))); // true
 * console.log(isRight(both("Warning", 42))); // false
 * ```
 *
 * @since 2.0.0
 */
export function isRight<A, B>(ta: These<B, A>): ta is Right<A> {
  return ta.tag === "Right";
}

/**
 * Check if a These is a Both (partial success).
 *
 * @example
 * ```ts
 * import { isBoth, left, right, both } from "./these.ts";
 *
 * console.log(isBoth(left("Error"))); // false
 * console.log(isBoth(right(42))); // false
 * console.log(isBoth(both("Warning", 42))); // true
 * ```
 *
 * @since 2.0.0
 */
export function isBoth<A, B>(ta: These<B, A>): ta is Both<B, A> {
  return ta.tag === "Both";
}

/**
 * Wrap a value in a These as a Right.
 *
 * @example
 * ```ts
 * import { wrap } from "./these.ts";
 *
 * const wrapped = wrap(42);
 * console.log(wrapped); // { tag: "Right", right: 42 }
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A, B = never>(a: A): These<B, A> {
  return right(a);
}

/**
 * Create a These that always fails with the given error.
 *
 * @example
 * ```ts
 * import { fail } from "./these.ts";
 *
 * const failure = fail("Something went wrong");
 * console.log(failure); // { tag: "Left", left: "Something went wrong" }
 * ```
 *
 * @since 2.0.0
 */
export function fail<A = never, B = never>(b: B): These<B, A> {
  return left(b);
}

/**
 * Apply a function to the Right value of a These.
 *
 * @example
 * ```ts
 * import { map, right, both } from "./these.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(right(5), map(n => n * 2));
 * console.log(result1); // { tag: "Right", right: 10 }
 *
 * const result2 = pipe(both("Warning", 5), map(n => n * 2));
 * console.log(result2); // { tag: "Both", left: "Warning", right: 10 }
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: These<B, A>) => These<B, I> {
  return match(
    left,
    (value) => right(fai(value)),
    (left, right) => both(left, fai(right)),
  );
}

/**
 * Apply a function to the Left value of a These.
 *
 * @example
 * ```ts
 * import { mapSecond, left, both } from "./these.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(left("Error"), mapSecond(e => `Error: ${e}`));
 * console.log(result1); // { tag: "Left", left: "Error: Error" }
 *
 * const result2 = pipe(both("Warning", 5), mapSecond(w => `Warning: ${w}`));
 * console.log(result2); // { tag: "Both", left: "Warning: Warning", right: 5 }
 * ```
 *
 * @since 2.0.0
 */
export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <A>(ta: These<B, A>) => These<J, A> {
  return match(
    (value) => left(fbj(value)),
    right,
    (left, right) => both(fbj(left), right),
  );
}

/**
 * Fold over a These to produce a single value.
 *
 * @example
 * ```ts
 * import { fold, left, right, both } from "./these.ts";
 *
 * const folder = fold(
 *   (acc: number, value: number) => acc + value,
 *   0
 * );
 *
 * console.log(folder(left("Error"))); // 0
 * console.log(folder(right(5))); // 5
 * console.log(folder(both("Warning", 3))); // 3
 * ```
 *
 * @since 2.0.0
 */
export function fold<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): <B>(ta: These<B, A>) => O {
  return (ta) => isLeft(ta) ? o : foao(o, ta.right);
}

/**
 * Traverse over a These using the supplied Applicable.
 *
 * @example
 * ```ts
 * import { traverse, right, both } from "./these.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const traversed = pipe(
 *   right(5),
 *   traverse(O.ApplicableOption)(n => O.some(n * 2))
 * );
 *
 * console.log(traversed); // Some({ tag: "Right", right: 10 })
 * ```
 *
 * @since 2.0.0
 */
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

/**
 * Create a Showable instance for These given Showable instances for the Left and Right types.
 *
 * @example
 * ```ts
 * import { getShowableThese, right, both } from "./these.ts";
 *
 * const showable = getShowableThese(
 *   { show: (s: string) => s },
 *   { show: (n: number) => n.toString() }
 * );
 *
 * console.log(showable.show(right(42))); // "Right(42)"
 * console.log(showable.show(both("Warning", 42))); // "Both(Warning, 42)"
 * ```
 *
 * @since 2.0.0
 */
export function getShowableThese<A, B>(
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

/**
 * Create a Combinable instance for These given Combinable instances for the Left and Right types.
 *
 * @example
 * ```ts
 * import { getCombinableThese, right, both } from "./these.ts";
 * import * as N from "./number.ts";
 * import * as S from "./string.ts";
 *
 * const combinable = getCombinableThese(N.CombinableNumberSum, S.CombinableString);
 * const th1 = right(2);
 * const th2 = right(3);
 * const result = combinable.combine(th2)(th1); // Right(5)
 * ```
 *
 * @since 2.0.0
 */
export function getCombinableThese<A, B>(
  SA: Combinable<A>,
  SB: Combinable<B>,
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

/**
 * Create an Initializable instance for These given Initializable instances for the Left and Right types.
 *
 * @example
 * ```ts
 * import { getInitializableThese, right, both } from "./these.ts";
 * import * as N from "./number.ts";
 * import * as S from "./string.ts";
 *
 * const initializable = getInitializableThese(N.InitializableNumberSum, S.InitializableString);
 * const th1 = right(2);
 * const th2 = right(3);
 * const result = initializable.combine(th2)(th1); // Right(5)
 * const init = initializable.init(); // Right(0)
 * ```
 *
 * @since 2.0.0
 */
export function getInitializableThese<A, B>(
  IA: Initializable<A>,
  IB: Initializable<B>,
): Initializable<These<B, A>> {
  return {
    init: () => both(IB.init(), IA.init()),
    ...getCombinableThese(IA, IB),
  };
}

/**
 * Create a Flatmappable instance for These with a fixed left type.
 *
 * @example
 * ```ts
 * import { getFlatmappableRight, right, both, left } from "./these.ts";
 * import * as S from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { flatmap } = getFlatmappableRight(S.CombinableString);
 * const result1 = pipe(right, flatmap((n: number) => right(n * 2))); // Right(10)
 * const result2 = pipe(
 *   both("Warning", 5),
 *   flatmap((n: number) => right(n * 2))
 * ); // Both("Warning", 10)
 * ```
 *
 * @since 2.0.0
 */
export function getFlatmappableRight<B>(
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

/**
 * @since 2.0.0
 */
export const BimappableThese: Bimappable<KindThese> = { map, mapSecond };

/**
 * @since 2.0.0
 */
export const MappableThese: Mappable<KindThese> = { map };

/**
 * @since 2.0.0
 */
export const FoldableThese: Foldable<KindThese> = { fold };

/**
 * @since 2.0.0
 */
export const TraversableThese: Traversable<KindThese> = {
  map,
  fold,
  traverse,
};
