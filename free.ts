/**
 * This file contains the Free algebraic data type. Free is a data type that is
 * used primarily to create a Combinable for any given data structure. It is
 * useful when one wants to use combine things without deciding on a specific
 * data structure to implement.
 *
 * @experimental
 * @module Free
 * @since 2.0.0
 */

import type { Kind, Out } from "./kind.ts";
import type { Combinable } from "./combinable.ts";

import { flow, pipe } from "./fn.ts";

/**
 * @since 2.0.0
 */
export type Node<A> = {
  readonly tag: "Node";
  readonly value: A;
};

/**
 * @since 2.0.0
 */
export type Link<A> = {
  readonly tag: "Link";
  readonly first: Free<A>;
  readonly second: Free<A>;
};

/**
 * @since 2.0.0
 */
export type Free<A> = Node<A> | Link<A>;

/**
 * @since 2.0.0
 */
export interface KindFree extends Kind {
  readonly kind: Free<Out<this, 0>>;
}

/**
 * @since 2.0.0
 */
export function node<A>(value: A): Free<A> {
  return { tag: "Node", value };
}

/**
 * @since 2.0.0
 */
export function link<A>(
  first: Free<A>,
  second: Free<A>,
): Free<A> {
  return { tag: "Link", first, second };
}

/**
 * @since 2.0.0
 */
export function isNode<A>(ua: Free<A>): ua is Node<A> {
  return ua.tag === "Node";
}

/**
 * @since 2.0.0
 */
export function isLink<A>(ua: Free<A>): ua is Link<A> {
  return ua.tag === "Link";
}

/**
 * @since 2.0.0
 */
export function match<A, O>(
  onNode: (value: A) => O,
  onLink: (first: Free<A>, second: Free<A>) => O,
): (ua: Free<A>) => O {
  return (ua) => {
    switch (ua.tag) {
      case "Node":
        return onNode(ua.value);
      case "Link":
        return onLink(ua.first, ua.second);
    }
  };
}

/**
 * @since 2.0.0
 */
export function combine<A>(
  second: Free<A>,
): (first: Free<A>) => Free<A> {
  return (first) => ({ tag: "Link", first, second });
}

/**
 * @since 2.0.0
 */
export function wrap<A>(a: A): Free<A> {
  return node(a);
}

/**
 * @since 2.0.0
 */
export function map<A, I>(
  fai: (a: A) => I,
): (ua: Free<A>) => Free<I> {
  const go: (ua: Free<A>) => Free<I> = match(
    flow(fai, node),
    (first, second) => link(go(first), go(second)),
  );
  return go;
}

/**
 * @since 2.0.0
 */
export function flatmap<A, I>(
  faui: (a: A) => Free<I>,
): (ua: Free<A>) => Free<I> {
  const go: (ua: Free<A>) => Free<I> = match(
    faui,
    (first, second): Free<I> => link(go(first), go(second)),
  );
  return go;
}

/**
 * @since 2.0.0
 */
export function apply<A>(ua: Free<A>): <I>(ufai: Free<(a: A) => I>) => Free<I> {
  return (ufai) => pipe(ufai, flatmap(flow(map, (fn) => fn(ua))));
}

/**
 * @since 2.0.0
 */
export function fold<A, O>(
  foldr: (value: A, accumulator: O) => O,
  initial: O,
): (ua: Free<A>) => O {
  // :(
  let result = initial;
  const go: (ua: Free<A>) => O = match(
    (value) => {
      result = foldr(value, result);
      return result;
    },
    (first, second) => {
      go(first);
      return go(second);
    },
  );
  return go;
}

/**
 * @since 2.0.0
 */
export function getCombinable<A>(): Combinable<Free<A>> {
  return { combine };
}

// TODO: Showable, Sortable, Traversable
//
