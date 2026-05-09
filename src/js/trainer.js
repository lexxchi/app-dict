import { TRAINING_MODES } from './config.js';
import { appendFormattedDictionaryText, getPlainDictionaryDisplayText } from './dictionary-display.js';

const CHOICE_CORRECT_DELAY_MS = 1500;
const CHOICE_INCORRECT_DELAY_MS = 3000;
const WRITE_GREEK_MAX_ATTEMPTS = 1;
const BUILD_GREEK_MAX_MISTAKES = 3;
const MIX_MATCH_PAIR_COUNT = 5;
const MIX_MODE_PATTERN = [
  TRAINING_MODES.PICK_TRANSLATION,
  TRAINING_MODES.PICK_TRANSLATION,
  TRAINING_MODES.PICK_TRANSLATION,
  TRAINING_MODES.PICK_TRANSLATION,
  TRAINING_MODES.PICK_TRANSLATION,
  TRAINING_MODES.PICK_TRANSLATION,
  TRAINING_MODES.PICK_TRANSLATION,
  TRAINING_MODES.MATCH_PAIRS,
  TRAINING_MODES.MATCH_PAIRS,
  TRAINING_MODES.MATCH_PAIRS,
  TRAINING_MODES.WRITE_GREEK,
  TRAINING_MODES.WRITE_GREEK,
  TRAINING_MODES.WRITE_GREEK,
  TRAINING_MODES.WRITE_GREEK,
  TRAINING_MODES.BUILD_GREEK,
  TRAINING_MODES.BUILD_GREEK,
  TRAINING_MODES.BUILD_GREEK,
  TRAINING_MODES.BUILD_GREEK,
];
const TRAINER_DISPLAY_OPTIONS = {
  hideComments: true,
  hideExamples: true,
  hideGroupComments: true,
  stripLeadingExampleMarker: true,
};
const GREEK_ARTICLE_PATTERN = /^(?:ο\/η|ο|η|το|οι|τα|τον|την|τους|τις)\s+/iu;

export function createTrainer({
  boardEl,
  statusEl,
  messageEl,
  progressFillEl,
  pairsPerMode,
  pairsPerBatch,
  trainingMode = TRAINING_MODES.MATCH_PAIRS,
  onPairMatched = () => {},
}) {
  let allPairs = [];
  let roundPairs = [];
  let mixTasks = [];
  let pendingPairs = [];
  let currentBatchPairs = [];
  let matchedPairs = 0;
  let matchedInBatch = 0;
  let selectedCards = [];
  let incorrectAttempts = 0;
  let activeMode = trainingMode;
  let activeMixTaskMode = null;
  let currentQuestionIndex = 0;
  let choiceLocked = false;
  let choiceTimerId = null;
  let writeHintCount = 0;
  let writeAttemptCount = 0;
  let writeQuestionCompleted = false;
  let buildSelectedIndexes = [];
  let buildLetterButtons = [];
  let buildLocked = false;

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

    if (activeMode === TRAINING_MODES.MIX) {
      startMixRound(forceNewSample);
      return;
    }
    if (activeMode === TRAINING_MODES.PICK_TRANSLATION) {
      startChoiceRound(forceNewSample);
      return;
    }
    if (activeMode === TRAINING_MODES.WRITE_GREEK) {
      startWriteRound(forceNewSample);
      return;
    }
    if (activeMode === TRAINING_MODES.BUILD_GREEK) {
      startBuildRound(forceNewSample);
      return;
    }

    startMatchRound(forceNewSample);
  }

  function startMatchRound(forceNewSample = true) {
    if (forceNewSample || !roundPairs.length) {
      roundPairs = pickRandomPairs(allPairs, getPairsPerRound(TRAINING_MODES.MATCH_PAIRS));
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

  function startMixRound(forceNewSample = true) {
    if (forceNewSample || !mixTasks.length) {
      mixTasks = buildMixTasks(getPairsPerRound(TRAINING_MODES.MIX));
    }

    roundPairs = mixTasks.map((task) => task.pair || task.pairs[0]).filter(Boolean);
    pendingPairs = [];
    currentBatchPairs = [];
    matchedPairs = 0;
    matchedInBatch = 0;
    selectedCards = [];
    incorrectAttempts = 0;
    currentQuestionIndex = 0;
    choiceLocked = false;
    writeHintCount = 0;
    writeAttemptCount = 0;
    writeQuestionCompleted = false;
    buildSelectedIndexes = [];
    buildLetterButtons = [];
    buildLocked = false;
    renderMixTask();
    updateStatus();
    setProgress(0);
  }

  function startWriteRound(forceNewSample = true) {
    if (forceNewSample || !roundPairs.length) {
      roundPairs = pickRandomPairs(allPairs, getPairsPerRound(TRAINING_MODES.WRITE_GREEK));
    }

    pendingPairs = [];
    currentBatchPairs = [];
    matchedPairs = 0;
    matchedInBatch = 0;
    selectedCards = [];
    incorrectAttempts = 0;
    currentQuestionIndex = 0;
    choiceLocked = false;
    writeHintCount = 0;
    writeAttemptCount = 0;
    writeQuestionCompleted = false;
    renderWriteQuestion();
    updateStatus();
    setProgress(0);
  }

  function startBuildRound(forceNewSample = true) {
    if (forceNewSample || !roundPairs.length) {
      roundPairs = pickRandomPairs(allPairs, getPairsPerRound(TRAINING_MODES.BUILD_GREEK));
    }

    pendingPairs = [];
    currentBatchPairs = [];
    matchedPairs = 0;
    matchedInBatch = 0;
    selectedCards = [];
    incorrectAttempts = 0;
    currentQuestionIndex = 0;
    choiceLocked = false;
    writeHintCount = 0;
    writeAttemptCount = 0;
    writeQuestionCompleted = false;
    buildSelectedIndexes = [];
    buildLetterButtons = [];
    buildLocked = false;
    renderBuildQuestion();
    updateStatus();
    setProgress(0);
  }

  function startChoiceRound(forceNewSample = true) {
    if (forceNewSample || !roundPairs.length) {
      roundPairs = pickRandomPairs(allPairs, getPairsPerRound(TRAINING_MODES.PICK_TRANSLATION));
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
    mixTasks = [];
    pendingPairs = [];
    currentBatchPairs = [];
    matchedPairs = 0;
    matchedInBatch = 0;
    selectedCards = [];
    incorrectAttempts = 0;
    activeMixTaskMode = null;
    currentQuestionIndex = 0;
    choiceLocked = false;
    writeHintCount = 0;
    writeAttemptCount = 0;
    writeQuestionCompleted = false;
    buildSelectedIndexes = [];
    buildLetterButtons = [];
    buildLocked = false;
    setProgress(0);
    boardEl.classList.add('board--single');
    boardEl.classList.remove('board--choice', 'board--write', 'board--build');
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

  function getPairsPerRound(mode) {
    return pairsPerMode?.[mode] ?? pairsPerBatch;
  }

  function buildMixTasks(limit) {
    return shuffle([...MIX_MODE_PATTERN])
      .slice(0, limit)
      .map((mode) => {
        if (mode === TRAINING_MODES.MATCH_PAIRS) {
          return {
            mode,
            pairs: pickRandomPairs(allPairs, Math.min(MIX_MATCH_PAIR_COUNT, allPairs.length)),
          };
        }

        return {
          mode,
          pair: pickRandomPairs(allPairs, 1)[0],
        };
      })
      .filter((task) => task.pair || task.pairs?.length);
  }

  function isMixMode() {
    return activeMode === TRAINING_MODES.MIX;
  }

  function getCurrentTask() {
    return isMixMode() ? mixTasks[currentQuestionIndex] : null;
  }

  function getCurrentQuestionPair() {
    return isMixMode() ? getCurrentTask()?.pair : roundPairs[currentQuestionIndex];
  }

  function getSequentialRoundTotal() {
    return isMixMode() ? mixTasks.length : roundPairs.length;
  }

  function getRoundWordTotal() {
    if (!isMixMode()) {
      return roundPairs.length;
    }

    return mixTasks.reduce((total, task) => total + (task.pairs?.length || (task.pair ? 1 : 0)), 0);
  }

  function isMixMatchTask() {
    return isMixMode() && activeMixTaskMode === TRAINING_MODES.MATCH_PAIRS;
  }

  function renderMixTask() {
    if (currentQuestionIndex >= mixTasks.length) {
      activeMixTaskMode = null;
      renderRoundSummary();
      showMessage('Раунд завершён! Посмотри статистику и начни новый раунд.');
      return;
    }

    const task = getCurrentTask();
    activeMixTaskMode = task.mode;
    selectedCards = [];
    matchedInBatch = 0;
    choiceLocked = false;
    writeHintCount = 0;
    writeAttemptCount = 0;
    writeQuestionCompleted = false;
    buildSelectedIndexes = [];
    buildLetterButtons = [];
    buildLocked = false;

    if (task.mode === TRAINING_MODES.MATCH_PAIRS) {
      currentBatchPairs = task.pairs;
      renderMatchBoard(currentBatchPairs);
      showMessage('Микс: найди соответствия между колонками.');
      return;
    }
    if (task.mode === TRAINING_MODES.WRITE_GREEK) {
      renderWriteQuestion();
      return;
    }
    if (task.mode === TRAINING_MODES.BUILD_GREEK) {
      renderBuildQuestion();
      return;
    }

    renderChoiceQuestion();
  }

  function renderNextSequentialQuestion() {
    if (isMixMode()) {
      renderMixTask();
      return;
    }
    if (activeMode === TRAINING_MODES.BUILD_GREEK) {
      renderBuildQuestion();
      return;
    }
    if (activeMode === TRAINING_MODES.WRITE_GREEK) {
      renderWriteQuestion();
      return;
    }

    renderChoiceQuestion();
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function renderMatchBoard(pairs) {
    boardEl.classList.remove('board--single', 'board--choice', 'board--write', 'board--build');
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

  function renderWriteQuestion() {
    if (currentQuestionIndex >= getSequentialRoundTotal()) {
      renderRoundSummary();
      showMessage('Раунд завершён! Посмотри статистику и начни новый раунд.');
      return;
    }

    const pair = getCurrentQuestionPair();
    const expectedAnswer = getPrimaryGreekAnswer(pair);

    boardEl.classList.add('board--single', 'board--write');
    boardEl.classList.remove('board--choice', 'board--build');
    boardEl.innerHTML = '';

    const panel = document.createElement('form');
    panel.className = 'write-panel';
    panel.noValidate = true;

    const question = document.createElement('h2');
    question.className = 'choice-panel__question';
    appendFormattedDictionaryText(question, pair.translation, TRAINER_DISPLAY_OPTIONS);

    const rule = document.createElement('p');
    rule.className = 'write-panel__rule';
    appendWriteRule(rule, pair);

    const input = document.createElement('input');
    input.className = 'write-panel__input';
    input.type = 'text';
    input.lang = 'el';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.placeholder = 'Напиши по-гречески';
    input.disabled = writeQuestionCompleted;

    const feedback = document.createElement('div');
    feedback.className = 'write-panel__feedback';

    const inputWrap = document.createElement('div');
    inputWrap.className = 'write-panel__input-wrap';

    const submitBtn = document.createElement('button');
    submitBtn.className = 'write-panel__submit';
    submitBtn.type = 'submit';
    submitBtn.textContent = '→';
    submitBtn.setAttribute('aria-label', 'Проверить ответ');

    const actions = document.createElement('div');
    actions.className = 'write-panel__actions';

    const hintBtn = document.createElement('button');
    hintBtn.className = 'secondary write-panel__small-action';
    hintBtn.type = 'button';
    updateWriteHintButton(hintBtn, expectedAnswer);
    hintBtn.addEventListener('click', () => {
      writeHintCount = Math.min(2, writeHintCount + 1);
      applyWriteHint(input, expectedAnswer);
      updateWriteHintButton(hintBtn, expectedAnswer);
      input.focus();
    });

    const revealOrNextBtn = document.createElement('button');
    revealOrNextBtn.className = 'secondary write-panel__small-action';
    revealOrNextBtn.type = 'button';
    revealOrNextBtn.textContent = 'Не знаю';
    revealOrNextBtn.addEventListener('click', () => {
      if (writeQuestionCompleted) {
        moveToNextWriteQuestion();
        return;
      }

      completeWriteQuestion(pair, feedback, false);
      input.disabled = true;
      submitBtn.disabled = true;
      hintBtn.disabled = true;
      revealOrNextBtn.textContent = 'Следующее →';
      revealOrNextBtn.classList.add('write-panel__next-action');
      focusNextWriteButton(revealOrNextBtn);
    });

    panel.addEventListener('submit', (event) => {
      event.preventDefault();
      if (writeQuestionCompleted) {
        moveToNextWriteQuestion();
        return;
      }

      const isCorrect = isAcceptedGreekAnswer(input.value, pair);
      if (!isCorrect) {
        writeAttemptCount += 1;
        updateStatus();
        input.classList.remove('write-panel__input--correct');
        input.classList.add('write-panel__input--error');
        if (writeAttemptCount >= WRITE_GREEK_MAX_ATTEMPTS) {
          showMessage('Показываю правильный ответ.', true);
          completeWriteQuestion(pair, feedback, false);
          input.disabled = true;
          submitBtn.disabled = true;
          hintBtn.disabled = true;
          revealOrNextBtn.textContent = 'Следующее →';
          revealOrNextBtn.classList.add('write-panel__next-action');
          focusNextWriteButton(revealOrNextBtn);
          return;
        }

        showMessage(`Пока не совпало. Осталось попыток: ${WRITE_GREEK_MAX_ATTEMPTS - writeAttemptCount}.`, true);
        input.focus();
        return;
      }

      input.classList.remove('write-panel__input--error');
      input.classList.add('write-panel__input--correct');
      completeWriteQuestion(pair, feedback, true);
      input.disabled = true;
      submitBtn.disabled = true;
      hintBtn.disabled = true;
      revealOrNextBtn.textContent = 'Следующее →';
      revealOrNextBtn.classList.add('write-panel__next-action');
      focusNextWriteButton(revealOrNextBtn);
    });

    inputWrap.appendChild(input);
    inputWrap.appendChild(submitBtn);
    actions.appendChild(hintBtn);
    actions.appendChild(revealOrNextBtn);

    panel.appendChild(question);
    panel.appendChild(rule);
    panel.appendChild(inputWrap);
    panel.appendChild(actions);
    panel.appendChild(feedback);
    boardEl.appendChild(panel);
    showMessage('Напиши слово по-гречески.');
    input.focus();
  }

  function renderBuildQuestion() {
    if (currentQuestionIndex >= getSequentialRoundTotal()) {
      renderRoundSummary();
      showMessage('Раунд завершён! Посмотри статистику и начни новый раунд.');
      return;
    }

    const pair = getCurrentQuestionPair();
    const expectedAnswer = getPrimaryGreekAnswer(pair);
    const buildUnits = getBuildUnits(expectedAnswer);
    const shuffledUnits = shuffle(buildUnits.map((unit, index) => ({ unit, index })));

    buildSelectedIndexes = [];
    buildLetterButtons = [];
    buildLocked = false;

    boardEl.classList.add('board--single', 'board--build');
    boardEl.classList.remove('board--choice', 'board--write');
    boardEl.innerHTML = '';

    const panel = document.createElement('div');
    panel.className = 'build-panel';

    const question = document.createElement('h2');
    question.className = 'choice-panel__question';
    appendFormattedDictionaryText(question, pair.translation, TRAINER_DISPLAY_OPTIONS);

    const rule = document.createElement('p');
    rule.className = 'write-panel__rule';
    appendWriteRule(rule, pair);

    const assembled = document.createElement('div');
    assembled.className = 'build-panel__assembled';
    assembled.setAttribute('aria-live', 'polite');
    updateBuildAssembled(assembled, buildUnits);

    const lettersEl = document.createElement('div');
    lettersEl.className = 'build-panel__letters';

    const feedback = document.createElement('div');
    feedback.className = 'write-panel__feedback';

    const actions = document.createElement('div');
    actions.className = 'write-panel__actions';

    const hintBtn = document.createElement('button');
    hintBtn.className = 'secondary write-panel__small-action';
    hintBtn.type = 'button';
    updateBuildHintButton(hintBtn, buildUnits);
    hintBtn.addEventListener('click', () => {
      if (buildLocked) {
        return;
      }
      applyBuildHint(buildUnits, assembled);
      updateBuildHintButton(hintBtn, buildUnits);
      if (isBuildComplete(buildUnits)) {
        finishBuildAttempt(pair, buildUnits, feedback, hintBtn, revealOrNextBtn);
      }
    });

    const revealOrNextBtn = document.createElement('button');
    revealOrNextBtn.className = 'secondary write-panel__small-action';
    revealOrNextBtn.type = 'button';
    revealOrNextBtn.textContent = 'Не знаю';
    revealOrNextBtn.addEventListener('click', () => {
      if (writeQuestionCompleted) {
        moveToNextBuildQuestion();
        return;
      }

      completeWriteQuestion(pair, feedback, false);
      disableBuildLetters();
      hintBtn.disabled = true;
      revealOrNextBtn.textContent = 'Следующее →';
      revealOrNextBtn.classList.add('write-panel__next-action');
      focusNextWriteButton(revealOrNextBtn);
    });

    shuffledUnits.forEach((item) => {
      const button = document.createElement('button');
      button.className = `build-panel__letter ${item.unit.type === 'word' ? 'build-panel__letter--word' : ''}`;
      button.type = 'button';
      button.textContent = item.unit.text;
      button.dataset.letterIndex = String(item.index);
      button.addEventListener('click', () => {
        if (writeQuestionCompleted || buildLocked || button.disabled) {
          return;
        }

        const expectedUnit = buildUnits[buildSelectedIndexes.length];
        if (button.textContent !== expectedUnit.text) {
          handleIncorrectBuildLetter(button, pair, feedback, hintBtn, revealOrNextBtn);
          return;
        }

        buildSelectedIndexes.push(item.index);
        button.disabled = true;
        updateBuildAssembled(assembled, buildUnits);
        if (isBuildComplete(buildUnits)) {
          finishBuildAttempt(pair, buildUnits, feedback, hintBtn, revealOrNextBtn);
        }
      });
      buildLetterButtons.push(button);
      lettersEl.appendChild(button);
    });

    actions.appendChild(hintBtn);
    actions.appendChild(revealOrNextBtn);

    panel.appendChild(question);
    panel.appendChild(rule);
    panel.appendChild(assembled);
    panel.appendChild(lettersEl);
    panel.appendChild(actions);
    panel.appendChild(feedback);
    boardEl.appendChild(panel);
    showMessage('Собери греческое слово.');
  }

  function createMatchCard(pair, side) {
    const button = document.createElement('button');
    const text = document.createElement('span');
    button.className = 'card';
    button.type = 'button';
    text.className = 'card__text';
    appendFormattedDictionaryText(text, getPairSide(pair, side), TRAINER_DISPLAY_OPTIONS);
    button.dataset.pairId = pair.id;
    button.dataset.side = side;
    button.addEventListener('click', () => handleCardClick(button));
    button.appendChild(text);
    return button;
  }

  function renderChoiceQuestion() {
    choiceLocked = false;

    if (currentQuestionIndex >= getSequentialRoundTotal()) {
      renderRoundSummary();
      showMessage('Раунд завершён! Посмотри статистику и начни новый раунд.');
      return;
    }

    const pair = getCurrentQuestionPair();
    const questionSide = Math.random() < 0.5 ? 'greek' : 'translation';
    const answerSide = questionSide === 'greek' ? 'translation' : 'greek';
    const options = buildAnswerOptions(pair, answerSide);

    boardEl.classList.add('board--single', 'board--choice');
    boardEl.classList.remove('board--write', 'board--build');
    boardEl.innerHTML = '';

    const panel = document.createElement('div');
    panel.className = 'choice-panel';

    const question = document.createElement('h2');
    question.className = 'choice-panel__question';
    appendFormattedDictionaryText(question, getPairSide(pair, questionSide), TRAINER_DISPLAY_OPTIONS);

    const optionsEl = document.createElement('div');
    optionsEl.className = 'choice-panel__options';

    options.forEach((optionPair) => {
      optionsEl.appendChild(createChoiceOption(optionPair, answerSide, optionPair.id === pair.id));
    });

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
    appendFormattedDictionaryText(text, getPairSide(pair, answerSide), TRAINER_DISPLAY_OPTIONS);
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
    const targetText = normalizeForSimilarity(
      getPlainDictionaryDisplayText(getPairSide(targetPair, answerSide), TRAINER_DISPLAY_OPTIONS),
    );
    const candidates = allPairs.filter((pair) => pair.id !== targetPair.id);
    const sameType = candidates.filter((pair) => inferPartOfSpeech(pair) === targetType);
    const pool = sameType.length >= 3 ? sameType : candidates;

    return pool
      .map((pair) => ({
        pair,
        score: getWritingSimilarity(
          targetText,
          normalizeForSimilarity(getPlainDictionaryDisplayText(getPairSide(pair, answerSide), TRAINER_DISPLAY_OPTIONS)),
        ) + Math.random() * 0.01,
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

  function updateWriteHintButton(button, expectedAnswer) {
    const totalLetters = getLetterCount(expectedAnswer);
    if (writeHintCount >= 2 || writeHintCount >= totalLetters) {
      button.textContent = 'Буквы открыты';
      button.disabled = true;
      return;
    }

    button.textContent = writeHintCount === 0 ? 'Показать букву' : 'Показать ещё букву';
    button.disabled = totalLetters === 0;
  }

  function updateBuildHintButton(button, buildUnits) {
    const isWordBuild = buildUnits[0]?.type === 'word';
    if (writeHintCount >= 2 || writeHintCount >= buildUnits.length) {
      button.textContent = isWordBuild ? 'Слова открыты' : 'Буквы открыты';
      button.disabled = true;
      return;
    }

    button.textContent = writeHintCount === 0
      ? isWordBuild ? 'Показать слово' : 'Показать букву'
      : isWordBuild ? 'Показать ещё слово' : 'Показать ещё букву';
    button.disabled = !buildUnits.length;
  }

  function focusNextWriteButton(button) {
    requestAnimationFrame(() => button.focus());
  }

  function updateBuildAssembled(container, buildUnits) {
    const selectedUnits = buildSelectedIndexes.map((index) => buildUnits[index]);
    container.textContent = getBuildAnswerText(selectedUnits) || '…';
  }

  function isBuildComplete(buildUnits) {
    return buildSelectedIndexes.length === buildUnits.length;
  }

  function finishBuildAttempt(pair, buildUnits, feedback, hintBtn, revealOrNextBtn) {
    const isCorrect = getBuildAnswerText(buildSelectedIndexes.map((index) => buildUnits[index])) === getBuildAnswerText(buildUnits);
    if (isCorrect) {
      completeWriteQuestion(pair, feedback, true);
      disableBuildLetters();
      hintBtn.disabled = true;
      revealOrNextBtn.textContent = 'Следующее →';
      revealOrNextBtn.classList.add('write-panel__next-action');
      focusNextWriteButton(revealOrNextBtn);
      return;
    }

    revealIncorrectBuildAnswer(pair, feedback, hintBtn, revealOrNextBtn);
  }

  function handleIncorrectBuildLetter(button, pair, feedback, hintBtn, revealOrNextBtn) {
    buildLocked = true;
    writeAttemptCount += 1;
    button.classList.add('build-panel__letter--error');
    const shouldRevealAnswer = writeAttemptCount >= BUILD_GREEK_MAX_MISTAKES;
    const unitName = button.classList.contains('build-panel__letter--word') ? 'слово' : 'буква';
    showMessage(
      shouldRevealAnswer
        ? `Три неверные попытки. Показываю правильный ответ.`
        : `Не то ${unitName}. Осталось ошибок: ${BUILD_GREEK_MAX_MISTAKES - writeAttemptCount}.`,
      true,
    );
    setTimeout(() => {
      button.classList.remove('build-panel__letter--error');
      buildLocked = false;
      if (shouldRevealAnswer) {
        revealIncorrectBuildAnswer(pair, feedback, hintBtn, revealOrNextBtn);
      }
    }, 350);
  }

  function revealIncorrectBuildAnswer(pair, feedback, hintBtn, revealOrNextBtn) {
    completeWriteQuestion(pair, feedback, false);
    disableBuildLetters();
    hintBtn.disabled = true;
    revealOrNextBtn.textContent = 'Следующее →';
    revealOrNextBtn.classList.add('write-panel__next-action');
    focusNextWriteButton(revealOrNextBtn);
  }

  function applyBuildHint(buildUnits, assembled) {
    const nextIndex = buildSelectedIndexes.length;
    const button = buildLetterButtons.find((item) => !item.disabled && Number(item.dataset.letterIndex) === nextIndex);

    if (!button) {
      return;
    }

    writeHintCount = Math.min(2, writeHintCount + 1);
    buildSelectedIndexes.push(Number(button.dataset.letterIndex));
    button.disabled = true;
    updateBuildAssembled(assembled, buildUnits);
  }

  function resetBuildLetters() {
    buildSelectedIndexes = [];
    buildLetterButtons.forEach((button) => {
      button.disabled = false;
    });
    const assembled = boardEl.querySelector('.build-panel__assembled');
    if (assembled) {
      assembled.textContent = '…';
    }
  }

  function disableBuildLetters() {
    buildLetterButtons.forEach((button) => {
      button.disabled = true;
    });
  }

  function applyWriteHint(input, expectedAnswer) {
    const visibleLetters = Array.from(expectedAnswer).slice(0, writeHintCount).join('');
    if (!input.value || !normalizeGreekAnswer(input.value).startsWith(normalizeGreekAnswer(visibleLetters))) {
      input.value = visibleLetters;
    }
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function getLetterCount(value) {
    return Array.from(value).length;
  }

  function getBuildUnits(expectedAnswer) {
    const wordTokens = expectedAnswer.split(/\s+/u).filter(Boolean);
    const meaningfulWords = wordTokens.filter((token) => !isGreekArticleToken(token));
    if (meaningfulWords.length >= 2) {
      return wordTokens.map((text) => ({ text, type: 'word' }));
    }

    return Array.from(expectedAnswer).map((text) => ({ text, type: 'letter' }));
  }

  function getBuildAnswerText(units) {
    const separator = units[0]?.type === 'word' ? ' ' : '';
    return units.map((unit) => unit.text).join(separator);
  }

  function isGreekArticleToken(value) {
    return /^(?:ο|η|το|οι|τα|τον|την|τους|τις|ο\/η)$/iu.test(value);
  }

  function completeWriteQuestion(pair, feedbackEl, isKnown) {
    if (writeQuestionCompleted) {
      return;
    }

    writeQuestionCompleted = true;
    if (!isKnown) {
      incorrectAttempts += 1;
    }

    matchedPairs += 1;
    onPairMatched(pair.id);
    updateStatus();
    setProgress(matchedPairs / getRoundWordTotal());
    renderWriteAnswer(feedbackEl, pair, isKnown);
    showMessage(isKnown ? 'Верно! Можно идти дальше.' : 'Ничего, запоминаем и идём дальше.', !isKnown);
  }

  function renderWriteAnswer(container, pair, isKnown) {
    container.innerHTML = '';
    const answer = document.createElement('div');
    answer.className = `write-panel__answer ${isKnown ? 'write-panel__answer--correct' : ''}`;

    const title = document.createElement('p');
    title.className = 'write-panel__answer-title';
    title.textContent = isKnown ? 'Верно' : 'Не угадано';

    const greek = document.createElement('p');
    greek.className = 'write-panel__answer-greek';
    appendFormattedDictionaryText(greek, pair.greek, { highlightGreekEndings: true });

    const translation = document.createElement('p');
    translation.className = 'write-panel__answer-translation';
    appendFormattedDictionaryText(translation, pair.translation);

    answer.appendChild(title);
    answer.appendChild(greek);
    answer.appendChild(translation);
    container.appendChild(answer);
  }

  function moveToNextWriteQuestion() {
    currentQuestionIndex += 1;
    writeHintCount = 0;
    writeAttemptCount = 0;
    writeQuestionCompleted = false;
    renderNextSequentialQuestion();
  }

  function moveToNextBuildQuestion() {
    currentQuestionIndex += 1;
    writeHintCount = 0;
    writeAttemptCount = 0;
    writeQuestionCompleted = false;
    buildSelectedIndexes = [];
    buildLetterButtons = [];
    buildLocked = false;
    renderNextSequentialQuestion();
  }

  function isAcceptedGreekAnswer(value, pair) {
    const normalizedValue = normalizeGreekAnswer(value);
    return getAcceptedGreekAnswers(pair).some((answer) => normalizeGreekAnswer(answer) === normalizedValue);
  }

  function getPrimaryGreekAnswer(pair) {
    return getAcceptedGreekAnswers(pair)[0] || '';
  }

  function getAcceptedGreekAnswers(pair) {
    const baseValue = getCoreGreekValue(pair.greek);
    const type = inferPartOfSpeech(pair);

    if (type === 'adjective') {
      return getAlternatives(baseValue.split(/\s+-\s+/u)[0]).map(stripLeadingArticle).filter(Boolean);
    }
    if (type === 'noun') {
      const nounValue = hasSharedArticle(baseValue) ? normalizeSharedArticle(baseValue) : getAlternatives(baseValue)[0] || '';
      return [stripLeadingArticle(nounValue)].filter(Boolean);
    }
    if (type === 'verb') {
      return [getAlternatives(baseValue)[0]].filter(Boolean);
    }

    return [getAlternatives(baseValue)[0]].filter(Boolean);
  }

  function getCoreGreekValue(value) {
    return value
      .replace(/^\s*(?:=>|→)\s*/u, '')
      .split(/\s+(?:=>|→)\s*/u)[0]
      .replace(/\[[^\]]*\]/gu, '')
      .replace(/\([^)]*\)/gu, '')
      .replace(/^\s*\*/u, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getAlternatives(value) {
    return value
      .split(/\s*\/\s*/u)
      .map((item) => item.replace(/^\s*\*/u, '').trim())
      .filter(Boolean);
  }

  function stripLeadingArticle(value) {
    return value.replace(GREEK_ARTICLE_PATTERN, '').trim();
  }

  function normalizeSharedArticle(value) {
    return value.replace(/^(?:ο\s*\/\s*η)\s+/iu, 'ο/η ');
  }

  function hasSharedArticle(value) {
    return /^(?:ο\s*\/\s*η)\s+/iu.test(value);
  }

  function appendWriteRule(container, pair) {
    const rule = getWriteRuleParts(pair);
    container.textContent = rule.text;

    if (!rule.accent) {
      return;
    }

    const accent = document.createElement('span');
    accent.className = 'write-panel__rule-accent';
    accent.textContent = rule.accent;
    container.appendChild(accent);
  }

  function getWriteRuleParts(pair) {
    const type = inferPartOfSpeech(pair);
    if (type === 'verb') {
      return {
        text: 'напиши глагол в ',
        accent: '1 лице единственного числа',
      };
    }
    if (type === 'adjective') {
      return {
        text: 'напиши прилагательное ',
        accent: 'в мужском роде единственного числа',
      };
    }
    if (type === 'noun') {
      return {
        text: 'напиши существительное ',
        accent: 'без артикля',
      };
    }
    return {
      text: 'напиши по-гречески',
      accent: '',
    };
  }

  function normalizeGreekAnswer(value) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/\s+/g, ' ');
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
    const currentPair = getCurrentQuestionPair();

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
    setProgress(matchedPairs / getRoundWordTotal());
    choiceTimerId = setTimeout(
      () => renderNextSequentialQuestion(),
      isCorrect ? CHOICE_CORRECT_DELAY_MS : CHOICE_INCORRECT_DELAY_MS,
    );
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
      matchedInBatch += 1;
      onPairMatched(first.dataset.pairId);
      showMessage('Отлично! Пара найдена.');
      if (isMixMatchTask()) {
        matchedPairs += 1;
        updateStatus();
        setProgress(matchedPairs / getRoundWordTotal());
        selectedCards = [];
        if (matchedInBatch === currentBatchPairs.length) {
          currentQuestionIndex += 1;
          showMessage('Микс: набор завершён, загружаю следующее задание.');
          setTimeout(() => renderMixTask(), 500);
          return;
        }

        updateStatus();
        return;
      }

      matchedPairs += 1;
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
    const totalPairs = isMixMode() ? getRoundWordTotal() : roundPairs.length || 0;
    if (!totalPairs) {
      statusEl.textContent = 'Выбери словарь и добавь в него пары, чтобы начать.';
      return;
    }

    if (isMixMode()) {
      statusEl.textContent = `Пройдено слов: ${matchedPairs} из ${totalPairs} • Ошибок: ${incorrectAttempts}`;
      return;
    }

    if (
      activeMode === TRAINING_MODES.PICK_TRANSLATION ||
      activeMode === TRAINING_MODES.WRITE_GREEK ||
      activeMode === TRAINING_MODES.BUILD_GREEK
    ) {
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
    const totalPairs = isMixMode() ? getRoundWordTotal() : roundPairs.length;
    if (!totalPairs) {
      boardEl.innerHTML = '';
      return;
    }

    boardEl.classList.add('board--single');
    boardEl.classList.remove('board--choice', 'board--write', 'board--build');
    const correctAnswers = activeMode === TRAINING_MODES.MIX
      ? Math.max(0, matchedPairs - incorrectAttempts)
      : activeMode === TRAINING_MODES.PICK_TRANSLATION
      ? Math.max(0, totalPairs - incorrectAttempts)
      : activeMode === TRAINING_MODES.WRITE_GREEK || activeMode === TRAINING_MODES.BUILD_GREEK
        ? Math.max(0, matchedPairs - incorrectAttempts)
      : matchedPairs;
    const attempts = activeMode === TRAINING_MODES.MIX
      ? matchedPairs + incorrectAttempts
      : activeMode === TRAINING_MODES.PICK_TRANSLATION
      ? totalPairs
      : activeMode === TRAINING_MODES.WRITE_GREEK || activeMode === TRAINING_MODES.BUILD_GREEK
        ? matchedPairs + incorrectAttempts
      : matchedPairs + incorrectAttempts;
    const accuracy = attempts ? Math.max(0, Math.round((correctAnswers / attempts) * 100)) : 100;
    const totalLabel = activeMode === TRAINING_MODES.MIX
      ? 'Всего слов'
      : activeMode === TRAINING_MODES.MATCH_PAIRS
        ? 'Всего пар'
        : 'Всего слов';
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
