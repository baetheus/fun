/**
 * This is a quick attempt at a stack safe version
 * of Fn. The unfortunate bit is that it relies on a
 * central class for building and executing a lazy..
 *
 * It's probably easy enough to create a typed tuple
 * where we only track the input of the first control
 * and the return of the last control. That's something
 * to look into.
 *
 * Also of note is that Ap and Chain still increase the
 * stack size by 1 on every use.
 */

import type { Hold } from "../kind.ts";
import type { Fn } from "../fn.ts";

import { pipe, unary } from "../fn.ts";

export type Id<A> = Hold<A> & {
  readonly tag: "Id";
};

export type Of<A> = {
  readonly tag: "Of";
  readonly value: A;
};

export type Map<A, I> = {
  readonly tag: "Map";
  readonly value: (a: A) => I;
};

export type Ap<D, A, I> = {
  readonly tag: "Ap";
  readonly value: LazyFn<D, (a: A) => I>;
};

export type Chain<D, A, I> = {
  readonly tag: "Chain";
  readonly value: (a: A) => LazyFn<D, I>;
};

export type Contramap<L, D> = {
  readonly tag: "Contramap";
  readonly value: (l: L) => D;
};

// deno-lint-ignore no-explicit-any
export type Control<A = any, I = any, L = any, D = any> =
  | Id<A>
  | Of<A>
  | Map<A, I>
  | Ap<D, A, I>
  | Chain<D, A, I>
  | Contramap<L, D>;

export class LazyFn<D, A> {
  constructor(private controls: Control[] = []) {}

  push<I>(map: Map<A, I>): LazyFn<D, I>;
  push<I>(ap: Ap<D, A, I>): LazyFn<D, I>;
  push<I>(chain: Chain<D, A, I>): LazyFn<D, I>;
  push<L>(contramap: Contramap<L, D>): LazyFn<L, A>;
  // deno-lint-ignore no-explicit-any
  push(control: Control): LazyFn<any, any> {
    switch (control.tag) {
      case "Contramap":
        return new LazyFn([control, ...this.controls]);
      default:
        return new LazyFn([...this.controls, control]);
    }
  }

  execute(d: D): A {
    return this.controls.reduce((result, control) => {
      switch (control.tag) {
        case "Id":
          return result;
        case "Of":
          return control.value;
        case "Map":
          return control.value(result);
        case "Ap":
          // Increases stack size by 1
          return control.value.execute(result)(result);
        case "Chain":
          // Increases stack size by 1
          return control.value(result).execute(result);
        case "Contramap":
          return control.value(result);
      }
    }, d) as unknown as A;
  }
}

export function fromFn<D extends unknown[], A>(fn: Fn<D, A>): LazyFn<D, A> {
  return new LazyFn([{ tag: "Map", value: unary(fn) }]);
}

export function id<A>(): LazyFn<A, A> {
  return new LazyFn([{ tag: "Id" }]);
}

export function of<A>(value: A): LazyFn<never, A> {
  return new LazyFn([{ tag: "Of", value }]);
}

export function ap<D, A, I>(
  value: LazyFn<D, (a: A) => I>,
): (ua: LazyFn<D, A>) => LazyFn<D, I> {
  return (ua) => ua.push({ tag: "Ap", value });
}

export function map<A, I>(
  value: (a: A) => I,
): <D>(ua: LazyFn<D, A>) => LazyFn<D, I> {
  return (ua) => ua.push({ tag: "Map", value });
}

export function chain<D, A, I>(
  value: (a: A) => LazyFn<D, I>,
): (ua: LazyFn<D, A>) => LazyFn<D, I> {
  return (ua) => ua.push({ tag: "Chain", value });
}

export function contramap<L, D>(
  value: (l: L) => D,
): <A>(ua: LazyFn<D, A>) => LazyFn<L, A> {
  return (ua) => ua.push({ tag: "Contramap", value });
}

export function execute<D, A>(d: D): (ua: LazyFn<D, A>) => A {
  return (ua) => ua.execute(d);
}

const computation = pipe(
  id<number>(),
  map((n) => n + 1),
  chain((n) => of(n + 1)),
  ap(of((n) => n + 1)),
  contramap((s: string) => s.length),
);

console.log("The computation", computation);

[
  "The quick brown fox jumped over the lazy dog.",
  "This is a test",
  "Hello World",
].forEach((string) => {
  const result = pipe(computation, execute(string));
  console.log({ string, length: string.length, result });
});
