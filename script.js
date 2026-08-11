// 2026-2학기 시간표 카드 교체 도구
//
// CURRENT_GRID(현재 시간표 상태)를 초기값으로 불러와 표시하고,
// CARDS(교과배정 목록) 중 하나를 선택한 뒤 표의 칸을 클릭하면 그 칸에 배치합니다.
// 카드를 선택하지 않은 채로 채워진 칸을 클릭하면 비웁니다.
// 트랙 문자열이 같아야 같은 분반으로 인식되므로, 카드의 "분반" 값은 "학년-분반"
// (예: 1-A1) 형식을 그대로 사용합니다.

const STORAGE_KEY = 'timetable-2026-grid-v1';
const DAYS = ['월', '화', '수', '목', '금'];
const TRACKS = ['A1','A2','B1','B2','C1','C2','D1','D2'];
const PERIOD_LABELS = ['9:10-10:00','10:10-11:00','11:10-12:00','12:10-13:00','13:10-14:00(점심)','14:10-15:00','15:10-16:00','16:10-17:00'];

let grid = {}; // key: "grade|day|track|period" -> {subject,prof,room}
let selectedCard = null;
let currentGrade = '1';

const cardListEl = document.getElementById('card-list');
const cardCountEl = document.getElementById('card-count');
const cardSearchEl = document.getElementById('card-search');
const selectedBannerEl = document.getElementById('selected-banner');
const boardEl = document.getElementById('board');
const conflictsEl = document.getElementById('conflicts');

function keyOf(grade, day, track, period) { return grade + '|' + day + '|' + track + '|' + period; }

function gridFromCurrent() {
  const g = {};
  CURRENT_GRID.forEach(function (c) {
    const grade = c.track.split('-')[0];
    g[keyOf(grade, c.day, c.track, c.period)] = { subject: c.subject, prof: c.prof, room: c.room };
  });
  return g;
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(grid)); } catch (e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { grid = JSON.parse(raw); return true; }
  } catch (e) {}
  return false;
}
function resetToOriginal() {
  grid = gridFromCurrent();
  saveState();
  renderBoard();
}

// ---------- 카드 팔레트 ----------

function renderCards() {
  const q = cardSearchEl.value.trim().toLowerCase();
  const filtered = CARDS.filter(function (c) {
    if (!q) return true;
    return c.name.toLowerCase().indexOf(q) !== -1 || c.prof.toLowerCase().indexOf(q) !== -1;
  });
  cardCountEl.textContent = CARDS.length;
  cardListEl.innerHTML = '';
  filtered.forEach(function (c, idx) {
    const div = document.createElement('div');
    div.className = 'card' + (selectedCard === c ? ' selected' : '');
    div.tabIndex = 0;
    div.setAttribute('role', 'button');
    const nameEl = document.createElement('div'); nameEl.className = 'card-name'; nameEl.textContent = c.name;
    const metaEl = document.createElement('div'); metaEl.className = 'card-meta'; metaEl.textContent = c.prof + ' \u00B7 ' + c.track + (c.room ? (' \u00B7 ' + c.room) : '');
    div.appendChild(nameEl); div.appendChild(metaEl);
    if (c.onlyDays) {
      const dayEl = document.createElement('div'); dayEl.className = 'card-days'; dayEl.textContent = '가능: ' + c.onlyDays;
      div.appendChild(dayEl);
    }
    div.addEventListener('click', function () {
      selectedCard = (selectedCard === c) ? null : c;
      renderCards();
      renderSelectedBanner();
    });
    cardListEl.appendChild(div);
  });
}

function renderSelectedBanner() {
  selectedBannerEl.innerHTML = '';
  if (!selectedCard) {
    selectedBannerEl.textContent = '선택된 카드 없음 — 카드를 클릭해 선택하세요.';
    return;
  }
  const strong = document.createElement('strong');
  strong.textContent = selectedCard.name + ' (' + selectedCard.prof + ')';
  selectedBannerEl.appendChild(document.createTextNode('선택됨: '));
  selectedBannerEl.appendChild(strong);
  selectedBannerEl.appendChild(document.createTextNode(' — 표의 칸을 클릭해 배치하세요.'));
}

// ---------- 시간표 보드 ----------

function renderBoard() {
  boardEl.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'board-table';

  const thead = document.createElement('thead');
  const headRow1 = document.createElement('tr');
  const corner = document.createElement('th'); corner.rowSpan = 2; headRow1.appendChild(corner);
  DAYS.forEach(function (d) { const th = document.createElement('th'); th.colSpan = TRACKS.length; th.textContent = d; headRow1.appendChild(th); });
  thead.appendChild(headRow1);
  const headRow2 = document.createElement('tr');
  DAYS.forEach(function () { TRACKS.forEach(function (t) { const th = document.createElement('th'); th.textContent = t; headRow2.appendChild(th); }); });
  thead.appendChild(headRow2);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  PERIOD_LABELS.forEach(function (label, pIdx) {
    const period = pIdx + 1;
    const tr = document.createElement('tr');
    const rowTh = document.createElement('th');
    const numDiv = document.createElement('div'); numDiv.className = 'period-num'; numDiv.textContent = period + '교시';
    const timeDiv = document.createElement('div'); timeDiv.className = 'period-time'; timeDiv.textContent = label;
    rowTh.appendChild(numDiv); rowTh.appendChild(timeDiv);
    tr.appendChild(rowTh);

    DAYS.forEach(function (d) {
      TRACKS.forEach(function (t) {
        const trackKey = currentGrade + '-' + t;
        const k = keyOf(currentGrade, d, trackKey, period);
        const td = document.createElement('td');
        const cell = grid[k];
        if (cell) {
          td.className = 'filled';
          const tile = document.createElement('div'); tile.className = 'tile';
          const nameEl = document.createElement('div'); nameEl.className = 'tile-name'; nameEl.textContent = cell.subject;
          const metaEl = document.createElement('div'); metaEl.className = 'tile-meta'; metaEl.textContent = cell.prof + (cell.room ? (' \u00B7 ' + cell.room) : '');
          tile.appendChild(nameEl); tile.appendChild(metaEl);
          td.appendChild(tile);
        }
        td.addEventListener('click', function () { onCellClick(d, trackKey, period); });
        tr.appendChild(td);
      });
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  boardEl.appendChild(table);

  renderConflicts();
}

function onCellClick(day, trackKey, period) {
  const k = keyOf(currentGrade, day, trackKey, period);
  if (selectedCard) {
    grid[k] = { subject: selectedCard.name, prof: selectedCard.prof, room: selectedCard.room };
  } else {
    if (grid[k]) delete grid[k];
  }
  saveState();
  renderBoard();
}

function renderConflicts() {
  // 같은 교수님 또는 같은(비어있지 않은) 강의실이 같은 요일·교시에 두 번 이상 등장하면 충돌로 표시
  const byProf = {}, byRoom = {};
  Object.keys(grid).forEach(function (k) {
    const parts = k.split('|'); // grade|day|track|period
    const day = parts[1], period = parts[3];
    const cell = grid[k];
    const timeKey = day + '|' + period;
    if (cell.prof) {
      byProf[cell.prof] = byProf[cell.prof] || {};
      byProf[cell.prof][timeKey] = (byProf[cell.prof][timeKey] || 0) + 1;
    }
    if (cell.room) {
      byRoom[cell.room] = byRoom[cell.room] || {};
      byRoom[cell.room][timeKey] = (byRoom[cell.room][timeKey] || 0) + 1;
    }
  });
  const issues = [];
  Object.keys(byProf).forEach(function (p) {
    Object.keys(byProf[p]).forEach(function (tk) {
      if (byProf[p][tk] > 1) { const [d, per] = tk.split('|'); issues.push(p + ' 교수님이 ' + d + '요일 ' + per + '교시에 ' + byProf[p][tk] + '번 중복 배치되어 있습니다.'); }
    });
  });
  Object.keys(byRoom).forEach(function (r) {
    Object.keys(byRoom[r]).forEach(function (tk) {
      if (byRoom[r][tk] > 1) { const [d, per] = tk.split('|'); issues.push(r + '이(가) ' + d + '요일 ' + per + '교시에 ' + byRoom[r][tk] + '번 중복 배치되어 있습니다.'); }
    });
  });
  conflictsEl.innerHTML = '';
  if (issues.length === 0) { return; }
  const heading = document.createElement('p'); heading.textContent = '\u26A0 충돌 감지 ' + issues.length + '건 (1·2학년 전체 기준)';
  conflictsEl.appendChild(heading);
  issues.forEach(function (msg) { const div = document.createElement('div'); div.textContent = msg; conflictsEl.appendChild(div); });
}

// ---------- 초기화 ----------

cardSearchEl.addEventListener('input', renderCards);
document.getElementById('reset-btn').addEventListener('click', function () {
  if (confirm('현재 편집 내용을 지우고 원본 시간표 상태로 되돌릴까요?')) resetToOriginal();
});
document.querySelectorAll('.grade-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.grade-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentGrade = btn.getAttribute('data-grade');
    renderBoard();
  });
});

if (!loadState()) { grid = gridFromCurrent(); saveState(); }
renderCards();
renderSelectedBanner();
renderBoard();
