import { assertEquals } from "https://deno.land/std@0.103.0/testing/asserts.ts";

import * as FC from "npm:fast-check@3.14.0";
import * as F from "../../contrib/fast-check.ts";
import * as R from "../../refinement.ts";
import { schema } from "../../schemable.ts";
import { pipe } from "../../fn.ts";

Deno.test("Fast Check Schemable", () => {
  const Vector = schema((s) => s.tuple(s.number(), s.number(), s.number()));

  const Asteroid = schema((s) =>
    s.struct({
      type: s.literal("asteroid"),
      location: Vector(s),
      mass: s.number(),
      tags: s.record(s.boolean()),
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
    pipe(
      s.struct({
        name: s.string(),
        age: s.number(),
        rank: Rank(s),
        home: Planet(s),
      }),
      s.intersect(s.partial({
        tags: s.record(s.string()),
      })),
    )
  );

  const Ship = schema((s) =>
    s.struct({
      type: s.literal("ship"),
      location: Vector(s),
      mass: s.number(),
      name: s.string(),
      crew: s.array(CrewMember(s)),
      lazy: s.lazy("lazy", () => s.string()),
    })
  );

  const SpaceObject = schema((s) =>
    pipe(Asteroid(s), s.union(Planet(s)), s.union(Ship(s)))
  );

  const refinement = SpaceObject(R.SchemableRefinement);
  const arbitrary = SpaceObject(F.getSchemableArbitrary(FC));
  const rands = FC.sample(arbitrary, 10);

  for (const rand of rands) {
    assertEquals(refinement(rand), true);
  }
});
