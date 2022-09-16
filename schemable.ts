import type { $, Kind } from "./kind.ts";

import { memoize } from "./fns.ts";

export type Literal = string | number | boolean | null | undefined;

export type UnknownSchemable<U extends Kind> = {
  readonly unknown: <B = never, C = never, D = never>() => $<
    U,
    [unknown, B, C, D]
  >;
};

export type StringSchemable<U extends Kind> = {
  readonly string: <B = never, C = never, D = never>() => $<
    U,
    [string, B, C, D]
  >;
};

export type NumberSchemable<U extends Kind> = {
  readonly number: <B = never, C = never, D = never>() => $<
    U,
    [number, B, C, D]
  >;
};

export type BooleanSchemable<U extends Kind> = {
  readonly boolean: <B = never, C = never, D = never>() => $<
    U,
    [boolean, B, C, D]
  >;
};

export type LiteralSchemable<U extends Kind> = {
  readonly literal: <
    A extends [Literal, ...Literal[]],
    B = never,
    C = never,
    D = never,
  >(
    ...s: A
  ) => $<U, [A[number], B, C, D]>;
};

export type NullableSchemable<U extends Kind> = {
  readonly nullable: <A, B = never, C = never, D = never>(
    or: $<U, [A, B, C, D]>,
  ) => $<U, [A | null, B, C, D]>;
};

export type UndefinableSchemable<U extends Kind> = {
  readonly undefinable: <A, B = never, C = never, D = never>(
    or: $<U, [A, B, C, D]>,
  ) => $<U, [A | undefined, B, C, D]>;
};

export type RecordSchemable<U extends Kind> = {
  readonly record: <A, B = never, C = never, D = never>(
    codomain: $<U, [A, B, C, D]>,
  ) => $<U, [Record<string, A>, B, C, D]>;
};

export type ArraySchemable<U extends Kind> = {
  readonly array: <A, B = never, C = never, D = never>(
    item: $<U, [A, B, C, D]>,
  ) => $<U, [ReadonlyArray<A>, B, C, D]>;
};

export type TupleSchemable<U extends Kind> = {
  // deno-lint-ignore no-explicit-any
  readonly tuple: <A extends any[], B = never, C = never, D = never>(
    ...items: { [K in keyof A]: $<U, [A[K], B, C, D]> }
  ) => $<U, [{ [K in keyof A]: A[K] }, B, C, D]>;
};

export type StructSchemable<U extends Kind> = {
  readonly struct: <A, B = never, C = never, D = never>(
    items: { [K in keyof A]: $<U, [A[K], B, C, D]> },
  ) => $<U, [{ [K in keyof A]: A[K] }, B, C, D]>;
};

export type PartialSchemable<U extends Kind> = {
  readonly partial: <A, B = never, C = never, D = never>(
    items: { [K in keyof A]: $<U, [A[K], B, C, D]> },
  ) => $<U, [{ [K in keyof A]?: A[K] | null }, B, C, D]>;
};

export type IntersectSchemable<U extends Kind> = {
  readonly intersect: <I, B = never, C = never, D = never>(
    and: $<U, [I, B, C, D]>,
  ) => <A>(
    ta: $<U, [A, B, C, D]>,
  ) => $<U, [A & I, B, C, D]>;
};

export type UnionSchemable<U extends Kind> = {
  readonly union: <I, B = never, C = never, D = never>(
    or: $<U, [I, B, C, D]>,
  ) => <A>(ta: $<U, [A, B, C, D]>) => $<U, [A | I, B, C, D]>;
};

export type LazySchemable<U extends Kind> = {
  readonly lazy: <A, B = never, C = never, D = never>(
    id: string,
    f: () => $<U, [A, B, C, D]>,
  ) => $<U, [A, B, C, D]>;
};

export type Schemable<U extends Kind> =
  & UnknownSchemable<U>
  & StringSchemable<U>
  & NumberSchemable<U>
  & BooleanSchemable<U>
  & LiteralSchemable<U>
  & NullableSchemable<U>
  & UndefinableSchemable<U>
  & RecordSchemable<U>
  & ArraySchemable<U>
  & TupleSchemable<U>
  & StructSchemable<U>
  & PartialSchemable<U>
  & IntersectSchemable<U>
  & UnionSchemable<U>
  & LazySchemable<U>;

export type Schema<A, B = never, C = never, D = never> = <U extends Kind>(
  s: Schemable<U>,
) => $<U, [A, B, C, D]>;

export type TypeOf<T> = T extends Schema<infer A> ? A : never;

export function schema<A, B = never, C = never, D = never>(
  f: (s: Schemable<Kind>) => $<Kind, [A, B, C, D]>,
): Schema<A, B, C, D> {
  // deno-lint-ignore no-explicit-any
  return memoize(f) as any;
}
