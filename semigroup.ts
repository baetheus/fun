import type { Ord } from "./ord.ts";

import { reduce } from "./array.ts";
import { constant, pipe } from "./fns.ts";

/**
 * Semigroup
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#semigroup
 */
export interface Semigroup<T> {
  readonly concat: (b: T) => (a: T) => T;
}

/** *****************************************************************************
 * Free Semigroup
 * @from https://raw.githubusercontent.com/gcanti/io-ts/master/src/FreeSemigroup.ts
 *
 * TODO(baetheus): Move to free.ts ??
 * *****************************************************************************/

export type Of<A> = {
  readonly tag: "Of";
  readonly value: A;
};

export type Concat<A> = {
  readonly tag: "Concat";
  readonly left: Free<A>;
  readonly right: Free<A>;
};

export type Free<A> = Of<A> | Concat<A>;

export const Free = {
  of: <A>(a: A): Free<A> => ({ tag: "Of", value: a }),
  concat: <A>(left: Free<A>) => (right: Free<A>): Free<A> => ({
    tag: "Concat",
    left,
    right,
  }),
  fold: <A, R>(
    onOf: (value: A) => R,
    onConcat: (left: Free<A>, right: Free<A>) => R,
  ) =>
  (f: Free<A>): R => {
    switch (f.tag) {
      case "Of":
        return onOf(f.value);
      case "Concat":
        return onConcat(f.left, f.right);
    }
  },
};

export const semigroupAll: Semigroup<boolean> = {
  concat: (x) => (y) => x && y,
};

export const semigroupAny: Semigroup<boolean> = {
  concat: (x) => (y) => x || y,
};

export const semigroupSum: Semigroup<number> = {
  concat: (x) => (y) => x + y,
};

export const semigroupProduct: Semigroup<number> = {
  concat: (x) => (y) => x * y,
};

export const semigroupString: Semigroup<string> = {
  concat: (x) => (y) => x + y,
};

export const semigroupVoid: Semigroup<void> = {
  concat: () => () => undefined,
};

export function getFreeSemigroup<A = never>(): Semigroup<Free<A>> {
  return ({ concat: Free.concat });
}

export function getFirstSemigroup<A = never>(): Semigroup<A> {
  return ({ concat: constant });
}

export function getLastSemigroup<A = never>(): Semigroup<A> {
  return ({ concat: (_) => (y) => y });
}

// deno-lint-ignore no-explicit-any
export function getTupleSemigroup<T extends ReadonlyArray<Semigroup<any>>>(
  ...semigroups: T
): Semigroup<{ [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never }> {
  type Return = { [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never };
  return ({
    concat: (x) => (y) =>
      semigroups.map((s, i) => s.concat(x[i])(y[i])) as unknown as Return,
  });
}

export function getDualSemigroup<A>(S: Semigroup<A>): Semigroup<A> {
  return ({ concat: (x) => (y) => S.concat(y)(x) });
}

// deno-lint-ignore no-explicit-any
export function getStructSemigroup<O extends Readonly<Record<string, any>>>(
  semigroups: { [K in keyof O]: Semigroup<O[K]> },
): Semigroup<O> {
  return ({
    concat: (x) => (y) => {
      const r = {} as Record<string, O[keyof O]>;
      for (const key of Object.keys(semigroups)) {
        r[key] = semigroups[key].concat(x[key])(y[key]);
      }
      return r as { [K in keyof O]: O[K] };
    },
  });
}

export function getMeetSemigroup<A>(O: Ord<A>): Semigroup<A> {
  return ({ concat: (b) => (a) => (O.lte(b)(a) ? a : b) });
}

export function getJoinSemigroup<A>(O: Ord<A>): Semigroup<A> {
  return ({ concat: (b) => (a) => (O.lte(b)(a) ? b : a) });
}

export function getConcatAll<A>(S: Semigroup<A>): (...as: [A, ...A[]]) => A {
  return (...as) => {
    const [head, ...tail] = as;
    return pipe(
      tail,
      reduce((left, right) => S.concat(left)(right), head),
    );
  };
}

export function fold<A>(
  S: Semigroup<A>,
): (startWith: A) => (as: ReadonlyArray<A>) => A {
  return (startWith) => (as) => as.reduce((a, c) => S.concat(c)(a), startWith);
}
