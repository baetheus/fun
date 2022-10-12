export function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export function resolve<A>(a: A | PromiseLike<A>): Promise<A> {
  return Promise.resolve(a);
}

export function reject(
  rejection: unknown,
): Promise<never> {
  return Promise.reject(rejection);
}

export function then<A, I>(
  fai: (a: A) => I | Promise<I>,
): (ua: Promise<A>) => Promise<I> {
  return (ua) => ua.then(fai);
}

export function catchError<A>(
  fua: (u: unknown) => A,
): (ta: Promise<A>) => Promise<A> {
  return (ta) => ta.catch(fua);
}
