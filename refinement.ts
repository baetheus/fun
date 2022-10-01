import type { Option } from "./option.ts";
import type { Either } from "./either.ts";
import type { Refinement } from "./types.ts";

// TODO merge guard and refinement

export function fromOption<A, B extends A>(
  faob: (a: A) => Option<B>,
): Refinement<A, B> {
  return (a: A): a is B => faob(a).tag === "Some";
}

export function fromEither<A, B extends A>(
  faob: (a: A) => Either<unknown, B>,
): Refinement<A, B> {
  return (a: A): a is B => faob(a).tag === "Right";
}

export function or<A, C extends A>(right: Refinement<A, C>) {
  return <B extends A>(left: Refinement<A, B>): Refinement<A, B | C> =>
  (a: A): a is B | C => left(a) || right(a);
}

export function and<A, C extends A>(right: Refinement<A, C>) {
  return <B extends A>(left: Refinement<A, B>): Refinement<A, B & C> =>
  (a: A): a is B & C => left(a) && right(a);
}

export function compose<A, B extends A, C extends B>(right: Refinement<B, C>) {
  return (left: Refinement<A, B>): Refinement<A, C> => (a: A): a is C =>
    left(a) && right(a);
}
