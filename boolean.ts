import type * as T from "./types.ts";

export const constTrue = () => true;

export const constFalse = () => false;

export function equals(right: boolean): (left: boolean) => boolean {
  return (left) => left === right;
}

export function or(right: boolean): (left: boolean) => boolean {
  return (left) => left || right;
}

export function and(right: boolean): (left: boolean) => boolean {
  return (left) => left && right;
}

export const Setoid: T.Setoid<boolean> = { equals };

export const SemigroupAll: T.Semigroup<boolean> = {
  concat: and,
};

export const SemigroupAny: T.Semigroup<boolean> = {
  concat: or,
};

export const MonoidAll: T.Monoid<boolean> = {
  concat: and,
  empty: constTrue,
};

export const MonoidAny: T.Monoid<boolean> = {
  concat: or,
  empty: constFalse,
};
