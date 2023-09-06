import type { Kind, Out } from "./kind.ts";
import type { Combinable } from "./combinable.ts";

import {} from "./array.ts";
import {} from "./record.ts";
import { flow, pipe } from "./fn.ts";

export type Node<A> = {
  readonly tag: "Node";
  readonly value: A;
};

export type Link<A> = {
  readonly tag: "Link";
  readonly first: Free<A>;
  readonly second: Free<A>;
};

export type Free<A> = Node<A> | Link<A>;

export interface KindFree extends Kind {
  readonly kind: Free<Out<this, 0>>;
}

export function node<A>(value: A): Free<A> {
  return { tag: "Node", value };
}

export function link<A>(
  first: Free<A>,
  second: Free<A>,
): Free<A> {
  return { tag: "Link", first, second };
}

export function isNode<A>(ua: Free<A>): ua is Node<A> {
  return ua.tag === "Node";
}

export function isLink<A>(ua: Free<A>): ua is Link<A> {
  return ua.tag === "Link";
}

export function match<A, O>(
  onNode: (value: A) => O,
  onLink: (first: Free<A>, second: Free<A>) => O,
) {
  return (ta: Free<A>): O => {
    switch (ta.tag) {
      case "Node":
        return onNode(ta.value);
      case "Link":
        return onLink(ta.first, ta.second);
    }
  };
}

export function combine<A>(
  second: Free<A>,
): (first: Free<A>) => Free<A> {
  return (first) => ({ tag: "Link", first, second });
}

export function wrap<A>(a: A): Free<A> {
  return node(a);
}

export function map<A, I>(
  fai: (a: A) => I,
): (ua: Free<A>) => Free<I> {
  const go: (ua: Free<A>) => Free<I> = match(
    flow(fai, node),
    (first, second) => link(go(first), go(second)),
  );
  return go;
}

export function flatmap<A, I>(
  faui: (a: A) => Free<I>,
): (ua: Free<A>) => Free<I> {
  const go: (ua: Free<A>) => Free<I> = match(
    faui,
    (first, second): Free<I> => link(go(first), go(second)),
  );
  return go;
}

export function apply<A>(ua: Free<A>): <I>(ufai: Free<(a: A) => I>) => Free<I> {
  return (ufai) => pipe(ufai, flatmap(flow(map, (fn) => fn(ua))));
}

export function reduce<A, O>(
  reducer: (value: A, accumulator: O) => O,
  initial: O,
): (ua: Free<A>) => O {
  // :(
  let result = initial;
  const go: (ua: Free<A>) => O = match(
    (value) => {
      result = reducer(value, result);
      return result;
    },
    (first, second) => {
      go(first);
      return go(second);
    },
  );
  return go;
}

export function getCombinable<A>(): Combinable<Free<A>> {
  return { combine };
}

// TODO: Showable, Sortable, Traversable
