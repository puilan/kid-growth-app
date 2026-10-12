// ============================================================
// 成长小达人 - 主逻辑
// ============================================================

// ---------- Emoji 数据 ----------
const EMOJIS = [
  '⭐', '🌟', '✨', '💫', '🌈', '☀️', '🌙', '⚡', '🔥', '💥',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '💖',
  '📚', '📖', '✏️', '📝', '📌', '📎', '📐', '🎨',
  '🏃', '⚽', '🏀', '🏸', '🏓', '🏊', '🚴', '🤸',
  '🪥', '🛁', '🛏️', '🍎', '🥗', '🥛', '💧', '💊',
  '🌱', '🌳', '🌺', '🌻', '🍀', '🌷', '🌹', '🌸',
  '🎁', '🎈', '🎉', '🎊', '🍦', '🍭', '🍩', '🍪',
  '🚗', '🚂', '✈️', '🚀', '🛸', '⛵', '🚲', '🛴',
  '🐱', '🐶', '🐰', '🐻', '🐼', '🦊', '🐯', '🦁',
  '🎵', '🎸', '🎮', '🎲', '🎯', '🎪', '🎭', '🎬'
];

const CATEGORIES = {
  '生活习惯':     { color: '#FFC93C', icon: '🪥' },
  '家庭基础家规': { color: '#FF6B9D', icon: '🏠' },
  '运动习惯':     { color: '#6BCB77', icon: '🏃' },
  '学习习惯':     { color: '#4D96FF', icon: '📚' }
};

// 任务预设模板（首次使用时引导选择）
const TASK_TEMPLATES = {
  '生活习惯': [
    { title: '刷牙', icon: '🪥', points: 1, description: '早晚各一次' },
    { title: '洗脸', icon: '🧼', points: 1 },
    { title: '整理自己的玩具', icon: '🧸', points: 2 },
    { title: '按时睡觉', icon: '🛏️', points: 2, description: '9点前上床' },
    { title: '自己穿衣服', icon: '👕', points: 1 }
  ],
  '家庭基础家规': [
    { title: '自己吃饭', icon: '🍚', points: 1 },
    { title: '礼貌用语', icon: '🙏', points: 1, description: '请、谢谢、对不起' },
    { title: '主动打招呼', icon: '👋', points: 1 },
    { title: '爱护自己的物品', icon: '💝', points: 2 },
    { title: '收拾自己的房间', icon: '🛋️', points: 3, recurrence: 'weekends' }
  ],
  '运动习惯': [
    { title: '跳绳', icon: '🤸', points: 5, description: '100个' },
    { title: '跑步', icon: '🏃', points: 5 },
    { title: '户外活动', icon: '🌳', points: 3 },
    { title: '打球', icon: '⚽', points: 5 }
  ],
  '学习习惯': [
    { title: '阅读', icon: '📚', points: 3, description: '20分钟' },
    { title: '练字', icon: '✏️', points: 3 },
    { title: '复习当天所学', icon: '📝', points: 2 },
    { title: '练琴', icon: '🎹', points: 5, recurrence: 'weekdays' }
  ]
};

// ---------- 状态 ----------
const state = {
  tasks: [],
  checkins: [],
  wishes: [],
  weeklyRewards: [],
  currentView: 'today',
  editingTaskId: null,
  editingWishId: null,
  selectedCustomDays: [1, 2, 3, 4, 5],
  selectedDate: '', // 当前选中的日期（默认今天）
  calendarMode: 'month',
  calendarMonth: '',
  calendarYear: 0
};

// ---------- 工具函数 ----------
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function todayStr() {
  return dateStr(new Date());
}

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ---------- IndexedDB ----------
const DB_NAME = 'kid_growth_app';
const DB_VERSION = 2;
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onupgradeneeded = (e) => {
      const _db = req.result;
      if (!_db.objectStoreNames.contains('tasks')) _db.createObjectStore('tasks', { keyPath: 'id' });
      if (!_db.objectStoreNames.contains('checkins')) _db.createObjectStore('checkins', { keyPath: 'id' });
      if (!_db.objectStoreNames.contains('wishes')) _db.createObjectStore('wishes', { keyPath: 'id' });
      if (!_db.objectStoreNames.contains('weeklyRewards')) _db.createObjectStore('weeklyRewards', { keyPath: 'id' });
    };
  });
}

function dbGet(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(store, obj) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(obj);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function loadData() {
  state.tasks = await dbGet('tasks');
  state.checkins = await dbGet('checkins');
  state.wishes = await dbGet('wishes');
  state.weeklyRewards = await dbGet('weeklyRewards');
}

// ---------- 渲染 ----------
function render() {
  renderPoints();
  renderCurrentView();
}

function renderPoints() {
  const total = calculateTotalPoints();
  const el = document.getElementById('totalPoints');
  const prev = parseInt(el.textContent) || 0;
  el.textContent = total;
  if (total > prev) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
}

function renderCurrentView() {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${state.currentView}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === state.currentView);
  });

  switch (state.currentView) {
    case 'today': renderToday(); break;
    case 'tasks': renderTasks(); break;
    case 'wishes': renderWishes(); break;
    case 'stats': renderStats(); break;
  }
}

function switchView(name) {
  state.currentView = name;
  renderCurrentView();
}

window.switchView = switchView;

// ----- 今日视图 -----
function renderToday() {
  if (!state.selectedDate) state.selectedDate = todayStr();
  const selectedDate = state.selectedDate;
  const today = todayStr();
  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;

  document.getElementById('todayDate').textContent = formatTodayHeader(new Date(selectedDate + 'T00:00:00'), isToday);
  document.getElementById('todayTip').textContent = isToday
    ? '💡 点任务打卡 · 点上面的日期可以补卡'
    : (isFuture ? '⏳ 这是未来的日期，还没到呢' : '📌 补卡模式：点任务可以勾选/取消当天的打卡');

  renderDateStrip(selectedDate, today);

  const tasks = getTasksForDate(new Date(selectedDate + 'T00:00:00'));
  const list = document.getElementById('todayTasks');
  const empty = document.getElementById('todayEmpty');

  if (tasks.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    document.getElementById('todayEmptyText').textContent = isToday ? '今天还没有任务哦~' : '这天还没有任务哦~';
    return;
  }
  empty.hidden = true;

  const dayCheckins = state.checkins.filter(c => c.date === selectedDate && !c.isWeeklyBonus);
  const checkedTaskIds = new Set(dayCheckins.map(c => c.taskId));

  const grouped = {};
  tasks.forEach(t => {
    const cat = t.category || '其他';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  });

  // 按预设分类排序，自定义放最后
  const order = ['生活习惯', '家庭基础家规', '运动习惯', '学习习惯'];
  const sortedCats = Object.keys(grouped).sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  let html = '';
  for (const cat of sortedCats) {
    const catInfo = CATEGORIES[cat] || { icon: '📌', color: '#A0AEC0' };
    html += `<div class="category-group">`;
    html += `<div class="category-label">${catInfo.icon} ${escapeHtml(cat)}</div>`;
    grouped[cat].forEach(task => {
      html += renderTaskCard(task, checkedTaskIds.has(task.id), catInfo.color, !isFuture);
    });
    html += '</div>';
  }

  list.innerHTML = html;
  attachTaskCardListeners(!isFuture);
}

function renderDateStrip(selectedDate, today) {
  const strip = document.getElementById('dateStrip');
  if (!strip) return;
  // 显示今天 + 过去 6 天 = 最近 7 天
  const dates = [];
  const t = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(t);
    d.setDate(t.getDate() - i);
    dates.push(d);
  }
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  strip.innerHTML = dates.map(d => {
    const ds = dateStr(d);
    const isToday = ds === today;
    const isSelected = ds === selectedDate;

    // 计算当天完成情况
    const tasksForDay = getTasksForDate(d);
    const dayCheckins = state.checkins.filter(c => c.date === ds && !c.isWeeklyBonus);
    const completed = tasksForDay.filter(task => dayCheckins.some(c => c.taskId === task.id)).length;
    const total = tasksForDay.length;
    const isComplete = total > 0 && completed === total;
    const hasPartial = completed > 0 && !isComplete;

    let indicator = '';
    if (isComplete) {
      indicator = '<div class="date-pill-dot" style="background: var(--color-success)"></div>';
    } else if (hasPartial) {
      indicator = '<div class="date-pill-dot" style="background: var(--color-primary)"></div>';
    }

    return `
      <button type="button" class="date-pill ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" data-date="${ds}">
        <div class="date-pill-day">${isToday ? '今' : weekdays[d.getDay()]}</div>
        <div class="date-pill-date">${d.getDate()}</div>
        ${indicator}
      </button>
    `;
  }).join('');

  strip.querySelectorAll('.date-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const newDate = pill.dataset.date;
      if (newDate > todayStr()) return; // 未来日期不可选
      state.selectedDate = newDate;
      renderToday();
    });
  });
}

function getTasksForDate(date) {
  return state.tasks.filter(task => shouldTaskAppearOnDate(task, date));
}

function formatTodayHeader(d, isToday) {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const prefix = isToday ? '今天' : '';
  return `${prefix}${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${weekdays[d.getDay()]}`;
}

function formatTodayHeader(d) {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${weekdays[d.getDay()]}`;
}

function renderTaskCard(task, checked, color, showCheck) {
  const catColor = color || (CATEGORIES[task.category] || {}).color || '#4D96FF';
  return `
    <div class="task-card ${checked ? 'completed' : ''}" data-task-id="${task.id}" style="--cat-color: ${catColor}">
      <div class="task-icon">${task.icon || '⭐'}</div>
      <div class="task-info">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="badge">${escapeHtml(task.category)}</span>
          ${task.description ? `<span>${escapeHtml(task.description)}</span>` : ''}
        </div>
      </div>
      <div class="task-points">+${task.points}</div>
      ${showCheck ? '<div class="task-check"></div>' : ''}
    </div>
  `;
}

function attachTaskCardListeners(inTodayView) {
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.taskId;
      if (inTodayView) {
        toggleCheckin(id);
      } else {
        openTaskModal(id);
      }
    });
  });
}

// ----- 任务视图 -----
function renderTasks() {
  const list = document.getElementById('tasksList');
  const empty = document.getElementById('tasksEmpty');

  if (state.tasks.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.innerHTML = state.tasks.map(task => {
    const color = (CATEGORIES[task.category] || {}).color || '#A0AEC0';
    return renderTaskCard(task, false, color, false);
  }).join('');
  attachTaskCardListeners(false);
}

// ----- 愿望视图 -----
function renderWishes() {
  const list = document.getElementById('wishesList');
  const empty = document.getElementById('wishesEmpty');

  if (state.wishes.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const total = calculateTotalPoints();
  // 按可兑换优先排序
  const sorted = [...state.wishes].sort((a, b) => {
    if (a.redeemed !== b.redeemed) return a.redeemed ? 1 : -1;
    return a.pointsCost - b.pointsCost;
  });

  list.innerHTML = sorted.map(wish => {
    const canRedeem = !wish.redeemed && total >= wish.pointsCost;
    return `
      <div class="wish-card ${wish.redeemed ? 'redeemed' : ''} ${canRedeem ? 'can-redeem' : ''}" data-wish-id="${wish.id}">
        <div class="wish-icon">${wish.icon || '🎁'}</div>
        <div class="wish-title">${escapeHtml(wish.title)}</div>
        <div class="wish-cost">⭐ ${wish.pointsCost}</div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.wish-card').forEach(card => {
    card.addEventListener('click', () => {
      openWishModal(card.dataset.wishId);
    });
  });
}

// ----- 统计视图 -----
function renderStats() {
  document.getElementById('statTotalPoints').textContent = calculateTotalPoints();
  document.getElementById('statTotalCheckins').textContent = state.checkins.filter(c => !c.isWeeklyBonus).length;
  document.getElementById('statStreak').textContent = calculateStreak();

  renderWeekCard();
  renderCalendar();
  renderCategoryStats();
  renderRedeemedList();
  renderWeeklyRewardsList();
}

function renderWeeklyRewardsList() {
  const container = document.getElementById('weeklyRewardsList');
  const rewards = [...state.weeklyRewards].sort((a, b) => (b.grantedAt || 0) - (a.grantedAt || 0));

  if (rewards.length === 0) {
    container.innerHTML = '<div class="empty-redeemed">还没有周奖励记录，加油💪</div>';
    return;
  }

  container.innerHTML = rewards.map(r => {
    const isCash = r.rewardType === 'cash';
    const icon = isCash ? '💰' : '⭐';
    const label = isCash ? `${r.rewardValue} 元零花钱` : `${r.rewardValue} 积分`;
    const status = isCash
      ? (r.cashGiven ? '<span style="color:var(--color-success)">✓ 已发放</span>' : '<span style="color:var(--color-secondary-dark)">⏳ 待发放</span>')
      : '<span style="color:var(--color-success)">✓ 入账</span>';
    return `
      <div class="weekly-reward-item ${isCash ? 'cash' : 'points'}">
        <div class="weekly-reward-icon">${icon}</div>
        <div class="weekly-reward-info">
          <div class="weekly-reward-title">${label}</div>
          <div class="weekly-reward-meta">${r.weekStart} · 完成率 ${(r.completionRate * 100).toFixed(0)}% · ${status}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderWeekCard() {
  const stats = getCurrentWeekStats();
  const card = document.getElementById('weekCard');
  const rateText = `${(stats.rate * 100).toFixed(0)}%`;
  const countText = `${stats.totalCompleted}/${stats.totalExpected}`;

  const existing = state.weeklyRewards.find(r => r.weekStart === stats.weekStart);
  let statusBadge = '';
  if (existing) {
    if (existing.rewardType === 'cash') {
      statusBadge = existing.cashGiven ? '<span class="week-badge week-badge-done">💰 已发放</span>' : '<span class="week-badge week-badge-pending">💰 待发放</span>';
    } else {
      statusBadge = '<span class="week-badge week-badge-done">⭐ 已奖励</span>';
    }
  } else if (stats.rate >= 0.9) {
    statusBadge = '<span class="week-badge week-badge-ready">🎁 可领取</span>';
  } else if (stats.rate >= 0.7) {
    statusBadge = '<span class="week-badge week-badge-ready">⭐ 可领取</span>';
  }

  document.getElementById('weekRange').textContent = `${stats.weekStart} ~ ${stats.weekEnd}`;
  document.getElementById('weekCount').textContent = countText;
  document.getElementById('weekRate').textContent = rateText;
  document.getElementById('weekRateFill').style.width = `${Math.min(100, stats.rate * 100)}%`;
  document.getElementById('weekRewardHint').innerHTML = `
    70% 以上奖励 <b>7 积分</b> · 90% 以上奖励 <b>5 元零花钱</b>
    ${statusBadge}
  `;

  const btn = document.getElementById('btnSettleWeek');
  if (existing) {
    btn.textContent = '查看本周奖励';
  } else if (stats.totalExpected === 0) {
    btn.textContent = '本周还没有任务';
    btn.disabled = true;
  } else {
    btn.textContent = '结算本周奖励';
    btn.disabled = false;
  }
  btn.disabled = stats.totalExpected === 0 && !existing;
}

function renderCalendar() {
  const mode = state.calendarMode || 'month';
  const monthEl = document.getElementById('calendarMonth');
  const yearEl = document.getElementById('calendarYear');
  if (monthEl) monthEl.hidden = mode !== 'month';
  if (yearEl) yearEl.hidden = mode !== 'year';
  document.querySelectorAll('.mode-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });
  if (mode === 'month') renderMonthCalendar();
  else renderYearCalendar();
}

function renderMonthCalendar() {
  if (!state.calendarMonth) {
    const t = new Date();
    state.calendarMonth = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  }
  const [y, m] = state.calendarMonth.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startWeekday = firstDay.getDay();

  const counts = {};
  state.checkins.forEach(c => {
    if (c.isWeeklyBonus) return;
    counts[c.date] = (counts[c.date] || 0) + 1;
  });

  document.getElementById('monthTitle').textContent = `${y} 年 ${m} 月`;

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  let html = '<div class="month-cal-header">';
  weekdays.forEach(d => { html += `<div>${d}</div>`; });
  html += '</div><div class="month-grid">';

  for (let i = 0; i < startWeekday; i++) {
    html += '<div class="month-day empty"></div>';
  }

  const today = todayStr();
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = counts[ds] || 0;
    const isToday = ds === today;
    const isFuture = ds > today;
    const hasMany = count >= 3;
    html += `
      <div class="month-day ${count > 0 ? 'has-checkin' : ''} ${hasMany ? 'has-many' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}" data-date="${ds}" title="${ds}${count ? ' · 完成 ' + count + ' 个' : ''}">
        <div>${d}</div>
        ${count > 0 ? `<div class="month-day-count">${count}</div>` : ''}
      </div>
    `;
  }
  html += '</div>';
  document.getElementById('monthCalendar').innerHTML = html;

  // 点击某天 → 切到今日页面并选中该天
  document.querySelectorAll('.month-day:not(.empty):not(.future)').forEach(day => {
    day.addEventListener('click', () => {
      state.selectedDate = day.dataset.date;
      switchView('today');
    });
  });

  // 月度汇总
  const monthCheckins = state.checkins.filter(c =>
    c.date.startsWith(state.calendarMonth) && !c.isWeeklyBonus
  );
  const activeDays = new Set(monthCheckins.map(c => c.date)).size;
  const monthRate = daysInMonth > 0 ? Math.round((activeDays / daysInMonth) * 100) : 0;
  document.getElementById('monthSummary').innerHTML = `
    本月完成 <b>${monthCheckins.length}</b> 次 · 打卡 <b>${activeDays}</b> 天 · 完成率 <b>${monthRate}%</b>
  `;
}

function renderYearCalendar() {
  if (!state.calendarYear) state.calendarYear = new Date().getFullYear();
  const year = state.calendarYear;
  document.getElementById('yearTitle').textContent = `${year} 年`;

  const counts = {};
  state.checkins.forEach(c => {
    if (c.isWeeklyBonus) return;
    counts[c.date] = (counts[c.date] || 0) + 1;
  });

  // GitHub 风格热力图：53 周 × 7 天
  const startDate = new Date(year, 0, 1);
  const firstWeekday = startDate.getDay();
  const gridStart = new Date(startDate);
  gridStart.setDate(startDate.getDate() - firstWeekday);

  const today = todayStr();
  let html = '';
  const cursor = new Date(gridStart);

  for (let week = 0; week < 53; week++) {
    html += '<div class="year-week">';
    for (let day = 0; day < 7; day++) {
      const d = new Date(cursor);
      const ds = dateStr(d);
      const inYear = d.getFullYear() === year;
      const count = counts[ds] || 0;
      const isFuture = ds > today;
      let levelClass = '';
      if (count >= 4) levelClass = 'l4';
      else if (count === 3) levelClass = 'l3';
      else if (count === 2) levelClass = 'l2';
      else if (count === 1) levelClass = 'l1';
      html += `<div class="year-day ${levelClass} ${isFuture ? 'future' : ''} ${!inYear ? 'out-of-year' : ''}" data-date="${ds}" title="${ds}${count ? ' · ' + count + ' 个' : ''}"></div>`;
    }
    html += '</div>';
    cursor.setDate(cursor.getDate() + 7);
  }

  document.getElementById('yearHeatmap').innerHTML = html;

  // 年汇总
  const yearCheckins = state.checkins.filter(c =>
    c.date.startsWith(String(year)) && !c.isWeeklyBonus
  );
  const activeDays = new Set(yearCheckins.map(c => c.date)).size;
  document.getElementById('yearSummary').innerHTML = `
    本年完成 <b>${yearCheckins.length}</b> 次 · 打卡 <b>${activeDays}</b> 天
  `;

  // 点击某天 → 切到月视图选中月份 + 今日页
  document.querySelectorAll('.year-day:not(.future):not(.out-of-year)').forEach(day => {
    day.addEventListener('click', () => {
      const ds = day.dataset.date;
      state.calendarMonth = ds.substring(0, 7);
      state.calendarMode = 'month';
      state.selectedDate = ds;
      switchView('today');
    });
  });
}

function shiftMonth(delta) {
  const [y, m] = state.calendarMonth.split('-').map(Number);
  let newY = y, newM = m + delta;
  if (newM < 1) { newY--; newM = 12; }
  if (newM > 12) { newY++; newM = 1; }
  state.calendarMonth = `${newY}-${String(newM).padStart(2, '0')}`;
  renderMonthCalendar();
}

function shiftYear(delta) {
  state.calendarYear += delta;
  renderYearCalendar();
}

function renderCategoryStats() {
  const container = document.getElementById('categoryStats');

  const counts = {};
  const allCats = new Set();
  state.tasks.forEach(t => allCats.add(t.category));

  state.checkins.forEach(c => {
    const task = state.tasks.find(t => t.id === c.taskId);
    if (task) {
      counts[task.category] = (counts[task.category] || 0) + 1;
      allCats.add(task.category);
    }
  });

  if (allCats.size === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:20px;font-size:13px">还没有任务数据</p>';
    return;
  }

  const maxCount = Math.max(1, ...Object.values(counts));

  const order = ['学习', '运动', '生活', '好习惯'];
  const sortedCats = [...allCats].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  let html = '';
  sortedCats.forEach(cat => {
    const count = counts[cat] || 0;
    const pct = (count / maxCount) * 100;
    const knownCat = CATEGORIES[cat];
    const icon = knownCat ? knownCat.icon : '📌';
    html += `
      <div class="cat-stat">
        <div class="cat-stat-icon">${icon}</div>
        <div class="cat-stat-info">
          <div class="cat-stat-name">${escapeHtml(cat)}</div>
          <div class="cat-stat-bar"><div class="cat-stat-bar-fill" style="width: ${pct}%"></div></div>
        </div>
        <div class="cat-stat-value">${count}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderRedeemedList() {
  const container = document.getElementById('redeemedList');
  const redeemed = state.wishes.filter(w => w.redeemed)
    .sort((a, b) => (b.redeemedAt || 0) - (a.redeemedAt || 0));

  if (redeemed.length === 0) {
    container.innerHTML = '<div class="empty-redeemed">还没有兑换过愿望哦~加油攒积分 🎯</div>';
    return;
  }

  container.innerHTML = redeemed.map(wish => {
    const date = new Date(wish.redeemedAt);
    const dateStr2 = `${date.getMonth() + 1}/${date.getDate()}`;
    return `
      <div class="redeemed-item">
        <div class="redeemed-item-icon">${wish.icon || '🎁'}</div>
        <div class="redeemed-item-info">
          <div class="redeemed-item-title">${escapeHtml(wish.title)}</div>
          <div class="redeemed-item-date">${dateStr2} 兑换</div>
        </div>
        <div class="redeemed-item-cost">⭐ ${wish.pointsCost}</div>
      </div>
    `;
  }).join('');
}

// ---------- 任务逻辑 ----------
function getTasksForToday(date) {
  const dayOfWeek = date.getDay();
  return state.tasks.filter(task => shouldTaskAppearOnDate(task, date));
}

function shouldTaskAppearOnDate(task, date) {
  const dayOfWeek = date.getDay();
  const rec = task.recurrence || 'daily';
  if (rec === 'daily') return true;
  if (rec === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (rec === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
  if (rec === 'custom') return (task.customDays || []).includes(dayOfWeek);
  return true;
}

async function toggleCheckin(taskId) {
  const targetDate = state.selectedDate || todayStr();
  const today = todayStr();
  const isToday = targetDate === today;
  const existing = state.checkins.find(c => c.taskId === taskId && c.date === targetDate);
  const task = state.tasks.find(t => t.id === taskId);

  if (existing) {
    await dbDelete('checkins', existing.id);
    state.checkins = state.checkins.filter(c => c.id !== existing.id);
    toast(isToday ? '已取消打卡' : '已取消补卡');
  } else {
    const checkin = {
      id: uuid(),
      taskId,
      date: targetDate,
      completedAt: Date.now()
    };
    await dbPut('checkins', checkin);
    state.checkins.push(checkin);

    if (task) {
      showParticles(task.icon);
      playDing();
      vibrate([30, 50, 80]);
      if (isToday) {
        toast(`+${task.points} 分！${task.title} 完成 🎉`, 'success');
      } else {
        toast(`已补卡：${task.title} ✓`, 'success');
      }
    }
  }

  render();
}

// ---------- 愿望逻辑 ----------
async function redeemWish(wishId) {
  const wish = state.wishes.find(w => w.id === wishId);
  if (!wish || wish.redeemed) return;

  const total = calculateTotalPoints();
  if (total < wish.pointsCost) {
    toast(`还差 ${wish.pointsCost - total} 分哦，再加油！`, 'error');
    return;
  }

  wish.redeemed = true;
  wish.redeemedAt = Date.now();
  await dbPut('wishes', wish);

  showRewardModal(wish);
  playDing();
  vibrate([50, 50, 50, 50, 100]);
  render();
}

function showRewardModal(wish) {
  document.getElementById('rewardIcon').textContent = wish.icon || '🎁';
  document.getElementById('rewardTitle').textContent = wish.title;
  document.getElementById('rewardModal').hidden = false;
}

// ---------- 积分计算 ----------
function calculateTotalPoints() {
  let total = 0;
  state.checkins.forEach(c => {
    if (c.isWeeklyBonus) {
      total += (c.points || 0);
    } else {
      const task = state.tasks.find(t => t.id === c.taskId);
      if (task) total += task.points;
    }
  });
  state.wishes.filter(w => w.redeemed).forEach(w => {
    total -= w.pointsCost;
  });
  return Math.max(0, total);
}

function calculateTotalCashEarned() {
  // 周奖励已发放的现金总和
  return state.weeklyRewards
    .filter(r => r.rewardType === 'cash' && r.cashGiven)
    .reduce((sum, r) => sum + (r.rewardValue || 0), 0);
}

// ---------- 周结算 ----------
function getWeekRange(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  const monday = new Date(d);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function getCurrentWeekStats() {
  const { monday, sunday } = getWeekRange();
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const endDate = today < sunday ? today : sunday;

  let totalExpected = 0;
  let totalCompleted = 0;

  state.tasks.forEach(task => {
    let expected = 0;
    const completedDates = new Set();
    for (let d = new Date(monday); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (shouldTaskAppearOnDate(task, d)) {
        expected++;
        const ds = dateStr(d);
        state.checkins.forEach(c => {
          if (c.taskId === task.id && c.date === ds && !c.isWeeklyBonus) {
            completedDates.add(ds);
          }
        });
      }
    }
    totalExpected += expected;
    totalCompleted += Math.min(completedDates.size, expected);
  });

  const rate = totalExpected > 0 ? totalCompleted / totalExpected : 0;
  return {
    weekStart: dateStr(monday),
    weekEnd: dateStr(endDate),
    totalExpected,
    totalCompleted,
    rate,
    monday,
    sunday: endDate
  };
}

async function settleWeek() {
  const stats = getCurrentWeekStats();

  if (stats.totalExpected === 0) {
    toast('本周没有应做的任务，先去"任务"页添加吧~', 'info');
    return;
  }

  const existing = state.weeklyRewards.find(r => r.weekStart === stats.weekStart);
  if (existing) {
    showWeekResultModal(existing);
    return;
  }

  const rate = stats.rate;
  let reward = null;

  if (rate >= 0.9 && rate <= 1.0001) {
    reward = { type: 'cash', value: 5 };
  } else if (rate >= 0.7 && rate < 0.9) {
    reward = { type: 'points', value: 7 };
  }

  let record = null;
  if (reward) {
    record = {
      id: uuid(),
      weekStart: stats.weekStart,
      weekEnd: stats.weekEnd,
      completionRate: rate,
      rewardType: reward.type,
      rewardValue: reward.value,
      grantedAt: Date.now(),
      cashGiven: false
    };
    await dbPut('weeklyRewards', record);
    state.weeklyRewards.push(record);

    if (reward.type === 'points') {
      // 把周奖励积分加到积分池（用特殊 checkin 表示）
      const bonus = {
        id: uuid(),
        taskId: '__weekly_bonus__',
        taskTitle: `周奖励（${stats.weekStart}）`,
        points: reward.value,
        date: dateStr(new Date()),
        completedAt: Date.now(),
        isWeeklyBonus: true
      };
      await dbPut('checkins', bonus);
      state.checkins.push(bonus);
    }
  }

  showWeekResultModal({ record, reward, rate });
  render();
}

async function markCashGiven() {
  // 标记本周零花钱已发放
  const stats = getCurrentWeekStats();
  const record = state.weeklyRewards.find(r => r.weekStart === stats.weekStart);
  if (!record || record.cashGiven) return;

  record.cashGiven = true;
  record.cashGivenAt = Date.now();
  await dbPut('weeklyRewards', record);

  toast('已标记为已发放 ✓', 'success');
  document.getElementById('weekResultModal').hidden = true;
  render();
}

function showWeekResultModal({ record, reward, rate }) {
  const modal = document.getElementById('weekResultModal');
  const iconEl = document.getElementById('weekResultIcon');
  const titleEl = document.getElementById('weekResultTitle');
  const detailEl = document.getElementById('weekResultDetail');
  const rewardRow = document.getElementById('weekRewardRow');
  const cashBtn = document.getElementById('btnCashGiven');
  const closeBtn = document.getElementById('btnCloseWeekResult');
  const rateText = `${(rate * 100).toFixed(0)}%`;

  if (reward && record) {
    if (reward.type === 'cash') {
      iconEl.textContent = '💰';
      titleEl.textContent = `+${reward.value} 元零花钱`;
      detailEl.innerHTML = `本周完成率 <b>${rateText}</b>（${record.weekStart} ~ ${record.weekEnd}）`;
      cashBtn.hidden = false;
      cashBtn.textContent = record.cashGiven ? '✓ 已领取' : '✅ 已发放，标记一下';
      cashBtn.disabled = record.cashGiven;
      closeBtn.textContent = '关闭';
      playRewardFanfare();
    } else {
      iconEl.textContent = '⭐';
      titleEl.textContent = `+${reward.value} 积分`;
      detailEl.innerHTML = `本周完成率 <b>${rateText}</b>（${record.weekStart} ~ ${record.weekEnd}）`;
      cashBtn.hidden = true;
      closeBtn.textContent = '太棒了！';
      playRewardFanfare();
    }
  } else {
    iconEl.textContent = '💪';
    titleEl.textContent = '本周没达到奖励线';
    detailEl.innerHTML = `完成率 ${rateText}（≥70% 才奖励哦）<br>下周继续加油~`;
    cashBtn.hidden = true;
    closeBtn.textContent = '知道了';
  }

  modal.hidden = false;
}

function playRewardFanfare() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C(high)
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch (e) {}
}

function calculateStreak() {
  if (state.checkins.length === 0) return 0;
  const dates = new Set(state.checkins.map(c => c.date));
  let streak = 0;
  const d = new Date();

  // 如果今天没打卡，从昨天开始算
  if (!dates.has(dateStr(d))) {
    d.setDate(d.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    if (dates.has(dateStr(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ---------- 任务表单 ----------
function openTaskModal(taskId = null) {
  state.editingTaskId = taskId;
  const modal = document.getElementById('taskModal');
  const title = document.getElementById('taskModalTitle');
  const deleteBtn = document.getElementById('btnDeleteTask');

  if (taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    title.textContent = '编辑任务';
    deleteBtn.hidden = false;
    fillTaskForm(task);
  } else {
    title.textContent = '新建任务';
    deleteBtn.hidden = true;
    resetTaskForm();
  }

  modal.hidden = false;
}

function closeTaskModal() {
  document.getElementById('taskModal').hidden = true;
  state.editingTaskId = null;
}

function fillTaskForm(task) {
  document.getElementById('taskId').value = task.id;
  document.getElementById('taskTitle').value = task.title || '';
  document.getElementById('taskIcon').value = task.icon || '⭐';
  document.getElementById('taskCategory').value = CATEGORIES[task.category] ? task.category : 'custom';
  if (!CATEGORIES[task.category]) {
    document.getElementById('taskCategoryCustom').value = task.category;
    document.getElementById('taskCategoryCustom').hidden = false;
  }
  const pointsPills = [1, 2, 5, 10];
  document.getElementById('taskPoints').value = pointsPills.includes(task.points) ? String(task.points) : 'custom';
  if (!pointsPills.includes(task.points)) {
    document.getElementById('taskPointsCustom').value = task.points;
    document.getElementById('taskPointsCustom').hidden = false;
  }
  document.getElementById('taskRecurrence').value = task.recurrence || 'daily';
  document.getElementById('taskDescription').value = task.description || '';
  state.selectedCustomDays = task.customDays || [];

  updatePillUI();
  updateWeekdayUI();
  updateEmojiUI('emojiPicker', task.icon || '⭐');
}

function resetTaskForm() {
  document.getElementById('taskId').value = '';
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskIcon').value = '⭐';
  document.getElementById('taskCategory').value = '学习';
  document.getElementById('taskCategoryCustom').value = '';
  document.getElementById('taskCategoryCustom').hidden = true;
  document.getElementById('taskPoints').value = '1';
  document.getElementById('taskPointsCustom').value = '';
  document.getElementById('taskPointsCustom').hidden = true;
  document.getElementById('taskRecurrence').value = 'daily';
  document.getElementById('taskDescription').value = '';
  state.selectedCustomDays = [1, 2, 3, 4, 5];

  updatePillUI();
  updateWeekdayUI();
  updateEmojiUI('emojiPicker', '⭐');
}

function updatePillUI() {
  const category = document.getElementById('taskCategory').value;
  const points = document.getElementById('taskPoints').value;
  const recurrence = document.getElementById('taskRecurrence').value;

  document.querySelectorAll('#categoryPills .pill').forEach(p => {
    p.classList.toggle('selected', p.dataset.category === category);
  });
  document.querySelectorAll('#pointsPills .pill').forEach(p => {
    p.classList.toggle('selected', p.dataset.points === points);
  });
  document.querySelectorAll('#recurrencePills .pill').forEach(p => {
    p.classList.toggle('selected', p.dataset.recurrence === recurrence);
  });
}

function updateWeekdayUI() {
  document.querySelectorAll('.day-pill').forEach(p => {
    p.classList.toggle('selected', state.selectedCustomDays.includes(Number(p.dataset.day)));
  });
}

function updateEmojiUI(containerId, value) {
  document.querySelectorAll(`#${containerId} .emoji-pill`).forEach(p => {
    p.classList.toggle('selected', p.dataset.icon === value);
  });
}

async function saveTask(e) {
  e.preventDefault();

  const id = document.getElementById('taskId').value || uuid();
  let category = document.getElementById('taskCategory').value;
  if (category === 'custom') {
    category = document.getElementById('taskCategoryCustom').value.trim() || '其他';
  }

  let points = document.getElementById('taskPoints').value;
  if (points === 'custom') {
    points = parseInt(document.getElementById('taskPointsCustom').value) || 1;
  } else {
    points = parseInt(points);
  }
  points = Math.max(1, Math.min(999, points));

  const recurrence = document.getElementById('taskRecurrence').value;
  let customDays = state.selectedCustomDays;
  if (recurrence === 'custom' && customDays.length === 0) {
    customDays = [0, 1, 2, 3, 4, 5, 6];
  }

  const task = {
    id,
    title: document.getElementById('taskTitle').value.trim(),
    icon: document.getElementById('taskIcon').value,
    category,
    points,
    recurrence,
    customDays: recurrence === 'custom' ? customDays : [],
    description: document.getElementById('taskDescription').value.trim(),
    createdAt: (state.tasks.find(t => t.id === id) || {}).createdAt || Date.now()
  };

  if (!task.title) {
    toast('请输入任务名称', 'error');
    return;
  }

  await dbPut('tasks', task);
  const existingIdx = state.tasks.findIndex(t => t.id === id);
  if (existingIdx >= 0) {
    state.tasks[existingIdx] = task;
  } else {
    state.tasks.push(task);
  }

  closeTaskModal();
  toast('已保存 ✨', 'success');
  render();
}

async function deleteTask() {
  if (!state.editingTaskId) return;
  if (!confirm('确定要删除这个任务吗？\n相关的打卡记录也会一并删除。')) return;

  const id = state.editingTaskId;
  await dbDelete('tasks', id);
  state.tasks = state.tasks.filter(t => t.id !== id);

  const related = state.checkins.filter(c => c.taskId === id);
  for (const c of related) {
    await dbDelete('checkins', c.id);
  }
  state.checkins = state.checkins.filter(c => c.taskId !== id);

  closeTaskModal();
  toast('已删除');
  render();
}

// ---------- 愿望表单 ----------
function openWishModal(wishId = null) {
  state.editingWishId = wishId;
  const modal = document.getElementById('wishModal');
  const title = document.getElementById('wishModalTitle');
  const deleteBtn = document.getElementById('btnDeleteWish');

  if (wishId) {
    const wish = state.wishes.find(w => w.id === wishId);
    if (!wish) return;
    title.textContent = wish.redeemed ? '愿望（已兑换）' : '愿望详情';
    deleteBtn.hidden = false;
    fillWishForm(wish);
  } else {
    title.textContent = '新建愿望';
    deleteBtn.hidden = true;
    resetWishForm();
  }

  modal.hidden = false;
}

function closeWishModal() {
  document.getElementById('wishModal').hidden = true;
  state.editingWishId = null;
}

function fillWishForm(wish) {
  document.getElementById('wishId').value = wish.id;
  document.getElementById('wishTitle').value = wish.title || '';
  document.getElementById('wishIcon').value = wish.icon || '🎁';
  document.getElementById('wishPoints').value = wish.pointsCost || 50;
  document.getElementById('wishNote').value = wish.note || '';
  updateEmojiUI('wishEmojiPicker', wish.icon || '🎁');
}

function resetWishForm() {
  document.getElementById('wishId').value = '';
  document.getElementById('wishTitle').value = '';
  document.getElementById('wishIcon').value = '🎁';
  document.getElementById('wishPoints').value = 50;
  document.getElementById('wishNote').value = '';
  updateEmojiUI('wishEmojiPicker', '🎁');
}

async function saveWish(e) {
  e.preventDefault();

  const id = document.getElementById('wishId').value || uuid();
  const existing = state.wishes.find(w => w.id === id);
  const pointsCost = Math.max(1, Math.min(9999, parseInt(document.getElementById('wishPoints').value) || 50));

  const wish = {
    id,
    title: document.getElementById('wishTitle').value.trim(),
    icon: document.getElementById('wishIcon').value,
    pointsCost,
    note: document.getElementById('wishNote').value.trim(),
    redeemed: existing ? existing.redeemed : false,
    redeemedAt: existing ? existing.redeemedAt : null,
    createdAt: existing ? existing.createdAt : Date.now()
  };

  if (!wish.title) {
    toast('请输入愿望名称', 'error');
    return;
  }

  await dbPut('wishes', wish);
  const idx = state.wishes.findIndex(w => w.id === id);
  if (idx >= 0) {
    state.wishes[idx] = wish;
  } else {
    state.wishes.push(wish);
  }

  closeWishModal();
  toast('已保存 ✨', 'success');
  render();
}

async function deleteWish() {
  if (!state.editingWishId) return;
  if (!confirm('确定要删除这个愿望吗？')) return;

  const id = state.editingWishId;
  await dbDelete('wishes', id);
  state.wishes = state.wishes.filter(w => w.id !== id);

  closeWishModal();
  toast('已删除');
  render();
}

async function redeemCurrentWish() {
  if (!state.editingWishId) return;
  const wish = state.wishes.find(w => w.id === state.editingWishId);
  if (!wish || wish.redeemed) return;
  closeWishModal();
  await redeemWish(wish.id);
}

// ---------- 效果 ----------
function showParticles(emoji) {
  const symbols = [emoji, '⭐', '✨', '🌟', '💫'];
  for (let i = 0; i < 10; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    p.style.left = (window.innerWidth / 2 + (Math.random() - 0.5) * 100) + 'px';
    p.style.top = (window.innerHeight / 2 + (Math.random() - 0.5) * 100) + 'px';
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 300}px`);
    p.style.setProperty('--dy', `${(Math.random() - 0.5) * 300 - 80}px`);
    p.style.setProperty('--rot', `${(Math.random() - 0.5) * 720}deg`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch (e) {}
}

// ---------- Toast ----------
function toast(msg, type = '') {
  const container = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => t.remove(), 300);
  }, 2200);
}

// ---------- 初始化控件 ----------
function initEmojiPicker(containerId, hiddenId) {
  const container = document.getElementById(containerId);
  EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-pill';
    btn.dataset.icon = emoji;
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      document.getElementById(hiddenId).value = emoji;
      updateEmojiUI(containerId, emoji);
    });
    container.appendChild(btn);
  });
}

function initPills() {
  document.querySelectorAll('#categoryPills .pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const value = pill.dataset.category;
      document.getElementById('taskCategory').value = value;
      document.getElementById('taskCategoryCustom').hidden = value !== 'custom';
      if (value === 'custom') {
        document.getElementById('taskCategoryCustom').focus();
      }
      updatePillUI();
    });
  });

  document.querySelectorAll('#pointsPills .pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const value = pill.dataset.points;
      document.getElementById('taskPoints').value = value;
      document.getElementById('taskPointsCustom').hidden = value !== 'custom';
      if (value === 'custom') {
        document.getElementById('taskPointsCustom').focus();
      }
      updatePillUI();
    });
  });

  document.querySelectorAll('#recurrencePills .pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const value = pill.dataset.recurrence;
      document.getElementById('taskRecurrence').value = value;
      document.getElementById('weekdayPicker').hidden = value !== 'custom';
      updatePillUI();
    });
  });
}

function initWeekdayPicker() {
  document.querySelectorAll('.day-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const day = Number(pill.dataset.day);
      const idx = state.selectedCustomDays.indexOf(day);
      if (idx >= 0) {
        state.selectedCustomDays.splice(idx, 1);
      } else {
        state.selectedCustomDays.push(day);
      }
      updateWeekdayUI();
    });
  });
}

function initNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentView = btn.dataset.view;
      renderCurrentView();
    });
  });
}

function initModals() {
  // 任务模态框
  document.getElementById('taskModalClose').addEventListener('click', closeTaskModal);
  document.getElementById('taskModal').querySelector('.modal-overlay').addEventListener('click', closeTaskModal);

  // 愿望模态框
  document.getElementById('wishModalClose').addEventListener('click', closeWishModal);
  document.getElementById('wishModal').querySelector('.modal-overlay').addEventListener('click', closeWishModal);

  // 奖励模态框
  document.getElementById('btnCloseReward').addEventListener('click', () => {
    document.getElementById('rewardModal').hidden = true;
  });
  document.getElementById('rewardModal').querySelector('.modal-overlay').addEventListener('click', () => {
    document.getElementById('rewardModal').hidden = true;
  });

  // 周结算按钮
  const btnSettle = document.getElementById('btnSettleWeek');
  if (btnSettle) {
    btnSettle.addEventListener('click', settleWeek);
  }

  // 周结算结果模态框
  const btnCash = document.getElementById('btnCashGiven');
  if (btnCash) {
    btnCash.addEventListener('click', markCashGiven);
  }
  const btnCloseWeek = document.getElementById('btnCloseWeekResult');
  if (btnCloseWeek) {
    btnCloseWeek.addEventListener('click', () => {
      document.getElementById('weekResultModal').hidden = true;
    });
  }
  const weekOverlay = document.querySelector('#weekResultModal .modal-overlay');
  if (weekOverlay) {
    weekOverlay.addEventListener('click', () => {
      document.getElementById('weekResultModal').hidden = true;
    });
  }

  // 表单提交
  document.getElementById('taskForm').addEventListener('submit', saveTask);
  document.getElementById('wishForm').addEventListener('submit', saveWish);

  // 删除按钮
  document.getElementById('btnDeleteTask').addEventListener('click', deleteTask);
  document.getElementById('btnDeleteWish').addEventListener('click', deleteWish);

  // 添加按钮
  document.getElementById('btnAddTask').addEventListener('click', () => openTaskModal());
  document.getElementById('btnAddTaskEmpty').addEventListener('click', () => openTaskModal());
  document.getElementById('btnAddWish').addEventListener('click', () => openWishModal());
  document.getElementById('btnAddWishEmpty').addEventListener('click', () => openWishModal());

  // 日历模式切换（月/年）
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.calendarMode = tab.dataset.mode;
      renderCalendar();
    });
  });

  // 月份翻页
  const monthPrev = document.getElementById('monthPrev');
  const monthNext = document.getElementById('monthNext');
  if (monthPrev) monthPrev.addEventListener('click', () => shiftMonth(-1));
  if (monthNext) monthNext.addEventListener('click', () => shiftMonth(1));

  // 年份翻页
  const yearPrev = document.getElementById('yearPrev');
  const yearNext = document.getElementById('yearNext');
  if (yearPrev) yearPrev.addEventListener('click', () => shiftYear(-1));
  if (yearNext) yearNext.addEventListener('click', () => shiftYear(1));
}

// ---------- 首次使用数据 ----------
async function seedSampleData() {
  // 新逻辑：弹出模板选择，用户勾选要加的任务
  await showTemplateModal();
  // 示例愿望
  const sampleWishes = [
    { title: '冰淇淋', icon: '🍦', pointsCost: 30, note: '周末一起去买' },
    { title: '新绘本', icon: '📖', pointsCost: 60, note: '挑一本喜欢的' },
    { title: '去公园玩', icon: '🌳', pointsCost: 100, note: '一家人一起去' }
  ];
  for (const s of sampleWishes) {
    await dbPut('wishes', {
      id: uuid(),
      ...s,
      redeemed: false,
      redeemedAt: null,
      createdAt: Date.now()
    });
  }
}

// ---------- 模板选择 ----------
async function showTemplateModal() {
  const modal = document.getElementById('templateModal');
  const list = document.getElementById('templateList');
  list.innerHTML = '';

  Object.entries(TASK_TEMPLATES).forEach(([category, templates]) => {
    const catInfo = CATEGORIES[category];
    const section = document.createElement('div');
    section.className = 'template-category';
    section.style.setProperty('--cat-color', catInfo.color);
    section.innerHTML = `
      <div class="template-cat-header">
        <span class="template-cat-icon">${catInfo.icon}</span>
        <span class="template-cat-name">${category}</span>
        <button type="button" class="template-cat-toggle" data-toggle="${category}">全选</button>
      </div>
      <div class="template-items">
        ${templates.map((t, i) => `
          <label class="template-item">
            <input type="checkbox" data-category="${category}" data-index="${i}" checked>
            <span class="template-icon">${t.icon}</span>
            <span class="template-title">${escapeHtml(t.title)}</span>
            <span class="template-points">⭐${t.points}</span>
          </label>
        `).join('')}
      </div>
    `;
    list.appendChild(section);
  });

  // 绑定全选按钮
  list.querySelectorAll('.template-cat-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.toggle;
      const checkboxes = list.querySelectorAll(`input[data-category="${cat}"]`);
      const allChecked = [...checkboxes].every(cb => cb.checked);
      checkboxes.forEach(cb => { cb.checked = !allChecked; });
      btn.textContent = allChecked ? '全选' : '取消';
    });
  });

  // 绑定应用按钮
  document.getElementById('btnApplyTemplates').onclick = applyTemplates;
  document.getElementById('btnSkipTemplates').onclick = async () => {
    modal.hidden = true;
    toast('已跳过，自己添加也可以~', 'info');
  };

  modal.hidden = false;
}

async function applyTemplates() {
  const checkboxes = document.querySelectorAll('#templateList input[type="checkbox"]:checked');
  let count = 0;
  checkboxes.forEach(cb => {
    const category = cb.dataset.category;
    const idx = parseInt(cb.dataset.index);
    const template = TASK_TEMPLATES[category][idx];
    const task = {
      id: uuid(),
      title: template.title,
      icon: template.icon,
      category,
      points: template.points,
      recurrence: template.recurrence || 'daily',
      customDays: [],
      description: template.description || '',
      createdAt: Date.now()
    };
    dbPut('tasks', task);
    state.tasks.push(task);
    count++;
  });

  document.getElementById('templateModal').hidden = true;
  toast(`已添加 ${count} 个任务，开始打卡吧！🌟`, 'success');
  render();
}

// ---------- Service Worker ----------
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW failed:', err));
  }
}

// ---------- 启动 ----------
async function init() {
  try {
    await openDB();
    await loadData();

    initEmojiPicker('emojiPicker', 'taskIcon');
    initEmojiPicker('wishEmojiPicker', 'wishIcon');
    initPills();
    initWeekdayPicker();
    initNavigation();
    initModals();

    // 首次使用引导数据
    if (state.tasks.length === 0 && state.wishes.length === 0) {
      const demoUsed = await demoSeedIfNeeded();
      if (!demoUsed) {
        await seedSampleData();
        await loadData();
        toast('欢迎使用！挑几个任务开始吧 🌱', 'info');
      }
    } else {
      await demoSeedIfNeeded();
    }

    render();
    registerSW();
  } catch (err) {
    console.error('Init failed:', err);
    toast('初始化失败：' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);

// URL 参数 ?demo=1 → 顶置示例数据让预览看效果（正常用户不会用到）
async function demoSeedIfNeeded() {
  if (new URLSearchParams(location.search).get('demo') !== '1') return false;
  // 清空现有
  for (const t of state.tasks) await dbDelete('tasks', t.id);
  for (const w of state.wishes) await dbDelete('wishes', w.id);
  state.tasks = []; state.wishes = []; state.checkins = [];
  // 预置任务
  for (const [cat, list] of Object.entries(TASK_TEMPLATES)) {
    for (const t of list) {
      const task = {
        id: uuid(),
        title: t.title, icon: t.icon, category: cat, points: t.points,
        recurrence: t.recurrence || 'daily', customDays: [],
        description: t.description || '', createdAt: Date.now()
      };
      await dbPut('tasks', task);
      state.tasks.push(task);
    }
  }
  // 预置愿望
  for (const w of [{title:'冰淇淋', icon:'🍦', pointsCost:30}, {title:'新绘本', icon:'📖', pointsCost:60}, {title:'去公园', icon:'🌳', pointsCost:100}, {title:'新画笔', icon:'🎨', pointsCost:80}]) {
    const wish = {id: uuid(), ...w, redeemed: false, redeemedAt: null, note: '', createdAt: Date.now()};
    await dbPut('wishes', wish);
    state.wishes.push(wish);
  }
  // 模拟今明两天部分打卡
  const today = new Date();
  for (let d = 0; d < 2; d++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - d);
    const ds = dateStr(dt);
    for (const task of state.tasks.slice(0, 6 + d)) {
      if (shouldTaskAppearOnDate(task, dt)) {
        const c = {id: uuid(), taskId: task.id, date: ds, completedAt: Date.now()};
        await dbPut('checkins', c);
        state.checkins.push(c);
      }
    }
  }
  // 取消模板弹窗
  const tmpl = document.getElementById('templateModal');
  if (tmpl) tmpl.hidden = true;
  return true;
}