/* ============================================================
   index.js - ホーム画面ロジック
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  renderGoal();
  renderSchedule();
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
    li.innerHTML = `
      <div class="list-item__main">
        <span class="list-item__title" style="font-family:var(--font-display); font-size:16px;">
          ${escapeHTML(goal.rangeStart)} 〜 ${escapeHTML(goal.rangeEnd)}
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
    li.innerHTML = `
      <div class="list-item__left">
        <span class="checkbox ${item.done ? 'is-checked' : ''}"></span>
        <span class="list-item__title">${escapeHTML(item.content)}</span>
      </div>
    `;
    li.addEventListener('click', () => {
      toggleScheduleItem(item.id);
      renderSchedule();
    });
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
    const sourceTag = r.source === 'timer'
      ? '<span class="tag tag--timer">タイマー</span>'
      : '<span class="tag tag--manual">手動</span>';
    li.innerHTML = `
      <div class="list-item__main">
        <span class="list-item__title">${sourceTag} ${escapeHTML(r.subject)} ${r.memo ? '- ' + escapeHTML(r.memo) : ''}</span>
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

/* ---------- エクスポート / インポート ---------- */

function setupExportImport() {
  document.getElementById('btn-export').addEventListener('click', () => {
    const ok = confirm('学習記録・目標・予定をJSONファイルとして書き出します。よろしいですか？');
    if (!ok) return;
    exportAllData();
  });

  document.getElementById('input-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importAllData(file, (success) => {
      if (success) {
        alert('データを読み込みました。');
        renderGoal();
        renderSchedule();
        renderHistory();
      } else {
        alert('読み込みに失敗しました。ファイル形式を確認してください。');
      }
      e.target.value = '';
    });
  });
}

/* ---------- ユーティリティ ---------- */

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
