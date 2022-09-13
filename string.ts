import type * as T from "./types.ts";

export function equals(second: string): (first: string) => boolean {
  return (first) => first === second;
}

export function lte(right: string): (left: string) => boolean {
  return (left) => left <= right;
}

export function concat(right: string): (left: string) => string {
  return (left) => `${left}${right}`;
}

export function empty(): string {
  return "";
}

export const Setoid: T.Setoid<string> = { equals };

export const Semigroup: T.Semigroup<string> = { concat };

export const Monoid: T.Monoid<string> = { concat, empty };

export const Ord: T.Ord<string> = { lte, equals };
