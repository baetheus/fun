import type { In, Kind, Out } from "./kind.ts";
import type { Category } from "./category.ts";
import type { Contravariant } from "./contravariant.ts";
import type { Monad } from "./monad.ts";
import type { Choice, Closed, Profunctor, Strong } from "./profunctor.ts";
import type { Pair } from "./pair.ts";
import type { Either } from "./either.ts";

import * as P from "./pair.ts";
import * as E from "./either.ts";

export type Fn<D extends unknown[], A> = (...d: D) => A;

// deno-lint-ignore no-explicit-any
export type AnyFn = Fn<any[], any>;

export interface URI extends Kind {
  readonly kind: Fn<[In<this, 0>], Out<this, 0>>;
}

export function unary<D extends unknown[], A>(fda: Fn<D, A>): Fn<[D], A> {
  return (d) => fda(...d);
}

export function tryCatch<A, E>(ua: Fn<[], A>, onThrow: Fn<[E], A>): A {
  try {
    return ua();
  } catch (err) {
    return onThrow(err);
  }
}

export function handleThrow<D extends unknown[], A, I>(
  ua: Fn<D, A>,
  onResult: (result: A, args: D) => I,
  onThrow: (error: unknown, args: D) => I,
): Fn<D, I> {
  return (...d) => {
    try {
      return onResult(ua(...d), d);
    } catch (err) {
      return onThrow(err, d);
    }
  };
}

/**
 * Memoize
 *
 * A naive memoization function with no cache release mechanism
 */
export function memoize<D, A>(ua: Fn<[D], A>): Fn<[D], A> {
  const cache = new Map();
  return (d) => {
    if (cache.has(d)) {
      return cache.get(d);
    }
    const a = ua(d);
    cache.set(d, a);
    return a;
  };
}

/**
 * Apply
 *
 * Takes a group of arguments and curries them so that a function can be appied
 * to them later (pipeable Function.apply)
 */
export function apply<D extends unknown[], A>(
  ...d: D
): (ua: Fn<D, A>) => A {
  return (ua) => ua(...d);
}

export function todo<T>(): T {
  throw new Error("TODO: this function has not been implemented");
}

/**
 * Unsafe Coerce
 *
 * This utility function subverts the typescript type system by forcing
 * conversion between two types.
 */
export function unsafeCoerce<A, I>(a: A): I {
  return a as unknown as I;
}

/**
 * Pipe
 *
 * The pipe takes a value as the first argument and composes it with subsequent
 * function arguments, returning the result of the last function passed in
 *
 * Original pipe function pulled from fp-ts and modified
 * https://github.com/gcanti/fp-ts/blob/master/src/pipeable.ts
 */
export function pipe<A>(a: A): A;
export function pipe<A, B>(a: A, ab: (a: A) => B): B;
export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function pipe<A, B, C, D>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
): D;
export function pipe<A, B, C, D, E>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): E;
export function pipe<A, B, C, D, E, F>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
): F;
export function pipe<A, B, C, D, E, F, G>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
): G;
export function pipe<A, B, C, D, E, F, G, H>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
): H;
export function pipe<A, B, C, D, E, F, G, H, I>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
): I;
export function pipe<A, B, C, D, E, F, G, H, I, J>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
): J;
export function pipe<A, B, C, D, E, F, G, H, I, J, K>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
): K;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (K: K) => L,
): L;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (K: K) => L,
  end: never,
): L;
export function pipe(a: unknown, ...fns: ((u: unknown) => unknown)[]): unknown {
  return fns.reduce((res, fn) => fn(res), a);
}

/**
 * Flow
 *
 * The flow function is a variadic extension of compose, where each subsequent
 * flow argument is the next function in a compose chain.
 *
 * Original flow function pulled from fp-ts and modified
 * https://github.com/gcanti/fp-ts/blob/master/src/functions.ts
 */
export function flow<A extends ReadonlyArray<unknown>, B>(
  ab: (...a: A) => B,
): (...a: A) => B;
export function flow<A extends ReadonlyArray<unknown>, B, C>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
): (...a: A) => C;
export function flow<A extends ReadonlyArray<unknown>, B, C, D>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
): (...a: A) => D;
export function flow<A extends ReadonlyArray<unknown>, B, C, D, E>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): (...a: A) => E;
export function flow<A extends ReadonlyArray<unknown>, B, C, D, E, F>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
): (...a: A) => F;
export function flow<A extends ReadonlyArray<unknown>, B, C, D, E, F, G>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
): (...a: A) => G;
export function flow<A extends ReadonlyArray<unknown>, B, C, D, E, F, G, H>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
): (...a: A) => H;
export function flow<A extends ReadonlyArray<unknown>, B, C, D, E, F, G, H, I>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
): (...a: A) => I;
export function flow<
  A extends ReadonlyArray<unknown>,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
): (...a: A) => J;
export function flow(
  ua: AnyFn,
  ...fns: AnyFn[]
): AnyFn {
  return (...args) => fns.reduce((a, fab) => fab(a), ua(...args));
}
export function ask<A>(): Fn<[A], A> {
  return (a) => a;
}

export function of<A>(a: A): Fn<[], A> {
  return () => a;
}

export function map<A, I>(
  fai: (a: A) => I,
): <D extends unknown[]>(ta: Fn<D, A>) => Fn<D, I> {
  return (ta) => flow(ta, fai);
}

export function ap<A, I, D extends unknown[]>(
  tfai: Fn<D, (a: A) => I>,
): (ta: Fn<D, A>) => Fn<D, I> {
  return (ta) => (...d) => pipe(ta(...d), tfai(...d));
}

export function chain<A, I, D extends unknown[]>(
  fati: (a: A) => Fn<D, I>,
): (ta: Fn<D, A>) => Fn<D, I> {
  return (ta) => (...d) => fati(ta(...d))(...d);
}

export function join<A, D extends unknown[]>(
  tta: Fn<D, Fn<D, A>>,
): Fn<D, A> {
  return (...d) => tta(...d)(...d);
}

export function dimap<A, I, L, D>(
  fld: (l: L) => D,
  fai: (a: A) => I,
): (ta: Fn<[D], A>) => Fn<[L], I> {
  return (ta) => flow(fld, ta, fai);
}

export function contramap<L, D>(
  fld: (l: L) => D,
): <A>(ta: Fn<[D], A>) => Fn<[L], A> {
  return (ta) => flow(fld, ta);
}

export function identity<A>(a: A): A {
  return a;
}

export function id<A>(): Fn<[A], A> {
  return identity;
}

export function compose<A, I>(
  second: Fn<[A], I>,
): <D extends unknown[]>(first: Fn<D, A>) => Fn<D, I> {
  return (first) => flow(first, second);
}

export function first<A, D, Q = never>(
  ua: Fn<[D], A>,
): Fn<[Pair<D, Q>], Pair<A, Q>> {
  return P.map(ua);
}

export function second<A, D, Q = never>(
  ua: Fn<[D], A>,
): Fn<[Pair<Q, D>], Pair<Q, A>> {
  return P.mapLeft(ua);
}

export function left<A, D, Q = never>(
  ua: Fn<[D], A>,
): Fn<[Either<D, Q>], Either<A, Q>> {
  return E.mapLeft(ua);
}

export function right<A, D, Q = never>(
  ua: Fn<[D], A>,
): Fn<[Either<Q, D>], Either<Q, A>> {
  return E.map(ua);
}

export function closed<A, D, Q = never>(
  ua: Fn<[D], A>,
): Fn<[(q: Q) => D], (q: Q) => A> {
  return (fqd) => flow(fqd, ua);
}

export const ProfunctorFn: Profunctor<URI> = { dimap };

export const StrongFn: Strong<URI> = { dimap, first, second };

export const ChoiceFn: Choice<URI> = { dimap, left, right };

export const ClosedFn: Closed<URI> = { dimap, closed };

export const MonadFn: Monad<URI> = { of, ap, map, join, chain };

export const ContravariantFn: Contravariant<URI> = { contramap };

export const CategoryFn: Category<URI> = { id, compose };
