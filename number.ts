import type { Monoid, Ord, Semigroup, Setoid, Show } from "./types.ts";

// TODO; Implement newtypes for natural, integer, rational

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

export const SetoidNumber: Setoid<number> = { equals };

export const OrdNumber: Ord<number> = {
  equals,
  lte,
};

export const SemigroupNumberProduct: Semigroup<number> = {
  concat: multiply,
};

export const SemigroupNumberSum: Semigroup<number> = {
  concat: add,
};

export const SemigroupNumberMax: Semigroup<number> = {
  concat: (right) => (left) => right > left ? right : left,
};

export const SemigroupNumberMin: Semigroup<number> = {
  concat: (right) => (left) => right < left ? right : left,
};

export const MonoidNumberProduct: Monoid<number> = {
  concat: multiply,
  empty: emptyOne,
};

export const MonoidNumberSum: Monoid<number> = {
  concat: add,
  empty: emptyZero,
};

export const MonoidNumberMax: Monoid<number> = {
  concat: SemigroupNumberMax.concat,
  empty: () => Number.NEGATIVE_INFINITY,
};

export const MonoidNumberMin: Monoid<number> = {
  concat: SemigroupNumberMax.concat,
  empty: () => Number.POSITIVE_INFINITY,
};

export const ShowNumber: Show<number> = {
  show: String,
};
