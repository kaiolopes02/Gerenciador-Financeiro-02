function getMonthTransactions(monthStr = null) {
  const targetMonth = monthStr || state.selectedMonth;
  if (!targetMonth) return [];
  return state.transactions.filter(t => getMonthYear(t.date) === targetMonth);
}

function calculateTotals() {
  const current = getMonthTransactions();
  const income = current.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = current.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const expenseForBalance = current.filter(t => t.type === 'expense' && !t.goalId).reduce((sum, t) => sum + t.amount, 0);
  const reserveDeducted = current
    .filter(t => t.type === 'reserve' && t.deductFromBalance !== false)
    .reduce((sum, t) => sum + t.amount, 0);
  const reserveTotal = current.filter(t => t.type === 'reserve').reduce((sum, t) => sum + t.amount, 0);
  return { income, expense, reserve: reserveTotal, balance: income - expenseForBalance - reserveDeducted };
}

function calculateTotalsForMonth(monthStr) {
  const monthData = state.transactions.filter(t => getMonthYear(t.date) === monthStr);
  const income = monthData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = monthData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const expenseForBalance = monthData.filter(t => t.type === 'expense' && !t.goalId).reduce((sum, t) => sum + t.amount, 0);
  const reserveDeducted = monthData
    .filter(t => t.type === 'reserve' && t.deductFromBalance !== false)
    .reduce((sum, t) => sum + t.amount, 0);
  return { income, expense, balance: income - expenseForBalance - reserveDeducted };
}

function getPreviousMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function renderKPIs() {
  const totals = calculateTotals();
  document.getElementById('balanceValue').textContent  = formatCurrency(totals.balance);
  document.getElementById('incomeValue').textContent   = formatCurrency(totals.income);
  document.getElementById('expenseValue').textContent  = formatCurrency(totals.expense);
  document.getElementById('reserveValue').textContent  = formatCurrency(totals.reserve);

  if (state.selectedMonth) {
    const prevTotals = calculateTotalsForMonth(getPreviousMonth(state.selectedMonth));
    const comparisonEl = document.getElementById('balanceComparison');
    if (comparisonEl && (prevTotals.balance !== 0 || totals.balance !== 0)) {
      const diff = totals.balance - prevTotals.balance;
      const percent = prevTotals.balance !== 0 ? ((diff / Math.abs(prevTotals.balance)) * 100).toFixed(1) : 0;
      const icon = diff >= 0 ? '↑' : '↓';
      const color = diff >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
      comparisonEl.innerHTML = `<span style="color:${color}">${icon} ${Math.abs(percent)}%</span> vs mês anterior`;
    }
  }
}

function renderChart() {
  const monthTransactions = getMonthTransactions();
  const categoriesData = {};
  let incomeTotal = 0;
  let hasData = false;

  monthTransactions.forEach(t => {
    const catData = CONFIG.categories[t.type]?.find(c => c.id === t.category);
    if (!catData) return;
    if (t.type === 'reserve' && t.deductFromBalance === false) return;
    if (t.type === 'expense' && t.goalId) return;
    const key = `${t.type}-${t.category}`;
    if (!categoriesData[key]) {
      categoriesData[key] = { name: catData.name, icon: catData.icon, color: catData.color, type: t.type, total: 0 };
    }
    categoriesData[key].total += t.amount;
    hasData = true;
    if (t.type === 'income') incomeTotal += t.amount;
  });

  const svg = document.getElementById('mainChart');
  const chartTotal = document.getElementById('chartTotal');
  const chartLabel = document.getElementById('chartLabel');
  const legendContainer = document.getElementById('chartLegend');

  chartTotal.textContent = formatCurrency(incomeTotal);
  chartLabel.textContent = 'Total Entradas';

  if (!hasData || incomeTotal === 0) {
    svg.innerHTML = '<circle cx="100" cy="100" r="80" fill="none" stroke="#E5E7EB" stroke-width="20"/>';
    legendContainer.innerHTML = `
      <div style="text-align:center;color:var(--color-gray-400);padding:2rem 1rem;">
        <div style="font-size:2rem;margin-bottom:0.5rem;">📊</div>
        <p>Sem dados para ${state.selectedMonth ? escapeHTML(formatMonthDisplay(state.selectedMonth)) : 'este mês'}</p>
      </div>`;
    return;
  }

  const sortedCategories = Object.values(categoriesData)
    .sort((a, b) => b.total - a.total)
    .filter(c => c.total > 0);

  const chartData = sortedCategories.map(cat => ({
    ...cat,
    percent: incomeTotal > 0 ? (cat.total / incomeTotal) : 0
  }));

  let svgContent = '';
  let accumulatedPercent = 0;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;

  chartData.forEach(item => {
    const strokeLength = item.percent * circumference;
    const gapLength = circumference - strokeLength;
    const rotation = accumulatedPercent * 360;
    if (strokeLength > 0) {
      svgContent += `<circle cx="100" cy="100" r="${radius}" fill="none" stroke="${item.color}" stroke-width="20"
        stroke-dasharray="${strokeLength} ${gapLength}"
        stroke-dashoffset="0"
        transform="rotate(${rotation} 100 100)"
        stroke-linecap="butt"/>`;
    }
    accumulatedPercent += item.percent;
  });
  svg.innerHTML = svgContent;

  const buildLegendSection = (items, label, colorVar, sign) => {
    if (!items.length) return '';
    let html = `<div class="legend-section">
      <div class="legend-section-title" style="color:${colorVar};">${label}</div>`;
    items.forEach(item => {
      const pct = ((item.total / incomeTotal) * 100).toFixed(1);
      html += `
        <div class="legend-item">
          <div class="legend-info">
            <span class="legend-icon">${item.icon}</span>
            <div>
              <div class="legend-name">${escapeHTML(item.name)}</div>
              <div style="font-size:0.75rem;color:var(--color-gray-400);">${pct}% das entradas</div>
            </div>
          </div>
          <span class="legend-value" style="color:${colorVar};">${sign}${formatCurrency(item.total)}</span>
        </div>`;
    });
    return html + '</div>';
  };

  let legendHTML = '';
  legendHTML += buildLegendSection(chartData.filter(c => c.type === 'income'),  'Receitas',  'var(--color-income)',  '+');
  legendHTML += buildLegendSection(chartData.filter(c => c.type === 'expense'), 'Despesas',  'var(--color-expense)', '-');
  legendHTML += buildLegendSection(chartData.filter(c => c.type === 'reserve'), 'Reservas',  'var(--color-reserve)', '-');

  if (incomeTotal > 0) {
    const totals = calculateTotals();
    const balancePercent = ((totals.balance / incomeTotal) * 100).toFixed(1);
    const balanceColor = totals.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
    legendHTML += `
      <div style="margin-top:1rem;padding-top:1rem;border-top:2px solid var(--color-gray-200);">
        <div class="legend-item" style="font-weight:700;">
          <div class="legend-info">
            <span style="font-size:1.2rem;">💰</span>
            <div>
              <div class="legend-name">Saldo do Mês</div>
              <div style="font-size:0.75rem;color:var(--color-gray-400);">${balancePercent}% das entradas</div>
            </div>
          </div>
          <span class="legend-value" style="color:${balanceColor};">${formatCurrency(totals.balance)}</span>
        </div>
      </div>`;
  }
  legendContainer.innerHTML = legendHTML;
}

function renderCategories() {
  const current = getMonthTransactions();
  const container = document.getElementById('categoriesSummary');

  if (!current || current.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📊</div>
        <p>Sem dados para ${state.selectedMonth ? escapeHTML(formatMonthDisplay(state.selectedMonth)) : 'este mês'}</p>
        <button class="btn btn-primary btn-sm" onclick="openModal()" style="margin-top:1rem;">Adicionar transação</button>
      </div>`;
    return;
  }

  const grouped = {};
  current.forEach(t => {
    if (!grouped[t.type]) grouped[t.type] = {};
    if (!grouped[t.type][t.category]) {
      const catData = CONFIG.categories[t.type]?.find(c => c.id === t.category);
      grouped[t.type][t.category] = {
        name:  catData ? catData.name  : t.category,
        icon:  catData ? catData.icon  : '💰',
        bg:    catData ? catData.bg    : '#F3F4F6',
        color: catData ? catData.color : '#6B7280',
        type:  t.type,
        total: 0,
        count: 0
      };
    }
    grouped[t.type][t.category].total += t.amount;
    grouped[t.type][t.category].count++;
  });

  const typeConfig = {
    income:  { label: 'Entradas', colorVar: 'var(--color-income)',  cls: 'income'  },
    expense: { label: 'Saídas',   colorVar: 'var(--color-expense)', cls: 'expense' },
    reserve: { label: 'Reservas', colorVar: 'var(--color-reserve)', cls: 'reserve' }
  };
  const typeOrder = ['income', 'expense', 'reserve'];

  let html = '<div class="cat-tree">';
  typeOrder.forEach(typeKey => {
    if (!grouped[typeKey]) return;
    const tc = typeConfig[typeKey];
    const cats = Object.values(grouped[typeKey]).sort((a, b) => b.total - a.total);
    const typeTotal = cats.reduce((s, c) => s + c.total, 0);

    html += `
      <details class="cat-tree-type ${tc.cls}" open>
        <summary>
          <span class="cat-tree-chevron">▶</span>
          <span class="cat-tree-type__name">${tc.label}</span>
          <span class="cat-tree-type__total" style="color:${tc.colorVar};">${formatCurrency(typeTotal)}</span>
        </summary>
        <div class="cat-tree-body">
          ${cats.map(item => `
            <div class="category-item">
              <div class="category-info">
                <div class="category-icon" style="background:${item.bg};color:${item.color};">${item.icon}</div>
                <span class="category-name">${escapeHTML(item.name)}</span>
                <span class="category-count">${item.count}</span>
              </div>
              <span class="category-value" style="color:${tc.colorVar};">${formatCurrency(item.total)}</span>
            </div>`).join('')}
        </div>
      </details>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderRecentHistory() {
  const container = document.getElementById('recentHistory');
  const monthTransactions = getMonthTransactions()
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!monthTransactions.length) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📝</div>
        <p>Nenhuma transação em ${state.selectedMonth ? escapeHTML(formatMonthDisplay(state.selectedMonth)) : 'este mês'}</p>
      </div>`;
    return;
  }
  container.innerHTML = monthTransactions.map(t => createRecentHistoryHTML(t)).join('');
}

function createRecentHistoryHTML(t) {
  const catData = CONFIG.categories[t.type]?.find(c => c.id === t.category);
  const icon  = catData ? catData.icon : '💰';
  const bg    = catData ? catData.bg   : '#F3F4F6';
  const color = t.type === 'income' ? 'var(--color-income)' : t.type === 'expense' ? 'var(--color-expense)' : 'var(--color-reserve)';
  const sign  = t.type === 'income' ? '+' : '-';
  const catName = catData ? catData.name : t.category;
  const reserveNote = t.type === 'reserve' && t.deductFromBalance === false ? ' (não deduzido)' : '';
  const goalData = t.goalId ? state.goals.find(g => g.id === t.goalId) : null;
  const goalNote = goalData ? ` · 🎯 ${escapeHTML(goalData.name)}` : '';

  return `
    <div class="history-item">
      <div class="history-main">
        <div class="history-icon" style="background:${bg};">${icon}</div>
        <div class="history-details">
          <h4>${escapeHTML(t.description || catName)}</h4>
          <p>${escapeHTML(formatDate(t.date))} • ${escapeHTML(catName)}${reserveNote}${goalNote}</p>
        </div>
      </div>
      <span class="history-value" style="color:${color}">${sign} ${formatCurrency(t.amount)}</span>
    </div>`;
}

function renderFullHistory() {
  const container = document.getElementById('fullHistory');

  let filtered = getMonthTransactions()
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (state.currentFilter) {
    filtered = filtered.filter(t => t.type === state.currentFilter);
  }

  if (!filtered.length) {
    let msg = `Nenhuma transação encontrada em ${state.selectedMonth ? escapeHTML(formatMonthDisplay(state.selectedMonth)) : 'este mês'}`;
    if (state.currentFilter) msg += ' para o filtro selecionado';
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📋</div>
        <p>${msg}</p>
        ${state.currentFilter ? '<button class="btn btn-secondary btn-sm" onclick="clearFilter()" style="margin-top:1rem;">Limpar filtro</button>' : ''}
      </div>`;
    return;
  }

  const tree = {};
  filtered.forEach(t => {
    if (!tree[t.type]) tree[t.type] = {};
    if (!tree[t.type][t.category]) tree[t.type][t.category] = [];
    tree[t.type][t.category].push(t);
  });

  const TYPE_CONFIG = {
    income:  { label: 'Entradas', badge: '📈', colorVar: 'var(--color-income)',  sign: '+', cls: 'income'  },
    expense: { label: 'Saídas',   badge: '📉', colorVar: 'var(--color-expense)', sign: '-', cls: 'expense' },
    reserve: { label: 'Reservas', badge: '🏦', colorVar: 'var(--color-reserve)', sign: '-', cls: 'reserve' }
  };
  const TYPE_ORDER = ['income', 'expense', 'reserve'];

  let html = '<div class="tree">';

  TYPE_ORDER.forEach(typeKey => {
    if (!tree[typeKey]) return;
    const tc = TYPE_CONFIG[typeKey];
    const allTxInType = Object.values(tree[typeKey]).flat();
    const typeTotal   = allTxInType.reduce((s, t) => s + t.amount, 0);
    const typeCount   = allTxInType.length;

    html += `
      <details class="tree-type ${tc.cls}" open>
        <summary>
          <span class="tree-chevron">▶</span>
          <span class="tree-type__badge">${tc.badge}</span>
          <span class="tree-type__name">${tc.label}</span>
          <span class="tree-type__meta">
            <span class="tree-badge">${typeCount}</span>
            <span class="tree-type__total" style="color:${tc.colorVar};">${tc.sign} ${formatCurrency(typeTotal)}</span>
          </span>
        </summary>
        <div class="tree-type__body">`;

    Object.entries(tree[typeKey]).forEach(([catKey, txs]) => {
      const catData  = CONFIG.categories[typeKey]?.find(c => c.id === catKey);
      const catName  = catData ? catData.name : catKey;
      const catIcon  = catData ? catData.icon : '💰';
      const catBg    = catData ? catData.bg   : '#F3F4F6';
      const catTotal = txs.reduce((s, t) => s + t.amount, 0);

      html += `
        <details class="tree-category" open>
          <summary>
            <span class="tree-chevron">▶</span>
            <div class="tree-cat-icon" style="background:${catBg};">${catIcon}</div>
            <span class="tree-category__name">${escapeHTML(catName)}</span>
            <span class="tree-category__meta">
              <span class="tree-badge">${txs.length}</span>
              <span class="tree-category__total">${formatCurrency(catTotal)}</span>
            </span>
          </summary>
          <div class="tree-category__body">`;

      txs.forEach(t => {
        const reserveNote = t.type === 'reserve' && t.deductFromBalance === false ? ' · não deduzido' : '';
        const goalData = t.goalId ? state.goals.find(g => g.id === t.goalId) : null;
        const goalNote = goalData ? ` · 🎯 ${escapeHTML(goalData.name)}` : '';
        html += `
          <div class="tree-leaf">
            <div class="tree-leaf__dot"></div>
            <div class="tree-leaf__info">
              <span class="tree-leaf__desc">${escapeHTML(t.description || catName)}</span>
              <span class="tree-leaf__date">${escapeHTML(formatDate(t.date))}${reserveNote}${goalNote}</span>
            </div>
            <div class="tree-leaf__right">
              <span class="tree-leaf__value" style="color:${tc.colorVar};">${tc.sign} ${formatCurrency(t.amount)}</span>
              <div class="tree-leaf__actions">
                <button class="btn btn-icon tree-edit-btn" data-id="${escapeHTML(t.id)}" title="Editar" style="background:#F3F4F6;">✏️</button>
                <button class="btn btn-danger btn-icon tree-delete-btn" data-id="${escapeHTML(t.id)}" title="Excluir">🗑️</button>
              </div>
            </div>
          </div>`;
      });

      html += `</div></details>`;
    });

    html += `</div></details>`;
  });

  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('.tree-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editTransaction(btn.dataset.id));
  });
  container.querySelectorAll('.tree-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteTransaction(btn.dataset.id));
  });
}

function renderGoals() {
  const container = document.getElementById('goalsList');
  if (!container) return;

  if (!state.goals || state.goals.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🎯</div>
        <p>Nenhum objetivo cadastrado</p>
        <button class="btn btn-primary btn-sm" onclick="openGoalModal()" style="margin-top:1rem;">Criar objetivo</button>
      </div>`;
    return;
  }

  const sorted = [...state.goals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  container.innerHTML = `<div class="goals-grid">${sorted.map(g => {
    const percent = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    const isCompleted = g.currentAmount >= g.targetAmount;
    const statusText = isCompleted ? 'Concluído' : 'Em andamento';
    const statusColor = isCompleted ? 'var(--color-income)' : 'var(--color-primary)';

    return `
      <div class="goal-card ${isCompleted ? 'completed' : ''}">
        <div class="goal-header">
          <div class="goal-icon">🎯</div>
          <div class="goal-info">
            <h4 class="goal-name">${escapeHTML(g.name)}</h4>
            <span class="goal-status" style="color:${statusColor};">${statusText}</span>
          </div>
          <div class="goal-actions">
            <button class="btn btn-icon" onclick="editGoal('${escapeHTML(g.id)}')" title="Editar" style="background:#F3F4F6;">✏️</button>
            <button class="btn btn-danger btn-icon" onclick="deleteGoal('${escapeHTML(g.id)}')" title="Excluir">🗑️</button>
          </div>
        </div>
        <div class="goal-progress-wrapper">
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width:${percent}%; background:${statusColor};"></div>
          </div>
          <div class="goal-progress-text">${percent.toFixed(1)}%</div>
        </div>
        <div class="goal-values">
          <div class="goal-value-item">
            <span class="goal-value-label">Guardado</span>
            <span class="goal-value-amount" style="color:var(--color-income);">${formatCurrency(g.currentAmount)}</span>
          </div>
          <div class="goal-value-item">
            <span class="goal-value-label">Restante</span>
            <span class="goal-value-amount" style="color:var(--color-expense);">${formatCurrency(remaining)}</span>
          </div>
          <div class="goal-value-item">
            <span class="goal-value-label">Meta</span>
            <span class="goal-value-amount">${formatCurrency(g.targetAmount)}</span>
          </div>
        </div>
      </div>`;
  }).join('')}</div>`;
}