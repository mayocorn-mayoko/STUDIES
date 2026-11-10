/* ============================================================
   index.js - ホーム画面ロジック
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  renderGoal();
  renderSchedule();
  renderUpcoming();
  renderHistory();
  setupExportImport();
});

/* ---------- 今日の目標 ---------- */

function renderGoal() {
  const listEl = document.getElementById('goal-list');
  const emptyEl = document.getElementById('goal-empty');
  const goals = getTodayGoals();

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
        <span class="list-item__title" style="font-family:var(--font-display); font-size:16px;">
          ${importedTag}${rangeText}
        </span>
        ${goal.memo ? `<span class="list-item__meta">${escapeHTML(goal.memo)}</span>` : ''}
      </div>
    `;
    listEl.appendChild(li);
  });
}

/* ---------- 今日の勉強予定 ---------- */

function renderSchedule() {
  const listEl = document.getElementById('schedule-list');
  const emptyEl = document.getElementById('schedule-empty');
  const items = getScheduleByDate(getTodayString());

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
    `;
    li.addEventListener('click', () => {
      toggleScheduleItem(item.id);
      renderSchedule();
    });
    listEl.appendChild(li);
  });
}

/* ---------- 近い試験・締切 ---------- */

function renderUpcoming() {
  const section = document.getElementById('upcoming-section');
  const listEl = document.getElementById('upcoming-list');
  const exams = getSchedule()
    .filter((s) => getScheduleType(s) === 'exam' && !s.done && daysUntil(s.date) >= 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(0, 3);

  listEl.innerHTML = '';
  section.hidden = exams.length === 0;

  exams.forEach((item) => {
    const days = daysUntil(item.date);
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <div class="list-item__main">
        <span class="list-item__title">${escapeHTML(item.content)}</span>
        <span class="list-item__meta">${formatDateJP(item.date)}</span>
      </div>
      <span class="countdown">${days === 0 ? '今日' : `あと ${days} 日`}</span>
    `;
    listEl.appendChild(li);
  });
}

/* ---------- 勉強履歴 ---------- */

function renderHistory() {
  const listEl = document.getElementById('history-list');
  const emptyEl = document.getElementById('history-empty');
  const records = getRecords().slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  listEl.innerHTML = '';

  if (records.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  records.forEach((r) => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <div class="list-item__main">
        <span class="list-item__title">${recordTagsHTML(r)} ${escapeHTML(r.subject)} ${r.memo ? '- ' + escapeHTML(r.memo) : ''}</span>
        <span class="list-item__meta">${formatDateJP(r.date)} ・ ${formatDuration(r.duration)}</span>
      </div>
      <button class="btn btn--small btn--danger" data-id="${r.id}">削除</button>
    `;
    li.querySelector('button').addEventListener('click', () => {
      if (confirm('この記録を削除しますか？')) {
        deleteRecord(r.id);
        renderHistory();
      }
    });
    listEl.appendChild(li);
  });
}

/* ---------- インポート ---------- */

function setupExportImport() {
  document.getElementById('input-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importAllData(file, (success) => {
      if (success) {
        alert('データを読み込みました。既存のデータに追加され、「インポート」タグが付いた状態で表示されます。');
        renderGoal();
        renderSchedule();
        renderUpcoming();
        renderHistory();
      } else {
        alert('読み込みに失敗しました。ファイル形式を確認してください。');
      }
      e.target.value = '';
    });
  });
}
