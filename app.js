const WORDS_PER_ROUND = 20; // 20 слов = 10 пар
const PAIRS_PER_BATCH = 5;
const PAIRS_PER_ROUND = Math.max(1, Math.floor(WORDS_PER_ROUND / 2));

const boardEl = document.getElementById('board');
const messageEl = document.getElementById('message');
const statusEl = document.getElementById('status-text');
const progressFillEl = document.getElementById('progress-fill');
const newRoundBtn = document.getElementById('new-round');
const addWordForm = document.getElementById('add-word-form');
const greekInput = document.getElementById('greek-input');
const translationInput = document.getElementById('translation-input');
const downloadBtn = document.getElementById('download-btn');

let allPairs = [];
let roundPairs = [];
let pendingPairs = [];
let currentBatchPairs = [];
let matchedPairs = 0;
let matchedInBatch = 0;
let selectedCards = [];

const generateId = (() => {
  let counter = 0;
  return () => `pair-${Date.now()}-${counter++}`;
})();

init();

function init() {
  newRoundBtn.addEventListener('click', () => startRound(true));
  addWordForm.addEventListener('submit', handleAddWord);
  downloadBtn.addEventListener('click', handleDownload);
  loadWords();
}

async function loadWords() {
  try {
    const response = await fetch('words.txt');
    if (!response.ok) {
      throw new Error('Не получилось загрузить words.txt');
    }
    const text = await response.text();
    allPairs = parseWordList(text);
    if (!allPairs.length) {
      throw new Error('Файл words.txt пуст — добавь слова через форму.');
    }
    showMessage('Слова загружены. Соедини пары.');
    downloadBtn.disabled = false;
    startRound(true);
  } catch (error) {
    showMessage(error.message, true);
    statusEl.textContent = 'Не удалось загрузить слова';
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
  loadNextBatch();
  updateStatus();
  setProgress(0);
}

function loadNextBatch() {
  currentBatchPairs = pendingPairs.splice(0, PAIRS_PER_BATCH);
  matchedInBatch = 0;
  selectedCards = [];
  if (!currentBatchPairs.length) {
    boardEl.innerHTML = '';
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
      showMessage('Раунд завершён! Нажми «Новый раунд», чтобы продолжить.');
      boardEl.innerHTML = '';
      return;
    }

    if (matchedInBatch === currentBatchPairs.length) {
      showMessage('Набор завершён! Загружаю следующие слова.');
      setTimeout(() => loadNextBatch(), 500);
    }
  } else {
    showMessage('Не совпало, попробуй ещё.', true);
    setTimeout(() => {
      first.classList.remove('selected');
      second.classList.remove('selected');
      selectedCards = [];
    }, 600);
  }
}

function updateStatus() {
  const totalWords = (roundPairs.length || 0) * 2;
  const foundWords = matchedPairs * 2;
  if (!totalWords) {
    statusEl.textContent = 'Добавь слова, чтобы начать.';
    return;
  }
  statusEl.textContent = `Найдено слов: ${foundWords} из ${totalWords}`;
}

function setProgress(progress) {
  const percent = Math.min(100, Math.max(0, progress * 100));
  progressFillEl.style.width = `${percent}%`;
}

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle('error', isError);
}

function handleAddWord(event) {
  event.preventDefault();
  const greek = greekInput.value.trim();
  const translation = translationInput.value.trim();
  if (!greek || !translation) {
    showMessage('Заполни оба поля, чтобы добавить пару.', true);
    return;
  }
  const newPair = { id: generateId(), greek, translation };
  allPairs.push(newPair);
  greekInput.value = '';
  translationInput.value = '';
  downloadBtn.disabled = false;
  showMessage('Пара добавлена! Скачай файл, чтобы сохранить изменения.');

  if (roundPairs.length < PAIRS_PER_ROUND) {
    roundPairs.push(newPair);
    pendingPairs.push(newPair);
  }
}

function handleDownload() {
  if (!allPairs.length) {
    return;
  }
  const content = allPairs.map((pair) => `${pair.greek} : ${pair.translation}`).join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'words.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showMessage('Файл сохранён. Замени существующий words.txt новым файлом.');
}
