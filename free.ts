import type { Kind, Out } from "./kind.ts";
import type { Semigroup } from "./semigroup.ts";

// TODO: Implement any algebraic structures you can

export type One<A> = {
  readonly tag: "One";
  readonly value: A;
};

export type Two<A> = {
  readonly tag: "Two";
  readonly first: Free<A>;
  readonly second: Free<A>;
};

export type Free<A> = One<A> | Two<A>;

export interface URI extends Kind {
  readonly kind: Free<Out<this, 0>>;
}

export function one<A>(value: A): Free<A> {
  return { tag: "One", value };
}

export function two<A>(first: A, second: A): Free<A> {
  return { tag: "Two", first: one(first), second: one(second) };
}

export function match<A, O>(
  onOne: (value: A) => O,
  onTwo: (left: Free<A>, right: Free<A>) => O,
) {
  return (ta: Free<A>): O => {
    switch (ta.tag) {
      case "One":
        return onOne(ta.value);
      case "Two":
        return onTwo(ta.first, ta.second);
    }
  };
}

export function concat<A>(second: Free<A>): (first: Free<A>) => Free<A> {
  return (first) => ({ tag: "Two", first, second });
}

export function getSemigroup<A>(): Semigroup<Free<A>> {
  return { concat };
}
