import * as __ from "./kind.ts";

export type One<A> = {
  readonly tag: "One";
  readonly value: A;
};

export type Two<A> = {
  readonly tag: "Two";
  readonly left: Free<A>;
  readonly right: Free<A>;
};

export type Free<A> = One<A> | Two<A>;

export const URI = "Free";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Free<_[0]>;
  }
}

export function one<A>(value: A): Free<A> {
  return { tag: "One", value };
}

export function two<A>(left: A, right: A): Free<A> {
  return { tag: "Two", left: one(left), right: one(right) };
}

export function fold<A, O>(
  onOne: (value: A) => O,
  onTwo: (left: Free<A>, right: Free<A>) => O,
) {
  return (ta: Free<A>): O => {
    switch (ta.tag) {
      case "One":
        return onOne(ta.value);
      case "Two":
        return onTwo(ta.left, ta.right);
    }
  };
}
