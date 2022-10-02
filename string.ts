import type { Monoid } from "./monoid.ts";
import type { Ord } from "./ord.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Setoid } from "./setoid.ts";

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

export const SetoidString: Setoid<string> = { equals };

export const SemigroupString: Semigroup<string> = { concat };

export const MonoidString: Monoid<string> = { concat, empty };

export const OrdString: Ord<string> = { lte, equals };
