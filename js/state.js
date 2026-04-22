let state = {
  transactions: [],
  goals: [],
  currentPage: 'dashboard',
  currentFilter: null,
  editingId: null,
  selectedMonth: null
};

const VALID_TYPES = new Set(['income', 'expense', 'reserve']);
const VALID_CATEGORY_IDS = new Set(
  Object.values(CONFIG.categories).flat().map(c => c.id)
);

const isValidTransaction = (t) => {
  if (!t || typeof t !== 'object') return false;
  if (typeof t.id !== 'string' || !t.id) return false;
  if (!VALID_TYPES.has(t.type)) return false;
  if (typeof t.category !== 'string') return false;
  if (typeof t.amount !== 'number' || isNaN(t.amount) || t.amount <= 0 || t.amount > 999999999) return false;
  if (typeof t.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return false;
  return true;
};

const isValidGoal = (g) => {
  if (!g || typeof g !== 'object') return false;
  if (typeof g.id !== 'string' || !g.id) return false;
  if (typeof g.name !== 'string' || !g.name) return false;
  if (typeof g.targetAmount !== 'number' || isNaN(g.targetAmount) || g.targetAmount <= 0 || g.targetAmount > 999999999) return false;
  if (typeof g.currentAmount !== 'number' || isNaN(g.currentAmount) || g.currentAmount < 0 || g.currentAmount > 999999999) return false;
  return true;
};

const Storage = {
  save: () => {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state.transactions));
      localStorage.setItem(CONFIG.storageKey + '_goals', JSON.stringify(state.goals));
    } catch (e) {
      console.warn('Erro ao salvar no localStorage:', e);
    }
  },
  load: () => {
    try {
      const data = localStorage.getItem(CONFIG.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          state.transactions = parsed.filter(isValidTransaction).map(t => ({
            id:               String(t.id),
            type:             t.type,
            category:         String(t.category),
            amount:           Number(t.amount),
            date:             String(t.date),
            description:      typeof t.description === 'string' ? t.description.substring(0, 200) : '',
            deductFromBalance: t.deductFromBalance !== false,
            goalId:           typeof t.goalId === 'string' ? t.goalId : undefined,
            createdAt:        typeof t.createdAt === 'string' ? t.createdAt : '',
            updatedAt:        typeof t.updatedAt === 'string' ? t.updatedAt : ''
          }));
        } else {
          state.transactions = [];
        }
      } else {
        state.transactions = [];
      }

      const goalsData = localStorage.getItem(CONFIG.storageKey + '_goals');
      if (goalsData) {
        const parsedGoals = JSON.parse(goalsData);
        if (Array.isArray(parsedGoals)) {
          state.goals = parsedGoals.filter(isValidGoal).map(g => ({
            id: String(g.id),
            name: String(g.name).substring(0, 100),
            targetAmount: Number(g.targetAmount),
            currentAmount: Math.max(0, Number(g.currentAmount)),
            createdAt: typeof g.createdAt === 'string' ? g.createdAt : '',
            updatedAt: typeof g.updatedAt === 'string' ? g.updatedAt : ''
          }));
        } else {
          state.goals = [];
        }
      } else {
        state.goals = [];
      }
    } catch (e) {
      console.warn('Erro ao carregar do localStorage:', e);
      state.transactions = [];
      state.goals = [];
    }
  }
};