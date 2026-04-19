import { TRAINING_MODES } from './config.js';

export function createTrainer({
  boardEl,
  statusEl,
  messageEl,
  progressFillEl,
  pairsPerRound,
  pairsPerBatch,
  trainingMode = TRAINING_MODES.MATCH_PAIRS,
  onPairMatched = () => {},
}) {
  let allPairs = [];
  let roundPairs = [];
  let pendingPairs = [];
  let currentBatchPairs = [];
  let matchedPairs = 0;
  let matchedInBatch = 0;
  let selectedCards = [];
  let incorrectAttempts = 0;
  let activeMode = trainingMode;
  let currentQuestionIndex = 0;
  let choiceLocked = false;
  let choiceTimerId = null;

  function setPairs(nextPairs) {
    allPairs = nextPairs;
  }

  function setMode(nextMode) {
    if (!Object.values(TRAINING_MODES).includes(nextMode)) {
      return;
    }

    activeMode = nextMode;
    clearChoiceTimer();
  }

  function startRound(forceNewSample = true) {
    if (!allPairs.length) {
      return;
    }

    clearChoiceTimer();

    if (activeMode === TRAINING_MODES.PICK_TRANSLATION) {
      startChoiceRound(forceNewSample);
      return;
    }

    startMatchRound(forceNewSample);
  }

  function startMatchRound(forceNewSample = true) {
    if (forceNewSample || !roundPairs.length) {
      roundPairs = pickRandomPairs(allPairs, pairsPerRound);
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

  function startChoiceRound(forceNewSample = true) {
    if (forceNewSample || !roundPairs.length) {
      roundPairs = pickRandomPairs(allPairs, pairsPerRound);
    }

    pendingPairs = [];
    currentBatchPairs = [];
    matchedPairs = 0;
    matchedInBatch = 0;
    selectedCards = [];
    incorrectAttempts = 0;
    currentQuestionIndex = 0;
    choiceLocked = false;
    renderChoiceQuestion();
    updateStatus();
    setProgress(0);
  }

  function resetAfterLoadError() {
    clearChoiceTimer();
    allPairs = [];
    roundPairs = [];
    pendingPairs = [];
    currentBatchPairs = [];
    matchedPairs = 0;
    matchedInBatch = 0;
    selectedCards = [];
    incorrectAttempts = 0;
    currentQuestionIndex = 0;
    choiceLocked = false;
    setProgress(0);
    boardEl.classList.add('board--single');
    boardEl.classList.remove('board--choice');
    boardEl.innerHTML = '<p class="board-placeholder">Словарь недоступен. Выбери другую базу.</p>';
  }

  function loadNextBatch() {
    currentBatchPairs = pendingPairs.splice(0, pairsPerBatch);
    matchedInBatch = 0;
    selectedCards = [];

    if (!currentBatchPairs.length) {
      renderRoundSummary();
      showMessage('Раунд завершён! Нажми «Новый раунд», чтобы продолжить.');
      return;
    }

    renderMatchBoard(currentBatchPairs);
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

  function renderMatchBoard(pairs) {
    boardEl.classList.remove('board--single', 'board--choice');
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

    const translationCards = pairs.map((pair) => createMatchCard(pair, 'translation'));
    const greekCards = pairs.map((pair) => createMatchCard(pair, 'greek'));
    shuffle(translationCards).forEach((card) => translationColumn.appendChild(card));
    shuffle(greekCards).forEach((card) => greekColumn.appendChild(card));

    boardEl.appendChild(translationColumn);
    boardEl.appendChild(greekColumn);
    fitBoardCards();
  }

  function createMatchCard(pair, side) {
    const button = document.createElement('button');
    const text = document.createElement('span');
    button.className = 'card';
    button.type = 'button';
    text.className = 'card__text';
    text.textContent = side === 'greek' ? pair.greek : pair.translation;
    button.dataset.pairId = pair.id;
    button.dataset.side = side;
    button.addEventListener('click', () => handleCardClick(button));
    button.appendChild(text);
    return button;
  }

  function renderChoiceQuestion() {
    choiceLocked = false;

    if (currentQuestionIndex >= roundPairs.length) {
      renderRoundSummary();
      showMessage('Раунд завершён! Посмотри статистику и начни новый раунд.');
      return;
    }

    const pair = roundPairs[currentQuestionIndex];
    const questionSide = Math.random() < 0.5 ? 'greek' : 'translation';
    const answerSide = questionSide === 'greek' ? 'translation' : 'greek';
    const options = buildAnswerOptions(pair, answerSide);

    boardEl.classList.add('board--single', 'board--choice');
    boardEl.innerHTML = '';

    const panel = document.createElement('div');
    panel.className = 'choice-panel';

    const label = document.createElement('p');
    label.className = 'choice-panel__label';
    label.textContent = questionSide === 'greek' ? 'Выбери перевод' : 'Выбери греческое слово';

    const question = document.createElement('h2');
    question.className = 'choice-panel__question';
    question.textContent = getPairSide(pair, questionSide);

    const optionsEl = document.createElement('div');
    optionsEl.className = 'choice-panel__options';

    options.forEach((optionPair) => {
      optionsEl.appendChild(createChoiceOption(optionPair, answerSide, optionPair.id === pair.id));
    });

    panel.appendChild(label);
    panel.appendChild(question);
    panel.appendChild(optionsEl);
    boardEl.appendChild(panel);
    showMessage('Выбери правильный вариант.');
    fitBoardCards();
  }

  function createChoiceOption(pair, answerSide, isCorrect) {
    const button = document.createElement('button');
    const text = document.createElement('span');
    button.className = 'card choice-option';
    button.type = 'button';
    button.dataset.pairId = pair.id;
    button.dataset.correct = String(isCorrect);
    text.className = 'card__text';
    text.textContent = getPairSide(pair, answerSide);
    button.appendChild(text);
    button.addEventListener('click', () => handleChoiceAnswer(button));
    return button;
  }

  function buildAnswerOptions(targetPair, answerSide) {
    const options = [targetPair];
    const rankedDistractors = getRankedDistractors(targetPair, answerSide);

    rankedDistractors.forEach((pair) => {
      if (options.length < 4 && !options.some((option) => option.id === pair.id)) {
        options.push(pair);
      }
    });

    if (options.length < 4) {
      const fallbackPool = shuffle(allPairs.filter((pair) => pair.id !== targetPair.id));
      fallbackPool.forEach((pair) => {
        if (options.length < 4 && !options.some((option) => option.id === pair.id)) {
          options.push(pair);
        }
      });
    }

    return shuffle(options);
  }

  function getRankedDistractors(targetPair, answerSide) {
    const targetType = inferPartOfSpeech(targetPair);
    const targetText = normalizeForSimilarity(getPairSide(targetPair, answerSide));
    const candidates = allPairs.filter((pair) => pair.id !== targetPair.id);
    const sameType = candidates.filter((pair) => inferPartOfSpeech(pair) === targetType);
    const pool = sameType.length >= 3 ? sameType : candidates;

    return pool
      .map((pair) => ({
        pair,
        score: getWritingSimilarity(targetText, normalizeForSimilarity(getPairSide(pair, answerSide))) + Math.random() * 0.01,
      }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.pair);
  }

  function inferPartOfSpeech(pair) {
    const greek = pair.greek.replace(/^[*\s]+/, '').toLowerCase();

    if (/\s-\s/.test(greek)) {
      return 'adjective';
    }
    if (/^(ο|η|το|οι|τα|ο\/η|τον|την|τους|τις)\s/u.test(greek)) {
      return 'noun';
    }
    if (/\p{Script=Greek}ω(?:\s|$)/u.test(greek)) {
      return 'verb';
    }

    return 'other';
  }

  function getPairSide(pair, side) {
    return side === 'greek' ? pair.greek : pair.translation;
  }

  function normalizeForSimilarity(value) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
      .trim();
  }

  function getWritingSimilarity(first, second) {
    if (!first || !second) {
      return 0;
    }
    if (first === second) {
      return 1;
    }

    const firstBigrams = getBigrams(first);
    const secondBigrams = getBigrams(second);
    if (!firstBigrams.length || !secondBigrams.length) {
      return first[0] === second[0] ? 0.2 : 0;
    }

    const secondCounts = new Map();
    secondBigrams.forEach((bigram) => {
      secondCounts.set(bigram, (secondCounts.get(bigram) || 0) + 1);
    });

    let matches = 0;
    firstBigrams.forEach((bigram) => {
      const count = secondCounts.get(bigram) || 0;
      if (count) {
        matches += 1;
        secondCounts.set(bigram, count - 1);
      }
    });

    return (matches * 2) / (firstBigrams.length + secondBigrams.length);
  }

  function getBigrams(value) {
    const compact = value.replace(/\s+/g, '');
    if (compact.length < 2) {
      return compact ? [compact] : [];
    }

    const bigrams = [];
    for (let index = 0; index < compact.length - 1; index += 1) {
      bigrams.push(compact.slice(index, index + 2));
    }
    return bigrams;
  }

  function handleChoiceAnswer(option) {
    if (choiceLocked) {
      return;
    }

    choiceLocked = true;
    const isCorrect = option.dataset.correct === 'true';
    const correctOption = boardEl.querySelector('.choice-option[data-correct="true"]');
    const currentPair = roundPairs[currentQuestionIndex];

    boardEl.querySelectorAll('.choice-option').forEach((button) => {
      button.disabled = true;
    });

    if (isCorrect) {
      option.classList.add('matched');
      showMessage('Верно! Идём дальше.');
    } else {
      incorrectAttempts += 1;
      option.classList.add('incorrect');
      correctOption?.classList.add('matched');
      showMessage('Неверно. Правильный ответ подсвечен зелёным.', true);
    }

    matchedPairs += 1;
    currentQuestionIndex += 1;
    onPairMatched(currentPair.id);
    updateStatus();
    setProgress(matchedPairs / roundPairs.length);
    choiceTimerId = setTimeout(() => renderChoiceQuestion(), isCorrect ? 750 : 2000);
  }

  function fitBoardCards() {
    requestAnimationFrame(() => {
      boardEl.querySelectorAll('.card').forEach(fitCardText);
    });
  }

  function fitCardText(card) {
    const text = card.querySelector('.card__text');
    if (!text) {
      return;
    }

    text.style.fontSize = '';
    let fontSize = Number.parseFloat(window.getComputedStyle(text).fontSize);
    const minFontSize = 11;

    while (fontSize > minFontSize && isTextOverflowing(text, card)) {
      fontSize -= 1;
      text.style.fontSize = `${fontSize}px`;
    }
  }

  function isTextOverflowing(text, card) {
    const styles = window.getComputedStyle(text);
    const lineHeight = Number.parseFloat(styles.lineHeight);
    const maxTwoLineHeight = lineHeight * 2.2;

    return (
      text.scrollWidth > text.clientWidth ||
      text.scrollHeight > maxTwoLineHeight ||
      text.scrollHeight > card.clientHeight
    );
  }

  function handleCardClick(card) {
    if (card.classList.contains('matched') || card.classList.contains('selected')) {
      return;
    }
    if (selectedCards.length === 2) {
      return;
    }

    if (!selectedCards.length) {
      card.classList.add('selected');
      selectedCards = [card];
      return;
    }

    const [selectedCard] = selectedCards;
    const isSameSide = selectedCard.dataset.side === card.dataset.side;

    if (isSameSide) {
      selectedCards.forEach((selected) => selected.classList.remove('selected'));
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
      onPairMatched(first.dataset.pairId);
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
      first.classList.add('incorrect');
      second.classList.add('incorrect');
      setTimeout(() => {
        first.classList.remove('selected', 'incorrect');
        second.classList.remove('selected', 'incorrect');
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

    if (activeMode === TRAINING_MODES.PICK_TRANSLATION) {
      statusEl.textContent = `Пройдено слов: ${matchedPairs} из ${totalPairs} • Ошибок: ${incorrectAttempts}`;
      return;
    }

    statusEl.textContent = `Найдено слов: ${matchedPairs} из ${totalPairs} • Ошибок: ${incorrectAttempts}`;
  }

  function setProgress(progress) {
    const percent = Math.min(100, Math.max(0, progress * 100));
    progressFillEl.style.width = `${percent}%`;
  }

  function showMessage(text, isError = false) {
    messageEl.textContent = text;
    messageEl.classList.toggle('error', isError);
  }

  function renderRoundSummary() {
    clearChoiceTimer();
    const totalPairs = roundPairs.length;
    if (!totalPairs) {
      boardEl.innerHTML = '';
      return;
    }

    boardEl.classList.add('board--single');
    boardEl.classList.remove('board--choice');
    const correctAnswers = activeMode === TRAINING_MODES.PICK_TRANSLATION
      ? Math.max(0, totalPairs - incorrectAttempts)
      : matchedPairs;
    const attempts = activeMode === TRAINING_MODES.PICK_TRANSLATION
      ? totalPairs
      : matchedPairs + incorrectAttempts;
    const accuracy = attempts ? Math.round((correctAnswers / attempts) * 100) : 100;
    const totalLabel = activeMode === TRAINING_MODES.PICK_TRANSLATION ? 'Всего слов' : 'Всего пар';
    boardEl.innerHTML = `
      <div class="round-summary">
        <h2>Раунд завершён</h2>
        <ul class="round-summary__stats">
          <li>
            <span>${totalLabel}</span>
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

  function clearChoiceTimer() {
    if (choiceTimerId) {
      clearTimeout(choiceTimerId);
      choiceTimerId = null;
    }
  }

  return {
    setPairs,
    setMode,
    startRound,
    resetAfterLoadError,
    showMessage,
  };
}
