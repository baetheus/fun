import * as D from "../decoder.ts";
import * as E from "../either.ts";
import { flow, pipe } from "../fns.ts";

const print = flow(
  D.extract,
  E.fold(console.error, console.log),
);

const decodeUnions = pipe(
  D.boolean,
  D.union(D.array(D.number)),
  D.union(D.literal(1, 2, 3, "ehlo", "helo")),
);

const decodeIntersections = pipe(
  D.string,
  D.intersect(D.number),
  D.intersect(D.boolean),
  D.intersect(D.array(D.number)),
);

const decodeNestedUnions = pipe(
  D.string,
  D.union(pipe(
    D.number,
    D.union(pipe(
      D.boolean,
      pipe(D.union(
        D.array(D.number),
      )),
    )),
  )),
);

[decodeUnions, decodeIntersections, decodeNestedUnions].forEach((decode) =>
  pipe(
    [1, 2, "hello"],
    decode,
    print,
  )
);
