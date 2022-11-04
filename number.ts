import type { Monoid } from "./monoid.ts";
import type { Ord, Ordering } from "./ord.ts";
import type { Semigroup } from "./semigroup.ts";
import type { Eq } from "./eq.ts";
import type { Show } from "./show.ts";
import type { Newtype } from "./newtype.ts";

import * as O from "./ord.ts";
import { map, pipe } from "./fn.ts";

// TODO; Implement newtypes for natural, integer, rational

export type Natural = Newtype<"Natural", number>;

export type Integer = Newtype<"Integer", Natural>;

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

export function mod(second: number): (first: number) => number {
  return (first) => ((first % second) + second) % second;
}

export function divides(second: number): (first: number) => boolean {
  return pipe(mod(second), map(equals(0)));
}

export function compare(first: number, second: number): Ordering {
  return O.sign(first - second);
}

export function emptyZero(): number {
  return 0;
}

export function emptyOne(): number {
  return 1;
}

export const EqNumber: Eq<number> = { equals };

export const OrdNumber: Ord<number> = O.fromCompare(compare);

export const SemigroupNumberProduct: Semigroup<number> = {
  concat: multiply,
};

export const SemigroupNumberSum: Semigroup<number> = {
  concat: add,
};

export const SemigroupNumberMax: Semigroup<number> = {
  concat: O.max(OrdNumber),
};

export const SemigroupNumberMin: Semigroup<number> = {
  concat: O.min(OrdNumber),
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
