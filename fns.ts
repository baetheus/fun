// deno-lint-ignore-file no-explicit-any

import type { Fn, Lazy, Nil, UnknownFn } from "./types.ts";

/*******************************************************************************
 * isNotNil
 * 
 * Takes a value and returns true if the value is not null or undefined. Also
 * acts as a type guard.
 ******************************************************************************/
export const isNotNil = <A>(a: A): a is NonNullable<A> =>
  a !== null && a !== undefined;

/*******************************************************************************
 * isNil
 * 
 * Takes a value and returns false if the value is not null or undefined. Also
 * acts as a type guard.
 ******************************************************************************/
export const isNil = (a: unknown): a is Nil => a === null || a === undefined;

/*******************************************************************************
 * isRecord
 * 
 * Takes a value and returns false if the value is a Record. Also
 * acts as a type guard.
 ******************************************************************************/
export const isRecord = (
  a: unknown,
): a is Record<string | number | symbol, unknown> =>
  isNotNil(a) && typeof a === "object";

/*******************************************************************************
 * Identity
 * 
 * Takes a value and returns that same value
 ******************************************************************************/
export const identity = <A>(a: A): A => a;

/*******************************************************************************
 * Compose
 * 
 * Takes two functions with matching types and composes them into a new
 * function. 
 ******************************************************************************/
export const compose = <B, C>(fbc: Fn<[B], C>) =>
  <A>(fab: Fn<[A], B>): Fn<[A], C> => (a: A): C => fbc(fab(a));

/*******************************************************************************
 * Constant
 * 
 * Creates a constant function around the value a
 ******************************************************************************/
export const constant = <A>(a: A): Lazy<A> => () => a;

/*******************************************************************************
 * Memoize
 * 
 * A naive memoization function with no cache release mechanism
 ******************************************************************************/
export const memoize = <A, B>(f: (a: A) => B): (a: A) => B => {
  const cache = new Map();
  return (a) => {
    if (cache.has(a)) {
      return cache.get(a);
    }
    const b = f(a);
    cache.set(a, b);
    return b;
  };
};

/*******************************************************************************
 * TypeOf
 * 
 * An extended typeOf function that returns "null" for null instead of "object"
 ******************************************************************************/
export const typeOf = (
  x: unknown,
):
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function"
  | "null" => (x === null ? "null" : typeof x);

/*******************************************************************************
 * Intersect
 * 
 * Takes two types and returns their intersection (if it is possible)
 ******************************************************************************/
export const intersect = <A, B>(a: A, b: B): A & B => {
  if (a !== undefined && b !== undefined) {
    const tx = typeOf(a);
    const ty = typeOf(b);
    if (tx === "object" || ty === "object") {
      return Object.assign({}, a, b);
    }
  }
  return b as A & B;
};

/*******************************************************************************
 * HasOwnProperty
 * 
 * An alias for Object.prototype.hasOwnProperty
 ******************************************************************************/
export const hasOwnProperty = Object.prototype.hasOwnProperty;

/*******************************************************************************
 * Apply
 * 
 * Takes a group of arguments and curries them so that a function can be appied
 * to them later (pipeable Function.apply)
 ******************************************************************************/
export const apply = <AS extends unknown[], B>(...as: AS) =>
  (fn: Fn<AS, B>): B => fn(...as);

/*******************************************************************************
 * Call
 * 
 * Takes a function and returns that function (pipeable Function.call)
 ******************************************************************************/
export const call = <AS extends unknown[], B>(fn: Fn<AS, B>) =>
  (...as: AS) => fn(...as);

/*******************************************************************************
 * Apply1
 * 
 * A special case of apply for functions that only take a single argument
 ******************************************************************************/
export const apply1 = <A, B>(a: A, fn: Fn<[A], B>): B => fn(a);

/*******************************************************************************
 * Absurd
 * 
 * A function that should never be called, useful for some theoretical type
 * implementations
 ******************************************************************************/
export function absurd<A>(_: never): A {
  throw new Error("Called `absurd` function which should be uncallable");
}

/*******************************************************************************
 * Hole
 * 
 * The hole const is used for type hole based programming
 ******************************************************************************/
export const _: <T>() => T = absurd as any;

/*******************************************************************************
 * Wait
 * 
 * The wait function returns a Promise<void> that resolves after ms milliseconds
 ******************************************************************************/
export const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

/*******************************************************************************
 * Pipe
 * 
 * The pipe takes a value as the first argument and composes it with subsequent
 * function arguments, returning the result of the last function passed in
 * 
 * Original pipe function pulled from fp-ts and modified
 * https://github.com/gcanti/fp-ts/blob/master/src/pipeable.ts
 ******************************************************************************/
export type PipeFn = {
  <A>(a: A): A;
  <A, B>(a: A, ab: (a: A) => B): B;
  <A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
  <A, B, C, D>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
  ): D;
  <A, B, C, D, E>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
  ): E;
  <A, B, C, D, E, F>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
  ): F;
  <A, B, C, D, E, F, G>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
  ): G;
  <A, B, C, D, E, F, G, H>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
  ): H;
  <A, B, C, D, E, F, G, H, I>(
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
  <A, B, C, D, E, F, G, H, I, J>(
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
  <A, B, C, D, E, F, G, H, I, J, K>(
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
  <A, B, C, D, E, F, G, H, I, J, K, L>(
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
  <A, B, C, D, E, F, G, H, I, J, K, L>(
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
};

export const pipe: PipeFn = (a: unknown, ...fns: UnknownFn[]): unknown =>
  fns.reduce(apply1, a);

/*******************************************************************************
 * Flow
 * 
 * The flow function is a variadic extension of compose, where each subsequent
 * flow argument is the next function in a compose chain.
 * 
 * Original flow function pulled from fp-ts and modified
 * https://github.com/gcanti/fp-ts/blob/master/src/functions.ts
 ******************************************************************************/
type FlowFn = {
  <A extends ReadonlyArray<unknown>, B>(ab: (...a: A) => B): (...a: A) => B;
  <A extends ReadonlyArray<unknown>, B, C>(
    ab: (...a: A) => B,
    bc: (b: B) => C,
  ): (...a: A) => C;
  <A extends ReadonlyArray<unknown>, B, C, D>(
    ab: (...a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
  ): (...a: A) => D;
  <A extends ReadonlyArray<unknown>, B, C, D, E>(
    ab: (...a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
  ): (...a: A) => E;
  <A extends ReadonlyArray<unknown>, B, C, D, E, F>(
    ab: (...a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
  ): (...a: A) => F;
  <A extends ReadonlyArray<unknown>, B, C, D, E, F, G>(
    ab: (...a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
  ): (...a: A) => G;
  <A extends ReadonlyArray<unknown>, B, C, D, E, F, G, H>(
    ab: (...a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
  ): (...a: A) => H;
  <A extends ReadonlyArray<unknown>, B, C, D, E, F, G, H, I>(
    ab: (...a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
  ): (...a: A) => I;
  <A extends ReadonlyArray<unknown>, B, C, D, E, F, G, H, I, J>(
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
};

export const flow: FlowFn = <AS extends unknown[], B>(
  a: (...as: AS) => B,
  ...fns: Fn<[any], any>[]
): (...as: AS) => unknown => {
  return (...args: AS): unknown => fns.reduce(apply1, a(...args));
};
