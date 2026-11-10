/* ============================================================
   viewer.js - 他人のエクスポートデータを表示専用で閲覧する
   ここでは一切 localStorage への読み書きを行わない
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('viewer-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    readExternalFile(file, (success, data, err) => {
      const errorEl = document.getElementById('viewer-error');
      const contentEl = document.getElementById('viewer-content');

      if (!success) {
        errorEl.textContent = 'ファイルの読み込みに失敗しました。STUDIESからエクスポートされたJSONファイルか確認してください。';
        errorEl.hidden = false;
        contentEl.hidden = true;
        return;
      }

      errorEl.hidden = true;
      contentEl.hidden = false;

      renderViewerMeta(data);
      renderViewerGoals(data.goals || {});
      renderViewerSchedule(Array.isArray(data.schedule) ? data.schedule : []);
      renderViewerHistory(Array.isArray(data.records) ? data.records : []);
    });
  });
});

/* ---------- メタ情報 ---------- */

function renderViewerMeta(data) {
  const el = document.getElementById('viewer-meta');
  const exportedAt = data.exportedAt ? new Date(data.exportedAt) : null;
  const exportedText = exportedAt
    ? `${exportedAt.getFullYear()}年${exportedAt.getMonth() + 1}月${exportedAt.getDate()}日 ${String(exportedAt.getHours()).padStart(2, '0')}:${String(exportedAt.getMinutes()).padStart(2, '0')}`
    : '不明';
  el.textContent = `このファイルの書き出し日時: ${exportedText}（表示のみ・あなたのデータには保存されません）`;
}

/* ---------- 目標 ---------- */

function renderViewerGoals(goalsObj) {
  const container = document.getElementById('viewer-goals');
  const emptyEl = document.getElementById('viewer-goals-empty');
  const dates = Object.keys(goalsObj).sort((a, b) => (a < b ? 1 : -1));

  container.innerHTML = '';

  const hasAny = dates.some((d) => Array.isArray(goalsObj[d]) && goalsObj[d].length > 0);
  if (!hasAny) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  dates.forEach((date) => {
    const list = goalsObj[date];
    if (!Array.isArray(list) || list.length === 0) return;

    const group = document.createElement('div');
    group.className = 'viewer-date-group';

    const label = document.createElement('div');
    label.className = 'viewer-date-group__label';
    label.textContent = formatDateJP(date);
    group.appendChild(label);

    const ul = document.createElement('ul');
    ul.className = 'list';

    list.forEach((goal) => {
      const li = document.createElement('li');
      li.className = 'list-item';
      const importedTag = goal.imported ? '<span class="tag tag--imported">インポート</span> ' : '';
      const rangeText = escapeHTML(formatGoalRange(goal));
      li.innerHTML = `
        <div class="list-item__main">
          <span class="list-item__title">${importedTag}${rangeText}</span>
          ${goal.memo ? `<span class="list-item__meta">${escapeHTML(goal.memo)}</span>` : ''}
        </div>
      `;
      ul.appendChild(li);
    });

    group.appendChild(ul);
    container.appendChild(group);
  });
}

/* ---------- 予定 (To-Do) ---------- */

function renderViewerSchedule(schedule) {
  const listEl = document.getElementById('viewer-schedule');
  const emptyEl = document.getElementById('viewer-schedule-empty');
  const items = schedule.slice().sort((a, b) => (a.date < b.date ? 1 : -1));

  listEl.innerHTML = '';

  if (items.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'list-item';
    const importedTag = item.imported ? '<span class="tag tag--imported">インポート</span> ' : '';
    li.innerHTML = `
      <div class="list-item__main">
        <span class="list-item__title">${importedTag}${item.done ? '✓ ' : ''}${scheduleBadgeHTML(item)} ${escapeHTML(item.content || '')}</span>
        <span class="list-item__meta">${formatDateJP(item.date)}</span>
      </div>
    `;
    listEl.appendChild(li);
  });
}

/* ---------- 履歴 ---------- */

function renderViewerHistory(records) {
  const listEl = document.getElementById('viewer-history');
  const emptyEl = document.getElementById('viewer-history-empty');
  const items = records.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  listEl.innerHTML = '';

  if (items.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  items.forEach((r) => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <div class="list-item__main">
        <span class="list-item__title">${recordTagsHTML(r)} ${escapeHTML(r.subject || '')} ${r.memo ? '- ' + escapeHTML(r.memo) : ''}</span>
        <span class="list-item__meta">${formatDateJP(r.date)} ・ ${formatDuration(r.duration || 0)}</span>
      </div>
    `;
    listEl.appendChild(li);
  });
}
