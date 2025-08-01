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
 * A Node represents a single value in the Free structure.
 *
 * @since 2.0.0
 */
export type Node<A> = {
  readonly tag: "Node";
  readonly value: A;
};

/**
 * A Link represents a combination of two Free structures.
 *
 * @since 2.0.0
 */
export type Link<A> = {
  readonly tag: "Link";
  readonly first: Free<A>;
  readonly second: Free<A>;
};

/**
 * The Free type represents either a Node (single value) or a Link (combination of two Free structures).
 *
 * @since 2.0.0
 */
export type Free<A> = Node<A> | Link<A>;

/**
 * Specifies Free as a Higher Kinded Type, with covariant
 * parameter A corresponding to the 0th index of any substitutions.
 *
 * @since 2.0.0
 */
export interface KindFree extends Kind {
  readonly kind: Free<Out<this, 0>>;
}

/**
 * Create a Node containing a single value.
 *
 * @example
 * ```ts
 * import { node } from "./free.ts";
 *
 * const singleValue = node(42);
 * console.log(singleValue); // { tag: "Node", value: 42 }
 * ```
 *
 * @since 2.0.0
 */
export function node<A>(value: A): Free<A> {
  return { tag: "Node", value };
}

/**
 * Create a Link combining two Free structures.
 *
 * @example
 * ```ts
 * import { link, node } from "./free.ts";
 *
 * const first = node(1);
 * const second = node(2);
 * const combined = link(first, second);
 * console.log(combined); // { tag: "Link", first: { tag: "Node", value: 1 }, second: { tag: "Node", value: 2 } }
 * ```
 *
 * @since 2.0.0
 */
export function link<A>(
  first: Free<A>,
  second: Free<A>,
): Free<A> {
  return { tag: "Link", first, second };
}

/**
 * Check if a Free structure is a Node.
 *
 * @example
 * ```ts
 * import { isNode, node, link } from "./free.ts";
 *
 * const single = node(1);
 * const combined = link(node(1), node(2));
 *
 * console.log(isNode(single)); // true
 * console.log(isNode(combined)); // false
 * ```
 *
 * @since 2.0.0
 */
export function isNode<A>(ua: Free<A>): ua is Node<A> {
  return ua.tag === "Node";
}

/**
 * Check if a Free structure is a Link.
 *
 * @example
 * ```ts
 * import { isLink, node, link } from "./free.ts";
 *
 * const single = node(1);
 * const combined = link(node(1), node(2));
 *
 * console.log(isLink(single)); // false
 * console.log(isLink(combined)); // true
 * ```
 *
 * @since 2.0.0
 */
export function isLink<A>(ua: Free<A>): ua is Link<A> {
  return ua.tag === "Link";
}

/**
 * Pattern match on a Free structure to extract values.
 *
 * @example
 * ```ts
 * import { match, node, link } from "./free.ts";
 *
 * const matcher = match(
 *   (value) => `Single value: ${value}`,
 *   (first, second) => `Combined: ${first} and ${second}`
 * );
 *
 * const single = node(42);
 * const combined = link(node(1), node(2));
 *
 * console.log(matcher(single)); // "Single value: 42"
 * console.log(matcher(combined)); // "Combined: [object Object] and [object Object]"
 * ```
 *
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
 * Combine two Free structures.
 *
 * @example
 * ```ts
 * import { combine, node } from "./free.ts";
 * import { pipe } from "./fn.ts";
 *
 * const first = node(1);
 * const second = node(2);
 * const combined = pipe(first, combine(second));
 *
 * console.log(combined.tag); // "Link"
 * ```
 *
 * @since 2.0.0
 */
export function combine<A>(
  second: Free<A>,
): (first: Free<A>) => Free<A> {
  return (first) => ({ tag: "Link", first, second });
}

/**
 * Wrap a value in a Free structure.
 *
 * @example
 * ```ts
 * import { wrap } from "./free.ts";
 *
 * const wrapped = wrap("Hello");
 * console.log(wrapped); // { tag: "Node", value: "Hello" }
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A>(a: A): Free<A> {
  return node(a);
}

/**
 * Apply a function to the value in a Free structure.
 *
 * @example
 * ```ts
 * import { map, node } from "./free.ts";
 * import { pipe } from "./fn.ts";
 *
 * const free = node(5);
 * const doubled = pipe(
 *   free,
 *   map(n => n * 2)
 * );
 *
 * console.log(doubled); // { tag: "Node", value: 10 }
 * ```
 *
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
 * Chain Free computations together.
 *
 * @example
 * ```ts
 * import { flatmap, node } from "./free.ts";
 * import { pipe } from "./fn.ts";
 *
 * const free = node(5);
 * const chained = pipe(
 *   free,
 *   flatmap(n => node(n * 2))
 * );
 *
 * console.log(chained); // { tag: "Node", value: 10 }
 * ```
 *
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
 * Apply a function wrapped in a Free to a value wrapped in a Free.
 *
 * @example
 * ```ts
 * import { apply, node } from "./free.ts";
 * import { pipe } from "./fn.ts";
 *
 * const freeFn = node((n: number) => n * 2);
 * const freeValue = node(5);
 * const result = pipe(
 *   freeValue,
 *   apply(freeFn)
 * );
 *
 * console.log(result); // { tag: "Node", value: 10 }
 * ```
 *
 * @since 2.0.0
 */
export function apply<A>(ua: Free<A>): <I>(ufai: Free<(a: A) => I>) => Free<I> {
  return (ufai) => pipe(ufai, flatmap(flow(map, (fn) => fn(ua))));
}

/**
 * Fold over a Free structure to produce a single value.
 *
 * @example
 * ```ts
 * import { fold, node, link } from "./free.ts";
 * import { pipe } from "./fn.ts";
 *
 * const free = link(node(1), node(2));
 * const sum = pipe(
 *   free,
 *   fold(
 *     (value, acc) => value + acc,
 *     0
 *   )
 * );
 *
 * console.log(sum); // 3
 * ```
 *
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
 * Create a Combinable instance for Free.
 *
 * @example
 * ```ts
 * import { getCombinable, node } from "./free.ts";
 * import { pipe } from "./fn.ts";
 *
 * const combinable = getCombinable<number>();
 * const first = node(1);
 * const second = node(2);
 * const combined = pipe(first, combinable.combine(second));
 *
 * console.log(combined.tag); // "Link"
 * ```
 *
 * @since 2.0.0
 */
export function getCombinable<A>(): Combinable<Free<A>> {
  return { combine };
}

// TODO: Showable, Sortable, Traversable
//
