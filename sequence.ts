// deno-lint-ignore-file no-explicit-any

import type { Kind, URIS } from "./hkt.ts";
import type { Apply } from "./type_classes.ts";
import type { NonEmptyRecord } from "./types.ts";

import { pipe } from "./fns.ts";

/*******************************************************************************
 * Ap Function Constructors
 ******************************************************************************/

const loopTuple = <T>(len: number, init: T[] = []): T[] | ((t: T) => any) =>
  len === 0 ? init : (t: T) => loopTuple(len - 1, [...init, t]);

const loopRecord = <K extends string>(
  keys: K[],
  i = 0,
  init: Record<string, any> = {},
): Record<string, any> | ((a: unknown) => any) =>
  i === keys.length
    ? init
    : (a: unknown) => loopRecord(keys, i + 1, { ...init, [keys[i]]: a });

/*******************************************************************************
 * Sequence Tuple
 ******************************************************************************/

type NonEmptyArray<T> = [T, ...T[]];

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
export const createSequenceTuple = <URI extends URIS>(A: Apply<URI>) =>
  <R extends NonEmptyArray<Kind<URI, any[]>>>(
    ...r: R
  ): SequenceTuple<URI, R> => {
    const [head, ...tail] = r;
    return tail.reduce(
      (acc: any, cur: any) => pipe(cur, A.ap(acc)) as any,
      pipe(head, A.map(loopTuple(r.length) as any) as any),
    ) as any;
  };

/*******************************************************************************
 * Sequence Struct
 ******************************************************************************/

// deno-fmt-ignore
type SequenceStruct<URI extends URIS, R extends Record<string, Kind<URI, any[]>>> = Kind<URI, [
  { [K in keyof R]: R[K] extends Kind<URI, [infer A, infer _, infer _, infer _]> ? A : never },
  { [K in keyof R]: R[K] extends Kind<URI, [infer _, infer B, infer _, infer _]> ? B : never }[keyof R],
  { [K in keyof R]: R[K] extends Kind<URI, [infer _, infer _, infer C, infer _]> ? C : never }[keyof R],
  { [K in keyof R]: R[K] extends Kind<URI, [infer _, infer _, infer _, infer D]> ? D : never }[keyof R]
]>

export const createSequenceStruct = <URI extends URIS>(A: Apply<URI>) =>
  <R extends Record<string, Kind<URI, any[]>>>(
    r: NonEmptyRecord<R>,
  ): SequenceStruct<URI, R> => {
    // Sort included to make apply ordering explicit
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    const keys: ((keyof R) & string)[] = Object.keys(r).sort();
    const [head, ...tail] = keys;
    return tail.reduce(
      (f: any, key: keyof R) => pipe(r[key], A.ap(f) as any),
      pipe(r[head] as any, A.map(loopRecord(keys) as any) as any),
    ) as any;
  };
