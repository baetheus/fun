/**
 * This file contains a collection of utilities and algebraic structure
 * implementations for Tree.
 *
 * @module Tree
 * @since 2.0.0
 */

import type { $, Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Comparable, Compare } from "./comparable.ts";
import type { Bind, Flatmappable, Tap } from "./flatmappable.ts";
import type { Foldable } from "./foldable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Showable } from "./showable.ts";
import type { Traversable } from "./traversable.ts";
import type { Wrappable } from "./wrappable.ts";

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
 * @example
 * ```ts
 * import { tree } from "./tree.ts";
 *
 * const leaf = tree("leaf");
 * const node = tree("root", [leaf]);
 * console.log(node); // { value: "root", forest: [{ value: "leaf", forest: [] }] }
 * ```
 *
 * @since 2.0.0
 */
export function tree<A>(value: A, forest: Forest<A> = []): Tree<A> {
  return ({ value, forest });
}

/**
 * The wrap function for Wrappable<KindTree>.
 *
 * @example
 * ```ts
 * import { wrap } from "./tree.ts";
 *
 * const wrapped = wrap(42);
 * console.log(wrapped); // { value: 42, forest: [] }
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A>(value: A, forest: Forest<A> = []): Tree<A> {
  return tree(value, forest);
}

/**
 * Apply a function to the value in a Tree.
 *
 * @example
 * ```ts
 * import { map, tree } from "./tree.ts";
 * import { pipe } from "./fn.ts";
 *
 * const tree1 = tree(5, [tree(3), tree(7)]);
 * const doubled = pipe(
 *   tree1,
 *   map(n => n * 2)
 * );
 * console.log(doubled); // { value: 10, forest: [{ value: 6, forest: [] }, { value: 14, forest: [] }] }
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ta: Tree<A>) => Tree<I> {
  return (ta) => tree(fai(ta.value), ta.forest.map(map(fai)));
}

/**
 * Chain Tree computations together.
 *
 * @example
 * ```ts
 * import { flatmap, tree } from "./tree.ts";
 * import { pipe } from "./fn.ts";
 *
 * const tree1 = tree(5);
 * const chained = pipe(
 *   tree1,
 *   flatmap(n => tree(n * 2, [tree(n), tree(n + 1)]))
 * );
 * console.log(chained); // { value: 10, forest: [{ value: 5, forest: [] }, { value: 6, forest: [] }] }
 * ```
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
 * Apply a function wrapped in a Tree to a value wrapped in a Tree.
 *
 * @example
 * ```ts
 * import { apply, tree } from "./tree.ts";
 * import { pipe } from "./fn.ts";
 *
 * const treeFn = tree((n: number) => n * 2);
 * const treeValue = tree(5);
 * const result = pipe(
 *   treeFn,
 *   apply(treeValue)
 * );
 * console.log(result); // { value: 10, forest: [] }
 * ```
 *
 * @since 2.0.0
 */
export function apply<A>(ua: Tree<A>): <I>(tfai: Tree<(a: A) => I>) => Tree<I> {
  return (ufai) => pipe(ufai, flatmap(flow(map, (fn) => fn(ua))));
}

/**
 * Fold over a Tree to produce a single value.
 *
 * @example
 * ```ts
 * import { fold, tree } from "./tree.ts";
 *
 * const tree1 = tree(5, [tree(3), tree(7)]);
 * const sum = fold(
 *   (acc: number, value: number) => acc + value,
 *   0
 * )(tree1);
 * console.log(sum); // 15
 * ```
 *
 * @since 2.0.0
 */
export function fold<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: Tree<A>) => O {
  const foldr = (result: O, tree: Tree<A>) => fold(foao, result)(tree);
  return (ta) => TraversableArray.fold(foldr, foao(o, ta.value))(ta.forest);
}

/**
 * Traverse over a Tree using the supplied Applicable.
 *
 * @example
 * ```ts
 * import { traverse, tree } from "./tree.ts";
 * import * as O from "./option.ts";
 * import { pipe } from "./fn.ts";
 *
 * const tree1 = tree(5, [tree(3), tree(7)]);
 * const traversed = pipe(
 *   tree1,
 *   traverse(O.ApplicableOption)(n => O.some(n * 2))
 * );
 * console.log(traversed); // Some({ value: 10, forest: [Some({ value: 6, forest: [] }), Some({ value: 14, forest: [] })] })
 * ```
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
 * Extract the value from a Tree.
 *
 * @example
 * ```ts
 * import { unwrap, tree } from "./tree.ts";
 *
 * const tree1 = tree(42);
 * const value = unwrap(tree1);
 * console.log(value); // 42
 * ```
 *
 * @since 2.0.0
 */
export function unwrap<A>({ value }: Tree<A>): A {
  return value;
}

/**
 * Draw a Forest as an ASCII string representation.
 *
 * @example
 * ```ts
 * import { drawForest, tree } from "./tree.ts";
 *
 * const forest = [tree("a"), tree("b", [tree("c")])];
 * const ascii = drawForest(forest);
 * console.log(ascii);
 * // ├─ a
 * // └─ b
 * //    └─ c
 * ```
 *
 * @since 2.0.0
 */
export function drawForest(forest: Forest<string>): string {
  return drawString("\n", forest);
}

/**
 * Draw a Tree as an ASCII string representation.
 *
 * @example
 * ```ts
 * import { drawTree, tree } from "./tree.ts";
 *
 * const tree1 = tree("root", [tree("a"), tree("b", [tree("c")])]);
 * const ascii = drawTree(tree1);
 * console.log(ascii);
 * // root
 * // ├─ a
 * // └─ b
 * //    └─ c
 * ```
 *
 * @since 2.0.0
 */
export function drawTree(tree: Tree<string>): string {
  return tree.value + drawForest(tree.forest);
}

/**
 * Pattern match on a Tree to extract values.
 *
 * @example
 * ```ts
 * import { match, tree } from "./tree.ts";
 *
 * const tree1 = tree(5, [tree(3), tree(7)]);
 * const matcher = match((value: number, children: number[]) => value + children.reduce((sum, child) => sum + child, 0));
 * const result = matcher(tree1);
 * console.log(result); // 15
 * ```
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
 * Create a Comparable instance for Tree given a Comparable for the inner type.
 *
 * @example
 * ```ts
 * import { getComparableTree, tree } from "./tree.ts";
 * import * as N from "./number.ts";
 *
 * const comparable = getComparableTree(N.ComparableNumber);
 * const tree1 = tree(5);
 * const tree2 = tree(3);
 * const result = comparable.compare(tree2)(tree1); // false (5 > 3)
 * ```
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
 * Create a Showable instance for Tree given a Showable for the inner type.
 *
 * @example
 * ```ts
 * import { getShowable, tree } from "./tree.ts";
 *
 * const showable = getShowable({ show: (n: number) => n.toString() });
 * const tree1 = tree(5, [tree(3), tree(7)]);
 * const result = showable.show(tree1);
 * console.log(result); // "Tree(5, [Tree(3, []), Tree(7, [])])"
 * ```
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

/**
 * @since 2.0.0
 */
export const FoldableTree: Foldable<KindTree> = { fold };

/**
 * @since 2.0.0
 */
export const MappableTree: Mappable<KindTree> = { map };

/**
 * @since 2.0.0
 */
export const TraversableTree: Traversable<KindTree> = { map, fold, traverse };

/**
 * @since 2.0.0
 */
export const WrappableTree: Wrappable<KindTree> = { wrap };

/**
 * @since 2.0.0
 */
export const tap: Tap<KindTree> = createTap(FlatmappableTree);

/**
 * @since 2.0.0
 */
export const bind: Bind<KindTree> = createBind(FlatmappableTree);

/**
 * @since 2.0.0
 */
export const bindTo: BindTo<KindTree> = createBindTo(MappableTree);
