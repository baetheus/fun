import type { Kind, Out } from "../kind.ts";
import type { Nil } from "../nil.ts";
import type { Pair } from "../pair.ts";
import type { Either } from "../either.ts";
import type { DecodeError } from "../decoder.ts";
import type { Flatmappable } from "../flatmappable.ts";
import type { NonEmptyArray } from "../array.ts";

import * as FE from "../fn_either.ts";
import * as N from "../nil.ts";
import * as A from "../array.ts";
import * as E from "../either.ts";
import * as P from "../pair.ts";
import * as D from "../decoder.ts";
import * as S from "../string.ts";
import { pipe } from "../fn.ts";

export type Stream = {
  readonly buffer: readonly string[];
  readonly cursor: number;
};

export function stream(buffer: string, cursor?: number): Stream;
export function stream(buffer: readonly string[], cursor?: number): Stream;
export function stream(
  buffer: string | readonly string[],
  cursor: number = 0,
): Stream {
  const _buffer = typeof buffer === "string" ? Array.from(buffer) : buffer;
  return {
    buffer: _buffer,
    cursor,
  };
}

export function moveCursor(s: Stream, count: number = 1): Stream {
  const _count = Math.max(1, Math.floor(count));
  const _next_cursor = Math.min(s.buffer.length, s.cursor + _count);
  return _next_cursor === s.cursor ? s : stream(s.buffer, _next_cursor);
}

export type Parsed<A> = Either<DecodeError, Pair<A, Stream>>;

export interface KindParsed extends Kind {
  readonly kind: Parsed<Out<this, 0>>;
}

export function failure<A = never>(actual: unknown, error: string): Parsed<A> {
  return E.left(D.leafErr(actual, error));
}

export function success<A>(value: A, next: Stream): Parsed<A> {
  return E.right(P.pair(value, next));
}

export function fromDecodeError<A = never>(error: DecodeError): Parsed<A> {
  return E.left(error);
}

export function unwrap<A>(ua: Parsed<A>): Either<string, A> {
  return pipe(ua, E.bimap(D.draw, P.getFirst));
}

export function map_parsed<A, I>(
  fai: (a: A) => I,
): (ua: Parsed<A>) => Parsed<I> {
  return E.map(P.map(fai));
}

export type Parser<A> = (input: Stream) => Parsed<A>;

// deno-lint-ignore no-explicit-any
export type AnyParser = Parser<any>;

export type ParserLike<A> = Parser<A> | string;

// deno-lint-ignore no-explicit-any
export type AnyParserLike = ParserLike<any>;

export type ToParser<T> = T extends Parser<infer A> ? A
  : T extends string ? Parser<T>
  : never;

export type ToType<T> = T extends Parser<infer A> ? A
  : T extends string ? T
  : never;

export interface KindParser extends Kind {
  readonly kind: Parser<Out<this, 0>>;
}

export function toParser<T extends AnyParserLike>(
  parser: T,
): Parser<ToType<T>> {
  return typeof parser === "string" ? literal(parser) : parser;
}

export function toParsers<T extends NonEmptyArray<AnyParserLike>>(
  parsers: T,
): { [K in keyof T]: Parser<ToType<T[K]>> } {
  return pipe(parsers, A.map(toParser)) as {
    [K in keyof T]: Parser<ToType<T[K]>>;
  };
}

export function get(
  stream: Stream,
  count: number = 1,
): Either<DecodeError, Pair<NonEmptyArray<string>, Stream>> {
  const _count = Math.max(1, Math.floor(count));
  const { cursor, buffer } = stream;
  const end = cursor + _count;
  const slice = buffer.slice(cursor, end) as unknown as NonEmptyArray<
    string
  >;
  return slice.length === _count
    ? success(slice, moveCursor(stream, _count))
    : failure(
      slice,
      `expected slice with length of ${_count}`,
    );
}

export const FlatmappableParser: Flatmappable<KindParser> = {
  wrap: (value) => (stream) => success(value, stream),
  apply: (ua) => (ufai) => (stream) =>
    pipe(
      ufai(stream),
      E.flatmap(([fai, next]) =>
        pipe(
          ua(next),
          E.map(P.map(fai)),
        )
      ),
    ),
  map: (fai) => (ua) => (stream) => pipe(ua(stream), E.map(P.map(fai))),
  flatmap: (faui) => (ua) => (stream) =>
    pipe(ua(stream), E.flatmap(([a, next]) => pipe(faui(a), (ui) => ui(next)))),
};

export function wrap<A>(value: A): Parser<A> {
  return FlatmappableParser.wrap(value);
}

export function apply<A, I>(
  ua: Parser<A>,
): (ufai: Parser<(a: A) => I>) => Parser<I> {
  return FlatmappableParser.apply(ua);
}

export function map<A, I>(fai: (a: A) => I): (ua: Parser<A>) => Parser<I> {
  return FlatmappableParser.map(fai);
}

export function flatmap<A, I>(
  faui: (a: A) => Parser<I>,
): (ua: Parser<A>) => Parser<I> {
  return FlatmappableParser.flatmap(faui);
}

export function alt<A>(second: Parser<A>): (first: Parser<A>) => Parser<A> {
  return (first) => (stream) => {
    const fst = first(stream);
    if (E.isRight(fst)) {
      return fst;
    }
    const snd = second(stream);
    if (E.isRight(snd)) {
      return snd;
    }
    return fromDecodeError(D.unionErr(fst.left, snd.left));
  };
}

export function annotate(context: string): <A>(ua: Parser<A>) => Parser<A> {
  return FE.mapSecond((error) => D.wrapErr(context, error));
}

const ComparableArrayString = A.getComparableArray(S.ComparableString);

export function literal<T extends string>(match: T): Parser<T> {
  const match_array = stream(match).buffer;
  const matcher = ComparableArrayString.compare(match_array);
  return (stream) =>
    pipe(
      get(stream, match_array.length),
      E.flatmap(([slice, next]) =>
        matcher(slice)
          ? success(match, next)
          : failure(slice.join(""), `expected ${match}`)
      ),
    );
}

export function range(start: string, end: string): Parser<string> {
  return (stream) =>
    pipe(
      get(stream),
      E.flatmap(([[a], next]) =>
        a > start[0] && a < end[0]
          ? success(a, next)
          : failure(a, `between ${start[0]} and ${end[0]}`)
      ),
    );
}

export function any<T extends NonEmptyArray<AnyParserLike>>(
  ...parsers: T
): Parser<ToType<T[keyof T]>> {
  const _parsers = toParsers(parsers);
  return (stream) => {
    const errors: DecodeError[] = [];
    for (const parser of _parsers) {
      const result = parser(stream);
      if (E.isRight(result)) {
        return result;
      }
      errors.push(result.left);
    }
    return fromDecodeError(D.manyErr(...errors));
  };
}

export function sequence<T extends NonEmptyArray<AnyParserLike>>(
  ...parsers: T
): Parser<{ [K in keyof T]: ToType<T[K]> }> {
  const _parsers = toParsers(parsers);
  return (stream) => {
    // deno-lint-ignore no-explicit-any
    const results: any[] = [];
    let next = stream;
    for (const parser of _parsers) {
      const result = parser(next);
      if (E.isLeft(result)) {
        return result;
      }
      results.push(result.right[0]);
      next = result.right[1];
    }
    return success(results as { [K in keyof T]: ToType<T[K]> }, next);
  };
}

export function many<T extends AnyParserLike>(
  parser: T,
): Parser<readonly (ToType<T>)[]> {
  const _parser = toParser(parser);
  return (stream) => {
    const results: ToType<T>[] = [];
    let next = stream;
    while (next.cursor < next.buffer.length) {
      const result = _parser(next);
      if (E.isLeft(result)) {
        break;
      }
      results.push(result.right[0]);
      next = result.right[1];
    }
    return success(results, next);
  };
}

export function some<T extends AnyParserLike>(
  parser: T,
): Parser<NonEmptyArray<ToType<T>>> {
  return pipe(sequence(parser, many(parser)), map(([a, as]) => [a, ...as]));
}

export function maybe<T extends AnyParserLike>(
  parser: T,
): Parser<Nil<ToType<T>>> {
  const _parser = toParser(parser);
  return (stream) =>
    pipe(_parser(stream), E.recover(() => success(null, stream)));
}

export function withDefault<T extends AnyParserLike>(
  parser: T,
  def: ToType<T>,
): Parser<ToType<T>> {
  return pipe(maybe(parser), map((a) => N.isNil(a) ? def : a));
}

export const lower: Parser<string> = range("a", "z");
export const upper: Parser<string> = range("A", "Z");
export const nonzero: Parser<string> = range("1", "9");
export const digit: Parser<string> = any(literal("0"), nonzero);
export const alpha: Parser<string> = any(lower, upper);
export const alphanumeric: Parser<string> = any(alpha, digit);

export const natural_number: Parser<number> = pipe(
  sequence(nonzero, many(digit)),
  map(([lead, rest]) => parseInt(`${lead}${rest.join("")}`, 10)),
);

export const integer: Parser<number> = pipe(
  sequence(maybe(literal("-")), natural_number),
  map(([sign, number]) => N.isNil(sign) ? number : -1 * number),
);

export const decimal: Parser<number> = pipe(
  sequence(integer, maybe(sequence(literal("."), many(digit)))),
  map(([w, or]) => N.isNil(or) ? w : w + parseFloat(`0.${or[1].join("")}`)),
);

export function bracket<
  L extends AnyParserLike,
  A extends AnyParserLike,
  R extends AnyParserLike,
>(
  left: L,
  value: A,
  right: R,
): Parser<ToType<A>> {
  return pipe(sequence(left, value, right), map(([_, value]) => value));
}

export function surround<S extends AnyParserLike, A extends AnyParserLike>(
  outer: S,
  value: A,
): Parser<ToType<A>> {
  return bracket(outer, value, outer);
}
