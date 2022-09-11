import type * as __ from "./kind.ts";

import { isNil } from "./nilable.ts";
import * as S from "./schemable.ts";

export type Guard<A, B extends A> = (a: A) => a is B;

export type TypeOf<T> = T extends Guard<infer _, infer A> ? A : never;

export type InputOf<T> = T extends Guard<infer B, infer _> ? B : never;

export const URI = "Guard";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Guard<unknown, _[0]>;
  }
}

export function compose<A, B extends A, C extends B>(
  gbc: Guard<B, C>,
): (gab: Guard<A, B>) => Guard<A, C> {
  return (gab) => (a: A): a is C => gab(a) && gbc(a);
}

export function unknown(_: unknown): _ is unknown {
  return true;
}

export function string(a: unknown): a is string {
  return typeof a === "string";
}

export function number(a: unknown): a is number {
  return typeof a === "number";
}

export function boolean(a: unknown): a is boolean {
  return typeof a === "boolean";
}

export function isRecord(a: unknown): a is Record<string, unknown> {
  return typeof a === "object" && a !== null;
}

export function isArray(a: unknown): a is Array<unknown> {
  return Array.isArray(a);
}

export function isArrayN<N extends number>(
  n: N,
): Guard<unknown, Array<unknown> & { length: N }> {
  return (a): a is Array<unknown> & { length: N } =>
    isArray(a) && a.length == n;
}

export function literal<A extends [S.Literal, ...S.Literal[]]>(
  ...literals: A
): Guard<unknown, A[number]> {
  return (a): a is A[number] => literals.some((l) => l === a);
}

export function nullable<A, B extends A>(
  or: Guard<A, B>,
): Guard<A | null, B | null> {
  return (a): a is B | null => a === null || or(a);
}

export function undefinable<A, B extends A>(
  or: Guard<A, B>,
): Guard<A | undefined, B | undefined> {
  return (a): a is B | undefined => a === undefined || or(a);
}

export function record<A>(
  codomain: Guard<unknown, A>,
): Guard<unknown, Record<string, A>> {
  return (a): a is Record<string, A> =>
    isRecord(a) && Object.values(a).every(codomain);
}

export function array<A>(
  item: Guard<unknown, A>,
): Guard<unknown, Array<A>> {
  return (a): a is Array<A> => Array.isArray(a) && a.every(item);
}

// deno-lint-ignore no-explicit-any
export function tuple<A extends any[]>(
  ...items: { [K in keyof A]: Guard<unknown, A[K]> }
): Guard<unknown, { [K in keyof A]: A[K] }> {
  return (a): a is { [K in keyof A]: A[K] } =>
    Array.isArray(a) && items.length === a.length &&
    a.every((value, index) => items[index](value));
}

export function struct<A>(
  items: { [K in keyof A]: Guard<unknown, A[K]> },
): Guard<unknown, { [K in keyof A]: A[K] }> {
  return (a): a is { [K in keyof A]: A[K] } =>
    isRecord(a) &&
    Object.keys(items).every((key) => items[key as keyof typeof items](a[key]));
}

export function partial<A>(
  items: { [K in keyof A]: Guard<unknown, A[K]> },
): Guard<unknown, { [K in keyof A]?: A[K] | null }> {
  return (a): a is { [K in keyof A]?: A[K] | null } =>
    isRecord(a) &&
    Object.keys(items).every((key) =>
      isNil(a[key]) || items[key as keyof typeof items](a[key])
    );
}

export function intersect<B, I extends B>(
  gi: Guard<B, I>,
): <A extends B>(ga: Guard<B, A>) => Guard<B, A & I> {
  return <A extends B>(ga: Guard<B, A>) => (a): a is A & I => ga(a) && gi(a);
}

export function union<B, I extends B>(
  gi: Guard<B, I>,
): <A extends B>(ga: Guard<B, A>) => Guard<B, A | I> {
  return <A extends B>(ga: Guard<B, A>) => (a): a is A | I => ga(a) || gi(a);
}

export function lazy<A, B extends A>(
  _: string,
  fga: () => Guard<A, B>,
): Guard<A, B> {
  return fga();
}

export const Schemable: S.Schemable<URI> = {
  unknown: () => unknown,
  string: () => string,
  number: () => number,
  boolean: () => boolean,
  literal,
  nullable,
  undefinable,
  record,
  array,
  tuple: tuple as S.Schemable<URI>["tuple"],
  struct,
  partial,
  intersect,
  union,
  lazy,
};
