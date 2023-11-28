import type { $, Kind, Out } from "../kind.ts";
import type { Option } from "../option.ts";

import * as O from "../option.ts";
import * as A from "../array.ts";
import { pipe } from "../fn.ts";

export type Tree<A> = {
  readonly value: Option<A>;
  readonly forest: Forest<A>;
};

export type Forest<A> = ReadonlyArray<Tree<A>>;

// deno-lint-ignore no-explicit-any
export type AnyTree = Tree<any>;

export type Type<U> = U extends Tree<infer A> ? A : never;

export interface KindTree extends Kind {
  readonly kind: Tree<Out<this, 0>>;
}

export function tree<A>(value: Option<A>, forest: Forest<A> = []): Tree<A> {
  return { value, forest };
}

export function init<A = never>(forest: Forest<A> = []): Tree<A> {
  return { value: O.none, forest };
}

export function wrap<A>(value: A, forest: Forest<A> = []): Tree<A> {
  return { value: O.some(value), forest };
}

export function map<A, I>(fai: (a: A) => I): (ua: Tree<A>) => Tree<I> {
  const mapValue = O.map(fai);
  return (ua) => tree(mapValue(ua.value), pipe(ua.forest, A.map(map(fai))));
}
