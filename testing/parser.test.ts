import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

import {
  alpha,
  alphanumeric,
  any,
  apply,
  bracket,
  decimal,
  digit,
  fail,
  failure,
  flatmap,
  fromError,
  fromPredicate,
  fromString,
  integer,
  literal,
  literals,
  lower,
  many,
  map,
  maybe,
  natural_number,
  nonzero,
  range,
  recover,
  sequence,
  some,
  StringStream,
  succeed,
  success,
  surround,
  take,
  upper,
  withDefault,
  wrap,
} from "../parser.ts";
import { isLeft, isRight } from "../either.ts";
import { leafErr } from "../decoder.ts";
import { pipe } from "../fn.ts";

/**
 * StringStream Tests
 */

Deno.test("StringStream - constructor creates stream from string", () => {
  const stream = new StringStream("hello");
  assertEquals(stream.source, "hello");
});

Deno.test("StringStream - take() returns single character by default", () => {
  const stream = new StringStream("hello");
  const result = stream.take();
  assertEquals(result, ["h"]);
});

Deno.test("StringStream - take() returns multiple characters", () => {
  const stream = new StringStream("hello");
  const result = stream.take(3);
  assertEquals(result, ["h", "e", "l"]);
});

Deno.test("StringStream - take() handles count larger than remaining characters", () => {
  const stream = new StringStream("hi");
  const result = stream.take(5);
  assertEquals(result, ["h", "i"]);
});

Deno.test("StringStream - take() handles negative count", () => {
  const stream = new StringStream("hello");
  const result = stream.take(-1);
  assertEquals(result, ["h"]);
});

Deno.test("StringStream - take() handles fractional count", () => {
  const stream = new StringStream("hello");
  const result = stream.take(2.7);
  assertEquals(result, ["h", "e"]);
});

Deno.test("StringStream - undo() reverts single take", () => {
  const stream = new StringStream("hello");
  stream.take(2);
  stream.undo();
  const result = stream.take(1);
  assertEquals(result, ["h"]);
});

Deno.test("StringStream - undo() reverts multiple takes", () => {
  const stream = new StringStream("hello");
  stream.take(1);
  stream.take(2);
  stream.undo(2);
  const result = stream.take(1);
  assertEquals(result, ["h"]);
});

Deno.test("StringStream - undo() handles count larger than history", () => {
  const stream = new StringStream("hello");
  stream.take(1);
  stream.undo(5);
  const result = stream.take(1);
  assertEquals(result, ["h"]);
});

Deno.test("StringStream - undo() handles negative count", () => {
  const stream = new StringStream("hello");
  stream.take(2);
  stream.undo(-1);
  const result = stream.take(1);
  assertEquals(result, ["l"]);
});

Deno.test("StringStream - undo() handles fractional count", () => {
  const stream = new StringStream("hello");
  stream.take(2);
  stream.undo(1.7);
  const result = stream.take(1);
  assertEquals(result, ["h"]);
});

Deno.test("StringStream - atEnd() returns false when not at end", () => {
  const stream = new StringStream("hello");
  assertEquals(stream.atEnd(), false);
});

Deno.test("StringStream - atEnd() returns true when at end", () => {
  const stream = new StringStream("hello");
  stream.take(5);
  assertEquals(stream.atEnd(), true);
});

Deno.test("StringStream - atEnd() returns true for empty string", () => {
  const stream = new StringStream("");
  assertEquals(stream.atEnd(), true);
});

/**
 * fromString Tests
 */

Deno.test("fromString - creates StringStream from string", () => {
  const stream = fromString("test");
  assertExists(stream);
  assertEquals(stream.take(1), ["t"]);
});

/**
 * Basic Parser Result Functions Tests
 */

Deno.test("success - creates right Either with value", () => {
  const result = success("hello");
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "hello");
  }
});

Deno.test("failure - creates left Either with DecodeError", () => {
  const result = failure("actual", "expected string");
  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left.tag, "Leaf");
  }
});

Deno.test("fromError - creates left Either from DecodeError", () => {
  const error = leafErr("actual", "error message");
  const result = fromError(error);
  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left, error);
  }
});

/**
 * Core Parser Functions Tests
 */

Deno.test("succeed - creates parser that always succeeds", () => {
  const parser = succeed("success");
  const stream = fromString("hello");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "success");
  }
});

Deno.test("fail - creates parser that always fails", () => {
  const parser = fail("actual", "expected");
  const stream = fromString("hello");
  const [result, newStream] = parser(stream);
  assertEquals(isLeft(result), true);
  // Should undo the stream
  assertEquals(newStream.take(1), ["h"]);
});

Deno.test("wrap - wraps value in successful parser", () => {
  const parser = wrap(42);
  const stream = fromString("test");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 42);
  }
});

Deno.test("map - transforms successful parser result", () => {
  const parser = pipe(
    succeed("hello"),
    map((s: string) => s.toUpperCase()),
  );
  const stream = fromString("test");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "HELLO");
  }
});

Deno.test("map - preserves failure", () => {
  const parser = pipe(
    fail("actual", "expected"),
    map((s: string) => s.toUpperCase()),
  );
  const stream = fromString("test");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("flatmap - chains parsers on success", () => {
  const parser = pipe(
    succeed("hello"),
    flatmap((s: string) => succeed(s.length)),
  );
  const stream = fromString("test");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 5);
  }
});

Deno.test("flatmap - short-circuits on first failure", () => {
  const parser = pipe(
    fail("actual", "expected"),
    flatmap((s: string) => succeed(s.length)),
  );
  const stream = fromString("test");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("recover - recovers from failure", () => {
  const parser = pipe(
    fail("actual", "expected"),
    recover(() => succeed("recovered")),
  );
  const stream = fromString("test");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "recovered");
  }
});

Deno.test("recover - preserves success", () => {
  const parser = pipe(
    succeed("original"),
    recover(() => succeed("recovered")),
  );
  const stream = fromString("test");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "original");
  }
});

/**
 * Parser Combinator Tests
 */

Deno.test("take - takes single character by default", () => {
  const parser = take<string>();
  const stream = fromString("hello");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, ["h"]);
  }
});

Deno.test("take - takes multiple characters", () => {
  const parser = take<string>(3);
  const stream = fromString("hello");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, ["h", "e", "l"]);
  }
});

Deno.test("take - fails when not enough characters", () => {
  const parser = take<string>(10);
  const stream = fromString("hi");
  const [result, newStream] = parser(stream);
  assertEquals(isLeft(result), true);
  // Should undo the stream
  assertEquals(newStream.take(1), ["h"]);
});

Deno.test("fromPredicate - succeeds when predicate matches", () => {
  const parser = fromPredicate<string>(
    (s): s is [string] => s[0] === "h",
    "expected 'h'",
  );
  const stream = fromString("hello");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, ["h"]);
  }
});

Deno.test("fromPredicate - fails when predicate doesn't match", () => {
  const parser = fromPredicate<string>(
    (s): s is [string] => s[0] === "x",
    "expected 'x'",
  );
  const stream = fromString("hello");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("any - returns first successful parser", () => {
  const parser = any(
    fail("", "first"),
    succeed("second"),
    succeed("third"),
  );
  const stream = fromString("test");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "second");
  }
});

Deno.test("any - fails when all parsers fail", () => {
  const parser = any(
    fail("", "first"),
    fail("", "second"),
    fail("", "third"),
  );
  const stream = fromString("test");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
  if (isLeft(result)) {
    assertEquals(result.left.tag, "Many");
  }
});

Deno.test("sequence - succeeds when all parsers succeed", () => {
  const parser = sequence(
    succeed("first"),
    succeed("second"),
    succeed("third"),
  );
  const stream = fromString("test");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, ["first", "second", "third"]);
  }
});

Deno.test("sequence - fails when any parser fails", () => {
  const parser = sequence(
    succeed("first"),
    fail("", "expected"),
    succeed("third"),
  );
  const stream = fromString("test");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("many - parses zero or more occurrences", () => {
  const parser = many(literal("a"));
  const stream = fromString("aaab");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, ["a", "a", "a"]);
  }
});

Deno.test("many - succeeds with empty array when no matches", () => {
  const parser = many(literal("a"));
  const stream = fromString("bbbb");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, []);
  }
});

Deno.test("some - parses one or more occurrences", () => {
  const parser = some(literal("a"));
  const stream = fromString("aaab");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, ["a", "a", "a"]);
  }
});

Deno.test("some - fails when no matches", () => {
  const parser = some(literal("a"));
  const stream = fromString("bbbb");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("maybe - succeeds with value when parser succeeds", () => {
  const parser = maybe(literal("a"));
  const stream = fromString("abc");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "a");
  }
});

Deno.test("maybe - succeeds with undefined when parser fails", () => {
  const parser = maybe(literal("a"));
  const stream = fromString("bbc");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, undefined);
  }
});

Deno.test("withDefault - uses parser value when succeeds", () => {
  const parser = withDefault(literal("a"), "default");
  const stream = fromString("abc");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "a");
  }
});

Deno.test("withDefault - uses default when parser fails", () => {
  const parser = withDefault(literal("a"), "default");
  const stream = fromString("bbc");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "default");
  }
});

/**
 * String Parser Tests
 */

Deno.test("literal - matches exact string", () => {
  const parser = literal("hello");
  const stream = fromString("hello world");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "hello");
  }
});

Deno.test("literal - fails on mismatch", () => {
  const parser = literal("hello");
  const stream = fromString("goodbye");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("literal - fails on partial match", () => {
  const parser = literal("hello");
  const stream = fromString("hel");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("literals - matches any of the provided strings", () => {
  const parser = literals("hello", "hi", "hey");
  const stream = fromString("hi there");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "hi");
  }
});

Deno.test("literals - fails when none match", () => {
  const parser = literals("hello", "hi", "hey");
  const stream = fromString("goodbye");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("range - matches character in range", () => {
  const parser = range("a", "z");
  const stream = fromString("hello");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "h");
  }
});

Deno.test("range - fails on character outside range", () => {
  const parser = range("a", "z");
  const stream = fromString("HELLO");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("lower - matches lowercase letter", () => {
  const stream = fromString("hello");
  const [result, _] = lower(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "h");
  }
});

Deno.test("lower - fails on uppercase letter", () => {
  const stream = fromString("HELLO");
  const [result, _] = lower(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("upper - matches uppercase letter", () => {
  const stream = fromString("HELLO");
  const [result, _] = upper(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "H");
  }
});

Deno.test("upper - fails on lowercase letter", () => {
  const stream = fromString("hello");
  const [result, _] = upper(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("digit - matches any digit", () => {
  const stream = fromString("123");
  const [result, _] = digit(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "1");
  }
});

Deno.test("digit - fails on non-digit", () => {
  const stream = fromString("abc");
  const [result, _] = digit(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("nonzero - matches non-zero digit", () => {
  const stream = fromString("123");
  const [result, _] = nonzero(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "1");
  }
});

Deno.test("nonzero - fails on zero", () => {
  const stream = fromString("0123");
  const [result, _] = nonzero(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("alpha - matches alphabetic character", () => {
  const stream = fromString("Hello");
  const [result, _] = alpha(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "H");
  }
});

Deno.test("alpha - fails on non-alphabetic", () => {
  const stream = fromString("123");
  const [result, _] = alpha(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("alphanumeric - matches alphanumeric character", () => {
  const stream = fromString("H3llo");
  const [result, _] = alphanumeric(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "H");
  }
});

Deno.test("alphanumeric - fails on non-alphanumeric", () => {
  const stream = fromString("@hello");
  const [result, _] = alphanumeric(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("natural_number - parses positive integer", () => {
  const stream = fromString("123abc");
  const [result, _] = natural_number(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 123);
  }
});

Deno.test("natural_number - fails on zero", () => {
  const stream = fromString("0123");
  const [result, _] = natural_number(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("natural_number - fails on negative", () => {
  const stream = fromString("-123");
  const [result, _] = natural_number(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("integer - parses positive integer", () => {
  const stream = fromString("123");
  const [result, _] = integer(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 123);
  }
});

Deno.test("integer - parses negative integer", () => {
  const stream = fromString("-123");
  const [result, _] = integer(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, -123);
  }
});

Deno.test("integer - fails on non-integer", () => {
  const stream = fromString("abc");
  const [result, _] = integer(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("decimal - parses integer as decimal", () => {
  const stream = fromString("123");
  const [result, _] = decimal(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 123);
  }
});

Deno.test("decimal - parses decimal number", () => {
  const stream = fromString("123.456");
  const [result, _] = decimal(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 123.456);
  }
});

Deno.test("decimal - parses negative decimal", () => {
  const stream = fromString("-123.456");
  const [result, _] = decimal(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, -123.456);
  }
});

Deno.test("bracket - extracts value between brackets", () => {
  const parser = bracket("(", literal("hello"), ")");
  const stream = fromString("(hello)");
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "hello");
  }
});

Deno.test("bracket - fails on missing left bracket", () => {
  const parser = bracket("(", literal("hello"), ")");
  const stream = fromString("hello)");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("bracket - fails on missing right bracket", () => {
  const parser = bracket("(", literal("hello"), ")");
  const stream = fromString("(hello");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
});

Deno.test("surround - extracts value between identical delimiters", () => {
  const parser = surround('"', literal("hello"));
  const stream = fromString('"hello"');
  const [result, _] = parser(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "hello");
  }
});

Deno.test("surround - fails on missing delimiters", () => {
  const parser = surround('"', literal("hello"));
  const stream = fromString("hello");
  const [result, _] = parser(stream);
  assertEquals(isLeft(result), true);
});

/**
 * Integration Tests
 */

Deno.test("Integration - parsing a simple arithmetic expression", () => {
  const number = natural_number;
  const plus = literal("+");
  const expression = pipe(
    sequence(number, plus, number),
    map(([a, _, b]) => a + b),
  );

  const stream = fromString("123+456");
  const [result, _stream] = expression(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 579);
  }
});

Deno.test("Integration - parsing optional elements", () => {
  const greeting = pipe(
    sequence(
      literal("Hello"),
      maybe(sequence(literal(" "), alpha)),
      literal("!"),
    ),
    map(([hello, name, exclaim]) =>
      name ? `${hello} ${name[1]}${exclaim}` : `${hello}${exclaim}`
    ),
  );

  const stream1 = fromString("Hello!");
  const [result1, _stream1] = greeting(stream1);
  assertEquals(isRight(result1), true);
  if (isRight(result1)) {
    assertEquals(result1.right, "Hello!");
  }

  const stream2 = fromString("Hello A!");
  const [result2, _stream2] = greeting(stream2);
  assertEquals(isRight(result2), true);
  if (isRight(result2)) {
    assertEquals(result2.right, "Hello A!");
  }
});

Deno.test("Integration - parsing repeated elements", () => {
  const wordList = pipe(
    sequence(
      some(alpha),
      many(sequence(literal(","), some(alpha))),
    ),
    map(([first, rest]) => [
      first.join(""),
      ...rest.map(([_, word]) => word.join("")),
    ]),
  );

  const stream = fromString("abc,def,ghi");
  const [result, _stream] = wordList(stream);
  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, ["abc", "def", "ghi"]);
  }
});

/**
 * apply Function Tests
 */

Deno.test("apply - applies function parser to value parser (success case)", () => {
  const valueParser = succeed("hello");
  const functionParser = succeed((s: string) => s.toUpperCase());

  const resultParser = apply(valueParser)(functionParser);
  const stream = fromString("test");
  const [result, _stream] = resultParser(stream);

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "HELLO");
  }
});

Deno.test("apply - fails when value parser fails", () => {
  const valueParser = fail("actual", "expected string");
  const functionParser = succeed((s: string) => s.toUpperCase());

  const resultParser = apply(valueParser)(functionParser);
  const stream = fromString("test");
  const [result, _stream] = resultParser(stream);

  assertEquals(isLeft(result), true);
});

Deno.test("apply - fails when function parser fails", () => {
  const valueParser = succeed("hello");
  const functionParser = fail("actual", "expected function");

  const resultParser = apply(valueParser)(functionParser);
  const stream = fromString("test");
  const [result, _stream] = resultParser(stream);

  assertEquals(isLeft(result), true);
});

Deno.test("apply - fails when both parsers fail", () => {
  const valueParser = fail("actual1", "expected string");
  const functionParser = fail("actual2", "expected function");

  const resultParser = apply(valueParser)(functionParser);
  const stream = fromString("test");
  const [result, _stream] = resultParser(stream);

  assertEquals(isLeft(result), true);
});

Deno.test("apply - works with complex transformations", () => {
  const valueParser = succeed(42);
  const functionParser = succeed((n: number) => n * 2 + 1);

  const resultParser = apply(valueParser)(functionParser);
  const stream = fromString("test");
  const [result, _stream] = resultParser(stream);

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, 85);
  }
});

Deno.test("apply - is curried (can be partially applied)", () => {
  const valueParser = succeed("world");
  const appliedValue = apply(valueParser);

  // Now we can apply different function parsers to the same value parser
  const upperCaseFunction = succeed((s: string) => s.toUpperCase());
  const lengthFunction = succeed((s: string) => s.length);

  const upperCaseParser = appliedValue(upperCaseFunction);
  const lengthParser = appliedValue(lengthFunction);

  const stream1 = fromString("test1");
  const [result1, _stream1] = upperCaseParser(stream1);
  assertEquals(isRight(result1), true);
  if (isRight(result1)) {
    assertEquals(result1.right, "WORLD");
  }

  const stream2 = fromString("test2");
  const [result2, _stream2] = lengthParser(stream2);
  assertEquals(isRight(result2), true);
  if (isRight(result2)) {
    assertEquals(result2.right, 5);
  }
});

Deno.test("apply - preserves stream state correctly", () => {
  const valueParser = succeed("test");
  const functionParser = succeed((s: string) => s.repeat(2));

  const resultParser = apply(valueParser)(functionParser);
  const stream = fromString("hello");

  // Stream should remain unchanged since parsers don't consume input
  const originalChar = stream.take(1)[0];
  stream.undo();

  const [result, newStream] = resultParser(stream);
  const afterParseChar = newStream.take(1)[0];

  assertEquals(isRight(result), true);
  if (isRight(result)) {
    assertEquals(result.right, "testtest");
  }
  assertEquals(originalChar, afterParseChar);
});
