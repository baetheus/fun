# functional [![Coverage Status](https://coveralls.io/repos/github/baetheus/fun/badge.svg?branch=main)](https://coveralls.io/github/baetheus/fun?branch=main)

functional is a set of utility modules in the vein of
[Ramda](https://ramdajs.com/) and [fp-ts](https://gcanti.github.io/fp-ts/). It
uses a
[lightweight higher kinded type encoding](https://github.com/baetheus/fun/blob/main/kind.ts)
to implement type classes/algebraic structurs such as
[Functor](https://github.com/baetheus/fun/blob/main/functor.ts),
[Monad](https://github.com/baetheus/fun/blob/main/monad.ts), and
[Traversable](https://github.com/baetheus/fun/blob/main/traversable.ts).
Originally, it followed the
[static-land](https://github.com/fantasyland/static-land/blob/master/docs/spec.md)
specification for these modules, but has since diverged and settled on a curried
form of those same module definitions. It contains many common algebraic types
such as [Option](https://github.com/baetheus/fun/blob/main/option.ts),
[Either](https://github.com/baetheus/fun/blob/main/either.ts), and other tools
such as [Lenses](https://github.com/baetheus/fun/blob/main/lens.ts) and
[Schemables](https://github.com/baetheus/fun/blob/main/schemable.ts).

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

## Documentation

Deno comes with a documentation generator. The
[documentation generation](https://github.com/denoland/deno_doc) doesn't handle
re-exports or types on consts that are functions, as that work progresses the
documentation for functional will improve. The current documentation for any
module at the `HEAD` of the `main` branch can be found here:

- [alt.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/alt.ts)
- [alternative.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/alternative.ts)
- [applicative.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/applicative.ts)
- [apply.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/apply.ts)
- [array.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/array.ts)
- [async_iterable.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/async_iterable.ts)
- [bifunctor.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/bifunctor.ts)
- [boolean.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/boolean.ts)
- [category.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/category.ts)
- [chain.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/chain.ts)
- [comonad.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/comonad.ts)
- [const.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/const.ts)
- [contravariant.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/contravariant.ts)
- [datum.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/datum.ts)
- [decode_error.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/decode_error.ts)
- [decoder.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/decoder.ts)
- [either.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/either.ts)
- [extend.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/extend.ts)
- [filterable.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/filterable.ts)
- [fns.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/fns.ts)
- [foldable.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/foldable.ts)
- [functor.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/functor.ts)
- [group.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/group.ts)
- [guard.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/guard.ts)
- [identity.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/identity.ts)
- [io.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/io.ts)
- [io_either.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/io_either.ts)
- [iso.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/iso.ts)
- [iterable.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/iterable.ts)
- [json.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/json.ts)
- [kind.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/kind.ts)
- [lens.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/lens.ts)
- [map.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/map.ts)
- [mod.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/mod.ts)
- [monad.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/monad.ts)
- [monoid.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/monoid.ts)
- [newtype.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/newtype.ts)
- [nilable.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/nilable.ts)
- [number.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/number.ts)
- [optic.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/optic.ts)
- [option.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/option.ts)
- [optional.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/optional.ts)
- [ord.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/ord.ts)
- [plus.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/plus.ts)
- [prism.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/prism.ts)
- [profunctor.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/profunctor.ts)
- [reader.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/reader.ts)
- [reader_either.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/reader_either.ts)
- [record.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/record.ts)
- [schemable.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/schemable.ts)
- [semigroup.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/semigroup.ts)
- [semigroupoid.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/semigroupoid.ts)
- [separated.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/separated.ts)
- [set.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/set.ts)
- [setoid.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/setoid.ts)
- [show.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/show.ts)
- [state.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/state.ts)
- [string.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/string.ts)
- [task.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/task.ts)
- [task_either.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/task_either.ts)
- [these.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/these.ts)
- [traversable.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/traversable.ts)
- [traversal.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/traversal.ts)
- [tree.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/tree.ts)
- [types.ts](https://doc.deno.land/https://raw.githubusercontent.com/baetheus/fun/main/types.ts)

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

1. We use
   [conventional commit messages](https://www.conventionalcommits.org/en/v1.0.0/)
2. We use [semantic versioning](https://semver.org/)
3. We don't break APIs
4. We keep test coverage at 100%
