import { OrdNumber } from "../number.ts";
import { contramap } from "../ord.ts";
import { binarySearch } from "../array.ts";
import { pipe } from "../fn.ts";

export type Time = number; // milliseconds
export type Delay = number; // milliseconds
export type Period = number; // milliseconds
export type Offset = number; // milliseconds

export interface Task {
  run(time: Time): void;
  dispose(): void;
}

export interface ScheduledTask {
  readonly task: Task;
  readonly time: Time;
  run(): void;
  dispose(): void;
}

export interface TimeSlot {
  time: Time;
  tasks: ScheduledTask[];
}

export interface Timeline {
  readonly events: TimeSlot[];
}

export interface Scheduler {
  currentTime(): Time;
  scheduleTask(
    offset: Offset,
    delay: Delay,
    period: Period,
    task: Task,
  ): ScheduledTask;
  relative(offset: Offset): Scheduler;
  cancel(task: ScheduledTask): void;
}

export interface Disposable {
  dispose(): void;
}

export interface Clock {
  /**
   * Returns the current time in milliseconds
   */
  now(): Time;
}

export interface Sink<A> {
  event(time: Time, value: A): void;
  end(time: Time): void;
  error(time: Time, err: Error): void;
}

export interface Stream<A> {
  run(sink: Sink<A>, scheduler: Scheduler): Disposable;
}

export type Handle = number;

export interface Timer {
  now(): Time;
  setTimer(f: () => unknown, delayTime: Delay): Handle;
  clearTimer(timerHandle: Handle): void;
}

export type TaskRunner = (st: ScheduledTask) => unknown;

/**
 * Clock
 *
 * Do not implement high resolution clock, stick with performance.now.
 */

export function relativeClock(clock: Clock, from: Time): Clock {
  return { now: () => clock.now() - from };
}

export function performanceClock(): Clock {
  return relativeClock(performance, performance.now());
}

/**
 * Timeline
 *
 * Do not implement removeAll
 */

// add(scheduledTask: ScheduledTask): void;
// remove(scheduledTask: ScheduledTask): boolean;
// isEmpty(): boolean;
// nextArrival(): Time;
// runTasks(time: Time, runTask: TaskRunner): void;

export function timeslot(time: Time, tasks: ScheduledTask[]): TimeSlot {
  return { time, tasks };
}

const OrdTimeSlot = pipe(
  OrdNumber,
  contramap((ts: TimeSlot) => ts.time),
);

const searchTimeline = binarySearch(OrdTimeSlot);

export function timeline(...events: TimeSlot[]): Timeline {
  return { events };
}

// nextArrival(): number {
//  return this.isEmpty() ? Infinity : this.tasks[0].time
// }

// isEmpty(): boolean {
//  return this.tasks.length === 0
// }

// add(st: ScheduledTaskImpl): void {
//  insertByTime(st, this.tasks)
// }

// remove(st: ScheduledTaskImpl): boolean {
//  const i = binarySearch(getTime(st), this.tasks)

//  if (i >= 0 && i < this.tasks.length) {
//    const events = this.tasks[i].events
//    const at = findIndex(st, events)
//    if (at >= 0) {
//      events.splice(at, 1)
//      if (events.length === 0) {
//        this.tasks.splice(i, 1)
//      }
//      return true
//    }
//  }

//  return false
// }

// runTasks(t: Time, runTask: (task: ScheduledTaskImpl) => void): void {
//  const tasks = this.tasks
//  const l = tasks.length
//  let i = 0

//  while (i < l && tasks[i].time <= t) {
//    ++i
//  }

//  this.tasks = tasks.slice(i)

//  // Run all ready tasks
//  for (let j = 0; j < i; ++j) {
//    this.tasks = runReadyTasks(runTask, tasks[j].events, this.tasks)
//  }
// }

function getScheduledTaskTime(scheduledTask: ScheduledTask): Time {
  return Math.floor(scheduledTask.time);
}

export function addTask(task: ScheduledTask, events: TimeSlot[]) {
  const length = events.length;
  const time = getScheduledTaskTime(task);

  if (length === 0) {
    events.push(timeslot(time, [task]));
  }
}
