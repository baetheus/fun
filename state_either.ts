/**
 * The StateEither module contains the StateEither algebraic data type. StateEither
 * is a composition of State and Either, representing a stateful computation that
 * can fail. It's useful for modeling computations that need to maintain state
 * while also handling potential failures in a pure, functional way.
 *
 * @module StateEither
 * @since 2.0.0
 */

import type { InOut, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Bimappable } from "./bimappable.ts";
import type { Combinable } from "./combinable.ts";
import type { Either } from "./either.ts";
import type { Failable, Tap } from "./failable.ts";
import type { Bind, Flatmappable } from "./flatmappable.ts";
import type { Initializable } from "./initializable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { State } from "./state.ts";
import type { Wrappable } from "./wrappable.ts";

import * as E from "./either.ts";
import * as S from "./state.ts";
import { createTap } from "./failable.ts";
import { createBind } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { pipe } from "./fn.ts";

/**
 * The StateEither type represents a stateful computation that can fail.
 * It's equivalent to State<S, Either<B, A>> where S is the state type,
 * B is the error type, and A is the success type.
 *
 * @since 2.0.0
 */
export type StateEither<S, B, A> = State<S, Either<B, A>>;

/**
 * Specifies StateEither as a Higher Kinded Type, with covariant parameter A
 * corresponding to the 0th index, covariant parameter B corresponding to the
 * 1st index, and invariant parameter S corresponding to the 2nd index.
 *
 * @since 2.0.0
 */
export interface KindStateEither extends Kind {
  readonly kind: StateEither<InOut<this, 0>, Out<this, 1>, Out<this, 0>>;
}

/**
 * Specifies StateEither with a fixed state type as a Higher Kinded Type.
 *
 * @since 2.0.0
 */
export interface KindStateEitherFixed<B> extends Kind {
  readonly kind: StateEither<InOut<this, 0>, B, Out<this, 0>>;
}

/**
 * Create a StateEither that always fails with the given error.
 *
 * @example
 * ```ts
 * import { left } from "./state_either.ts";
 *
 * const failure = left("Something went wrong");
 * const result = failure(10); // [Left("Something went wrong"), 10]
 * ```
 *
 * @since 2.0.0
 */
export function left<B, S = unknown, A = never>(left: B): StateEither<S, B, A> {
  return S.wrap(E.left(left));
}

/**
 * Create a StateEither that always succeeds with the given value.
 *
 * @example
 * ```ts
 * import { right } from "./state_either.ts";
 *
 * const success = right(42);
 * const result = success(10); // [Right(42), 10]
 * ```
 *
 * @since 2.0.0
 */
export function right<A, S = unknown, B = never>(
  right: A,
): StateEither<S, B, A> {
  return S.wrap(E.right(right));
}

/**
 * Wrap a value in a StateEither as a Right.
 *
 * @example
 * ```ts
 * import { wrap } from "./state_either.ts";
 *
 * const wrapped = wrap("Hello");
 * const result = wrapped(10); // [Right("Hello"), 10]
 * ```
 *
 * @since 2.0.0
 */
export function wrap<S, A = never, B = never>(a: A): StateEither<S, B, A> {
  return right(a);
}

/**
 * Create a StateEither that always fails with the given error.
 *
 * @example
 * ```ts
 * import { fail } from "./state_either.ts";
 *
 * const failure = fail("Something went wrong");
 * const result = failure(10); // [Left("Something went wrong"), 10]
 * ```
 *
 * @since 2.0.0
 */
export function fail<S, A = never, B = never>(b: B): StateEither<S, B, A> {
  return left(b);
}

/**
 * Convert an Either to a StateEither.
 *
 * @example
 * ```ts
 * import { fromEither } from "./state_either.ts";
 * import * as E from "./either.ts";
 *
 * const either = E.right("Success");
 * const stateEither = fromEither(either);
 * const result = stateEither(10); // [Right("Success"), 10]
 * ```
 *
 * @since 2.0.0
 */
export function fromEither<S, A = never, B = never>(
  ta: E.Either<B, A>,
): StateEither<S, B, A> {
  return S.wrap(ta);
}

/**
 * Convert a State to a StateEither, treating any value as a Right.
 *
 * @example
 * ```ts
 * import { fromState } from "./state_either.ts";
 * import * as S from "./state.ts";
 *
 * const state = S.wrap("Hello");
 * const stateEither = fromState(state);
 * const result = stateEither(10); // [Right("Hello"), 10]
 * ```
 *
 * @since 2.0.0
 */
export function fromState<S, A = never, B = never>(
  ta: State<S, A>,
): StateEither<S, B, A> {
  return pipe(ta, S.map(E.right));
}

/**
 * Wrap a function that can throw in a try/catch block, returning a StateEither.
 *
 * @example
 * ```ts
 * import { tryCatch } from "./state_either.ts";
 *
 * const riskyFunction = (s: number) => {
 *   if (s < 0) throw new Error("Negative state");
 *   return s * 2;
 * };
 *
 * const safe = tryCatch(riskyFunction, (e) => `Error: ${e}`);
 * const result1 = safe(5); // [Right(10), 5]
 * const result2 = safe(-1); // [Left("Error: Error: Negative state"), -1]
 * ```
 *
 * @since 2.0.0
 */
export function tryCatch<S, A = never, B = never>(
  fa: (s: S) => A,
  onError: (error: unknown) => B,
): StateEither<S, B, A> {
  return (s) => {
    try {
      return [E.right(fa(s)), s];
    } catch (e) {
      return [E.left(onError(e)), s];
    }
  };
}

/**
 * Apply a function to the Right value of a StateEither.
 *
 * @example
 * ```ts
 * import { map, right } from "./state_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   right(5),
 *   map(n => n * 2)
 * );
 *
 * const value = result(10); // [Right(10), 10]
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <S, B>(ta: StateEither<S, B, A>) => StateEither<S, B, I> {
  return S.map(E.map(fai));
}

/**
 * Apply a function to the Left value of a StateEither.
 *
 * @example
 * ```ts
 * import { mapSecond, left } from "./state_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   left("error"),
 *   mapSecond(e => `Error: ${e}`)
 * );
 *
 * const value = result(10); // [Left("Error: error"), 10]
 * ```
 *
 * @since 2.0.0
 */
export function mapSecond<B, J>(
  fbj: (b: B) => J,
): <S, A>(ta: StateEither<S, B, A>) => StateEither<S, J, A> {
  return S.map(E.mapSecond(fbj));
}

/**
 * Apply functions to both sides of a StateEither.
 *
 * @example
 * ```ts
 * import { bimap, right } from "./state_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   right(21),
 *   bimap(
 *     (error) => `Error: ${error}`,
 *     (value) => value * 2
 *   )
 * );
 *
 * const value = result(10); // [Right(42), 10]
 * ```
 *
 * @since 2.0.0
 */
export function bimap<A, B, I, J>(
  fbj: (b: B) => J,
  fai: (a: A) => I,
): <S>(ta: StateEither<S, B, A>) => StateEither<S, J, I> {
  return S.map(E.bimap(fbj, fai));
}

/**
 * Apply a function wrapped in a StateEither to a value wrapped in a StateEither.
 *
 * @example
 * ```ts
 * import { apply, right } from "./state_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const stateEitherFn = right((n: number) => n * 2);
 * const stateEitherValue = right(5);
 * const result = pipe(
 *   stateEitherFn,
 *   apply(stateEitherValue)
 * );
 *
 * const value = result(10); // [Right(10), 10]
 * ```
 *
 * @since 2.0.0
 */
export function apply<S, B, A>(
  ua: StateEither<S, B, A>,
): <J, I>(ufai: StateEither<S, J, (a: A) => I>) => StateEither<S, B | J, I> {
  return (ufai) => (s1) => {
    const [fai, s2] = ufai(s1);
    const [a, s3] = ua(s2);
    return [E.apply(a)(fai), s3];
  };
}

/**
 * Chain StateEither computations together.
 *
 * @example
 * ```ts
 * import { flatmap, right } from "./state_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   right(5),
 *   flatmap(n => right(n * 2))
 * );
 *
 * const value = result(10); // [Right(10), 10]
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, S, I, J>(
  faui: (a: A) => StateEither<S, J, I>,
): <B>(ua: StateEither<S, B, A>) => StateEither<S, B | J, I> {
  return (ua) => (s1) => {
    const [ea, s2] = ua(s1);
    return E.isLeft(ea) ? [ea, s2] : faui(ea.right)(s2);
  };
}

/**
 * Recover from a Left value by applying a function to it.
 *
 * @example
 * ```ts
 * import { recover, left, right } from "./state_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   left("error"),
 *   recover(e => right(`Recovered from: ${e}`))
 * );
 *
 * const value = result(10); // [Right("Recovered from: error"), 10]
 * ```
 *
 * @since 2.0.0
 */
export function recover<S, B, J, I>(
  fbui: (b: B) => StateEither<S, J, I>,
): <A>(ua: StateEither<S, B, A>) => StateEither<S, J, A | I> {
  return (ua) => (s1) => {
    const [ea, s2] = ua(s1);
    return E.isRight(ea) ? [ea, s2] : fbui(ea.left)(s2);
  };
}

/**
 * Provide an alternative StateEither if the current one fails.
 *
 * @example
 * ```ts
 * import { alt, left, right } from "./state_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   left("error"),
 *   alt(right("fallback"))
 * );
 *
 * const value = result(10); // [Right("fallback"), 10]
 * ```
 *
 * @since 2.0.0
 */
export function alt<S, A = never, B = never>(
  tb: StateEither<S, B, A>,
): (ta: StateEither<S, B, A>) => StateEither<S, B, A> {
  return (ta) => (s) => {
    const [ea, s2] = ta(s);
    return E.isLeft(ea) ? tb(s2) : [ea, s2];
  };
}

export function get<S>(): StateEither<S, never, S> {
  return (s) => [E.right(s), s];
}

/**
 * Get the current state value.
 *
 * @example
 * ```ts
 * import { gets } from "./state_either.ts";
 *
 * const getLength = gets((s: string) => s.length);
 * const result = getLength("Hello"); // [Right(5), "Hello"]
 * ```
 *
 * @since 2.0.0
 */
export function gets<S, A>(
  fea: (e: S) => A,
): StateEither<S, never, A> {
  return (s) => [E.right(fea(s)), s];
}

/**
 * Set the state to a specific value.
 *
 * @example
 * ```ts
 * import { put } from "./state_either.ts";
 *
 * const setState = put(42);
 * const result = setState(10); // [Right(undefined), 42]
 * ```
 *
 * @since 2.0.0
 */
export function put<A, S = unknown, B = never>(value: A): StateEither<S, B, A> {
  return wrap(value);
}

/**
 * Modify the state using a function.
 *
 * @since 2.0.0
 */
export function modify<S>(
  fss: (e: S) => S,
): <A, B>(ua: StateEither<S, B, A>) => StateEither<S, B, A> {
  return (ua) => (s) => ua(fss(s));
}

/**
 * Extract the result value by executing StateEither with a state value.
 *
 * @example
 * ```ts
 * import { evaluate, right } from "./state_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   right(5),
 *   evaluate(10)
 * ); // Right(5)
 * ```
 *
 * @since 2.0.0
 */
export function evaluate<S>(
  s: S,
): <B, A>(ta: StateEither<S, B, A>) => E.Either<B, A> {
  return (ta) => ta(s)[0];
}

/**
 * Extract the ending state value by executing StateEither with a state value.
 *
 * @example
 * ```ts
 * import { execute, right } from "./state_either.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   right(5),
 *   execute(10)
 * ); // 10
 * ```
 *
 * @since 2.0.0
 */
export function execute<S>(s: S): <B, A>(ta: StateEither<S, B, A>) => S {
  return (ta) => ta(s)[1];
}

/**
 * Create a Combinable instance for StateEither given Combinable instances for the Left and Right types.
 *
 * @example
 * ```ts
 * import { getCombinableStateEither, right } from "./state_either.ts";
 * import * as N from "./number.ts";
 * import * as S from "./string.ts";
 *
 * const combinable = getCombinableStateEither(N.CombinableNumberSum, S.CombinableString);
 * const se1 = right(2);
 * const se2 = right(3);
 * const result = combinable.combine(se2)(se1)(10); // [Right(5), 10]
 * ```
 *
 * @since 2.0.0
 */
export function getCombinableStateEither<S, A, B>(
  CA: Combinable<A>,
  CB: Combinable<B>,
): Combinable<StateEither<S, B, A>> {
  const { combine } = E.getCombinableEither(CA, CB);
  return {
    combine: (second) => (first) => (s) => {
      const [fa, s2] = first(s);
      const [sa, s3] = second(s2);
      return [combine(sa)(fa), s3];
    },
  };
}

/**
 * Create an Initializable instance for StateEither given Initializable instances for the Left and Right types.
 *
 * @example
 * ```ts
 * import { getInitializableStateEither, right } from "./state_either.ts";
 * import * as N from "./number.ts";
 * import * as S from "./string.ts";
 *
 * const initializable = getInitializableStateEither(N.InitializableNumberSum, S.InitializableString);
 * const se1 = right(2);
 * const se2 = right(3);
 * const result = initializable.combine(se2)(se1)(10); // [Right(5), 10]
 * const init = initializable.init()(10); // [Right(0), 10]
 * ```
 *
 * @since 2.0.0
 */
export function getInitializableStateEither<S, A, B>(
  IA: Initializable<A>,
  IB: Initializable<B>,
): Initializable<StateEither<S, B, A>> {
  const { init } = E.getInitializableEither(IA, IB);
  return {
    init: () => S.wrap(init()),
    ...getCombinableStateEither(IA, IB),
  };
}

/**
 * Create a Flatmappable instance for StateEither with a fixed left type.
 *
 * @example
 * ```ts
 * import { getFlatmappableStateRight, right } from "./state_either.ts";
 * import * as S from "./string.ts";
 *
 * const flatmappable = getFlatmappableStateRight(S.CombinableString);
 * const se = right(5);
 * const result = flatmappable.flatmap((n: number) => right(n * 2))(se)(10); // [Right(10), 10]
 * ```
 *
 * @since 2.0.0
 */
export function getFlatmappableStateRight<S, B>(
  C: Combinable<B>,
): Flatmappable<KindStateEitherFixed<B>> {
  const right = E.getFlatmappableRight<B>(C);
  return {
    wrap,
    map,
    flatmap,
    apply: (ua) => (ufai) => (s) => {
      const [fai, s2] = ufai(s);
      const [a, s3] = ua(s2);
      return [right.apply(a)(fai), s3];
    },
  };
}

/**
 * @since 2.0.0
 */
export const ApplicableStateEither: Applicable<KindStateEither> = {
  apply,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const BimappableStateEither: Bimappable<KindStateEither> = {
  map,
  mapSecond,
};

/**
 * @since 2.0.0
 */
export const FlatmappableStateEither: Flatmappable<KindStateEither> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const FailableStateEither: Failable<KindStateEither> = {
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
export const MappableStateEither: Mappable<KindStateEither> = { map };

/**
 * @since 2.0.0
 */
export const WrappableStateEither: Wrappable<KindStateEither> = { wrap };

/**
 * @since 2.0.0
 */
export const tap: Tap<KindStateEither> = createTap(FailableStateEither);

/**
 * @since 2.0.0
 */
export const bind: Bind<KindStateEither> = createBind(FlatmappableStateEither);

/**
 * @since 2.0.0
 */
export const bindTo: BindTo<KindStateEither> = createBindTo(
  MappableStateEither,
);
