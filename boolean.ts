import type { Monoid } from "./monoid.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Setoid } from "./setoid.ts";

export const constTrue = () => true;

export const constFalse = () => false;

export function not(ua: boolean): boolean {
  return !ua;
}

export function equals(right: boolean): (left: boolean) => boolean {
  return (left) => left === right;
}

export function or(right: boolean): (left: boolean) => boolean {
  return (left) => left || right;
}

export function and(right: boolean): (left: boolean) => boolean {
  return (left) => left && right;
}

export const SetoidBoolean: Setoid<boolean> = { equals };

export const SemigroupBooleanAll: Semigroup<boolean> = {
  concat: and,
};

export const SemigroupBooleanAny: Semigroup<boolean> = {
  concat: or,
};

export const MonoidBooleanAll: Monoid<boolean> = {
  concat: and,
  empty: constTrue,
};

export const MonoidBooleanAny: Monoid<boolean> = {
  concat: or,
  empty: constFalse,
};
