# functional [![Coverage Status](https://coveralls.io/repos/github/baetheus/fun/badge.svg?branch=main)](https://coveralls.io/github/baetheus/fun?branch=main) [![deno module](https://shield.deno.dev/x/fun)](https://deno.land/x/fun) [![JSR](https://jsr.io/badges/@baetheus/fun)](https://jsr.io/@baetheus/fun)

Functional is a no dependency utility library for TypeScript and JavaScript that
includes a full suite of functional programming tools. Recent versions have
moved away from the jargon of
[Category Theory](https://en.wikipedia.org/wiki/Category_theory) to a more
intuitive naming scheme unique to functional. However, for those that do have
existing experience with functional programming or category theory, functional
includes many algebraic data types (including implementations of algebraic
structures for native javascript structures), type classes, TypeScript-based
higher kinded type substitutions, data-last utility combinators, and concrete
type utilities.

The primary goals of functional are to be:

- **Pragmatic**: The API surface of functional should favor ease-of-use and
  consistency over cleverness or purity. This project is ultimately for getting
  work done, even it if means a data structure or tools is not mathematically
  sound in all use cases.
- **Understandable**: The higher kinded type and algebraic structure
  implementations are meant to be as simple as possible so their logic can be
  easily audited. We have also chosen descriptive names for TypeClass
  implementations instead of ones pulled from Category Theory.
- **Performant**: Once the first two goals are satisfied, the long term changes
  within functional are likely going to be beneath the API surface and aimed at
  speeding things up where possible.

Some non-goals of functional are:

- To be an exact port of fp-ts. Many changes have been implemented throughout
  functional that diverge sharply from fp-ts, this is often on purpose.

## Usage

This library is a collection of smaller tools. This means that each one should
be imported separately. There is no barrel export, instead one should pull in
the modules they need individually. Following is an example importing from jsr
using the deno runtime.

```ts
import * as A from "jsr:@baetheus/fun/array";
import { pipe } from "jsr:@baetheus/fun/fn";

pipe(
  A.range(5), // get 5 numbers 0-4
  A.map((n) => n * n), // square them
  console.log, // [ 0, 1, 4, 9, 16 ]
);
```

## Documentation

Documentation is generated for each github tagged release. The latest
documentation can be found [here](https://jsr.io/@baetheus/fun). Following is a
list of the
[algebraic data types](https://en.wikipedia.org/wiki/Algebraic_data_type) and
[algebraic structures](https://en.wikipedia.org/wiki/Algebraic_structure)/[type classes](https://en.wikipedia.org/wiki/Type_class)
that are implemented in fun. Note that some of these types are both data
structures and more general algebraic structures.

| Type                                 | Algebraic Data Type | Algebraic Structure | Native | Other Names                           |
| ------------------------------------ | ------------------- | ------------------- | ------ | ------------------------------------- |
| [Applicable](./applicable.ts)        |                     | ✓                   |        | Applicative                           |
| [Bimappable](./bimappable.ts)        |                     | ✓                   |        | Bifunctor, Covariant Bifunctor        |
| [Combinable](./combinable.ts)        |                     | ✓                   |        | Semigroup                             |
| [Comparable](./comparable.ts)        |                     | ✓                   |        | Setoid, Eq                            |
| [Composable](./composable.ts)        |                     | ✓                   |        | Category                              |
| [Failable](./failable.ts)            |                     | ✓                   |        | Validation                            |
| [Filterable](./filterable.ts)        |                     | ✓                   |        |                                       |
| [Flatmappable](./flatmappable.ts)    |                     | ✓                   |        | Monad                                 |
| [Foldable](./foldable.ts)            |                     | ✓                   |        | Reducible                             |
| [Initializable](./initializable.ts)  |                     | ✓                   |        | Monoid                                |
| [Mappable](./mappable.ts)            |                     | ✓                   |        | Functor, Covariant Functor            |
| [Premappable](./premappable.ts)      |                     | ✓                   |        | Contravariant, Contravariant Functor  |
| [Schemable](./schemable.ts)          |                     | ✓                   |        |                                       |
| [Showable](./showable.ts)            |                     | ✓                   |        | Show                                  |
| [Sortable](./sortable.ts)            |                     | ✓                   |        | Ord                                   |
| [Traversable](./traversable.ts)      |                     | ✓                   |        |                                       |
| [Wrappable](./wrappable.ts)          |                     | ✓                   |        | Pointed                               |
| [Newtype](./newtype.ts)              |                     |                     |        | Brand, Branded Type                   |
| [AsyncIterable](./async_iterable.ts) | ✓                   |                     | ✓      |                                       |
| [Boolean](./boolean.ts)              | ✓                   |                     | ✓      |                                       |
| [Iterable](./iterable.ts)            | ✓                   |                     | ✓      |                                       |
| [Number](./number.ts)                | ✓                   |                     | ✓      |                                       |
| [Promise](./promise.ts)              | ✓                   |                     | ✓      |                                       |
| [ReadonlyArray](./array.ts)          | ✓                   |                     | ✓      | Array                                 |
| [ReadonlyMap](./map.ts)              | ✓                   |                     | ✓      | Map                                   |
| [ReadonlySet](./set.ts)              | ✓                   |                     | ✓      | Set                                   |
| [String](./string.ts)                | ✓                   |                     | ✓      |                                       |
| [Async](./async.ts)                  | ✓                   |                     |        | Task                                  |
| [AsyncEither](./async_either.ts)     | ✓                   |                     |        | TaskEither                            |
| [Decoder](./decoder.ts)              | ✓                   |                     |        |                                       |
| [Either](./either.ts)                | ✓                   |                     |        |                                       |
| [Fn](./fn.ts)                        | ✓                   |                     |        | Reader                                |
| [FnEither](./fn_either.ts)           | ✓                   |                     |        | ReaderEither                          |
| [Identity](./identity.ts)            | ✓                   |                     |        | Trivial                               |
| [JsonSchema](./json_schema.ts)       | ✓                   |                     |        |                                       |
| [Nilable](./nilable.ts)              | ✓                   |                     |        |                                       |
| [Optic](./optic.ts)                  | ✓                   |                     |        | Iso, Lens, Optional, Prism, Traversal |
| [Option](./option.ts)                | ✓                   |                     |        | Maybe                                 |
| [Pair](./pair.ts)                    | ✓                   |                     |        | Separated                             |
| [Predicate](./predicate.ts)          | ✓                   |                     |        |                                       |
| [Refinement](./refinement.ts)        | ✓                   |                     |        |                                       |
| [State](./state.ts)                  | ✓                   |                     |        |                                       |
| [Stream](./stream.ts)                | ✓                   |                     |        | Observable                            |
| [Sync](./sync.ts)                    | ✓                   |                     |        | IO                                    |
| [SyncEither](./sync_either.ts)       | ✓                   |                     |        | IOEither                              |
| [These](./these.ts)                  | ✓                   |                     |        |                                       |
| [Tree](./tree.ts)                    | ✓                   |                     |        |                                       |

## Major Versions

In the fashion of semantic versioning function makes an effort to not break APIs
on minor or patch releases. Occasionally, candidate tags (eg. 2.0.0-alpha.1)
will be used to indicate a commit is ready for inspection by other developers of
fun. The main branch of fun is for bleeding edge developement and is not
considered to be a production ready import.

| Version | Deno Release                                                    | TypeScript Version                                                   |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| 2.0.0   | [1.36.0](https://github.com/denoland/deno/releases/tag/v1.36.0) | [5.1.6](https://github.com/microsoft/TypeScript/releases/tag/v5.1.6) |
| 1.0.0   | [1.9.2](https://github.com/denoland/deno/releases/tag/v1.9.2)   | [4.2.2](https://github.com/microsoft/TypeScript/releases/tag/v4.2.2) |

## History

functional started as an exploratory project in late 2020 to learn more about
higher kinded type implementations in TypeScript and to assess how much effort
it would take to port fp-ts to a Deno-native format. Through that process it
became clear that the things I had learned could serve as both useful tools and
as a learning resource in and of itself. At various times functional has used
multiple hkt encodings, type class definitions, and implementation methods. Some
of the key history moments of functional are in the hkts history. Specifically,
the
[hkts implementation](https://github.com/nullpub/hkts/commit/684e3e56c2d6ae7313fc70c2f35a942c8abad8d8)
in the initial commit and the last
[major type system rewrite](https://github.com/nullpub/hkts/tree/32ddaa0ddde4d437807a66e914c7854867ed847d)
might be interesting. Now, however, the API for version 1.0.0 is set and will
only change between major versions (which should be extremely rare).

This project is incredibly indebted to [gcanti](https://github.com/gcanti),
[pelotom](https://github.com/pelotom), and the TypeScript community at large.
There is nothing new in this project, it's all a reimaginings of ideas that
already existed.

For anyone getting started with functional programming I highly recommend
writing your own implementation of an ADT such as Option or Either. From Functor
to IndexedTraversable with everything inbetween, there is a lot to learn about
the mechanics of programming in general by taking these small pieces apart and
putting them back together.

## Contributions

Contributions are welcome! Currently, the only maintainer for functional is
[baetheus](https://github.com/baetheus). If you want to add to functional or
change something, open an issue and ask away. The guidelines for contribution
are:

1. We are kind to others
2. We use
   [conventional commit messages](https://www.conventionalcommits.org/en/v1.0.0/)
3. We use [semantic versioning](https://semver.org/)
4. We try to keep test coverage at 100%
5. We try not to break APIs between major releases

Since there is little churn in this library releases are infrequent. If you wish
to contribute I would prefer that you start with documentation. It is one of my
long term goals to have a few sentences of description and an example for every
export. After that, if I'm behind on test coverage that is a great place to
start. Last, if you wish to add a feature it's good to start a discussion about
the feature with a few concrete use cases before submitting a PR. This will
allow for others to chime in without crowding the issues section.

Thanks for you interest!
