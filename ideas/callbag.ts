export type Talkback = (count: number) => void;

export type Talk<A> = {
  readonly event: (value: A) => void;
  readonly end: (reason?: unknown) => void;
};

export type Sink<A> = (talkback: Talkback) => Talk<A>;

export type Stream<A, E = unknown> = (sink: Sink<A>, env: E) => Disposable;

export type Timeout = {
  readonly setTimeout: typeof setTimeout;
  readonly clearTimeout: typeof clearTimeout;
};

export type Interval = {
  readonly setInterval: typeof setInterval;
  readonly clearInterval: typeof clearInterval;
};

export type TypeOf<S> = S extends Stream<infer A, infer _> ? A : never;

export type EnvOf<S> = S extends Stream<infer _, infer E> ? E : never;

export const Disposed = Symbol("fun/stream/disposed");

export function disposable(dispose: (reason?: unknown) => void): Disposable {
  return { [Symbol.dispose]: dispose };
}

/**
 * @todo: Consider how "safe" a sink needs to work.
 */
export function sink<A>(snk: Sink<A>): Sink<A> {
  return snk;
  // return function safeSink(tlkbk) {
  //   let open = true;
  //   const talk = snk(tlkbk);
  //   return {
  //     event: (value) => {
  //       if (open) {
  //         return talk.event(value);
  //       }
  //       throw new Error("Talk event called after close.");
  //     },
  //     end: (reason) => {
  //       if (open) {
  //         open = false;
  //         return talk.end(reason);
  //       }
  //       throw new Error("Talk end called after close.");
  //     },
  //   };
  // };
}

export function stream<A, R = unknown>(strm: Stream<A, R>): Stream<A, R> {
  return strm;
}

export function dispose(disposable: Disposable): void {
  disposable[Symbol.dispose]();
}

function NOOP(): void {}

export function empty<A = never, E = unknown>(): Stream<A, E> {
  return (snk) => {
    let open = true;
    const close = () => open = false;
    const talk = snk(NOOP);
    if (open) {
      queueMicrotask(talk.end);
    }
    return disposable(close);
  };
}

export function never<A = never, E = unknown>(): Stream<A, E> {
  return (snk) => {
    snk(NOOP);
    return disposable(NOOP);
  };
}

export function fromIterable<A>(iterable: Iterable<A>): Stream<A> {
  return function streamFromIterable(snk) {
    let open = true;
    let pulling = false;
    let readyCount = 0;
    const close = () => open = false;

    const talk = snk((count) => {
      readyCount += count;
      pull();
    });

    function pull() {
      if (open && !pulling) {
        pulling = true;
        if (readyCount > 0) {
          for (const value of iterable) {
            if (!open) {
              break;
            }
            readyCount--;
            talk.event(value);
          }
        }
        if (readyCount > 0 && open) {
          close();
          talk.end();
        }
        pulling = false;
      }
    }

    return disposable(close);
  };
}

export function fromPromise<A, E = unknown>(p: Promise<A>): Stream<A, E> {
  return (snk) => {
    let open = true;
    const close = () => open = false;
    const talk = snk(() =>
      p.then((value) => {
        if (open) {
          close();
          talk.event(value);
          talk.end();
        }
      })
    );
    return disposable(close);
  };
}

export function at(milliseconds: number): Stream<number, Timeout> {
  return (snk, env) => {
    let open = true;
    let readyCount = 0;

    const close = () => open = false;
    const { setTimeout, clearTimeout } = env;
    const talk = snk((count) => {
      readyCount += count;
    });

    const handle = setTimeout(
      (talk) => {
        if (open) {
          if (readyCount > 0) {
            talk.event(milliseconds);
          }
          close();
          talk.end();
        }
      },
      milliseconds,
      talk,
    );

    return disposable(() => {
      clearTimeout(handle);
      close();
    });
  };
}

export function periodic(period: number): Stream<number, Interval> {
  return (snk, env) => {
    let open = true;
    const close = () => open = false;

    let readyCount = 0;
    const start = performance.now();
    const { setInterval, clearInterval } = env;

    const talk = snk((count) => {
      readyCount += count;
    });

    const handle = setInterval(
      (talk) => {
        if (open && readyCount > 0) {
          readyCount--;
          talk.event(performance.now() - start);
        }
      },
      period,
      talk,
    );

    return disposable(() => {
      close();
      clearInterval(handle);
    });
  };
}

export function range(count: number, start = 0, step = 1): Stream<number> {
  return (snk) => {
    let open = true;
    let index = Math.floor(Math.max(0, count));
    let value = start;
    let readyCount = 0;
    let pulling = false;

    const close = () => open = false;
    const talk = snk((count) => {
      readyCount += count;
      pull();
    });

    function pull() {
      if (open && !pulling) {
        pulling = true;

        // Empty range while open and readyCount not empty
        while (open && readyCount > 0 && index > 0) {
          talk.event(value);
          value += step;
          readyCount--;
          index--;
        }

        // Reached end of range without closing, close and end
        if (open && readyCount > 0) {
          close();
          talk.end();
        }
        pulling = false;
      }
    }

    return disposable(close);
  };
}

export function loop<A, B, S>(
  stepper: (state: S, value: A) => [S, B],
  seed: S,
): <E>(ua: Stream<A, E>) => Stream<B, E> {
  return (ua) => (snk, env) => {
    let state = seed;
    return ua((tlkbk) => {
      const talk = snk(tlkbk);
      return {
        event: (a) => {
          const [next, b] = stepper(state, a);
          state = next;
          talk.event(b);
        },
        end: talk.end,
      };
    }, env);
  };
}

export function wrap<A>(value: A): Stream<A> {
  return (snk) => {
    let open = true;
    const close = () => open = false;
    const talk = snk((count) => {
      if (open && count > 0) {
        close();
        talk.event(value);
      }
    });
    return disposable(close);
  };
}

export function map<A, I>(
  fai: (a: A) => I,
): <E>(ua: Stream<A, E>) => Stream<I, E> {
  return loop((_, a) => [_, fai(a)], null);
}

abstract class TransformTalk<A, B> implements Talk<A> {
  constructor(protected readonly talk: Talk<B>) {}

  abstract event(a: A): void;

  end(): void {
    this.talk.end();
  }
}

class ScanTalk<A, B> extends TransformTalk<A, B> {
  constructor(
    public readonly f: (b: B, a: A) => B,
    private b: B,
    talk: Talk<B>,
  ) {
    super(talk);
  }

  event(a: A) {
    this.b = this.f(this.b, a);
    this.talk.event(this.b);
  }
}

export function scan<A, O>(
  folder: (accumulator: O, value: A) => O,
  initial: O,
): <E>(ua: Stream<A, E>) => Stream<O, E> {
  return (ua) => (snk, env) =>
    ua((tlk) => new ScanTalk(folder, initial, snk(tlk)), env);
}

export function join(
  concurrency = Number.POSITIVE_INFINITY,
): <A, R1, R2>(
  ua: Stream<Stream<A, R1>, R2>,
) => Stream<A, R1 & R2> {
  return <A, R1, R2>(ua: Stream<Stream<A, R1>, R2>): Stream<A, R1 & R2> =>
  (snk: Sink<A>, env: R1 & R2): Disposable => {
    console.log("innerStream start", { concurrency, ua, snk, env });
    let readyCount = 0;
    let outerOpen = true;
    let index = 0;
    const close = () => outerOpen = false;
    const running = new Map<number, [Talkback, Disposable]>();

    /**
     * When we receive a request for more data we broadcast to every running
     * with the new count. As we receive events we broadcast negative numbers to
     * each inner stream so we never send too many events down the pipe.
     *
     * This is naive and favors the first stream returned by the map forEach. A
     * smarter version might keep track of each inner stream count locally.
     */
    const talk = snk((count) => {
      readyCount += count;
      running.forEach(([tb]) => {
        tb(count);
      });
      console.log("outerTalkback", { count, readyCount, running });
    });

    function createInnerStream(strm: Stream<A, R1>): void {
      let tb: Talkback;
      const streamId = index++;
      const dsp = strm((innerTalkback) => {
        tb = innerTalkback;
        return {
          event: (value) => {
            console.log("innerStream event", { streamId, value });
            if (outerOpen) {
              readyCount--;
              talk.event(value);
              running.forEach(([tb], id) => {
                if (id !== streamId) {
                  tb(-1);
                }
              });
            }
          },
          end: () => {
            running.delete(streamId);
            if (outerOpen && running.size < concurrency) {
              talkback(1);
            }
          },
        };
      }, env);

      queueMicrotask(() => {
        running.set(streamId, [tb, dsp]);
        tb(readyCount);
      });
    }

    let talkback: Talkback;

    const dsp = ua((outerTalkback) => {
      console.log("outerStream start", { outerTalkback, running, readyCount });
      talkback = outerTalkback;

      return {
        event: createInnerStream,
        end: () => {
          console.log("innerStream end", { running });
          close();
          running.forEach(([_, dsp]) => dispose(dsp));
          running.clear();
        },
      };
    }, env);

    queueMicrotask(() => talkback(concurrency));

    return disposable(() => {
      console.log("outerStream dispose");
      if (outerOpen) {
        close();
        dispose(dsp);
      }
    });
  };
}

export function run<E>(env: E): <A>(ua: Stream<A, E>) => Disposable {
  return (ua) =>
    ua((tlkbk) => {
      queueMicrotask(() => tlkbk(Number.POSITIVE_INFINITY));
      return {
        event: NOOP,
        end: NOOP,
      };
    }, env);
}

export function runPromise<E>(
  env: E,
): <A>(stream: Stream<A, E>) => Promise<void> {
  return <A>(ua: Stream<A, E>): Promise<void> =>
    new Promise<void>((resolve) => {
      ua((tlk) => {
        queueMicrotask(() => tlk(Number.POSITIVE_INFINITY));
        return { event: NOOP, end: () => resolve() };
      }, env);
    });
}

export function collect<E>(
  env: E,
  signal?: AbortSignal,
): <A>(ua: Stream<A, E>) => Promise<ReadonlyArray<A>> {
  return <A>(ua: Stream<A, E>): Promise<ReadonlyArray<A>> => {
    let open = true;
    const close = () => open = false;
    const values: Array<A> = [];

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(signal.reason);
      }

      let talkback: Talkback;

      const dsp = ua((tlkbk) => {
        talkback = tlkbk;
        return {
          event: (value) => {
            if (open) {
              values.push(value);
            }
          },
          end: () => {
            if (open) {
              close();
              resolve(values);
            }
          },
        };
      }, env);

      signal?.addEventListener("abort", () => {
        if (open) {
          close();
          dispose(dsp);
          reject(signal.reason);
        }
      });

      queueMicrotask(() => {
        if (open) {
          talkback(Number.POSITIVE_INFINITY);
        }
      });
    });
  };
}

export function forEach<A, E>(
  env: E,
  onEvent: (value: A) => void,
  onEnd: (reason?: unknown) => void,
): (ua: Stream<A, E>) => void {
  return (ua) =>
    ua((tlk) => {
      queueMicrotask(() => tlk(Number.POSITIVE_INFINITY));
      return { event: onEvent, end: onEnd };
    }, env);
}

export function take(count: number): <A, R>(ua: Stream<A, R>) => Stream<A, R> {
  return (ua) => (snk, env) => {
    return ua((outerTalkback) => {
      let remaining = count;
      let readyCount = 0;
      let open = true;
      const close = () => open = false;
      const talk = snk((outerCount) => {
        const maxAdditional = Math.min(outerCount, count - readyCount);
        readyCount += maxAdditional;
        outerTalkback(maxAdditional);
      });
      return {
        event: (value) => {
          if (open) {
            remaining--;
            talk.event(value);
            if (remaining <= 0) {
              close();
              talk.end();
            }
          }
        },
        end: (reason) => {
          if (open) {
            close();
            talk.end(reason);
          }
        },
      };
    }, env);
  };
}

// import { pipe } from "../fn.ts";

// pipe(
//   fromIterable([range(10), range(10, 100)]),
//   join(),
//   take(5),
//   forEach({}, console.log, NOOP),
// );
