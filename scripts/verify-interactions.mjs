import assert from 'node:assert/strict';
import { effectiveTicks, eventTickId, placeEvent, deleteTick } from '../src/timelineModel.ts';
import { resizeFrame, MIN_MODULE_WIDTH, MIN_MODULE_HEIGHT } from '../src/workspaceGeometry.ts';

const timeline = { id: 't', name: '测试', ticks: [{ id: 'late', label: '晚期' }, { id: 'early', label: '早期' }], events: [
  { id: 'legacy', title: '原有事件', time: '七年前', description: '', archiveIds: [] },
] };
const ticks = effectiveTicks(timeline);
assert.deepEqual(ticks.map(tick => tick.label), ['晚期', '早期', '七年前']);
assert.equal(eventTickId(timeline.events[0], ticks), ticks[2].id);
const placed = placeEvent(timeline.events[0], ticks[1]);
assert.equal(placed.tickId, 'early');
assert.equal(placed.time, '早期');
const removed = deleteTick({ ...timeline, events: [placed] }, 'early');
assert.equal(removed.events.length, 1);
assert.equal(removed.events[0].tickId, undefined);
assert.equal(removed.events[0].time, '');
assert.equal(effectiveTicks(removed).length, 1);

const frame = { x: 40, y: 50, w: 360, h: 230 };
assert.deepEqual(resizeFrame(frame, { handle: 'e', dx: 80, dy: 90 }), { ...frame, w: 440 });
assert.deepEqual(resizeFrame(frame, { handle: 's', dx: 80, dy: 90 }), { ...frame, h: 320 });
const minimum = resizeFrame(frame, { handle: 'se', dx: -1000, dy: -1000 });
assert.equal(minimum.w, MIN_MODULE_WIDTH);
assert.equal(minimum.h, MIN_MODULE_HEIGHT);
const northwest = resizeFrame(frame, { handle: 'nw', dx: 1000, dy: 1000 });
assert.equal(northwest.x + northwest.w, frame.x + frame.w);
assert.equal(northwest.y + northwest.h, frame.y + frame.h);
const bounded = resizeFrame(frame, { handle: 'nw', dx: -1000, dy: -1000 });
assert.equal(bounded.x, 0); assert.equal(bounded.y, 0);
assert.equal(bounded.x + bounded.w, frame.x + frame.w);
console.log('时间线定位、删除与模块八向缩放边界验证通过。');
