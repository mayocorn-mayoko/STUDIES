/* ============================================================
   goal.js - 目標設定画面ロジック
   ============================================================ */

let currentDate = getTodayString();

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('target-date');
  dateInput.value = currentDate;

  dateInput.addEventListener('change', () => {
    currentDate = dateInput.value || getTodayString();
    renderGoalList();
    renderSchedule();
  });

  document.getElementById('goal-form').addEventListener('submit', onSubmitGoal);
  document.getElementById('schedule-form').addEventListener('submit', onSubmitSchedule);

  renderGoalList();
  renderSchedule();
});

/* ---------- 目標フォーム ---------- */

function onSubmitGoal(e) {
  e.preventDefault();

  const rangeStartInput = document.getElementById('range-start');
  const rangeEndInput = document.getElementById('range-end');
  const rangeStart = rangeStartInput.value.trim();
  const rangeEnd = rangeEndInput.value.trim();
  const memo = document.getElementById('goal-memo').value.trim();

  // 空欄チェック: 開始・終了は必須。空の場合はブラウザの入力要求UIで知らせる
  if (!rangeStart) {
    rangeStartInput.setCustomValidity('開始位置を入力してください。');
    rangeStartInput.reportValidity();
    rangeStartInput.setCustomValidity('');
    rangeStartInput.focus();
    return;
  }
  if (!rangeEnd) {
    rangeEndInput.setCustomValidity('終了位置を入力してください。');
    rangeEndInput.reportValidity();
    rangeEndInput.setCustomValidity('');
    rangeEndInput.focus();
    return;
  }

  addGoal({ date: currentDate, rangeStart, rangeEnd, memo });

  e.target.reset();
  renderGoalList();
}

function renderGoalList() {
  const listEl = document.getElementById('goal-list');
  const emptyEl = document.getElementById('goal-empty');
  const goals = getGoalsByDate(currentDate);

  listEl.innerHTML = '';

  if (goals.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  goals.forEach((goal) => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <div class="list-item__main">
        <span class="list-item__title">${escapeHTML(goal.rangeStart)} 〜 ${escapeHTML(goal.rangeEnd)}</span>
        ${goal.memo ? `<span class="list-item__meta">${escapeHTML(goal.memo)}</span>` : ''}
      </div>
      <button class="btn btn--small btn--danger" data-id="${goal.id}">削除</button>
    `;
    li.querySelector('button').addEventListener('click', () => {
      if (confirm('この目標を削除しますか？')) {
        deleteGoal(currentDate, goal.id);
        renderGoalList();
      }
    });
    listEl.appendChild(li);
  });
}

/* ---------- 予定(To-Do) ---------- */

function onSubmitSchedule(e) {
  e.preventDefault();
  const input = document.getElementById('schedule-input');
  const content = input.value.trim();
  if (!content) return;

  addScheduleItem({ date: currentDate, content });
  input.value = '';
  renderSchedule();
}

function renderSchedule() {
  const listEl = document.getElementById('schedule-list');
  const emptyEl = document.getElementById('schedule-empty');
  const items = getScheduleByDate(currentDate);

  listEl.innerHTML = '';

  if (items.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'list-item schedule-item' + (item.done ? ' is-done' : '');
    li.innerHTML = `
      <div class="list-item__left">
        <span class="checkbox ${item.done ? 'is-checked' : ''}"></span>
        <span class="list-item__title">${escapeHTML(item.content)}</span>
      </div>
      <button class="btn btn--small btn--danger" data-id="${item.id}">削除</button>
    `;
    li.querySelector('.list-item__left').addEventListener('click', () => {
      toggleScheduleItem(item.id);
      renderSchedule();
    });
    li.querySelector('button').addEventListener('click', (ev) => {
      ev.stopPropagation();
      deleteScheduleItem(item.id);
      renderSchedule();
    });
    listEl.appendChild(li);
  });
}

/* ---------- ユーティリティ ---------- */

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
