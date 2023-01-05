import type { Applicative } from "./applicative.ts";
import type { Apply } from "./apply.ts";
import type { Category } from "./category.ts";
import type { Chain } from "./chain.ts";
import type { Profunctor } from "./profunctor.ts";
import type { Contravariant } from "./contravariant.ts";
import type { Functor } from "./functor.ts";
import type { In, Kind, Out } from "./kind.ts";
import type { Monad } from "./monad.ts";

/**
 * A Fn, also known as Reader or Environment, is a type over a variadic
 * javascript function. ie. (a: number, b: string) => string can be
 * a Fn. As an algebraic data type, the associated type class instances
 * for Fn are limited to single variable inputs so they will look like
 * (a: number) => string, with only one argument. The purposes of a Fn
 * are many and varied, some common purposes are: computation, reading
 * values from a shared environment, and sub-computations in a modified
 * environment. In many ways Fn is a more powerful abstraction than
 * State, and indeed the State monad in fun is exactly State<S, A> =
 * Fn<[S], [A, S]>.
 *
 * Currently, there is no implementation of Chain recursion or
 * trampolining for Fn implemented, but it is likely to be a future
 * feature. Once implemented Fn will gain some much needed stack safety.
 *
 * @since 2.0.0
 */
export type Fn<D, A> = (d: D) => A;

/**
 * A Fn type over any, useful for constraining generics that
 * take or return Fns.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyFn = Fn<any, any>;

/**
 * Specifies Fn as a Higher Kinded Type, with
 * covariant parameter A corresponding to the 0th
 * index of any Substitutions and a contravariant
 * parameter D corresponding to the 0th index of
 * any Substititions. The Fn URI is unique in that
 * it constrains the Fn type to taking a single
 * argument for the purposes of type substitution
 * while the implementations of Fn combinators such
 * as map, chain, etc are mostly variadic (multiple
 * arguments).
 *
 * @since 2.0.0
 */
export interface URI extends Kind {
  readonly kind: Fn<In<this, 0>, Out<this, 0>>;
}

/**
 * Take a variadic Fn and make it unary, collapsing multiple arguments
 * into a single tuple argument.
 *
 * @example
 * ```ts
 * import * as F from "./fn.ts";
 *
 * const person = (age: number, name: string) => ({ age, name });
 * const personUnary = F.unary(person);
 *
 * // ({ name: "Brandon", age: 37 })
 * const result1 = personUnary([37, "Brandon"]);
 * ```
 * @since 2.0.0
 */
export function unary<D extends unknown[], A>(fda: (...d: D) => A): Fn<D, A> {
  return (d) => fda(...d);
}

/**
 * A common pattern in optics is to apply an input value to a function at the
 * beginning and the end of a computation. This can (and has) been achieved by
 * the composition of Pair using flow(P.dup, P.map(fn), P.merge). But for
 * performance reasons it's nice to have a straighforward function that achieves
 * the same result.
 *
 * @since 2.0.0
 */
export function over<A, I>(faai: (a: A) => (a: A) => I): (a: A) => I {
  return (a) => faai(a)(a);
}

/**
 * Wrap a thunk (a Fn that takes no arguments) in a try catch block, using
 * an onThrow function (that should itself never throw) to handle a default
 * case should the original function throw. This is useful for wrapping
 * functions that might throw.
 *
 * @example
 * ```ts
 * import * as F from "./fn.ts";
 *
 * const getZero = (): number => {
 *   if (Math.random() > 0.5) {
 *     throw new Error("Too high!");
 *   }
 *   return 0;
 * }
 *
 * const result = F.tryThunk(getZero, () => 0); // 0
 * ```
 *
 * @since 2.0.0
 */
export function tryThunk<A, E>(ua: Fn<void, A>, onThrow: Fn<E, A>): A {
  try {
    return ua();
  } catch (err) {
    return onThrow(err);
  }
}

/**
 * Wrap any function in a try catch block, passing the result and
 * arguments to onResult when the function does not throw as well
 * as passing the error and arguments to the onThrow function when
 * it does. Neither the onResult nor the onThrow functions should
 * ever throw an error themselves. None of the functions in the fun
 * library will throw on their own. If they do it is a bug in fun
 * or the underlying runtime (or you used fun in javascript). This
 * function primarily exists to wrap functions exported from other
 * libraries that may use exceptions as their error mechanism. This
 * makes those functions safe to use with fun.
 *
 * @example
 * ```ts
 * import * as F from "./fn.ts";
 *
 * const throwOverFive = (n: number): number => {
 *   if (n > 5) {
 *     throw new Error("Larger than five");
 *   }
 *   return n;
 * }
 * const caught = F.handleThrow(
 *   throwOverFive,
 *   result => result,
 *   err => 0, // Default to 0
 * );
 *
 * const result1 = caught(0); // 0
 * const result2 = caught(5); // 5
 * const result3 = caught(6); // 0
 * ```
 *
 * @since 2.0.0
 */
export function handleThrow<D extends unknown[], A, I>(
  ua: (...d: D) => A,
  onResult: (result: A, args: D) => I,
  onThrow: (error: unknown, args: D) => I,
): (...d: D) => I {
  return (...d) => {
    try {
      return onResult(ua(...d), d);
    } catch (err) {
      return onThrow(err, d);
    }
  };
}

/**
 * Memoize a unary function using a Map. This
 * means that this algorithm puposefully leaks memory.
 *
 * TODO: Extend memoize to be variadic.
 *
 * @example
 * ```ts
 * import * as F from "./fn.ts";
 *
 * // Big old expensive recursive algorithm
 * const fib = (n: number): number =>
 *   n < 1 ? 0 :
 *   n <= 1 ? 1 :
 *   fib(n - 2) + fib(n - 1);
 *
 * const mfib = F.memoize(fib);
 *
 * const result1 = mfib(10); // 55
 * const result2 = mfib(10); // 55 but does not recompute
 * ```
 *
 * @since 2.0.0
 */
export function memoize<D, A>(ua: Fn<D, A>): Fn<D, A> {
  const cache = new Map<D, A>();
  return (d) => {
    if (cache.has(d)) {
      return cache.get(d) as A;
    }
    const a = ua(d);
    cache.set(d, a);
    return a;
  };
}

/**
 * A function that can be called to output any type. It's used for type
 * hole based programming. This allows one to define interfaces and types
 * for a function and stub them with todo() until you are ready to implement
 * the actual behavior. The todo function will throw if it is ever actually
 * called.
 *
 * @example
 * ```ts
 * import { todo } from "./fn.ts";
 *
 * type InOut = {
 *   read: () => Promise<string>,
 *   write: (s: string) => Promise<unknown>,
 * }
 *
 * const mockInOut: InOut = todo(); // InOut !!THROWS!!
 * ```
 *
 * @since 2.0.0
 */
export function todo<T>(): T {
  throw new Error("TODO: this function has not been implemented");
}

/**
 * Does an unsafe type coercion on any type. This is only safe when
 * the types A and I have referential transparency. This is to say
 * when the type A can be substituted for I and I for A at runtime
 * without there being any change to the operation of the program.
 * The primary use case for unsafeCoerce is in Newtype implementations.
 */
export function unsafeCoerce<A, I>(a: A): I {
  return a as unknown as I;
}

/**
 * The flow function is like the pipe function without the initial value. It
 * composes up to 9 functions from left to right (top to bottom). The first
 * function can take multiple arguments but every subsequent function must
 * be unary (only take one argument).
 *
 * @example
 * ```ts
 * import { flow } from "./fn.ts";
 *
 * const add = (m: number) => (n: number) => m + n;
 * const multiply = (m: number) => (n: number) => m * n;
 *
 * const flowed = flow(
 *   add(1),
 *   multiply(2),
 *   add(1),
 *   multiply(2),
 * );
 *
 * const result1 = flowed(1); // 10
 * const result2 = flowed(2); // 14
 * const result3 = flowed(3); // 18
 * ```
 *
 * @since 2.0.0
 */
export function flow<A extends unknown[], B>(
  ab: (...a: A) => B,
): (...a: A) => B;
export function flow<A extends unknown[], B, C>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
): (...a: A) => C;
export function flow<A extends unknown[], B, C, D>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
): (...a: A) => D;
export function flow<A extends unknown[], B, C, D, E>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): (...a: A) => E;
export function flow<A extends unknown[], B, C, D, E, F>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
): (...a: A) => F;
export function flow<A extends unknown[], B, C, D, E, F, G>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
): (...a: A) => G;
export function flow<A extends unknown[], B, C, D, E, F, G, H>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
): (...a: A) => H;
export function flow<A extends unknown[], B, C, D, E, F, G, H, I>(
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
  A extends unknown[],
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
export function flow<
  A extends unknown[],
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
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
  jk: (j: J) => K,
): (...a: A) => K;
export function flow<
  A extends unknown[],
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
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
  jk: (j: J) => K,
  kl: (k: K) => L,
): (...a: A) => L;
export function flow(
  ...[ab, bc, cd, de, ef, fg, gh, hi, ij, jk, kl, ...rest]: AnyFn[]
): AnyFn {
  switch (arguments.length) {
    case 1:
      return (...as) => ab(...as);
    case 2:
      return (...as) => bc(ab(...as));
    case 3:
      return (...as) => cd(bc(ab(...as)));
    case 4:
      return (...as) => de(cd(bc(ab(...as))));
    case 5:
      return (...as) => ef(de(cd(bc(ab(...as)))));
    case 6:
      return (...as) => fg(ef(de(cd(bc(ab(...as))))));
    case 7:
      return (...as) => gh(fg(ef(de(cd(bc(ab(...as)))))));
    case 8:
      return (...as) => hi(gh(fg(ef(de(cd(bc(ab(...as))))))));
    case 9:
      return (...as) => ij(hi(gh(fg(ef(de(cd(bc(ab(...as)))))))));
    case 10:
      return (...as) => jk(ij(hi(gh(fg(ef(de(cd(bc(ab(...as))))))))));
    case 11:
      return (...as) => kl(jk(ij(hi(gh(fg(ef(de(cd(bc(ab(...as)))))))))));
    default:
      return (...as) =>
        rest.reduce(
          (val, fn) => fn(val),
          kl(jk(ij(hi(gh(fg(ef(de(cd(bc(ab(...as))))))))))),
        );
  }
}

/**
 * The pipe takes a value as the first argument and composes it with subsequent
 * function arguments, returning the result of the last function passed in. It
 * handles and correctly types up to 10 unary functions. Beyond 10 it makes
 * sense to break up pipe into multiple pipes.
 *
 * @example
 * ```ts
 * import { pipe } from "./fn.ts";
 *
 * const add = (n: number) => (m: number) => m + n;
 * const multiply = (n: number) => (m: number) => m * n;
 *
 * const result = pipe(
 *   1,
 *   add(1), // 2
 *   multiply(2), // 4
 *   add(1), // 5
 *   multiply(2), // 10
 * ); // 10
 * ```
 *
 * @since 2.0.0
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
export function pipe(
  value: unknown,
  ...fns: AnyFn[]
): unknown {
  return fns.reduce((val, fn) => fn(val), value);
}

/**
 * Create a Fn that always returns a value. This is equivalent to
 * constant.
 *
 * @example
 * ```ts
 * import { of } from "./fn.ts";
 *
 * const alwaysA = of("A");
 *
 * const result = alwaysA(null); // "A"
 * ```
 *
 * @since 2.0.0
 */
export function of<A, D = unknown>(a: A): Fn<D, A> {
  return () => a;
}

/**
 * Create a Fn that always returns a value. This is equivalent to
 * of but without the ability to specify a contravariant argument.
 *
 * @example
 * ```ts
 * import { constant } from "./fn.ts";
 *
 * const alwaysA = constant("A");
 *
 * const result = alwaysA(); // "A"
 * ```
 *
 * @since 2.0.0
 */
export function constant<A>(a: A): () => A {
  return () => a;
}

/**
 * Apply functions to an unknown function. Useful for pipeing values into
 * functions.
 */
export function apply<D>(d: D): <A>(ua: Fn<D, A>) => A {
  return (ua) => ua(d);
}

/**
 * Given L => A => I and D => A create a new Fn
 * D & L => I. In order to preserve type widening for
 * ap, it only handles unary functions.
 *
 * @example
 * ```ts
 * import * as F from "./fn.ts";
 * import { ap, pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 *
 * const person = (name: string) => (age: number): Person => ({ name, age });
 *
 * const result = pipe(
 *   F.of(person),
 *   F.ap(F.of("Brandon")),
 *   F.ap(F.of(37)),
 * ); // Fn<[], Person>
 * ```
 *
 * @since 2.0.0
 */
export function ap<D, A>(
  ua: Fn<D, A>,
): <I>(ufai: Fn<D, (a: A) => I>) => Fn<D, I> {
  return (ufai) => (d) => ufai(d)(ua(d));
}

/**
 * Map over the output of a Fn. This is equivalent to
 * function composition.
 * ie. a => pipe(f, map(g))(a) === a => g(f(a))
 *
 * @example
 * ```ts
 * import { map, of, pipe } from "./fn.ts";
 *
 * const result = pipe(of(1), map(n => n + 1)); // 2
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <D>(ta: Fn<D, A>) => Fn<D, I> {
  return (ta) => flow(ta, fai);
}

/**
 * Collapse a curried function D => D => A into
 * D => A.
 *
 * @example
 * ```ts
 * import { join } from "./fn.ts";
 *
 * const add = (n: number) => (m: number) => m + n;
 * const dup = join(add);
 *
 * const result1 = dup(1); // 2
 * const result2 = dup(2); // 4
 * const result3 = dup(10); // 20
 * ```
 *
 * @since 2.0.0
 */
export function join<A, D = unknown>(
  tta: Fn<D, Fn<D, A>>,
): Fn<D, A> {
  return (d) => tta(d)(d);
}

/**
 * Create a new Fn by combining A => L => I with
 * D => A to produce D & L => I. This is equivalent
 * to ap with the first two arguments switched. It is
 * also limited to unary functions in order to properly
 * handle type widening on the input type.
 *
 * @example
 * ```ts
 * import { pipe, chain } from "./fn.ts";
 * const add = (n: number) => (m: number) => n + m;
 *
 * const chainer = pipe(
 *   (n: number) => n,
 *   chain(add),
 *   chain(add),
 *   chain(add),
 *   chain(add),
 *   chain(add),
 * );
 *
 * const result1 = chainer(1); // 6
 * const result2 = chainer(2); // 12
 * const result3 = chainer(3); // 18
 * ```
 *
 * @since 2.0.0
 */
export function chain<A, I, D>(
  fati: (a: A) => Fn<D, I>,
): (ta: Fn<D, A>) => Fn<D, I> {
  return (ta) => (d) => fati(ta(d))(d);
}

/**
 * Map over the input of a function, turning
 * D => A and L => D into L => A.
 *
 * @example
 * ```ts
 * import { contramap, pipe } from "./fn.ts";
 *
 * const equalsZero = (n: number): boolean => n === 0;
 * const strLength = (s: string): number => s.length;
 *
 * const isEmpty = pipe(
 *   equalsZero,
 *   contramap(strLength),
 * );
 *
 * const result1 = isEmpty(""); // true
 * const result2 = isEmpty("Hello"); // false
 * ```
 *
 * @since 2.0.0
 */
export function contramap<L, D>(
  fld: (l: L) => D,
): <A>(ta: Fn<D, A>) => Fn<L, A> {
  return (ta) => (d) => ta(fld(d));
}

/**
 * A combination of contramap and map, dimap applies fld
 * to the input of a function and fai to the output.
 *
 * @example
 * ```ts
 * import type { NonEmptyArray } from "./array.ts";
 * import { dimap, pipe } from "./fn.ts";
 * import { plural, split } from "./string.ts";
 *
 * const are = plural("is", "are");
 * const words = plural("word", "words");
 * const describe = (n: number) => `There ${are(n)} ${n} ${words(n)}`;
 *
 * const toWords = split(/\s+/g); // string => string[]
 * const count = (ws: NonEmptyArray<string>) => ws.length;
 *
 * const fromString = pipe(
 *   count,
 *   dimap(toWords, describe),
 * );
 *
 * const result1 = fromString("Hello World"); // "There are 2 words"
 * const result2 = fromString("Hi"); // "There is 1 word"
 * const result3 = fromString("This   is    a    test"); // "There are 4 words"
 * ```
 *
 * @since 2.0.0
 */
export function dimap<A, I, L, D>(
  fld: (l: L) => D,
  fai: (a: A) => I,
): (ta: Fn<D, A>) => Fn<L, I> {
  return (ta) => flow(fld, ta, fai);
}

/**
 * The canonical identity function. It returns whatever value was
 * passed to it.
 *
 * @example
 * ```ts
 * import { identity } from "./fn.ts";
 *
 * const result1 = identity(1); // 1
 * const result2 = identity("Hello"); // "Hello"
 * ```
 * @since 2.0.0
 */
export function identity<A>(a: A): A {
  return a;
}

/**
 * A thunk over the identity function. It allows one
 * to constrain an identity to a specific type.
 *
 * @example
 * ```ts
 * import { id } from "./fn.ts";
 *
 * const idString = id<string>(); // (s: string) => string
 * const idNumber = id<number>(); // (n: number) => number
 *
 * const result1 = idString("Hello"); // "Hello"
 * const result2 = idNumber(1); // 1
 * ```
 *
 * @since 2.0.0
 */
export function id<A>(): Fn<A, A> {
  return identity;
}

/**
 * Compose two functions by taking the output of
 * one and passing it to another. This is equivalent
 * to the map function.
 *
 * @example
 * ```ts
 * import { compose, pipe } from "./fn.ts";
 *
 * const length = (s: string) => s.length;
 * const dup = (n: number) => n + n;
 *
 * const composed = pipe(
 *   length,
 *   compose(dup),
 * );
 *
 * const result1 = composed("Hello"); // 10
 * const result2 = composed(""); // 0
 * ```
 *
 * @since 2.0.0
 */
export function compose<A, I>(
  second: Fn<A, I>,
): <D>(first: Fn<D, A>) => Fn<D, I> {
  return (first) => flow(first, second);
}

/**
 * The canonical implementation of Profunctor for Fn. It contains
 * the method dimap.
 *
 * @since 2.0.0
 */
export const ProfunctorFn: Profunctor<URI> = { dimap };

/**
 * The canonical implementation of Functor for Fn. It contains
 * the method map.
 *
 * @since 2.0.0
 */
export const FunctorFn: Functor<URI> = { map };

/**
 * The canonical implementation of Apply for Fn. It contains
 * the methods ap and map.
 *
 * @since 2.0.0
 */
export const ApplyFn: Apply<URI> = { map, ap };

/**
 * The canonical implementation of Applicative for Fn. It contains
 * the methods of, ap, and map.
 *
 * @since 2.0.0
 */
export const ApplicativeFn: Applicative<URI> = { of, ap, map };

/**
 * The canonical implementation of Chain for Fn. It contains
 * the methods ap, map, and chain.
 *
 * @since 2.0.0
 */
export const ChainFn: Chain<URI> = { ap, map, chain };

/**
 * The canonical implementation of Monad for Fn. It contains
 * the methods of, ap, map, join, and chain.
 *
 * @since 2.0.0
 */
export const MonadFn: Monad<URI> = { of, ap, map, join, chain };

/**
 * The canonical implementation of Contravariant for Fn. It contains
 * the method contramap.
 *
 * @since 2.0.0
 */
export const ContravariantFn: Contravariant<URI> = { contramap };

/**
 * The canonical implementation of Category for Fn. It contains
 * the methods id and compose.
 *
 * @since 2.0.0
 */
export const CategoryFn: Category<URI> = { id, compose };
