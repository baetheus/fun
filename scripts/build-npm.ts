import * as DNT from "https://deno.land/x/dnt@0.38.1/mod.ts";
import { parse } from "https://deno.land/x/semver@v1.4.0/mod.ts";
import * as AE from "../async_either.ts";
import * as D from "../decoder.ts";
import * as E from "../either.ts";
import * as I from "../iterable.ts";
import * as O from "../option.ts";
import * as S from "../string.ts";
import { flow, pipe } from "../fn.ts";

// Environment
const semver = pipe(
  D.string,
  D.compose((i) => {
    const semVer = parse(i);
    return semVer === null
      ? D.failure(i, "Semantic Version")
      : D.success(semVer);
  }),
);

const Env = D.struct({
  VERSION: semver,
});

type Env = D.TypeOut<typeof Env>;

/**
 * Consts
 */

const BUILD_DIR = "./build";
const ENTRYPOINTS = pipe(
  Deno.readDirSync("./"),
  I.map(({ name }) => name),
  I.filterMap(O.fromPredicate(S.endsWith(".ts"))),
  I.collect,
) as string[];

// Errors
type BuildError = { message: string; context: Record<string, unknown> };

const buildError = (
  message: string,
  context: Record<string, unknown> = {},
): BuildError => ({ message, context });

const printBuildError = ({ message, context }: BuildError) => {
  let msg = `BUILD ERROR: ${message}\n`;
  msg += Object
    .entries(context)
    .map(([key, value]) => {
      const val = typeof value === "string"
        ? value
        : value instanceof Error
        ? value
        : typeof value === "object" && value !== null &&
            Object.hasOwn(value, "toString") &&
            typeof value.toString === "function"
        ? value.toString()
        : JSON.stringify(value, null, 2);
      return `Context - ${key}\n${val}`;
    })
    .join("\n");
  return msg;
};

// Functions
const createBuildOptions = (
  { VERSION }: Env,
): DNT.BuildOptions => ({
  entryPoints: ENTRYPOINTS,
  outDir: BUILD_DIR,
  typeCheck: false,
  test: true,
  shims: {
    deno: true,
  },
  package: {
    name: "@nll/fun",
    version: VERSION.toString(),
    description: "A utility library for functional programming in TypeScript",
    keywords: ["functional programming", "typescript", "fp"],
    license: "MIT",
    bugs: {
      url: "https://github.com/baetheus/fun/issues",
      email: "brandon@null.pub",
    },
    author: {
      "name": "Brandon Blaylock",
      "email": "brandon@null.pub",
      "url": "blaylock.dev",
    },
    repository: "github:baetheus/fun",
  },
  postBuild() {
    Deno.copyFileSync("LICENSE", `${BUILD_DIR}/LICENSE`);
    Deno.copyFileSync("README.md", `${BUILD_DIR}/README.md`);
  },
});

const getEnv = AE.tryCatch(
  Deno.env.toObject,
  (err, args) => buildError("Unable to get environment.", { err, args }),
)();

const parseEnv = flow(
  Env,
  E.mapSecond((err) =>
    buildError("Unable to parse environment.", { err: D.draw(err) })
  ),
  AE.fromEither,
);

const emptyDir = AE.tryCatch(
  DNT.emptyDir,
  (err, args) => buildError("Unable to empty build directory.", { err, args }),
);

const build = AE.tryCatch(
  DNT.build,
  (err, args) => buildError("Unable to build node package.", { err, args }),
);

const printComplete = (env: Env) =>
  `BUILD COMPLETE
${JSON.stringify(env, null, 2)}`;

export const run = pipe(
  getEnv,
  AE.flatmap(parseEnv),
  AE.flatmapFirst(() => emptyDir(BUILD_DIR)),
  AE.flatmapFirst((env) => build(createBuildOptions(env))),
  AE.match(
    flow(printBuildError, console.error),
    flow(printComplete, console.log),
  ),
);

await run();
