/* ============================================================
   timer.js - タイマー画面ロジック
   ============================================================ */

let mode = 'countup';            // 'countup' | 'countdown'
let state = 'idle';              // 'idle' | 'running' | 'paused'
let intervalId = null;

let countdownTotal = 0;          // カウントダウン用: 設定した合計秒数

// 経過時間は「tickのたびに+1する」のではなく、実時刻の差分から都度計算する。
// setIntervalはタブが非アクティブ/ウィンドウが非フォーカスのとき、ブラウザによって
// 間引かれる(スロットリングされる)ことがあるため、tick回数を数えると実際の経過時間より
// 短く記録されてしまう。segmentStartTime(開始/再開した実時刻)と、それ以前にすでに
// 確定している秒数(accumulatedSeconds)から毎回計算し直すことで、間引かれても
// 次にtickが呼ばれた時点で正しい経過時間に追いつく。
let segmentStartTime = null;     // 現在の稼働区間の開始時刻(ms, Date.now())。稼働中でなければnull
let accumulatedSeconds = 0;      // 過去の稼働区間(一時停止前まで)で確定した経過秒数

let finishedDuration = 0;       // 停止時に記録する学習時間(秒)

/* ---------- 要素参照 ---------- */

const elDisplay = document.getElementById('timer-display');
const elModeSwitch = document.getElementById('mode-switch');
const elDurationSetting = document.getElementById('duration-setting');
const elBtnStart = document.getElementById('btn-start');
const elBtnPause = document.getElementById('btn-pause');
const elBtnStop = document.getElementById('btn-stop');
const elBtnFullscreen = document.getElementById('btn-fullscreen');
const elTimerPage = document.getElementById('timer-page');

const elSaveModal = document.getElementById('save-modal');
const elModalDuration = document.getElementById('modal-duration');
const elRecordSubject = document.getElementById('record-subject');
const elRecordMemo = document.getElementById('record-memo');
const elBtnSaveRecord = document.getElementById('btn-save-record');
const elBtnDiscardRecord = document.getElementById('btn-discard-record');

/* ---------- 初期化 ---------- */

document.addEventListener('DOMContentLoaded', () => {
  setState('idle');
  updateDisplay();

  elModeSwitch.querySelectorAll('.mode-switch__btn').forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  elBtnStart.addEventListener('click', startOrResume);
  elBtnPause.addEventListener('click', pauseTimer);
  elBtnStop.addEventListener('click', stopTimer);
  elBtnFullscreen.addEventListener('click', toggleFullscreen);

  elBtnSaveRecord.addEventListener('click', onSaveRecord);
  elBtnDiscardRecord.addEventListener('click', onDiscardRecord);

  // タブ/ウィンドウが再びアクティブになった瞬間に、間引かれていた表示を即座に正しい値へ追いつかせる
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state === 'running') {
      tick();
    }
  });
});

/* ---------- モード切り替え ---------- */

function setMode(newMode) {
  if (state !== 'idle') return; // 稼働中・一時停止中は切り替え不可
  mode = newMode;

  elModeSwitch.querySelectorAll('.mode-switch__btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.mode === newMode);
  });
  elDurationSetting.hidden = newMode !== 'countdown';

  resetTimerState();
  updateDisplay();
}

/* ---------- タイマー制御 ---------- */

// 現在の経過秒数を実時刻から計算する(稼働中でなければ確定済みの秒数をそのまま返す)
function getElapsedSeconds() {
  if (state !== 'running' || segmentStartTime === null) {
    return accumulatedSeconds;
  }
  const sinceSegmentStart = Math.floor((Date.now() - segmentStartTime) / 1000);
  return accumulatedSeconds + sinceSegmentStart;
}

function startOrResume() {
  // 稼働中の連打によるinterval多重生成を防止
  if (state === 'running') return;

  if (state === 'idle') {
    if (mode === 'countdown') {
      const h = parseInt(document.getElementById('set-hours').value, 10) || 0;
      const m = parseInt(document.getElementById('set-minutes').value, 10) || 0;
      const s = parseInt(document.getElementById('set-seconds').value, 10) || 0;
      countdownTotal = h * 3600 + m * 60 + s;
      if (countdownTotal <= 0) {
        alert('カウントダウンの時間を設定してください。');
        return;
      }
    }
    accumulatedSeconds = 0;
  }
  // state === 'paused' の場合はaccumulatedSecondsを維持したまま再開する

  segmentStartTime = Date.now();
  disableModeSwitch(true);
  setState('running');

  // 念のため既存のintervalが残っていればクリアしてから開始する
  clearInterval(intervalId);
  intervalId = setInterval(tick, 1000);
  updateDisplay();
}

function pauseTimer() {
  if (state !== 'running') return;
  accumulatedSeconds = getElapsedSeconds(); // ここまでの経過秒数を確定させる
  segmentStartTime = null;
  clearInterval(intervalId);
  intervalId = null;
  setState('paused');
}

function stopTimer() {
  if (state === 'idle') return;
  const elapsed = getElapsedSeconds();
  clearInterval(intervalId);
  intervalId = null;
  segmentStartTime = null;

  finishedDuration = mode === 'countup' ? elapsed : Math.min(countdownTotal, elapsed);

  setState('idle');
  disableModeSwitch(false);
  openSaveModal();
}

function tick() {
  const elapsed = getElapsedSeconds();

  if (mode === 'countdown' && elapsed >= countdownTotal) {
    // タブが非アクティブな間に時間切れを迎えていた場合もここで検知できる
    accumulatedSeconds = countdownTotal;
    segmentStartTime = null;
    finishedDuration = countdownTotal;
    clearInterval(intervalId);
    intervalId = null;
    setState('idle');
    disableModeSwitch(false);
    updateDisplay();
    notifyCountdownEnd();
    openSaveModal();
    return;
  }

  updateDisplay();
}

function resetTimerState() {
  clearInterval(intervalId);
  intervalId = null;
  segmentStartTime = null;
  accumulatedSeconds = 0;
  countdownTotal = 0;
  setState('idle');
}

/* ---------- 表示更新 ---------- */

function updateDisplay() {
  const elapsed = getElapsedSeconds();
  const seconds = mode === 'countup' ? elapsed : Math.max(0, countdownTotal - elapsed);
  elDisplay.textContent = formatDuration(seconds);

  elDisplay.classList.remove('is-warning', 'is-danger');
  if (mode === 'countdown' && state === 'running') {
    if (seconds <= 10) {
      elDisplay.classList.add('is-danger');
    } else if (seconds <= 60) {
      elDisplay.classList.add('is-warning');
    }
  }
}

// state遷移とボタン表示/ラベルの更新をまとめて行う
function setState(newState) {
  state = newState;

  if (state === 'idle') {
    elBtnStart.hidden = false;
    elBtnStart.disabled = false;
    elBtnStart.textContent = '開始';
    elBtnPause.hidden = true;
    elBtnStop.hidden = true;
  } else if (state === 'running') {
    // 稼働中は非表示にせず、操作不能であることが分かるよう無効化して暗く表示する
    elBtnStart.hidden = false;
    elBtnStart.disabled = true;
    elBtnPause.hidden = false;
    elBtnStop.hidden = false;
  } else if (state === 'paused') {
    elBtnStart.hidden = false;
    elBtnStart.disabled = false;
    elBtnStart.textContent = '再開';
    elBtnPause.hidden = true;
    elBtnStop.hidden = false;
  }
}

function disableModeSwitch(disabled) {
  elModeSwitch.querySelectorAll('.mode-switch__btn').forEach((btn) => {
    btn.disabled = disabled;
  });
}

function notifyCountdownEnd() {
  // シンプルな通知(音は将来的に追加可能)
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  alert('設定した時間が終了しました。');
}

/* ---------- 全画面表示 ---------- */

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    elTimerPage.requestFullscreen().catch((err) => {
      console.error('全画面表示に失敗しました:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

/* ---------- 記録保存モーダル ---------- */

function openSaveModal() {
  elModalDuration.textContent = formatDuration(finishedDuration);
  elRecordSubject.value = '';
  elRecordMemo.value = '';
  elSaveModal.hidden = false;
  elRecordSubject.focus();
}

function closeSaveModal() {
  elSaveModal.hidden = true;
  resetTimerState();
  updateDisplay();
}

function onSaveRecord() {
  const subject = elRecordSubject.value.trim() || '未設定';
  const memo = elRecordMemo.value.trim();

  if (finishedDuration <= 0) {
    closeSaveModal();
    return;
  }

  addRecord({
    date: getTodayString(),
    subject,
    duration: finishedDuration,
    memo,
    source: 'timer',
  });

  closeSaveModal();
}

function onDiscardRecord() {
  closeSaveModal();
}
