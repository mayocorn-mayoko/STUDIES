/* ============================================================
   goal.js - 目標設定画面ロジック
   ============================================================ */

const queryDate = new URLSearchParams(location.search).get('date');
let currentDate = /^\d{4}-\d{2}-\d{2}$/.test(queryDate || '') ? queryDate : getTodayString();

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
  document.getElementById('btn-reset-all').addEventListener('click', onResetAllData);

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

  // 空欄チェック: 開始のみ必須。終了は空欄でもよい
  if (!rangeStart) {
    rangeStartInput.setCustomValidity('開始位置を入力してください。');
    rangeStartInput.reportValidity();
    rangeStartInput.setCustomValidity('');
    rangeStartInput.focus();
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
    const importedTag = goal.imported ? '<span class="tag tag--imported">インポート</span> ' : '';
    const rangeText = escapeHTML(formatGoalRange(goal));
    li.innerHTML = `
      <div class="list-item__main">
        <span class="list-item__title">${importedTag}${rangeText}</span>
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
    const importedTag = item.imported ? '<span class="tag tag--imported">インポート</span>' : '';
    li.innerHTML = `
      <div class="list-item__left">
        <span class="checkbox ${item.done ? 'is-checked' : ''}"></span>
        <span class="list-item__title">${importedTag} ${scheduleBadgeHTML(item)} ${escapeHTML(item.content)}</span>
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

/* ---------- データ全リセット ---------- */

function onResetAllData() {
  const ok = confirm('すべての目標・勉強予定・勉強履歴を削除します。この操作は元に戻せません。本当に削除しますか？');
  if (!ok) return;

  resetAllData();
  alert('すべてのデータを削除しました。');

  renderGoalList();
  renderSchedule();
}
