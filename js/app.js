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
    updatedAt: new Date().toISOString()
  };

  if (editId) {
    const index = state.transactions.findIndex(t => t.id === editId);
    if (index !== -1) {
      state.transactions[index] = { ...state.transactions[index], ...transactionData };
      Toast.show('Transação atualizada com sucesso!');
    }
  } else {
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
  if (e.key === 'Escape') closeModal();
});

// ─────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Storage.load();
  state.selectedMonth = getCurrentMonthYear();
  updateAll();
});