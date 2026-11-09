import { initialTasks } from './seed-data.mjs';
import { filterTasks, updateTaskStatus } from './task-filter.mjs';
import { buildChecklist, checklistToText } from './checklist.mjs';

const paths = {
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  list: '<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M9 8h7M9 12h7M9 16h5M6.5 8h.1M6.5 12h.1M6.5 16h.1"/>',
  pending: '<circle cx="12" cy="12" r="8" stroke-dasharray="2.3 3.2"/>',
  'check-circle': '<circle cx="12" cy="12" r="8"/><path d="m8 12 2.7 2.7L16 9.5"/>',
  sidebar: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M9 4v16"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4.5 4.5"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  chevrons: '<path d="m9 8 3-3 3 3m-6 8 3 3 3-3"/>',
  'chevron-left': '<path d="m14 7-5 5 5 5"/>',
  'chevron-right': '<path d="m10 7 5 5-5 5"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l3 2M9 2h6"/>',
  up: '<path d="M12 19V5m-5 5 5-5 5 5"/>',
  right: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  down: '<path d="M12 5v14m-5-5 5 5 5-5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
};
const icon = name => `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); });
const $ = id => document.getElementById(id);
const statusNames = { todo: '待开始', 'in-progress': '进行中', review: '待确认', done: '已完成' };
const statusIcons = { todo: 'circle', 'in-progress': 'timer', review: 'pending', done: 'check-circle' };
const priorities = { high: ['优先', 'up'], medium: ['常规', 'right'], low: ['从容', 'down'] };
let tasks = initialTasks.map(task => ({ ...task }));
let onlyPending = false;
let checklistOpen = false;
let copyLabelTimer;
const selected = new Set();

function render() {
  const search = $('search').value;
  const status = $('status-filter').value;
  const priority = $('priority-filter').value;
  const visible = filterTasks(tasks, { search, status, priority, onlyPending });
  $('task-rows').innerHTML = visible.length ? visible.map(task => `<tr data-task-id="${task.id}" class="${task.status === 'done' ? 'done-row' : ''}" data-selected="${selected.has(task.id)}"><td><input type="checkbox" data-select="${task.id}" aria-label="选择${task.title}" ${selected.has(task.id) ? 'checked' : ''}></td><td class="task-id">${task.id}</td><td><div class="task-title"><span class="task-category">${task.label}</span><span>${task.title}</span></div></td><td><div class="task-status status-${task.status}">${icon(statusIcons[task.status])}<select data-status="${task.id}" aria-label="${task.title}的状态">${Object.entries(statusNames).map(([key, text]) => `<option value="${key}" ${task.status === key ? 'selected' : ''}>${text}</option>`).join('')}</select></div></td><td class="task-deadline">${task.deadline}</td><td><div class="task-priority priority-${task.priority}">${icon(priorities[task.priority][1])}<span>${priorities[task.priority][0]}</span></div></td></tr>`).join('') : '<tr><td colspan="6" class="table-empty">没有符合条件的任务。调整一下筛选试试。</td></tr>';
  const done = tasks.filter(task => task.status === 'done').length;
  $('nav-all').textContent = tasks.length;
  $('nav-pending').textContent = tasks.length - done;
  $('nav-done').textContent = done;
  $('progress-label').textContent = `${done} / ${tasks.length} 已完成`;
  $('progress-fill').style.width = `${done / tasks.length * 100}%`;
  $('visible-count').textContent = `共 ${visible.length} 项任务`;
  $('selection-label').textContent = `已选 ${visible.filter(task => selected.has(task.id)).length} 项`;
  $('select-all').checked = visible.length > 0 && visible.every(task => selected.has(task.id));
  $('select-all').indeterminate = visible.some(task => selected.has(task.id)) && !$('select-all').checked;
  $('only-pending').setAttribute('aria-pressed', onlyPending);
  $('reset').hidden = !(search || status !== 'all' || priority !== 'all' || onlyPending);
  document.querySelectorAll('[data-nav]').forEach(button => button.classList.toggle('active', button.dataset.nav === (onlyPending ? 'pending' : status === 'done' ? 'done' : 'all')));
  renderChecklist();
}

function resetFilters() {
  $('search').value = '';
  $('status-filter').value = 'all';
  $('priority-filter').value = 'all';
  onlyPending = false;
  render();
}

// 清单始终基于全部任务的当前状态，不受搜索/状态/优先级筛选影响。
function renderChecklist() {
  $('checklist-pane').hidden = !checklistOpen;
  $('workspace-grid').classList.toggle('with-checklist', checklistOpen);
  $('generate-checklist').setAttribute('aria-expanded', checklistOpen);
  if (!checklistOpen) return;
  const items = buildChecklist(tasks);
  const empty = items.length === 0;
  $('checklist-items').innerHTML = empty ? '' : items.map(item =>
    `<li><span class="checklist-bullet"></span><div><div class="checklist-item-title">${item.title}</div><div class="checklist-item-meta">截止：${item.deadline}</div></div></li>`
  ).join('');
  $('checklist-empty').hidden = !empty;
  $('checklist-bottom').hidden = empty;
  $('copy-checklist').disabled = empty;
}

function flashCopyLabel(text) {
  $('copy-label').textContent = text;
  clearTimeout(copyLabelTimer);
  copyLabelTimer = setTimeout(() => { $('copy-label').textContent = '复制清单'; }, 1800);
}

async function copyChecklist() {
  const text = checklistToText(buildChecklist(tasks));
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      if (!ok) throw new Error('复制失败');
    }
    flashCopyLabel('已复制');
  } catch {
    flashCopyLabel('复制失败');
  }
}

$('search').addEventListener('input', render);
$('status-filter').addEventListener('change', render);
$('priority-filter').addEventListener('change', render);
$('only-pending').addEventListener('click', () => { onlyPending = !onlyPending; render(); });
$('reset').addEventListener('click', resetFilters);
document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.nav === 'all') return resetFilters();
  $('status-filter').value = button.dataset.nav === 'done' ? 'done' : 'all';
  onlyPending = button.dataset.nav === 'pending';
  render();
}));
$('select-all').addEventListener('change', event => {
  const visible = filterTasks(tasks, { search: $('search').value, status: $('status-filter').value, priority: $('priority-filter').value, onlyPending });
  visible.forEach(task => event.target.checked ? selected.add(task.id) : selected.delete(task.id));
  render();
});
$('task-rows').addEventListener('change', event => {
  if (event.target.dataset.status) tasks = updateTaskStatus(tasks, event.target.dataset.status, event.target.value);
  if (event.target.dataset.select) event.target.checked ? selected.add(event.target.dataset.select) : selected.delete(event.target.dataset.select);
  render();
});
$('generate-checklist').addEventListener('click', () => { checklistOpen = true; renderChecklist(); });
$('close-checklist').addEventListener('click', () => { checklistOpen = false; renderChecklist(); });
$('copy-checklist').addEventListener('click', copyChecklist);
render();
