import { flow, identity } from "./fn.ts";

export type Iso<S, A> = {
  readonly tag: "Iso";
  readonly view: (s: S) => A;
  readonly review: (s: A) => S;
};

export function iso<A, B>(
  view: (a: A) => B,
  review: (b: B) => A,
): Iso<A, B> {
  return { tag: "Iso", view, review };
}

const _id = iso(identity, identity);

export function id<A>(): Iso<A, A> {
  return _id as Iso<A, A>;
}

export function compose<B, C>(second: Iso<B, C>) {
  return <A>(first: Iso<A, B>): Iso<A, C> =>
    iso(flow(first.view, second.view), flow(second.review, first.review));
}

export function swap<S, A>(sa: Iso<S, A>): Iso<A, S> {
  return iso(sa.review, sa.view);
}

