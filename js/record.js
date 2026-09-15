/* ============================================================
   record.js - 勉強記録の手動追加ページロジック
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('manual-record-form');
  const dateInput = document.getElementById('manual-date');
  dateInput.value = getTodayString();

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const subjectInput = document.getElementById('manual-subject');
    const subject = subjectInput.value.trim();
    const date = dateInput.value || getTodayString();
    const memo = document.getElementById('manual-memo').value.trim();

    const h = parseInt(document.getElementById('manual-hours').value, 10) || 0;
    const m = parseInt(document.getElementById('manual-minutes').value, 10) || 0;
    const s = parseInt(document.getElementById('manual-seconds').value, 10) || 0;
    const duration = h * 3600 + m * 60 + s;

    // 空欄チェック: 科目名は必須
    if (!subject) {
      subjectInput.setCustomValidity('科目名を入力してください。');
      subjectInput.reportValidity();
      subjectInput.setCustomValidity('');
      subjectInput.focus();
      return;
    }

    // 学習時間が未入力(0秒)の場合も入力を求める
    if (duration <= 0) {
      alert('学習時間を入力してください。');
      document.getElementById('manual-minutes').focus();
      return;
    }

    addRecord({ date, subject, duration, memo, source: 'manual' });

    alert('記録を追加しました。');
    form.reset();
    dateInput.value = getTodayString();
    subjectInput.focus();
  });
});
