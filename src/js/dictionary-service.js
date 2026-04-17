export async function loadDictionaryManifest(manifestPath, fallbackDictionary) {
  try {
    const response = await fetch(manifestPath);
    if (!response.ok) {
      throw new Error('Не получилось загрузить список словарей');
    }

    const payload = await response.json();
    const dictionaries = normalizeDictionaries(payload.dictionaries);
    if (!dictionaries.length) {
      throw new Error('Список словарей пуст');
    }

    return { dictionaries, error: null };
  } catch (error) {
    return { dictionaries: [fallbackDictionary], error };
  }
}

export async function loadDictionaryPairs(dictionary) {
  const response = await fetch(dictionary.file);
  if (!response.ok) {
    throw new Error(`Не получилось загрузить ${dictionary.file}`);
  }

  const text = await response.text();
  return parseWordList(text);
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
