/**
 * combinations.js
 * Управление связями между модулями (привычки, биометрика, финансы)
 */

let habits = [];
let categories = [];
let habitBiometricLinks = [];
let habitFinanceLinks = [];
let biometricCharacteristics = [];
let combinations = []; // для привычка↔привычка

let activityTypesList = [];
let substances = [];
let meals = [];
let activities = [];
let measurements = [];

console.log('combinations.js loaded');

// ===== Единый вызов API =====
async function apiCall(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (data.status === 'success') return data.data;
  if (data.status === 'error') throw new Error(data.message);
  if (Array.isArray(data)) return data;
  throw new Error('Неизвестный формат ответа');
}

// ===== ЗАГРУЗКА ДАННЫХ =====
async function loadHabits() {
  try {
    habits = await apiCall('/api/habits/list');
    // Заполнить select'ы с привычками
    const selects = ['hb-habit-id', 'hf-habit-id', 'combo-habit-a', 'combo-habit-b'];
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = '<option value="">Выберите привычку...</option>';
        habits.forEach(h => {
          const opt = document.createElement('option');
          opt.value = h.id;
          opt.textContent = h.name;
          el.appendChild(opt);
        });
      }
    });
  } catch (e) {
    console.error('Error loading habits:', e);
  }
}

async function loadCategories() {
  try {
    categories = await apiCall('/api/finance_categories/list');
    const el = document.getElementById('hf-category-id');
    if (el) {
      el.innerHTML = '<option value="">Любая категория</option>';
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        el.appendChild(opt);
      });
    }
  } catch (e) {
    console.error('Error loading categories:', e);
  }
}

async function loadCombinations() {
  try {
    const data = await apiCall('/api/combinations/list');
    combinations = data;
  } catch (e) {
    console.error('Error loading combinations:', e);
    combinations = [];
  }
}

async function loadHabitBiometricLinks() {
  try {
    habitBiometricLinks = await apiCall('/api/combinations/habit-biometric');
  } catch (e) {
    console.error('Error loading habit-biometric links:', e);
    habitBiometricLinks = [];
  }
}

async function loadHabitFinanceLinks() {
  try {
    habitFinanceLinks = await apiCall('/api/combinations/habit-finance');
  } catch (e) {
    console.error('Error loading habit-finance links:', e);
    habitFinanceLinks = [];
  }
}

async function loadBiometricCharacteristics() {
  try {
    biometricCharacteristics = await apiCall('/api/combinations/biometric-characteristics');
  } catch (e) {
    console.error('Error loading biometric characteristics:', e);
    biometricCharacteristics = [];
  }
}

async function loadBiometricDictionaries() {
  try {
    substances = await apiCall('/api/biometric_substances/list');
    meals = await apiCall('/api/biometric_meals/list');
    activities = await apiCall('/api/biometric_physical_activity/list');
    measurements = await apiCall('/api/biometric_measurements/list');
  } catch (e) {
    console.warn('Error loading biometric dictionaries', e);
  }
}

async function loadActivityTypesList() {
  try {
    const data = await apiCall('/api/biometric/activity/types');
    activityTypesList = data;
    const select = document.getElementById('hb-activity-type-select');
    if (select) {
      select.innerHTML = '<option value="">-- выберите тип --</option>';
      activityTypesList.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        select.appendChild(opt);
      });
    }
  } catch (e) {
    console.error('Error loading activity types:', e);
  }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function getBiometricName(type, id) {
  if (!id) return 'любой';
  switch (type) {
    case 'substance':
      return substances.find(s => s.id === id)?.name || `Вещество #${id}`;
    case 'meal':
      return meals.find(m => m.id === id)?.description || `Приём #${id}`;
    case 'activity':
      return activities.find(a => a.id === id)?.activity_type || `Активность #${id}`;
    case 'measurement':
      return measurements.find(m => m.id === id)?.date || `Измерение #${id}`;
    default:
      return `ID ${id}`;
  }
}

async function loadBiometricItems(type) {
  let items = [];
  try {
    if (type === 'substance') {
      const data = await apiCall('/api/biometric_substances/list');
      items = data.map(s => ({ id: s.id, name: s.name }));
    } else if (type === 'meal') {
      const data = await apiCall('/api/biometric_meals/list');
      items = data.map(m => ({ id: m.id, name: `${m.date} ${m.meal_type}` }));
    } else if (type === 'activity') {
      const data = await apiCall('/api/biometric_physical_activity/list');
      items = data.map(a => ({
        id: a.id,
        name: `${a.date || '??? дата'} ${a.activity_type || 'неизвестная активность'}`
      }));
    } else if (type === 'measurement') {
      const data = await apiCall('/api/biometric_measurements/list');
      items = data.map(m => ({ id: m.id, name: `${m.date} вес:${m.weight || '?'}` }));
    }
  } catch (e) {
    console.error('Error loading biometric items:', e);
  }
  return items;
}

function updateBiometricSelect(selectId, items, idFieldId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '<option value="">— Все активности (без привязки к дате) —</option>';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name;
    select.appendChild(opt);
  });
  select.onchange = () => {
    const idInput = document.getElementById(idFieldId);
    if (idInput) idInput.value = select.value;
  };
}

// ===== ОТРИСОВКА =====
function renderHabitHabitList() {
  const container = document.getElementById('habit-habit-list');
  if (!container) return;

  if (combinations.length === 0) {
    container.innerHTML = '<div class="empty-state">Нет сочетаний</div>';
    return;
  }

  container.innerHTML = combinations.map(combo => {
    const habitA = habits.find(h => h.id === combo.habit_a);
    const habitB = habits.find(h => h.id === combo.habit_b);
    const bonusValues = ['i', 's', 'w', 'e', 'c', 'h', 'st', 'money'];
    const bonuses = bonusValues
      .filter(key => combo[key] !== 0)
      .map(key => `<span class="bonus-badge positive">${key.toUpperCase()}[${combo[key].toFixed(2)}]</span>`);

    return `
      <div class="link-card">
        <div class="link-card-info">
          <h4>${combo.name || 'Без названия'}</h4>
          <p>${habitA?.name || '?'} + ${habitB?.name || '?'}</p>
          <div class="bonus-badges">${bonuses.join('')}</div>
        </div>
        <div class="controls">
          <button class="btn danger" onclick="deleteCombination(${combo.id})">Удалить</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderHabitBiometricList() {
  const container = document.getElementById('habit-biometric-list');
  if (!container) return;

  if (habitBiometricLinks.length === 0) {
    container.innerHTML = '<div class="empty-state">Нет связей</div>';
    return;
  }

  container.innerHTML = habitBiometricLinks.map(link => {
    const habit = habits.find(h => h.id === link.habit_id);
    const bonusValues = ['i', 's', 'w', 'e', 'c', 'h', 'st', 'money'];
    const bonuses = bonusValues
      .filter(key => link[`bonus_${key}`] !== 0)
      .map(key => `<span class="bonus-badge positive">${key.toUpperCase()}[${link[`bonus_${key}`].toFixed(2)}]</span>`);

    let biometricDescription = '';
    let biometricHeader = link.biometric_type;

    if (link.biometric_type === 'activity') {
      if (link.biometric_id) {
        const act = activities.find(a => a.id === link.biometric_id);
        biometricHeader = act ? `${act.date} ${act.activity_type}` : `Активность #${link.biometric_id}`;
        biometricDescription = `запись ID ${link.biometric_id}`;
      } else if (link.biometric_value) {
        biometricHeader = link.biometric_value;
        biometricDescription = `тип "${link.biometric_value}" (все записи)`;
      } else {
        biometricHeader = 'все активности';
        biometricDescription = 'любая активность';
      }
    } else if (link.biometric_id) {
      biometricDescription = `запись ID ${link.biometric_id}`;
    } else if (link.biometric_value) {
      biometricHeader = link.biometric_value;
      biometricDescription = `тип "${link.biometric_value}" (все записи)`;
    } else {
      biometricDescription = `любая ${link.biometric_type}`;
    }

    return `
      <div class="link-card">
        <div class="link-card-info">
          <h4>${habit?.name || '?'} ↔ ${biometricHeader}</h4>
          <p>${biometricDescription}</p>
          <div class="bonus-badges">${bonuses.join('')}</div>
        </div>
        <div class="controls">
          <button class="btn danger" onclick="deleteHabitBiometricLink(${link.id})">Удалить</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderHabitFinanceList() {
  const container = document.getElementById('habit-finance-list');
  if (!container) return;

  if (habitFinanceLinks.length === 0) {
    container.innerHTML = '<div class="empty-state">Нет связей</div>';
    return;
  }

  container.innerHTML = habitFinanceLinks.map(link => {
    const habit = habits.find(h => h.id === link.habit_id);
    const bonusValues = ['i', 's', 'w', 'e', 'c', 'h', 'st', 'money'];
    const bonuses = bonusValues
      .filter(key => link[`bonus_${key}`] !== 0)
      .map(key => `<span class="bonus-badge positive">${key.toUpperCase()}[${link[`bonus_${key}`].toFixed(2)}]</span>`);

    return `
      <div class="link-card">
        <div class="link-card-info">
          <h4>${habit?.name || '?'} ↔ ${link.finance_type}</h4>
          <p>Порог: ${link.threshold > 0 ? link.threshold + ' руб.' : 'без ограничений'}</p>
          <div class="bonus-badges">${bonuses.join('')}</div>
        </div>
        <div class="controls">
          <button class="btn danger" onclick="deleteHabitFinanceLink(${link.id})">Удалить</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderBiometricCharacteristicsList() {
  const container = document.getElementById('biometric-characteristics-list');
  if (!container) return;

  if (biometricCharacteristics.length === 0) {
    container.innerHTML = '<div class="empty-state">Нет правил автобонусов</div>';
    return;
  }

  container.innerHTML = biometricCharacteristics.map(char => {
    const bonusValues = ['i', 's', 'w', 'e', 'c', 'h', 'st', 'money'];
    const bonuses = bonusValues
      .filter(key => char[`bonus_${key}`] !== 0)
      .map(key => `<span class="bonus-badge positive">${key.toUpperCase()}[${char[`bonus_${key}`].toFixed(2)}]</span>`);

    return `
      <div class="link-card">
        <div class="link-card-info">
          <h4>📊 ${char.biometric_type}${char.biometric_id ? ' #' + char.biometric_id : ''}</h4>
          <p>${char.description || '(без описания)'}</p>
          <div class="bonus-badges">${bonuses.join('')}</div>
        </div>
        <div class="controls">
          <button class="btn danger" onclick="deleteBiometricCharacteristic(${char.id})">Удалить</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderLists() {
  renderHabitBiometricList();
  renderHabitFinanceList();
  renderBiometricCharacteristicsList();
}

// ===== УПРАВЛЕНИЕ БЛОКАМИ В ФОРМЕ (привычка ↔ биометрика) =====
function setupBiometricScopeBlocks() {
  const radioAny = document.querySelector('input[name="bio_scope"][value="any_type"]');
  const radioType = document.querySelector('input[name="bio_scope"][value="specific_type"]');
  const radioRecord = document.querySelector('input[name="bio_scope"][value="specific_record"]');
  const typeBlock = document.getElementById('typeActivityBlock');
  const recordBlock = document.getElementById('specificRecordBlock');

  if (!radioAny || !radioType || !radioRecord) return;

  const updateBlocks = () => {
    typeBlock.style.display = radioType.checked ? 'block' : 'none';
    recordBlock.style.display = radioRecord.checked ? 'block' : 'none';
    if (!radioType.checked) {
      document.getElementById('hb-activity-type-select').value = '';
    }
    if (!radioRecord.checked) {
      document.getElementById('hb-biometric-id').value = '';
      document.getElementById('hb-biometric-select').value = '';
    }
  };

  radioAny.addEventListener('change', updateBlocks);
  radioType.addEventListener('change', updateBlocks);
  radioRecord.addEventListener('change', updateBlocks);
  updateBlocks();

  // Сохраним функцию в глобальную область, чтобы вызывать из createHabitBiometricLink
  window.updateBiometricScopeBlocks = updateBlocks;
}

// ===== СОЗДАНИЕ / УДАЛЕНИЕ =====
async function createCombination() {
  const name = document.getElementById('combo-name').value.trim();
  const habitA = document.getElementById('combo-habit-a').value;
  const habitB = document.getElementById('combo-habit-b').value;

  if (!habitA || !habitB) {
    alert('Выберите обе привычки');
    return;
  }

  const data = {
    name: name || null,
    habit_a: parseInt(habitA),
    habit_b: parseInt(habitB),
    i: parseFloat(document.getElementById('combo-bonus-i').value) || 0,
    s: parseFloat(document.getElementById('combo-bonus-s').value) || 0,
    w: parseFloat(document.getElementById('combo-bonus-w').value) || 0,
    e: parseFloat(document.getElementById('combo-bonus-e').value) || 0,
    c: parseFloat(document.getElementById('combo-bonus-c').value) || 0,
    h: parseFloat(document.getElementById('combo-bonus-h').value) || 0,
    st: parseFloat(document.getElementById('combo-bonus-st').value) || 0,
    money: parseFloat(document.getElementById('combo-bonus-money').value) || 0,
  };

  try {
    const res = await fetch('/api/combinations/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (res.ok && result.status === 'success') {
      alert('✓ Сочетание создано');
      document.getElementById('combo-name').value = '';
      document.getElementById('combo-habit-a').value = '';
      document.getElementById('combo-habit-b').value = '';
      document.querySelectorAll('#combo-bonuses input').forEach(el => el.value = '0');

      await loadCombinations();
      renderHabitHabitList();
    } else {
      if (result.message !== 'created')
        alert('Ошибка: ' + (result.message || 'Неизвестная ошибка'));
    }
  } catch (e) {
    alert('Ошибка при создании сочетания: ' + e.message);
  }
}

async function createHabitBiometricLink() {
  const habitId = document.getElementById('hb-habit-id').value;
  const type = document.getElementById('hb-biometric-type').value;

  if (!habitId || !type) {
    alert('Выберите привычку и тип биометрики');
    return;
  }

  let biometric_id = null;
  let biometric_value = null;
  const scope = document.querySelector('input[name="bio_scope"]:checked').value;

  if (scope === 'specific_record') {
    biometric_id = document.getElementById('hb-biometric-id').value || null;
  } else if (scope === 'specific_type') {
    biometric_value = document.getElementById('hb-activity-type-select').value;
    if (!biometric_value) {
      alert('Выберите тип активности');
      return;
    }
  }

  const data = {
    habit_id: parseInt(habitId),
    biometric_type: type,
    biometric_id: biometric_id,
    biometric_value: biometric_value,
    bonus_i: parseFloat(document.getElementById('hb-bonus-i').value) || 0,
    bonus_s: parseFloat(document.getElementById('hb-bonus-s').value) || 0,
    bonus_w: parseFloat(document.getElementById('hb-bonus-w').value) || 0,
    bonus_e: parseFloat(document.getElementById('hb-bonus-e').value) || 0,
    bonus_c: parseFloat(document.getElementById('hb-bonus-c').value) || 0,
    bonus_h: parseFloat(document.getElementById('hb-bonus-h').value) || 0,
    bonus_st: parseFloat(document.getElementById('hb-bonus-st').value) || 0,
    bonus_money: parseFloat(document.getElementById('hb-bonus-money').value) || 0,
  };

  try {
    const res = await fetch('/api/combinations/habit-biometric', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (res.ok && result.status === 'created') {
      alert('✓ Связь создана');
      // Сброс формы
      document.getElementById('hb-biometric-type').value = '';
      document.getElementById('hb-biometric-id').value = '';
      document.getElementById('hb-activity-type-select').value = '';
      document.querySelectorAll('#hb-bonuses input').forEach(el => el.value = '0');
      // Сброс радиокнопок на значение по умолчанию
      const radioAny = document.querySelector('input[name="bio_scope"][value="any_type"]');
      if (radioAny) radioAny.checked = true;
      if (window.updateBiometricScopeBlocks) window.updateBiometricScopeBlocks();

      await loadHabitBiometricLinks();
      renderLists();
    } else {
      if (result.message !== 'created')
        alert('Ошибка: ' + (result.message || 'Неизвестная ошибка'));
    }
  } catch (e) {
    alert('Ошибка при создании связи: ' + e.message);
  }
}

async function createHabitFinanceLink() {
  const habitId = document.getElementById('hf-habit-id').value;
  const type = document.getElementById('hf-finance-type').value;

  if (!habitId || !type) {
    alert('Выберите привычку и тип финансов');
    return;
  }

  const data = {
    habit_id: parseInt(habitId),
    finance_type: type,
    category_id: document.getElementById('hf-category-id').value || null,
    threshold: parseFloat(document.getElementById('hf-threshold').value) || 0,
    bonus_i: parseFloat(document.getElementById('hf-bonus-i').value) || 0,
    bonus_s: parseFloat(document.getElementById('hf-bonus-s').value) || 0,
    bonus_w: parseFloat(document.getElementById('hf-bonus-w').value) || 0,
    bonus_e: parseFloat(document.getElementById('hf-bonus-e').value) || 0,
    bonus_c: parseFloat(document.getElementById('hf-bonus-c').value) || 0,
    bonus_h: parseFloat(document.getElementById('hf-bonus-h').value) || 0,
    bonus_st: parseFloat(document.getElementById('hf-bonus-st').value) || 0,
    bonus_money: parseFloat(document.getElementById('hf-bonus-money').value) || 0,
  };

  try {
    const res = await fetch('/api/combinations/habit-finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (res.ok && result.status === 'created') {
      alert('✓ Связь создана');
      document.getElementById('hf-finance-type').value = '';
      document.getElementById('hf-category-id').value = '';
      document.getElementById('hf-threshold').value = '0';
      document.querySelectorAll('#hf-bonuses input').forEach(el => el.value = '0');

      await loadHabitFinanceLinks();
      renderLists();
    } else {
      if (result.message !== 'created')
        alert('Ошибка: ' + (result.message || 'Неизвестная ошибка'));
    }
  } catch (e) {
    alert('Ошибка при создании связи: ' + e.message);
  }
}

async function createBiometricCharacteristic() {
  const type = document.getElementById('ba-biometric-type').value;

  if (!type) {
    alert('Выберите тип биометрики');
    return;
  }

  const data = {
    biometric_type: type,
    biometric_id: document.getElementById('ba-biometric-id').value || null,
    bonus_i: parseFloat(document.getElementById('ba-bonus-i').value) || 0,
    bonus_s: parseFloat(document.getElementById('ba-bonus-s').value) || 0,
    bonus_w: parseFloat(document.getElementById('ba-bonus-w').value) || 0,
    bonus_e: parseFloat(document.getElementById('ba-bonus-e').value) || 0,
    bonus_c: parseFloat(document.getElementById('ba-bonus-c').value) || 0,
    bonus_h: parseFloat(document.getElementById('ba-bonus-h').value) || 0,
    bonus_st: parseFloat(document.getElementById('ba-bonus-st').value) || 0,
    bonus_money: parseFloat(document.getElementById('ba-bonus-money').value) || 0,
    description: document.getElementById('ba-description').value,
  };

  try {
    const res = await fetch('/api/combinations/biometric-characteristics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (res.ok && result.status === 'created') {
      alert('✓ Правило создано');
      document.getElementById('ba-biometric-type').value = '';
      document.getElementById('ba-biometric-id').value = '';
      document.getElementById('ba-description').value = '';
      document.querySelectorAll('#ba-bonuses input').forEach((el, i) => {
        el.value = i === 6 ? '1' : '0'; // ST по умолчанию 1
      });

      await loadBiometricCharacteristics();
      renderLists();
    } else {
      if (result.message !== 'created')
        alert('Ошибка: ' + (result.message || 'Неизвестная ошибка'));
    }
  } catch (e) {
    alert('Ошибка при создании правила: ' + e.message);
  }
}

async function deleteCombination(comboId) {
  if (!confirm('Удалить сочетание?')) return;
  try {
    const res = await fetch(`/api/combinations/delete/${comboId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadCombinations();
      renderHabitHabitList();
    } else {
      alert('Ошибка удаления');
    }
  } catch (e) {
    console.error('Error deleting combination:', e);
  }
}

async function deleteHabitBiometricLink(linkId) {
  if (!confirm('Удалить эту связь?')) return;
  try {
    const res = await fetch(`/api/combinations/habit-biometric/${linkId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadHabitBiometricLinks();
      renderLists();
    }
  } catch (e) {
    console.error('Error deleting link:', e);
  }
}

async function deleteHabitFinanceLink(linkId) {
  if (!confirm('Удалить эту связь?')) return;
  try {
    const res = await fetch(`/api/combinations/habit-finance/${linkId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadHabitFinanceLinks();
      renderLists();
    }
  } catch (e) {
    console.error('Error deleting link:', e);
  }
}

async function deleteBiometricCharacteristic(charId) {
  if (!confirm('Удалить это правило?')) return;
  try {
    const res = await fetch(`/api/combinations/biometric-characteristics/${charId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadBiometricCharacteristics();
      renderLists();
    }
  } catch (e) {
    console.error('Error deleting characteristic:', e);
  }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
function setupEventListeners() {
  // Переключение вкладок
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });

  // Кнопки создания
  const hbBtn = document.getElementById('hb-create-btn');
  if (hbBtn) hbBtn.addEventListener('click', createHabitBiometricLink);
  const comboBtn = document.getElementById('combo-create-btn');
  if (comboBtn) comboBtn.addEventListener('click', createCombination);
  const hfBtn = document.getElementById('hf-create-btn');
  if (hfBtn) hfBtn.addEventListener('click', createHabitFinanceLink);
  const baBtn = document.getElementById('ba-create-btn');
  if (baBtn) baBtn.addEventListener('click', createBiometricCharacteristic);
}

async function init() {
  await Promise.all([
    loadHabits(),
    loadCategories(),
    loadCombinations(),
    loadHabitBiometricLinks(),
    loadHabitFinanceLinks(),
    loadBiometricCharacteristics(),
    loadBiometricDictionaries(),
    loadActivityTypesList()
  ]);

  setupEventListeners();
  setupBiometricScopeBlocks();
  renderHabitHabitList();
  renderLists();

  // Подписка на изменение типа биометрики для загрузки списка записей
  const typeSelect = document.getElementById('hb-biometric-type');
  if (typeSelect) {
    typeSelect.addEventListener('change', async (e) => {
      const type = e.target.value;
      if (!type) return;
      const items = await loadBiometricItems(type);
      updateBiometricSelect('hb-biometric-select', items, 'hb-biometric-id');
    });
  }
}

// ===== ЗАПУСК =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}