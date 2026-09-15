/* ============================================================
   STUDIES - common.js
   全画面共通で使うデータ操作・ユーティリティ関数群
   ============================================================ */

const STORAGE_KEYS = {
  RECORDS: 'studies_records',   // 勉強履歴
  GOAL: 'studies_goal',         // 今日の目標(日付ごとに1件)
  SCHEDULE: 'studies_schedule', // 今日の予定(To-Doリスト)
};

/* ---------- 基本ユーティリティ ---------- */

// UUID代わりの簡易ID生成
function generateId() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// 今日の日付を "YYYY-MM-DD" 形式で取得
function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

// 日付指定で履歴を取得(省略時は全件)
function getRecordsByDate(date) {
  return getRecords().filter((r) => r.date === date);
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

/* ============================================================
   予定 / To-Do (study_schedule)
   構造: [{ id, date, content, done }]
   ============================================================ */

function getSchedule() {
  return readStorage(STORAGE_KEYS.SCHEDULE, []);
}

function saveSchedule(schedule) {
  return writeStorage(STORAGE_KEYS.SCHEDULE, schedule);
}

function addScheduleItem({ date, content }) {
  const schedule = getSchedule();
  const item = {
    id: generateId(),
    date: date || getTodayString(),
    content,
    done: false,
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

function getScheduleByDate(date) {
  return getSchedule().filter((s) => s.date === date);
}

/* ============================================================
   データのエクスポート / インポート (JSON)
   ============================================================ */

function exportAllData() {
  const data = {
    records: getRecords(),
    goals: getAllGoals(),
    schedule: getSchedule(),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `studies_backup_${getTodayString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// fileInputのchangeイベント等から呼び出す想定
function importAllData(file, onComplete) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.records) saveRecords(data.records);
      if (data.goals) writeStorage(STORAGE_KEYS.GOAL, data.goals);
      if (data.schedule) saveSchedule(data.schedule);
      if (onComplete) onComplete(true, null);
    } catch (err) {
      console.error('Import error:', err);
      if (onComplete) onComplete(false, err);
    }
  };
  reader.readAsText(file);
}
