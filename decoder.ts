import type * as HKT from "./kind.ts";
import type * as T from "./types.ts";
import type { Result } from "./result.ts";

import { flow, intersect as _intersect, memoize, pipe } from "./fns.ts";
import * as RE from "./reader_either.ts";
import * as E from "./either.ts";
import { createSequenceStruct, createSequenceTuple } from "./apply.ts";

import * as R from "./result.ts";
import * as S from "./schemable.ts";
import * as G from "./guard.ts";

export type Decoder<B, A> = RE.ReaderEither<B, R.DecodeErrors<string>, A>;

export type TypeOf<T> = T extends Decoder<infer _, infer A> ? A : never;

export type InputOf<T> = T extends Decoder<infer B, infer _> ? B : never;

export type Failure = R.Failure;

export type Success<A> = R.Success<A>;

export const URI = "Decoder";

export type URI = typeof URI;

declare module "./kind.ts" {
  // deno-lint-ignore no-explicit-any
  export interface Kinds<_ extends any[]> {
    [URI]: Decoder<unknown, _[0]>;
  }
}

export function fromGuard<B, A extends B>(
  guard: G.Guard<B, A>,
  expected: string,
): Decoder<B, A> {
  return (b: B) => guard(b) ? R.success(b) : R.failure(R.ofLeaf(b, expected));
}

const literalToString = (literal: S.Literal) =>
  typeof literal === "string" ? `"${literal}"` : `${literal}`;

const compactRecord = <A>(
  r: Record<string, E.Either<void, A>>,
): Record<string, A> => {
  const out: Record<string, A> = {};
  for (const k in r) {
    const rk = r[k];
    if (E.isRight(rk)) {
      out[k] = rk.right;
    }
  }
  return out;
};

const _unknown = fromGuard(G.unknown, "unknown");

const _string = fromGuard(G.string, "string");

const _number = fromGuard(G.number, "number");

const _boolean = fromGuard(G.boolean, "boolean");

const _record = fromGuard(G.isRecord, "record");

const _array = fromGuard(G.isArray, "array");

const _arrayN = (n: number) => fromGuard(G.isArrayN(n), `tuple of length ${n}`);

export const { of, ap, map, join, chain, throwError } = RE.getRightMonad(
  R.Semigroup,
);

const Apply: T.Apply<URI> = { ap, map };

export const sequenceTuple = createSequenceTuple(Apply);

export const sequenceStruct = createSequenceStruct(Apply);

export function refine<A, B extends A>(
  refinement: (a: A) => a is B,
  id: string,
): <I>(from: Decoder<I, A>) => Decoder<I, B> {
  return compose(fromGuard(refinement, id));
}

export function success<A>(a: A): Result<A> {
  return R.success(a);
}

export function failure<A = never>(actual: unknown, error: string): Result<A> {
  return R.failure(R.ofLeaf(actual, error));
}

export function extract<A>(ta: Result<A>): E.Either<string, A> {
  return pipe(ta, E.mapLeft(R.draw));
}

export function compose<B, C>(
  dbc: Decoder<B, C>,
): <A>(dab: Decoder<A, B>) => Decoder<A, C> {
  return (dab) => flow(dab, E.chain(dbc));
}

export function unknown(a: unknown): Result<unknown> {
  return _unknown(a);
}

export function string(a: unknown): Result<string> {
  return _string(a);
}

export function number(a: unknown): Result<number> {
  return _number(a);
}

export function boolean(a: unknown): Result<boolean> {
  return _boolean(a);
}

export function literal<A extends [S.Literal, ...S.Literal[]]>(
  ...literals: A
): Decoder<unknown, A[number]> {
  return fromGuard(
    G.literal(...literals),
    literals.map(literalToString).join(", "),
  );
}

export function nullable<A, B>(or: Decoder<B, A>): Decoder<B | null, A | null> {
  return (b: B | null) =>
    b === null ? R.success(b as null) : pipe(
      or(b),
      E.mapLeft(
        (e) =>
          R.ofWrap("cannot decode nullable", R.concat(e)(R.ofLeaf(b, "null"))),
      ),
    );
}

export function undefinable<A, B>(
  or: Decoder<B, A>,
): Decoder<B | undefined, A | undefined> {
  return (b: B | undefined) =>
    b === undefined ? R.success(b as undefined) : pipe(
      or(b),
      E.mapLeft(
        (e) =>
          R.ofWrap(
            "cannot decode undefinable",
            R.concat(e)(R.ofLeaf(b, "undefined")),
          ),
      ),
    );
}

export function record<A>(
  items: Decoder<unknown, A>,
): Decoder<unknown, Record<string, A>> {
  return flow(
    _record,
    E.chain(flow(
      R.traverseRecord((a, index) =>
        pipe(items(a), E.mapLeft((e) => R.ofKey(index, e)))
      ),
      E.mapLeft((e) => R.ofWrap("cannot decode record", e)),
    )),
  );
}

export function array<A>(
  items: Decoder<unknown, A>,
): Decoder<unknown, ReadonlyArray<A>> {
  return flow(
    _array,
    E.chain(flow(
      R.traverseArray((a, index) =>
        pipe(items(a), E.mapLeft((e) => R.ofIndex(index, e)))
      ),
      E.mapLeft((e) => R.ofWrap("cannot decode array", e)),
    )),
  );
}

// deno-lint-ignore no-explicit-any
export function tuple<A extends any[]>(
  ...items: { [K in keyof A]: Decoder<unknown, A[K]> }
): Decoder<unknown, { [K in keyof A]: A[K] }> {
  return flow(
    _arrayN(items.length),
    E.chain(
      R.traverseArray((a, index) => {
        // deno-lint-ignore no-explicit-any
        const decoder: Decoder<unknown, any> = items[index];
        return pipe(
          decoder(a),
          E.mapLeft((e) => R.ofIndex(index, e, "required")),
        );
      }),
    ),
    E.mapLeft((e) => R.ofWrap("cannot decode tuple", e)),
  ) as Decoder<unknown, { [K in keyof A]: A[K] }>;
}

const traverseStruct =
  (items: Record<string, Decoder<unknown, unknown>>) =>
  (a: Record<string, unknown>) =>
    pipe(
      items,
      R.traverseRecord((decoder, key) =>
        pipe(decoder(a[key]), E.mapLeft((e) => R.ofKey(key, e, "required")))
      ),
    );

export function struct<A>(
  items: { [K in keyof A]: Decoder<unknown, A[K]> },
): Decoder<unknown, { [K in keyof A]: A[K] }> {
  return flow(
    _record,
    E.chain(traverseStruct(items)),
    E.mapLeft((e) => R.ofWrap("cannot decode struct", e)),
  ) as Decoder<unknown, { [K in keyof A]: A[K] }>;
}

const skipProperty: R.Result<E.Either<void, unknown>> = R.success(
  E.left(undefined),
);

const undefinedProperty: R.Result<E.Either<void, unknown>> = R.success(
  E.right(undefined),
);

const traversePartial =
  (items: Record<string, Decoder<unknown, unknown>>) =>
  (a: Record<string, unknown>) =>
    pipe(
      items,
      R.traverseRecord((decoder, key) => {
        if (a[key] === undefined) {
          return key in a ? undefinedProperty : skipProperty;
        }
        return pipe(
          decoder(a[key]),
          E.bimap((e) => R.ofKey(key, e), E.right),
        );
      }),
    );

export function partial<A>(
  items: { [K in keyof A]: Decoder<unknown, A[K]> },
): Decoder<unknown, { [K in keyof A]?: A[K] }> {
  return flow(
    _record,
    E.chain(traversePartial(items)),
    E.bimap((e) => R.ofWrap("cannot decode partial", e), compactRecord),
  ) as Decoder<unknown, { [K in keyof A]: A[K] }>;
}

export function intersect<B, I>(
  and: Decoder<B, I>,
): <A>(ta: Decoder<B, A>) => Decoder<B, A & I> {
  return (ta) => (a) =>
    pipe(
      R.sequenceTuple(ta(a), and(a)),
      E.bimap(
        (e) => R.ofWrap("cannot decode intersection", e),
        ([left, right]) => _intersect(left, right),
      ),
    );
}

export function union<B, I>(
  or: Decoder<B, I>,
): <A>(ta: Decoder<B, A>) => Decoder<B, A | I> {
  return <A>(ta: Decoder<B, A>) => (a) =>
    pipe(
      ta(a),
      E.chainLeft((left) =>
        pipe(
          or(a),
          E.mapLeft((right) =>
            R.ofWrap("cannot decode union", R.concat(left)(right))
          ),
        ) as R.Result<A | I>
      ),
    );
}

export function lazy<A, B>(id: string, fn: () => Decoder<B, A>): Decoder<B, A> {
  const get = memoize<void, Decoder<B, A>>(fn);
  return flow(get(), E.mapLeft((e) => R.ofWrap(`lazy type ${id}`, e)));
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
