import type { $, Kind, Out } from "./kind.ts";
import type { Traversable } from "./traversable.ts";
import type { Show } from "./show.ts";
import type { Applicative } from "./applicative.ts";
import type { Monad } from "./monad.ts";

import * as A from "./array.ts";
import {
  createApplySemigroup,
  createSequenceStruct,
  createSequenceTuple,
} from "./apply.ts";
import { apply, flow, identity, pipe } from "./fn.ts";

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

function _make<A>(value: A): (forest: Forest<A>) => Tree<A> {
  return (forest) => ({ value, forest });
}

export function of<A>(value: A, forest: Forest<A> = A.empty()): Tree<A> {
  return ({ value, forest });
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

export function ap<A, I>(tfai: Tree<(a: A) => I>): (ta: Tree<A>) => Tree<I> {
  return (ta) => pipe(tfai, chain(flow(map, apply(ta))));
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
): <A, I, J, K, L, M>(
  favi: (a: A) => $<V, [I, J, K], [L], [M]>,
) => (ta: Tree<A>) => $<V, [Tree<I>, J, K], [L], [M]> {
  const traverseV = A.traverse(V);
  return (favi) => {
    const out = <A, I, J, K, L, M>(
      _favi: (a: A) => $<V, [I, J, K], [L], [M]>,
    ) =>
    (ta: Tree<A>): $<V, [Tree<I>, J, K], [L], [M]> =>
      pipe(
        ta.forest,
        traverseV(out(_favi)),
        V.ap(pipe(_favi(ta.value), V.map(_make))),
      );
    return out(favi);
  };
}

export function drawForest(forest: Forest<string>): string {
  return draw("\n", forest);
}

export function drawTree(tree: Tree<string>): string {
  return tree.value + drawForest(tree.forest);
}

export function fold<A, I>(fai: (a: A, is: Array<I>) => I): (ta: Tree<A>) => I {
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

export const getApplySemigroup = createApplySemigroup(MonadTree);

export const sequenceStruct = createSequenceStruct(MonadTree);

export const sequenceTuple = createSequenceTuple(MonadTree);
