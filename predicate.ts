import type { In, Kind } from "./kind.ts";
import type { Contravariant } from "./contravariant.ts";
import type { Monoid } from "./monoid.ts";
import type { Semigroup } from "./semigroup.ts";

import { flow } from "./fn.ts";

// ---
// Types
// ---

/**
 * The Predicate<A> type is a function that takes some
 * value of type A and returns boolean, indicating
 * that a property is true or false for the value A.
 *
 * @example
 * ```ts
 * import type { Predicate } from "./predicate.ts";
 * import * as O from "./option.ts";
 *
 * function fromPredicate<A>(predicate: Predicate<A>) {
 *   return (a: A): O.Option<A> => predicate(a)
 *     ? O.some(a) : O.none;
 * }
 *
 * function isPositive(n: number): boolean {
 *   return n > 0;
 * }
 *
 * const isPos = fromPredicate(isPositive);
 *
 * const resultSome = isPos(1); // Some(1)
 * const resultNone = isPos(-1); // None
 * ```
 *
 * @since 2.0.0
 */
export type Predicate<A> = (a: A) => boolean;

export interface URI extends Kind {
  readonly kind: Predicate<In<this, 0>>;
}

// ---
// Combinators
// ---

export function contramap<I, A>(
  fia: (i: I) => A,
): (ua: Predicate<A>) => Predicate<I> {
  return (ua) => flow(fia, ua);
}

export function not<A>(predicate: Predicate<A>): Predicate<A> {
  return (a) => !predicate(a);
}

export function or<A>(right: Predicate<A>) {
  return (left: Predicate<A>): Predicate<A> => (a) => left(a) || right(a);
}

export function and<A>(right: Predicate<A>) {
  return (left: Predicate<A>): Predicate<A> => (a) => left(a) && right(a);
}

// ---
// Instances
// ---

export const ContravariantPredicate: Contravariant<URI> = { contramap };

// ---
// Instance Getters
// ---

export function getSemigroupAny<A = never>(): Semigroup<Predicate<A>> {
  return { concat: or };
}

export function getSemigroupAll<A = never>(): Semigroup<Predicate<A>> {
  return { concat: and };
}

export function getMonoidAny<A = never>(): Monoid<Predicate<A>> {
  return { concat: or, empty: () => () => false };
}

export function getMonoidAll<A = never>(): Monoid<Predicate<A>> {
  return { concat: and, empty: () => () => true };
}
