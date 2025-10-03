/**
 * The Effect module contains the Effect type and associated functions for
 * working with stateful, asynchronous computations that can fail. An Effect
 * represents a computation that takes some input state, performs an
 * asynchronous operation, and returns either a success or failure result
 * along with potentially modified state.
 *
 * Effect provides a powerful abstraction for managing stateful computations
 * with error handling, allowing you to compose complex asynchronous workflows
 * in a type-safe and predictable way.
 *
 * @module Effect
 * @since 2.3.5
 */

import type { Kind, Out } from "./kind.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Either } from "./either.ts";

import * as P from "./promise.ts";
import * as E from "./either.ts";
import { pipe } from "./fn.ts";

/**
 * The Effect type represents a stateful, asynchronous computation that can fail.
 * An Effect takes input arguments of types D (an array), performs an asynchronous operation,
 * and returns a Promise containing a tuple of [Either<B, A>, ...C] where:
 * - Either<B, A> represents the success (A) or failure (B) result
 * - C represents the final state arguments (defaults to D if not specified)
 *
 * @example
 * ```ts
 * import type * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * type UserState = { loggedIn: boolean };
 * type LoginEffect = Eff.Effect<[UserState], string, { id: number; name: string }>;
 *
 * const loginUser: LoginEffect = async (state) => {
 *   if (state.loggedIn) {
 *     return [E.right({ id: 1, name: "Alice" }), { loggedIn: true }];
 *   } else {
 *     return [E.left("User not logged in"), { loggedIn: false }];
 *   }
 * };
 * ```
 *
 * @since 2.3.5
 */
export type Effect<D extends unknown[], B, A, C extends unknown[] = D> = (
  ...d: D
) => Promise<[Either<B, A>, ...C]>;

/**
 * Specifies Effect as a Higher Kinded Type with a fixed state type S,
 * with covariant parameter A corresponding to the 0th index and covariant
 * parameter B corresponding to the 1st index of any substitutions.
 *
 * @since 2.3.5
 */
export interface KindEffectState<S extends unknown[]> extends Kind {
  readonly kind: Effect<S, Out<this, 1>, Out<this, 0>, S>;
}

/**
 * Create an identity Effect that returns the input state as both the
 * success value and the output state.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const identityEffect = Eff.id<[number]>();
 * const result = await identityEffect(42);
 * // [E.right([42]), 42]
 * ```
 *
 * @since 2.3.5
 */
export function id<S extends unknown[]>(): Effect<S, S, S> {
  return (...s) => Promise.resolve([E.right(s), ...s]);
}

/**
 * Add a delay before executing an Effect. The Effect will wait for the
 * specified number of milliseconds before proceeding.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const delayedEffect = pipe(
 *   Eff.wrap("Hello World"),
 *   Eff.delay(1000) // Wait 1 second
 * );
 *
 * const start = Date.now();
 * const result = await delayedEffect(0);
 * const elapsed = Date.now() - start;
 * // elapsed >= 1000
 * // result = [E.right("Hello World"), 0]
 * ```
 *
 * @since 2.3.5
 */
export function delay(
  ms: number,
): <D extends unknown[], A, B>(ua: Effect<D, A, B>) => Effect<D, A, B> {
  return (ua) => async (...s) => {
    await P.wait(ms);
    return ua.apply(ua, s);
  };
}

/**
 * Convert an Either into an Effect. The input state is passed through unchanged.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const successEffect = Eff.fromEither(E.right(42));
 * const errorEffect = Eff.fromEither(E.left("Something went wrong"));
 *
 * const result1 = await successEffect("initial state");
 * // [E.right(42), "initial state"]
 *
 * const result2 = await errorEffect("initial state");
 * // [E.left("Something went wrong"), "initial state"]
 * ```
 *
 * @since 2.3.5
 */
export function fromEither<A, B, S extends unknown[] = unknown[]>(
  ea: Either<B, A>,
): Effect<S, B, A> {
  return (...s) => P.resolve([ea, ...s]);
}

/**
 * Convert a Promise or value into an Effect. If the Promise rejects,
 * the rejection is captured as a Left value.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const successEffect = Eff.fromPromise(Promise.resolve("success"));
 * const errorEffect = Eff.fromPromise(Promise.reject(new Error("failed")));
 * const valueEffect = Eff.fromPromise(42);
 *
 * const result1 = await successEffect("state");
 * // [E.right("success"), "state"]
 *
 * const result2 = await errorEffect("state");
 * // [E.left(Error("failed")), "state"]
 *
 * const result3 = await valueEffect("state");
 * // [E.right(42), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function fromPromise<A, S extends unknown[] = unknown[]>(
  pa: A | Promise<A>,
): Effect<S, unknown, A> {
  return P.tryCatch(
    async (...s: S) => [E.right(await pa), ...s],
    (b, s) => [E.left(b), ...s],
  );
}

/**
 * Create an Effect from a function that might throw an exception.
 * If the function throws, the error is caught and converted to a Left
 * using the onThrow function.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const safeDivide = Eff.tryCatch(
 *   (a: number, b: number) => {
 *     if (b === 0) throw new Error("Division by zero");
 *     return a / b;
 *   },
 *   (error, args) => `Failed to divide ${args[0]} by ${args[1]}: ${error}`
 * );
 *
 * const result1 = await safeDivide(10, 2);
 * // [E.right(5), 10, 2]
 *
 * const result2 = await safeDivide(10, 0);
 * // [E.left("Failed to divide 10 by 0: Error: Division by zero"), 10, 0]
 * ```
 *
 * @since 2.3.5
 */
export function tryCatch<S extends unknown[], B, A>(
  fsa: (...s: S) => A | Promise<A>,
  onThrow: (err: unknown, args: S) => B,
): Effect<S, B, A> {
  return async (...s) => {
    try {
      const a = await fsa.apply(fsa, s);
      return [E.right(a as A), ...s];
    } catch (b) {
      return [E.left(onThrow(b, s)), ...s];
    }
  };
}

/**
 * Wrap a value in a successful Effect. The value is placed in a Right
 * and the input state is passed through unchanged.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const wrappedValue = Eff.wrap("Hello World");
 * const result = await wrappedValue("state");
 * // [E.right("Hello World"), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function wrap<A, S extends unknown[] = unknown[]>(
  a: A,
): Effect<S, never, A> {
  return (...s) => P.resolve([E.right(a), ...s]);
}

/**
 * Create a successful Effect with the given value. This is an alias for wrap
 * and is commonly used in contexts where you want to emphasize success.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const successEffect = Eff.right(42);
 * const result = await successEffect("state");
 * // [E.right(42), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function right<A, S extends unknown[] = unknown[]>(
  a: A,
): Effect<S, never, A> {
  return wrap(a);
}

/**
 * Create a failed Effect with the given error value. The error is placed
 * in a Left and the input state is passed through unchanged.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const errorEffect = Eff.left("Something went wrong");
 * const result = await errorEffect("state");
 * // [E.left("Something went wrong"), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function left<B, S extends unknown[] = unknown[]>(
  b: B,
): Effect<S, B, never> {
  return (...s) => P.resolve([E.left(b), ...s]);
}

/**
 * Transform the input of an Effect by applying a function before the
 * Effect is executed. This allows you to adapt an Effect to work with
 * different input types.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const processNumber = Eff.gets((n: number) => n * 2);
 * const processString = Eff.premap((s: string) => [parseInt(s)])(processNumber);
 *
 * const result1 = await processString("21");
 * // [E.right(42), 21]
 *
 * const result2 = await processString("abc");
 * // [E.right(NaN), NaN]
 * ```
 *
 * @since 2.3.5
 */
export function premap<L extends unknown[], D extends unknown[]>(
  fld: (...l: L) => D,
): <S extends unknown[], A, B>(ua: Effect<D, B, A, S>) => Effect<L, B, A, S> {
  return (ua) => (...l) => ua(...fld.apply(fld, l));
}

/**
 * Apply a function to the success value of an Effect. If the Effect contains
 * a Left (error), it passes through unchanged. If it contains a Right (success),
 * the function is applied to transform the value.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const doubleEffect = pipe(
 *   Eff.right(21),
 *   Eff.map((n: number) => n * 2)
 * );
 *
 * const result = await doubleEffect("state");
 * // [E.right(42), "state"]
 *
 * const errorResult = await pipe(
 *   Eff.left("error"),
 *   Eff.map((n: number) => n * 2)
 * )("state");
 * // [E.left("error"), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function map<A, I>(
  fai: (a: A) => I | Promise<I>,
): <S1 extends unknown[], S2 extends unknown[], B>(
  ua: Effect<S1, B, A, S2>,
) => Effect<S1, B, I, S2> {
  return (ua) => async (...s1) => {
    const [ea, ...s2] = await ua.apply(ua, s1);
    return [E.isLeft(ea) ? ea : E.right(await fai(ea.right)), ...s2];
  };
}

/**
 * Apply a function to the error value of an Effect. If the Effect contains
 * a Right (success), it passes through unchanged. If it contains a Left (error),
 * the function is applied to transform the error.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const enrichError = pipe(
 *   Eff.left("Database connection failed"),
 *   Eff.mapSecond((error: string) => `ERROR: ${error}`)
 * );
 *
 * const result = await enrichError("state");
 * // [E.left("ERROR: Database connection failed"), "state"]
 *
 * const successResult = await pipe(
 *   Eff.right(42),
 *   Eff.mapSecond((error: string) => `ERROR: ${error}`)
 * )("state");
 * // [E.right(42), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function mapSecond<B, J>(
  fbj: (b: B) => J | Promise<J>,
): <A, S1 extends unknown[], S2 extends unknown[]>(
  ua: Effect<S1, B, A, S2>,
) => Effect<S1, J, A, S2> {
  return (ua) => async (...s1) => {
    const [ea, ...s2] = await ua.apply(ua, s1);
    if (E.isRight(ea)) {
      return [ea, ...s2];
    }
    return [E.left(await fbj(ea.left)), ...s2];
  };
}

/**
 * Apply a function wrapped in an Effect to a value wrapped in an Effect.
 * Both Effects must succeed for the application to succeed. The function
 * Effect is executed first, then the value Effect.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const add = (a: number) => (b: number) => a + b;
 * const addEffect = Eff.right(add(5));
 * const valueEffect = Eff.right(10);
 *
 * const result = await pipe(
 *   addEffect,
 *   Eff.apply(valueEffect)
 * )("state");
 * // [E.right(15), "state"]
 *
 * const errorResult = await pipe(
 *   Eff.left("function error"),
 *   Eff.apply(valueEffect)
 * )("state");
 * // [E.left("function error"), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function apply<A, B, S3 extends unknown[], S2 extends unknown[]>(
  ua: Effect<S2, B, A, S3>,
): <I, J, S1 extends unknown[]>(
  ufai: Effect<S1, J, (a: A) => I | Promise<I>, S2>,
) => Effect<S1, B | J, I, S2 | S3> {
  return (ufai) => async (...s1) => {
    const [efai, ...s2] = await ufai.apply(ufai, s1);
    if (E.isLeft(efai)) {
      return [efai, ...s2];
    }
    const [ea, ...s3] = await ua.apply(ua, s2);
    if (E.isLeft(ea)) {
      return [ea, ...s3];
    }
    return [E.right(await efai.right(ea.right)), ...s3];
  };
}

/**
 * Chain Effects by applying a function that returns an Effect to the
 * success value of an Effect. This allows for sequential composition
 * of Effects with dependency on previous results.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const divide = (a: number) => (b: number) =>
 *   b === 0
 *     ? Eff.left("Division by zero")
 *     : Eff.right(a / b);
 *
 * const computation = pipe(
 *   Eff.right(10),
 *   Eff.flatmap(divide(20))
 * );
 *
 * const result1 = await computation("state");
 * // [E.right(2), "state"]
 *
 * const errorComputation = pipe(
 *   Eff.right(0),
 *   Eff.flatmap(divide(10))
 * );
 *
 * const result2 = await errorComputation("state");
 * // [E.left("Division by zero"), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function flatmap<A, B, I, S2 extends unknown[], S3 extends unknown[]>(
  faui: (a: A) => Effect<S2, B, I, S3>,
): <S1 extends unknown[], J>(
  ua: Effect<S1, J, A, S2>,
) => Effect<S1, B | J, I, S2 | S3> {
  return (ua) => async (...s1) => {
    const [ea, ...s2] = await ua.apply(ua, s1);
    if (E.isLeft(ea)) {
      return [ea, ...s2];
    }
    const ui = faui(ea.right);
    return ui.apply(ui, s2);
  };
}

/**
 * Recover from an error by applying a function that returns an Effect.
 * If the Effect is successful (Right), it passes through unchanged.
 * If it fails (Left), the recovery function is applied to the error.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const fallback = (error: string) => Eff.right(`Recovered: ${error}`);
 *
 * const recoveredEffect = pipe(
 *   Eff.left("Something went wrong"),
 *   Eff.recover(fallback)
 * );
 *
 * const result1 = await recoveredEffect("state");
 * // [E.right("Recovered: Something went wrong"), "state"]
 *
 * const successEffect = pipe(
 *   Eff.right("Success!"),
 *   Eff.recover(fallback)
 * );
 *
 * const result2 = await successEffect("state");
 * // [E.right("Success!"), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function recover<B, I, J, S2 extends unknown[], S3 extends unknown[]>(
  fbua: (b: B) => Effect<S2, J, I, S3>,
): <S1 extends unknown[], A>(
  ua: Effect<S1, B, A, S2>,
) => Effect<S1, J, I | A, S2 | S3> {
  return (ua) => async (...s1) => {
    const [ea, ...s2] = await ua.apply(ua, s1);
    if (E.isRight(ea)) {
      return [ea, ...s2];
    }
    const ui = fbua(ea.left);
    return ui.apply(ui, s2);
  };
}

/**
 * Provide an alternative Effect if the first one fails. If the first
 * Effect succeeds (Right), it's returned. If it fails (Left), the
 * second Effect is executed instead.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const primaryEffect = Eff.left("Primary failed");
 * const fallbackEffect = Eff.right("Fallback success");
 *
 * const withFallback = Eff.alt(fallbackEffect)(primaryEffect);
 *
 * const result1 = await withFallback(1);
 * // [E.right("Fallback success"), 1]
 *
 * const successfulPrimary = Eff.right("Primary success");
 * const withFallback2 = Eff.alt(fallbackEffect)(successfulPrimary);
 *
 * const result2 = await withFallback2("state");
 * // [E.right("Primary success"), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function alt<S extends unknown[], B, A, O extends unknown[]>(
  second: Effect<S, B, A, O>,
): <I, J>(first: Effect<S, J, I, O>) => Effect<S, B | J, A | I, O> {
  return (first) => async (...s) => {
    const [ea, ...s2] = await first.apply(first, s);
    if (E.isRight(ea)) {
      return [ea, ...s2];
    }
    return second.apply(second, s);
  };
}

/**
 * Get the current state as the success value of an Effect.
 * The state is both the success value and passed through unchanged.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const getState = Eff.get<[string]>();
 * const result = await getState("hello");
 * // [E.right(["hello"]), "hello"]
 * ```
 *
 * @since 2.3.5
 */
export function get<S extends unknown[]>(): Effect<S, never, S, S> {
  return (...s) => Promise.resolve([E.right(s), ...s]);
}

/**
 * Replace the current state with a new value. The new state becomes
 * both the success value and the output state.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const putEffect = Eff.put("new state");
 *
 * const result = await putEffect("old state");
 * // [E.right(["new state"]), "new state"]
 * ```
 *
 * @since 2.3.5
 */
export function put<O extends unknown[], S extends unknown[] = unknown[]>(
  ...o: O
): Effect<S, never, O, O> {
  return () => Promise.resolve([E.right(o), ...o]);
}

/**
 * Extract a value from the current state using a function, without
 * modifying the state. The extracted value becomes the success value.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const getDoubled = Eff.gets((s: number) => s * 2);
 * const getAsync = Eff.gets((s: number) => Promise.resolve(s * 2));
 *
 * const result1 = await getDoubled(21);
 * // [E.right(42), 21]
 *
 * const result2 = await getAsync(21);
 * // [E.right(42), 21]
 * ```
 *
 * @since 2.3.5
 */
export function gets<S extends unknown[], A>(
  fsa: (...s: S) => A | Promise<A>,
): Effect<S, never, A, S> {
  return async (...s) => [E.right(await fsa.apply(fsa, s)), ...s];
}

/**
 * Transform the current state using a function. The transformed value
 * becomes both the success value and the new state.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const doubleState = Eff.puts((n: number) => [n * 2]);
 * const asyncPuts = Eff.puts((n: number) => Promise.resolve([n * 2]));
 *
 * const result1 = await doubleState(21);
 * // [E.right([42]), 42]
 *
 * const result2 = await asyncPuts(21);
 * // [E.right([42]), 42]
 * ```
 *
 * @since 2.3.5
 */
export function puts<S extends unknown[], O extends unknown[] = S>(
  fsa: (...s: S) => O | Promise<O>,
): Effect<S, never, O, O> {
  return async (...s) => {
    const o = await fsa.apply(fsa, s);
    return [E.right(o), ...o];
  };
}

/**
 * Execute an Effect with the given initial state and return only the
 * result (Either), discarding the final state.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const computation = pipe(
 *   Eff.get<[number]>(),
 *   Eff.map(([n]) => n * 2)
 * );
 *
 * const result = await Eff.evaluate(21)(computation);
 * // E.right(42)
 *
 * const errorComputation = Eff.left("Error occurred");
 * const errorResult = await Eff.evaluate("state")(errorComputation);
 * // E.left("Error occurred")
 * ```
 *
 * @since 2.3.5
 */
export function evaluate<S extends unknown[]>(
  ...s: S
): <A, B, O extends unknown[]>(
  ua: Effect<S, B, A, O>,
) => Promise<Either<B, A>> {
  return async (ua) => (await ua.apply(ua, s))[0];
}

/**
 * Execute an Effect with the given initial state and return only the
 * final state, discarding the result.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const stateChangingEffect = pipe(
 *   Eff.get<[string]>(),
 *   Eff.flatmap((_) => Eff.put("modified"))
 * );
 *
 * const finalState = await Eff.execute("initial")(stateChangingEffect);
 * // ["modified"]
 * ```
 *
 * @since 2.3.5
 */
export function execute<S extends unknown[]>(
  ...s: S
): <A, B, O extends unknown[]>(ua: Effect<S, B, A, O>) => Promise<O> {
  return async (ua) => {
    const [_, ...o] = await ua.apply(ua, s);
    return o;
  };
}

/**
 * Execute a side effect on the success value of an Effect and return
 * the original Effect unchanged. This is useful for logging or other
 * side effects that don't modify the computation.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const logValue = (value: number) => console.log(`Processing: ${value}`);
 *
 * const computation = pipe(
 *   Eff.right(42),
 *   Eff.tap(logValue),
 *   Eff.map((n) => n * 2)
 * );
 *
 * const result = await computation("state");
 * // Logs: "Processing: 42"
 * // Returns: [E.right(84), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function tap<A>(
  fa: (a: A) => unknown,
): <S extends unknown[], B, O extends unknown[]>(
  ua: Effect<S, B, A, O>,
) => Effect<S, B, A, O> {
  return flatmap((a) => {
    fa(a);
    return wrap(a);
  });
}

/**
 * Bind a value from an Effect to a name for use in subsequent computations.
 * This creates a new object with all previous bindings plus the new binding.
 * This is useful for chaining multiple Effects that depend on previous results.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const computation = pipe(
 *   Eff.right(5),
 *   Eff.bindTo("x"),
 *   Eff.bind("y", ({ x }) => Eff.right(x * 2)),
 *   Eff.bind("z", ({ x, y }) => Eff.right(x + y)),
 *   Eff.map(({ x, y, z }) => ({ x, y, z, total: x + y + z }))
 * );
 *
 * const result = await computation("state");
 * // [E.right({ x: 5, y: 10, z: 15, total: 30 }), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function bind<
  N extends string,
  A,
  J,
  I,
  S2 extends unknown[],
  S3 extends unknown[],
>(
  name: Exclude<N, keyof A>,
  faui: (a: A) => Effect<S2, J, I, S3>,
): <S1 extends unknown[], B>(
  ua: Effect<S1, B, A, S2>,
) => Effect<
  S1,
  B | J,
  { readonly [K in keyof A | N]: K extends keyof A ? A[K] : I },
  S2 | S3
> {
  return <S1 extends unknown[], B>(ua: Effect<S1, B, A, S2>) => {
    type Return = { readonly [K in keyof A | N]: K extends keyof A ? A[K] : I };
    return pipe(
      ua,
      flatmap((a) => map((i) => ({ ...a, [name]: i }) as Return)(faui(a))),
    );
  };
}

/**
 * Bind the success value of an Effect to a specific name, creating an
 * object with that single named property. This is often used as the
 * starting point for building objects with multiple named values.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const computation = pipe(
 *   Eff.right(42),
 *   Eff.bindTo("result")
 * );
 *
 * const result = await computation("state");
 * // [E.right({ result: 42 }), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function bindTo<N extends string>(
  name: N,
): <S1 extends unknown[], A, B, S2 extends unknown[]>(
  ua: Effect<S1, B, A, S2>,
) => Effect<S1, B, { readonly [K in N]: A }, S2> {
  return map((value) => ({ [name]: value }) as { [K in N]: typeof value });
}

/**
 * Create a Flatmappable instance for Effect with a fixed state type.
 * This provides the standard Flatmappable operations (wrap, apply, map, flatmap)
 * for Effects that maintain a consistent state type throughout the computation.
 *
 * @example
 * ```ts
 * import * as Eff from "./effect.ts";
 * import * as E from "./either.ts";
 *
 * const flatmappableEffect = Eff.getFlatmappableEffect<[string]>();
 *
 * // You can now use this instance with higher-order functions
 * // that work with Flatmappable structures
 * const wrappedValue = flatmappableEffect.wrap(42);
 * const result = await wrappedValue("state");
 * // [E.right(42), "state"]
 * ```
 *
 * @since 2.3.5
 */
export function getFlatmappableEffect<S extends unknown[]>(): Flatmappable<
  KindEffectState<S>
> {
  return { wrap, apply, map, flatmap };
}
