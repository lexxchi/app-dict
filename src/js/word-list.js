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

      greekCell.textContent = pair.greek;
      translationCell.textContent = pair.translation;

      row.appendChild(greekCell);
      row.appendChild(translationCell);
      fragment.appendChild(row);
    });

    return fragment;
  }

  function toggle() {
    isExpanded = !isExpanded;
    render();
  }

  return {
    setContent,
  };
}
