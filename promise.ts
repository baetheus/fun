/**
 * This file contains the Promise algebraic data type. Promise is the javascript
 * built in data structure for asynchronous computation.
 *
 * @module Promise
 * @since 2.0.0
 */

import type { Kind, Out } from "./kind.ts";
import type { Applicable } from "./applicable.ts";
import type { Combinable } from "./combinable.ts";
import type { Either } from "./either.ts";
import type { Initializable } from "./initializable.ts";
import type { BindTo, Mappable } from "./mappable.ts";
import type { Bind, Flatmappable, Tap } from "./flatmappable.ts";
import type { Wrappable } from "./wrappable.ts";

import * as E from "./either.ts";
import { flow, handleThrow, pipe } from "./fn.ts";
import { createBind, createTap } from "./flatmappable.ts";
import { createBindTo } from "./mappable.ts";

/**
 * A type for Promise over any, useful as an extension target for
 * functions that take any Promise and do not need to
 * unwrap the type.
 *  @since 2.0.0
 */
// deno-lint-ignore no-explicit-any
export type AnyPromise = Promise<any>;

/**
 * A type level unwrapor, used to pull the inner type from a Promise.
 *
 * @since 2.0.0
 */
export type TypeOf<T> = T extends Promise<infer A> ? A : never;

/**
 * Specifies Promise as a Higher Kinded Type, with
 * covariant parameter A corresponding to the 0th
 * index of any Substitutions.
 *
 * @since 2.0.0
 */
export interface KindPromise extends Kind {
  readonly kind: Promise<Out<this, 0>>;
}

/**
 * A Promise<A> with the inner resolve function
 * hoisted and attached to itself.
 *
 * @since 2.0.0
 */
export type Deferred<A> = Promise<A> & {
  readonly resolve: (a: A | PromiseLike<A>) => void;
};

/**
 * Create a Deferred<A> from a type.
 *
 * @example
 * ```ts
 * import { deferred } from "./promise.ts";
 *
 * const promise = deferred<number>();
 *
 * // Logs 1 after a second
 * promise.then(console.log);
 * setTimeout(() => promise.resolve(1), 1000);
 * ```
 *
 * @since 2.0.0
 */
export function deferred<A = never>(): Deferred<A> {
  let method;
  const promise = new Promise((res) => {
    method = { resolve: async (a: A | PromiseLike<A>) => res(await a) };
  });
  return Object.assign(promise, method);
}

/**
 * Make an existing Promise somewhat abortable. While
 * the returned promise does resolve when the abort signal
 * occurs, the existing promise continues running in the
 * background. For this reason it is important to
 * catch any errors associated with the original promise and
 * to not implement side effects in the aborted promise.
 *
 * @example
 * ```ts
 * import { abortable, wait } from "./promise.ts";
 * import { pipe } from "./fn.ts";
 *
 * const controller = new AbortController();
 * const slow = wait(1000).then(() => 1);
 * const wrapped = pipe(
 *   slow,
 *   abortable(controller.signal, msg => msg),
 * );
 *
 * setTimeout(() => controller.abort("Hi"), 500);
 *
 * // After 500ms result contains the following
 * // { tag: "Left", left: "Hi" }
 * const result = await wrapped;
 * ```
 *
 * @since 2.0.0
 */
export function abortable<B>(
  signal: AbortSignal,
  onAbort: (reason: unknown) => B,
): <A>(ua: Promise<A>) => Promise<Either<B, A>> {
  return <A>(ua: Promise<A>): Promise<Either<B, A>> => {
    if (signal.aborted) {
      return resolve(E.left(onAbort(signal.reason)));
    }

    // Create abort handler
    const _deferred = deferred<Either<B, A>>();
    const abort = () => _deferred.resolve(E.left(onAbort(signal.reason)));
    signal.addEventListener("abort", abort, { once: true });

    return Promise.race([
      _deferred,
      ua.then(E.right).finally(() => {
        // Remove abort handler
        signal.removeEventListener("abort", abort);
      }),
    ]);
  };
}

/**
 * Create a Promise<void> that resolve after ms milliseconds that can also be
 * disposed early.
 *
 * @example
 * ```ts
 * import { wait, map } from "./promise.ts";
 * import { pipe } from "./fn.ts";
 *
 * const delayed = pipe(
 *   wait(1000),
 *   map(() => "Hello World"),
 * );
 *
 * // After 1 second
 * const result = await delayed; // "Hello World"
 * ```
 *
 * @since 2.0.0
 */
export function wait(ms: number): Promise<number> & Disposable {
  const disposable = {} as unknown as Disposable;
  const result = new Promise<number>((res) => {
    let open = true;
    const resolve = () => {
      if (open) {
        open = false;
        res(ms);
      }
    };
    const handle = setTimeout(resolve, ms);
    disposable[Symbol.dispose] = () => {
      if (open) {
        clearTimeout(handle);
        resolve();
      }
    };
  });

  return Object.assign(result, disposable);
}

/**
 * Delay the resolution of an existing Promise. This does not
 * affect the original promise directly, it only waits for
 * a ms milliseconds before flatmaping into the original promise.
 *
 * @example
 * ```ts
 * import { wrap, delay } from "./promise.ts";
 * import { pipe } from "./fn.ts";
 *
 * // Waits 250 milliseconds before returning
 * const result = await pipe(
 *   wrap(1),
 *   delay(250),
 * ); // 1
 * ```
 *
 * @since 2.0.0
 */
export function delay(ms: number): <A>(ua: Promise<A>) => Promise<A> {
  return (ua) => pipe(wait(ms), then(() => ua));
}

/**
 * An alias for Promise.resolve.
 *
 * @example
 * ```ts
 * import { resolve } from "./promise.ts";
 *
 * const result = await resolve(1); // 1
 * ```
 *
 * @since 2.0.0
 */
export function resolve<A>(a: A | PromiseLike<A>): Promise<A> {
  return Promise.resolve(a);
}

/**
 * An alias for Promise.reject.
 *
 * @example
 * ```ts
 * import { reject } from "./promise.ts";
 *
 * const result = await reject(1).catch(x => x); // 1
 * ```
 *
 * @since 2.0.0
 */
export function reject(
  rejection: unknown,
): Promise<never> {
  return Promise.reject(rejection);
}

/**
 * An alias for Promise.then
 *
 * @example
 * ```ts
 * import { wrap, then } from "./promise.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = await pipe(
 *   wrap(1),
 *   then(n => n + 1),
 * ); // 2
 * ```
 *
 * @since 2.0.0
 */
export function then<A, I>(
  fai: (a: A) => I | Promise<I>,
): (ua: Promise<A>) => Promise<I> {
  return (ua) => ua.then(fai);
}

/**
 * An alias for Promise.catch
 *
 * @example
 * ```ts
 * import { reject, catchError } from "./promise.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = await pipe(
 *   reject(1),
 *   catchError(() => "Uhoh"),
 * ); // "UhOh"
 * ```
 *
 * @since 2.0.0
 */
export function catchError<A>(
  fua: (u: unknown) => A,
): (ta: Promise<A>) => Promise<A> {
  return (ta) => ta.catch(fua);
}

/**
 * An alias for Promise.all
 *
 * @example
 * ```ts
 * import { all, wrap } from "./promise.ts";
 *
 * const result = await all(wrap(1), wrap("Hello")); // [1, "Hello"]
 * ```
 *
 * @since 2.0.0
 */
export function all<T extends AnyPromise[]>(
  ...ua: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  return Promise.all(ua);
}

/**
 * An alias for Promise.race. Note that Promise.race leaks
 * async operations in most runtimes. This means that the
 * slower promise does not stop when the faster promise
 * resolves/rejects. In effect Promise.race does not
 * handle cancellation.
 *
 * @example
 * ```ts
 * import { wait, map, race, wrap } from "./promise.ts";
 * import { pipe } from "./fn.ts";
 *
 * const one = pipe(wait(200), map(() => "one"));
 * const two = pipe(wait(300), map(() => "two"));
 *
 * // After 200 milliseconds resolves from one
 * const result = await race(one, two); // "one"
 * ```
 *
 * @since 2.0.0
 */
export function race<T extends AnyPromise[]>(
  ...ua: T
): Promise<Awaited<T[keyof T]>> {
  return Promise.race(ua);
}

/**
 * Create a Promise from a value A or another PromiseLike. This
 * is essentially an alias of Promise.resolve.
 *
 * @example
 * ```ts
 * import { wrap } from "./promise.ts";
 *
 * const result = await wrap(1); // 1
 * ```
 *
 * @since 2.0.0
 */
export function wrap<A>(a: A | PromiseLike<A>): Promise<A> {
  return resolve(a);
}

/**
 * Create a new Promise<I> from a Promise<(a: A) => I> and
 * a Promise<A>. Although Promises encapsulate
 * asynchrony, there is no way defer a Promise once created,
 * thus this ap function always evaluates both input Promises
 * in parallel.
 *
 * @example
 * ```ts
 * import { wrap, apply } from "./promise.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Person = { name: string, age: number };
 *
 * const person = (name: string) => (age: number): Person => ({ name, age });
 *
 * const result = pipe(
 *   wrap(person),
 *   apply(wrap("Brandon")),
 *   apply(wrap(37)),
 * ); // Promise<Person>
 * ```
 *
 * @since 2.0.0
 */
export function apply<A>(
  ua: Promise<A>,
): <I>(ufai: Promise<(a: A) => I>) => Promise<I> {
  return (ufai) =>
    pipe(
      all(ufai, ua),
      then(([fai, a]) => fai(a)),
    );
}

/**
 * Create a new Promise by mapping over the result of an existing Promise.
 * This is effectively Promise.then, but narrowed to non-promise returning
 * functions. If the mapping function returns a Promise then the type
 * for this function will be incorrect, as there is no way to create a
 * Promise<Promise<I>>.
 *
 * @example
 * ```ts
 * import { wrap, map } from "./promise.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = await pipe(
 *   wrap(1),
 *   map(n => n + 1),
 * ); // 2
 * ```
 *
 * @since 2.0.0
 */
export function map<A, I>(fai: (a: A) => I): (ua: Promise<A>) => Promise<I> {
  return then(fai);
}

/**
 * Create a new Promise by flatmaping over the result of an existing Promise.
 * This is effectively Promise.then.
 *
 * @example
 * ```ts
 * import { wrap, flatmap } from "./promise.ts";
 * import { pipe } from "./fn.ts";
 *
 * const result = await pipe(
 *   wrap(1),
 *   flatmap(n => wrap(n + 1)),
 * ); // 2
 * ```
 *
 * @since 2.0.0
 */
export function flatmap<A, I>(
  faui: (a: A) => Promise<I>,
): (ua: Promise<A>) => Promise<I> {
  return then(faui);
}

/**
 * @since 2.0.0
 */
export function fail<A = never>(b: unknown): Promise<A> {
  return reject(b);
}

/**
 * Wrap a function that potentially throws in a try/catch block,
 * handling any thrown errors and returning the result inside
 * of a Promise.
 *
 * @example
 * ```ts
 * import { tryCatch, reject, wrap } from "./promise.ts";
 * import { pipe, todo } from "./fn.ts";
 * // Note that todo will always throw synchronously.
 *
 * const add = (n: number) => n + 1;
 * const throwSync = (_: number): number => todo();
 * const throwAsync = (_: number): Promise<number> => reject("Ha!");
 *
 * const catchAdd = tryCatch(add, () => -1);
 * const catchSync = tryCatch(throwSync, () => -1);
 * const catchAsync = tryCatch(throwAsync, () => -1);
 *
 * const resultAdd = await catchAdd(1); // 2
 * const resultSync = await catchSync(1); // -1
 * const resultAsync = await catchAsync(1); // -1
 * ```
 * @since 2.0.0
 */
export function tryCatch<D extends unknown[], A>(
  handle: (...args: D) => A | PromiseLike<A>,
  onThrow: (error: unknown, args: D) => A,
): (...args: D) => Promise<A> {
  return handleThrow(
    handle,
    (a, args) => wrap(a).catch((err) => onThrow(err, args)),
    flow(onThrow, wrap),
  );
}

/**
 * @since 2.0.0
 */
export function getCombinablePromise<A>(
  { combine }: Combinable<A>,
): Combinable<Promise<A>> {
  return {
    combine: (second) => async (first) => combine(await second)(await first),
  };
}

/**
 * @since 2.0.0
 */
export function getInitializablePromise<A>(
  I: Initializable<A>,
): Initializable<Promise<A>> {
  return {
    init: () => resolve(I.init()),
    ...getCombinablePromise(I),
  };
}

/**
 * The canonical implementation of Applicable for Promise. It contains
 * the methods wrap, apply, and map.
 *
 * @since 2.0.0
 */
export const ApplicablePromise: Applicable<KindPromise> = { wrap, map, apply };

/**
 * The canonical implementation of Mappable for Promise. It contains
 * the method map.
 *
 * @since 2.0.0
 */
export const MappablePromise: Mappable<KindPromise> = { map };

/**
 * The canonical implementation of Flatmappable for Promise. It contains
 * the methods wrap, apply, map, and flatmap.
 *
 * @since 2.0.0
 */
export const FlatmappablePromise: Flatmappable<KindPromise> = {
  apply,
  flatmap,
  map,
  wrap,
};

/**
 * @since 2.0.0
 */
export const WrappablePromise: Wrappable<KindPromise> = { wrap };

/**
 * @since 2.0.0
 */
export const tap: Tap<KindPromise> = createTap(FlatmappablePromise);

/**
 * @since 2.0.0
 */
export const bind: Bind<KindPromise> = createBind(FlatmappablePromise);

/**
 * @since 2.0.0
 */
export const bindTo: BindTo<KindPromise> = createBindTo(MappablePromise);
