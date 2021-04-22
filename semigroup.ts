// deno-lint-ignore-file no-explicit-any

import type { Ord, Semigroup } from "./type_classes.ts";

import { constant } from "./fns.ts";

/*******************************************************************************
 * Free Semigroup
 * @from https://raw.githubusercontent.com/gcanti/io-ts/master/src/FreeSemigroup.ts
 ******************************************************************************/

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
  concat: <A>(left: Free<A>) =>
    (right: Free<A>): Free<A> => ({
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

/*******************************************************************************
 * Module Instances
 ******************************************************************************/

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

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getFreeSemigroup = <A = never>(): Semigroup<Free<A>> => ({
  concat: Free.concat,
});

export const getFirstSemigroup = <A = never>(): Semigroup<A> => ({
  concat: constant,
});

export const getLastSemigroup = <A = never>(): Semigroup<A> => ({
  concat: (_) => (y) => y,
});

export const getTupleSemigroup = <T extends ReadonlyArray<Semigroup<any>>>(
  ...semigroups: T
): Semigroup<
  { [K in keyof T]: T[K] extends Semigroup<infer A> ? A : never }
> => ({
  concat: (x) => (y) => semigroups.map((s, i) => s.concat(x[i])(y[i])) as any,
});

export const getDualSemigroup = <A>(S: Semigroup<A>): Semigroup<A> => ({
  concat: (x) => (y) => S.concat(y)(x),
});

export const getStructSemigroup = <O extends Readonly<Record<string, any>>>(
  semigroups: { [K in keyof O]: Semigroup<O[K]> },
): Semigroup<O> => ({
  concat: (x) =>
    (y) => {
      const r: any = {};
      for (const key of Object.keys(semigroups)) {
        r[key] = semigroups[key].concat(x[key])(y[key]);
      }
      return r;
    },
});

export const getMeetSemigroup = <A>(O: Ord<A>): Semigroup<A> => ({
  concat: (a) => (b) => (O.lte(a)(b) ? a : b),
});

export const getJoinSemigroup = <A>(O: Ord<A>): Semigroup<A> => ({
  concat: (a) => (b) => (O.lte(a)(b) ? b : a),
});

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const fold = <A>(S: Semigroup<A>) =>
  (startWith: A) =>
    (as: ReadonlyArray<A>): A => as.reduce((a, c) => S.concat(a)(c), startWith);
