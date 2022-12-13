import type { $, Kind, Out } from "./kind.ts";
import type { Traversable } from "./traversable.ts";
import type { Show } from "./show.ts";
import type { Applicative } from "./applicative.ts";
import type { Monad } from "./monad.ts";

import * as A from "./array.ts";
import { flow, identity, pipe } from "./fn.ts";

export type Forest<A> = ReadonlyArray<Tree<A>>;

export type Tree<A> = {
  readonly value: A;
  readonly forest: Forest<A>;
};

export interface URI extends Kind {
  readonly kind: Tree<Out<this, 0>>;
}

function draw(indentation: string, forest: Forest<string>): string {
  let r = "";
  const len = forest.length;
  let tree: Tree<string>;
  for (let i = 0; i < len; i++) {
    tree = forest[i];
    const isLast = i === len - 1;
    r += indentation + (isLast ? "└" : "├") + "─ " + tree.value;
    r += draw(indentation + (len > 1 && !isLast ? "│  " : "   "), tree.forest);
  }
  return r;
}

export function tree<A>(value: A, forest: Forest<A> = []): Tree<A> {
  return ({ value, forest });
}

export function of<A>(value: A, forest: Forest<A> = A.empty()): Tree<A> {
  return tree(value, forest);
}

export function map<A, I>(fai: (a: A) => I): (ta: Tree<A>) => Tree<I> {
  return (ta) => of(fai(ta.value), ta.forest.map(map(fai)));
}

export function chain<A, I>(fati: (a: A) => Tree<I>): (ta: Tree<A>) => Tree<I> {
  const concat = A.getMonoid<Tree<I>>().concat;
  return (ta) => {
    const { value, forest } = fati(ta.value);
    return of(value, concat(forest)(ta.forest.map(chain(fati))));
  };
}

export function ap<A>(ua: Tree<A>): <I>(tfai: Tree<(a: A) => I>) => Tree<I> {
  return (ufai) => pipe(ufai, chain(flow(map, (fn) => fn(ua))));
}

export function join<A>(tta: Tree<Tree<A>>): Tree<A> {
  return pipe(tta, chain(identity));
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: Tree<A>) => O {
  const reducer = (result: O, tree: Tree<A>) => reduce(foao, result)(tree);
  return (ta) => A.reduce(reducer, foao(o, ta.value))(ta.forest);
}

export function traverse<V extends Kind>(
  V: Applicative<V>,
): <A, I, J = never, K = never, L = unknown, M = unknown>(
  favi: (a: A) => $<V, [I, J, K], [L], [M]>,
) => (ta: Tree<A>) => $<V, [Tree<I>, J, K], [L], [M]> {
  const traverseArray = A.traverse(V);
  return <A, I, J = never, K = never, L = unknown, M = unknown>(
    favi: (a: A) => $<V, [I, J, K], [L], [M]>,
  ): (ua: Tree<A>) => $<V, [Tree<I>, J, K], [L], [M]> => {
    const pusher: (i: I) => (is: Forest<I>) => Tree<I> = (i) => (fs) =>
      tree(i, fs);
    const wrappedPusher = V.of<typeof pusher, J, K, L, M>(pusher);
    const traverseTree = (ua: Tree<A>): $<V, [Tree<I>, J, K], [L], [M]> =>
      pipe(
        wrappedPusher,
        V.ap(favi(ua.value)),
        V.ap(traverseForest(ua.forest)),
      );
    const traverseForest = traverseArray(traverseTree);
    return traverseTree;
  };
}

export function drawForest(forest: Forest<string>): string {
  return draw("\n", forest);
}

export function drawTree(tree: Tree<string>): string {
  return tree.value + drawForest(tree.forest);
}

export function match<A, I>(
  fai: (a: A, is: Array<I>) => I,
): (ta: Tree<A>) => I {
  const go = (tree: Tree<A>): I => fai(tree.value, tree.forest.map(go));
  return go;
}

export const MonadTree: Monad<URI> = { of, ap, map, join, chain };

export const TraversableTree: Traversable<URI> = { map, reduce, traverse };

export const getShow = <A>(S: Show<A>): Show<Tree<A>> => {
  const show = (ta: Tree<A>): string =>
    ta.forest.length === 0
      ? `Tree(${S.show(ta.value)})`
      : `Tree(${S.show(ta.value)}, [${ta.forest.map(show).join(", ")}])`;
  return ({ show });
};
