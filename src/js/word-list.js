export function createWordList({ summaryEl, bodyEl, toggleBtn, wrapEl, previewLimit }) {
  let isExpanded = false;
  let pairs = [];
  let activeDictionary = null;

  toggleBtn?.addEventListener('click', toggle);

  function setContent(nextPairs, dictionary) {
    pairs = nextPairs;
    activeDictionary = dictionary;
    isExpanded = false;
    render();
  }

  function render() {
    if (!bodyEl || !summaryEl || !toggleBtn || !wrapEl) {
      return;
    }

    bodyEl.innerHTML = '';
    toggleBtn.hidden = true;
    wrapEl.classList.remove('word-list-table-wrap--collapsed');

    if (!pairs.length) {
      summaryEl.textContent = 'В выбранном словаре пока нет слов.';
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 2;
      cell.className = 'word-list-table__empty';
      cell.textContent = 'Список пуст.';
      row.appendChild(cell);
      bodyEl.appendChild(row);
      return;
    }

    const dictionaryName = activeDictionary ? `«${activeDictionary.name}»` : 'выбранной базы';
    const hasHiddenWords = pairs.length > previewLimit;
    summaryEl.textContent = `${dictionaryName}: ${pairs.length} слов`;
    bodyEl.appendChild(createRows(pairs));

    if (hasHiddenWords) {
      toggleBtn.hidden = false;
      toggleBtn.textContent = isExpanded ? 'Скрыть лишние слова' : 'Показать все слова';
      wrapEl.classList.toggle('word-list-table-wrap--collapsed', !isExpanded);
    }
  }

  function createRows(items) {
    const fragment = document.createDocumentFragment();

    items.forEach((pair) => {
      const row = document.createElement('tr');
      const greekCell = document.createElement('td');
      const translationCell = document.createElement('td');

      appendHighlightedGreek(greekCell, pair.greek);
      translationCell.textContent = pair.translation;

      row.appendChild(greekCell);
      row.appendChild(translationCell);
      fragment.appendChild(row);
    });

    return fragment;
  }

  function appendHighlightedGreek(cell, value) {
    const pattern = /([ήη]ς\s+m\.\s*-\s*[ήη]ς\s+f\.\s*-\s*[έε]ς\s+n\.|[όο]ς\s*-\s*[ήη]\s*-\s*[όο]|[όο]ς\s*-\s*[άα]\s*-\s*[όο]|[ύυ]ς\s*-\s*(?:ιά|ια)\s*-\s*[ύυόο]|[ήη]ς\s*-\s*(?:ιά|ια)\s*-\s*[ίι])/u;
    const match = value.match(pattern);

    if (!match || match.index === undefined) {
      cell.textContent = value;
      return;
    }

    appendText(cell, value.slice(0, match.index));
    appendEnding(cell, match[0]);
    appendText(cell, value.slice(match.index + match[0].length));
  }

  function appendEnding(cell, ending) {
    if (/[ήη]ς\s+m\./u.test(ending)) {
      appendGenderedRareEnding(cell, ending);
      return;
    }
    if (/[ύυ]ς\s*-\s*(?:ιά|ια)\s*-\s*[όο]/u.test(ending)) {
      appendMixedYsEnding(cell, ending);
      return;
    }

    const span = document.createElement('span');
    span.textContent = ending;
    span.className = `word-list-ending ${getEndingClassName(ending)}`;
    cell.appendChild(span);
  }

  function appendMixedYsEnding(cell, ending) {
    const parts = ending.match(/^([ύυ]ς\s*-\s*(?:ιά|ια))(\s*-\s*)([όο])$/u);
    if (!parts) {
      appendText(cell, ending);
      return;
    }

    appendColoredEndingPart(cell, parts[1], 'word-list-ending--ys');
    appendText(cell, parts[2]);
    appendColoredEndingPart(cell, parts[3], 'word-list-ending--common');
  }

  function appendGenderedRareEnding(cell, ending) {
    const parts = ending.match(/^([ήη]ς)\s+(m\.)\s*-\s*([ήη]ς)\s+(f\.)\s*-\s*([έε]ς)\s+(n\.)$/u);
    if (!parts) {
      appendText(cell, ending);
      return;
    }

    appendRareEndingPart(cell, parts[1]);
    appendText(cell, ' ');
    appendMetaPart(cell, parts[2]);
    appendText(cell, ' - ');
    appendRareEndingPart(cell, parts[3]);
    appendText(cell, ' ');
    appendMetaPart(cell, parts[4]);
    appendText(cell, ' - ');
    appendRareEndingPart(cell, parts[5]);
    appendText(cell, ' ');
    appendMetaPart(cell, parts[6]);
  }

  function appendRareEndingPart(cell, text) {
    appendColoredEndingPart(cell, text, 'word-list-ending--rare');
  }

  function appendColoredEndingPart(cell, text, className) {
    const span = document.createElement('span');
    span.className = `word-list-ending ${className}`;
    span.textContent = text;
    cell.appendChild(span);
  }

  function appendMetaPart(cell, text) {
    const span = document.createElement('span');
    span.className = 'word-list-ending-meta';
    span.textContent = text;
    cell.appendChild(span);
  }

  function appendText(cell, text) {
    if (text) {
      cell.appendChild(document.createTextNode(text));
    }
  }

  function getEndingClassName(ending) {
    if (/[όο]ς\s*-\s*[άα]\s*-\s*[όο]/u.test(ending)) {
      return 'word-list-ending--alpha';
    }
    if (/[ύυ]ς\s*-\s*(?:ιά|ια)\s*-\s*[ύυόο]/u.test(ending)) {
      return 'word-list-ending--ys';
    }
    if (/[ήη]ς\s*-\s*(?:ιά|ια)\s*-\s*[ίι]/u.test(ending)) {
      return 'word-list-ending--rare';
    }
    return 'word-list-ending--common';
  }

  function toggle() {
    isExpanded = !isExpanded;
    render();
  }

  return {
    setContent,
  };
}
