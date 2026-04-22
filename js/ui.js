const Toast = {
  show: (message, type = 'success') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = type === 'success' ? '✓' : '✕';
    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('open');
}

function showPage(page, keepFilter = false) {
  state.currentPage = page;

  if (!keepFilter) {
    state.currentFilter = null;
    updateSidebarActiveState();
  }

  document.querySelectorAll('.sidebar__item').forEach(item => {
    item.classList.remove('active');
    const text = item.textContent.toLowerCase();
    if ((page === 'dashboard' && text.includes('dashboard')) ||
        (page === 'history' && text.includes('histórico')) ||
        (page === 'goals' && text.includes('objetivos'))) {
      item.classList.add('active');
    }
  });

  document.getElementById('dashboardPage').classList.toggle('hidden', page !== 'dashboard');
  document.getElementById('historyPage').classList.toggle('hidden', page !== 'history');
  document.getElementById('goalsPage').classList.toggle('hidden', page !== 'goals');
  document.getElementById('pageTitle').textContent = page === 'dashboard' ? 'Dashboard' : page === 'history' ? 'Histórico' : 'Objetivos';
  document.getElementById('sidebar').classList.remove('open');

  if (page === 'history') {
    updateHistorySubtitle();
    renderFullHistory();
    updateFilterIndicator();
  } else if (page === 'goals') {
    renderGoals();
  } else {
    updateAll();
  }
}

function changeMonth(direction) {
  if (!state.selectedMonth) state.selectedMonth = getCurrentMonthYear();
  const [year, month] = state.selectedMonth.split('-').map(Number);
  const newDate = new Date(year, month - 1 + direction, 1);
  state.selectedMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
  updateMonthDisplay();
  updateAll();
}

function resetToCurrentMonth() {
  state.selectedMonth = getCurrentMonthYear();
  updateMonthDisplay();
  updateAll();
  Toast.show('Retornado ao mês atual');
}

function updateMonthDisplay() {
  if (!state.selectedMonth) return;
  const display = formatMonthDisplay(state.selectedMonth);
  const current = getCurrentMonthYear();
  const isCurrent = state.selectedMonth === current;

  const monthDisplay = document.getElementById('monthDisplay');
  const historyMonthDisplay = document.getElementById('historyMonthDisplay');
  const badge = document.getElementById('currentMonthBadge');

  if (monthDisplay) monthDisplay.textContent = display;
  if (historyMonthDisplay) historyMonthDisplay.textContent = display;

  [monthDisplay, historyMonthDisplay].forEach(el => {
    if (!el) return;
    el.classList.remove('future', 'past');
    if (!isCurrent) {
      el.classList.add(compareMonths(state.selectedMonth, current) > 0 ? 'future' : 'past');
    }
  });

  if (badge) badge.classList.toggle('hidden', isCurrent);
}

function filterByType(type) {
  if (state.currentFilter === type && state.currentPage === 'history') {
    clearFilter();
    return;
  }
  state.currentFilter = type;
  if (state.currentPage !== 'history') {
    showPage('history', true);
  } else {
    updateHistorySubtitle();
    renderFullHistory();
    updateFilterIndicator();
    updateSidebarActiveState();
  }
  const typeNames = { income: 'Entradas', expense: 'Saídas', reserve: 'Reservas' };
  Toast.show(`Filtrando: ${typeNames[type]}`);
}

function clearFilter() {
  state.currentFilter = null;
  updateHistorySubtitle();
  renderFullHistory();
  updateFilterIndicator();
  updateSidebarActiveState();
  Toast.show('Filtros limpos');
}

function updateSidebarActiveState() {
  ['filterIncome', 'filterExpense', 'filterReserve'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  if (state.currentFilter) {
    const map = { income: 'filterIncome', expense: 'filterExpense', reserve: 'filterReserve' };
    const el = document.getElementById(map[state.currentFilter]);
    if (el) el.classList.add('active');
  }
}

function updateHistorySubtitle() {
  if (!state.selectedMonth) return;
  const monthText = formatMonthDisplay(state.selectedMonth);
  const typeText = state.currentFilter
    ? ({ income: 'apenas entradas', expense: 'apenas saídas', reserve: 'apenas reservas' }[state.currentFilter])
    : 'todas as transações';
  const subtitle = document.getElementById('historySubtitle');
  if (subtitle) subtitle.textContent = `${monthText} • ${typeText}`;
}

function updateFilterIndicator() {
  const container = document.getElementById('activeFilterIndicator');
  if (!container) return;
  if (state.currentFilter) {
    const typeNames = { income: 'Entradas', expense: 'Saídas', reserve: 'Reservas' };
    const typeColors = { income: 'var(--color-income)', expense: 'var(--color-expense)', reserve: 'var(--color-reserve)' };
    container.innerHTML = `
      <div class="filter-indicator" style="border-color:${typeColors[state.currentFilter]};background:${typeColors[state.currentFilter]}15;">
        <span>Filtrando: ${escapeHTML(typeNames[state.currentFilter])}</span>
        <span class="filter-close" onclick="clearFilter()" title="Remover filtro">×</span>
      </div>
    `;
  } else {
    container.innerHTML = '';
  }
}

function openModal(editId = null) {
  state.editingId = editId;
  const overlay = document.getElementById('modalOverlay');
  const title   = document.getElementById('modalTitle');

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (editId) {
    const transaction = state.transactions.find(t => t.id === editId);
    if (transaction) {
      title.textContent = 'Editar Transação';
      document.getElementById('editId').value = transaction.id;
      document.getElementById('amount').value = transaction.amount;
      document.getElementById('date').value = transaction.date;
      document.getElementById('description').value = transaction.description || '';

      const typeRadio = document.querySelector(`input[name="type"][value="${transaction.type}"]`);
      if (typeRadio) {
        typeRadio.checked = true;
        updateCategories();
        setTimeout(() => {
          document.getElementById('category').value = transaction.category;
          if ((transaction.type === 'expense' || transaction.type === 'reserve') && transaction.goalId) {
            document.getElementById('goalSelect').value = transaction.goalId;
          }
        }, 0);
      }

      if (transaction.type === 'reserve') {
        document.getElementById('reserveOptions').style.display = 'flex';
        document.getElementById('deductFromBalance').checked = transaction.deductFromBalance !== false;
      }
    }
  } else {
    title.textContent = 'Nova Transação';
    document.getElementById('transactionForm').reset();
    document.getElementById('editId').value = '';

    if (state.selectedMonth) {
      const [year, month] = state.selectedMonth.split('-');
      const lastDay = new Date(year, month, 0).getDate();
      const today = new Date();
      const day = Math.min(today.getDate(), lastDay);
      document.getElementById('date').value = `${year}-${month}-${String(day).padStart(2, '0')}`;
    } else {
      document.getElementById('date').valueAsDate = new Date();
    }
    updateCategories();
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
  state.editingId = null;
}

function updateCategories() {
  const type = document.querySelector('input[name="type"]:checked')?.value || 'income';
  const select = document.getElementById('category');
  const categories = CONFIG.categories[type] || [];

  select.innerHTML = '<option value="">Selecione...</option>' +
    categories.map(c => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.icon + ' ' + c.name)}</option>`).join('');

  const reserveOptions = document.getElementById('reserveOptions');
  if (reserveOptions) reserveOptions.style.display = type === 'reserve' ? 'flex' : 'none';

  const goalGroup = document.getElementById('goalSelectGroup');
  const goalSelect = document.getElementById('goalSelect');
  if (goalGroup && goalSelect) {
    if (type === 'expense' || type === 'reserve') {
      goalGroup.style.display = 'block';
      goalSelect.innerHTML = '<option value="">Nenhum</option>' +
        state.goals.map(g => `<option value="${escapeHTML(g.id)}">${escapeHTML(g.name)}</option>`).join('');
    } else {
      goalGroup.style.display = 'none';
      goalSelect.value = '';
    }
  }
}

function openGoalModal(editId = null) {
  const overlay = document.getElementById('goalModalOverlay');
  const title = document.getElementById('goalModalTitle');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (editId) {
    const goal = state.goals.find(g => g.id === editId);
    if (goal) {
      title.textContent = 'Editar Objetivo';
      document.getElementById('goalEditId').value = goal.id;
      document.getElementById('goalName').value = goal.name;
      document.getElementById('goalTarget').value = goal.targetAmount;
      document.getElementById('goalCurrent').value = goal.currentAmount;
    }
  } else {
    title.textContent = 'Novo Objetivo';
    document.getElementById('goalForm').reset();
    document.getElementById('goalEditId').value = '';
    document.getElementById('goalCurrent').value = '0';
  }
}

function closeGoalModal() {
  document.getElementById('goalModalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function saveGoal() {
  const editId = document.getElementById('goalEditId').value;
  const name = document.getElementById('goalName').value.trim();
  const target = parseFloat(document.getElementById('goalTarget').value);
  const current = parseFloat(document.getElementById('goalCurrent').value) || 0;

  if (!name || isNaN(target) || target <= 0 || target > 999999999) {
    Toast.show('Preencha todos os campos obrigatórios', 'error');
    return;
  }
  if (current < 0 || current > 999999999) {
    Toast.show('Valor atual inválido', 'error');
    return;
  }

  const goalData = {
    name: name.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 100),
    targetAmount: parseFloat(target.toFixed(2)),
    currentAmount: Math.max(0, parseFloat(current.toFixed(2))),
    updatedAt: new Date().toISOString()
  };

  if (editId) {
    const index = state.goals.findIndex(g => g.id === editId);
    if (index !== -1) {
      state.goals[index] = { ...state.goals[index], ...goalData };
      Toast.show('Objetivo atualizado com sucesso!');
    }
  } else {
    goalData.id = generateId();
    goalData.createdAt = new Date().toISOString();
    state.goals.push(goalData);
    Toast.show('Objetivo criado com sucesso!');
  }

  Storage.save();
  closeGoalModal();
  updateAll();
}

function editGoal(id) {
  openGoalModal(id);
}

function deleteGoal(id) {
  if (!confirm('Tem certeza que deseja excluir este objetivo?')) return;
  const linkedTxs = state.transactions.filter(t => t.goalId === id);
  if (linkedTxs.length > 0) {
    if (!confirm('Este objetivo possui transações vinculadas. Ao excluí-lo, elas ficarão desvinculadas. Deseja continuar?')) return;
    state.transactions.forEach(t => {
      if (t.goalId === id) delete t.goalId;
    });
  }
  state.goals = state.goals.filter(g => g.id !== id);
  Storage.save();
  updateAll();
  Toast.show('Objetivo excluído');
}