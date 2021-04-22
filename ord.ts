// deno-lint-ignore-file no-explicit-any

import type { Ord } from "./type_classes.ts";
import type { Fn } from "./types.ts";

import { setoidStrict } from "./setoid.ts";
import { flow } from "./fns.ts";

/*******************************************************************************
 * Internal
 ******************************************************************************/

// lte for primmimtives
const _lte = (a: any) => (b: any): boolean => a <= b;

const _equals = setoidStrict.equals;

/*******************************************************************************
 * Models
 ******************************************************************************/

export type Ordering = -1 | 0 | 1;

export type Compare<A> = Fn<[A, A], Ordering>;

/*******************************************************************************
 * Module Instances
 ******************************************************************************/

export const ordString: Ord<string> = {
  equals: _equals,
  lte: _lte,
};

export const ordNumber: Ord<number> = {
  equals: _equals,
  lte: _lte,
};

export const ordBoolean: Ord<boolean> = {
  equals: _equals,
  lte: _lte,
};

/*******************************************************************************
 * Combinators
 ******************************************************************************/

export const compare = <A>(O: Ord<A>): Compare<A> =>
  (a, b) => O.lte(a)(b) ? O.equals(a)(b) ? 0 : -1 : 1;

export const lt = <A>(O: Ord<A>) =>
  (a: A) => (b: A): boolean => O.lte(a)(b) && !O.equals(a)(b);

export const gt = <A>(O: Ord<A>) => (a: A) => (b: A): boolean => !O.lte(a)(b);

export const lte = <A>(O: Ord<A>) => O.lte;

export const gte = <A>(O: Ord<A>) =>
  (a: A) => (b: A): boolean => !O.lte(a)(b) || O.equals(a)(b);

export const eq = <A>(O: Ord<A>) => (a: A) => (b: A): boolean => O.equals(a)(b);

export const min = <A>(O: Ord<A>) => (a: A) => (b: A): A => O.lte(a)(b) ? a : b;

export const max = <A>(O: Ord<A>) => (a: A) => (b: A): A => O.lte(a)(b) ? b : a;

export const clamp = <A>(O: Ord<A>) =>
  (low: A, high: A): ((a: A) => A) => flow(max(O)(low), min(O)(high));

export const between = <A>(O: Ord<A>) =>
  (low: A, high: A) => {
    const higher = lt(O)(low);
    const lower = gt(O)(high);

    return (a: A): boolean => lower(a) && higher(a);
  };

/*******************************************************************************
 * Combinator Getters
 ******************************************************************************/

export const getOrdUtilities = <A>(O: Ord<A>) => ({
  lt: lt(O),
  gt: gt(O),
  lte: lte(O),
  gte: gte(O),
  eq: eq(O),
  min: min(O),
  max: max(O),
  clamp: clamp(O),
  compare: compare(O),
});
