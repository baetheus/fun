import type {
  Contravariant,
  In,
  Kind,
  Monoid,
  Predicate,
  Semigroup,
} from "./types.ts";

import { flow } from "./fns.ts";

// ---
// Types
// ---

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
