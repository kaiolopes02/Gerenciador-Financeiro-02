const escapeHTML = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2);

const getMonthYear = (dateStr) => {
  if (!dateStr || dateStr.length < 7) return '';
  return dateStr.substring(0, 7);
};

const getCurrentMonthYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthDisplay = (monthStr) => {
  const [year, month] = monthStr.split('-');
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
};

const compareMonths = (monthA, monthB) => {
  if (monthA < monthB) return -1;
  if (monthA > monthB) return 1;
  return 0;
};