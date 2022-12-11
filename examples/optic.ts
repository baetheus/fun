import type { $, In, Kind, Out } from "../kind.ts";
import type { Identity } from "../identity.ts";
import type { Monad } from "../monad.ts";
import type { Predicate } from "../predicate.ts";
import type { ReadonlyRecord } from "../record.ts";
import type { Refinement } from "../refinement.ts";
import type { Traversable } from "../traversable.ts";

import * as I from "../identity.ts";
import * as A from "../array.ts";
import * as R from "../record.ts";
import { createMonad } from "../monad.ts";
import { constant, flow, identity, pipe } from "../fn.ts";

export const IdTag = "Id" as const;
export type IdTag = typeof IdTag;

export const ArrTag = "Arr" as const;
export type ArrTag = typeof ArrTag;

export type Tag = IdTag | ArrTag;

function _id<A>(value: A): Identity<A> {
  return value;
}

function _arr<A>(values: ReadonlyArray<A>): ReadonlyArray<A> {
  return values;
}

export type ToKind<T extends Tag> = T extends IdTag ? I.URI : A.URI;

export interface Viewer<T extends Tag, D, A> {
  readonly tag: T;
  readonly view: (from: D) => $<ToKind<T>, [A, never, never]>;
}

export function viewer<T extends Tag, D, A>(
  tag: T,
  view: (from: D) => $<ToKind<T>, [A, never, never]>,
): Viewer<T, D, A> {
  return { tag, view };
}

export interface KindViewer<T extends Tag> extends Kind {
  readonly kind: Viewer<T, In<this, 0>, Out<this, 0>>;
}

export const MonadViewer: Monad<KindViewer<Tag>> = createMonad({
  of: <A, D = unknown>(a: A) => viewer(IdTag, () => a) as Viewer<Tag, D, A>,
  chain:
    <A, I, D>(faui: (a: A) => Viewer<Tag, D, I>) => (ua: Viewer<Tag, D, A>) =>
      viewer((from: D) =>
        pipe(ua.view(from), MonadFocus.chain((a) => faui(a).focus(from)))
      ),
});

export interface Modifier<D, A> {
  readonly modify: (modifyFn: (a: A) => A) => (from: D) => D;
}

export interface Optic<T extends Tag, D, A>
  extends Viewer<T, D, A>, Modifier<D, A> {}

export function optic<T extends Tag, D, A>(
  focus: (from: D) => Focus<T, A>,
  modify: (modifyFn: (a: A) => A) => (from: D) => D,
): Optic<T, D, A> {
  return { focus, modify };
}

export type Getter<D, A> = Optic<SingleTag, D, A>;

export function getter<D, A>(
  fda: (from: D) => A,
  modify: (modifyFn: (a: A) => A) => (from: D) => D,
): Getter<D, A> {
  return optic((d) => single(fda(d)), modify);
}

export type Folder<D, A> = Optic<ManyTag, D, A>;

export function folder<D, A>(
  fda: (from: D) => ReadonlyArray<A>,
  modify: (modifyFn: (a: A) => A) => (from: D) => D,
): Folder<D, A> {
  return optic((d) => many(fda(d)), modify);
}

export type Align<U extends Tag, V extends Tag> = U extends ManyTag ? ManyTag
  : V extends ManyTag ? ManyTag
  : SingleTag;

export function of<A, D = unknown>(value: A): Getter<D, A> {
  return MonadViewer.of(value) as Getter<D, A>;
}

export function ap<V extends Tag, D, A>(
  ua: Viewer<V, D, A>,
): <U extends Tag, I>(
  ufai: Viewer<V, D, (a: A) => I>,
) => Viewer<Align<U, V>, D, I> {
  return MonadViewer.ap(ua);
}

export function map<A, I>(
  fai: (a: A) => I,
): <U extends Tag, D, A>(ua: Viewer<U, D, A>) => Viewer<U, D, I> {
  return MonadViewer.map(fai) as <U extends Tag, D, A>(
    ua: Viewer<U, D, A>,
  ) => Viewer<U, D, I>;
}

export function chain<V extends Tag, D, A, I>(
  faui: (a: A) => Viewer<V, D, I>,
): <U extends Tag>(ua: Viewer<U, D, A>) => Viewer<Align<U, V>, D, I> {
  return MonadViewer.chain(faui);
}

export function join<U extends Tag, V extends Tag, D, A>(
  uua: Viewer<V, D, Viewer<U, D, A>>,
): Viewer<Align<U, V>, D, A> {
  return MonadViewer.join(uua);
}

export function id<A>(): Getter<A, A> {
  return getter(identity, identity);
}

export function compose<V extends Tag, A, I>(
  snd: Optic<V, A, I>,
): <U extends Tag, D>(first: Optic<U, D, A>) => Optic<Align<U, V>, D, I> {
  return <U extends Tag, D>(
    fst: Optic<U, D, A>,
  ): Optic<Align<U, V>, D, I> =>
    optic(
      (d) =>
        pipe(fst.focus(d), MonadFocus.chain(snd.focus)) as Focus<
          Align<U, V>,
          I
        >,
      flow(snd.modify, fst.modify),
    );
}

export function prop<A, P extends keyof A>(
  prop: P,
): <U extends Tag, D>(
  ua: Optic<U, D, A>,
) => Optic<Align<U, SingleTag>, D, A[P]> {
  return compose(getter((d) => d[prop], (mod) => (a) => {
    const out = mod(a[prop]);
    return out === a[prop] ? a : { ...a, [prop]: out };
  }));
}

export function props<A, P extends keyof A>(
  ...props: [P, P, ...P[]]
): <U extends Tag, D>(
  first: Optic<U, D, A>,
) => Optic<Align<U, SingleTag>, D, { [K in P]: A[K] }> {
  const pick = R.pick<A, P>(...props);
  return compose(getter(
    pick,
    (mod) => (a) => {
      const out = mod(pick(a));
      return props.every((key) => a[key] === out[key]) ? a : { ...a, ...out };
    },
  ));
}

export function index(
  i: number,
): <U extends Tag, D, A>(
  first: Optic<U, D, ReadonlyArray<A>>,
) => Optic<Align<U, ManyTag>, D, A> {
  return compose(
    folder((a) => A.isOutOfBounds(i, a) ? [] : [a[i]], A.modifyAt(i)),
  );
}

export function key(
  key: string,
): <U extends Tag, D, A>(
  first: Optic<U, D, ReadonlyRecord<A>>,
) => Optic<Align<U, ManyTag>, D, A> {
  return compose(
    folder((r) => Object.hasOwn(r, key) ? [r[key]] : [], R.modifyAt(key)),
  );
}

export function filter<A, B extends A>(
  r: Refinement<A, B>,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Align<U, ManyTag>, S, B>;
export function filter<A>(
  r: Predicate<A>,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Align<U, ManyTag>, S, A>;
export function filter<A>(
  predicate: Predicate<A>,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Align<U, ManyTag>, S, A> {
  return compose(
    folder(
      (a) => predicate(a) ? [a] : [],
      (mod) => (a) => predicate(a) ? mod(a) : a,
    ),
  );
}

export function traverse<T extends Kind>(
  T: Traversable<T>,
): <U extends Tag, S, A, B = never, C = never, D = unknown, E = never>(
  first: Optic<U, S, $<T, [A, B, C], [D], [E]>>,
) => Optic<Align<U, ManyTag>, S, A> {
  return compose(
    folder(
      // deno-lint-ignore no-explicit-any
      T.reduce(A._unsafePush, [] as any[]),
      T.map,
    ),
  );
}

export function view<D>(
  from: D,
): <U extends Tag, A>(
  optic: Viewer<U, D, A>,
) => FocusTo<Focus<U, A>> {
  return (optic) => extract(optic.focus(from));
}

// export function toggle<U extends Tag, D>(
//   first: Optic<U, D, boolean>,
// ): (from: D) => D {
//   return first.modify
// }
