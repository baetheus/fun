import type { In, Kind, Out } from "./kind.ts";
import type { Alt } from "./alt.ts";
import type { Bifunctor } from "./bifunctor.ts";
import type { Monad } from "./monad.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Contravariant } from "./contravariant.ts";
import type { Category } from "./category.ts";
import type { Profunctor, Strong } from "./profunctor.ts";
import type { Pair } from "./pair.ts";
import type { Fn } from "./fn.ts";

import * as E from "./either.ts";
import * as P from "./pair.ts";
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
export type FnEither<D extends unknown[], B, A> = Fn<D, E.Either<B, A>>;

/**
 * A FnEither type over any, useful for constraining generics that
 * take or return FnEithers.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyFnEither = FnEither<any[], any, any>;

/**
 * Specifies FnEither as a Higher Kinded Type, with
 * covariant parameter A and B corresponding to the 0th
 * and 1st indices of any Substitutions and a contravariant
 * parameter D corresponding to the 0th index of
 * any Substititions. The FnEither URI is unique in that
 * it constrains the FnEither type to taking a single
 * argument for the purposes of type substitution
 * while the implementations of FnEither combinators such
 * as map, chain, etc are mostly variadic (multiple
 * arguments).
 *
 * @since 2.0.0
 */
export interface URI extends Kind {
  readonly kind: FnEither<[In<this, 0>], Out<this, 1>, Out<this, 0>>;
}

/**
 * Specifies FnEither as a Higher Kinded Type, with
 * covariant parameter A  corresponding to the 0th
 * index of any Substitutions and a contravariant
 * parameter D corresponding to the 0th index of
 * any Substititions. RightURI curries the Left parameter
 * of the output Either. This is useful when one
 * needs to Fix the Left output with a Semigroup or
 * some other collection algebraic structure.
 *
 * @since 2.0.0
 */
export interface RightURI<B> extends Kind {
  readonly kind: FnEither<[In<this, 0>], B, Out<this, 0>>;
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
 * const result1 = throws(); // Left("Failed!");
 * const result2 = returns(1); // Right(1);
 * ```
 *
 * @since 2.0.0
 */
export function tryCatch<D extends unknown[], B, A>(
  ua: Fn<D, A>,
  onThrow: (e: unknown, d: D) => B,
): FnEither<D, B, A> {
  return F.handleThrow(
    ua,
    (a) => E.right(a),
    (e, d) => E.left(onThrow(e, d)),
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
 * const result = leftNumber(); // Left(1);
 * ```
 *
 * @since 2.0.0
 */
export function left<B, D extends unknown[] = never[], A = never>(
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
 * const result = rightNumber(); // Right(1);
 * ```
 *
 * @since 2.0.0
 */
export function right<A, D extends unknown[] = never[], B = never>(
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
 * const result1 = fnLeft(); // Left(1);
 * const result2 = fnRight(); // Right(1);
 * ```
 *
 * @since 2.0.0
 */
export function fromEither<A, B, D extends unknown[] = never[]>(
  ua: E.Either<B, A>,
): FnEither<D, B, A> {
  return F.of(ua);
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
export function of<A, B = never, D extends unknown[] = never[]>(
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
 * const result = pipe(
 *   FE.id<string>(),
 *   FE.ap(FE.of((s) => s.length)),
 * )("Hello World"); // Right(11)
 * ```
 *
 * @since 2.0.0
 */
export function ap<A, I, B, D extends unknown[] = never[]>(
  tfai: FnEither<D, B, (a: A) => I>,
): (ua: FnEither<D, B, A>) => FnEither<D, B, I> {
  return (ua) => (...d) => F.pipe(ua(...d), E.ap(tfai(...d)));
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
 * )(); // Right("But I work")
 * ```
 *
 * @since 2.0.0
 */
export function alt<A, B, D extends unknown[]>(
  ub: FnEither<D, B, A>,
): (ua: FnEither<D, B, A>) => FnEither<D, B, A> {
  return (ua) => (...d) => {
    const e = ua(...d);
    return E.isLeft(e) ? ub(...d) : e;
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
): <D extends unknown[] = never[]>(
  ua: FnEither<D, B, A>,
) => FnEither<D, J, I> {
  return (uab) => F.flow(uab, E.bimap(fbj, fai));
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
): <B = never, D extends unknown[] = never[]>(
  ua: FnEither<D, B, A>,
) => FnEither<D, B, I> {
  return bimap(F.identity, fai);
}

/**
 * Map over the left return value of a FnEither.
 *
 * @example
 * ```ts
 * import * as FE from "./fn_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   FE.id<number>(),
 *   FE.mapLeft(n => n + 1),
 * )(0); // Right(0)
 * ```
 *
 * @since 2.0.0
 */
export function mapLeft<B, J>(
  fbj: (b: B) => J,
): <A = never, D extends unknown[] = never[]>(
  ua: FnEither<D, B, A>,
) => FnEither<D, J, A> {
  return bimap(fbj, F.identity);
}


export function join<A, B, D extends unknown[]>(
  tua: FnEither<D, B, FnEither<D, B, A>>,
): FnEither<D, B, A> {
  return F.pipe(tua, chain(F.identity));
}
export function chain<A, D extends unknown[], I, J>(
  fati: (a: A) => FnEither<D, J, I>,
): <B>(ua: FnEither<D, B, A>) => FnEither<D, B | J, I> {
  return (ua) => (...d) => {
    const e = ua(...d);
    return E.isLeft(e) ? e : fati(e.right)(...d);
  };
}

export function chainLeft<A, B, L, J>(
  fbtj: (b: B) => FnEither<[L], J, A>,
): <D>(ua: FnEither<[D], B, A>) => FnEither<[D & L], J, A> {
  return (ua) => F.pipe(ua, F.chain(E.fold(fbtj, right)));
}

export function contramap<L, D>(
  fld: (l: L) => D,
): <A, B>(ua: FnEither<[D], B, A>) => FnEither<[L], B, A> {
  return (ua) => F.flow(fld, ua);
}

export function dimap<A, I, L, D>(
  fld: (l: L) => D,
  fai: (a: A) => I,
): <B>(ua: FnEither<[D], B, A>) => FnEither<[L], B, I> {
  return F.flow(contramap(fld), map(fai));
}

export function first<A, B, D, Q = never>(
  ua: FnEither<[D], B, A>,
): FnEither<[Pair<D, Q>], B, Pair<A, Q>> {
  return ([d, q]) => F.pipe(ua(d), E.map(P.second(q)));
}

export function second<A, B, D, Q = never>(
  ua: FnEither<[D], B, A>,
): FnEither<[Pair<Q, D>], B, Pair<Q, A>> {
  return ([q, d]) => F.pipe(ua(d), E.map(P.first(q)));
}

export function id<A, B = never>(): FnEither<[A], B, A> {
  return E.right;
}

export function idLeft<B, A = never>(): FnEither<[B], B, A> {
  return E.left;
}

export function compose<A, I, J>(
  right: FnEither<[A], J, I>,
): <B, D extends unknown[]>(
  left: FnEither<D, B, A>,
) => FnEither<D, B | J, I> {
  return (left) => F.flow(left, E.chain(right));
}

export function getRightMonad<B>(
  { concat }: Semigroup<B>,
): Monad<RightURI<B>> {
  return ({
    of,
    ap: (tfai) => (ua) => (c) => {
      const efai = tfai(c);
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

export const BifunctorFnEither: Bifunctor<URI> = { bimap, mapLeft };

export const MonadFnEither: Monad<URI> = { of, ap, map, join, chain };

export const AltFnEither: Alt<URI> = { alt, map };

export const ContravariantFnEither: Contravariant<URI> = { contramap };

export const ProfunctorFnEither: Profunctor<URI> = { dimap };

export const StrongFnEither: Strong<URI> = { dimap, first, second };

export const CategoryFnEither: Category<URI> = { id, compose };
