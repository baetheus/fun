// Read more here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators

// /**
//  * Some Generator types
//  */
//
// type MyGenerator = Generator<number, string, boolean>;
//
// declare const a: MyGenerator;
//
// a.next; // .next(...args: [] | [boolean]): IteratorResult<number, string>
// a.return; // .return(value: string): IteratorResult<number, string>
// a.throw; // .throw(e: any): IteratorResult<number, string>
//
// const SG1 = a[Symbol.iterator]; // b: () => Generator<number, string, boolean>
//
// declare const b: IteratorResult<number, string>;
//
// if (b.done) {
//   b.value; // string
// } else {
//   b.value; // number
// }
//
// declare const c: Iterator<number, string, boolean>;
//
// c.next; // Same as Generator.next
// c.return; // .return(value?: string | undefined): IteratorResult<number, string>
// c.throw; // .throw(e?: any): IteratorResult<number, string>
//
// /**
//  * So.. Generators
//  */

/**
 * What is this? A self referential generator?
 *
 * Generators generally *return* this from their
 * [Symbol.iterator].. In this case an effect
 * will yield this and return the value passed
 * to next..
 */
export type Effect<T, A, R> = {
  type: T;
  arg: A;
  [Symbol.iterator](): Generator<Effect<T, A, R>, R, R>;
};

export function effect<T, A, R>(type: T, arg: A): Effect<T, A, R> {
  return {
    type,
    arg,
    *[Symbol.iterator]() {
      return yield this;
    },
  };
}

/**
 * Start with an Iterator but newtyped?
 */
export interface Fx<Y, R, A> {
  [Symbol.iterator](): Iterator<Y, R, A>;
}

export const fx = <Y, R, A>(f: () => Generator<Y, R, A>): Fx<Y, R, A> => ({
  [Symbol.iterator]: f,
});

/**
 * Always get a nice of
 */
export const of = <R>(r: R): Fx<never, R, never> => ({
  // deno-lint-ignore require-yield
  *[Symbol.iterator]() {
    return r;
  },
});

export const run = <R, A>(fx: Fx<never, R, A>): R =>
  fx[Symbol.iterator]().next().value;

export const handle = <Y, R, A, B, Y2>(
  f: Fx<Y, R, A>,
  handler: (effect: Y) => Fx<Y2, A, unknown>,
): Fx<Y2, R, B> =>
  fx(function* () {
    const i = f[Symbol.iterator]();
    let ir = i.next();

    while (!ir.done) {
      // This loop passes control to the
      // handler function, yielding on the
      // results, and then passing any
      // returned values to be yielded into
      // the fx program
      ir = i.next(yield* handler(ir.value));
    }

    return ir.value;
  });

// Here is the machinery for a *special* Async Effect
// that takes Tasks of type A and returns a type A.
// Keep in mind that an Effect is a "recipe"
export type Dispose = () => void;

export type Task<A> = (k: (a: A) => void) => Dispose;

export type Async<A> = Effect<"Async", Task<A>, A>;

export const async = <A>(t: Task<A>): Async<A> => effect("Async", t);

// Fibers look like context for some async operation?
export type Fiber<A> = [Dispose, Promise<A>];

export const dispose = <A>([dispose]: Fiber<A>): void => dispose();

export const promise = <A>([, promise]: Fiber<A>): Promise<A> => promise;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noDispose: Dispose = () => {};

// Fork is likely how we package Async Effects in
export const fork = <R, A, Y extends Async<unknown>>(
  f: Fx<Y, R, A>,
): Fx<never, Fiber<R>, never> =>
  // deno-lint-ignore require-yield
  fx(function* () {
    let _dispose: Dispose = noDispose;

    const stepAsync = async (
      i: Iterator<Y, R, A>,
      ir: IteratorResult<Y, R>,
    ): Promise<R> => {
      if (ir.done) return ir.value;

      const a = await new Promise((resolve) => {
        _dispose = ir.value.arg(resolve);
      });
      return stepAsync(i, i.next(a as A));
    };

    const i = f[Symbol.iterator]();
    const dispose = () => _dispose();
    const promise = stepAsync(i, i.next()).then((x) => {
      _dispose = noDispose;
      return x;
    });

    return [dispose, promise];
  });

// EXAMPLE

//---------------------------------------------------------------
// effects
// Note that Read and Print have no implementation
// They only represent a signature.  For example, Read represents
// the signature void -> string, i.e. it produces a string out of
// nowhere. Print represents the signature string -> void, i.e.
// it consumes a string.

type Read = Effect<"Read", void, string>;

const read: Read = effect("Read", undefined);

type Print = Effect<"Print", string, void>;

const print = (s: string): Print => effect("Print", s);

type Exit = Effect<"Exit", number, void>;

const exit = (n: number): Exit => effect("Exit", n);

//---------------------------------------------------------------
// main program
// It does what it says: loops forever, `Read`ing strings and then
// `Print`ing them.  Remember, though, that Read and Print have
// no meaning.
// The program cannot be run until all its effects have been
// assigned a meaning, which is done by applying effect handlers
// to main for its effects, Read and Print.

const main = fx(function* () {
  while (true) {
    // Print using the Print effect
    yield* print("> ");

    // Read to s using the Read effect
    const s = yield* read;

    // If Read matches exit then we quit
    if (s.match(/exit/i)) {
      yield* print(`Exiting in 1 second`);
      yield* exit(1000);
    } else {
      // Otherwise we just echo s
      yield* print(s);
    }
  }
});

//---------------------------------------------------------------
// effect handler
// This handler handles the Print and Read effects. It handles
// Print by simply printing the string to process.stdout.
// However, it handles Read by introducing *another effect*,
// in this case, Async, to read a line asynchronously from
// process.stdin.
// So, handled still isn't runnable.  We need to handle the
// Async effect that this handler introduced.

// Instantiate some globals!
const decoder = new TextDecoder();
const encoder = new TextEncoder();

const handled = handle(main, function* (effect) {
  // The effect argument is a union of all of the effects
  // used in main, ie Read, Print, and Exit.
  switch (effect.type) {
    case "Print":
      // Print is string -> void.. but here we can return
      // number with no ill effects?
      return Deno.stdout.writeSync(encoder.encode(effect.arg));
    case "Read": {
      // Read is void -> string.. but heree we can return
      // any type we want!
      const buf = new Uint8Array(1024);
      Deno.stdin.readSync(buf);
      return decoder.decode(buf);
    }
    case "Exit": {
      // Exit is interesting since we return an async generator
      // with a return value that cancels the effect.. not sure
      // how this works yet
      return yield* async(() => {
        const handle = setTimeout(() => Deno.exit(0), effect.arg);
        return () => clearTimeout(handle);
      });
    }
  }
});

// Finally, we can handle the Async effect using the
// provided fork effect handler, which probably uses
// Fibers (wat) to handle the async effects.
const runnable = fork(handled);

// Since runnable produces no effects, we can run it.
run(runnable);
