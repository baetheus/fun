import type { DecodeError } from "../decoder.ts";
import type { Either } from "../either.ts";
import type { Refinement } from "../refinement.ts";
import type { Nil } from "../nil.ts";
import type { Flatmappable } from "../flatmappable.ts";
import type { InOut, Kind, Out } from "../kind.ts";
import type { StateEither } from "../state_either.ts";
import type { NonEmptyArray } from "../array.ts";

import * as SE from "../state_either.ts";
import * as E from "../either.ts";
import * as D from "../decoder.ts";
import * as A from "../array.ts";
import * as N from "../nil.ts";
import { ComparableString } from "../string.ts";
import { pipe } from "../fn.ts";

export type Stream<A> = {
  take(count?: number): readonly A[];
  undo(count?: number): Stream<A>;
};

export class StringStream implements Stream<string> {
  private buffer: readonly string[];
  private cursor: number = 0;
  private history: number[] = [];

  constructor(private _source: string) {
    this.buffer = Array.from(_source);
  }

  public get source(): string {
    return this._source;
  }

  public take(count: number = 1): readonly string[] {
    const _count = Math.max(1, Math.floor(count));
    const current = this.cursor;
    const next = Math.min(this.buffer.length, this.cursor + _count);
    this.history.push(current);
    this.cursor = next;
    return this.buffer.slice(current, next);
  }

  public undo(count: number = 1): StringStream {
    let _count = Math.max(0, Math.floor(count));
    while (_count--) {
      this.cursor = this.history.pop() ?? 0;
    }
    return this;
  }
}

export function fromString(source: string): Stream<string> {
  return new StringStream(source);
}

export type Parsed<A> = Either<DecodeError, A>;

export interface KindParsed extends Kind {
  readonly kind: Parsed<Out<this, 0>>;
}

export const FlatmappableParsed: Flatmappable<KindParsed> = E
  .getFlatmappableRight(D.CombinableDecodeError);

export function success<A>(value: A): Parsed<A> {
  return E.right(value);
}

export function failure<A = never>(actual: unknown, error: string): Parsed<A> {
  return E.left(D.leafErr(actual, error));
}

export function fromError<A = never>(error: DecodeError): Parsed<A> {
  return E.left(error);
}

export type Parser<S, A> = StateEither<Stream<S>, DecodeError, A>;

// deno-lint-ignore no-explicit-any
export type AnyParser = Parser<any, any>;

export type ToType<T> = T extends Parser<infer _, infer A> ? A : never;

export type ToState<T> = T extends Parser<infer S, infer _> ? S : never;

export interface KindParser extends Kind {
  readonly kind: Parser<InOut<this, 0>, Out<this, 0>>;
}

export const FlatmappableParser = SE.getFlatmappableStateRight(
  D.CombinableDecodeError,
) as Flatmappable<KindParser>;

export function succeed<A, S = unknown>(value: A): Parser<S, A> {
  return wrap(value);
}

export function fail<A = never, S = unknown>(
  actual: unknown,
  error: string,
): Parser<S, A> {
  return (s) => [failure(actual, error), s.undo()];
}

export function wrap<A, S = unknown>(value: A): Parser<S, A> {
  return FlatmappableParser.wrap(value);
}

export function apply<A, S = unknown>(
  ua: Parser<S, A>,
): <I>(ufai: Parser<S, (a: A) => I>) => Parser<S, I> {
  return FlatmappableParser.apply(ua);
}

export function map<A, I, S = unknown>(
  fai: (a: A) => I,
): (ua: Parser<S, A>) => Parser<S, I> {
  return FlatmappableParser.map(fai);
}

export function flatmap<A, I, S = unknown>(
  faui: (a: A) => Parser<S, I>,
): (ua: Parser<S, A>) => Parser<S, I> {
  return FlatmappableParser.flatmap(faui);
}

export function recover<I, S = unknown>(
  fbuj: (b: DecodeError) => Parser<S, I>,
): <A>(ua: Parser<S, A>) => Parser<S, A | I> {
  return (ua) => (s1) => {
    const result = ua(s1);
    const [ea, s2] = result;
    if (E.isLeft(ea)) {
      return fbuj(ea.left)(s2);
    }
    return result;
  };
}

export function take<S>(
  count: number = 1,
): Parser<S, NonEmptyArray<S>> {
  const _count = Math.max(1, Math.floor(count));
  return (stream) => {
    const slice = stream.take(count);
    if (slice.length !== _count) {
      return [
        failure(slice, `expected slice with length of ${_count}`),
        stream.undo(),
      ];
    }
    return [success(slice as NonEmptyArray<S>), stream];
  };
}

const ComparableArrayString = A.getComparableArray(ComparableString);

export function fromPredicate<S, A extends NonEmptyArray<S> = NonEmptyArray<S>>(
  guard: Refinement<NonEmptyArray<S>, A>,
  expected: string,
  count: number = 1,
): Parser<S, A> {
  return pipe(
    take<S>(count),
    flatmap((slice) => guard(slice) ? succeed(slice) : fail(slice, expected)),
  );
}

export function any<T extends NonEmptyArray<AnyParser>>(
  ...parsers: T
): Parser<ToState<T[keyof T]>, ToType<T[keyof T]>> {
  return (stream) => {
    const errors: DecodeError[] = [];
    for (const parser of parsers) {
      const result = parser(stream);
      if (E.isRight(result[0])) {
        return result;
      }
      errors.push(result[0].left);
    }
    return [
      fromError(D.manyErr(...errors)),
      stream,
    ];
  };
}

export function sequence<T extends NonEmptyArray<AnyParser>>(
  ...parsers: T
): Parser<ToState<T[keyof T]>, { [K in keyof T]: ToType<T[K]> }> {
  return (stream) => {
    // deno-lint-ignore no-explicit-any
    const results: any[] = [];
    for (const parser of parsers) {
      const result = parser(stream);
      if (E.isLeft(result[0])) {
        // Undo all of the successes in the sequence
        // This failure will undo itself
        stream.undo(results.length);
        return result;
      }
      results.push(result[0].right);
    }
    type Result = { [K in keyof T]: ToType<T[K]> };
    return [success(results as Result), stream];
  };
}

export function many<S, A>(
  parser: Parser<S, A>,
): Parser<S, readonly A[]> {
  return (stream) => {
    const results: A[] = [];
    while (true) {
      const result = parser(stream);
      if (E.isLeft(result[0])) {
        break;
      }
      results.push(result[0].right);
    }
    return [success(results), stream];
  };
}

export function some<S, A>(
  parser: Parser<S, A>,
): Parser<S, NonEmptyArray<A>> {
  return pipe(sequence(parser, many(parser)), map(([a, as]) => [a, ...as]));
}

export function maybe<S, A>(
  parser: Parser<S, A>,
): Parser<S, Nil<A>> {
  return pipe(parser, recover(() => succeed(undefined)));
}

export function withDefault<S, A>(
  parser: Parser<S, A>,
  def: A,
): Parser<S, A> {
  return pipe(maybe(parser), map((a) => N.isNil(a) ? def : a));
}

/**
 * String Parsers
 */

export function literal<T extends string>(match: T): Parser<string, T> {
  const match_array = Array.from(match);
  const matcher = ComparableArrayString.compare(match_array);
  return pipe(
    take<string>(match_array.length),
    SE.flatmap((slice) =>
      matcher(slice)
        ? succeed(match)
        : fail(slice.join(""), `expected literal ${match}`)
    ),
  );
}

export function literals(
  ...matches: NonEmptyArray<string>
): Parser<string, string> {
  type MatchParsers = NonEmptyArray<Parser<string, string>>;
  const match_parsers = pipe(matches, A.map(literal)) as MatchParsers;
  return any(...match_parsers);
}

export function range(left: string, right: string): Parser<string, string> {
  const l = left[0];
  const r = right[0];
  return pipe(
    fromPredicate<string>(
      (s): s is [string] => s[0] >= l && s[0] <= r,
      `between ${l} and ${r}`,
    ),
    map(([char]) => char),
  );
}

export const lower: Parser<string, string> = range("a", "z");
export const upper: Parser<string, string> = range("A", "Z");
export const nonzero: Parser<string, string> = range("1", "9");
export const digit: Parser<string, string> = any(literal("0"), nonzero);
export const alpha: Parser<string, string> = any(lower, upper);
export const alphanumeric: Parser<string, string> = any(alpha, digit);

export const natural_number: Parser<string, number> = pipe(
  sequence(nonzero, many(digit)),
  map(([lead, rest]) => parseInt(`${lead}${rest.join("")}`, 10)),
);

export const integer: Parser<string, number> = pipe(
  sequence(maybe(literal("-")), natural_number),
  map(([sign, number]) => N.isNil(sign) ? number : -1 * number),
);

export const decimal: Parser<string, number> = pipe(
  sequence(integer, maybe(sequence(literal("."), many(digit)))),
  map(([w, or]) => N.isNil(or) ? w : w + parseFloat(`0.${or[1].join("")}`)),
);

export function bracket<A>(
  left: string,
  value: Parser<string, A>,
  right: string,
): Parser<string, A> {
  return pipe(
    sequence(literal(left), value, literal(right)),
    map(([_, value]) => value),
  );
}

export function surround<A>(
  outer: string,
  value: Parser<string, A>,
): Parser<string, A> {
  return bracket(outer, value, outer);
}
