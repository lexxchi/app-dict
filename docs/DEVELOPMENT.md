# Development Notes

This project is a static browser app: no build step, package manager, or framework is required.

## Local Workflow

Run the app from the project root with a static server:

```bash
python3 -m http.server
```

Open `http://localhost:8000/` in a browser. Do not open `index.html` directly, because browser security rules can block `fetch` requests for local dictionary files.

## Structure

```text
.
├── changelog.html
├── dictionaries/
│   ├── core.txt
│   ├── index.json
│   └── *.txt
├── docs/
│   └── DEVELOPMENT.md
├── index.html
├── README.md
└── src/
    ├── js/
    │   ├── app.js
    │   ├── config.js
    │   ├── dictionary-service.js
    │   ├── trainer.js
    │   └── word-list.js
    └── styles/
        ├── base.css
        ├── components.css
        ├── layout.css
        ├── main.css
        ├── responsive.css
        └── variables.css
```

## JavaScript Responsibilities

- `src/js/app.js` wires DOM elements, dictionaries, the trainer, and the word list together.
- `src/js/config.js` stores constants, app metadata, and fallback paths.
- `src/js/dictionary-service.js` loads and parses dictionary data.
- `src/js/trainer.js` owns the matching-round behavior.
- `src/js/word-list.js` owns the selected dictionary table.

## Styles

Use `src/styles/main.css` as the only stylesheet linked from HTML. It imports the rest:

- `variables.css` for design tokens.
- `base.css` for global element defaults.
- `layout.css` for page-level structure.
- `components.css` for reusable UI pieces.
- `responsive.css` for media queries.

## Dictionaries

All dictionary files belong in `dictionaries/`.

Dictionary rows use this format:

```text
греческое слово или фраза : перевод
```

Rules:

- The first `:` separates the Greek text from the translation.
- Empty lines are ignored.
- Lines starting with `#` are ignored.

To add a dictionary:

1. Create a `.txt` file in `dictionaries/`, for example `dictionaries/food.txt`.
2. Add it to `dictionaries/index.json`:

   ```json
   {
     "id": "food",
     "name": "Еда",
     "file": "dictionaries/food.txt"
   }
   ```

3. Refresh the browser page.
4. Add a short entry to `changelog.html` if the dictionary is part of a user-facing update.

## App Metadata

`PLATFORM_VERSION` and `LAST_UPDATED_AT` live in `src/js/config.js`.

Update `LAST_UPDATED_AT` when shipping visible changes. Increment `PLATFORM_VERSION` only when you want to mark a new app release, not for every content-only dictionary update.

## Checks

Run a syntax check for the JS modules:

```bash
node --check src/js/app.js
node --check src/js/config.js
node --check src/js/dictionary-service.js
node --check src/js/trainer.js
node --check src/js/word-list.js
```

After structural changes, also run the app in the browser and verify:

- Dictionaries load from the dropdown.
- A new round starts.
- Correct and incorrect matches behave as expected.
- The selected dictionary table updates when switching dictionaries.
