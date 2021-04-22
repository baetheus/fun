import type * as HKT from "./hkt.ts";
import type * as TC from "./type_classes.ts";

import * as A from "./array.ts";
import { createDo } from "./derivations.ts";
import { apply, flow, identity, pipe } from "./fns.ts";

/*******************************************************************************
 * Types
 ******************************************************************************/

export type Forest<A> = ReadonlyArray<Tree<A>>;

export type Tree<A> = {
  readonly value: A;
  readonly forest: Forest<A>;
};

/*******************************************************************************
  * Kind Registration
  ******************************************************************************/

export const URI = "Tree";

export type URI = typeof URI;

declare module "./hkt.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Tree<_[0]>;
  }
}

/*******************************************************************************
 * Optimizations
 ******************************************************************************/

// deno-lint-ignore no-explicit-any
const _concat = A.getMonoid<Tree<any>>().concat;

const _draw = (indentation: string, forest: Forest<string>): string => {
  let r = "";
  const len = forest.length;
  let tree: Tree<string>;
  for (let i = 0; i < len; i++) {
    tree = forest[i];
    const isLast = i === len - 1;
    r += indentation + (isLast ? "└" : "├") + "─ " + tree.value;
    r += _draw(indentation + (len > 1 && !isLast ? "│  " : "   "), tree.forest);
  }
  return r;
};

const _make = <A>(value: A) =>
  (forest: Forest<A>): Tree<A> => ({ value, forest });

/*******************************************************************************
 * Constructors
 ******************************************************************************/

export const make = <A>(value: A, forest: Forest<A> = A.empty()): Tree<A> => ({
  value,
  forest,
});

/*******************************************************************************
 * Modules
 ******************************************************************************/

export const Functor: TC.Functor<URI> = {
  map: (fab) =>
    (ta) => ({
      value: fab(ta.value),
      forest: ta.forest.map(Functor.map(fab)),
    }),
};

export const Apply: TC.Apply<URI> = {
  ap: (tfab) => (ta) => pipe(tfab, Monad.chain(flow(Functor.map, apply(ta)))),
  map: Functor.map,
};

export const Applicative: TC.Applicative<URI> = {
  of: make,
  ap: Apply.ap,
  map: Functor.map,
};

export const Chain: TC.Chain<URI> = {
  ap: Apply.ap,
  map: Functor.map,
  chain: (fatb) =>
    (ta) => {
      const { value, forest } = fatb(ta.value);
      return {
        value,
        forest: _concat(forest)(ta.forest.map(Monad.chain(fatb))),
      };
    },
};

export const Monad: TC.Monad<URI> = {
  of: make,
  ap: Apply.ap,
  map: Functor.map,
  join: Chain.chain(identity),
  chain: Chain.chain,
};

export const Traversable: TC.Traversable<URI> = {
  map: Functor.map,
  reduce: (faba, b) =>
    (ta) => {
      let r = faba(b, ta.value);
      const len = ta.forest.length;
      for (let i = 0; i < len; i++) {
        r = Traversable.reduce(faba, r)(ta.forest[i]);
      }
      return r;
    },
  // TODO Clean up this implementation
  traverse: (AP) =>
    (faub) =>
      (ta) => {
        const traverseF = A.traverse(AP);
        // deno-lint-ignore no-explicit-any
        const out = (f: any) =>
          // deno-lint-ignore no-explicit-any
          (ta: any): any =>
            pipe(
              ta.forest,
              // deno-lint-ignore no-explicit-any
              traverseF(out(f)) as any,
              AP.ap(pipe(f(ta.value), AP.map(_make))),
            );
        return out(faub)(ta);
      },
};

/*******************************************************************************
 * Module Getters
 ******************************************************************************/

export const getShow = <A>(S: TC.Show<A>): TC.Show<Tree<A>> => {
  const show = (ta: Tree<A>): string =>
    ta.forest === A.zero || ta.forest.length === 0
      ? `Tree(${S.show(ta.value)})`
      : `Tree(${S.show(ta.value)}, [${ta.forest.map(show).join(", ")}])`;
  return ({ show });
};

/*******************************************************************************
 * Pipeables
 ******************************************************************************/

export const { of, ap, map, join, chain } = Monad;

export const { reduce, traverse } = Traversable;

export const drawForest = (forest: Forest<string>): string =>
  _draw("\n", forest);

export const drawTree = (tree: Tree<string>): string =>
  tree.value + drawForest(tree.forest);

export const fold = <A, B>(f: (a: A, bs: Array<B>) => B) =>
  (tree: Tree<A>): B => {
    const go = (tree: Tree<A>): B => f(tree.value, tree.forest.map(go));
    return go(tree);
  };

/*******************************************************************************
 * Do Notation
 ******************************************************************************/

export const { Do, bind, bindTo } = createDo(Monad);
