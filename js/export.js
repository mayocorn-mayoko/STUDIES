/* ============================================================
   export.js - 書き出し設定画面ロジック
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('export-form').addEventListener('submit', onSubmitExport);
});

function onSubmitExport(e) {
  e.preventDefault();

  const startDate = document.getElementById('export-start-date').value || null;
  const endDate = document.getElementById('export-end-date').value || null;
  const includeGoals = document.getElementById('include-goals').checked;
  const includeSchedule = document.getElementById('include-schedule').checked;
  const includeRecords = document.getElementById('include-records').checked;

  if (!includeGoals && !includeSchedule && !includeRecords) {
    alert('書き出す項目を1つ以上選択してください。');
    return;
  }

  if (startDate && endDate && startDate > endDate) {
    alert('開始日は終了日より前の日付を指定してください。');
    return;
  }

  const ok = confirm('この内容でJSONファイルを書き出します。よろしいですか？');
  if (!ok) return;

  exportFilteredData({ startDate, endDate, includeGoals, includeSchedule, includeRecords });
}
