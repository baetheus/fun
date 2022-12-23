import type { In, Kind, Out } from "./kind.ts";
import type { Either } from "./either.ts";
import type { DecodeError } from "./decode_error.ts";
import type { FnEither } from "./fn_either.ts";
import type { Refinement } from "./refinement.ts";

import * as DE from "./decode_error.ts";
import * as FE from "./fn_either.ts";
import * as E from "./either.ts";
import * as A from "./array.ts";
import * as R from "./record.ts";
import { flow, memoize, pipe } from "./fn.ts";

import * as S from "./schemable.ts";
import * as G from "./refinement.ts";

// ---
// Decoded
// ---

export type Decoded<A> = Either<DecodeError, A>;

export function success<A>(a: A): Decoded<A> {
  return E.right(a);
}

export function failure<A = never>(actual: unknown, error: string): Decoded<A> {
  return E.left(DE.leaf(actual, error));
}

export function fromDecodeError<A = never>(err: DecodeError): Decoded<A> {
  return E.left(err);
}

export function extract<A>(ta: Decoded<A>): Either<string, A> {
  return pipe(ta, E.mapLeft(DE.draw));
}

export const MonadDecoded = E.getRightMonad(DE.SemigroupDecodeError);

const traverseRecord = R.traverse(MonadDecoded);

const traverseArray = A.traverse(MonadDecoded);

// ---
// Decoder
// ---

export type Decoder<D, A> = FnEither<D, DecodeError, A>;

export type From<T> = T extends Decoder<infer _, infer A> ? A : never;

export type To<T> = T extends Decoder<infer B, infer _> ? B : never;

export interface URI extends Kind {
  readonly kind: Decoder<In<this, 0>, Out<this, 0>>;
}

// Internal Helpers

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

// Combinators

export function compose<B, C>(
  dbc: Decoder<B, C>,
): <A>(dab: Decoder<A, B>) => Decoder<A, C> {
  return FE.compose(dbc);
}

export function contramap<L, D>(
  fld: (l: L) => D,
): <A>(ua: Decoder<D, A>) => Decoder<L, A> {
  return FE.contramap(fld);
}

export function dimap<A, I, L, D>(
  fld: (l: L) => D,
  fai: (a: A) => I,
): (ua: Decoder<D, A>) => Decoder<L, I> {
  return FE.dimap(fld, fai);
}

export function refine<A, B extends A>(
  refinement: (a: A) => a is B,
  id: string,
): <I>(from: Decoder<I, A>) => Decoder<I, B> {
  return compose(fromRefinement(refinement, id));
}

export function fromRefinement<B, A extends B>(
  guard: Refinement<B, A>,
  expected: string,
): Decoder<B, A> {
  return (b: B) => guard(b) ? success(b) : failure(b, expected);
}

export function literal<A extends [S.Literal, ...S.Literal[]]>(
  ...literals: A
): Decoder<unknown, A[number]> {
  return fromRefinement(
    G.literal(...literals),
    literals.map(literalToString).join(", "),
  );
}

export const unknown = fromRefinement(G.unknown, "unknown");

export const string = fromRefinement(G.string, "string");

export const number = fromRefinement(G.number, "number");

export const boolean = fromRefinement(G.boolean, "boolean");

export function date(a: unknown): Decoded<Date> {
  try {
    // deno-lint-ignore no-explicit-any
    const _date = new Date(a as any);
    return isNaN(_date.getTime()) ? failure(a, "date") : success(_date);
  } catch {
    return failure(a, "date");
  }
}

const _null = literal(null);

const _undefined = literal(undefined);

const _record = fromRefinement(G.isRecord, "record");

const _array = fromRefinement(G.isArray, "array");

export function arrayN<N extends number>(
  n: N,
): Decoder<unknown, Array<unknown> & { length: N }> {
  return fromRefinement(G.isArrayN(n), `tuple of length ${n}`);
}

export function json<A>(decoder: Decoder<unknown, A>): Decoder<unknown, A> {
  return pipe(
    string,
    compose((s) => {
      try {
        return success(JSON.parse(s));
      } catch {
        return failure(s, "json");
      }
    }),
    compose(decoder),
  );
}

export function intersect<B, I>(
  right: Decoder<B, I>,
) {
  return <A>(left: Decoder<B, A>): Decoder<B, S.Spread<A & I>> => (a) => {
    const _left = left(a) as Decoded<S.Spread<A & I>>;
    const _right = right(a) as Decoded<S.Spread<A & I>>;

    if (E.isRight(_left) && E.isRight(_right)) {
      return success(
        Object.assign({}, _left.right, _right.right),
      );
    }

    if (E.isLeft(_left)) {
      if (E.isLeft(_right)) {
        return fromDecodeError(
          DE.intersection(_left.left, _right.left),
        );
      }
      return _left;
    }
    return _right;
  };
}

export function union<B, I>(
  right: Decoder<B, I>,
): <A>(left: Decoder<B, A>) => Decoder<B, A | I> {
  return <A>(left: Decoder<B, A>) => (a) => {
    const _left = left(a);
    if (E.isRight(_left)) {
      return _left;
    }

    const _right = right(a);
    if (E.isRight(_right)) {
      return _right;
    }

    return fromDecodeError(DE.union(_left.left, _right.left));
  };
}

export function nullable<A, B>(
  right: Decoder<B, A>,
): Decoder<B | null, A | null> {
  return pipe(_null, union(right)) as Decoder<B | null, A | null>;
}

export function undefinable<A, B>(
  right: Decoder<B, A>,
): Decoder<B | undefined, A | undefined> {
  return pipe(_undefined, union(right)) as Decoder<
    B | undefined,
    A | undefined
  >;
}

export function record<A>(
  items: Decoder<unknown, A>,
): Decoder<unknown, Record<string, A>> {
  return flow(
    _record,
    E.chain(flow(
      traverseRecord((a, index) =>
        pipe(items(a), E.mapLeft((e) => DE.key(index, e)))
      ),
      E.mapLeft((e) => DE.wrap("cannot decode record", e)),
    )),
  );
}

export function array<A>(
  items: Decoder<unknown, A>,
): Decoder<unknown, ReadonlyArray<A>> {
  return flow(
    _array,
    E.chain(flow(
      traverseArray((a, index) =>
        pipe(items(a), E.mapLeft((e) => DE.index(index, e)))
      ),
      E.mapLeft((e) => DE.wrap("cannot decode array", e)),
    )),
  );
}

// deno-lint-ignore no-explicit-any
export function tuple<A extends any[]>(
  ...items: { [K in keyof A]: Decoder<unknown, A[K]> }
): Decoder<unknown, { readonly [K in keyof A]: A[K] }> {
  return flow(
    arrayN(items.length),
    E.chain(
      traverseArray((a, index) => {
        // deno-lint-ignore no-explicit-any
        const decoder: Decoder<unknown, any> = items[index];
        return pipe(
          decoder(a),
          E.mapLeft((e) => DE.index(index, e, "required")),
        );
      }),
    ),
    E.mapLeft((e) => DE.wrap("cannot decode tuple", e)),
  ) as Decoder<unknown, { [K in keyof A]: A[K] }>;
}

const traverseStruct =
  (items: Record<string, Decoder<unknown, unknown>>) =>
  (a: Record<string, unknown>) =>
    pipe(
      items,
      traverseRecord((decoder, key) =>
        pipe(
          decoder(a[key]),
          E.mapLeft((e) => DE.key(key, e, "required")),
        )
      ),
    );

export function struct<A>(
  items: { [K in keyof A]: Decoder<unknown, A[K]> },
): Decoder<unknown, { readonly [K in keyof A]: A[K] }> {
  return flow(
    _record,
    E.chain(traverseStruct(items)),
    E.mapLeft((e) => DE.wrap("cannot decode struct", e)),
  ) as Decoder<unknown, { [K in keyof A]: A[K] }>;
}

const skipProperty: Decoded<E.Either<void, unknown>> = success(
  E.left(undefined),
);

const undefinedProperty: Decoded<E.Either<void, unknown>> = success(
  E.right(undefined),
);

const traversePartial =
  (items: Record<string, Decoder<unknown, unknown>>) =>
  (a: Record<string, unknown>) =>
    pipe(
      items,
      traverseRecord((decoder, key) => {
        if (a[key] === undefined) {
          return key in a ? undefinedProperty : skipProperty;
        }
        return pipe(
          decoder(a[key]),
          E.bimap((e) => DE.key(key, e), E.right),
        );
      }),
    );

export function partial<A>(
  items: { [K in keyof A]: Decoder<unknown, A[K]> },
): Decoder<unknown, { readonly [K in keyof A]?: A[K] }> {
  return flow(
    _record,
    E.chain(traversePartial(items)),
    E.bimap((e) => DE.wrap("cannot decode partial struct", e), compactRecord),
  ) as Decoder<unknown, { readonly [K in keyof A]: A[K] }>;
}

export function lazy<A, B>(id: string, fn: () => Decoder<B, A>): Decoder<B, A> {
  const get = memoize<void, Decoder<B, A>>(fn);
  return (u) => pipe(get()(u), E.mapLeft((e) => DE.wrap(`lazy type ${id}`, e)));
}

export interface UnknownDecoderURI extends Kind {
  readonly kind: Decoder<unknown, Out<this, 0>>;
}

export const SchemableDecoder: S.Schemable<UnknownDecoderURI> = {
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
