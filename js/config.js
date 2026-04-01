const CONFIG = {
  storageKey: 'financial_dashboard_v4',
  categories: {
    income: [
      { id: 'salary',     name: 'Salário',          color: '#059669', bg: '#D1FAE5', icon: '💼' },
      { id: 'benefits',   name: 'Benefícios',        color: '#10B981', bg: '#D1FAE5', icon: '🎁' },
      { id: 'extra',      name: 'Extras/Freelance',  color: '#34D399', bg: '#D1FAE5', icon: '💡' },
      { id: 'investment', name: 'Retorno Invest.',   color: '#6EE7B7', bg: '#D1FAE5', icon: '📈' }
    ],
    expense: [
      { id: 'fixed',     name: 'Gastos Fixos',           color: '#DC2626', bg: '#FEE2E2', icon: '🏠' },
      { id: 'mandatory', name: 'Despesas Obrigatórias',   color: '#EA580C', bg: '#FEE2E2', icon: '📋' },
      { id: 'variable',  name: 'Gastos Variáveis',        color: '#F59E0B', bg: '#FEF3C7', icon: '🛒' },
      { id: 'luxury',    name: 'Lazer/Extras',            color: '#F97316', bg: '#FFEDD5', icon: '🎮' }
    ],
    reserve: [
      { id: 'emergency',  name: 'Reserva Emergência',  color: '#7C3AED', bg: '#EDE9FE', icon: '🛡️' },
      { id: 'investment', name: 'Investimentos',        color: '#8B5CF6', bg: '#EDE9FE', icon: '📊' },
      { id: 'savings',    name: 'Poupança',             color: '#A78BFA', bg: '#EDE9FE', icon: '🐷' },
      { id: 'goal',       name: 'Objetivo Específico',  color: '#C4B5FD', bg: '#EDE9FE', icon: '🎯' }
    ]
  }
};