const ADJECTIVE_ENDING_PATTERN = /([ήη]ς\s+m\.\s*-\s*[ήη]ς\s+f\.\s*-\s*[έε]ς\s+n\.|[όο]ς\s*-\s*[ήη]\s*-\s*[όο]|[όο]ς\s*-\s*[άα]\s*-\s*[όο]|[ύυ]ς\s*-\s*(?:ιά|ια)\s*-\s*[ύυόο]|[ήη]ς\s*-\s*(?:ιά|ια)\s*-\s*[ίι])/u;
const COMMENT_PATTERN = /\([^)]*\)/u;
const EXAMPLE_MARKER_PATTERN = /=>|→/u;
const SERVICE_COMMENT_PATTERN = /^\((?:group|plur\.|plural|sing\.|fut\.|imp\.|no plural|only|chemistry|astronomy|adj\.)/iu;

export function appendFormattedDictionaryText(container, value, options = {}) {
  const {
    hideExamples = false,
    hideGroupComments = false,
    highlightGreekEndings = false,
    stripLeadingExampleMarker = false,
  } = options;
  let remaining = stripLeadingExampleMarker ? stripLeadingMarker(value) : value;

  while (remaining) {
    const commentMatch = remaining.match(COMMENT_PATTERN);
    const exampleMatch = remaining.match(EXAMPLE_MARKER_PATTERN);
    const commentIndex = commentMatch?.index ?? -1;
    const exampleIndex = exampleMatch?.index ?? -1;
    const shouldRenderExample = exampleIndex > 0 && (commentIndex < 0 || exampleIndex < commentIndex);

    if (shouldRenderExample) {
      appendPlainText(container, remaining.slice(0, exampleIndex), highlightGreekEndings);
      if (hideExamples) {
        return;
      }
      appendExample(container, remaining.slice(exampleIndex).trimStart());
      return;
    }

    if (commentMatch && commentIndex >= 0) {
      appendPlainText(container, remaining.slice(0, commentIndex), highlightGreekEndings);
      appendComment(container, commentMatch[0], { hideGroupComments });
      remaining = remaining.slice(commentIndex + commentMatch[0].length);
      continue;
    }

    appendPlainText(container, remaining, highlightGreekEndings);
    return;
  }
}

export function getPlainDictionaryDisplayText(value, options = {}) {
  const { hideExamples = false, hideGroupComments = false, stripLeadingExampleMarker = false } = options;
  const groupPattern = /\s*\(group\s+[^)]*\)/giu;
  const displayValue = hideExamples
    ? stripInlineExample(stripLeadingExampleMarker ? stripLeadingMarker(value) : value)
    : stripLeadingExampleMarker
      ? stripLeadingMarker(value)
      : value;
  return (hideGroupComments ? displayValue.replace(groupPattern, '') : displayValue)
    .replace(/\s+/g, ' ')
    .trim();
}

function stripLeadingMarker(value) {
  return value.replace(/^\s*(?:=>|→)\s*/u, '');
}

function stripInlineExample(value) {
  const exampleMatch = value.match(EXAMPLE_MARKER_PATTERN);
  if (!exampleMatch || !exampleMatch.index) {
    return value;
  }

  return value.slice(0, exampleMatch.index).trimEnd();
}

function appendPlainText(container, text, highlightGreekEndings) {
  if (!text) {
    return;
  }

  if (highlightGreekEndings) {
    appendHighlightedGreekEnding(container, text);
    return;
  }

  container.appendChild(document.createTextNode(text));
}

function appendComment(container, comment, options = {}) {
  const { hideGroupComments = false } = options;
  if (hideGroupComments && /^\(group\s+/iu.test(comment)) {
    return;
  }

  const span = document.createElement('span');
  span.textContent = comment;

  if (SERVICE_COMMENT_PATTERN.test(comment)) {
    span.className = 'dict-note dict-note--service';
  } else if (/\p{Script=Greek}/u.test(comment) && !/[A-Za-z]/u.test(comment)) {
    span.className = 'dict-example';
  } else {
    span.className = 'dict-note dict-note--meaning';
  }

  container.appendChild(span);
}

function appendExample(container, example) {
  const span = document.createElement('span');
  span.className = 'dict-example';
  span.textContent = example;
  container.appendChild(span);
}

function appendHighlightedGreekEnding(container, value) {
  const match = value.match(ADJECTIVE_ENDING_PATTERN);

  if (!match || match.index === undefined) {
    container.appendChild(document.createTextNode(value));
    return;
  }

  appendPlainText(container, value.slice(0, match.index), false);
  appendEnding(container, match[0]);
  appendPlainText(container, value.slice(match.index + match[0].length), false);
}

function appendEnding(container, ending) {
  if (/[ήη]ς\s+m\./u.test(ending)) {
    appendGenderedRareEnding(container, ending);
    return;
  }
  if (/[ύυ]ς\s*-\s*(?:ιά|ια)\s*-\s*[όο]/u.test(ending)) {
    appendMixedYsEnding(container, ending);
    return;
  }

  appendColoredEndingPart(container, ending, getEndingClassName(ending));
}

function appendMixedYsEnding(container, ending) {
  const parts = ending.match(/^([ύυ]ς\s*-\s*(?:ιά|ια))(\s*-\s*)([όο])$/u);
  if (!parts) {
    container.appendChild(document.createTextNode(ending));
    return;
  }

  appendColoredEndingPart(container, parts[1], 'word-list-ending--ys');
  container.appendChild(document.createTextNode(parts[2]));
  appendColoredEndingPart(container, parts[3], 'word-list-ending--common');
}

function appendGenderedRareEnding(container, ending) {
  const parts = ending.match(/^([ήη]ς)\s+(m\.)\s*-\s*([ήη]ς)\s+(f\.)\s*-\s*([έε]ς)\s+(n\.)$/u);
  if (!parts) {
    container.appendChild(document.createTextNode(ending));
    return;
  }

  appendColoredEndingPart(container, parts[1], 'word-list-ending--rare');
  container.appendChild(document.createTextNode(' '));
  appendEndingMeta(container, parts[2]);
  container.appendChild(document.createTextNode(' - '));
  appendColoredEndingPart(container, parts[3], 'word-list-ending--rare');
  container.appendChild(document.createTextNode(' '));
  appendEndingMeta(container, parts[4]);
  container.appendChild(document.createTextNode(' - '));
  appendColoredEndingPart(container, parts[5], 'word-list-ending--rare');
  container.appendChild(document.createTextNode(' '));
  appendEndingMeta(container, parts[6]);
}

function appendColoredEndingPart(container, text, className) {
  const span = document.createElement('span');
  span.className = `word-list-ending ${className}`;
  span.textContent = text;
  container.appendChild(span);
}

function appendEndingMeta(container, text) {
  const span = document.createElement('span');
  span.className = 'word-list-ending-meta';
  span.textContent = text;
  container.appendChild(span);
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
