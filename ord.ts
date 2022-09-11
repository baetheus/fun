import type { Setoid } from "./setoid.ts";

import { flow, lessThanOrEqual, strictEquals } from "./fns.ts";

/**
 * Ord
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#ord
 */
export type Ord<T> = Setoid<T> & {
  readonly lte: (a: T) => (b: T) => boolean;
};

export type Ordering = -1 | 0 | 1;

export type Compare<A> = (left: A, right: A) => Ordering;

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

export function toCompare<A>(O: Ord<A>): Compare<A> {
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
    compare: toCompare(O),
  });
}

/**
 * Derives an `Ord` instance from a `compare` function for the same type.
 *
 * @example
 * ```ts
 * import { type Compare, fromCompare, ordString, toCompare } from "./ord.ts";
 * const compareFoo: Compare<{ foo: string }> = (a, b) =>
 *   toCompare(ordString)(a.foo, b.foo);
 * const a = { foo: "bar" };
 * const b = { foo: "bar" };
 * const c = { foo: "baz" };
 *
 * const ordFoo = fromCompare(compareFoo);
 *
 * ordFoo.equals(a)(a); // true
 * ordFoo.equals(a)(b); // true
 * ordFoo.equals(a)(c); // false
 * ordFoo.lte(c)(b); // true
 * ordFoo.lte(b)(c); // false
 * ```
 *
 * @category constructors
 */
export function fromCompare<A>(compare: Compare<A>): Ord<A> {
  return {
    equals: (b) => (a) => a === b || compare(a, b) === 0,
    lte: (b) => (a) => compare(a, b) <= 0,
  };
}

/**
 * Derives an `Ord` instance for tuple type using a tuple of `Ord` instances.
 *
 * @example
 * ```ts
 * import { createOrdTuple, ordNumber, ordString, toCompare } from "./ord.ts";
 *
 * const ordTuple = createOrdTuple(ordString, ordNumber);
 * // Ord<readonly [string, number, boolean]>
 *
 * toCompare(ordTuple)(["y", 1], ["z", 1]); // -1
 * toCompare(ordTuple)(["y", 1], ["y", 2]); // -1
 * toCompare(ordTuple)(["y", 1], ["y", 1]); // 0
 * toCompare(ordTuple)(["y", 1], ["y", 0]); // 1
 * toCompare(ordTuple)(["y", 1], ["x", 1]); // 1
 * ```
 *
 * @category combinators
 */
export function createOrdTuple<T extends ReadonlyArray<unknown>>(
  ...ords: { [K in keyof T]: Ord<T[K]> }
): Ord<Readonly<T>> {
  const compares = ords.map(toCompare);
  return fromCompare((a, b) => {
    for (let i = 0; i < ords.length; i++) {
      const ordering = compares[i](a[i], b[i]);
      if (ordering) return ordering;
    }
    return 0;
  });
}

/**
 * Derives an instance of `Ord<A>` using a function from `A` to `B` and an
 * instance of `Ord<B>`.
 *
 * @example
 * ```ts
 * import { contramap, ordNumber, toCompare } from "./ord.ts";
 * const ordFoo = contramap((foo: { foo: number }) => foo.foo)(ordNumber);
 *
 * toCompare(ordFoo)({ foo: 1 }, { foo: 0 }); // 1
 * toCompare(ordFoo)({ foo: 1 }, { foo: 1 }); // 0
 * toCompare(ordFoo)({ foo: 1 }, { foo: 2 }); // -1
 * ```
 *
 * @category contravariant
 */
export function contramap<A, B>(fab: (a: A) => B): (ordB: Ord<B>) => Ord<A> {
  return (ordB) => fromCompare((a1, a2) => toCompare(ordB)(fab(a1), fab(a2)));
}
