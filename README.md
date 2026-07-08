# HTMdL

HTMdL is a lightweight HTML/CSS/JavaScript site that loads markdown chapters from `src/mdsrc`, applies metadata from `src/mdsrc/metadata.json`, and renders a readable chapter browser with source references.

## Project overview

- Chapters are stored as markdown files in `src/mdsrc`.
- The site reads `metadata.json` for theme colors, chapter titles, source metadata, and navigation behavior.
- Sources are listed in a dedicated sources chapter and link back to the exact location where the source is used inside the target chapter.

## Usage

1. Open `src/index.html` in a browser.
2. The site loads `src/mdsrc/metadata.json` and the markdown chapters automatically.
3. Use the chapter dropdown to switch between chapters.
4. When a source link is clicked from the sources chapter, the destination chapter opens and scrolls to the source reference.

## Special source behavior

- Source entries are built from the metadata and connected to source references inside chapters.
- Each source link in the sources chapter opens the related chapter and scrolls to the exact reference point.
- Source numbers are calculated once on startup and reused so that references remain consistent across the site.

## Creating your own blog

1. Add a new markdown file in `src/mdsrc`, for example `chapter_03.md`.
2. Use markdown formatting for headings, paragraphs, lists, images, tables, and source references.
3. Open `src/mdsrc/metadata.json` and add a matching entry for the new chapter under the `chapters` array.
4. Provide a `file`, `bg_color`, and `text_color` property for the chapter.

### Example metadata entry

```json
{
    "file": "chapter_03.md",
    "bg_color": "#f0f0f0",
    "text_color": "#333333"
}
```

## Noteworthy details

- The page theme is controlled from `metadata.json`, including the background and text colors.
- The site keeps chapter progression state in local storage, so unlocked chapters remain available between visits.
