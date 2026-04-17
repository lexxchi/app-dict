import {
  DICTIONARY_MANIFEST_PATH,
  FALLBACK_DICTIONARY,
  LAST_UPDATED_AT,
  PAIRS_PER_BATCH,
  PAIRS_PER_ROUND,
  PLATFORM_VERSION,
  WORD_LIST_PREVIEW_LIMIT,
} from './config.js';
import { loadDictionaryManifest, loadDictionaryPairs } from './dictionary-service.js';
import { createTrainer } from './trainer.js';
import { createWordList } from './word-list.js';

const boardEl = document.getElementById('board');
const messageEl = document.getElementById('message');
const statusEl = document.getElementById('status-text');
const progressFillEl = document.getElementById('progress-fill');
const sessionProgressFillEl = document.getElementById('session-progress-fill');
const sessionProgressTextEl = document.getElementById('session-progress-text');
const newRoundBtn = document.getElementById('new-round');
const wordCountEl = document.getElementById('word-count');
const selectedBaseSummaryEl = document.getElementById('selected-base-summary');
const platformMetaEl = document.getElementById('platform-meta');
const dictionarySelectEl = document.getElementById('dictionary-select');

let dictionaries = [];
let activeDictionary = null;
let allPairs = [];
let dictionaryLoadToken = 0;
const sessionProgressByDictionary = new Map();

const trainer = createTrainer({
  boardEl,
  statusEl,
  messageEl,
  progressFillEl,
  pairsPerRound: PAIRS_PER_ROUND,
  pairsPerBatch: PAIRS_PER_BATCH,
  onPairMatched: handlePairMatched,
});

const wordList = createWordList({
  summaryEl: document.getElementById('word-list-summary'),
  bodyEl: document.getElementById('word-list-body'),
  toggleBtn: document.getElementById('word-list-toggle'),
  wrapEl: document.getElementById('word-list-wrap'),
  previewLimit: WORD_LIST_PREVIEW_LIMIT,
});

init();

function init() {
  newRoundBtn.addEventListener('click', () => trainer.startRound(true));
  dictionarySelectEl.addEventListener('change', handleDictionaryChange);
  updateWordCount();
  updatePlatformMeta();
  loadDictionaries();
}

async function loadDictionaries() {
  const result = await loadDictionaryManifest(DICTIONARY_MANIFEST_PATH, FALLBACK_DICTIONARY);
  dictionaries = result.dictionaries;

  if (result.error) {
    trainer.showMessage(`${result.error.message}. Использую ${FALLBACK_DICTIONARY.file}`, true);
  }

  renderDictionaryOptions();
  await switchDictionary(dictionaries[0]?.id);
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
  trainer.showMessage('');

  try {
    const pairs = await loadDictionaryPairs(dictionary);
    if (loadToken !== dictionaryLoadToken) {
      return;
    }
    if (!pairs.length) {
      throw new Error(`Словарь «${dictionary.name}» пуст`);
    }

    allPairs = pairs;
    trainer.setPairs(allPairs);
    updateWordCount();
    updateSessionProgress();
    wordList.setContent(allPairs, activeDictionary);
    trainer.showMessage(`Словарь «${dictionary.name}» загружен. Соедини пары.`);
    trainer.startRound(true);
  } catch (error) {
    if (loadToken !== dictionaryLoadToken) {
      return;
    }

    allPairs = [];
    trainer.resetAfterLoadError();
    updateWordCount();
    updateSessionProgress();
    wordList.setContent(allPairs, activeDictionary);
    trainer.showMessage(error.message, true);
    statusEl.textContent = 'Не удалось загрузить слова';
  } finally {
    if (loadToken === dictionaryLoadToken) {
      dictionarySelectEl.disabled = false;
      newRoundBtn.disabled = false;
    }
  }
}

function handlePairMatched(pairId) {
  if (!activeDictionary) {
    return;
  }

  const usedPairIds = getSessionProgressSet(activeDictionary.id);
  usedPairIds.add(pairId);
  updateSessionProgress();
}

function getSessionProgressSet(dictionaryId) {
  if (!sessionProgressByDictionary.has(dictionaryId)) {
    sessionProgressByDictionary.set(dictionaryId, new Set());
  }

  return sessionProgressByDictionary.get(dictionaryId);
}

function updateWordCount() {
  const total = allPairs.length;
  const dictionaryName = activeDictionary ? `«${activeDictionary.name}»` : '—';

  if (wordCountEl) {
    wordCountEl.textContent = `${total} слов`;
  }
  if (selectedBaseSummaryEl) {
    selectedBaseSummaryEl.textContent = `Выбрана база ${dictionaryName}: ${total} слов`;
  }
}

function updateSessionProgress() {
  if (!sessionProgressFillEl || !sessionProgressTextEl) {
    return;
  }

  const total = allPairs.length;
  const used = activeDictionary ? getSessionProgressSet(activeDictionary.id).size : 0;
  const dictionaryName = activeDictionary ? activeDictionary.name : '—';
  const progress = total ? Math.min(100, (used / total) * 100) : 0;

  sessionProgressFillEl.style.width = `${progress}%`;
  sessionProgressTextEl.textContent = `Пройдено ${used} слов из ${total} слов словаря «${dictionaryName}»`;
}

function updatePlatformMeta() {
  if (!platformMetaEl) {
    return;
  }

  platformMetaEl.innerHTML = `Version ${PLATFORM_VERSION} • <a href="changelog.html" class="app-footer__link">Обновлено ${LAST_UPDATED_AT}</a>`;
}
