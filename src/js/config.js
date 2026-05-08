export const PAIRS_PER_BATCH = 5;
export const TRAINING_MODES = {
  MATCH_PAIRS: 'match-pairs',
  PICK_TRANSLATION: 'pick-translation',
  WRITE_GREEK: 'write-greek',
  BUILD_GREEK: 'build-greek',
};
export const PAIRS_PER_MODE = {
  [TRAINING_MODES.MATCH_PAIRS]: 25,
  [TRAINING_MODES.PICK_TRANSLATION]: 20,
  [TRAINING_MODES.WRITE_GREEK]: 10,
  [TRAINING_MODES.BUILD_GREEK]: 10,
};
export const WORD_LIST_PREVIEW_LIMIT = 10;

export const PLATFORM_VERSION = '0.10';
export const LAST_UPDATED_AT = '08.05.2026 22:43';

export const DICTIONARY_MANIFEST_PATH = 'dictionaries/index.json';
export const FALLBACK_DICTIONARY = {
  id: 'default',
  name: 'Основной словарь',
  file: 'dictionaries/core.txt',
};
