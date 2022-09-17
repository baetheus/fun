import type { Kind } from "./kind.ts";

export type NonEmptyArray<A> = readonly [A, ...A[]];

export interface URI extends Kind {
  readonly type: NonEmptyArray<this[0]>;
}

export type TypeOf<T> = T extends ReadonlyArray<infer A> ? A : never;
