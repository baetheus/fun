/**
 * THe dux module is a mashup of ideas from redux, ngrx, flux, and flux standard
 * actions. It provides a standard set of utilities for creating actions,
 * reducers, and metareducers for use in any state management system as well as
 * asynchronous effects and a store based on the kind stream implementation.
 *
 * This idea is currently highly experimental. While conceptually the basic
 * concepts of actions, reducers, and effects are well defined, some
 * implementation details around collections and effects are still unstable. Use
 * at your own risk!
 *
 * @experimental
 * @since 2.2.0
 * @module dux
 */
import type { $, Kind } from "../kind.ts";
import type { Option } from "../option.ts";
import type { DatumEither } from "../datum_either.ts";
import type { Stream } from "../stream.ts";
import type { Lens } from "../optic.ts";
import type { KindReadonlyRecord } from "../record.ts";
import type { KindReadonlyArray } from "../array.ts";
import type { KindReadonlyMap } from "../map.ts";
import type { KindReadonlySet } from "../set.ts";

import * as D from "../datum.ts";
import * as DE from "../datum_either.ts";
import * as O from "../option.ts";
import * as S from "../stream.ts";
import * as L from "../optic.ts";
import { flow, pipe } from "../fn.ts";

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
 * Interface for action creator function. We could type the output action but
 * that causes specificity issues when branching to the creation of more than
 * one action.
 *
 * @since 2.1.0
 */
export type ActionFunction<P> = (payload: P) => ActionType;

/**
 * Interface for action creator intersection
 *
 * @since 2.1.0
 */
export type ActionFactory<P> =
  & ActionFunction<P>
  & ActionMatcher<P>
  & ActionType;

/**
 * Extract an Action type from an ActionFactory
 *
 * @since 2.1.0
 */
export type ExtractAction<T> = T extends ActionFactory<infer P>[] ? Action<P>
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
export interface AsyncActionFactorys<
  P,
  R = unknown,
  E = unknown,
> {
  readonly pending: ActionFactory<P>;
  readonly success: ActionFactory<Success<P, R>>;
  readonly failure: ActionFactory<Failure<P, E>>;
}

/**
 * Interface for the action creator bundle.
 *
 * @since 2.1.0
 */
export type ActionFactoryBundle<G extends string> = {
  simple: <P>(type: string) => ActionFactory<P>;
  async: <P, R = unknown, E = unknown>(
    type: string,
  ) => AsyncActionFactorys<P, R, E>;
  group: G;
};

/**
 * @since 2.1.0
 */
function collapseType(...types: string[]): string {
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
 */
function actionFunction<P>(type: string): ActionFunction<P> {
  return ((value: P) => ({ type, value })) as ActionFunction<P>;
}

/**
 * General action creator factory
 *
 * @since 2.1.0
 */
export function actionFactory<P>(
  tag: string,
): ActionFactory<P> {
  return Object.assign(
    actionFunction<P>(tag),
    matcherFactory<P>(tag),
    tagFactory(tag),
  );
}

/**
 * Async action creator factory
 *
 * @since 2.1.0
 */
function asyncActionFactory<P, R, E>(
  group: string,
): AsyncActionFactorys<P, R, E> {
  return {
    pending: actionFactory<P>(collapseType(group, "PENDING")),
    failure: actionFactory<Failure<P, E>>(collapseType(group, "FAILURE")),
    success: actionFactory<Success<P, R>>(collapseType(group, "SUCCESS")),
  };
}

/**
 * General action group creator (wraps other action creators into a group)
 *
 * @since 2.1.0
 */
export function actionGroup<G extends string>(
  group: G,
): ActionFactoryBundle<G> {
  return {
    group,
    simple: <P>(type: string) => actionFactory<P>(collapseType(group, type)),
    async: <P, R, E>(type: string) =>
      asyncActionFactory<P, R, E>(collapseType(group, type)),
  };
}

/**
 * Reducer Interface
 *
 * @since 2.1.0
 */
export type Reducer<S, A = ActionType> = (s: S, a: A) => S;

/**
 * Case function matches ActionFactory to Reducer.
 *
 * @since 2.1.0
 */
export function caseFn<S, P>(
  action: ActionFactory<P>,
  reducer: Reducer<S, P>,
): Reducer<S, ActionType> {
  return (s, a) => (action.match(a) ? reducer(s, a.value) : s);
}

/**
 * Case function matches multiple ActionFactorys to a Reducer.
 *
 * @since 2.1.0
 */
export function casesFn<S, A extends ActionFactory<unknown>[]>(
  actionCreators: A,
  reducer: Reducer<S, ExtractAction<A>["value"]>,
): Reducer<S, ActionType> {
  return (s, a) =>
    actionCreators.some(({ match }) => match(a))
      ? reducer(s, (<ExtractAction<A>> a).value)
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
  action: AsyncActionFactorys<P, R, E>,
  lens: Lens<S, DatumEither<E, R>>,
): Reducer<S, ActionType> {
  return reducerFn(
    caseFn(action.pending, lens.modify(D.toLoading)),
    caseFn(
      action.success,
      (s: S, { result }) => lens.modify(() => DE.success(result))(s),
    ),
    caseFn(
      action.failure,
      (s: S, { error }) => lens.modify(() => DE.failure(error))(s),
    ),
  );
}

export function asyncCollectionFactory<
  U extends Kind,
>(): <Payload, Ok, Err, S, B = never, C = never, D = unknown, E = unknown>(
  actionCreator: AsyncActionFactorys<Payload, Ok, Err>,
  toCollection: Lens<S, $<U, [DatumEither<Err, Ok>, B, C], [D], [E]>>,
  toItemLens: (
    p: Payload,
  ) => Lens<
    $<U, [DatumEither<Err, Ok>, B, C], [D], [E]>,
    Option<DatumEither<Err, Ok>>
  >,
) => Reducer<S, ActionType> {
  return ({ pending, success, failure }, toCollection, toItemLens) =>
    reducerFn(
      caseFn(
        pending,
        (s, p) =>
          pipe(toCollection, L.compose(toItemLens(p))).modify(flow(
            O.map(D.toLoading),
            O.alt(O.some(D.constPending())),
          ))(s),
      ),
      caseFn(
        success,
        (s, { params, result }) =>
          pipe(toCollection, L.compose(toItemLens(params))).modify(() =>
            O.some(DE.success(result))
          )(s),
      ),
      caseFn(
        failure,
        (s, { params, error }) =>
          pipe(toCollection, L.compose(toItemLens(params))).modify(() =>
            O.some(DE.failure(error))
          )(s),
      ),
    );
}

type CollectionFactory<U extends Kind> = <
  Payload,
  Ok,
  Err,
  S,
  B = never,
  C = never,
  D = unknown,
  E = unknown,
>(
  actionCreator: AsyncActionFactorys<Payload, Ok, Err>,
  toCollection: Lens<S, $<U, [DatumEither<Err, Ok>, B, C], [D], [E]>>,
  toItemLens: (
    p: Payload,
  ) => Lens<
    $<U, [DatumEither<Err, Ok>, B, C], [D], [E]>,
    Option<DatumEither<Err, Ok>>
  >,
) => Reducer<S, ActionType>;

export const asyncCollectionRecord: CollectionFactory<KindReadonlyRecord> =
  asyncCollectionFactory<
    KindReadonlyRecord
  >();

export const asyncCollectionArray: CollectionFactory<KindReadonlyArray> =
  asyncCollectionFactory<KindReadonlyArray>();

export const asyncCollectionMap: CollectionFactory<KindReadonlyMap> =
  asyncCollectionFactory<KindReadonlyMap>();

export const asyncCollectionSet: CollectionFactory<KindReadonlySet> =
  asyncCollectionFactory<KindReadonlySet>();

/**
 * Filters actions by first section of action type to bypass sections of the store
 *
 * @since 2.1.0
 */
export const filterReducer = <S>(
  match: string,
  reducer: Reducer<S, ActionType>,
): Reducer<S, ActionType> =>
(state, action) =>
  action.type.startsWith(match) ? reducer(state, action) : state;

export type MetaReducer<S, A extends ActionType = ActionType> = (
  reducer: Reducer<S, A>,
) => Reducer<S, A>;

export function metaReducerFn<S, A extends ActionType = ActionType>(
  metareducer: MetaReducer<S, A>,
): MetaReducer<S, A> {
  return metareducer;
}

/**
 * @since 2.1.2
 */
export type Effect<S = unknown, A = ActionType, R = unknown> = (
  actions: Stream<A>,
  states: Stream<S>,
) => Stream<ActionType, R>;

/**
 * @since 2.1.2
 */
export function caseEff<S, P, R>(
  action: ActionFactory<P>,
  effect: Effect<S, P, R>,
): Effect<S, ActionType, R> {
  return (actions, states) =>
    effect(
      pipe(
        actions,
        S.filterMap((a) => action.match(a) ? O.some(a.value) : O.none),
      ),
      states,
    );
}

/**
 * @since 2.1.2
 */
export function caseEffs<S, A extends ActionFactory<unknown>[], R>(
  actionCreators: A,
  effect: Effect<S, ExtractAction<A>["value"], R>,
): Effect<S, ActionType, R> {
  return (actions, states) =>
    effect(
      pipe(
        actions,
        S.filterMap((a) =>
          actionCreators.some(({ match }) => match(a))
            ? O.some((<ExtractAction<A>> a).value)
            : O.none
        ),
      ),
      states,
    );
}

/**
 * @since 2.1.2
 */
export function effectFn<S, R = unknown>(
  ...cases: ReadonlyArray<Effect<S, ActionType, R>>
): Effect<S, ActionType, R> {
  return (s, a) =>
    pipe(
      S.fromIterable(cases),
      S.flatmap((eff) => eff(s, a)),
    );
}

/**
 * @since 2.2.0
 */
export function onAction<A = ActionType>(
  actionCreator: ActionFactory<A>,
  actionHandler: (payload: A) => void | ActionType | Promise<ActionType>,
): Effect<unknown> {
  return (actions) =>
    pipe(
      actions,
      S.filter(actionCreator.match),
      S.flatmap(({ value }) => {
        const action = actionHandler(value);
        if (action === null || action === undefined) {
          return S.empty<ActionType>();
        } else {
          return S.fromPromise(Promise.resolve(action));
        }
      }),
    );
}

/**
 * @since 2.1.2
 */
export type Store<S> = {
  readonly state: Stream<S>;
  readonly dispatch: (action: ActionType) => void;
};

/**
 * @since 2.2.0
 */
export function createStore<State>(
  initial: State,
  reducer: Reducer<State>,
): Store<State>;
export function createStore<State>(
  initial: State,
  reducer: Reducer<State>,
  effect: Effect<State, ActionType, typeof S.DefaultEnv>,
): Store<State>;
export function createStore<State, Env>(
  initial: State,
  reducer: Reducer<State>,
  effect: Effect<State, ActionType, Env>,
  env: Env,
): Store<State>;
export function createStore<State, Env>(
  initial: State,
  reducer: Reducer<State>,
  effect: Effect<State, ActionType, Env> = () => S.empty(),
  env: Env = S.DefaultEnv as Env,
): Store<State> {
  const [dispatch, action] = S.createAdapter<ActionType>();

  const state = pipe(
    S.wrap(initial),
    S.combine(pipe(
      action,
      S.scan(reducer, initial),
    )),
    S.distinct(),
    S.hold,
  );

  pipe(
    effect(action, state),
    S.forEach(dispatch, () => {}, env),
  );

  return { state, dispatch };
}
