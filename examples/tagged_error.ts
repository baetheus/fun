// deno-lint-ignore-file no-explicit-any
import * as RSS from "https://deno.land/x/rss@0.5.6/mod.ts";
import * as TE from "https://raw.githubusercontent.com/baetheus/fun/main/task_either.ts";
import { pipe } from "https://raw.githubusercontent.com/baetheus/fun/main/fns.ts";

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

export const err = <T extends string, A>(type: T) =>
(
  error: unknown,
  context: A,
): Err<T, A> => ({
  tag: "Error",
  type,
  context,
  error,
});

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

export const foldErr =
  <T extends AnyErr, B>(fns: ToRecord<T, B>) => (ta: T): B =>
    (fns[ta.type as keyof ToRecord<T, B>])(ta.error, ta.context);

/**
 * Wrapping the errors for tryCatch tend to all look like
 * Err, so why not just tag the errors and reuse
 * the taggedError constructor.
 */
export const tagTryCatch = <T extends string, A extends unknown[], O>(
  tag: T,
  f: (...as: A) => O | PromiseLike<O>,
) => TE.tryCatch(f, err(tag));

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

export const run = pipe(
  // Start with a fetch
  safeFetch("https://hnrss.org/frontpage-blarg"),
  // The default chain widens the left type, picking up the
  // additional Err types
  TE.chain(getText),
  // Parse the body text
  TE.chain(parseFeed),
  // Stringify feed values
  TE.chain(stringify),
  // Output the date
  TE.fold(
    // Use the taggedError fold to extract all unioned tags
    foldErr({
      "FetchError": (_error, _args) => console.error("Hello"),
      "RssError": console.error,
      "TextError": console.error,
      "StringifyError": console.error,
    }),
    console.log,
  ),
);

// Run the program
await run();
