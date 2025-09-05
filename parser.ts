/**
 * This file contains a parser combinator library built on top of the fun
 * algebraic data types. Parser combinators provide a compositional approach
 * to building parsers by combining smaller parsers into larger ones. The
 * parsers in this module are built around the concept of consuming tokens
 * from a stream (such as characters from a string) and producing either
 * successful parse results or detailed error messages.
 *
 * The parser type is defined as `Parser<S, A> = StateEither<Stream<S>, DecodeError, A>`,
 * which represents a stateful computation that consumes tokens of type `S` from
 * a stream and produces either an error or a result of type `A`.
 *
 * @module Parser
 * @since 2.3.4
 */
import type { DecodeError } from "./decoder.ts";
import type { Either } from "./either.ts";
import type { Refinement } from "./refinement.ts";
import type { Nil } from "./nil.ts";
import type { Flatmappable } from "./flatmappable.ts";
import type { InOut, Kind, Out } from "./kind.ts";
import type { StateEither } from "./state_either.ts";
import type { NonEmptyArray } from "./array.ts";

import { CombinableDecodeError, leafErr, manyErr } from "./decoder.ts";
import { ComparableString } from "./string.ts";
import { getComparableArray, map as mapArray } from "./array.ts";
import { getFlatmappableStateRight } from "./state_either.ts";
import { isNil } from "./nil.ts";
import { pipe } from "./fn.ts";
import {
  getFlatmappableRight,
  isLeft,
  isRight,
  left,
  right,
} from "./either.ts";

/**
 * A Stream represents a sequence of tokens that can be consumed during
 * parsing. The stream provides methods to take tokens, undo previous
 * take operations, and check if the end of the stream has been reached.
 * This abstraction allows parsers to work with different types of input
 * sources in a uniform way.
 *
 * @since 2.3.4
 */
export type Stream<A> = {
  take(count?: number): readonly A[];
  undo(count?: number): Stream<A>;
  atEnd(): boolean;
};

/**
 * StringStream is a concrete implementation of Stream for parsing strings.
 * It maintains a cursor position within the string and keeps a history of
 * cursor positions to support the undo operation. This allows for
 * backtracking during parsing when alternative parsers need to be tried.
 *
 * @since 2.3.4
 */
export class StringStream implements Stream<string> {
  private buffer: readonly string[];
  private cursor: number = 0;
  private history: number[] = [];

  constructor(private _source: string) {
    this.buffer = Array.from(_source);
  }

  /**
   * Get the original source string.
   *
   * @since 2.3.4
   */
  public get source(): string {
    return this._source;
  }

  /**
   * Take up to `count` characters from the stream, advancing the cursor
   * and saving the current position to the history for potential undo.
   *
   * @since 2.3.4
   */
  public take(count: number = 1): readonly string[] {
    const _count = Math.max(1, Math.floor(count));
    const current = this.cursor;
    const next = Math.min(this.buffer.length, this.cursor + _count);
    this.history.push(current);
    this.cursor = next;
    return this.buffer.slice(current, next);
  }

  /**
   * Undo the last `count` take operations by restoring previous
   * cursor positions from the history stack.
   *
   * @since 2.3.4
   */
  public undo(count: number = 1): StringStream {
    let _count = Math.max(0, Math.floor(count));
    while (_count--) {
      this.cursor = this.history.pop() ?? 0;
    }
    return this;
  }

  /**
   * Check if the stream has reached its end (no more characters to consume).
   *
   * @since 2.3.4
   */
  public atEnd(): boolean {
    return this.cursor >= this.buffer.length;
  }
}

/**
 * Create a Stream from a string source. This is a convenience function
 * for creating StringStream instances.
 *
 * @example
 * ```ts
 * import { fromString } from "./parser.ts";
 *
 * const stream = fromString("hello world");
 * const chars = stream.take(5); // ["h", "e", "l", "l", "o"]
 * ```
 *
 * @since 2.3.4
 */
export function fromString(source: string): Stream<string> {
  return new StringStream(source);
}

/**
 * Parsed represents the result of a parsing operation. It's an Either
 * type that contains either a successful parse result or a DecodeError
 * describing what went wrong during parsing.
 *
 * @since 2.3.4
 */
export type Parsed<A> = Either<DecodeError, A>;

/**
 * Specifies Parsed as a Higher Kinded Type for use with type class instances.
 *
 * @since 2.3.4
 */
export interface KindParsed extends Kind {
  readonly kind: Parsed<Out<this, 0>>;
}

/**
 * The canonical implementation of Flatmappable for Parsed. It provides
 * methods for chaining parse operations that can fail.
 *
 * @since 2.3.4
 */
export const FlatmappableParsed: Flatmappable<KindParsed> =
  getFlatmappableRight(CombinableDecodeError);

/**
 * Create a successful parse result.
 *
 * @example
 * ```ts
 * import { success } from "./parser.ts";
 *
 * const result = success(42); // Parsed<number>
 * ```
 *
 * @since 2.3.4
 */
export function success<A>(value: A): Parsed<A> {
  return right(value);
}

/**
 * Create a failed parse result with an error message.
 *
 * @example
 * ```ts
 * import { failure } from "./parser.ts";
 *
 * const result = failure("abc", "expected number"); // Parsed<never>
 * ```
 *
 * @since 2.3.4
 */
export function failure<A = never>(actual: unknown, error: string): Parsed<A> {
  return left(leafErr(actual, error));
}

/**
 * Create a failed parse result from an existing DecodeError.
 *
 * @since 2.3.4
 */
export function fromError<A = never>(error: DecodeError): Parsed<A> {
  return left(error);
}

/**
 * A Parser represents a stateful computation that consumes tokens of type S
 * from a stream and produces either a DecodeError or a successful result of
 * type A. The parser can modify the stream state (advancing position, etc.)
 * and supports backtracking through the stream's undo mechanism.
 *
 * @since 2.3.4
 */
export type Parser<S, A> = StateEither<Stream<S>, DecodeError, A>;

/**
 * A Parser type over any, useful for constraining generics that
 * take or return Parsers.
 *
 * @since 2.3.4
 */
// deno-lint-ignore no-explicit-any
export type AnyParser = Parser<any, any>;

/**
 * Extract the result type from a Parser type.
 *
 * @since 2.3.4
 */
export type ToType<T> = T extends Parser<infer _, infer A> ? A : never;

/**
 * Extract the token type from a Parser type.
 *
 * @since 2.3.4
 */
export type ToState<T> = T extends Parser<infer S, infer _> ? S : never;

/**
 * Specifies Parser as a Higher Kinded Type for use with type class instances.
 *
 * @since 2.3.4
 */
export interface KindParser extends Kind {
  readonly kind: Parser<InOut<this, 0>, Out<this, 0>>;
}

/**
 * The canonical implementation of Flatmappable for Parser. It provides
 * methods for chaining parsers together in sequence.
 *
 * @since 2.3.4
 */
export const FlatmappableParser = getFlatmappableStateRight(
  CombinableDecodeError,
) as Flatmappable<KindParser>;

/**
 * Create a parser that always succeeds with the given value without
 * consuming any input from the stream.
 *
 * @example
 * ```ts
 * import { succeed, fromString } from "./parser.ts";
 *
 * const parser = succeed(42);
 * const stream = fromString("hello");
 * const result = parser(stream); // [Right(42), stream] (unchanged)
 * ```
 *
 * @since 2.3.4
 */
export function succeed<A, S = unknown>(value: A): Parser<S, A> {
  return wrap(value);
}

/**
 * Create a parser that always fails with the given error message,
 * optionally undoing a specified number of operations on the stream.
 *
 * @example
 * ```ts
 * import { fail, fromString } from "./parser.ts";
 *
 * const parser = fail("abc", "expected number");
 * const stream = fromString("hello");
 * const result = parser(stream); // [Left(DecodeError), stream.undo(1)]
 * ```
 *
 * @since 2.3.4
 */
export function fail<A = never, S = unknown>(
  actual: unknown,
  error: string,
  undo_count: number = 1,
): Parser<S, A> {
  return (s) => [failure(actual, error), s.undo(undo_count)];
}

/**
 * Create a parser that always succeeds with the given value without
 * consuming any input. This is equivalent to succeed and is the
 * unit operation for the Parser monad.
 *
 * @example
 * ```ts
 * import { wrap, fromString } from "./parser.ts";
 *
 * const parser = wrap("hello");
 * const stream = fromString("world");
 * const result = parser(stream); // [Right("hello"), stream] (unchanged)
 * ```
 *
 * @since 2.3.4
 */
export function wrap<A, S = unknown>(value: A): Parser<S, A> {
  return FlatmappableParser.wrap(value);
}

/**
 * Apply a parser containing a function to a parser containing a value.
 * This allows for building parsers that construct complex values from
 * multiple parsed components.
 *
 * @example
 * ```ts
 * import { apply, wrap, map, fromString } from "./parser.ts";
 * import { pipe } from "../fn.ts";
 *
 * const parser = pipe(
 *   wrap((x: number) => (y: string) => ({ x, y })),
 *   apply(wrap(42)),
 *   apply(wrap("hello"))
 * );
 * ```
 *
 * @since 2.3.4
 */
export function apply<A, S = unknown>(
  ua: Parser<S, A>,
): <I>(ufai: Parser<S, (a: A) => I>) => Parser<S, I> {
  return FlatmappableParser.apply(ua);
}

/**
 * Transform the successful result of a parser using the provided function.
 * If the parser fails, the error is propagated unchanged.
 *
 * @example
 * ```ts
 * import { map, succeed, fromString } from "./parser.ts";
 * import { pipe } from "../fn.ts";
 *
 * const parser = pipe(
 *   succeed(5),
 *   map(n => n * 2)
 * );
 * const stream = fromString("hello");
 * const result = parser(stream); // [Right(10), stream]
 * ```
 *
 * @since 2.3.4
 */
export function map<A, I, S = unknown>(
  fai: (a: A) => I,
): (ua: Parser<S, A>) => Parser<S, I> {
  return FlatmappableParser.map(fai);
}

/**
 * Chain parsers together sequentially. The result of the first parser
 * is used to determine what parser to run next. This is the bind operation
 * for the Parser monad.
 *
 * @example
 * ```ts
 * import { flatmap, take, succeed, fromString } from "./parser.ts";
 * import { pipe } from "../fn.ts";
 *
 * const parser = pipe(
 *   take<string>(),
 *   flatmap(([char]) =>
 *     char === "h" ? succeed("hello") : fail(char, "expected 'h'")
 *   )
 * );
 * ```
 *
 * @since 2.3.4
 */
export function flatmap<A, I, S = unknown>(
  faui: (a: A) => Parser<S, I>,
): (ua: Parser<S, A>) => Parser<S, I> {
  return FlatmappableParser.flatmap(faui);
}

/**
 * Provide a recovery mechanism for failed parsers. If the first parser
 * fails, the recovery function is called with the error to produce an
 * alternative parser.
 *
 * @example
 * ```ts
 * import { recover, fail, succeed, fromString } from "./parser.ts";
 * import { pipe } from "../fn.ts";
 *
 * const parser = pipe(
 *   fail("test", "always fails"),
 *   recover(err => succeed("recovered"))
 * );
 * const stream = fromString("hello");
 * const result = parser(stream); // [Right("recovered"), stream]
 * ```
 *
 * @since 2.3.4
 */
export function recover<I, S = unknown>(
  fbuj: (b: DecodeError) => Parser<S, I>,
): <A>(ua: Parser<S, A>) => Parser<S, A | I> {
  return (ua) => (s1) => {
    const result = ua(s1);
    const [ea, s2] = result;
    if (isLeft(ea)) {
      return fbuj(ea.left)(s2);
    }
    return result;
  };
}

/**
 * Take a specified number of tokens from the stream. This is a fundamental
 * parsing operation that consumes tokens and advances the stream position.
 * If the stream doesn't have enough tokens, the parser fails.
 *
 * @example
 * ```ts
 * import { take, fromString } from "./parser.ts";
 *
 * const parser = take<string>(3);
 * const stream = fromString("hello");
 * const result = parser(stream); // [Right(["h", "e", "l"]), stream']
 * ```
 *
 * @since 2.3.4
 */
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

const ComparableArrayString = getComparableArray(ComparableString);

/**
 * Create a parser that takes a specified number of tokens and tests them
 * against a predicate. If the predicate succeeds, the parser succeeds with
 * the refined type. Otherwise, it fails with the provided error message.
 *
 * @example
 * ```ts
 * import { fromPredicate, fromString } from "./parser.ts";
 *
 * const isVowel = (chars: readonly [string, ...string[]]): chars is readonly [string, ...string[]] =>
 *   "aeiou".includes(chars[0]);
 *
 * const vowelParser = fromPredicate(isVowel, "expected vowel");
 * const stream = fromString("apple");
 * const result = vowelParser(stream); // [Right(["a"]), stream']
 * ```
 *
 * @since 2.3.4
 */
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

/**
 * Try multiple parsers in sequence until one succeeds. Returns the result
 * of the first successful parser. If all parsers fail, combines their
 * errors into a single failure.
 *
 * @example
 * ```ts
 * import { any, literal, fromString } from "./parser.ts";
 *
 * const parser = any(literal("hello"), literal("hi"), literal("hey"));
 * const stream = fromString("hi world");
 * const result = parser(stream); // [Right("hi"), stream']
 * ```
 *
 * @since 2.3.4
 */
export function any<T extends NonEmptyArray<AnyParser>>(
  ...parsers: T
): Parser<ToState<T[keyof T]>, ToType<T[keyof T]>> {
  return (stream) => {
    const errors: DecodeError[] = [];
    for (const parser of parsers) {
      const result = parser(stream);
      if (isRight(result[0])) {
        return result;
      }
      errors.push(result[0].left);
    }
    return [
      fromError(manyErr(...errors)),
      stream,
    ];
  };
}

/**
 * Run multiple parsers in sequence, collecting all their results into a tuple.
 * If any parser fails, the entire sequence fails and the stream is restored
 * to its original position.
 *
 * @example
 * ```ts
 * import { sequence, literal, fromString } from "./parser.ts";
 *
 * const parser = sequence(literal("hello"), literal(" "), literal("world"));
 * const stream = fromString("hello world");
 * const result = parser(stream); // [Right(["hello", " ", "world"]), stream']
 * ```
 *
 * @since 2.3.4
 */
export function sequence<T extends NonEmptyArray<AnyParser>>(
  ...parsers: T
): Parser<ToState<T[keyof T]>, { [K in keyof T]: ToType<T[K]> }> {
  return (stream) => {
    // deno-lint-ignore no-explicit-any
    const results: any[] = [];
    for (const parser of parsers) {
      const result = parser(stream);
      if (isLeft(result[0])) {
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

/**
 * Apply a parser zero or more times, collecting all successful results.
 * This parser never fails - if the provided parser fails on the first
 * attempt, it returns an empty array.
 *
 * @example
 * ```ts
 * import { many, literal, fromString } from "./parser.ts";
 *
 * const parser = many(literal("a"));
 * const stream1 = fromString("aaab");
 * const result1 = parser(stream1); // [Right(["a", "a", "a"]), stream']
 *
 * const stream2 = fromString("bbb");
 * const result2 = parser(stream2); // [Right([]), stream] (unchanged)
 * ```
 *
 * @since 2.3.4
 */
export function many<S, A>(
  parser: Parser<S, A>,
): Parser<S, readonly A[]> {
  return (stream) => {
    const results: A[] = [];
    while (!stream.atEnd()) {
      const result = parser(stream);
      if (isLeft(result[0])) {
        break;
      }
      results.push(result[0].right);
    }
    return [success(results), stream];
  };
}

/**
 * Apply a parser one or more times, collecting all successful results.
 * This is equivalent to applying the parser once, then applying `many`
 * to get additional results.
 *
 * @example
 * ```ts
 * import { some, literal, fromString } from "./parser.ts";
 *
 * const parser = some(literal("a"));
 * const stream1 = fromString("aaab");
 * const result1 = parser(stream1); // [Right(["a", "a", "a"]), stream']
 *
 * const stream2 = fromString("bbb");
 * const result2 = parser(stream2); // [Left(DecodeError), stream] (fails)
 * ```
 *
 * @since 2.3.4
 */
export function some<S, A>(
  parser: Parser<S, A>,
): Parser<S, NonEmptyArray<A>> {
  return pipe(sequence(parser, many(parser)), map(([a, as]) => [a, ...as]));
}

/**
 * Make a parser optional. If the parser succeeds, returns the result.
 * If the parser fails, returns undefined without consuming input.
 *
 * @example
 * ```ts
 * import { maybe, literal, fromString } from "./parser.ts";
 *
 * const parser = maybe(literal("hello"));
 * const stream1 = fromString("hello world");
 * const result1 = parser(stream1); // [Right("hello"), stream']
 *
 * const stream2 = fromString("goodbye");
 * const result2 = parser(stream2); // [Right(undefined), stream] (unchanged)
 * ```
 *
 * @since 2.3.4
 */
export function maybe<S, A>(
  parser: Parser<S, A>,
): Parser<S, Nil<A>> {
  return pipe(parser, recover(() => succeed(undefined)));
}

/**
 * Make a parser optional with a default value. If the parser succeeds,
 * returns the result. If the parser fails, returns the provided default
 * value without consuming input.
 *
 * @example
 * ```ts
 * import { withDefault, literal, fromString } from "./parser.ts";
 *
 * const parser = withDefault(literal("hello"), "hi");
 * const stream1 = fromString("hello world");
 * const result1 = parser(stream1); // [Right("hello"), stream']
 *
 * const stream2 = fromString("goodbye");
 * const result2 = parser(stream2); // [Right("hi"), stream] (unchanged)
 * ```
 *
 * @since 2.3.4
 */
export function withDefault<S, A>(
  parser: Parser<S, A>,
  def: A,
): Parser<S, A> {
  return pipe(maybe(parser), map((a) => isNil(a) ? def : a));
}

/**
 * String Parsers
 *
 * This section contains parsers specifically designed for parsing string
 * input. These parsers work with the StringStream and provide common
 * text parsing operations.
 */

/**
 * Parse an exact string literal. The parser succeeds only if the input
 * matches the provided string exactly.
 *
 * @example
 * ```ts
 * import { literal, fromString } from "./parser.ts";
 *
 * const parser = literal("hello");
 * const stream = fromString("hello world");
 * const result = parser(stream); // [Right("hello"), stream']
 * ```
 *
 * @since 2.3.4
 */
export function literal<T extends string>(match: T): Parser<string, T> {
  const match_array = Array.from(match);
  const matcher = ComparableArrayString.compare(match_array);
  return pipe(
    take<string>(match_array.length),
    flatmap((slice) =>
      matcher(slice)
        ? succeed(match)
        : fail(slice.join(""), `expected literal ${match}`)
    ),
  );
}

/**
 * Try to parse any of the provided string literals. Returns the first
 * literal that matches successfully.
 *
 * @example
 * ```ts
 * import { literals, fromString } from "./parser.ts";
 *
 * const parser = literals("hello", "hi", "hey");
 * const stream = fromString("hi there");
 * const result = parser(stream); // [Right("hi"), stream']
 * ```
 *
 * @since 2.3.4
 */
export function literals(
  ...matches: NonEmptyArray<string>
): Parser<string, string> {
  type MatchParsers = NonEmptyArray<Parser<string, string>>;
  const match_parsers = pipe(matches, mapArray(literal)) as MatchParsers;
  return any(...match_parsers);
}

/**
 * Parse a single character that falls within the specified range (inclusive).
 * The range is determined by character code comparison.
 *
 * @example
 * ```ts
 * import { range, fromString } from "./parser.ts";
 *
 * const parser = range("a", "z");
 * const stream = fromString("hello");
 * const result = parser(stream); // [Right("h"), stream']
 * ```
 *
 * @since 2.3.4
 */
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

/**
 * Parse a lowercase letter (a-z).
 *
 * @example
 * ```ts
 * import { lower, fromString } from "./parser.ts";
 *
 * const stream = fromString("hello");
 * const result = lower(stream); // [Right("h"), stream']
 * ```
 *
 * @since 2.3.4
 */
export const lower: Parser<string, string> = range("a", "z");

/**
 * Parse an uppercase letter (A-Z).
 *
 * @example
 * ```ts
 * import { upper, fromString } from "./parser.ts";
 *
 * const stream = fromString("Hello");
 * const result = upper(stream); // [Right("H"), stream']
 * ```
 *
 * @since 2.3.4
 */
export const upper: Parser<string, string> = range("A", "Z");

/**
 * Parse a non-zero digit (1-9).
 *
 * @since 2.3.4
 */
export const nonzero: Parser<string, string> = range("1", "9");

/**
 * Parse any single digit (0-9).
 *
 * @example
 * ```ts
 * import { digit, fromString } from "./parser.ts";
 *
 * const stream = fromString("123");
 * const result = digit(stream); // [Right("1"), stream']
 * ```
 *
 * @since 2.3.4
 */
export const digit: Parser<string, string> = any(literal("0"), nonzero);

/**
 * Parse any alphabetic character (a-z or A-Z).
 *
 * @example
 * ```ts
 * import { alpha, fromString } from "./parser.ts";
 *
 * const stream = fromString("Hello123");
 * const result = alpha(stream); // [Right("H"), stream']
 * ```
 *
 * @since 2.3.4
 */
export const alpha: Parser<string, string> = any(lower, upper);

/**
 * Parse any alphanumeric character (a-z, A-Z, or 0-9).
 *
 * @example
 * ```ts
 * import { alphanumeric, fromString } from "./parser.ts";
 *
 * const stream = fromString("Hello123");
 * const result = alphanumeric(stream); // [Right("H"), stream']
 * ```
 *
 * @since 2.3.4
 */
export const alphanumeric: Parser<string, string> = any(alpha, digit);

/**
 * Parse a natural number (positive integer). Does not include zero.
 *
 * @example
 * ```ts
 * import { natural_number, fromString } from "./parser.ts";
 *
 * const stream = fromString("123abc");
 * const result = natural_number(stream); // [Right(123), stream']
 * ```
 *
 * @since 2.3.4
 */
export const natural_number: Parser<string, number> = pipe(
  sequence(nonzero, many(digit)),
  map(([lead, rest]) => parseInt(`${lead}${rest.join("")}`, 10)),
);

/**
 * Parse an integer (positive or negative). Supports optional minus sign.
 *
 * @example
 * ```ts
 * import { integer, fromString } from "./parser.ts";
 *
 * const stream1 = fromString("123");
 * const result1 = integer(stream1); // [Right(123), stream']
 *
 * const stream2 = fromString("-456");
 * const result2 = integer(stream2); // [Right(-456), stream']
 * ```
 *
 * @since 2.3.4
 */
export const integer: Parser<string, number> = pipe(
  sequence(maybe(literal("-")), natural_number),
  map(([sign, number]) => isNil(sign) ? number : -1 * number),
);

/**
 * Parse a decimal number. Supports optional sign and decimal places.
 *
 * @example
 * ```ts
 * import { decimal, fromString } from "./parser.ts";
 *
 * const stream1 = fromString("123.45");
 * const result1 = decimal(stream1); // [Right(123.45), stream']
 *
 * const stream2 = fromString("-3.14159");
 * const result2 = decimal(stream2); // [Right(-3.14159), stream']
 * ```
 *
 * @since 2.3.4
 */
export const decimal: Parser<string, number> = pipe(
  sequence(
    withDefault(literals("+", "-"), "+"),
    natural_number,
    withDefault(literal("."), "."),
    many(digit),
  ),
  map(([sign, whole, decimal, remainder]) =>
    parseFloat(`${sign}${whole}${decimal}${remainder.join("")}`)
  ),
);

/**
 * Parse a value surrounded by specific left and right delimiters.
 * This is useful for parsing bracketed expressions, quoted strings,
 * parenthesized groups, etc.
 *
 * @example
 * ```ts
 * import { bracket, literal, many, alpha, fromString } from "./parser.ts";
 *
 * const parser = bracket("(", many(alpha), ")");
 * const stream = fromString("(hello)");
 * const result = parser(stream); // [Right(["h","e","l","l","o"]), stream']
 * ```
 *
 * @since 2.3.4
 */
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

/**
 * Parse a value surrounded by the same delimiter on both sides.
 * This is a convenience function for common cases like quoted strings.
 *
 * @example
 * ```ts
 * import { surround, many, alpha, fromString } from "./parser.ts";
 *
 * const parser = surround('"', many(alpha));
 * const stream = fromString('"hello"');
 * const result = parser(stream); // [Right(["h","e","l","l","o"]), stream']
 * ```
 *
 * @since 2.3.4
 */
export function surround<A>(
  outer: string,
  value: Parser<string, A>,
): Parser<string, A> {
  return bracket(outer, value, outer);
}
