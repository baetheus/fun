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
 * with itself to get grandchildren. And lastly we build a lens to get
 * the name of a Person. Combining these lenses we are able to quickly
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
import { ReadonlyRecord } from "./record.ts";
import { Tree } from "./tree.ts";
import type { Either } from "./either.ts";
import type { Iso } from "./iso.ts";
import type { Monad } from "./monad.ts";
import type { Monoid } from "./monoid.ts";
import type { Option } from "./option.ts";
import type { Pair } from "./pair.ts";
import type { Predicate } from "./predicate.ts";
import type { Refinement } from "./refinement.ts";
import type { Setoid } from "./setoid.ts";
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
import {
  apply,
  dimap,
  flow,
  identity,
  pipe,
  todo,
  unsafeCoerce,
} from "./fn.ts";

// Build up language of Kliesli Optics

/**
 * Following are the runtime tags associated
 * with various forms of Optics.
 */

const LensTag = "Lens" as const;
type LensTag = typeof LensTag;

const PrismTag = "Prism" as const;
type PrismTag = typeof PrismTag;

const TraversalTag = "Traversal" as const;
type TraversalTag = typeof TraversalTag;

type Tag = LensTag | PrismTag | TraversalTag;

/**
 * Type level mapping from Tag to URI. Since an
 * Optic get function is a Kliesli Arrow a => mb, we
 * associate the Optic Tags as follows:
 *
 * LensTag => Identity
 * PrismTag => Option
 * TraversalTag => Array
 */
type ToURI<T extends Tag> = T extends LensTag ? I.URI
  : T extends PrismTag ? O.URI
  : T extends TraversalTag ? A.URI
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
 * type Lens<S, A>      = { get: (s: S) => Identity<A> };
 * type Prism<S, A>     = { get: (s: S) =>   Option<A> };
 * type Traversal<S, A> = { get: (s: S) =>    Array<A> };
 * ```
 *
 * Here we can see that Lens is constrained to get exactly one A,
 * Prism is constrained to get zero or one A, and Traversal is
 * constrained to get zero, one, or many As. Because of this,
 * Lens can always be lifted to a Prism and Prism can always be
 * lifted to Traversal. All Optics share the same modify function
 * over S and A.
 *
 * Thus Join is like GT where Array > Option > Identity.
 */
type Join<U extends Tag, V extends Tag> = U extends TraversalTag ? TraversalTag
  : V extends TraversalTag ? TraversalTag
  : U extends PrismTag ? PrismTag
  : V extends PrismTag ? PrismTag
  : LensTag;

/**
 * The runtime level GTE for Join
 */
function join<A extends Tag, B extends Tag>(
  a: A,
  b: B,
): Join<A, B> {
  if (a === TraversalTag || b === TraversalTag) {
    return TraversalTag as unknown as Join<A, B>;
  } else if (a === PrismTag || b === PrismTag) {
    return PrismTag as unknown as Join<A, B>;
  } else {
    return LensTag as unknown as Join<A, B>;
  }
}

const MONADS = {
  [LensTag]: I.MonadIdentity,
  [PrismTag]: O.MonadOption,
  [TraversalTag]: A.MonadArray,
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
 * We recover the Lens type from the generic Optic
 */
export type Lens<S, A> = Optic<LensTag, S, A>;

/**
 * We recover the Prism type from the generic Optic
 */
export type Prism<S, A> = Optic<PrismTag, S, A>;

/**
 * We recover the Traversal type from the generic Optic
 */
export type Traversal<S, A> = Optic<TraversalTag, S, A>;

export function optic<U extends Tag, S, A>(
  tag: U,
  view: (s: S) => $<ToURI<U>, [A, never, never]>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Optic<U, S, A> {
  return { tag, view, modify };
}

/**
 * Construct a Lens from get and modify functions.
 */
export function lens<S, A>(
  view: (s: S) => A,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Lens<S, A> {
  return optic(LensTag, view, modify);
}

/**
 * Construct a Prism from get and modify functions.
 */
export function prism<S, A>(
  view: (s: S) => Option<A>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Prism<S, A> {
  return optic(PrismTag, view, modify);
}

/**
 * Construct a Traversal from get and modify functions.
 */
export function traversal<S, A>(
  view: (s: S) => ReadonlyArray<A>,
  modify: (modifyFn: (a: A) => A) => (s: S) => S,
): Traversal<S, A> {
  return optic(TraversalTag, view, modify);
}

/**
 * Cast an Optic<U> as an Optic<V>. This non-exported function only
 * works for the following cases
 *
 * Lens => Lens
 * Lens => Prism
 * Lens => Traversal
 *
 * Prism => Prism
 * Prism => Traversal
 *
 * Traversal => Traversal
 *
 * As long as only Optics over Identity, Option, and Array are in
 * this file, there should be no way to break this casting.
 */
function cast<U extends Tag, V extends Tag, S, A>(
  G: Optic<U, S, A>,
  tag: V,
): Optic<V, S, A> {
  // Covers Lens => Lens, Prism => Prism, Traversal => Traversal
  if (G.tag === tag as Tag) {
    return unsafeCoerce(G);
    // Prism => Traversal
  } else if (tag === TraversalTag && G.tag === PrismTag) {
    return unsafeCoerce(
      traversal((s) => optionToArray(G.view(s) as Option<A>), G.modify),
    );
    // Lens => Traversal
  } else if (tag === TraversalTag && G.tag === LensTag) {
    return unsafeCoerce(traversal((s) => [G.view(s) as A], G.modify));
    // Lens => Prism
  } else if (tag === PrismTag && G.tag == LensTag) {
    return unsafeCoerce(
      prism((s) => O.of(G.view(s)) as Option<A>, G.modify),
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
const _identity: Lens<any, any> = lens(identity, identity);

/**
 * The starting place for most Optics. Create an Optic over the
 * identity function.
 */
export function id<A>(): Lens<A, A> {
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
) => Optic<Join<U, LensTag>, S, I> {
  return compose(lens(fai, dimap(fai, fia)));
}

/**
 * Construct a Prism from a Predicate or a Refinement.
 */
export function fromPredicate<S, A extends S>(
  refinement: Refinement<S, A>,
): Prism<S, A>;
export function fromPredicate<A>(predicate: Predicate<A>): Prism<A, A>;
export function fromPredicate<A>(predicate: Predicate<A>): Prism<A, A> {
  return prism(O.fromPredicate(predicate), identity);
}

/**
 * Construct a Lens<S, A> from an Iso<S, A>;
 */
export function fromIso<S, A>({ view, review }: Iso<S, A>): Lens<S, A> {
  return lens(view, dimap(view, review));
}

/**
 * Given an Optic over a structure with a property P, construct a
 * new Optic at that property P.
 */
export function prop<A, P extends keyof A>(
  prop: P,
): <U extends Tag, S>(
  sa: Optic<U, S, A>,
) => Optic<Join<U, LensTag>, S, A[P]> {
  return compose(
    lens((s) => s[prop], (fii) => (a) => ({ ...a, [prop]: fii(a[prop]) })),
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
) => Optic<Join<U, LensTag>, S, { [K in P]: A[K] }> {
  return compose(lens(
    R.pick(props),
    (faa) => (a) => ({ ...a, ...faa(pipe(a, R.pick(props))) }),
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
) => Optic<Join<U, PrismTag>, S, A> {
  return compose(prism(A.lookup(i), A.modifyAt(i)));
}

/**
 * Given an optic over a record, focus on a value at a key in that
 * record.
 */
export function key(
  key: string,
): <U extends Tag, S, A>(
  first: Optic<U, S, Readonly<Record<string, A>>>,
) => Optic<Join<U, PrismTag>, S, A> {
  return compose(prism(R.lookupAt(key), R.modifyAt(key)));
}

/**
 * Given an Optic focused on A, filter out or refine that A.
 */
export function filter<A, B extends A>(
  r: Refinement<A, B>,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Join<U, PrismTag>, S, B>;
export function filter<A>(
  r: Predicate<A>,
): <U extends Tag, S>(
  first: Optic<U, S, A>,
) => Optic<Join<U, PrismTag>, S, A>;
export function filter<A>(
  predicate: Predicate<A>,
): <U extends Tag, S>(first: Optic<U, S, A>) => Optic<Join<U, PrismTag>, S, A> {
  return compose(
    prism(
      O.fromPredicate(predicate),
      (fii) => (a) => predicate(a) ? fii(a) : a,
    ),
  );
}

/**
 * Traverse a U using a Traversable for U. By construction
 * get for a Traversal will return an array of values.
 */
export function traverse<T extends Kind>(
  T: Traversable<T>,
): <U extends Tag, S, A, B, C, D, E>(
  first: Optic<U, S, $<T, [A, B, C], [D], [E]>>,
) => Optic<Join<U, TraversalTag>, S, A> {
  return compose(
    traversal(
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
) => Optic<Join<U, LensTag>, S, Option<A>> {
  const lookup = R.lookupAt(key);
  return compose(lens(lookup, (faa) => (s) =>
    pipe(
      s,
      lookup,
      faa,
      O.fold(() => R.deleteAt(key), R.insertAt(key)),
      apply(s),
    )));
}

/**
 * Construct an Optic over a ReadonlyMap that
 * can lookup a value by key.
 *
 * TODO: Clean this implementation up.
 */
export function atMap<B>(setoid: Setoid<B>) {
  return (key: B) => {
    const _lookup = M.lookup(setoid)(key);
    const _deleteAt = M.deleteAt(setoid)(key);
    const _insertAt = M.insertAt(setoid)(key);
    return <U extends Tag, S, A>(
      first: Optic<U, S, ReadonlyMap<B, A>>,
    ): Optic<Join<U, LensTag>, S, Option<A>> =>
      pipe(
        first,
        compose(lens(
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
    const { view } = cast(first, TraversalTag);
    return flow(view, A.map(fai), _concatAll);
  };
}

/**
 * Construct an Optic over the values of a ReadonlyRecord<A>
 */
export const record: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyRecord<A>>,
) => Optic<Join<U, TraversalTag>, S, A> = traverse(R.TraversableRecord);
/**
 * Construct an Optic over the values of a ReadonlyArray<A>
 */
export const array: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlyArray<A>>,
) => Optic<Join<U, TraversalTag>, S, A> = traverse(A.TraversableArray);

/**
 * Construct an Optic over the values of a ReadonlySet<A>
 */
export const set: <U extends Tag, S, A>(
  first: Optic<U, S, ReadonlySet<A>>,
) => Optic<Join<U, TraversalTag>, S, A> = traverse(TraversableSet);

/**
 * Construct an Optic over the values of a Tree<A>
 */
export const tree: <U extends Tag, S, A>(
  first: Optic<U, S, Tree<A>>,
) => Optic<Join<U, TraversalTag>, S, A> = traverse(TraversableTree);

/**
 * Wrap an Optic that focuses on a value that can be null or undefined
 * such that it focuses only on non-null values
 */
export const nilable: <U extends Tag, S, A>(
  first: Optic<U, S, A>,
) => Optic<Join<U, PrismTag>, S, NonNullable<A>> = filter(isNotNil);

/**
 * Given an optic focused on an Option<A>, construct
 * an Optic focused within the Option.
 */
export const some: <U extends Tag, S, A>(
  optic: Optic<U, S, Option<A>>,
) => Optic<Join<U, PrismTag>, S, A> = compose(prism(identity, O.map));

/**
 * Given an optic focused on an Either<B, A>, construct
 * an Optic focused on the Right value of the Either.
 */
export const right: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Either<B, A>>,
) => Optic<Join<U, PrismTag>, S, A> = compose(prism(E.getRight, E.map));

/**
 * Given an optic focused on an Either<B, A>, construct
 * an Optic focused on the Left value of the Either.
 */
export const left: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Either<B, A>>,
) => Optic<Join<U, PrismTag>, S, B> = compose(prism(E.getLeft, E.mapLeft));

/**
 * Given an optic focused on an Pair<A, B>, construct
 * an Optic focused on the First value of the Pair.
 */
export const first: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Pair<A, B>>,
) => Optic<Join<U, LensTag>, S, A> = compose(lens(P.getFirst, P.map));

/**
 * Given an optic focused on an Pair<A, B>, construct
 * an Optic focused on the Second value of the Pair.
 */
export const second: <U extends Tag, S, B, A>(
  optic: Optic<U, S, Pair<A, B>>,
) => Optic<Join<U, LensTag>, S, B> = compose(lens(P.getSecond, P.mapLeft));
