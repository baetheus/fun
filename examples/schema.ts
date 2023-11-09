import { schema } from "../schemable.ts";
import { SchemableDecoder } from "../decoder.ts";
import { print, SchemableJsonBuilder } from "../json_schema.ts";
import { sample, SchemableArbitrary } from "../contrib/fast-check.ts";
import { pipe } from "../fn.ts";

const Vector = schema((s) => s.tuple(s.number(), s.number(), s.number()));

const Asteroid = schema((s) =>
  s.struct({
    type: s.literal("asteroid"),
    location: Vector(s),
    mass: s.number(),
  })
);

const Planet = schema((s) =>
  s.struct({
    type: s.literal("planet"),
    location: Vector(s),
    mass: s.number(),
    population: s.number(),
    habitable: s.boolean(),
  })
);

const Rank = schema((s) =>
  pipe(
    s.literal("captain"),
    s.union(s.literal("first mate")),
    s.union(s.literal("officer")),
    s.union(s.literal("ensign")),
  )
);

const CrewMember = schema((s) =>
  s.struct({
    name: s.string(),
    age: s.number(),
    rank: Rank(s),
    home: Planet(s),
  })
);

const Ship = schema((s) =>
  s.struct({
    type: s.literal("ship"),
    location: Vector(s),
    mass: s.number(),
    name: s.string(),
    crew: s.array(CrewMember(s)),
  })
);

const SpaceObject = schema((s) =>
  pipe(Asteroid(s), s.union(Planet(s)), s.union(Ship(s)))
);

const decoder = SpaceObject(SchemableDecoder);
const arbitrary = SpaceObject(SchemableArbitrary);
const json_schema = print(SpaceObject(SchemableJsonBuilder));

const rands = sample(arbitrary, 10);
const checks = rands.map(decoder);

console.log({ json_schema, rands, checks });

const intersect = schema((s) =>
  pipe(
    s.struct({ one: s.number() }),
    s.intersect(s.partial({ two: s.string() })),
  )
);

const iarbitrary = intersect(SchemableArbitrary);
console.log("Intersect", sample(iarbitrary, 20));
