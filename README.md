# functional [![Coverage Status](https://coveralls.io/repos/github/nullpub/fun/badge.svg?branch=main)](https://coveralls.io/github/nullpub/fun?branch=main)

functional is a set of utility modules in the vein of
[Ramda](https://ramdajs.com/) and [fp-ts](https://gcanti.github.io/fp-ts/). It
uses a
[lightweight higher kinded type encoding](https://github.com/nullpub/fun/blob/main/hkt.ts)
to implement
[type classes](https://github.com/nullpub/fun/blob/main/type_classes.ts) such as
Functor, Monad, and Traversable. Originally, it followed the
[static-land](https://github.com/fantasyland/static-land/blob/master/docs/spec.md)
specification for these modules, but has since diverged and settled on a curried
form of those same module definitions. It contains many common algebraic types
such as [Option](https://github.com/nullpub/fun/blob/main/option.ts),
[Either](https://github.com/nullpub/fun/blob/main/either.ts), and other tools
such as [Lenses](https://github.com/nullpub/fun/blob/main/optics/lens.ts) and
[Schemables](https://github.com/nullpub/fun/blob/main/schemable/schemable.ts).

The primary goals of functional are to be:

- **Pragmatic**: The API surface of functional should favor ease-of-use and
  consistency over cleverness or purity. This project is ultimately for getting
  work done.
- **Understandable**: The HKT and Type Class implementations are meant to be as
  simple as possible so their logic can be easily audited.
- **Performant**: Once the first two goals are satisfied, the long term changes
  within functional are likely going to be beneath the API surface and aimed at
  speeding things up where possible.

Some non-goals of functional are:

- To be an exact port of fp-ts. Many changes have been implemented throughout
  functional that diverge sharply from fp-ts, this is often on purpose.

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

## Documentation

Deno comes with a documentation generator. The
[documentation generation](https://github.com/denoland/deno_doc) doesn't handle
re-exports or types on consts that are functions, as that work progresses the
documentation for functional will improve. The current documentation for any
module at the `HEAD` of the `main` branch can be found here:

- [Affect](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Faffect.ts)
- [Array](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Farray.ts)
- [Const](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fconst.ts)
- [Datum](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fdatum.ts)
- [Derivations](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fderivations.ts)
- [Either](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Feither.ts)
- [Functions](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Ffns.ts)
- [HKT](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fhkt.ts)
- [Identity](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fidentity.ts)
- [IO](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fio.ts)
- [IOEither](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fio_either.ts)
- [Map](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fmap.ts)
- [Monoid](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fmonoid.ts)
- [Nilable](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fnilable.ts)
- [Option](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Foption.ts)
- [Ord](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Ford.ts)
- [Reader](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Freader.ts)
- [ReaderEither](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Freader_either.ts)
- [Record](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Frecord.ts)
- [Semigroup](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fsemigroup.ts)
- [Sequence](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fsequence.ts)
- [Set](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fset.ts)
- [Setoid](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fsetoid.ts)
- [State](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fstate.ts)
- [Task](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Ftask.ts)
- [TaskEither](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Ftask_either.ts)
- [These](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fthese.ts)
- [Tree](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Ftree.ts)
- [Type Classes](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Ftype_classes.ts)
- [Types](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Ftypes.ts)
- [At](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Foptics/at.ts)
- [Index](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Foptics%2Findex.ts)
- [Iso](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Foptics%2Fiso.ts)
- [Lens](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Foptics%2Flens.ts)
- [Optional](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Foptics%2Foptional.ts)
- [Prism](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Foptics%2Fprism.ts)
- [Traversal](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Foptics%2Ftraversal.ts)
- [Decoder](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fschemable%2Fdecoder.ts)
- [Guard](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fschemable%2Fguard.ts)
- [Schemable](https://doc.deno.land/https/raw.githubusercontent.com%2Fnullpub%2Ffun%2Fmain%2Fschemable%2Fschemable.ts)

In general, you can take any specific module url and put it into
[https://doc.deno.land/](https://doc.deno.land/) to get a decent rendering of
the documentation. (Note: Currently the deno_doc crate, which is what
doc.deno.land uses, does not handle re-exports or const arrow function exports
well. Eventually, the documentation will get better even if this libraries
maintainers have to write those patches themselves).

## Versions

| Version | Deno Release                                                  | TypeScript Version                                                   |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1.0.0   | [1.9.2](https://github.com/denoland/deno/releases/tag/v1.9.2) | [4.2.2](https://github.com/microsoft/TypeScript/releases/tag/v4.2.2) |

## Contributions

Contributions are welcome! Currently, the only maintainer for functional is
[baetheus](https://github.com/baetheus). If you want to add to functional or
change something, open an issue and ask away. The guidelines for contribution
are:

1. We use
   [conventional commit messages](https://www.conventionalcommits.org/en/v1.0.0/)
2. We use [semantic versioning](https://semver.org/)
3. We don't break APIs
4. We keep test coverage at 100%
