import type { Semigroup } from "./semigroup.ts";

import { constant, pipe } from "./fns.ts";
import * as S from "./semigroup.ts";

/**
 * Monoid
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#monoid
 */
export interface Monoid<T> extends Semigroup<T> {
  readonly empty: () => T;
}

export const monoidAll: Monoid<boolean> = {
  concat: S.semigroupAll.concat,
  empty: constant(true),
};

export const monoidAny: Monoid<boolean> = {
  concat: S.semigroupAny.concat,
  empty: constant(false),
};

export const monoidSum: Monoid<number> = {
  concat: S.semigroupSum.concat,
  empty: constant(0),
};

export const monoidProduct: Monoid<number> = {
  concat: S.semigroupProduct.concat,
  empty: constant(1),
};

export const monoidString: Monoid<string> = {
  concat: S.semigroupString.concat,
  empty: constant(""),
};

export const monoidVoid: Monoid<void> = {
  concat: S.semigroupVoid.concat,
  empty: constant(undefined),
};

// deno-lint-ignore no-explicit-any
export function getTupleMonoid<T extends ReadonlyArray<Monoid<any>>>(
  ...monoids: T
): Monoid<{ [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never }> {
  const concat = S.getTupleSemigroup(...monoids).concat;
  return (({
    concat,
    empty: () => monoids.map((m) => m.empty()),
  }) as unknown) as Monoid<
    { [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never }
  >;
}

export function getDualMonoid<A>(M: Monoid<A>): Monoid<A> {
  return ({
    concat: S.getDualSemigroup(M).concat,
    empty: M.empty,
  });
}

// deno-lint-ignore no-explicit-any
export function getStructMonoid<O extends Record<string, any>>(
  monoids: { [K in keyof O]: Monoid<O[K]> },
): Monoid<{ readonly [K in keyof O]: O[K] }> {
  const empty: Record<string, O[keyof O]> = {};

  for (const key of Object.keys(monoids)) {
    empty[key] = monoids[key].empty();
  }

  return {
    concat: S.getStructSemigroup(monoids).concat,
    empty: () => (empty as unknown) as O,
  };
}

export function fold<A>(M: Monoid<A>): (as: ReadonlyArray<A>) => A {
  const innerFold = S.fold(M);
  return (as) => pipe(as, innerFold(M.empty()));
}
