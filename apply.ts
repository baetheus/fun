//deno-lint-ignore-file no-explicit-any
import type { $, Kind, TypeClass } from "./kind.ts";
import type { Functor } from "./functor.ts";
import type { Semigroup } from "./semigroup.ts";
import type { NonEmptyRecord } from "./types.ts";

import { pipe } from "./fns.ts";

/**
 * Apply
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#apply
 */
export interface Apply<U extends Kind> extends Functor<U>, TypeClass<U> {
  readonly ap: <A, I, B = never, C = never, D = never>(
    tfai: $<U, [(a: A) => I, B, C, D]>,
  ) => (
    ta: $<U, [A, B, C, D]>,
  ) => $<U, [I, B, C, D]>;
}

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

type NonEmptyArray<A> = readonly [A, ...A[]];

// deno-fmt-ignore
type SequenceTuple<U extends Kind, R extends NonEmptyArray<$<U, any[]>>> = $<U, [
  { [K in keyof R]: R[K] extends $<U, [infer A, infer _, infer _, infer _]> ? A : never },
  { [K in keyof R]: R[K] extends $<U, [infer _, infer B, infer _, infer _]> ? B : never }[number],
  { [K in keyof R]: R[K] extends $<U, [infer _, infer _, infer C, infer _]> ? C : never }[number],
  { [K in keyof R]: R[K] extends $<U, [infer _, infer _, infer _, infer D]> ? D : never }[number]
]>;

/**
 * Create a sequence over tuple function from Apply
 */
export function createSequenceTuple<U extends Kind>(
  A: Apply<U>,
): <R extends NonEmptyArray<$<U, unknown[]>>>(
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

// deno-fmt-ignore
type SequenceStruct<U extends Kind, R extends Record<string, $<U, any[]>>> = $<U, [
  { [K in keyof R]: R[K] extends $<U, [infer A, infer _, infer _, infer _]> ? A : never },
  { [K in keyof R]: R[K] extends $<U, [infer _, infer B, infer _, infer _]> ? B : never }[keyof R],
  { [K in keyof R]: R[K] extends $<U, [infer _, infer _, infer C, infer _]> ? C : never }[keyof R],
  { [K in keyof R]: R[K] extends $<U, [infer _, infer _, infer _, infer D]> ? D : never }[keyof R]
]>

export function createSequenceStruct<U extends Kind>(
  A: Apply<U>,
): <R extends Record<string, $<U, unknown[]>>>(
  r: NonEmptyRecord<R>,
) => SequenceStruct<U, R> {
  return (r) => {
    // Sort included to make apply ordering explicit and consistent
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    const keys: ((keyof typeof r) & string)[] = Object.keys(r).sort();
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
  return <A, B, C, D>(
    S: Semigroup<A>,
  ): Semigroup<$<U, [A, B, C, D]>> => ({
    concat: (a) => A.ap(pipe(a, A.map(S.concat))),
  });
}
