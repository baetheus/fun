/**
 * FnEither is also known as ReaderEither. In essence a FnEither is
 * a function that returns an either. This pattern can be used as
 * a validation, a failable computation, a computation resulting
 * in a "Choice", and many other things.
 *
 * @module FnEither
 */

import type { In, Kind, Out } from "./kind.ts";
import type { Alt } from "./alt.ts";
import type { Bifunctor } from "./bifunctor.ts";
import type { Monad } from "./monad.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Contravariant } from "./contravariant.ts";
import type { Category } from "./category.ts";
import type { Profunctor } from "./profunctor.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Fn } from "./fn.ts";
import type { Either } from "./either.ts";

import * as E from "./either.ts";
import * as F from "./fn.ts";

/**
 * A FnEither, also known as ReaderEither, is a type over a variadic
 * javascript function that returns an Either.
 * ie. (a: number, b: string) => Either<Error, string> can be
 * a FnEither. As an algebraic data type, the associated type class
 * instances for Fn are limited to single variable inputs so they will
 * look like (a: number) => Either<Error, string>, with only one
 * argument. The purposes of a FnEither are many and varied, some
 * common purposes are: failable computation, reading values from a
 * shared environment, and sub-computations in a modified
 * environment.
 *
 * Currently, there is no implementation of Chain recursion or
 * trampolining for FnEIther implemented, but it is likely to be a future
 * feature. Once implemented Fn will gain some much needed stack safety.
 *
 * @since 2.0.0
 */
export type FnEither<D, B, A> = Fn<D, Either<B, A>>;

/**
 * A FnEither type over any, useful for constraining generics that
 * take or return FnEithers.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyFnEither = FnEither<any, any, any>;

/**
 * Specifies FnEither as a Higher Kinded Type, with
 * covariant parameter A and B corresponding to the 0th
 * and 1st indices of any Substitutions and a contravariant
 * parameter D corresponding to the 0th index of
 * any Substititions. The FnEither KindFnEither is unique in that
 * it constrains the FnEither type to taking a single
 * argument for the purposes of type substitution
 * while the implementations of FnEither combinators such
 * as map, chain, etc are mostly variadic (multiple
 * arguments).
 *
 * @since 2.0.0
 */
export interface KindFnEither extends Kind {
  readonly kind: FnEither<In<this, 0>, Out<this, 1>, Out<this, 0>>;
}

/**
 * Specifies FnEither as a Higher Kinded Type, with
 * covariant parameter A  corresponding to the 0th
 * index of any Substitutions and a contravariant
 * parameter D corresponding to the 0th index of
 * any Substititions. KindRightFnEither curries the Left parameter
 * of the output Either. This is useful when one
 * needs to Fix the Left output with a Semigroup or
 * some other collection algebraic structure.
 *
 * @since 2.0.0
 */
export interface KindRightFnEither<B> extends Kind {
  readonly kind: FnEither<In<this, 0>, B, Out<this, 0>>;
}

/**
 * Wrap any function in a try catch block. The returned
 * function will lazily call and handle any throwing of
 * the wrapped function. Non-throwing calls will be
 * returned in a Right, and throwing calls will have
 * their error and arguments passed to the onThrow function
 * before being returned in a Left.
 *
 * @example
 * ```ts
 * import { tryCatch } from "./fn_either.ts";
 * import { todo } from "./fn.ts";
 *
 * const throws = tryCatch(todo<number>, () => "Failed!");
 * const returns = tryCatch((n: number) => n, () => "Failed!");
 *
 * const result1 = throws()(0); // Left("Failed!");
 * const result2 = returns(1)(0); // Right(1);
 * ```
 *
 * @since 2.0.0
 */
export function tryCatch<D extends unknown[], B, A>(
  ua: (...d: D) => A,
  onThrow: (e: unknown, d: D) => B,
): (...d: D) => FnEither<unknown, B, A> {
  return F.handleThrow(
    ua,
    right,
    (e, d) => left(onThrow(e, d)),
  );
}

/**
 * Create a FnEither that always returns a Left(B).
 *
 * @example
 * ```ts
 * import { left } from "./fn_either.ts";
 *
 * const leftNumber = left(1);
 *
 * const result = leftNumber(0); // Left(1);
 * ```
 *
 * @since 2.0.0
 */
export function left<B, D = unknown, A = never>(
  left: B,
): FnEither<D, B, A> {
  return F.of(E.left(left));
}

/**
 * Create a FnEither that always returns a Right(A).
 *
 * @example
 * ```ts
 * import { right } from "./fn_either.ts";
 *
 * const rightNumber = right(1);
 *
 * const result = rightNumber(null); // Right(1);
 * ```
 *
 * @since 2.0.0
 */
export function right<A, D = unknown, B = never>(
  right: A,
): FnEither<D, B, A> {
  return F.of(E.right(right));
}

/**
 * Turn an Either into a FnEither.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import * as E from "./either.ts";
 *
 * const left = E.left(1);
 * const right = E.right(1);
 *
 * const fnLeft = FE.fromEither(left);
 * const fnRight = FE.fromEither(right);
 *
 * const result1 = fnLeft(null); // Left(1);
 * const result2 = fnRight(null); // Right(1);
 * ```
 *
 * @since 2.0.0
 */
export function fromEither<A, B, D = unknown>(
  ua: Either<B, A>,
): FnEither<D, B, A> {
  return F.of(ua);
}

/**
 * Lift a Fn<D, A> into FnEither<[D], never, A>
 *
 * @example
 * ```ts
 * import { fromFn } from "./fn_either.ts";
 *
 * const double = (first: number) => first + first;
 * const lifted = fromFn(double);
 *
 * const result = lifted(1); // Right(2)
 * ```
 *
 * @since 2.0.0
 */
export function fromFn<D, A>(
  fda: Fn<D, A>,
): FnEither<D, never, A> {
  return F.flow(fda, E.right);
}

/**
 * Create a FnEither from a Predicate or a Refinement.
 * If the Predicate or Refinement returns true then the
 * FnEither returns Right, otherwise it returns Left.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const isPositive = (n: number) => n > 0;
 * const computation = FE.fromPredicate(isPositive);
 *
 * const result1 = computation(0); // Left(0)
 * const result2 = computation(1); // Right(1)
 * ```
 *
 * @since 2.0.0
 */
export function fromPredicate<A, B extends A>(
  refinement: Refinement<A, B>,
): FnEither<A, A, B>;
export function fromPredicate<A>(
  predicate: Predicate<A>,
): FnEither<A, A, A>;
export function fromPredicate<A>(
  predicate: Predicate<A>,
): FnEither<A, A, A> {
  return (a) => predicate(a) ? E.right(a) : E.left(a);
}

/**
 * An alias for right. Creates a FnEither from a value. The created
 * FnEither does not require any arguments, but can widen when used
 * in a chain.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const computation = pipe(
 *   FE.id<number>(), // Ask for a number
 *   FE.map(n => n + 1), // Add one
 *   FE.chain(_ => FE.of("Hello")), // Forget about the number
 * );
 *
 * const result = computation(1); // Right("Hello")
 * ```
 *
 * @since 2.0.0
 */
export function of<A, D = unknown, B = never>(
  a: A,
): FnEither<D, B, A> {
  return right(a);
}

/**
 * Given a FnEither returning a function A => I and a FnEither returning
 * a value A, combine them into a FnEither returning an I.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string; age: number };
 *
 * const person = (name: string) => (age: number): Person => ({ name, age });
 *
 * const result = pipe(
 *   FE.of(person),
 *   FE.ap(FE.of("Brandon")),
 *   FE.ap(FE.of(37)),
 * ); // FnEither<[], never, Person>
 * ```
 *
 * @since 2.0.0
 */
export function ap<D, B, A>(
  ua: FnEither<D, B, A>,
): <L, I, J>(ufai: FnEither<L, J, (a: A) => I>) => FnEither<D & L, B | J, I> {
  return (ufai) => (d) => F.pipe(ufai(d), E.ap(ua(d)));
}

/**
 * Provide an alternative FnEither in the event that an original
 * FnEither returns Left.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   FE.left("Oh no I broke!"),
 *   FE.alt(FE.right("But I work")),
 * )(null); // Right("But I work")
 * ```
 *
 * @since 2.0.0
 */
export function alt<A, B, D>(
  ub: FnEither<D, B, A>,
): (ua: FnEither<D, B, A>) => FnEither<D, B, A> {
  return (ua) => (d) => {
    const e = ua(d);
    return E.isLeft(e) ? ub(d) : e;
  };
}

/**
 * Map over the left and right return values of a FnEither.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const boundedValue = (n: number) => n > 10 || n < 0 ? E.left(n) : E.right(n);
 *
 * const log = pipe(
 *   boundedValue,
 *   FE.bimap(n => `Out of bounds: ${n}`, n => `Received a good value: ${n}`),
 * );
 *
 * const result1 = log(1); // Right("Received a good value: 1")
 * const result2 = log(20); // Left("Out of bounds: 20")
 * ```
 *
 * @since 2.0.0
 */
export function bimap<A, I, B, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): <D = unknown>(
  ua: FnEither<D, B, A>,
) => FnEither<D, J, I> {
  return F.map(E.bimap(fbj, fai));
}

/**
 * Map over the right return value of a FnEither.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   FE.id<number>(),
 *   FE.map(n => n + 1),
 * )(0); // Right(1)
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B = never, D = unknown>(
  ua: FnEither<D, B, A>,
) => FnEither<D, B, I> {
  return F.map(E.map(fai));
}

/**
 * Map over the left return value of a FnEither.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result1 = pipe(
 *   FE.id<number>(),
 *   FE.mapLeft((n: number) => n + 1),
 * )(0); // Right(0)
 *
 * const result2 = pipe(
 *   FE.idLeft<number>(),
 *   FE.mapLeft(n => n + 1),
 * )(0); // Left(1)
 * ```
 *
 * @since 2.0.0
 */
export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A = never, D = unknown>(
  ua: FnEither<D, B, A>,
) => FnEither<D, J, A> {
  return F.map(E.mapLeft(fbj));
}

/**
 * Flatten nested FnEithers with the same input and
 * left types.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   FE.right(FE.right(1)),
 *   FE.join,
 * )(null); // Right(1)
 * ```
 *
 * @since 2.0.0
 */
export function join<D, A, B, L, J>(
  tua: FnEither<L, J, FnEither<D, B, A>>,
): FnEither<D & L, B | J, A> {
  return (d) => F.pipe(tua(d), E.chain(F.apply(d)));
}

/**
 * Chain the right result of one FnEither into another
 * FnEither.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   FE.id<string>(),
 *   FE.chain(s => FE.right(s.length)),
 * )("Hello"); // Right(5)
 * ```
 *
 * @since 2.0.0
 */
export function chain<A, L = unknown, J = never, I = never>(
  fati: (a: A) => FnEither<L, J, I>,
): <D = unknown, B = never>(
  ua: FnEither<D, B, A>,
) => FnEither<D & L, B | J, I> {
  return (ua) => (d) => {
    const e = ua(d);
    return E.isLeft(e) ? e : fati(e.right)(d);
  };
}

/**
 * Chain the left result of one FnEither into another
 * FnEither.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   FE.id<string, number>(),
 *   FE.chain(s => FE.left(s.length)),
 *   FE.chainLeft(n => FE.right(String(n))),
 * )("Hello"); // Right("5")
 * ```
 *
 * @since 2.0.0
 */
export function chainLeft<B, L = unknown, I = never, J = never>(
  fbtj: (b: B) => FnEither<L, J, I>,
): <D = unknown, A = never>(
  ua: FnEither<D, B, A>,
) => FnEither<D & L, J | B, A | I> {
  return (ua) => (d) => {
    const e = ua(d);
    return E.isRight(e) ? e : fbtj(e.left)(d);
  };
}

/**
 * Map over the input value of a FnEither.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * // This has type FnEither<[Date], never, number>
 * const computation = pipe(
 *   FE.id<number>(),
 *   FE.contramap((d: Date) => d.valueOf()),
 * );
 *
 * const result = computation(new Date(0)); // Right(0)
 * ```
 *
 * @since 2.0.0
 */
export function contramap<L, D>(
  fld: (l: L) => D,
): <A, B>(ua: FnEither<D, B, A>) => FnEither<L, B, A> {
  return (ua) => F.flow(fld, ua);
}

/**
 * Map over the input of a FnEither contravariantly and the
 * right result of a FnEither covariantly.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * // This has type FnEither<[Date], never, string>
 * const computation = pipe(
 *   FE.id<number>(),
 *   FE.dimap(
 *     (d: Date) => d.valueOf(),
 *     String,
 *   ),
 * );
 *
 * const result = computation(new Date(0)); // Right('0')
 * ```
 *
 * @since 2.0.0
 */
export function dimap<A, I, L, D>(
  fld: (l: L) => D,
  fai: (a: A) => I,
): <B>(ua: FnEither<D, B, A>) => FnEither<L, B, I> {
  return F.flow(contramap(fld), map(fai));
}

/**
 * Perform the same function as Reader ask. Given a type A
 * (and optionally a type B), return a FnEither<[A], B, A>.
 * This is useful for starting a FnEither chain.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const computation = FE.id<number>();
 *
 * const result1 = computation(1); // Right(1);
 * const result2 = computation(2); // Right(2);
 * ```
 *
 * @since 2.0.0
 */
export function id<A, B = never>(): FnEither<A, B, A> {
  return E.right;
}

/**
 * Perform the same function as Reader askLeft. Given a type B
 * (and optionally a type A), return a FnEither<[B], B, A>.
 * This is useful for starting a FnEither chain with a left value.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const computation = FE.idLeft<number>();
 *
 * const result1 = computation(1); // Left(1);
 * const result2 = computation(2); // Left(2);
 * ```
 *
 * @since 2.0.0
 */
export function idLeft<B, A = never>(): FnEither<B, B, A> {
  return E.left;
}

/**
 * Compose two FnEithers, passing the right value of the first
 * into the second.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const isPositive = (n: number) => n > 0;
 * const isInteger = (n: number) => Number.isInteger(n);
 *
 * const isPositiveInteger = pipe(
 *   FE.fromPredicate(isPositive),
 *   FE.compose(FE.fromPredicate(isInteger)),
 * );
 *
 * const result1 = isPositiveInteger(0); // Left(0)
 * const result2 = isPositiveInteger(1); // Right(1)
 * const result3 = isPositiveInteger(1.1); // Left(1.1)
 * ```
 *
 * @since 2.0.0
 */
export function compose<A, I, J>(
  second: FnEither<A, J, I>,
): <B, D>(
  first: FnEither<D, B, A>,
) => FnEither<D, B | J, I> {
  return (first) => F.flow(first, E.chain(second));
}

/**
 * The canonical implementation of Bifunctor for FnEither. It contains
 * the methods bimap and mapLeft.
 *
 * @since 2.0.0
 */
export const BifunctorFnEither: Bifunctor<KindFnEither> = { bimap, mapLeft };

/**
 * The canonical implementation of Monad for FnEither. It contains
 * the methods of, ap, map, join, and chain.
 *
 * @since 2.0.0
 */
export const MonadFnEither: Monad<KindFnEither> = { of, ap, map, join, chain };

/**
 * The canonical implementation of Alt for FnEither. It contains
 * the methods alt and map
 *
 * @since 2.0.0
 */
export const AltFnEither: Alt<KindFnEither> = { alt, map };

/**
 * The canonical implementation of Contravariant for FnEither. It contains
 * the method contramap.
 *
 * @since 2.0.0
 */
export const ContravariantFnEither: Contravariant<KindFnEither> = { contramap };

/**
 * The canonical implementation of Profunctor for FnEither. It contains
 * the method dimap.
 *
 * @since 2.0.0
 */
export const ProfunctorFnEither: Profunctor<KindFnEither> = { dimap };

/**
 * The canonical implementation of Category for FnEither. It contains
 * the methods of and compose.
 *
 * @since 2.0.0
 */
export const CategoryFnEither: Category<KindFnEither> = { id, compose };

/**
 * Create a Monad for FnEither where left values are combined using the
 * supplied Semigroup.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { SemigroupNumberSum } from "./number.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { ap } = FE.getRightMonad(SemigroupNumberSum);
 *
 * const result1 = pipe(
 *   FE.left(1),
 *   ap(FE.left(1)),
 * ); // Left(2)
 * ```
 *
 * @since 2.0.0
 */
export function getRightMonad<B>(
  { concat }: Semigroup<B>,
): Monad<KindRightFnEither<B>> {
  return ({
    of,
    ap: (ua) => (ufai) => (c) => {
      const efai = ufai(c);
      const ea = ua(c);
      return E.isLeft(efai)
        ? (E.isLeft(ea) ? E.left(concat(efai.left)(ea.left)) : efai)
        : (E.isLeft(ea) ? ea : E.right(efai.right(ea.right)));
    },
    map,
    join,
    chain,
  });
}
