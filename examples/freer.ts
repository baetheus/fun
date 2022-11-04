import { flow, identity, pipe, todo } from "https://deno.land/x/fun/fn.ts";

export type Substitutions = {
  readonly ["covariant"]: unknown[];
  readonly ["contravariant"]: unknown[];
  readonly ["invariant"]: unknown[];
};

export interface Kind extends Substitutions {
  readonly kind?: unknown;
}

export type Substitute<T, S extends Substitutions> = T extends
  { readonly kind: unknown } ? (T & S)["kind"]
  : {
    readonly T: T;
    readonly ["covariant"]: () => S["covariant"];
    readonly ["contravariant"]: (_: S["contravariant"]) => void;
    readonly ["invariant"]: (_: S["invariant"]) => S["invariant"];
  };

export type $<
  T,
  Out extends unknown[],
  In extends unknown[] = [never],
  InOut extends unknown[] = [never],
> = Substitute<
  T,
  { ["covariant"]: Out; ["contravariant"]: In; ["invariant"]: InOut }
>;

/**
 * First, defint state for testing.
 *
 *  newtype State s a = State{unState :: s -> (a,s)}

     get :: State s s
     get = State $ \s -> (s,s)

     put :: s -> State s ()
     put s = State $ \_ -> ((),s)

     runState :: State s a -> s -> (a,s)
     runState = unState
 */

export type State<S, A> = (s: S) => [A, S];

export function get<S>(): State<S, S> {
  return (s) => [s, s];
}

export function put<S>(s: S): State<S, void> {
  return () => [void 0, s];
}

export interface KindState<S> extends Kind {
  readonly kind: State<S, this["covariant"][0]>;
}

// === Free ===
// data Free f a where
//   Pure   :: a -> Free f a
//   Impure :: f (Free f a) -> Free f a

// === Freer ===
// data FFree g a where
//   FPure   :: a -> FFree g a
//   FImpure :: g x -> (x -> FFree g a) -> FFree g a

export type Pure<_G, A> = {
  readonly tag: "Pure";
  readonly value: A;
};

export type Impure<G, D, A> = {
  readonly tag: "Impure";
  readonly from: $<G, [D, never, never]>;
  readonly to: (d: D) => Freer<G, A>;
};

// deno-lint-ignore no-explicit-any
export type Freer<G, A> = Pure<G, A> | Impure<G, any, A>;

export function pure<G, A>(value: A): Freer<G, A> {
  return { tag: "Pure", value };
}

export function impure<G, D, A>(
  from: $<G, [D, never, never]>,
  to: (d: D) => Freer<G, A>,
): Freer<G, A> {
  return { tag: "Impure", from, to };
}

export function isPure<G, A>(ua: Freer<G, A>): ua is Pure<G, A> {
  return ua.tag === "Pure";
}

export function of<G, A>(value: A): Freer<G, A> {
  return pure(value);
}

export function map<A, I>(fai: (a: A) => I) {
  return <G>(ua: Freer<G, A>): Freer<G, I> =>
    isPure(ua)
      ? pure(fai(ua.value))
      : impure(ua.from, (a) => map(fai)(ua.to(a)));
}

export function chain<G, A, I>(faui: (a: A) => Freer<G, I>) {
  return (ua: Freer<G, A>): Freer<G, I> =>
    isPure(ua) ? faui(ua.value) : impure(ua.from, (a) => chain(faui)(ua.to(a)));
}

export function ap<G, A, I>(ufai: Freer<G, (a: A) => I>) {
  return (ua: Freer<G, A>): Freer<G, I> =>
    pipe(ufai, chain((fai: (a: A) => I) => pipe(ua, map(fai))));
}

export function join<G, A>(uua: Freer<G, Freer<G, A>>): Freer<G, A> {
  return pipe(uua, chain(identity));
}

// etaF :: g a -> FFree g a
//      etaF fa = FImpure fa FPure

export function eta<G, A>(from: $<G, [A, never, never]>): Freer<G, A> {
  return impure(from, (a) => pure(a));
}

/**
 * Define State in terms of Freer
 *
 * type FFState s = FFree (State s)
 */

export type FState<S, A> = Freer<KindState<S>, A>;

export function fget<S>(): FState<S, S> {
  return eta(get());
}

export function fput<S>(s: S): FState<S, void> {
  return eta(put(s));
}

// Interpreter
// runFFState :: FFState s a -> s -> (a,s)
//      runFFState (FPure x) s     = (x,s)
//      runFFState (FImpure m q) s = let (x,s') = unState m s in runFFState (q x) s'

export function runState<S, A>(fstate: FState<S, A>): State<S, A> {
  switch (fstate.tag) {
    case "Pure":
      return (s) => [fstate.value, s];
    case "Impure":
      return flow(
        fstate.from,
        ([a, s]) => runState(fstate.to(a))(s),
      );
  }
}

const computation = pipe(
  fget<number>(),
  chain((n) => fput(n + 1)),
);

const result1 = pipe(0, runState(computation));
const result2 = pipe(2, runState(computation));

console.log({ result1, result2 });

/**
 * Define Option in terms of Freer
 */

export type None = { readonly tag: "None" };
export type Some<A> = { readonly tag: "Some"; readonly value: A };
export type Option<A> = None | Some<A>;

export interface KindOption extends Kind {
  readonly kind: Option<this["covariant"][0]>;
}

export type FOption<A> = Freer<KindOption, A>;

export function none<A = never>(): Option<A> {
  return { tag: "None" };
}

export function some<A>(value: A): Option<A> {
  return { tag: "Some", value };
}

export function fnone<A = never>(): FOption<A> {
  return eta(none());
}

export function fsome<A>(value: A): FOption<A> {
  return eta(some(value));
}

export function runOption<A>(ua: FOption<A>): Option<A> {
  switch (ua.tag) {
    case "Pure":
      return some(ua.value);
    case "Impure": {
      switch (ua.from.tag) {
        case "None":
          return ua.from;
        case "Some":
          return runOption(ua.to(ua.from.value));
      }
    }
  }
}

const op1 = pipe(
  fsome("Hello"),
  chain((s) => fsome(s + s)),
  map((s) => s.length),
  map((s) => s + 1),
);

const opr1 = runOption(op1);

console.log({ opr1 });

const json = <A>(a: A): string => JSON.stringify(a, null, 2);

export function logOption<A>(ua: FOption<A>, acc = "Log Option"): string {
  switch (ua.tag) {
    case "Pure":
      return `${acc}\n${json(ua.value)}`;
    case "Impure": {
      const { from, to } = ua;
      switch (from.tag) {
        case "None":
          return `${acc}\n${json(from)}`;
        case "Some":
          return logOption(to(from.value), `${acc}\n${json(from)}`);
      }
    }
  }
}

const opr2 = logOption(op1);

console.log(opr2);
