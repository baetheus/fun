//deno-lint-ignore-file no-explicit-any
import type { Kind, URIS } from "./kind.ts";
import type { Functor } from "./functor.ts";
import type { Semigroup } from "./semigroup.ts";
import type { NonEmptyArray, NonEmptyRecord } from "./types.ts";

import { pipe } from "./fns.ts";

/**
 * Apply
 * https://github.com/fantasyland/static-land/blob/master/docs/spec.md#apply
 */
export interface Apply<URI extends URIS, _ extends any[] = any[]>
  extends Functor<URI, _> {
  readonly ap: <A, I, B extends _[0], C extends _[1], D extends _[2]>(
    tfai: Kind<URI, [(a: A) => I, B, C, D]>,
  ) => (
    ta: Kind<URI, [A, B, C, D]>,
  ) => Kind<URI, [I, B, C, D]>;
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

// deno-fmt-ignore
type SequenceTuple<URI extends URIS, R extends NonEmptyArray<Kind<URI, any[]>>> = Kind<URI, [
  { [K in keyof R]: R[K] extends Kind<URI, [infer A, infer _, infer _, infer _]> ? A : never },
  { [K in keyof R]: R[K] extends Kind<URI, [infer _, infer B, infer _, infer _]> ? B : never }[number],
  { [K in keyof R]: R[K] extends Kind<URI, [infer _, infer _, infer C, infer _]> ? C : never }[number],
  { [K in keyof R]: R[K] extends Kind<URI, [infer _, infer _, infer _, infer D]> ? D : never }[number]
]>;

/**
 * Create a sequence over tuple function from Apply
 */
export function createSequenceTuple<URI extends URIS>(
  A: Apply<URI>,
): <R extends NonEmptyArray<Kind<URI, any[]>>>(
  ...r: R
) => SequenceTuple<URI, R> {
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
type SequenceStruct<URI extends URIS, R extends Record<string, Kind<URI, any[]>>> = Kind<URI, [
  { [K in keyof R]: R[K] extends Kind<URI, [infer A, infer _, infer _, infer _]> ? A : never },
  { [K in keyof R]: R[K] extends Kind<URI, [infer _, infer B, infer _, infer _]> ? B : never }[keyof R],
  { [K in keyof R]: R[K] extends Kind<URI, [infer _, infer _, infer C, infer _]> ? C : never }[keyof R],
  { [K in keyof R]: R[K] extends Kind<URI, [infer _, infer _, infer _, infer D]> ? D : never }[keyof R]
]>

export function createSequenceStruct<URI extends URIS>(
  A: Apply<URI>,
): <R extends Record<string, Kind<URI, any[]>>>(
  r: NonEmptyRecord<R>,
) => SequenceStruct<URI, R> {
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

export function createApplySemigroup<URI extends URIS>(A: Apply<URI>) {
  return <A, B = never, C = never, D = never>(
    S: Semigroup<A>,
  ): Semigroup<Kind<URI, [A, B, C, D]>> => ({
    concat: (a) => A.ap(pipe(a, A.map(S.concat))),
  });
}
