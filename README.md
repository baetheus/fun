# functional [![Coverage Status](https://coveralls.io/repos/github/baetheus/fun/badge.svg?branch=main)](https://coveralls.io/github/baetheus/fun?branch=main) [![deno module](https://shield.deno.dev/x/fun)](https://deno.land/x/fun)

functional is a set of utility modules in the vein of
[Ramda](https://ramdajs.com/) and [fp-ts](https://gcanti.github.io/fp-ts/). It
uses a
[lightweight higher kinded type encoding](https://github.com/baetheus/fun/blob/main/kind.ts)
to implement reusable high level interfaces. These interfaces are called Type
Classes or Algebraic Structures in other languages. The usefulness of these
interfaces comes from their ability to describe common operations across
different data structures and concrete data types without referencing any
specific data type. Intuitively one can think of these higher kinded types as a
generic type that itself has a Generic parameter. ie `type Apply<A, B> = A<B>`.
This is not valid typescript code but it illuminates the cored idea of higher
kinder types.

The functional library is written as a first class Deno library. Some effort
might be made to release Deno into npm but NodeJS is not a first class target
for support. If you want a functional library for NodeJS fp-ts is definitely the
way to go!

The primary goals of functional are to be:

- **Pragmatic**: The API surface of functional should favor ease-of-use and
  consistency over cleverness or purity. This project is ultimately for getting
  work done.
- **Understandable**: The higher kinded type and TypeClass implementations are
  meant to be as simple as possible so their logic can be easily audited. We
  have also chosen descriptive names for TypeClass implementations instead of
  ones pulled from Category Theory.
- **Performant**: Once the first two goals are satisfied, the long term changes
  within functional are likely going to be beneath the API surface and aimed at
  speeding things up where possible.

Some non-goals of functional are:

- To be an exact port of fp-ts. Many changes have been implemented throughout
  functional that diverge sharply from fp-ts, this is often on purpose.

## Documentation

Documentation is generated for each github tagged release. The latest
documentation can be found [here](https://deno.land/x/fun).

## Versions

| Version | Deno Release                                                  | TypeScript Version                                                   |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1.0.0   | [1.9.2](https://github.com/denoland/deno/releases/tag/v1.9.2) | [4.2.2](https://github.com/microsoft/TypeScript/releases/tag/v4.2.2) |

## History

functional started as an exploratory project in late 2020 to learn more about
higher kinded type implementations in TypeScript and to assess how much effort
it would take to port fp-ts to a Deno-native format. Through that process it
became clear that the things I had learned could serve as both a useful tool and
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

Also, primary development takes places on one of my servers where I use fossil
instead of git as a VCS. I still use github for interfacing with users and for
releases, but if you wish to become a long term contributor learning to get
around with fossil is a must.

Thanks for you interest!
