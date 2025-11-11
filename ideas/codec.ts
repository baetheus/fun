/**
 * I think it's time to extend Decoder to be a full codec. The basic idea is
 * that a Codec can decode from I to A and encode from A to O. Most of the time
 * I will be unknown and O will be the same as A. But there is room for cases
 * such as Option<A> encoding to and decoding from A or null or undefined. This
 * will allow for cleaner mapping to and from internal representations. In
 * tandem with this I would like to update Schemable to allow for some of the
 * more useful filters on strings, numbers, record domain as well as range, and
 * anything else that might be useful in general.
 */
import type * as Either from "../either.ts";

import * as Err from "../err.ts";

export const leaf = Err.err("DecodeErrorLeaf");

export type Codec<I, A, O> = {
  decode: (input: I) => Either.Either<Err.AnyErr, A>;
  encode: (value: A) => O;
};
