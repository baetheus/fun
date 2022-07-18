// deno-lint-ignore-file no-explicit-any
import type { ConstPrimitive, Fn, Nil, UnknownFn } from "./types.ts";

/**
 * handleThrow
 *
 * This is a general wrapper around try catch.
 */
export function handleThrow<A, I>(
  fa: () => A,
  onSuccess: (a: A) => I,
  onThrow: (e: unknown) => I,
): () => I {
  return () => {
    try {
      return onSuccess(fa());
    } catch (e) {
      return onThrow(e);
    }
  };
}

/**
 * typeOf
 *
 * An extended typeOf function that returns "null" for null instead of "object"
 *
 *      const p1 = typeOf(null); // "null"
 *      const p2 = typeOf(1); // "number"
 */
export function typeOf(x: unknown): ConstPrimitive | "null" {
  return (x === null ? "null" : typeof x);
}

/**
 * isNotNil
 *
 * Takes a value and returns true if the value is not null or undefined. Also
 * acts as a type guard.
 */
export function isNotNil<A>(a: A): a is NonNullable<A> {
  return a !== null && a !== undefined;
}

/**
 * isNil
 *
 * Takes a value and returns false if the value is not null or undefined. Also
 * acts as a type guard.
 */
export function isNil(a: unknown): a is Nil {
  return a === null || a === undefined;
}

/**
 * isRecord
 *
 * Takes a value and returns false if the value is a Record. Also
 * acts as a type guard.
 */
export function isRecord(
  a: unknown,
): a is Record<string | number | symbol, unknown> {
  return typeOf(a) === "object";
}

/**
 * strictEquals
 */
export function strictEquals<A>(second: A): (first: A) => boolean {
  return (first) => first === second;
}

/**
 * lessThanOrEqual
 */
export function lessThanOrEqual<A>(second: A): (first: A) => boolean {
  return (first) => first <= second;
}

/**
 * Identity
 *
 * Takes a value and returns that same value
 */
export function identity<A>(a: A): A {
  return a;
}

/**
 * Compose
 *
 * Takes two functions with matching types and composes them into a new
 * function.
 */
export function compose<B, C>(
  fbc: Fn<[B], C>,
): <A extends unknown[]>(fab: Fn<A, B>) => Fn<A, C> {
  return (fab) => (...args) => fbc(fab(...args));
}

/**
 * Swap
 *
 * Takes a a curried function of length 2 and swaps the first two calls.
 */
export function swap<A, B, C>(
  fabc: (a: A) => (b: B) => C,
): (b: B) => (a: A) => C {
  return (b: B) => (a: A): C => fabc(a)(b);
}

/**
 * Constant
 *
 * Creates a constant function around the value a
 */
export function constant<A>(a: A): () => A {
  return () => a;
}

/**
 * Memoize
 *
 * A naive memoization function with no cache release mechanism
 */
export function memoize<A, B>(fab: (a: A) => B): (a: A) => B {
  const cache = new Map();
  return (a) => {
    if (cache.has(a)) {
      return cache.get(a);
    }
    const b = fab(a);
    cache.set(a, b);
    return b;
  };
}

/**
 * Intersect
 *
 * Takes two types and returns their intersection (if it is possible)
 */
export function intersect<A, B>(a: A, b: B): A & B {
  if (isNil(a)) {
    return b as A & B;
  } else if (isNil(b)) {
    return a as A & B;
  } else {
    return Object.assign({}, a, b);
  }
}

/**
 * HasOwnProperty
 *
 * An alias for Object.prototype.hasOwnProperty
 */
export const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Apply
 *
 * Takes a group of arguments and curries them so that a function can be appied
 * to them later (pipeable Function.apply)
 */
export function apply<AS extends unknown[], B>(
  ...as: AS
): (fab: (...as: AS) => B) => B {
  return (fab) => fab(...as);
}

/**
 * Call
 *
 * Takes a function and returns that function (pipeable Function.call)
 */
export function call<AS extends unknown[], B>(
  fab: Fn<AS, B>,
): (...as: AS) => B {
  return (...as) => fab(...as);
}

/**
 * Apply1
 *
 * A special case of apply for functions that only take a single argument
 */
export function apply1<A, B>(a: A, fn: Fn<[A], B>): B {
  return fn(a);
}

/**
 * Absurd
 *
 * A function that should never be called, useful for some theoretical type
 * implementations
 */
export function absurd<A>(_: never): A {
  throw new Error("Called `absurd` function which should be uncallable");
}

/**
 * Hole
 *
 * The hole const is used for type hole based programming
 */
export function _<T>(): T {
  return absurd<T>(null as never);
}

/**
 * Wait
 *
 * The wait function returns a Promise<void> that resolves after ms milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Resolve
 *
 * An alias for Promise.resolve
 */
export function resolve<A>(a: A): Promise<A> {
  return Promise.resolve(a);
}

/**
 * Reject
 *
 * An alias for Promise.reject
 */
export function reject<A = never, B = unknown>(b: B): Promise<A> {
  return Promise.reject(b);
}

/**
 * Then
 *
 * A curried alias of Promise.then
 */
export function then<A, B>(
  fab: (a: A) => B | Promise<B>,
): (ta: Promise<A>) => Promise<B> {
  return (ta: Promise<A>): Promise<B> => ta.then(fab);
}

/**
 * Recover
 *
 * A curried alias of Promise.catch that forces a return of the same
 * inner type of the Promise
 */
export function recover<A>(
  fua: (u: unknown) => A,
): (ta: Promise<A>) => Promise<A> {
  return (ta) => ta.catch(fua);
}

/**
 * Unsafe Coerce
 *
 * This utility function subverts the typescript type system by forcing
 * conversion between two types.
 */
export function unsafeCoerce<A, B>(a: A): B {
  return a as any;
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
export function pipe(a: unknown, ...fns: UnknownFn[]): unknown {
  return fns.reduce(apply1, a);
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
export function flow<AS extends unknown[], B>(
  a: (...as: AS) => B,
  ...fns: Fn<[any], any>[]
): (...as: AS) => unknown {
  return (...args: AS): unknown => fns.reduce(apply1, a(...args));
}
