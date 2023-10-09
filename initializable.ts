/**
 * This file contains the type and utilities for the Initializable algebraic
 * data structure. A type that implements Initializable has a concept of "empty"
 * represented by the init method and a concept to combine represented by the
 * combine method. In other functional libraries and languages Initializable is
 * called Monoid.
 *
 * @module Initializable
 * @since 2.0.0
 */

import type { Combinable } from "./combinable.ts";
import type { AnyReadonlyRecord } from "./record.ts";

import * as C from "./combinable.ts";

/**
 * A Initializable structure has the method init.
 *
 * @since 2.0.0
 */
export interface Initializable<A> extends Combinable<A> {
  readonly init: () => A;
}

/**
 * A type for Initializable over any fixed value, useful as an extension target
 * for functions that take any Initializable and do not need to unwrap the
 * type.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyInitializable = Initializable<any>;

/**
 * A type level unwrapor, used to pull the inner type from a Combinable.
 *
 * @since 2.0.0
 */
export type TypeOf<T> = T extends Initializable<infer A> ? A : never;

/**
 * Create an Initializable fixed to a concrete value A. This operates like init
 * from Combinable in other functional libraries.
 *
 * @since 2.0.0
 */
export function constant<A>(value: A): Initializable<A> {
  return { init: () => value, combine: () => () => value };
}

/**
 * Create an Initializable fixed to a struct using nested Initializables to
 * create the init values within.
 *
 * @since 2.0.0
 */
export function struct<O extends AnyReadonlyRecord>(
  initializables: { [K in keyof O]: Initializable<O[K]> },
): Initializable<{ readonly [K in keyof O]: O[K] }> {
  type Entries = [keyof O, typeof initializables[keyof O]][];
  return ({
    init: () => {
      const r = {} as Record<keyof O, O[keyof O]>;
      for (const [key, { init }] of Object.entries(initializables) as Entries) {
        r[key] = init();
      }
      return r as { [K in keyof O]: O[K] };
    },
    ...C.struct(initializables),
  });
}

/**
 * Create an Initializable fixed to a tuple using nested Initializables to
 * create the init values within.
 *
 * @since 2.0.0
 */
export function tuple<T extends AnyInitializable[]>(
  ...initializables: T
): Initializable<{ readonly [K in keyof T]: TypeOf<T[K]> }> {
  return {
    init: () => initializables.map(({ init }) => init()),
    ...C.tuple(...initializables),
  } as Initializable<{ readonly [K in keyof T]: TypeOf<T[K]> }>;
}

/**
 * Create a dual Initializable from an existing initializable. This effectively
 * switches the order of application of the original Initializable.
 *
 * @example
 * ```ts
 * import { dual, getCombineAll, intercalcate } from "./initializable.ts";
 * import { InitializableString } from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const reverse = dual(InitializableString);
 * const reverseAll = pipe(
 *   reverse,
 *   intercalcate(" "),
 *   getCombineAll,
 * );
 *
 * const result = reverseAll("Hello", "World"); // "World Hello"
 * ```
 *
 * @since 2.0.0
 */
export function dual<A>(M: Initializable<A>): Initializable<A> {
  return ({
    combine: C.dual(M).combine,
    init: M.init,
  });
}

/**
 * Create a initializable that works like Array.join,
 * inserting middle between every two values
 * that are combineenated. This can have some interesting
 * results.
 *
 * @example
 * ```ts
 * import * as M from "./initializable.ts";
 * import * as S from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const { combine: toList } = pipe(
 *   S.InitializableString,
 *   M.intercalcate(", "),
 * );
 *
 * const list = pipe(
 *   "apples",
 *   toList("oranges"),
 *   toList("and bananas"),
 * ); // list === "apples, oranges, and bananas"
 * ```
 *
 * @since 2.0.0
 */
export function intercalcate<A>(middle: A) {
  return ({ combine, init }: Initializable<A>): Initializable<A> => ({
    combine: (second) => combine(combine(second)(middle)),
    init,
  });
}
/**
 * Given an Initializable, create a function that will
 * iterate through an array of values and combine
 * them. This is not much more than Array.fold(combine).
 *
 * @example
 * ```ts
 * import * as I from "./initializable.ts";
 * import * as N from "./number.ts";
 *
 * const sumAll = I.getCombineAll(N.InitializableNumberSum);
 *
 * const result = sumAll(1, 30, 80, 1000, 52, 42); // sum === 1205
 * ```
 *
 * @since 2.0.0
 */
export function getCombineAll<A>(
  { combine, init }: Initializable<A>,
): (...as: ReadonlyArray<A>) => A {
  const _combine = (first: A, second: A) => combine(second)(first);
  return (...as) => as.reduce(_combine, init());
}
