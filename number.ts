import type * as T from "./types.ts";

export function equals(second: number): (first: number) => boolean {
  return (first) => first === second;
}

export function lte(right: number): (left: number) => boolean {
  return (left) => left <= right;
}

export function multiply(right: number): (left: number) => number {
  return (left) => left * right;
}

export function add(right: number): (left: number) => number {
  return (left) => left + right;
}

export function emptyZero(): number {
  return 0;
}

export function emptyOne(): number {
  return 1;
}

export const Setoid: T.Setoid<number> = { equals };

export const Ord: T.Ord<number> = {
  equals,
  lte,
};

export const SemigroupProduct: T.Semigroup<number> = {
  concat: multiply,
};

export const SemigroupSum: T.Semigroup<number> = {
  concat: add,
};

export const MonoidProduct: T.Monoid<number> = {
  concat: multiply,
  empty: emptyOne,
};
export const MonoidSum: T.Monoid<number> = {
  concat: add,
  empty: emptyZero,
};
