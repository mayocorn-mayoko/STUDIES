/* ============================================================
   STUDIES - common.js
   全画面共通で使うデータ操作・ユーティリティ関数群
   ============================================================ */

const STORAGE_KEYS = {
  RECORDS: 'studies_records',   // 勉強履歴
  GOAL: 'studies_goal',         // 目標(日付ごとに複数件)
  SCHEDULE: 'studies_schedule', // 予定(To-Doリスト)
};

/* ---------- 基本ユーティリティ ---------- */

// UUID代わりの簡易ID生成
function generateId() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// Dateを "YYYY-MM-DD" 形式に変換
function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 今日の日付を "YYYY-MM-DD" 形式で取得
function getTodayString() {
  return toDateString(new Date());
}

// 今日から指定日までの日数(今日=0、明日=1、昨日=-1)
function daysUntil(dateString) {
  const [y, m, d] = dateString.split('-').map(Number);
  const [ty, tm, td] = getTodayString().split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
}

// 秒数を "HH:MM:SS" or "MM:SS" 形式に変換
function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) {
    return `${h}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

// 日付文字列を "YYYY年M月D日" のような表示用に変換
function formatDateJP(dateString) {
  const [y, m, d] = dateString.split('-');
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- localStorage 汎用read/write ---------- */

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Storage read error (${key}):`, e);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Storage write error (${key}):`, e);
    return false;
  }
}

/* ============================================================
   勉強履歴 (study_records)
   構造: [{ id, date, subject, duration(秒), memo, createdAt }]
   ============================================================ */

function getRecords() {
  return readStorage(STORAGE_KEYS.RECORDS, []);
}

function saveRecords(records) {
  return writeStorage(STORAGE_KEYS.RECORDS, records);
}

function addRecord({ date, subject, duration, memo, source }) {
  const records = getRecords();
  const newRecord = {
    id: generateId(),
    date: date || getTodayString(),
    subject: subject || '未設定',
    duration: duration || 0,
    memo: memo || '',
    source: source === 'timer' ? 'timer' : 'manual', // 'timer': タイマーから記録 / 'manual': 手動入力
    createdAt: new Date().toISOString(),
  };
  records.push(newRecord);
  saveRecords(records);
  return newRecord;
}

function deleteRecord(id) {
  const records = getRecords().filter((r) => r.id !== id);
  saveRecords(records);
}

// 履歴の記録元(タイマー/手動)とインポートのタグ
function recordTagsHTML(record) {
  const source = record.source === 'timer'
    ? '<span class="tag tag--timer">タイマー</span>'
    : '<span class="tag tag--manual">手動</span>';
  const imported = record.imported ? '<span class="tag tag--imported">インポート</span>' : '';
  return source + imported;
}

/* ============================================================
   目標 (study_goals)
   構造: { [date]: [ { id, rangeStart, rangeEnd, memo }, ... ] }
   1つの日付に対して複数の目標を保持できるようにする
   ============================================================ */

function getAllGoals() {
  return readStorage(STORAGE_KEYS.GOAL, {});
}

function getGoalsByDate(date) {
  const goals = getAllGoals();
  const list = goals[date];
  return Array.isArray(list) ? list : [];
}

function saveGoalsByDate(date, list) {
  const goals = getAllGoals();
  goals[date] = list;
  writeStorage(STORAGE_KEYS.GOAL, goals);
}

function addGoal({ date, rangeStart, rangeEnd, memo }) {
  const targetDate = date || getTodayString();
  const list = getGoalsByDate(targetDate);
  const goal = {
    id: generateId(),
    rangeStart: rangeStart || '',
    rangeEnd: rangeEnd || '',
    memo: memo || '',
  };
  list.push(goal);
  saveGoalsByDate(targetDate, list);
  return goal;
}

function deleteGoal(date, id) {
  const list = getGoalsByDate(date).filter((g) => g.id !== id);
  saveGoalsByDate(date, list);
}

function getTodayGoals() {
  return getGoalsByDate(getTodayString());
}

// 目標の範囲表記。終了が空なら開始のみ
function formatGoalRange(goal) {
  const start = goal.rangeStart || '?';
  return goal.rangeEnd ? `${start} 〜 ${goal.rangeEnd}` : start;
}

/* ============================================================
   予定 / To-Do (study_schedule)
   構造: [{ id, date, content, done, type, startTime, endTime }]
   type未設定の既存データは 'study' として扱う。時刻は "HH:MM" で任意。
   ============================================================ */

const SCHEDULE_TYPES = {
  study: '勉強予定',
  exam: '試験・締切',
  rest: '休み・予備',
};

function getScheduleType(item) {
  return Object.hasOwn(SCHEDULE_TYPES, item.type) ? item.type : 'study';
}

// 一覧表示用に、勉強予定以外の種類タグと時刻をHTMLにする
function scheduleBadgeHTML(item) {
  const type = getScheduleType(item);
  const typeTag = type === 'study' ? '' : `<span class="tag tag--${type}">${SCHEDULE_TYPES[type]}</span>`;
  const time = item.startTime
    ? `<span class="schedule-time">${escapeHTML(item.startTime)}${item.endTime ? '–' + escapeHTML(item.endTime) : ''}</span>`
    : '';
  return typeTag + time;
}

function getSchedule() {
  return readStorage(STORAGE_KEYS.SCHEDULE, []);
}

function saveSchedule(schedule) {
  return writeStorage(STORAGE_KEYS.SCHEDULE, schedule);
}

function addScheduleItem({ date, content, type, startTime, endTime }) {
  const schedule = getSchedule();
  const item = {
    id: generateId(),
    date: date || getTodayString(),
    content,
    done: false,
    type: Object.hasOwn(SCHEDULE_TYPES, type) ? type : 'study',
    startTime: startTime || '',
    endTime: endTime || '',
  };
  schedule.push(item);
  saveSchedule(schedule);
  return item;
}

function toggleScheduleItem(id) {
  const schedule = getSchedule();
  const item = schedule.find((s) => s.id === id);
  if (item) {
    item.done = !item.done;
    saveSchedule(schedule);
  }
}

function deleteScheduleItem(id) {
  const schedule = getSchedule().filter((s) => s.id !== id);
  saveSchedule(schedule);
}

// 時刻のある予定を開始時刻順に先頭へ、時刻のない予定は登録順に後ろへ並べる
function sortSchedule(items) {
  return items.slice().sort((a, b) => {
    if (a.startTime && b.startTime) {
      return a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0;
    }
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return 0;
  });
}

function getScheduleByDate(date) {
  return sortSchedule(getSchedule().filter((s) => s.date === date));
}

/* ============================================================
   全データリセット
   目標・予定・履歴をすべて削除する(元に戻せない破壊的操作)
   ============================================================ */

function resetAllData() {
  localStorage.removeItem(STORAGE_KEYS.RECORDS);
  localStorage.removeItem(STORAGE_KEYS.GOAL);
  localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
}

/* ============================================================
   データのエクスポート / インポート (JSON)
   ============================================================ */

// 日付文字列(YYYY-MM-DD)がstart〜endの範囲内かを判定する(いずれかがnull/空なら制限なし)
function isDateInRange(date, startDate, endDate) {
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

// 指定した日付範囲・出力項目に絞ってJSONを書き出す
function exportFilteredData({ startDate, endDate, includeGoals, includeSchedule, includeRecords }) {
  const data = {
    exportedAt: new Date().toISOString(),
    records: [],
    goals: {},
    schedule: [],
  };

  if (includeRecords) {
    data.records = getRecords().filter((r) => isDateInRange(r.date, startDate, endDate));
  }

  if (includeGoals) {
    const allGoals = getAllGoals();
    Object.keys(allGoals).forEach((date) => {
      if (isDateInRange(date, startDate, endDate)) {
        data.goals[date] = allGoals[date];
      }
    });
  }

  if (includeSchedule) {
    data.schedule = getSchedule().filter((s) => isDateInRange(s.date, startDate, endDate));
  }

  downloadJSON(data, `studies_backup_${getTodayString()}.json`);
}

// JSONオブジェクトをファイルとしてダウンロードさせる共通処理
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// fileInputのchangeイベント等から呼び出す想定
// 既存データを上書きせず、末尾にマージする。取り込んだ項目には imported:true を付与して区別する。
function importAllData(file, onComplete) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      if (Array.isArray(data.records)) {
        const existing = getRecords();
        const incoming = data.records.map((r) => ({
          ...r,
          id: generateId(), // 既存データとのID重複を避けるため採番し直す
          imported: true,
        }));
        saveRecords(existing.concat(incoming));
      }

      if (data.goals && typeof data.goals === 'object') {
        const existingGoals = getAllGoals();
        Object.keys(data.goals).forEach((date) => {
          const incomingList = Array.isArray(data.goals[date]) ? data.goals[date] : [];
          const taggedIncoming = incomingList.map((g) => ({
            ...g,
            id: generateId(),
            imported: true,
          }));
          const currentList = Array.isArray(existingGoals[date]) ? existingGoals[date] : [];
          existingGoals[date] = currentList.concat(taggedIncoming);
        });
        writeStorage(STORAGE_KEYS.GOAL, existingGoals);
      }

      if (Array.isArray(data.schedule)) {
        const existingSchedule = getSchedule();
        const incomingSchedule = data.schedule.map((s) => ({
          ...s,
          id: generateId(),
          imported: true,
        }));
        saveSchedule(existingSchedule.concat(incomingSchedule));
      }

      if (onComplete) onComplete(true, null);
    } catch (err) {
      console.error('Import error:', err);
      if (onComplete) onComplete(false, err);
    }
  };
  reader.readAsText(file);
}

/* ============================================================
   外部JSONファイルの読み込み専用(localStorageには一切保存しない)
   他人のエクスポートデータを自分のデータと混ぜずに閲覧するための関数
   ============================================================ */

function readExternalFile(file, onComplete) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (onComplete) onComplete(true, data, null);
    } catch (err) {
      console.error('External file read error:', err);
      if (onComplete) onComplete(false, null, err);
    }
  };
  reader.readAsText(file);
}
