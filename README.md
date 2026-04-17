# Greek Match Trainer

Greek Match Trainer is a small browser app for practicing Greek vocabulary by matching words with their translations.

The app supports multiple vocabulary lists, short matching rounds, progress tracking, mistake counting, and a browsable word table for the selected dictionary.

## Features

- Switch between vocabulary dictionaries.
- Match Greek words with translations in either direction.
- Practice up to 20 random pairs per round, shown in smaller batches.
- See mistakes and final round accuracy.
- Preview the selected dictionary and expand the full word list.
- Review app updates on the changelog page.

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
