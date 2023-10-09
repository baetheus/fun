// deno-lint-ignore-file no-explicit-any
import * as RSS from "https://deno.land/x/rss@0.5.6/mod.ts";
import * as AE from "../async_either.ts";
import { pipe } from "../fn.ts";

// ---
// Try implementing a reusable error type
// ---

export type Err<T extends string, A> = {
  readonly tag: "Error";
  readonly type: T;
  readonly context: A;
  readonly error: unknown;
};

export type AnyErr = Err<string, any>;

export function err<T extends string, A>(
  type: T,
): (error: unknown, context: A) => Err<T, A> {
  return (error, context) => ({ tag: "Error", type, context, error });
}

// ---
// Use a little creative typing to extract tag and context pairs and
// build a dynamically typed fold function
// ---

type ExtractTags<T> = T extends Err<infer Tag, any> ? Tag : never;

type MatchTag<Tag, Errors> = Tag extends string
  ? Errors extends Err<Tag, infer V> ? Err<Tag, V> : never
  : never;

type MapFunc<T, B> = T extends Err<string, infer V>
  ? (error: unknown, context: V) => B
  : never;

type ToRecord<T, B> = { [K in ExtractTags<T>]: MapFunc<MatchTag<K, T>, B> };

export function foldErr<T extends AnyErr, B>(
  fns: ToRecord<T, B>,
): (ta: T) => B {
  return (ta) => (fns[ta.type as keyof ToRecord<T, B>])(ta.error, ta.context);
}

/**
 * Wrapping the errors for tryCatch tend to all look like
 * Err, so why not just tag the errors and reuse
 * the taggedError constructor.
 */
export const tagTryCatch = <T extends string, A extends unknown[], O>(
  tag: T,
  f: (...as: A) => O | PromiseLike<O>,
) => AE.tryCatch(f, err(tag));

// ---
// Wrap external functions with tagged errors
// ---

export const parseFeed = tagTryCatch("RssError", RSS.parseFeed);
export const safeFetch = tagTryCatch("FetchError", fetch);
export const getText = tagTryCatch("TextError", (res: Response) => res.text());
export const stringify = tagTryCatch(
  "StringifyError",
  <A>(a: A) => JSON.stringify(a, null, 2),
);

// ---
// Get some xml, parse it as rss, and log it
// ---

function logError(annotation: string): <A>(err: unknown, args: A) => void {
  return (err, args) => {
    console.error(annotation);
    console.error({ err, args });
  };
}

export const run = pipe(
  // Start with a fetch
  safeFetch("https://hnrss.org/frontpage-blarg"),
  AE.bindTo("response"),
  // The default flatmap widens the left type, picking up the
  // additional Err types
  AE.bind("text", ({ response }) => getText(response)),
  // Parse the body text
  AE.bind("parsed", ({ text }) => parseFeed(text)),
  // Stringify feed values
  AE.bind("result", ({ parsed }) => stringify(parsed)),
  // Output the date
  AE.match(
    // Use the taggedError fold to extract all unioned tags
    foldErr({
      "FetchError": logError("Failed during fetch"),
      "RssError": logError("Failed during RSS Parsing"),
      "TextError": logError("Failed while parsing text body"),
      "StringifyError": logError("Failed while stringifying result"),
    }),
    console.log,
  ),
);

// Run the program
await run();
