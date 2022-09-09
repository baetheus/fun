// deno-lint-ignore-file no-explicit-any

/**
 * Setoid
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#setoid
 */
export interface Setoid<T> {
  readonly equals: (a: T) => (b: T) => boolean;
}

export function fromEquals<A>(equals: (x: A) => (y: A) => boolean): Setoid<A> {
  return ({ equals: (x) => (y) => x === y || equals(x)(y) });
}

export function getStructSetoid<O extends Readonly<Record<string, any>>>(
  eqs: { [K in keyof O]: Setoid<O[K]> },
): Setoid<O> {
  return fromEquals((x) =>
    (y) => {
      for (const key in eqs) {
        if (!eqs[key].equals(x[key])(y[key])) {
          return false;
        }
      }
      return true;
    }
  );
}

export function getTupleSetoid<T extends ReadonlyArray<Setoid<any>>>(
  ...eqs: T
): Setoid<{ [K in keyof T]: T[K] extends Setoid<infer A> ? A : never }> {
  return fromEquals((x) => (y) => eqs.every((E, i) => E.equals(x[i])(y[i])));
}

export function getValueOfSetoid<A extends { valueOf: () => any }>(): Setoid<
  A
> {
  return {
    equals: (second) => (first) => first.valueOf() === second.valueOf(),
  };
}
