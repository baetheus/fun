/**
 * An Optic is at heart two functions, view and modify. The
 * view function is used to view some structure A that is
 * contained in some structure S. The value that the view
 * function tries to return is called its Focus, thus the
 * name Optic. The Focus of the view function can be the
 * value at a struct property, in an Option, or it can
 * even reference all the values in a homogenous array.
 * Thus the view function will return either 0, 1, or
 * many of its Focus. Optics in this library are built
 * to be composable. Let's look at some examples.
 *
 * @example
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * // First lets create some data we are working with
 * type Person = { name: string; age: number; children?: People };
 * type People = readonly Person[];
 *
 * function person(name: string, age: number, children?: People): Person {
 *   return { name, age, children };
 * }
 *
 * const rufus = person("Rufus", 0.8);
 * const clementine = person("Clementine", 0.5);
 * const brandon = person("Brandon", 37, [rufus, clementine]);
 * const jackie = person("Jackie", 57, [brandon]);
 *
 * // This Optic goes from Person to Person
 * const children = pipe(
 *   O.id<Person>(),
 *   O.prop("children"),
 *   O.nilable,
 *   O.array,
 * );
 *
 * // We can extend children with itself to get grandchildren
 * // This Optic also goes from Person to Person (two levels)
 * const grandchildren = pipe(
 *   children,
 *   O.compose(children),
 * );
 *
 * // We can prepare an Optic from Person to name
 * const names = O.prop<Person, "name">("name");
 *
 * // These return arrays of names of children and grandchildren
 * const jackiesChildren = pipe(children, names, O.view)(jackie);
 * const jackiesGrandchildren = pipe(grandchildren, names, O.view)(jackie);
 * ```
 *
 * In the above example we have a potentially recursive data structure with
 * optional fields, arrays, and structures. We start by building an Optic
 * from a Person to each of their children. Then we compose this
 * with itself to get grandchildren. And lastly we build a getter to get
 * the name of a Person. Combining these getteres we are able to quickly
 * list out the names of People for any generation under a Person.
 *
 * Optics can also be used to modify the data that they are focused on.
 * They do so immutably and as easily as they can view data. Another
 * example.
 *
 * ```ts
 * import * as O from "./optics.ts";
 * import { pipe } from "./fn.ts";
 *
 * type Todo = { text: string; completed: boolean };
 * type Todos = readonly Todo[];
 *
 * const todo = (text: string, completed: boolean = false): Todo => ({
 *   text,
 *   completed,
 * });
 *
 * const myTodos: Todos = [
 *   todo("Write some good examples for Optics"),
 *   todo("Make sure the examples actually work"),
 *   todo("Make some coffee"),
 *   todo("Drink some coffee"),
 * ];
 *
 * // Focus on the completed field of the todos
 * const completed = pipe(O.id<Todos>(), O.array, O.prop("completed"));
 * const markAllAsCompleted = completed.modify(() => true);
 *
 * // This is a new Todos object with new Todo objects all with completed
 * // set to true
 * const newTodos = markAllAsCompleted(myTodos);
 * ```
 *
 * @module Optics
 *
 * @since 2.0.0
 */
import type { $, Kind } from "./kind.ts";
import type { ReadonlyRecord } from "./record.ts";
import type { Tree } from "./tree.ts";
import type { Either } from "./either.ts";
import type { Iso } from "./iso.ts";
import type { Monad } from "./monad.ts";
import type { Monoid } from "./monoid.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Eq } from "./eq.ts";
import type { Traversable } from "./traversable.ts";

import * as I from "./identity.ts";
import * as O from "./option.ts";
import * as A from "./array.ts";
import * as R from "./record.ts";
import * as E from "./either.ts";
import * as M from "./map.ts";
import * as P from "./pair.ts";
import { TraversableSet } from "./set.ts";
import { TraversableTree } from "./tree.ts";
import { isNotNil } from "./nilable.ts";
import { concatAll as getConcatAll } from "./monoid.ts";
import { apply, dimap, flow, identity, pipe, unsafeCoerce } from "./fn.ts";

// Build up language of Kliesli Optics

/**
 * Following are the runtime tags associated
 * with various forms of Optics.
 */

const GetterTag = "Getter" as const;
type GetterTag = typeof GetterTag;

const AffineFoldTag = "AffineFold" as const;
type AffineFoldTag = typeof AffineFoldTag;

const FoldTag = "Fold" as const;
type FoldTag = typeof FoldTag;

type Tag = GetterTag | AffineFoldTag | FoldTag;

/**
 * Type level mapping from Tag to URI. Since an
 * Optic get function is a Kliesli Arrow a => mb, we
 * associate the Optic Tags as follows:
 *
 * GetterTag => Identity
 * AffineFoldTag => Option
 * FoldTag => Array
 */
type ToURI<T extends Tag> = T extends GetterTag ? I.URI
  : T extends AffineFoldTag ? O.URI
  : T extends FoldTag ? A.URI
  : never;

/**
 * Join will give us the "loosest" of two tags. This is used to
 * determine the abstraction level that an Optic operatates at. The
 * most contstrained is Identity while the least constrained is Array.
 * The typescript version of the source optics Getters are as follows:
 *
 * ```ts
 * import type { Identity } from "./identity.ts";
 * import type { Option } from "./option.ts";
 *
 * type Getter<S, A>      = { get: (s: S) => Identity<A> };
 * type AffineFold<S, A>     = { get: (s: S) =>   Option<A> };
 * type Fold<S, A> = { get: (s: S) =>    Array<A> };
 * ```
 *
 * Here we can see that Getter is constrained to get exactly one A,
 * AffineFold is constrained to get zero or one A, and Fold is
 * constrained to get zero, one, or many As. Because of this,
 * Getter can always be lifted to a AffineFold and AffineFold can always be
 * lifted to Fold. All Optics share the same modify function
 * over S and A.
 *
 * Thus Join is like GT where Array > Option > Identity.
 */
type Join<U extends Tag, V extends Tag> = U extends FoldTag ? FoldTag
  : V extends FoldTag ? FoldTag
  : U extends AffineFoldTag ? AffineFoldTag
  : V extends AffineFoldTag ? AffineFoldTag
  : GetterTag;

/**
 * The runtime level GTE for Join
 */
function join<A extends Tag, B extends Tag>(
  a: A,
  b: B,
): Join<A, B> {
  if (a === FoldTag || b === FoldTag) {
    return FoldTag as unknown as Join<A, B>;
  } else if (a === AffineFoldTag || b === AffineFoldTag) {
    return AffineFoldTag as unknown as Join<A, B>;
  } else {
    return GetterTag as unknown as Join<A, B>;
  }
}

const MONADS = {
  [GetterTag]: I.MonadIdentity,
  [AffineFoldTag]: O.MonadOption,
  [FoldTag]: A.MonadArray,
} as const;

const optionToArray = <A>(ua: Option<A>): ReadonlyArray<A> =>
  O.isNone(ua) ? [] : [ua.value];

/**
 * Our new Optic definition. Instead of get and set we use get and modify as
 * set can be derived from modify(() => value). This drastically simplifies
 * implementation.
 */
export type Optic<T extends Tag, S, A> = {
  readonly tag: T;
  readonly view: (s: S) => $<ToURI<T>, [A, never, never]>;
  readonly modify: (modifyFn: (a: A) => A) => (s: S) => S;
};

/**
 * We recover the Getter type from the generic Optic
 */
export type Getter<S, A> = Optic<GetterTag, S, A>;

/**
 * We recover the AffineFold type from the generic Optic
 */
export type AffineFold<S, A> = Optic<AffineFoldTag, S, A>;

/**
 * We recover the Fold type from the generic Optic
 */
export type Fold<S, A> = Optic<FoldTag, S, A>;

export function optic<U extends Tag, S, A>(
  tag: U,
  view: (s: S) => $<ToURI<U>, [A, never, never]>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Optic<U, S, A> {
  return { tag, view, modify };
}

/**
 * Construct a Getter from get and modify functions.
 */
export function getter<S, A>(
  view: (s: S) => A,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Getter<S, A> {
  return optic(GetterTag, view, modify);
}

/**
 * Construct a AffineFold from get and modify functions.
 */
export function affinefold<S, A>(
  view: (s: S) => Option<A>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): AffineFold<S, A> {
  return optic(AffineFoldTag, view, modify);
}

/**
 * Construct a Fold from get and modify functions.
 */
export function fold<S, A>(
  view: (s: S) => ReadonlyArray<A>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Fold<S, A> {
  return optic(FoldTag, view, modify);
}

/**
 * Cast an Optic<U> as an Optic<V>. This non-exported function only
 * works for the following cases
 *
 * Getter => Getter
 * Getter => AffineFold
 * Getter => Fold
 *
 * AffineFold => AffineFold
 * AffineFold => Fold
 *
 * Fold => Fold
 *
 * As long as only Optics over Identity, Option, and Array are in
 * this file, there should be no way to break this casting.
 */
function cast<U extends Tag, V extends Tag, S, A>(
  G: Optic<U, S, A>,
  tag: V,
): Optic<V, S, A> {
  // Covers Getter => Getter, AffineFold => AffineFold, Fold => Fold
  if (G.tag === tag as Tag) {
    return unsafeCoerce(G);
    // AffineFold => Fold
  } else if (tag === FoldTag && G.tag === AffineFoldTag) {
    return unsafeCoerce(
      fold((s) => optionToArray(G.view(s) as Option<A>), G.modify),
    );
    // Getter => Fold
  } else if (tag === FoldTag && G.tag === GetterTag) {
    return unsafeCoerce(fold((s) => [G.view(s) as A], G.modify));
    // Getter => AffineFold
  } else if (tag === AffineFoldTag && G.tag == GetterTag) {
    return unsafeCoerce(
      affinefold((s) => O.of(G.view(s)) as Option<A>, G.modify),
    );
  }
  // Non-valid casts will throw an error.
  throw new Error(`Attempted to cast ${G.tag} to ${tag}`);
}

/**
 * Compose two Optics by lifting them to matching ADTs, then chain
 * using the Monad for that ADT. Using a monad here was easier than
 * implementing Arrow all over the fun library
 */
export function compose<V extends Tag, A, I>(second: Optic<V, A, I>) {
  return <U extends Tag, S>(
    first: Optic<U, S, A>,
  ): Optic<Join<U, V>, S, I> => {
    const tag = join(first.tag, second.tag);
    const _chain = MONADS[tag].chain as Monad<ToURI<Join<U, V>>>["chain"];
    const _first = cast(first, tag);
    const _second = cast(second, tag);
    return optic(
      tag,
      flow(_first.view, _chain(_second.view)),
      flow(_second.modify, _first.modify),
    );
  };
}

// deno-lint-ignore no-explicit-any
const _identity: Getter<any, any> = getter(identity, identity);

/**
 * The starting place for most Optics. Create an Optic over the
 * identity function.
 */
export function id<A>(): Getter<A, A> {
  return _identity;
}

/**
 * Invariant map over the focus of an existing Optic.
 */
export function imap<A, I>(
  fai: (a: A) => I,
  fia: (i: I) => A,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Join<U, GetterTag>, S, I> {
  return compose(getter(fai, dimap(fai, fia)));
}

export function of<A>(a: A): Getter<A, A> {
  return getter(() => a, identity);
}

/**
 * Construct a AffineFold from a Predicate or a Refinement.
 */
export function fromPredicate<S, A extends S>(
  refinement: Refinement<S, A>,
): AffineFold<S, A>;
export function fromPredicate<A>(predicate: Predicate<A>): AffineFold<A, A>;
export function fromPredicate<A>(predicate: Predicate<A>): AffineFold<A, A> {
  return affinefold(O.fromPredicate(predicate), identity);
}

/**
 * Construct a Getter<S, A> from an Iso<S, A>;
 */
export function fromIso<S, A>({ view, review }: Iso<S, A>): Getter<S, A> {
  return getter(view, dimap(view, review));
}

/**
 * Given an Optic over a structure with a property P, construct a
 * new Optic at that property P.
 */
export function prop<A, P extends keyof A>(
  prop: P,
): <U extends Tag, S>(
  sa: Optic<U, S, A>,
) => Optic<Join<U, GetterTag>, S, A[P]> {
  return compose(
    getter((s) => s[prop], (fii) => (a) => ({ ...a, [prop]: fii(a[prop]) })),
  );
}

/**
 * Given an Optic over a structure with properties P, construct a new
 * optic that only focuses on those properties
 */
export function props<A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Join<U, GetterTag>, S, { [K in P]: A[K] }> {
  const pick = R.pick<A, P>(...props);
  return compose(getter(
    pick,
    (faa) => (a) => ({ ...a, ...faa(pick(a)) }),
  ));
}

/**
 * Given an optic over an array, focus on a value at an index in the
 * array.
 */
export function index(
  i: number,
): <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyArray<A>>,
) => Optic<Join<U, AffineFoldTag>, S, A> {
  return compose(affinefold(A.lookup(i), A.modifyAt(i)));
}

/**
 * Given an optic over a record, focus on a value at a key in that
 * record.
 */
export function key(
  key: string,
): <U extends Tag, S, A>(
  first: Optic<U, S, Readonly<Record<string, A>>>,
) => Optic<Join<U, AffineFoldTag>, S, A> {
  return compose(affinefold(R.lookupAt(key), R.modifyAt(key)));
}

/**
 * Given an Optic focused on A, filter out or refine that A.
 */
export function filter<A, B extends A>(
  r: Refinement<A, B>,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Join<U, AffineFoldTag>, S, B>;
export function filter<A>(
  r: Predicate<A>,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Join<U, AffineFoldTag>, S, A>;
export function filter<A>(
  predicate: Predicate<A>,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Join<U, AffineFoldTag>, S, A> {
  return compose(
    affinefold(
      O.fromPredicate(predicate),
      (fii) => (a) => predicate(a) ? fii(a) : a,
    ),
  );
}

/**
 * Traverse a U using a Traversable for U. By construction
 * get for a Fold will return an array of values.
 */
export function traverse<T extends Kind>(
  T: Traversable<T>,
): <U extends Tag, S, A, B, C, D, E>(
  first: Optic<U, S, $<T, [A, B, C], [D], [E]>>,
) => Optic<Join<U, FoldTag>, S, A> {
  return compose(
    fold(
      // deno-lint-ignore no-explicit-any
      T.reduce((as, a) => as.concat(a), [] as any[]),
      T.map,
    ),
  );
}

/**
 * Extract the view function from an Optic
 *
 * @experiemental
 */
export function view<U extends Tag, S, A>(
  optic: Optic<U, S, A>,
): typeof optic.view {
  return optic.view;
}

/**
 * Extract the modify function from an Optic
 *
 * @experiemental
 */
export function modify<U extends Tag, S, A>(
  optic: Optic<U, S, A>,
): typeof optic.modify {
  return optic.modify;
}

/**
 * Construct a replace function for a given Optic
 *
 * @experimental
 */
export function replace<U extends Tag, S, A>(
  optic: Optic<U, S, A>,
): (a: A) => (s: S) => S {
  return (a) => optic.modify(() => a);
}

/**
 * Given an optic over a record, focus on an Option(value) at
 * the given key, allowing one to delete the key by modifying
 * with a None value.
 *
 * TODO: Clean this implementation up.
 */
export function atKey(
  key: string,
): <U extends Tag, S, A>(
  first: Optic<U, S, Readonly<Record<string, A>>>,
) => Optic<Join<U, GetterTag>, S, Option<A>> {
  const lookup = R.lookupAt(key);
  const deleteAt = () => R.deleteAt(key);
  const insertAt = R.insertAt(key);
  return compose(
    getter(lookup, (faa) =>
      flow(
        P.dup,
        P.map(flow(lookup, faa, O.fold(deleteAt, insertAt))),
        P.merge,
      )),
  );
}

/**
 * Construct an Optic over a ReadonlyMap that
 * can lookup a value by key.
 *
 * TODO: Clean this implementation up.
 */
export function atMap<B>(eq: Eq<B>) {
  return (key: B) => {
    const _lookup = M.lookup(eq)(key);
    const _deleteAt = M.deleteAt(eq)(key);
    const _insertAt = M.insertAt(eq)(key);
    return <U extends Tag, S, A>(
      first: Optic<U, S, ReadonlyMap<B, A>>,
    ): Optic<Join<U, GetterTag>, S, Option<A>> =>
      pipe(
        first,
        compose(getter(
          _lookup,
          (faa) => (s) =>
            pipe(
              s,
              _lookup,
              faa,
              O.fold(() => _deleteAt, _insertAt),
              apply(s),
            ),
        )),
      );
  };
}

/**
 * Collect all values focused on by an Optic into an Array, convert
 * them into a type I, and concat them using the passed Monoid.
 */
export function concatAll<A, I>(M: Monoid<I>, fai: (a: A) => I) {
  const _concatAll = getConcatAll(M);
  return <U extends Tag, S>(first: Optic<U, S, A>): (s: S) => I => {
    const { view } = cast(first, FoldTag);
    return flow(view, A.map(fai), _concatAll);
  };
}

/**
 * Construct an Optic over the values of a ReadonlyRecord<A>
 */
export const record: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyRecord<A>>,
) => Optic<Join<U, FoldTag>, S, A> = traverse(R.TraversableRecord);
/**
 * Construct an Optic over the values of a ReadonlyArray<A>
 */
export const array: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyArray<A>>,
) => Optic<Join<U, FoldTag>, S, A> = traverse(A.TraversableArray);

/**
 * Construct an Optic over the values of a ReadonlySet<A>
 */
export const set: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlySet<A>>,
) => Optic<Join<U, FoldTag>, S, A> = traverse(TraversableSet);

/**
 * Construct an Optic over the values of a Tree<A>
 */
export const tree: <U extends Tag, S, A>(
  first: Optic<U, S, Tree<A>>,
) => Optic<Join<U, FoldTag>, S, A> = traverse(TraversableTree);

/**
 * Wrap an Optic that focuses on a value that can be null or undefined
 * such that it focuses only on non-null values
 */
export const nilable: <U extends Tag, S, A>(
  first: Optic<U, S, A>,
) => Optic<Join<U, AffineFoldTag>, S, NonNullable<A>> = filter(isNotNil);

/**
 * Given an optic focused on an Option<A>, construct
 * an Optic focused within the Option.
 */
export const some: <U extends Tag, S, A>(
  optic: Optic<U, S, Option<A>>,
) => Optic<Join<U, AffineFoldTag>, S, A> = compose(affinefold(identity, O.map));

/**
 * Given an optic focused on an Either<B, A>, construct
 * an Optic focused on the Right value of the Either.
 */
export const right: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Either<B, A>>,
) => Optic<Join<U, AffineFoldTag>, S, A> = compose(
  affinefold(E.getRight, E.map),
);

/**
 * Given an optic focused on an Either<B, A>, construct
 * an Optic focused on the Left value of the Either.
 */
export const left: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Either<B, A>>,
) => Optic<Join<U, AffineFoldTag>, S, B> = compose(
  affinefold(E.getLeft, E.mapLeft),
);

/**
 * Given an optic focused on an Pair<A, B>, construct
 * an Optic focused on the First value of the Pair.
 */
export const first: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Pair<A, B>>,
) => Optic<Join<U, GetterTag>, S, A> = compose(getter(P.getFirst, P.map));

/**
 * Given an optic focused on an Pair<A, B>, construct
 * an Optic focused on the Second value of the Pair.
 */
export const second: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Pair<A, B>>,
) => Optic<Join<U, GetterTag>, S, B> = compose(getter(P.getSecond, P.mapLeft));
