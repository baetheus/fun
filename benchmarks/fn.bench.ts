// deno-lint-ignore no-explicit-any
import * as A from "https://deno.land/x/fun/array.ts";

type AnyFn = (d: any) => any;

const COUNT = 1_000_000;
const add = (n: number) => n * n;

function flow(...fns: AnyFn[]): AnyFn;
function flow(
  ab: AnyFn,
  bc: AnyFn,
  cd: AnyFn,
  de: AnyFn,
  ef: AnyFn,
  fg: AnyFn,
  gh: AnyFn,
  hi: AnyFn,
  ij: AnyFn,
  jk: AnyFn,
  kl: AnyFn,
  ...rest: AnyFn[]
): AnyFn {
  switch (arguments.length) {
    case 1:
      return (...as) => ab(...as);
    case 2:
      return (...as) => bc(ab(...as));
    case 3:
      return (...as) => cd(bc(ab(...as)));
    case 4:
      return (...as) => de(cd(bc(ab(...as))));
    case 5:
      return (...as) => ef(de(cd(bc(ab(...as)))));
    case 6:
      return (...as) => fg(ef(de(cd(bc(ab(...as))))));
    case 7:
      return (...as) => gh(fg(ef(de(cd(bc(ab(...as)))))));
    case 8:
      return (...as) => hi(gh(fg(ef(de(cd(bc(ab(...as))))))));
    case 9:
      return (...as) => ij(hi(gh(fg(ef(de(cd(bc(ab(...as)))))))));
    case 10:
      return (...as) => jk(ij(hi(gh(fg(ef(de(cd(bc(ab(...as))))))))));
    case 11:
      return (...as) => kl(jk(ij(hi(gh(fg(ef(de(cd(bc(ab(...as)))))))))));
    default:
      return (...as) =>
        rest.reduce(
          (val, fn) => fn(val),
          kl(jk(ij(hi(gh(fg(ef(de(cd(bc(ab(...as))))))))))),
        );
  }
}

function pipe(a: unknown, ...fns: AnyFn[]): unknown;
function pipe(
  a: unknown,
  ab: AnyFn,
  bc: AnyFn,
  cd: AnyFn,
  de: AnyFn,
  ef: AnyFn,
  fg: AnyFn,
  gh: AnyFn,
  hi: AnyFn,
  ij: AnyFn,
  jk: AnyFn,
  kl: AnyFn,
  ...rest: AnyFn[]
): unknown {
  switch (arguments.length) {
    case 0:
      return undefined;
    case 1:
      return a;
    case 2:
      return ab(a);
    case 3:
      return bc(ab(a));
    case 4:
      return cd(bc(ab(a)));
    case 5:
      return de(cd(bc(ab(a))));
    case 6:
      return ef(de(cd(bc(ab(a)))));
    case 7:
      return fg(ef(de(cd(bc(ab(a))))));
    case 8:
      return gh(fg(ef(de(cd(bc(ab(a)))))));
    case 9:
      return hi(gh(fg(ef(de(cd(bc(ab(a))))))));
    case 10:
      return ij(hi(gh(fg(ef(de(cd(bc(ab(a)))))))));
    case 11:
      return jk(ij(hi(gh(fg(ef(de(cd(bc(ab(a))))))))));
    case 12:
      return kl(jk(ij(hi(gh(fg(ef(de(cd(bc(ab(a)))))))))));
    default:
      return rest.reduce(
        (val, fn) => fn(val),
        kl(jk(ij(hi(gh(fg(ef(de(cd(bc(ab(a))))))))))),
      );
  }
}

const flowConst = (...[fn, ...fns]: [AnyFn, ...AnyFn[]]): AnyFn => (...args) =>
  fns.reduce((a, f) => f(a), fn(...args));

function flowFn(...[fn, ...fns]: [AnyFn, ...AnyFn[]]): AnyFn {
  return (...args) => fns.reduce((a, f) => f(a), fn(...args));
}

const pipeConst = (value: unknown, ...fns: AnyFn[]): unknown =>
  fns.reduce((val, fn) => fn(val), value);

function pipeFn(value: unknown, ...fns: AnyFn[]): unknown {
  return fns.reduce((val, fn) => fn(val), value);
}

const pipeFlowConst = (value: unknown, ...fns: AnyFn[]): unknown =>
  flow(...fns as Parameters<typeof flow>)(value);

function pipeFlowFn(value: unknown, ...fns: AnyFn[]): unknown {
  return flow(...fns as Parameters<typeof flow>)(value);
}

const pipeFlowConstConst = (value: unknown, ...fns: AnyFn[]): unknown =>
  flowConst(...fns as Parameters<typeof flowConst>)(value);

function pipeFlowConstFn(value: unknown, ...fns: AnyFn[]): unknown {
  return flowConst(...fns as Parameters<typeof flowConst>)(value);
}

const up = (n: number) => n * n;
const down = (n: number) => n / n;

const cachedFlow = flow(
  A.map(up),
  A.map(down),
  A.map(up),
  A.map(down),
  A.map(up),
  A.map(down),
  A.map(up),
  A.map(down),
  A.map(up),
  A.map(down),
);

Deno.bench("flowOptimized", { group: "flow" }, () => {
  flow(add)(3);
  flow(add, add)(3);
  flow(add, add, add)(3);
  flow(add, add, add, add)(3);
  flow(add, add, add, add, add)(3);
  flow(add, add, add, add, add, add)(3);
  flow(add, add, add, add, add, add, add)(3);
  flow(add, add, add, add, add, add, add, add)(3);
  flow(add, add, add, add, add, add, add, add, add)(3);
  flow(add, add, add, add, add, add, add, add, add, add)(3);
  flow(add, add, add, add, add, add, add, add, add, add, add)(3);
});

Deno.bench("flowReduceConst", { group: "flow" }, () => {
  flowConst(add)(3);
  flowConst(add, add)(3);
  flowConst(add, add, add)(3);
  flowConst(add, add, add, add)(3);
  flowConst(add, add, add, add, add)(3);
  flowConst(add, add, add, add, add, add)(3);
  flowConst(add, add, add, add, add, add, add)(3);
  flowConst(add, add, add, add, add, add, add, add)(3);
  flowConst(add, add, add, add, add, add, add, add, add)(3);
  flowConst(add, add, add, add, add, add, add, add, add, add)(3);
  flowConst(add, add, add, add, add, add, add, add, add, add, add)(3);
});

Deno.bench("flowReduceFunction", { group: "flow" }, () => {
  flowFn(add)(3);
  flowFn(add, add)(3);
  flowFn(add, add, add)(3);
  flowFn(add, add, add, add)(3);
  flowFn(add, add, add, add, add)(3);
  flowFn(add, add, add, add, add, add)(3);
  flowFn(add, add, add, add, add, add, add)(3);
  flowFn(add, add, add, add, add, add, add, add)(3);
  flowFn(add, add, add, add, add, add, add, add, add)(3);
  flowFn(add, add, add, add, add, add, add, add, add, add)(3);
  flowFn(add, add, add, add, add, add, add, add, add, add, add)(3);
});

Deno.bench("pipeOptimized", { group: "pipe" }, () => {
  pipe(3, add);
  pipe(3, add, add);
  pipe(3, add, add, add);
  pipe(3, add, add, add, add);
  pipe(3, add, add, add, add, add);
  pipe(3, add, add, add, add, add, add);
  pipe(3, add, add, add, add, add, add, add);
  pipe(3, add, add, add, add, add, add, add, add);
  pipe(3, add, add, add, add, add, add, add, add, add);
  pipe(3, add, add, add, add, add, add, add, add, add, add);
  pipe(3, add, add, add, add, add, add, add, add, add, add, add);
});

Deno.bench("pipeReduceConst", { group: "pipe" }, () => {
  pipeConst(3, add);
  pipeConst(3, add, add);
  pipeConst(3, add, add, add);
  pipeConst(3, add, add, add, add);
  pipeConst(3, add, add, add, add, add);
  pipeConst(3, add, add, add, add, add, add);
  pipeConst(3, add, add, add, add, add, add, add);
  pipeConst(3, add, add, add, add, add, add, add, add);
  pipeConst(3, add, add, add, add, add, add, add, add, add);
  pipeConst(3, add, add, add, add, add, add, add, add, add, add);
  pipeConst(3, add, add, add, add, add, add, add, add, add, add, add);
});

Deno.bench("pipeReduceFunction", { group: "pipe" }, () => {
  pipeFn(3, add);
  pipeFn(3, add, add);
  pipeFn(3, add, add, add);
  pipeFn(3, add, add, add, add);
  pipeFn(3, add, add, add, add, add);
  pipeFn(3, add, add, add, add, add, add);
  pipeFn(3, add, add, add, add, add, add, add);
  pipeFn(3, add, add, add, add, add, add, add, add);
  pipeFn(3, add, add, add, add, add, add, add, add, add);
  pipeFn(3, add, add, add, add, add, add, add, add, add, add);
  pipeFn(3, add, add, add, add, add, add, add, add, add, add, add);
});

Deno.bench("pipeFlowConst", { group: "pipe" }, () => {
  pipeFlowConst(3, add);
  pipeFlowConst(3, add, add);
  pipeFlowConst(3, add, add, add);
  pipeFlowConst(3, add, add, add, add);
  pipeFlowConst(3, add, add, add, add, add);
  pipeFlowConst(3, add, add, add, add, add, add);
  pipeFlowConst(3, add, add, add, add, add, add, add);
  pipeFlowConst(3, add, add, add, add, add, add, add, add);
  pipeFlowConst(3, add, add, add, add, add, add, add, add, add);
  pipeFlowConst(3, add, add, add, add, add, add, add, add, add, add);
  pipeFlowConst(3, add, add, add, add, add, add, add, add, add, add, add);
});

Deno.bench("pipeFlowFunction", { group: "pipe" }, () => {
  pipeFlowFn(3, add);
  pipeFlowFn(3, add, add);
  pipeFlowFn(3, add, add, add);
  pipeFlowFn(3, add, add, add, add);
  pipeFlowFn(3, add, add, add, add, add);
  pipeFlowFn(3, add, add, add, add, add, add);
  pipeFlowFn(3, add, add, add, add, add, add, add);
  pipeFlowFn(3, add, add, add, add, add, add, add, add);
  pipeFlowFn(3, add, add, add, add, add, add, add, add, add);
  pipeFlowFn(3, add, add, add, add, add, add, add, add, add, add);
  pipeFlowFn(3, add, add, add, add, add, add, add, add, add, add, add);
});

Deno.bench("pipeFlowConstConst", { group: "pipe" }, () => {
  pipeFlowConstConst(3, add);
  pipeFlowConstConst(3, add, add);
  pipeFlowConstConst(3, add, add, add);
  pipeFlowConstConst(3, add, add, add, add);
  pipeFlowConstConst(3, add, add, add, add, add);
  pipeFlowConstConst(3, add, add, add, add, add, add);
  pipeFlowConstConst(3, add, add, add, add, add, add, add);
  pipeFlowConstConst(3, add, add, add, add, add, add, add, add);
  pipeFlowConstConst(3, add, add, add, add, add, add, add, add, add);
  pipeFlowConstConst(3, add, add, add, add, add, add, add, add, add, add);
  pipeFlowConstConst(3, add, add, add, add, add, add, add, add, add, add, add);
});

Deno.bench("pipeFlowConstFunction", { group: "pipe" }, () => {
  pipeFlowConstFn(3, add);
  pipeFlowConstFn(3, add, add);
  pipeFlowConstFn(3, add, add, add);
  pipeFlowConstFn(3, add, add, add, add);
  pipeFlowConstFn(3, add, add, add, add, add);
  pipeFlowConstFn(3, add, add, add, add, add, add);
  pipeFlowConstFn(3, add, add, add, add, add, add, add);
  pipeFlowConstFn(3, add, add, add, add, add, add, add, add);
  pipeFlowConstFn(3, add, add, add, add, add, add, add, add, add);
  pipeFlowConstFn(3, add, add, add, add, add, add, add, add, add, add);
  pipeFlowConstFn(3, add, add, add, add, add, add, add, add, add, add, add);
});

Deno.bench("flowOptimized", { group: "flow array" }, () => {
  flow(
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
  )(A.range(COUNT));
});

Deno.bench("flowReduceConst", { group: "flow array" }, () => {
  flowConst(
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
  )(A.range(COUNT));
});

Deno.bench("flowReduceFunction", { group: "flow array" }, () => {
  flowFn(
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
  )(A.range(COUNT));
});

Deno.bench("pipeOptimized", { group: "pipe array" }, () => {
  pipe(
    A.range(COUNT),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
  );
});

Deno.bench("pipeReduceConst", { group: "pipe array" }, () => {
  pipeConst(
    A.range(COUNT),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
  );
});

Deno.bench("pipeReduceFunction", { group: "pipe array" }, () => {
  pipeFn(
    A.range(COUNT),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
  );
});

Deno.bench("pipeFlowConst", { group: "pipe array" }, () => {
  pipeFlowConst(
    A.range(COUNT),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
  );
});

Deno.bench("pipeFlowFunction", { group: "pipe array" }, () => {
  pipeFlowFn(
    A.range(COUNT),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
  );
});

Deno.bench("pipeFlowConstConst", { group: "pipe array" }, () => {
  pipeFlowConstConst(
    A.range(COUNT),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
  );
});

Deno.bench("pipeFlowConstFunction", { group: "pipe array" }, () => {
  pipeFlowConstFn(
    A.range(COUNT),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
    A.map(up),
    A.map(down),
  );
});
