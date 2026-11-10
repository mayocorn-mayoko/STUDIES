/* ============================================================
   calendar.js - カレンダー画面ロジック
   ============================================================ */

const MAX_CHIPS = 2;
const HEAT_MINUTES = [1, 30, 90, 180]; // これ以上で段階1〜4

let viewYear;
let viewMonth; // 0始まり
let selectedDate = getTodayString();

document.addEventListener('DOMContentLoaded', () => {
  const [y, m] = selectedDate.split('-').map(Number);
  viewYear = y;
  viewMonth = m - 1;

  const typeSelect = document.getElementById('event-type');
  Object.entries(SCHEDULE_TYPES).forEach(([value, label]) => {
    typeSelect.add(new Option(label, value));
  });

  document.getElementById('cal-prev').addEventListener('click', () => shiftMonth(-1));
  document.getElementById('cal-next').addEventListener('click', () => shiftMonth(1));
  document.getElementById('cal-today').addEventListener('click', () => {
    selectedDate = getTodayString();
    const [ty, tm] = selectedDate.split('-').map(Number);
    viewYear = ty;
    viewMonth = tm - 1;
    renderAll();
  });
  document.getElementById('event-form').addEventListener('submit', onSubmitEvent);

  renderAll();
});

function shiftMonth(delta) {
  const d = new Date(viewYear, viewMonth + delta, 1);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();
  renderAll();
}

function renderAll() {
  renderMonth();
  renderDay();
}

/* ---------- 月表示 ---------- */

// 日付ごとの勉強時間(分)
function studyMinutesByDate() {
  const map = {};
  getRecords().forEach((r) => {
    map[r.date] = (map[r.date] || 0) + Math.floor((r.duration || 0) / 60);
  });
  return map;
}

function heatLevel(minutes) {
  let level = 0;
  HEAT_MINUTES.forEach((threshold, i) => {
    if (minutes >= threshold) level = i + 1;
  });
  return level;
}

function renderMonth() {
  document.getElementById('cal-title').textContent = `${viewYear}年${viewMonth + 1}月`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const minutes = studyMinutesByDate();
  const byDate = {};
  getSchedule().forEach((s) => {
    (byDate[s.date] = byDate[s.date] || []).push(s);
  });

  const today = getTodayString();
  const first = new Date(viewYear, viewMonth, 1);
  const start = new Date(viewYear, viewMonth, 1 - first.getDay());
  const weeks = Math.ceil((first.getDay() + new Date(viewYear, viewMonth + 1, 0).getDate()) / 7);

  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const ds = toDateString(d);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cal-cell'
      + (d.getMonth() !== viewMonth ? ' is-other' : '')
      + (ds === today ? ' is-today' : '')
      + (ds === selectedDate ? ' is-selected' : '');
    cell.dataset.heat = heatLevel(minutes[ds] || 0);
    cell.dataset.date = ds;

    const items = sortSchedule(byDate[ds] || []);
    const chips = items.slice(0, MAX_CHIPS).map((item) =>
      `<span class="cal-chip cal-chip--${getScheduleType(item)}${item.done ? ' is-done' : ''}">${escapeHTML(item.content)}</span>`
    ).join('');
    const more = items.length > MAX_CHIPS ? `<span class="cal-more">+${items.length - MAX_CHIPS}</span>` : '';
    cell.innerHTML = `<span class="cal-cell__num">${d.getDate()}</span>${chips}${more}`;

    cell.addEventListener('click', () => {
      selectedDate = ds;
      if (d.getMonth() !== viewMonth) {
        viewYear = d.getFullYear();
        viewMonth = d.getMonth();
      }
      renderAll();
    });
    grid.appendChild(cell);
  }
}

/* ---------- 選択日の詳細 ---------- */

function renderDay() {
  document.getElementById('day-title').textContent = formatDateJP(selectedDate);
  document.getElementById('day-goal-link').href = `goal.html?date=${selectedDate}`;

  const items = getScheduleByDate(selectedDate);
  const studyItems = items.filter((s) => getScheduleType(s) === 'study');
  const records = getRecords().filter((r) => r.date === selectedDate);
  const total = records.reduce((sum, r) => sum + (r.duration || 0), 0);

  const planned = studyItems.length
    ? `勉強予定 ${studyItems.filter((s) => s.done).length}/${studyItems.length} 完了`
    : '勉強予定なし';
  document.getElementById('day-summary').textContent = `${planned} ・ 実際の勉強時間 ${formatDuration(total)}`;

  renderDaySchedule(items);
  renderDayGoals();
  renderDayRecords(records);
}

function renderDaySchedule(items) {
  const listEl = document.getElementById('day-schedule');
  const emptyEl = document.getElementById('day-schedule-empty');
  listEl.innerHTML = '';
  emptyEl.hidden = items.length > 0;

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = `list-item schedule-item schedule-item--${getScheduleType(item)}` + (item.done ? ' is-done' : '');
    const importedTag = item.imported ? '<span class="tag tag--imported">インポート</span>' : '';
    li.innerHTML = `
      <div class="list-item__left">
        <span class="checkbox ${item.done ? 'is-checked' : ''}"></span>
        <span class="list-item__title">${importedTag} ${scheduleBadgeHTML(item)} ${escapeHTML(item.content)}</span>
      </div>
      <button class="btn btn--small btn--danger">削除</button>
    `;
    li.querySelector('.list-item__left').addEventListener('click', () => {
      toggleScheduleItem(item.id);
      renderAll();
    });
    li.querySelector('button').addEventListener('click', () => {
      if (confirm('この予定を削除しますか？')) {
        deleteScheduleItem(item.id);
        renderAll();
      }
    });
    listEl.appendChild(li);
  });
}

function renderDayGoals() {
  const listEl = document.getElementById('day-goals');
  const emptyEl = document.getElementById('day-goals-empty');
  const goals = getGoalsByDate(selectedDate);
  listEl.innerHTML = '';
  emptyEl.hidden = goals.length > 0;

  goals.forEach((goal) => {
    const li = document.createElement('li');
    li.className = 'list-item';
    const importedTag = goal.imported ? '<span class="tag tag--imported">インポート</span> ' : '';
    li.innerHTML = `
      <div class="list-item__main">
        <span class="list-item__title">${importedTag}${escapeHTML(formatGoalRange(goal))}</span>
        ${goal.memo ? `<span class="list-item__meta">${escapeHTML(goal.memo)}</span>` : ''}
      </div>
    `;
    listEl.appendChild(li);
  });
}

function renderDayRecords(records) {
  const listEl = document.getElementById('day-records');
  const emptyEl = document.getElementById('day-records-empty');
  listEl.innerHTML = '';
  emptyEl.hidden = records.length > 0;

  records.forEach((r) => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <div class="list-item__main">
        <span class="list-item__title">${recordTagsHTML(r)} ${escapeHTML(r.subject)} ${r.memo ? '- ' + escapeHTML(r.memo) : ''}</span>
        <span class="list-item__meta">${formatDuration(r.duration)}</span>
      </div>
    `;
    listEl.appendChild(li);
  });
}

/* ---------- 予定の追加 ---------- */

function onSubmitEvent(e) {
  e.preventDefault();
  const contentInput = document.getElementById('event-content');
  const content = contentInput.value.trim();
  if (!content) {
    contentInput.setCustomValidity('予定の内容を入力してください。');
    contentInput.reportValidity();
    contentInput.setCustomValidity('');
    contentInput.focus();
    return;
  }

  const startTime = document.getElementById('event-start').value;
  let endTime = document.getElementById('event-end').value;
  if (!startTime || (endTime && endTime < startTime)) endTime = '';

  addScheduleItem({
    date: selectedDate,
    content,
    type: document.getElementById('event-type').value,
    startTime,
    endTime,
  });

  contentInput.value = '';
  document.getElementById('event-start').value = '';
  document.getElementById('event-end').value = '';
  renderAll();
}
