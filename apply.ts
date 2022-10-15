//deno-lint-ignore-file no-explicit-any
import type { $, Kind, TypeClass } from "./kind.ts";
import type { Functor } from "./functor.ts";
import type { Semigroup } from "./semigroup.ts";
import type { NonEmptyRecord } from "./record.ts";
import type { NonEmptyArray } from "./array.ts";

import { pipe } from "./fn.ts";

/**
 * Apply
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#apply
 */
export interface Apply<U extends Kind> extends Functor<U>, TypeClass<U> {
  readonly ap: <A, I, B, C, D, E>(
    tfai: $<U, [(a: A) => I, B, C], [D], [E]>,
  ) => (
    ta: $<U, [A, B, C], [D], [E]>,
  ) => $<U, [I, B, C], [D], [E]>;
}

// TODO: Look into cleaning up this code to have better types

function _loopTuple<T>(len: number, init: T[] = []): T[] | ((t: T) => any) {
  return len === 0 ? init : (t: T) => _loopTuple(len - 1, [...init, t]);
}

function _loopRecord<K extends string>(
  keys: K[],
  i = 0,
  init: Record<string, any> = {},
): Record<string, any> | ((a: unknown) => any) {
  return i === keys.length
    ? init
    : (a: unknown) => _loopRecord(keys, i + 1, { ...init, [keys[i]]: a });
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends
  ((k: infer I) => void) ? I : never;

type SequenceTuple<
  U extends Kind,
  R extends NonEmptyArray<$<U, any[], any[], any[]>>,
> = $<U, [
  // Covariant A
  {
    [K in keyof R]: R[K] extends $<U, [infer A, infer _, infer _], any[], any[]>
      ? A
      : never;
  },
  // Covariant B
  {
    [K in keyof R]: R[K] extends $<U, [infer _, infer B, infer _], any[], any[]>
      ? B
      : never;
  }[number],
  // Covariant C
  {
    [K in keyof R]: R[K] extends $<U, [infer _, infer _, infer C], any[], any[]>
      ? C
      : never;
  }[number],
], [
  // Contravariant D
  UnionToIntersection<
    {
      [K in keyof R]: R[K] extends $<U, any[], [infer D], any[]> ? D : never;
    }[number]
  >,
], [
  // Invariant E
  UnionToIntersection<
    {
      [K in keyof R]: R[K] extends $<U, any[], any[], [infer E]> ? E : never;
    }[number]
  >,
]>;

/**
 * Create a sequence over tuple function from Apply
 */
export function createSequenceTuple<U extends Kind>(
  A: Apply<U>,
): <R extends NonEmptyArray<$<U, any[], any[], any[]>>>(
  ...r: R
) => SequenceTuple<U, R> {
  const reducer = (acc: any, cur: any) => pipe(cur, A.ap(acc)) as any;
  return (...r) => {
    const [head, ...tail] = r;
    return tail.reduce(
      reducer,
      pipe(head, A.map(_loopTuple(r.length) as any) as any),
    ) as any;
  };
}

type SequenceStruct<
  U extends Kind,
  R extends Record<string, $<U, any[], any[], any[]>>,
> = $<U, [
  // Covariant A
  {
    [K in keyof R]: R[K] extends $<U, [infer A, infer _, infer _], any[], any[]>
      ? A
      : never;
  },
  // Covariant B
  {
    [K in keyof R]: R[K] extends $<U, [infer _, infer B, infer _], any[], any[]>
      ? B
      : never;
  }[keyof R],
  // Covariant C
  {
    [K in keyof R]: R[K] extends $<U, [infer _, infer _, infer C], any[], any[]>
      ? C
      : never;
  }[keyof R],
], [
  // Contravariant D
  UnionToIntersection<
    {
      [K in keyof R]: R[K] extends $<U, any[], [infer D], any[]> ? D : never;
    }[keyof R]
  >,
], [
  // Invariant E
  UnionToIntersection<
    {
      [K in keyof R]: R[K] extends $<U, any[], any[], [infer E]> ? E : never;
    }[keyof R]
  >,
]>;

export function createSequenceStruct<U extends Kind>(
  A: Apply<U>,
): <R extends Record<string, $<U, any[], any[], any[]>>>(
  r: NonEmptyRecord<R>,
) => SequenceStruct<U, R> {
  return (r) => {
    const keys: ((keyof typeof r) & string)[] = Object.keys(r);
    const [head, ...tail] = keys;
    return tail.reduce(
      (f: any, key: keyof typeof r) => pipe(r[key], A.ap(f) as any),
      pipe(r[head] as any, A.map(_loopRecord(keys) as any) as any),
    ) as any;
  };
}

export function createApplySemigroup<U extends Kind>(
  A: Apply<U>,
) {
  return <A, B = never, C = never, D = never, E = never>(
    S: Semigroup<A>,
  ): Semigroup<$<U, [A, B, C], [E], [D]>> => ({
    concat: (a) => A.ap(pipe(a, A.map(S.concat))),
  });
}
