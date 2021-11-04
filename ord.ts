import type { Setoid } from "./setoid.ts";
import type { Fn } from "./types.ts";

import { flow, lessThanOrEqual, strictEquals } from "./fns.ts";

/**
 * Ord
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#ord
 */
export interface Ord<T> extends Setoid<T> {
  readonly lte: (a: T) => (b: T) => boolean;
}

export type Ordering = -1 | 0 | 1;

export type Compare<A> = Fn<[A, A], Ordering>;

export const ordString: Ord<string> = {
  equals: strictEquals,
  lte: lessThanOrEqual,
};

export const ordNumber: Ord<number> = {
  equals: strictEquals,
  lte: lessThanOrEqual,
};

export const ordBoolean: Ord<boolean> = {
  equals: strictEquals,
  lte: lessThanOrEqual,
};

export function compare<A>(O: Ord<A>): Compare<A> {
  return (a, b) => {
    if (O.equals(b)(a)) {
      return 0;
    } else if (O.lte(b)(a)) {
      return -1;
    } else {
      return 1;
    }
  };
}

export function lt<A>(O: Ord<A>): (b: A) => (a: A) => boolean {
  return (b) => {
    const _lte = O.lte(b);
    const _equals = O.equals(b);
    return (a) => _lte(a) && !_equals(a);
  };
}

export function gt<A>(O: Ord<A>): (b: A) => (a: A) => boolean {
  return (b) => {
    const _lte = O.lte(b);
    return (a) => !_lte(a);
  };
}

export function lte<A>(O: Ord<A>): (b: A) => (a: A) => boolean {
  return O.lte;
}

export function gte<A>(O: Ord<A>): (b: A) => (a: A) => boolean {
  return (b) => {
    const _lte = O.lte(b);
    const _equals = O.equals(b);
    return (a) => !_lte(a) || _equals(a);
  };
}

export function eq<A>(O: Ord<A>): (b: A) => (a: A) => boolean {
  return (b) => {
    const _equals = O.equals(b);
    return (a) => _equals(a);
  };
}

export function min<A>(O: Ord<A>): (b: A) => (a: A) => A {
  return (b) => {
    const _lte = O.lte(b);
    return (a) => _lte(a) ? a : b;
  };
}

export function max<A>(O: Ord<A>): (b: A) => (a: A) => A {
  return (b) => {
    const _lte = O.lte(b);
    return (a) => _lte(a) ? b : a;
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
