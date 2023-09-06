/**
 * This file contains a collection of utilities and
 * algebraic structure implementations for Tree.
 *
 * @module Tree
 * @since 2.0.0
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Comparable, Compare } from "./comparable.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { Mappable } from "./mappable.ts";
import type { Showable } from "./showable.ts";
import type { Traversable } from "./traversable.ts";

import { TraversableArray } from "./array.ts";
import { fromCompare } from "./comparable.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";
import { flow, pipe } from "./fn.ts";

/**
 * A Forest is an array of Trees.
 *
 * @since 2.0.0
 */
export type Forest<A> = ReadonlyArray<Tree<A>>;

/**
 * A Tree is a node with a single value and a Forest of children.
 *
 * @since 2.0.0
 */
export type Tree<A> = {
  readonly value: A;
  readonly forest: Forest<A>;
};

/**
 * AnyTree is useful as an extends constraint on a generic type.
 *
 * @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyTree = Tree<any>;

/**
 * TypeOf is a type extractor that returns the inner type A of a Tree<A>.
 *
 * @since 2.0.0
 */
export type TypeOf<T> = T extends Tree<infer A> ? A : never;

/**
 * KindTree is the Kind implementation for a Tree.
 *
 * @since 2.0.0
 */
export interface KindTree extends Kind {
  readonly kind: Tree<Out<this, 0>>;
}

/**
 * This is an internal draw function used to draw an ascii representation of a
 * tree.
 *
 * @since 2.0.0
 */
function drawString(indentation: string, forest: Forest<string>): string {
  let r = "";
  const len = forest.length;
  let tree: Tree<string>;
  for (let i = 0; i < len; i++) {
    tree = forest[i];
    const isLast = i === len - 1;
    r += indentation + (isLast ? "└" : "├") + "─ " + tree.value;
    r += drawString(
      indentation + (len > 1 && !isLast ? "│  " : "   "),
      tree.forest,
    );
  }
  return r;
}

/**
 * This is a constructor function, taking a single value A and optionally an
 * array of Tree<A> and returning a Tree<A>.
 *
 * @since 2.0.0
 */
export function tree<A>(value: A, forest: Forest<A> = []): Tree<A> {
  return ({ value, forest });
}

/**
 * The wrap function for Wrappable<KindTree>.
 *
 * @since 2.0.0
 */
export function wrap<A>(value: A, forest: Forest<A> = []): Tree<A> {
  return tree(value, forest);
}

/**
 * The map function for Mappable<KindTree>.
 *
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ta: Tree<A>) => Tree<I> {
  return (ta) => wrap(fai(ta.value), ta.forest.map(map(fai)));
}

/**
 * The flatmap function for Flatmappable<KindTree>.
 *
 * @since 2.0.0
 */
export function flatmap<A, I>(
  fati: (a: A) => Tree<I>,
): (ta: Tree<A>) => Tree<I> {
  return (ta) => {
    const { value, forest } = fati(ta.value);
    return wrap(value, [...ta.forest.map(flatmap(fati)), ...forest]);
  };
}

/**
 * The apply function for Applicable<KindTree>.
 *
 * @since 2.0.0
 */
export function apply<A>(ua: Tree<A>): <I>(tfai: Tree<(a: A) => I>) => Tree<I> {
  return (ufai) => pipe(ufai, flatmap(flow(map, (fn) => fn(ua))));
}

/**
 * The reduce function for Reducible<KindTree>.
 *
 * @since 2.0.0
 */
export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: Tree<A>) => O {
  const reducer = (result: O, tree: Tree<A>) => reduce(foao, result)(tree);
  return (ta) => TraversableArray.reduce(reducer, foao(o, ta.value))(ta.forest);
}

/**
 * The traverse function for Traversable<KindTree>.
 *
 * @since 2.0.0
 */
export function traverse<V extends Kind>(
  V: Applicable<V>,
): <A, I, J = never, K = never, L = unknown, M = unknown>(
  favi: (a: A) => $<V, [I, J, K], [L], [M]>,
) => (ta: Tree<A>) => $<V, [Tree<I>, J, K], [L], [M]> {
  const traverseArray = TraversableArray.traverse(V);
  return <A, I, J = never, K = never, L = unknown, M = unknown>(
    favi: (a: A) => $<V, [I, J, K], [L], [M]>,
  ): (ua: Tree<A>) => $<V, [Tree<I>, J, K], [L], [M]> => {
    const pusher: (i: I) => (is: Forest<I>) => Tree<I> = (i) => (fs) =>
      tree(i, fs);
    const wrappedPusher = V.wrap<typeof pusher, J, K, L, M>(pusher);
    const traverseTree = (ua: Tree<A>): $<V, [Tree<I>, J, K], [L], [M]> =>
      pipe(
        wrappedPusher,
        V.apply(favi(ua.value)),
        V.apply(traverseForest(ua.forest)),
      );
    const traverseForest = traverseArray(traverseTree);
    return traverseTree;
  };
}

/**
 * The unwrap function for Unwrappable<KindTree>
 *
 * @since 2.0.0
 */
export function unwrap<A>({ value }: Tree<A>): A {
  return value;
}

/**
 * Converts a Forest<string> into a tree representation.
 *
 * @since 2.0.0
 */
export function drawForest(forest: Forest<string>): string {
  return drawString("\n", forest);
}

/**
 * Converts a Tree<string> into a tree representation.
 *
 * @since 2.0.0
 */
export function drawTree(tree: Tree<string>): string {
  return tree.value + drawForest(tree.forest);
}

/**
 * The match function is a recursive fold that collapses a Tree<A> into a single
 * value I. It does this from the head of the Tree first.
 *
 * @since 2.0.0
 */
export function match<A, I>(
  fai: (a: A, is: Array<I>) => I,
): (ta: Tree<A>) => I {
  const go = (tree: Tree<A>): I => fai(tree.value, tree.forest.map(go));
  return go;
}

/**
 * Create an instance of Comparable<Tree<A>> from an instance of Comparable<A>.
 *
 * @since 2.0.0
 */
export function getComparableTree<A>(
  { compare }: Comparable<A>,
): Comparable<Tree<A>> {
  const go: Compare<Tree<A>> = (second) => (first) => {
    if (first === second) {
      return true;
    } else if (
      compare(second.value)(first.value) &&
      first.forest.length === second.forest.length
    ) {
      return first.forest.every((tree, index) =>
        go(second.forest[index])(tree)
      );
    } else {
      return false;
    }
  };

  return fromCompare(go);
}

/**
 * Get an instance of Showable<Tree<A>> from an instance of Showable<A>.
 *
 * @since 2.0.0
 */
export function getShowable<A>({ show }: Showable<A>): Showable<Tree<A>> {
  return ({ show: flow(map(show), drawTree) });
}

/**
 * @since 2.0.0
 */
export const ApplicableTree: Applicable<KindTree> = { apply, map, wrap };

/**
 * @since 2.0.0
 */
export const FlatmappableTree: Flatmappable<KindTree> = {
  apply,
  map,
  flatmap,
  wrap,
};

export const MappableTree: Mappable<KindTree> = { map };

/**
 * @since 2.0.0
 */
export const TraversableTree: Traversable<KindTree> = { map, reduce, traverse };

/**
 * @since 2.0.0
 */
export const tap = createTap(FlatmappableTree);

/**
 * @since 2.0.0
 */
export const bind = createBind(FlatmappableTree);

/**
 * @since 2.0.0
 */
export const bindTo = createBindTo(MappableTree);
