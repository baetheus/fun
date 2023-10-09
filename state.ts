/**
 * The State module contains the State structure. The purpose of State is to
 * have modifiable date in an immutable workflow. This structure must preserve
 * purity, so that subsequent executions of a state workflow with the same
 * initial conditions produce the exact same results.
 *
 * @module State
 * @since 2.0.0
 */

import type { InOut, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Combinable } from "./combinable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Initializable } from "./initializable.ts";
import type { Mappable } from "./mappable.ts";
import type { Wrappable } from "./wrappable.ts";

import { flow } from "./fn.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";

/**
 * The State<E, A> type represents the core State structure. The input/output
 * variable E is invariant, and the output variable A is covariant.
 *
 * @since 2.0.0
 */
export type State<E, A> = (e: E) => [A, E];

/**
 * Specifies State as a Higher Kinded Type, with covariant parameter A in the
 * 0th index of any substitutions and invariant parameter E in the 0th parameter
 * of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindState extends Kind {
  readonly kind: State<InOut<this, 1>, Out<this, 0>>;
}

/**
 * An internal optimization over State identity
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
const _identity: State<any, any> = (s) => [s, s];

/**
 * Construct a trivial State<E, A> from values E and A.
 *
 * @example
 * ```ts
 * import * as S from "./state.ts";
 *
 * const state = S.state(1, 2);
 *
 * const result = state(10); // [2, 1]
 * ```
 *
 * @since 2.0.0
 */
export function state<E, A>(a: A, e: E): State<E, A> {
  return () => [a, e];
}

/**
 * An instance of Id that makes the State structure a Category. This is often
 * used at the beginning of a State workflow to specify the type of data within
 * a State structure.
 *
 * @example
 * ```ts
 * import * as S from "./state.ts";
 * import { pipe } from "./fn.ts";
 *
 * const num = pipe(
 *   S.id<number>(),
 *   S.map(n => n + 1),
 * );
 *
 * const result = num(1); // [2, 1]
 * ```
 *
 * @since 2.0.0
 */
export function id<E>(): State<E, E> {
  return _identity;
}

/**
 * Construct a State<E, A> from a function E => A.
 *
 * @example
 * ```ts
 * import * as S from "./state.ts";
 *
 * const length = S.gets((s: string) => s.length);
 *
 * const result = length("Hello World"); // [11, "Hello World"]
 * ```
 *
 * @since 2.0.0
 */
export function gets<E, A>(fea: (e: E) => A): State<E, A> {
  return (e) => [fea(e), e];
}

/**
 * Construct a State<E, void> from a static state value E.
 *
 * @example
 * ```ts
 * import * as S from "./state.ts";
 * import { pipe } from "./fn.ts";
 *
 * const state = pipe(
 *   S.id<number>(),
 *   S.flatmap(n => pipe(S.id<number>(), S.map(m => m + n))),
 * );
 *
 * const result = state(100); // [2, 1]
 * ```
 *
 * @since 2.0.0
 */
export function put<E>(e: E): State<E, void> {
  return () => [undefined, e];
}

/**
 * Construct a State<E, void> from a function E => E.
 *
 * @example
 * ```ts
 * import * as S from "./state.ts";
 * import { pipe } from "./fn.ts";
 *
 * const state = S.modify((n: number) => n + 100);
 *
 * const result = state(1); // [undefined, 101]
 * ```
 *
 * @since 2.0.0
 */
export function modify<E>(fee: (e: E) => E): State<E, void> {
  return (e) => [undefined, fee(e)];
}

/**
 * Construct a State<E, A> from a static value A.
 *
 * @example
 * ```ts
 * import * as S from "./state.ts";
 *
 * const state = S.wrap(1);
 *
 * const result = state(null); // [1, null]
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A, E = unknown>(a: A): State<E, A> {
  return (e) => [a, e];
}

/**
 * Map over the covariant value A in State<E, A>.
 *
 * @example
 * ```ts
 * import * as S from "./state.ts";
 * import * as A from "./array.ts";
 * import { pipe } from "./fn.ts";
 *
 * const work = pipe(
 *   S.id<number>(),
 *   S.map(n => A.range(n)),
 * );
 *
 * const result1 = work(1); // [[0], 1]
 * const result2 = work(3); // [[0, 1, 2], 3]
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): <B>(ta: State<B, A>) => State<B, I> {
  return (ta) => flow(ta, ([a, b]) => [fai(a), b]);
}

/**
 * Apply the A value of State<E, A> to the (a: A) => I value of
 * State<E, (a: A) => I>, producing a State<E, I>.
 *
 * @example
 * ```ts
 * import * as S from "./state.ts";
 * import { pipe } from "./fn.ts";
 *
 * const work = pipe(
 *   S.id<string>(),
 *   S.map(s => (n: number) => s.repeat(n)),
 *   S.apply(S.gets(s => s.length))
 * );
 *
 * const result1 = work("Hi"); // ["HiHi", "Hi"]
 * const result2 = work("Hello");
 * // ["HelloHelloHelloHelloHello", "Hello"]
 * ```
 *
 * @since 2.0.0
 */
export function apply<E, A>(
  ua: State<E, A>,
): <I>(ufai: State<E, (a: A) => I>) => State<E, I> {
  return (ufai) => (s1) => {
    const [fai, s2] = ufai(s1);
    const [a, s3] = ua(s2);
    return [fai(a), s3];
  };
}

/**
 * Pass the A value in a State<S, A> into a function (a: A) => State<S, I>. This
 * results in a new State<S, I>.
 *
 * @example
 * ```ts
 * import * as S from "./state.ts";
 * import { pipe } from "./fn.ts";
 *
 * const state = pipe(
 *   S.id<number>(),
 *   S.flatmap(n => S.wrap(n + 1)),
 * );
 *
 * const result1 = state(1); // [2, 1]
 * const result2 = state(2); // [3, 2]
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, E, I>(
  fati: (a: A) => State<E, I>,
): (ta: State<E, A>) => State<E, I> {
  return (ta) => flow(ta, ([a, s]) => fati(a)(s));
}

/**
 * Extract the result value A by executing State<S, A> with an S value.
 *
 * @example
 * ```ts
 * import * as S from "./state.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   S.id<number>(),
 *   S.map(n => n + 1),
 *   S.evaluate(10),
 * ); // 11
 * ```
 *
 * @since 2.0.0
 */
export function evaluate<S>(s: S): <A>(ta: State<S, A>) => A {
  return (ta) => ta(s)[0];
}

/**
 * Extract the ending state value S by executing State<S, A> with an S value.
 *
 * @example
 * ```ts
 * import * as S from "./state.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = pipe(
 *   S.id<number>(),
 *   S.map(n => n + 1),
 *   S.execute(10),
 * ); // 10
 * ```
 *
 * @since 2.0.0
 */
export function execute<S>(s: S): <A>(ta: State<S, A>) => S {
  return (ta) => ta(s)[1];
}

/**
 * @since 2.0.0
 */
export function getCombinableState<E, A>(
  CE: Combinable<E>,
  CA: Combinable<A>,
): Combinable<State<E, A>> {
  return {
    combine: (second) => (first) => (e) => {
      const [fa, fe] = first(e);
      const [sa, se] = second(e);
      return [CA.combine(sa)(fa), CE.combine(se)(fe)];
    },
  };
}

/**
 * @since 2.0.0
 */
export function getInitializableState<E, A>(
  IE: Initializable<E>,
  IA: Initializable<A>,
): Initializable<State<E, A>> {
  return {
    init: () => (e) => [IA.init(), IE.combine(e)(IE.init())],
    ...getCombinableState(IE, IA),
  };
}

/**
 * @since 2.0.0
 */
export const ApplicableState: Applicable<KindState> = {
  apply,
  map,
  wrap,
};

/**
 * The canonical implementation of Flatmappable for State. It contains
 * the methods wrap, apply, map, join, and flatmap.
 *
 * @since 2.0.0
 */
export const FlatmappableState: Flatmappable<KindState> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const MappableState: Mappable<KindState> = { map };

/**
 * @since 2.0.0
 */
export const WrappableState: Wrappable<KindState> = { wrap };

/**
 * @since 2.0.0
 */
export const tap = createTap(FlatmappableState);

/**
 * @since 2.0.0
 */
export const bind = createBind(FlatmappableState);

/**
 * @since 2.0.0
 */
export const bindTo = createBindTo(MappableState);
