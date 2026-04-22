function saveTransaction() {
  const editId      = document.getElementById('editId').value;
  const type        = document.querySelector('input[name="type"]:checked')?.value;
  const category    = document.getElementById('category').value;
  const amount      = parseFloat(document.getElementById('amount').value);
  const date        = document.getElementById('date').value;
  const rawDesc     = document.getElementById('description').value.trim();
  const deductFromBalance = type === 'reserve'
    ? document.getElementById('deductFromBalance').checked
    : true;
  const goalId      = (type === 'expense' || type === 'reserve')
    ? document.getElementById('goalSelect').value || null
    : null;

  if (!type || !category || isNaN(amount) || amount <= 0 || amount > 999999999 || !date) {
    Toast.show('Preencha todos os campos obrigatórios', 'error');
    return;
  }

  const categoryData = CONFIG.categories[type]?.find(c => c.id === category);
  if (!categoryData) {
    Toast.show('Categoria inválida', 'error');
    return;
  }

  const description = rawDesc.replace(/[\x00-\x1F\x7F]/g, '').substring(0, 200);

  const transactionData = {
    type,
    category,
    amount: parseFloat(amount.toFixed(2)),
    date,
    description: description || categoryData.name,
    deductFromBalance,
    goalId: goalId || undefined,
    updatedAt: new Date().toISOString()
  };

  if (editId) {
    const index = state.transactions.findIndex(t => t.id === editId);
    if (index !== -1) {
      const oldTx = state.transactions[index];

      if (oldTx.goalId) {
        const oldGoal = state.goals.find(g => g.id === oldTx.goalId);
        if (oldGoal) {
          if (oldTx.type === 'expense') {
            oldGoal.currentAmount = oldGoal.currentAmount + oldTx.amount;
          } else if (oldTx.type === 'reserve') {
            oldGoal.currentAmount = Math.max(0, oldGoal.currentAmount - oldTx.amount);
          }
          oldGoal.updatedAt = new Date().toISOString();
        }
      }

      if (transactionData.goalId) {
        const newGoal = state.goals.find(g => g.id === transactionData.goalId);
        if (newGoal) {
          if (transactionData.type === 'expense') {
            newGoal.currentAmount = Math.max(0, newGoal.currentAmount - transactionData.amount);
          } else if (transactionData.type === 'reserve') {
            newGoal.currentAmount = newGoal.currentAmount + transactionData.amount;
          }
          newGoal.updatedAt = new Date().toISOString();
        }
      }

      state.transactions[index] = { ...state.transactions[index], ...transactionData };
      Toast.show('Transação atualizada com sucesso!');
    }
  } else {
    if (transactionData.goalId) {
      const goal = state.goals.find(g => g.id === transactionData.goalId);
      if (goal) {
        if (transactionData.type === 'expense') {
          goal.currentAmount = Math.max(0, goal.currentAmount - transactionData.amount);
        } else if (transactionData.type === 'reserve') {
          goal.currentAmount = goal.currentAmount + transactionData.amount;
        }
        goal.updatedAt = new Date().toISOString();
      }
    }
    transactionData.id = generateId();
    transactionData.createdAt = new Date().toISOString();
    state.transactions.push(transactionData);
    Toast.show('Transação adicionada com sucesso!');
  }

  Storage.save();
  closeModal();

  const txMonth = getMonthYear(date);
  if (txMonth !== state.selectedMonth) {
    if (confirm(`Esta transação é de ${formatMonthDisplay(txMonth)}. Deseja navegar para visualizá-la?`)) {
      state.selectedMonth = txMonth;
      updateMonthDisplay();
    }
  }

  updateAll();
}

function deleteTransaction(id) {
  if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
  const tx = state.transactions.find(t => t.id === id);
  if (tx && tx.goalId) {
    const goal = state.goals.find(g => g.id === tx.goalId);
    if (goal) {
      if (tx.type === 'expense') {
        goal.currentAmount = goal.currentAmount + tx.amount;
      } else if (tx.type === 'reserve') {
        goal.currentAmount = Math.max(0, goal.currentAmount - tx.amount);
      }
      goal.updatedAt = new Date().toISOString();
    }
  }
  state.transactions = state.transactions.filter(t => t.id !== id);
  Storage.save();
  updateAll();
  Toast.show('Transação excluída');
}

function editTransaction(id) {
  openModal(id);
}

function updateAll() {
  updateMonthDisplay();
  renderKPIs();
  renderChart();
  renderCategories();
  renderRecentHistory();
  if (state.currentPage === 'history') {
    renderFullHistory();
    updateHistorySubtitle();
  }
  if (state.currentPage === 'goals') {
    renderGoals();
  }
}

// ─────────────────────────────────────────────────
// GLOBAL EVENT LISTENERS
// ─────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('menuToggle');
  if (sidebar && toggle && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeGoalModal();
  }
});

// ─────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Storage.load();
  state.selectedMonth = getCurrentMonthYear();
  updateAll();
});