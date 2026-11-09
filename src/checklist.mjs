// 发布清单只取尚未完成的事项及其截止时间，不改动任务本身数据。
export const ALL_DONE_TEXT = '已经全部准备好了，可以发布';

export function buildChecklist(tasks) {
  return tasks
    .filter(task => task.status !== 'done')
    .map(task => ({ id: task.id, title: task.title, deadline: task.deadline }));
}

// 复制用的纯文本：仅包含清单内容，不附带页面、人员信息或任何消息。
export function checklistToText(items) {
  if (items.length === 0) return ALL_DONE_TEXT;
  return items.map(item => `- [ ] ${item.title}（截止：${item.deadline}）`).join('\n');
}
