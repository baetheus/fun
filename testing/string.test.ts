import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as S from "../string.ts";
import * as O from "../option.ts";
import { pipe } from "../fn.ts";

Deno.test("String equals", () => {
  const hello = "Hello";
  const hi = "hi";

  assertEquals(pipe(hello, S.equals(hi)), false);
  assertEquals(pipe(hi, S.equals(hi)), true);
});

Deno.test("String concat", () => {
  assertEquals(pipe("Hello", S.concat("World")), "HelloWorld");
});

Deno.test("String empty", () => {
  assertEquals(S.empty(), "");
});

Deno.test("String compare", () => {
  assertEquals(S.compare("aa", "aa"), 0);
  assertEquals(S.compare("aa", "ab"), -1);
  assertEquals(S.compare("ab", "aa"), 1);
  assertEquals(S.compare("aa", "bb"), -1);
  assertEquals(S.compare("a", "aa"), -1);
});

Deno.test("String isString", () => {
  assertEquals(S.isString(1), false);
  assertEquals(S.isString(""), true);
});

Deno.test("String isEmpty", () => {
  assertEquals(S.isEmpty("Hello"), false);
  assertEquals(S.isEmpty(""), true);
});

Deno.test("String length", () => {
  assertEquals(S.length("Hello"), 5);
  assertEquals(S.length(""), 0);
});

Deno.test("String split", () => {
  const splitSpace = S.split(" ");
  const splitWords = S.split(/\s+/);
  const splitHello = S.split("Hello");

  assertEquals(splitHello("Garage"), ["Garage"]);
  assertEquals(splitSpace(""), [""]);
  assertEquals(splitSpace("Hello  World"), ["Hello", "", "World"]);
  assertEquals(splitWords(""), [""]);
  assertEquals(splitWords("Hello  World"), ["Hello", "World"]);
});

Deno.test("String includes", () => {
  const inc1 = S.includes("ello");
  const inc2 = S.includes("ello", 2);

  assertEquals(inc1("Hello World"), true);
  assertEquals(inc1(""), false);
  assertEquals(inc2("Hello World"), false);
  assertEquals(inc1("World Hello"), true);
});

Deno.test("String startsWith", () => {
  const inc1 = S.startsWith("ello");
  const inc2 = S.startsWith("ello", 1);

  assertEquals(inc1("Hello World"), false);
  assertEquals(inc1(""), false);
  assertEquals(inc2("Hello World"), true);
  assertEquals(inc1("World Hello"), false);
});

Deno.test("String endsWith", () => {
  const inc1 = S.endsWith("orld");
  const inc2 = S.endsWith("orld", 1);

  assertEquals(inc1("Hello World"), true);
  assertEquals(inc1(""), false);
  assertEquals(inc2("Hello World"), false);
  assertEquals(inc1("World Hello"), false);
});

Deno.test("String toUpperCase", () => {
  assertEquals(S.toUpperCase("Hello"), "HELLO");
});

Deno.test("String toLowerCase", () => {
  assertEquals(S.toLowerCase("Hello"), "hello");
});

Deno.test("String replace", () => {
  const rep1 = S.replace("hello", "Hello");
  const rep2 = S.replace(/hello/gi, "Hello");

  assertEquals(rep1("hello world"), "Hello world");
  assertEquals(rep1(""), "");
  assertEquals(rep2("hElLo World"), "Hello World");
});

Deno.test("String trim", () => {
  assertEquals(S.trim("Hello World"), "Hello World");
  assertEquals(S.trim("  Hello World"), "Hello World");
  assertEquals(S.trim("Hello World  "), "Hello World");
  assertEquals(S.trim("  Hello World  "), "Hello World");
});

Deno.test("String trimStart", () => {
  assertEquals(S.trimStart("Hello World"), "Hello World");
  assertEquals(S.trimStart("  Hello World"), "Hello World");
  assertEquals(S.trimStart("Hello World  "), "Hello World  ");
  assertEquals(S.trimStart("  Hello World  "), "Hello World  ");
});

Deno.test("String trimEnds", () => {
  assertEquals(S.trimEnd("Hello World"), "Hello World");
  assertEquals(S.trimEnd("  Hello World"), "  Hello World");
  assertEquals(S.trimEnd("Hello World  "), "Hello World");
  assertEquals(S.trimEnd("  Hello World  "), "  Hello World");
});

Deno.test("String slice", () => {
  const slice = S.slice(1, 5);
  assertEquals(slice("Hello"), "ello");
  assertEquals(slice(""), "");
  assertEquals(slice("Hel"), "el");
});

Deno.test("String match", () => {
  const words = S.match(/\w+/g);
  assertEquals(words(""), O.none);
  assertEquals(words("Hello World"), O.some(["Hello", "World"]));
  assertEquals(words("Hello  World"), O.some(["Hello", "World"]));
});

Deno.test("String test", () => {
  const hasHello = S.test(/hello/i);

  assertEquals(hasHello("Hello World"), true);
  assertEquals(hasHello("Goodbye"), false);
});
