// deno-lint-ignore-file no-explicit-any

import type { Setoid } from "./type_classes.ts";

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export function fromEquals<A>(equals: (x: A) => (y: A) => boolean): Setoid<A> {
  return ({ equals: (x) => (y) => x === y || equals(x)(y) });
}

/*******************************************************************************
 * Module Instances
 ******************************************************************************/

export const setoidStrict: Setoid<unknown> = {
  equals: (a) => (b) => a === b,
};

export const setoidString: Setoid<string> = setoidStrict;

export const setoidNumber: Setoid<number> = setoidStrict;

export const setoidBoolean: Setoid<boolean> = setoidStrict;

export const setoidDate: Setoid<Date> = {
  equals: (x) => (y) => x.valueOf() === y.valueOf(),
};

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

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
