# Greek Match Trainer

Greek Match Trainer is a browser app for practicing Greek vocabulary with several training modes: matching, multiple choice, typed recall, word building from letters, and a mixed practice round.

The app is dictionary-driven. Vocabulary lists live as plain text files, are registered through `dictionaries/index.json`, and are shown in a browsable word table for the selected dictionary.

## Features

- Switch between multiple vocabulary dictionaries.
- Practice with five training modes.
- Track progress, mistakes, and final accuracy per round.
- Browse the full word list for the selected dictionary.
- Display dictionary comments, examples, and grammar notes with readable formatting.
- Highlight common and irregular adjective endings in word lists.
- Review app updates on the changelog page.

## Training Modes

### Match Pairs

Match Greek words with their translations.

- One training round contains up to 25 pairs.
- Pairs are shown in batches of 5.
- Greek and translation cards are shuffled separately.
- The learner can start matching from either side.
- Incorrect matches are highlighted.

### Pick Translation

Choose the correct Greek word or translation from four options.

- One round contains up to 20 words.
- The question direction is randomized.
- Correct and incorrect answers are highlighted.
- The app pauses after each answer so the learner can review the result.

### Write Greek

Type the Greek word from the given translation.

- One round contains up to 10 words.
- The answer must include the correct Greek stress mark.
- The learner has one attempt.
- A hint button reveals the first letter, then the second letter directly in the input.
- `I don't know` reveals the full answer.
- After the answer is shown, the `Next` button receives keyboard focus, so Enter moves forward.

Answer rules:

- Verbs: type the first listed form, e.g. `προτιμάω / ώ` requires `προτιμάω`.
- Adjectives: type masculine singular, e.g. `καλός - ή - ό` requires `καλός`.
- Nouns: type the word without the article, e.g. `το μάτι / τα μάτια` requires `μάτι`.

### Build Word

Build the Greek word by clicking shuffled letters in the correct order.

- One round contains up to 10 words.
- The same answer rules as Write Greek apply.
- A hint button reveals the next letter, then one more letter.
- Wrong letters flash red and stay available.
- After three wrong letter choices, the full answer is revealed.
- Mistakes are counted per word, not per wrong letter.
- After the answer is shown, the `Next` button receives keyboard focus, so Enter moves forward.

### Mixed Practice

Practice all training modes in one randomized round.

- One round contains up to 18 tasks and 30 words.
- The mode order is shuffled every round.
- The distribution is weighted toward Pick Translation:
  - 7 Pick Translation tasks.
  - 3 Match Pairs tasks.
  - 4 Write Greek tasks.
  - 4 Build Word tasks.
- Each Match Pairs task in the mix uses a mini-set of 5 pairs.
- Progress is counted by completed words.

## Dictionary Display

Dictionary entries are stored as plain text:

```text
Greek word : translation / notes
```

Examples:

```text
προτιμάω/ώ : to prefer / предпочитать (group B1)
η ανακύκλωση : recycling => κάνω ανακύκλωση
καλός - ή - ό : good / nice
```

Display rules:

- Word lists show entries as written in the dictionary.
- Trainers hide verb groups, leading phrase markers, and inline examples during guessing when they would distract from the exercise.
- Service notes such as `(group B1)`, `(plur. ...)`, `(fut. ...)`, and `(imp. ...)` are shown as small muted text.
- Meaning notes such as `(for things that don't exist...)` are shown smaller.
- Inline examples after `=>` or `→` are shown in italic colored text.
- Adjective endings are highlighted in word lists.

## Dictionaries

Dictionaries are registered in:

```text
dictionaries/index.json
```

Each dictionary entry points to a `.txt` file in `dictionaries/`.

Current dictionary groups include:

- core vocabulary
- verb topics
- adjective topics
- family
- face
- character
- environment and recycling

## Run Locally

Start a local static server from the project root:

```bash
python3 -m http.server
```

Then open:

```text
http://localhost:8000/
```

A local server is required because the app loads dictionaries through `fetch`.

## Project Docs

Developer notes, file structure, and dictionary maintenance instructions live in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
