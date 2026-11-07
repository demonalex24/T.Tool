import type { Timeline, TimelineEvent, TimelineTick } from './model';

export function effectiveTicks(timeline: Timeline): TimelineTick[] {
  const ticks = [...(timeline.ticks ?? [])];
  const labels = new Set(ticks.map(tick => tick.label));
  for (const event of timeline.events) {
    if (!event.time || labels.has(event.time) || ticks.some(tick => tick.id === event.tickId)) continue;
    ticks.push({ id: `legacy:${event.time}`, label: event.time });
    labels.add(event.time);
  }
  return ticks;
}

export function eventTickId(event: TimelineEvent, ticks: TimelineTick[]): string | undefined {
  return ticks.find(tick => tick.id === event.tickId)?.id
    ?? ticks.find(tick => tick.label === event.time)?.id;
}

export function placeEvent(event: TimelineEvent, tick?: TimelineTick): TimelineEvent {
  return { ...event, tickId: tick?.id, time: tick?.label ?? '' };
}

export function deleteTick(timeline: Timeline, tickId: string): Timeline {
  const ticks = effectiveTicks(timeline);
  return {
    ...timeline,
    ticks: ticks.filter(tick => tick.id !== tickId),
    events: timeline.events.map(event => eventTickId(event, ticks) === tickId
      ? { ...event, tickId: undefined, time: '', unplaced: true }
      : event),
  };
}
