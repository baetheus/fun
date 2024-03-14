import type { DatumEither } from "../datum_either.ts";
import type { Lens } from "../optic.ts";

import * as D from "../datum.ts";
import * as DE from "../datum_either.ts";
import * as O from "../optic.ts";

import { pipe } from "../fn.ts";

// =======
// Actions
// ======

/**
 * The bare minimum interface for actions in the dux system.
 * If your existing store doesn't have actions with a type parameter
 * that you can switch on then dux won't work (at least with typescript).
 *
 * @since 2.1.0
 */
export type ActionType = {
  readonly type: string;
};

/**
 * Interface for FSA Action.
 *
 * @since 2.1.0
 */
export interface Action<P> extends ActionType {
  readonly value: P;
  readonly error: boolean;
}

/**
 * Interface for action matcher property
 *
 * @since 2.1.0
 */
export type ActionMatcher<P> = {
  readonly match: (action: ActionType) => action is Action<P>;
};

/**
 * Interface for action creator function
 *
 * @since 2.1.0
 */
export type ActionFunction<P> = (payload: P) => Action<P>;

/**
 * Interface for action creator intersection
 *
 * @since 2.1.0
 */
export type ActionCreator<P> =
  & ActionFunction<P>
  & ActionMatcher<P>
  & ActionType;

/**
 * Extract an Action type from an ActionCreator
 *
 * @since 8.0.0
 */
export type ExtractAction<T> = T extends ActionCreator<infer P>[] ? Action<P>
  : never;

/**
 * Interface for "Success" Action payload.
 *
 * @since 2.1.0
 */
export interface Success<P, R> {
  readonly params: P;
  readonly result: R;
}

/**
 * Interface for "Failure" Action payload.
 *
 * @since 2.1.0
 */
export interface Failure<P, E> {
  readonly params: P;
  readonly error: E;
}
/**
 * Interface for async action creator
 *
 * @since 2.1.0
 */
export interface AsyncActionCreators<
  P,
  R = unknown,
  E = unknown,
> {
  readonly pending: ActionCreator<P>;
  readonly success: ActionCreator<Success<P, R>>;
  readonly failure: ActionCreator<Failure<P, E>>;
}

/**
 * Interface for the action creator bundle.
 *
 * @since 2.1.0
 */
export type ActionCreatorBundle<G extends string> = {
  simple: <P>(type: string) => ActionCreator<P>;
  async: <P, R = unknown, E = unknown>(
    type: string,
  ) => AsyncActionCreators<P, R, E>;
  group: G;
};

/**
 * @since 2.1.0
 */
export function collapseType(...types: string[]): string {
  return types.length > 0 ? types.join("/") : "UNKNOWN_TYPE";
}

function matcherFactory<P>(type: string): ActionMatcher<P> {
  return {
    match: (action: ActionType): action is Action<P> => action.type === type,
  };
}

function tagFactory(...tags: string[]): ActionType {
  return { type: collapseType(...tags) };
}

/**
 * The simplest way to create an action.
 * Generally, for all but the simplest of applications, using
 * actionCreatorsFactory is a better move.
 *
 * @since 7.0.0
 */
export function actionFactory<P>(type: string): ActionFunction<P> {
  return ((value: P) => ({ type, value })) as ActionFunction<P>;
}

/**
 * General action creator factory
 *
 * @since 2.1.0
 */
function actionCreator<P>(
  tag: string,
): ActionCreator<P> {
  return Object.assign(
    actionFactory<P>(tag),
    matcherFactory<P>(tag),
    tagFactory(tag),
  );
}

/**
 * Async action creator factory
 *
 * @since 2.1.0
 */
function asyncActionsCreator<P, R, E>(
  group: string,
): AsyncActionCreators<P, R, E> {
  return {
    pending: actionCreator<P>(collapseType(group, "PENDING")),
    failure: actionCreator<Failure<P, E>>(collapseType(group, "FAILURE")),
    success: actionCreator<Success<P, R>>(collapseType(group, "SUCCESS")),
  };
}

/**
 * General action group creator (wraps other action creators into a group)
 *
 * @since 2.1.0
 */
export function actionCreatorFactory<G extends string>(
  group: G,
): ActionCreatorBundle<G> {
  return {
    group,
    simple: <P>(type: string) => actionCreator<P>(collapseType(group, type)),
    async: <P, R, E>(type: string) =>
      asyncActionsCreator<P, R, E>(collapseType(group, type)),
  };
}

// ========
// Reducers
// ========

/**
 * Reducer Interface
 *
 * @since 2.1.0
 */
export type Reducer<S, A extends ActionType = ActionType> = (s: S, a: A) => S;

/**
 * Case function matches ActionCreator to Reducer.
 *
 * @since 2.1.0
 */
export function caseFn<S, P>(
  action: ActionCreator<P>,
  reducer: Reducer<S, Action<P>>,
): Reducer<S, ActionType> {
  return (s, a) => (action.match(a) ? reducer(s, a) : s);
}

/**
 * Case function matches multiple ActionCreators to a Reducer.
 *
 * @since 2.1.0
 */
export function casesFn<S, A extends ActionCreator<unknown>[]>(
  actionCreators: A,
  reducer: Reducer<S, ExtractAction<A>>,
): Reducer<S, ActionType> {
  return (s, a) =>
    actionCreators.some(({ match }) => match(a))
      ? reducer(s, <ExtractAction<A>> a)
      : s;
}

/**
 * Compose caseFn and casesFn.
 *
 * @since 2.1.0
 */
export function reducerFn<S>(
  ...cases: Array<Reducer<S, ActionType>>
): Reducer<S, ActionType> {
  return (state, action) => cases.reduce((s, r) => r(s, action), state);
}

/**
 * Compose caseFn and casesFn with initial state.
 *
 * @since 2.1.0
 */
export function reducerDefaultFn<S>(
  initialState: S,
  ...cases: Array<Reducer<S, ActionType>>
): Reducer<S | undefined, ActionType> {
  return (state = initialState, action) =>
    cases.reduce((s, r) => r(s, action), state);
}

/**
 * Generate a reducer that wraps a single DatumEither store value
 *
 * @since 2.1.0
 */
export function asyncReducerFactory<P, R, E, S>(
  action: AsyncActionCreators<P, R, E>,
  lens: Lens<S, DatumEither<E, R>>,
): Reducer<S, ActionType> {
  return reducerFn(
    caseFn(action.pending, pipe(lens, O.modify(D.toLoading))),
    caseFn(
      action.success,
      (s, a) => pipe(lens, O.replace(DE.success(a.value.result)))(s),
    ),
    caseFn(
      action.failure,
      (s, a) => pipe(lens, O.replace(DE.failure(a.value.error)))(s),
    ),
  );
}

/**
 * Filters actions by first section of action type to bypass sections of the store
 *
 * @since 7.1.0
 */
export const filterReducer = <S>(
  match: string,
  reducer: Reducer<S, ActionType>,
): Reducer<S, ActionType> =>
(state, action) =>
  action.type.startsWith(match) ? reducer(state, action) : state;
