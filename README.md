# Catholicism and Gender

A personal project collecting primary sources and original articles exploring the topics of Catholicism and gender over time.

**Read and search:** [Catholicism & Gender](https://meganoelgoetz.github.io/catholicism-gender/)

## Collections

- [Academic](academic/): scholarship and philosophical perspectives.
- [Magisterial](magisterial/): Church documents and papal teaching.
- [Popular](popular/): essays and conversations.

The website renders Markdown as readable pages with clickable folders and fuzzy search across titles, folder names, and full document text. Search tolerates small spelling mistakes and transposed letters. Press `/` to focus search and Escape to close it.

`assets/` supports embedded images but is not listed or searched. `original-non-markdown/` and `summaries/` are excluded from the website entirely, including its search index.

## Updating the library

Add or edit Markdown files in a collection and push to `main`. GitHub Actions rebuilds the library, updates the search index, and deploys Pages automatically. New content folders and nested subfolders are discovered automatically. Hidden folders and the build/tooling folders (`site`, `scripts`, `tests`, `node_modules`, and `dist`) are not content collections.

For images, use a relative path from the Markdown file to `assets/`. The builder also supports the older `assets/...` links in imported documents.

## Local preview

Requires Node.js 22 or newer.

```sh
npm install
npm run build
npm test
python3 -m http.server 8765 --directory dist
```

Open <http://localhost:8765>. Generated files in `dist/` are ignored by Git. The website has no runtime CDN dependencies; search runs in the visitor's browser.

## Hosting

The workflow in `.github/workflows/pages.yml` publishes through GitHub Actions. Repository Settings → Pages → Source must be **GitHub Actions**.
