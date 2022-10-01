import type { Monoid, Semigroup } from "./types.ts";

import { pipe } from "./fns.ts";
import * as S from "./semigroup.ts";

// deno-lint-ignore no-explicit-any
export function tuple<T extends ReadonlyArray<Monoid<any>>>(
  ...monoids: T
): Monoid<
  { readonly [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never }
> {
  const concat = S.tuple(...monoids).concat;
  return (({
    concat,
    empty: () => monoids.map((m) => m.empty()),
  }) as unknown) as Monoid<
    { [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never }
  >;
}

export function dual<A>(M: Monoid<A>): Monoid<A> {
  return ({
    concat: S.dual(M).concat,
    empty: M.empty,
  });
}

// deno-lint-ignore no-explicit-any
export function struct<O extends Record<string, any>>(
  monoids: { [K in keyof O]: Monoid<O[K]> },
): Monoid<{ readonly [K in keyof O]: O[K] }> {
  const empty: Record<string, O[keyof O]> = {};

  for (const key of Object.keys(monoids)) {
    empty[key] = monoids[key].empty();
  }

  return {
    concat: S.struct(monoids).concat,
    empty: () => (empty as unknown) as O,
  };
}

export function concatAll<A>(M: Monoid<A>): (as: ReadonlyArray<A>) => A {
  const innerFold = S.concatAll(M);
  return (as) => pipe(as, innerFold(M.empty()));
}
