import test from 'node:test';
import assert from 'node:assert/strict';
import { initialTasks } from '../src/seed-data.mjs';
import { updateTaskStatus } from '../src/task-filter.mjs';
import { buildChecklist, checklistToText, ALL_DONE_TEXT } from '../src/checklist.mjs';

test('清单只列未完成的五项，含各自截止时间，排除已完成的 GitHub 项目', () => {
  const items = buildChecklist(initialTasks);
  assert.deepEqual(items.map(item => item.id), ['REL-001', 'REL-002', 'REL-003', 'REL-004', 'REL-005']);
  assert.equal(items.some(item => item.id === 'REL-006'), false);
  assert.deepEqual(items[0], { id: 'REL-001', title: '产品落地页', deadline: '周五' });
  assert.equal(items.every(item => typeof item.deadline === 'string' && item.deadline.length > 0), true);
});

test('生成清单不改动原始任务数据', () => {
  const before = structuredClone(initialTasks);
  buildChecklist(initialTasks);
  assert.deepEqual(initialTasks, before);
});

test('状态改为已完成的事项不再进入清单', () => {
  let tasks = initialTasks.map(task => ({ ...task }));
  tasks = updateTaskStatus(tasks, 'REL-001', 'done');
  assert.equal(buildChecklist(tasks).some(item => item.id === 'REL-001'), false);
  assert.equal(buildChecklist(tasks).length, 4);
});

test('全部完成时清单为空，并显示约定提示语', () => {
  const allDone = initialTasks.map(task => ({ ...task, status: 'done' }));
  const items = buildChecklist(allDone);
  assert.deepEqual(items, []);
  assert.equal(ALL_DONE_TEXT, '已经全部准备好了，可以发布');
  assert.equal(checklistToText(items), ALL_DONE_TEXT);
});

test('复制文本只含未完成事项与截止时间，不含已完成项目或人员信息', () => {
  const text = checklistToText(buildChecklist(initialTasks));
  assert.equal(text.split('\n').length, 5);
  for (const item of buildChecklist(initialTasks)) {
    assert.equal(text.includes(item.title), true);
    assert.equal(text.includes(item.deadline), true);
  }
  assert.equal(text.includes('GitHub 项目'), false);
  assert.equal(text.includes('林舟'), false);
});
