export function createTrainer({ boardEl, statusEl, messageEl, progressFillEl, pairsPerRound, pairsPerBatch }) {
  let allPairs = [];
  let roundPairs = [];
  let pendingPairs = [];
  let currentBatchPairs = [];
  let matchedPairs = 0;
  let matchedInBatch = 0;
  let selectedCards = [];
  let incorrectAttempts = 0;

  function setPairs(nextPairs) {
    allPairs = nextPairs;
  }

  function startRound(forceNewSample = true) {
    if (!allPairs.length) {
      return;
    }

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

  function resetAfterLoadError() {
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

  return {
    setPairs,
    startRound,
    resetAfterLoadError,
    showMessage,
  };
}
