const PAIRS_PER_ROUND = 20;
const PAIRS_PER_BATCH = 5;
// NOTE: Increment PLATFORM_VERSION and adjust LAST_UPDATED_AT when shipping new functionality.
const PLATFORM_VERSION = '0.06';
const LAST_UPDATED_AT = '17.04.2026 17:44';
const DICTIONARY_MANIFEST_PATH = 'dictionaries/index.json';
const FALLBACK_DICTIONARY = {
  id: 'default',
  name: 'Основной словарь',
  file: 'words.txt',
};

const boardEl = document.getElementById('board');
const messageEl = document.getElementById('message');
const statusEl = document.getElementById('status-text');
const progressFillEl = document.getElementById('progress-fill');
const newRoundBtn = document.getElementById('new-round');
const wordCountEl = document.getElementById('word-count');
const platformMetaEl = document.getElementById('platform-meta');
const dictionarySelectEl = document.getElementById('dictionary-select');

let allPairs = [];
let roundPairs = [];
let pendingPairs = [];
let currentBatchPairs = [];
let matchedPairs = 0;
let matchedInBatch = 0;
let selectedCards = [];
let incorrectAttempts = 0;
let dictionaries = [];
let activeDictionary = null;
let dictionaryLoadToken = 0;

init();

function init() {
  newRoundBtn.addEventListener('click', () => startRound(true));
  dictionarySelectEl.addEventListener('change', handleDictionaryChange);
  updateWordCount();
  updatePlatformMeta();
  loadDictionaries();
}

async function loadDictionaries() {
  try {
    const response = await fetch(DICTIONARY_MANIFEST_PATH);
    if (!response.ok) {
      throw new Error('Не получилось загрузить список словарей');
    }
    const payload = await response.json();
    dictionaries = normalizeDictionaries(payload.dictionaries);
    if (!dictionaries.length) {
      throw new Error('Список словарей пуст');
    }
  } catch (error) {
    dictionaries = [FALLBACK_DICTIONARY];
    showMessage(`${error.message}. Использую words.txt`, true);
  }

  renderDictionaryOptions();
  await switchDictionary(dictionaries[0]?.id);
}

function normalizeDictionaries(rawDictionaries) {
  if (!Array.isArray(rawDictionaries)) {
    return [];
  }
  return rawDictionaries
    .map((dictionary) => ({
      id: typeof dictionary?.id === 'string' ? dictionary.id.trim() : '',
      name: typeof dictionary?.name === 'string' ? dictionary.name.trim() : '',
      file: typeof dictionary?.file === 'string' ? dictionary.file.trim() : '',
    }))
    .filter((dictionary) => dictionary.id && dictionary.name && dictionary.file);
}

function renderDictionaryOptions() {
  dictionarySelectEl.innerHTML = '';
  dictionaries.forEach((dictionary) => {
    const option = document.createElement('option');
    option.value = dictionary.id;
    option.textContent = dictionary.name;
    dictionarySelectEl.appendChild(option);
  });
}

async function handleDictionaryChange(event) {
  await switchDictionary(event.target.value);
}

async function switchDictionary(dictionaryId) {
  const dictionary = dictionaries.find((item) => item.id === dictionaryId);
  if (!dictionary) {
    return;
  }
  activeDictionary = dictionary;
  dictionarySelectEl.value = dictionary.id;
  await loadWords(dictionary);
}

async function loadWords(dictionary) {
  const loadToken = ++dictionaryLoadToken;
  dictionarySelectEl.disabled = true;
  newRoundBtn.disabled = true;
  statusEl.textContent = `Загружаю словарь «${dictionary.name}»...`;
  showMessage('');

  try {
    const response = await fetch(dictionary.file);
    if (!response.ok) {
      throw new Error(`Не получилось загрузить ${dictionary.file}`);
    }
    const text = await response.text();
    if (loadToken !== dictionaryLoadToken) {
      return;
    }
    allPairs = parseWordList(text);
    if (!allPairs.length) {
      throw new Error(`Словарь «${dictionary.name}» пуст`);
    }
    updateWordCount();
    showMessage(`Словарь «${dictionary.name}» загружен. Соедини пары.`);
    startRound(true);
  } catch (error) {
    if (loadToken !== dictionaryLoadToken) {
      return;
    }
    allPairs = [];
    roundPairs = [];
    pendingPairs = [];
    currentBatchPairs = [];
    matchedPairs = 0;
    matchedInBatch = 0;
    selectedCards = [];
    incorrectAttempts = 0;
    setProgress(0);
    boardEl.innerHTML = '<p class="board-placeholder">Словарь недоступен. Выбери другую базу.</p>';
    updateWordCount();
    showMessage(error.message, true);
    statusEl.textContent = 'Не удалось загрузить слова';
  } finally {
    if (loadToken === dictionaryLoadToken) {
      dictionarySelectEl.disabled = false;
      newRoundBtn.disabled = false;
    }
  }
}

function parseWordList(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line, index) => {
      const [left, ...rightParts] = line.split(':');
      const greek = (left || '').trim();
      const translation = rightParts.join(':').trim();
      if (!greek || !translation) {
        return null;
      }
      return {
        id: `pair-${index}`,
        greek,
        translation,
      };
    })
    .filter(Boolean);
}

function startRound(forceNewSample) {
  if (!allPairs.length) {
    return;
  }
  if (forceNewSample || !roundPairs.length) {
    roundPairs = pickRandomPairs(allPairs, PAIRS_PER_ROUND);
  }
  pendingPairs = [...roundPairs];
  matchedPairs = 0;
  matchedInBatch = 0;
  selectedCards = [];
  incorrectAttempts = 0;
  loadNextBatch();
  updateStatus();
  setProgress(0);
}

function loadNextBatch() {
  currentBatchPairs = pendingPairs.splice(0, PAIRS_PER_BATCH);
  matchedInBatch = 0;
  selectedCards = [];
  if (!currentBatchPairs.length) {
    renderRoundSummary();
    showMessage('Раунд завершён! Нажми «Новый раунд», чтобы продолжить.');
    return;
  }
  renderBoard(currentBatchPairs);
  showMessage('Найди соответствия между колонками.');
}

function pickRandomPairs(source, limit) {
  const pool = [...source];
  shuffle(pool);
  return pool.slice(0, Math.min(limit, pool.length));
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function renderBoard(pairs) {
  boardEl.innerHTML = '';
  if (!pairs.length) {
    const placeholder = document.createElement('p');
    placeholder.className = 'board-placeholder';
    placeholder.textContent = 'Подготовься к новому раунду!';
    boardEl.appendChild(placeholder);
    return;
  }

  const translationColumn = document.createElement('div');
  translationColumn.className = 'column column-translation';
  translationColumn.setAttribute('aria-label', 'Колонка переводов');

  const greekColumn = document.createElement('div');
  greekColumn.className = 'column column-greek';
  greekColumn.setAttribute('aria-label', 'Колонка греческих слов');

  const translationCards = pairs.map((pair) => createCard(pair, 'translation'));
  const greekCards = pairs.map((pair) => createCard(pair, 'greek'));
  shuffle(translationCards).forEach((card) => translationColumn.appendChild(card));
  shuffle(greekCards).forEach((card) => greekColumn.appendChild(card));

  boardEl.appendChild(translationColumn);
  boardEl.appendChild(greekColumn);
}

function createCard(pair, side) {
  const button = document.createElement('button');
  button.className = 'card';
  button.type = 'button';
  button.textContent = side === 'greek' ? pair.greek : pair.translation;
  button.dataset.pairId = pair.id;
  button.dataset.side = side;
  button.addEventListener('click', () => handleCardClick(button));
  return button;
}

function handleCardClick(card) {
  if (card.classList.contains('matched') || card.classList.contains('selected')) {
    return;
  }
  if (selectedCards.length === 2) {
    return;
  }

  const isTranslation = card.dataset.side === 'translation';
  if (isTranslation) {
    selectedCards.forEach((selected) => selected.classList.remove('selected'));
    selectedCards = [];
    card.classList.add('selected');
    selectedCards = [card];
    return;
  }

  card.classList.add('selected');
  selectedCards.push(card);
  if (selectedCards.length === 2) {
    checkSelection();
  }
}

function checkSelection() {
  const [first, second] = selectedCards;
  const isSamePair = first.dataset.pairId === second.dataset.pairId;
  const isDifferentSide = first.dataset.side !== second.dataset.side;

  if (isSamePair && isDifferentSide) {
    first.classList.add('matched');
    second.classList.add('matched');
    first.disabled = true;
    second.disabled = true;
    matchedPairs += 1;
    matchedInBatch += 1;
    showMessage('Отлично! Пара найдена.');
    updateStatus();
    setProgress(matchedPairs / roundPairs.length);
    selectedCards = [];

    if (matchedPairs === roundPairs.length) {
      showMessage('Раунд завершён! Посмотри статистику и начни новый раунд.');
      renderRoundSummary();
      return;
    }

    if (matchedInBatch === currentBatchPairs.length) {
      showMessage('Набор завершён! Загружаю следующие слова.');
      setTimeout(() => loadNextBatch(), 500);
    }
  } else {
    incorrectAttempts += 1;
    updateStatus();
    showMessage('Не совпало, попробуй ещё.', true);
    setTimeout(() => {
      first.classList.remove('selected');
      second.classList.remove('selected');
      selectedCards = [];
    }, 600);
  }
}

function updateStatus() {
  const totalPairs = roundPairs.length || 0;
  if (!totalPairs) {
    statusEl.textContent = 'Выбери словарь и добавь в него пары, чтобы начать.';
    return;
  }
  statusEl.textContent = `Найдено слов: ${matchedPairs} из ${totalPairs} • Ошибок: ${incorrectAttempts}`;
}

function setProgress(progress) {
  const percent = Math.min(100, Math.max(0, progress * 100));
  progressFillEl.style.width = `${percent}%`;
}

function updateWordCount() {
  if (!wordCountEl) {
    return;
  }
  const total = allPairs.length;
  const dictionaryName = activeDictionary ? `«${activeDictionary.name}»` : '—';
  wordCountEl.textContent = `База ${dictionaryName}: ${total} слов`;
}

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle('error', isError);
}

function updatePlatformMeta() {
  if (!platformMetaEl) {
    return;
  }
  platformMetaEl.innerHTML = `Version ${PLATFORM_VERSION} • <a href="changelog.html" class="app-footer__link">Обновлено ${LAST_UPDATED_AT}</a>`;
}

function renderRoundSummary() {
  const totalPairs = roundPairs.length;
  if (!totalPairs) {
    boardEl.innerHTML = '';
    return;
  }
  const attempts = matchedPairs + incorrectAttempts;
  const accuracy = attempts ? Math.round((matchedPairs / attempts) * 100) : 100;
  boardEl.innerHTML = `
    <div class="round-summary">
      <h2>Раунд завершён</h2>
      <ul class="round-summary__stats">
        <li>
          <span>Всего пар</span>
          <strong>${totalPairs}</strong>
        </li>
        <li>
          <span>Ошибок</span>
          <strong>${incorrectAttempts}</strong>
        </li>
        <li>
          <span>Точность</span>
          <strong>${accuracy}%</strong>
        </li>
      </ul>
      <p class="round-summary__hint">Нажми «Новый раунд», чтобы сыграть ещё.</p>
    </div>
  `;
}
