/**
 * This file contains the String algebraic data type. String is a the built in
 * javascript string structure. This file contains data last implementations of
 * most of the String built in methods as well as minor "fixes" to make them
 * less error prone.
 *
 * @module String
 * @since 2.0.0
 */

import type { Combinable } from "./combinable.ts";
import type { Comparable } from "./comparable.ts";
import type { Initializable } from "./initializable.ts";
import type { NonEmptyArray } from "./array.ts";
import type { Option } from "./option.ts";
import type { Ordering, Sortable } from "./sortable.ts";
import type { Showable } from "./showable.ts";

import { fromCompare } from "./comparable.ts";
import { fromSort } from "./sortable.ts";
import { fromNullable } from "./option.ts";
import { isNonEmpty } from "./array.ts";

/**
 * Compare two strings for equality.
 *
 * @example
 * ```ts
 * import { compare } from "./string.ts";
 *
 * const hello = "Hello";
 * const hi = "hi";
 * const hi2 = "hi";
 *
 * const result1 = compare(hi)(hello); // false
 * const result2 = compare(hi)(hi2); // true
 * ```
 *
 * @since 2.0.0
 */
export function compare(second: string): (first: string) => boolean {
  return (first) => first === second;
}

/**
 * Combine two strings.
 *
 * @example
 * ```ts
 * import { combine } from "./string.ts";
 *
 * const result1 = combine("Hello")("World"); // "WorldHello"
 * ```
 *
 * @since 2.0.0
 */
export function combine(second: string): (first: string) => string {
  return (first) => `${first}${second}`;
}

/**
 * Returns an init string.
 *
 * @example
 * ```ts
 * import { init } from "./string.ts";
 *
 * const result = init(); // ""
 * ```
 *
 * @since 2.0.0
 */
export function init(): string {
  return "";
}

/**
 * Compare two strings and return an Ordering (-1, 0, or 1);
 *
 * @example
 * ```ts
 * import { sort } from "./string.ts";
 *
 * const result1 = sort("aa", "aa"); // 0
 * const result2 = sort("aa", "ab"); // -1
 * const result3 = sort("ba", "aa"); // 1
 * const result4 = sort("ab", "aa"); // 1
 * const result5 = sort("a", "aa"); // -1
 * ```
 *
 * @since 2.0.0
 */
export function sort(first: string, second: string): Ordering {
  return first < second ? -1 : second < first ? 1 : 0;
}

/**
 * A instance of Refinement<unknown, string>. Used as a type
 * guard to verify any type is actually a string.
 *
 * @example
 * ```ts
 * import { isString } from "./string.ts";
 *
 * const notString: unknown = 2;
 * const string: unknown = "hello";
 *
 * const result1 = isString(notString); // result1 has type unknown
 * const result2 = isString(string); // result2 has type string
 * ```
 *
 * @since 2.0.0
 */
export function isString(a: unknown): a is string {
  return typeof a === "string";
}

/**
 * A Predicate for string returning true if the
 * string is init.
 *
 * @example
 * ```ts
 * import { isEmpty } from "./string.ts";
 *
 * const result1 = isEmpty("Hello"); // false
 * const result2 = isEmpty(""); // true
 * ```
 *
 * @since 2.0.0
 */
export function isEmpty(a: string): boolean {
  return a.length === 0;
}

/**
 * Returns the length of an input string.
 *
 * @example
 * ```ts
 * import { length } from "./string.ts";
 *
 * const result1 = length("Hello"); // 5
 * const result2 = length(""); // 0
 * ```
 * @since 2.0.0
 */
export function length(a: string): number {
  return a.length;
}

/**
 * Split a string into an array of strings at
 * a character or RegExp match.
 *
 * @example
 * ```ts
 * import { split } from "./string.ts";
 * import { pipe } from "./fn.ts";
 *
 * const bySpace = split(" ");
 * const byWhitespace = split(/\s+/);
 * const str = "Hello  There  World";
 *
 * const result1 = bySpace(str); // ["Hello", "", "There", "", "World"]
 * const result2 = byWhitespace(str); // ["Hello", "There", "World"]
 * ```
 *
 * @since 2.0.0
 */
export function split(separator: string | RegExp) {
  return (s: string): NonEmptyArray<string> => {
    const out = s.split(separator);
    return isNonEmpty(out) ? out : [s];
  };
}

/**
 * Creates a Predicate over string that returns true when
 * a string includes the searchString at or beyond the
 * optional starting position.
 *
 * @example
 * ```ts
 * import { includes } from "./string.ts";
 *
 * const hasSpace = includes(" ");
 *
 * const result1 = hasSpace("Hello World"); // true
 * const result2 = hasSpace("Goodbye"); // false
 * ```
 *
 * @since 2.0.0
 */
export function includes(searchString: string, position?: number) {
  return (s: string): boolean => s.includes(searchString, position);
}

/**
 * Creates a Predicate over string that returns true when the string
 * starts with the supplied searchString starting at position, if
 * it is supplied.
 *
 * @example
 * ```ts
 * import { startsWith } from "./string.ts";
 *
 * const withHello = startsWith("Hello");
 *
 * const result1 = withHello("Hello World"); // true
 * const result2 = withHello("Goodbye"); // false
 * ```
 *
 * @since 2.0.0
 */
export function startsWith<T extends string>(
  searchString: T,
  position?: number,
) {
  return (s: string): s is `${T}${string}` =>
    s.startsWith(searchString, position);
}

/**
 * Creates a Predicate over string that returns true when the string
 * ends with the supplied searchString starting at position, if
 * it is supplied.
 *
 * @example
 * ```ts
 * import { endsWith } from "./string.ts";
 *
 * const withbye = endsWith("bye");
 *
 * const result1 = withbye("Hello World"); // false
 * const result2 = withbye("Goodbye"); // true
 * ```
 *
 * @since 2.0.0
 */
export function endsWith<T extends string>(searchString: T, position?: number) {
  return (s: string): s is `${string}${T}` =>
    s.endsWith(searchString, position);
}

/**
 * A pipeable form of String.toUpperCase.
 *
 * @example
 * ```ts
 * import { toUpperCase } from "./string.ts";
 *
 * const result = toUpperCase("hello"); // "HELLO"
 * ```
 *
 * @since 2.0.0
 */
export function toUpperCase(a: string): string {
  return a.toUpperCase();
}

/**
 * A pipeable form of String.toLowerCase.
 *
 * @example
 * ```ts
 * import { toLowerCase } from "./string.ts";
 *
 * const result = toLowerCase("Hello"); // "hello"
 * ```
 *
 * @since 2.0.0
 */
export function toLowerCase(a: string): string {
  return a.toLowerCase();
}

/**
 * Create a function that replaces all values in a string according
 * to a RegExp and a replacement value.
 *
 * @example
 * ```ts
 * import { replace } from "./string.ts";
 *
 * const cap = replace("hello", "Hello");
 *
 * const result = cap("hello World"); // "Hello World"
 * ```
 *
 * @since 2.0.0
 */
export function replace(searchValue: string | RegExp, replaceValue: string) {
  return (s: string): string => s.replace(searchValue, replaceValue);
}

/**
 * Trims whitespace from the beginning and end of a string.
 *
 * @example
 * ```ts
 * import { trim } from "./string.ts";
 *
 * const result1 = trim("Hello World"); // "Hello World"
 * const result2 = trim("  Hello World"); // "Hello World"
 * const result3 = trim("Hello World  "); // "Hello World"
 * const result4 = trim(" Hello World "); // "Hello World"
 * ```
 *
 * @since 2.0.0
 */
export function trim(a: string): string {
  return a.trim();
}

/**
 * Trims whitespace from the beginning of a string.
 *
 * @example
 * ```ts
 * import { trimStart } from "./string.ts";
 *
 * const result1 = trimStart("Hello World"); // "Hello World"
 * const result2 = trimStart("  Hello World"); // "Hello World"
 * const result3 = trimStart("Hello World  "); // "Hello World"
 * const result4 = trimStart(" Hello World "); // "Hello World"
 * ```
 *
 * @since 2.0.0
 */
export function trimStart(a: string): string {
  return a.trimStart();
}

/**
 * Trims whitespace from the end of a string.
 *
 * @example
 * ```ts
 * import { trimEnd } from "./string.ts";
 *
 * const result1 = trimEnd("Hello World"); // "Hello World"
 * const result2 = trimEnd("  Hello World"); // "Hello World"
 * const result3 = trimEnd("Hello World  "); // "Hello World"
 * const result4 = trimEnd(" Hello World "); // "Hello World"
 * ```
 *
 * @since 2.0.0
 */
export function trimEnd(a: string): string {
  return a.trimEnd();
}

/**
 * A simple curried pluralizing function. Takes the singular and plural
 * forms of a word and returns a function that takes a count and returns
 * the correct word for the count.
 *
 * @example
 * ```ts
 * import { plural } from "./string.ts";
 *
 * const are = plural("is", "are");
 * const rabbits = plural("rabbit", "rabbits");
 * const sentence = (n: number) => `There ${are(n)} ${n} ${rabbits(n)}`;
 *
 * const result1 = sentence(1); // "There is 1 rabbit"
 * const result2 = sentence(4); // "There are 4 rabbits"
 * const result3 = sentence(0); // "There are 0 rabbits"
 * ```
 *
 * @since 2.0.0
 */
export function plural(
  singular: string,
  plural: string,
): (count: number) => string {
  return (count) => count === 1 ? singular : plural;
}

/**
 * Create a substring of a string based on 0 based indices.
 *
 * @example
 * ```ts
 * import { slice } from "./string.ts";
 *
 * const slc = slice(1, 5);
 *
 * const result1 = slc(""); // ""
 * const result2 = slc("Hello"); "ello"
 * const result3 = slc("e");
 * ```
 *
 * @since 2.0.0
 */
export function slice(start: number, end: number) {
  return (a: string): string => a.slice(start, end);
}

/**
 * Create a function that returns an Option<RegExpMatchArray>. This
 * is a curried form of RegExp.match.
 *
 * @example
 * ```ts
 * import { match } from "./string.ts";
 *
 * const words = match(/\w+/g);
 *
 * const result1 = words("Hello World"); // Some(["Hello", "World"])
 * const result2 = words(""); // None
 * const result3 = words("1234"); // Some(["1234"])
 *
 * ```
 *
 * @since 2.0.0
 */
export function match(regex: RegExp) {
  return (a: string): Option<RegExpMatchArray> => fromNullable(a.match(regex));
}

/**
 * Create a Predicate that returns true when it matches the supplied
 * RegExp. Warning, this function technically mutates RegExp, but paradoxically
 * it does so to keep state the same. If the passed RegExp.test method is called
 * outside of this function then mayhem will surely ensue.
 *
 * @example
 * ```ts
 * import { test } from "./string.ts";
 *
 * const words = test(/\w+/);
 *
 * const result1 = words("Hello World"); // true
 * const result2 = words(""); // false
 * const result3 = words("1234"); // true
 *
 * ```
 *
 * @since 2.0.0
 */
export function test(r: RegExp) {
  return (s: string): boolean => {
    // See https://tinyurl.com/2fdh6458
    // RegExp.test keeps state from any runs,
    // this function resets that state to
    // avoid unexpected behavior
    const initialIndex = r.lastIndex;
    const result = r.test(s);
    r.lastIndex = initialIndex;
    return result;
  };
}

/**
 * The canonical implementation of Sortable for string. It contains
 * the methods lt, lte, equals, gte, gt, min, max, clamp, between,
 * and compare.
 *
 * @since 2.0.0
 */
export const SortableString: Sortable<string> = fromSort(sort);

/**
 * @since 2.0.0
 */
export const CombinableString: Combinable<string> = {
  combine,
};

/**
 * The canonical implementation of Comparable for string. It contains
 * the method equals.
 *
 * @since 2.0.0
 */
export const ComparableString: Comparable<string> = fromCompare(compare);

/**
 * The canonical implementation of Initializable for string. It contains
 * the method init and combine.
 *
 * @since 2.0.0
 */
export const InitializableString: Initializable<string> = {
  combine,
  init,
};

/**
 * The canonical implementation of Showable for string. It contains
 * the method show.
 *
 * @since 2.0.0
 */
export const ShowableString: Showable<string> = { show: JSON.stringify };
