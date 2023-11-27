import type { $, In, InOut, Kind, Out } from "../kind.ts";
import type { Option } from "../option.ts";
import type { Flatmappable } from "../flatmappable.ts";
import type { Fn } from "../fn.ts";

import * as F from "../fn.ts";
import { createBind, createTap } from "../flatmappable.ts";
import { createBindTo } from "../mappable.ts";
import { pipe } from "../fn.ts";

/**
 * Here we try creating a monad transformer for Fn with a generic kind over Fn.
 */

export interface TransformFn<U extends Kind> extends Kind {
  readonly kind: Fn<
    In<this, 0>,
    $<
      U,
      [Out<this, 0>, Out<this, 1>, Out<this, 2>],
      [In<this, 1>],
      [InOut<this, 0>]
    >
  >;
}

export function transformFn<U extends Kind>(
  FM: Flatmappable<U>,
): Flatmappable<TransformFn<U>> {
  return {
    apply: (ua) => (ufai) => (d) => pipe(ufai(d), FM.apply(ua(d))),
    map: (fai) => (ua) => pipe(ua, F.map(FM.map(fai))),
    flatmap: (faui) => (ua) => (d) =>
      pipe(
        ua(d),
        FM.flatmap((a) => faui(a)(d)),
      ),
    wrap: (value) => F.wrap(FM.wrap(value)),
  };
}

/**
 * Try transforming FlatmappablePromise with transformFn.
 */

import { FlatmappablePromise } from "../promise.ts";

export const FFP = transformFn(FlatmappablePromise);
export const bindToFP = createBindTo(FFP);
export const bindFP = createBind(FFP);
export const tapFP = createTap(FFP);

// Should have type { readonly one: number, readonly two: number }
export const test1 = await pipe(
  FFP.wrap(1),
  bindToFP("one"),
  bindFP("two", ({ one }) => FFP.wrap(one + one)),
)("yar");

/**
 * Noticed that Sync<A> is the same type as Fn<never, A> so this is a test to
 * see if TypeScript allows me to reuse the Fn functions to construct a
 * Flatmappable for Sync
 */
type Sync<A> = Fn<never, A>;

interface KindSync extends Kind {
  readonly kind: Sync<Out<this, 0>>;
}

export const FlatmappableSync: Flatmappable<KindSync> = {
  apply: F.apply,
  map: F.map,
  flatmap: F.flatmap,
  wrap: F.wrap,
};

/**
 * Now we try implementing a monad transformer for Promise.
 */

import * as P from "../promise.ts";

export interface TransformPromise<U extends Kind> extends Kind {
  readonly kind: Promise<
    $<
      U,
      [Out<this, 0>, Out<this, 1>, Out<this, 2>],
      [In<this, 0>],
      [InOut<this, 0>]
    >
  >;
}

/**
 * The issue here is that we need a join function with a signature of
 * Promise<U<Promise<U<A>>>> => Promise<U<A>> or maybe a swap function with a
 * signature of U<Promise<U<A>>> => Promise<U<A>>.
 *
 * After some research I found [this](https://web.cecs.pdx.edu/~mpj/pubs/RR-1004.pdf)
 * and we see that there are several strategies for constructing a monad
 * composition given one of three functions prod, dorp, or swap.
 *
 * I don't fully grok the three constructions, mostly because I'm not fluent in
 * haskell and haven't taken the time to kill a few trees with notes and trial
 * and error.
 *
 * This construction of transformPromise uses, I think, the dorp construction.
 */
export function transformPromise<U extends Kind>(
  FM: Flatmappable<U>,
  extract: <
    I,
    B = unknown,
    C = unknown,
    D = never,
    E = unknown,
    J = unknown,
    K = unknown,
    L = never,
    M = unknown,
  >(
    va: $<U, [Promise<$<U, [I, J, K], [L], [M]>>, B, C], [D], [E]>,
  ) => Promise<$<U, [I, B | J, C | K], [D & L], [E & M]>>,
): Flatmappable<TransformPromise<U>> {
  return {
    apply: ((ua) => (ufai) =>
      pipe(
        P.all(ua, ufai),
        // These anys are required as TS has issues using Awaited<A> as A
        // in the generic positions of $ substitution
        // deno-lint-ignore no-explicit-any
        P.map(([va, vfai]) => pipe(vfai as any, FM.apply(va as any))),
      )) as Flatmappable<TransformPromise<U>>["apply"],
    flatmap: (faui) => (ua) =>
      pipe(
        ua,
        P.flatmap((va) => pipe(va, FM.map(faui), extract)),
      ),
    map: (fai) => (ua) => pipe(ua, P.map(FM.map(fai))),
    wrap: (a) => P.wrap(FM.wrap(a)),
  };
}

/**
 * Here let's try transforming Option with transformPromise
 */

import * as O from "../option.ts";

export const FPO = transformPromise(
  O.FlatmappableOption,
  /**
   * The extract function here is illustrative of what's necessary to compose
   * another monad with Promise. Specifically we need a way to combine  any
   * state in the outer and inner U monad (here U is Option).
   */
  O.match(() => P.wrap(O.none), F.identity),
);

/**
 * These tests began as an effort to build the IndexedAsyncState monad
 * implemented in my `pick` module using monad transformers. I'm still on the
 * fence with regards to whether this `fun` module should have monad
 * transformers or even the individual function transformers as implemented in
 * the new fp-ts builds in effect-ts.
 *
 * Further areas of inquiry in this direction could be:
 *
 * 1. How much code reuse to we see if we implement composed adts with
 *    transformers?
 * 2. Is there a performance difference in those implementations?
 * 3. Do transformers introduce unnecessary complexity?
 * 4. The Fn transformer did not require a join function, how many other adts
 *    will require prod, dorp, or swap?
 * 5. Will transformers lead to the need to expand type classes beyond type
 *    constructors of length 5?
 */

/**
 * Just for fun, let's make a transformer for Option
 */

export interface TransformOption<U extends Kind> extends Kind {
  readonly kind: Option<
    $<
      U,
      [Out<this, 0>, Out<this, 1>, Out<this, 2>],
      [In<this, 0>],
      [InOut<this, 0>]
    >
  >;
}

import * as A from "../array.ts";
const sa = A.sequence(O.FlatmappableOption);

export function transformOption<U extends Kind>(
  FM: Flatmappable<U>,
): Flatmappable<TransformOption<U>> {
  const t = O.traverse(FM)(FM.wrap);
  return {
    wrap: (a) => O.wrap(FM.wrap(a)),
    map: (fai) => (ua) => pipe(ua, O.map(FM.map(fai))),
    apply: (ua) => (ufai) =>
      pipe(sa(ua, ufai), O.map(([va, vfai]) => pipe(vfai, FM.apply(va)))),

    // Not sure how to do this.. tired
    flatmap: (faui) => (ua) => F.todo(),
  };
}
