// deno-lint-ignore-file no-explicit-any

import type { Ord } from "./type_classes.ts";
import type { Fn } from "./types.ts";

import { setoidStrict } from "./setoid.ts";
import { flow } from "./fns.ts";

/*******************************************************************************
 * Internal
 ******************************************************************************/

// lte for primimtives
const _lte = (a: any) => (b: any): boolean => a <= b;

const _equals = setoidStrict.equals;

/*******************************************************************************
 * Types
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
 * Functions
 ******************************************************************************/

export function compare<A>(O: Ord<A>): Compare<A> {
  return (a, b) => O.lte(a)(b) ? O.equals(a)(b) ? 0 : -1 : 1;
}

export function lt<A>(O: Ord<A>): ((a: A) => (b: A) => boolean) {
  return (a) => {
    const _lte = O.lte(a);
    const _equals = O.equals(a);
    return (b) => _lte(b) && !_equals(b);
  };
}

export function gt<A>(O: Ord<A>): ((a: A) => (b: A) => boolean) {
  return (a) => {
    const _lte = O.lte(a);
    return (b) => !_lte(b);
  };
}

export function lte<A>(O: Ord<A>): ((a: A) => (b: A) => boolean) {
  return O.lte;
}

export function gte<A>(O: Ord<A>): ((a: A) => (b: A) => boolean) {
  return (a) => {
    const _lte = O.lte(a);
    const _equals = O.equals(a);
    return (b) => !_lte(b) || _equals(b);
  };
}

export function eq<A>(O: Ord<A>): (a: A) => (b: A) => boolean {
  return (a) => {
    const _equals = O.equals(a);
    return (b) => _equals(b);
  };
}

export function min<A>(O: Ord<A>): (a: A) => (b: A) => A {
  return (a) => {
    const _lte = O.lte(a);
    return (b) => _lte(b) ? a : b;
  };
}

export function max<A>(O: Ord<A>): (a: A) => (b: A) => A {
  return (a) => {
    const _lte = O.lte(a);
    return (b) => _lte(b) ? b : a;
  };
}

export function clamp<A>(O: Ord<A>): (low: A, high: A) => (a: A) => A {
  const _max = max(O);
  const _min = min(O);
  return (low, high) => {
    const _low = _max(low);
    const _high = _min(high);
    return flow(_low, _high);
  };
}

export function between<A>(O: Ord<A>): (low: A, high: A) => (a: A) => boolean {
  const _lt = lt(O);
  const _gt = gt(O);
  return (low, high) => {
    const _lower = _lt(high);
    const _higher = _gt(low);
    return (a) => _lower(a) && _higher(a);
  };
}

/*******************************************************************************
 * Function Getters
 ******************************************************************************/

export function getOrdUtilities<A>(O: Ord<A>) {
  return ({
    lt: lt(O),
    gt: gt(O),
    lte: lte(O),
    gte: gte(O),
    eq: eq(O),
    min: min(O),
    max: max(O),
    clamp: clamp(O),
    between: between(O),
    compare: compare(O),
  });
}
