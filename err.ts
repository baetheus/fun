/**
 * This file contains the Err algebraic data type and related utilities for
 * creating and matching typed errors with optional context.
 *
 * @module Err
 * @since 3.0.0-rc.5
 */

/**
 * The Err type represents a typed error with a name, message, and optional context.
 *
 * @example
 * ```ts
 * import { err } from "./err.ts";
 *
 * const ValidationError = err("ValidationError");
 * const error = ValidationError("Invalid input", { field: "email" });
 *
 * // error is of type Err<"ValidationError", { field: string }>
 * console.log(error.name); // "ValidationError"
 * console.log(error.message); // "Invalid input"
 * console.log(error.context); // { field: "email" }
 * ```
 *
 * @since 3.0.0-rc.5
 */
export type Err<T extends string, A> = {
  readonly tag: "Error";
  readonly name: T;
  readonly message: string;
  readonly context?: A;
};

/**
 * A type alias for any Err type, useful for type constraints.
 *
 * @example
 * ```ts
 * import type { AnyErr } from "./err.ts";
 *
 * function handleError(error: AnyErr) {
 *   console.log(error.name, error.message);
 * }
 * ```
 *
 * @since 3.0.0-rc.5
 */
// deno-lint-ignore no-explicit-any
export type AnyErr = Err<string, any>;

/**
 * Create a constructor function for a specific error type.
 *
 * @example
 * ```ts
 * import { err } from "./err.ts";
 *
 * const NotFoundError = err("NotFoundError");
 * const error = NotFoundError("Resource not found", { id: 123 });
 *
 * // error.name === "NotFoundError"
 * // error.message === "Resource not found"
 * // error.context === { id: 123 }
 * ```
 *
 * @since 3.0.0-rc.5
 */
export function err<T extends string>(
  name: T,
): <A>(message: string, context?: A) => Err<T, A> {
  return (message, context) => ({
    tag: "Error",
    name,
    message,
    context,
  });
}

// deno-lint-ignore no-explicit-any
type ExtractTags<T> = T extends Err<infer Tag, any> ? Tag : never;

type MatchTag<Tag, Errors> = Tag extends string
  ? Errors extends Err<Tag, infer A> ? Err<Tag, A> : never
  : never;

type MapFunc<T, B> = T extends Err<string, infer A>
  ? (message: string, context: A) => B
  : never;

type ToRecord<T, B> = { [K in ExtractTags<T>]: MapFunc<MatchTag<K, T>, B> };

/**
 * Pattern match on an error value, dispatching to the appropriate handler
 * based on the error's name.
 *
 * @since 3.0.0-rc.5
 */
export function match<T extends AnyErr, B>(
  fns: ToRecord<T, B>,
): (ta: T) => B {
  return (ta) => (fns[ta.name as keyof ToRecord<T, B>])(ta.message, ta.context);
}


