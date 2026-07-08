const app = document.getElementById("app");
const scrollButton = document.getElementById("scrollToTop");
const STORAGE_KEY = "htmdl-unlocked-chapters";

let chapters = [];
let sources = [];
let unlockedChapters = [];
let currentChapterIndex = 0;
let pageTheme = { bgColor: "#f7f3e8", textColor: "#1f2937" };

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveAssetUrl(value) {
  if (!value) return value;
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) return value;
  if (value.startsWith("/")) return `mdsrc${value}`;
  return value;
}

function setPageTheme(bgColor, textColor) {
  pageTheme = { bgColor, textColor };
  document.body.style.background = bgColor;
  document.body.style.color = textColor;
  document.documentElement.style.setProperty("--page-bg", bgColor);
  document.documentElement.style.setProperty("--page-text", textColor);
}

function storeUnlocks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedChapters));
}

function loadUnlocks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    unlockedChapters = [0];
    return;
  }

  try {
    const parsed = JSON.parse(stored);
    unlockedChapters = Array.isArray(parsed) ? parsed : [0];
  } catch {
    unlockedChapters = [0];
  }

  if (!unlockedChapters.includes(0)) unlockedChapters.unshift(0);
}

function isUnlocked(index) {
  return unlockedChapters.includes(index);
}

function getChapterTitle(markdown, fallbackIndex) {
  const firstLine = markdown.trim().split(/\r?\n/)[0] || "";
  const headingMatch = firstLine.match(/^#{1,6}\s+(.+)$/);
  if (headingMatch) {
    return headingMatch[1].trim();
  }
  return `Chapter ${fallbackIndex + 1}`;
}

function getChapterBody(markdown) {
  const lines = markdown.replace(/\r/g, "").split(/\n/);
  if (lines[0] && /^#{1,6}\s+/.test(lines[0].trim())) {
    const bodyLines = lines.slice(1);
    while (bodyLines[0] && bodyLines[0].trim() === "") {
      bodyLines.shift();
    }
    return bodyLines.join("\n");
  }
  return markdown.replace(/\r/g, "").trim();
}

function attachScrollListener() {
  window.addEventListener("scroll", () => {
    scrollButton.classList.toggle("visible", window.scrollY > 320);
  });

  scrollButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function buildNavigationOptions(currentIndex) {
  const options = [];
  chapters.forEach((chapter, index) => {
    if (isUnlocked(index)) {
      options.push(`<option value="${index}" ${currentIndex === index ? "selected" : ""}>${escapeHtml(chapter.title)}</option>`);
    }
  });
  options.push(`<option value="sources" ${currentIndex === "sources" ? "selected" : ""}>Sources</option>`);
  return options.join("");
}

function parseInline(text, sourceRefsForChapter = []) {
  const fragments = [];
  let lastIndex = 0;
  let sourceCursor = 0;
  const pattern = /!source\(([^)]+)\)|!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|~~([^~]+)~~|\*([^*]+)\*|_([^_]+)_/g;

  text.replace(pattern, (match, sourceUrl, imageAlt, imageUrl, linkText, linkUrl, codeText, strongText, strikeText, emText, underscoreText, offset) => {
    fragments.push(escapeHtml(text.slice(lastIndex, offset)));

    if (sourceUrl) {
      const sourceEntry = sourceRefsForChapter[sourceCursor];
      sourceCursor += 1;
      const sourceLink = sourceEntry
        ? `<a id="source-${sourceEntry.number}" class="source-ref" href="?chapter=sources#source-${sourceEntry.number}">[${sourceEntry.number}]</a>`
        : "[source]";
      fragments.push(sourceLink);
    } else if (imageAlt !== undefined) {
      fragments.push(`<img src="${resolveAssetUrl(imageUrl)}" alt="${escapeHtml(imageAlt)}" />`);
    } else if (linkText !== undefined) {
      fragments.push(`<a href="${resolveAssetUrl(linkUrl)}" target="_blank" rel="noreferrer">${escapeHtml(linkText)}</a>`);
    } else if (codeText !== undefined) {
      fragments.push(`<code>${escapeHtml(codeText)}</code>`);
    } else if (strongText !== undefined) {
      fragments.push(`<strong>${escapeHtml(strongText)}</strong>`);
    } else if (strikeText !== undefined) {
      fragments.push(`<del>${escapeHtml(strikeText)}</del>`);
    } else if (emText !== undefined) {
      fragments.push(`<em>${escapeHtml(emText)}</em>`);
    } else if (underscoreText !== undefined) {
      fragments.push(`<em>${escapeHtml(underscoreText)}</em>`);
    }

    lastIndex = offset + match.length;
    return match;
  });

  fragments.push(escapeHtml(text.slice(lastIndex)));
  return fragments.join("");
}

function parseListBlock(lines, startIndex, sourceRefsForChapter, parentIndent = 0) {
  const firstLine = lines[startIndex];
  const firstMatch = firstLine.match(/^(\s*)([-*+]\s+|\d+\.\s+)(.+)$/);
  if (!firstMatch) {
    return { html: "", nextIndex: startIndex };
  }

  const listType = /^\d+\./.test(firstMatch[2]) ? "ol" : "ul";
  const baseIndent = firstMatch[1].length;
  if (baseIndent < parentIndent) {
    return { html: "", nextIndex: startIndex };
  }

  const items = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const currentMatch = line.match(/^(\s*)([-*+]\s+|\d+\.\s+)(.+)$/);
    if (!currentMatch) {
      break;
    }

    const currentIndent = currentMatch[1].length;
    if (currentIndent < baseIndent || currentIndent > baseIndent && currentIndent < baseIndent + 2) {
      if (currentIndent < baseIndent) {
        break;
      }
    } else if (currentIndent > baseIndent) {
      const nestedList = parseListBlock(lines, index, sourceRefsForChapter, currentIndent);
      if (nestedList.html) {
        items[items.length - 1] = items[items.length - 1].replace(/<\/li>$/, `${nestedList.html}</li>`);
        index = nestedList.nextIndex;
        continue;
      }
    }

    const itemContent = currentMatch[3];
    let itemHtml = parseInline(itemContent, sourceRefsForChapter);
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index];
      const nextMatch = nextLine.match(/^(\s*)([-*+]\s+|\d+\.\s+)(.+)$/);
      if (!nextMatch) {
        break;
      }

      const nextIndent = nextMatch[1].length;
      if (nextIndent <= baseIndent) {
        break;
      }

      const nestedList = parseListBlock(lines, index, sourceRefsForChapter, nextIndent);
      itemHtml += nestedList.html;
      index = nestedList.nextIndex;
      break;
    }

    items.push(`<li>${itemHtml}</li>`);
  }

  return { html: `<${listType}>${items.join("")}</${listType}>`, nextIndex: index };
}

function parseTable(lines, startIndex, sourceRefsForChapter) {
  const rows = [];
  let index = startIndex;
  while (index < lines.length && lines[index].trim()) {
    if (!lines[index].includes("|")) break;
    rows.push(lines[index]);
    index += 1;
  }

  if (rows.length < 2) return { html: "", nextIndex: startIndex };
  const normalizedRows = rows.map((row) => row.split("|").slice(1, -1).map((cell) => cell.trim()));
  const header = normalizedRows[0];
  const separator = normalizedRows[1];
  if (!separator.every((cell) => /^:?-{3,}:?$/.test(cell))) {
    return { html: "", nextIndex: startIndex };
  }

  const bodyRows = normalizedRows.slice(2);
  const htmlRows = [
    `<table><thead><tr>${header.map((cell) => `<th>${parseInline(cell, sourceRefsForChapter)}</th>`).join("")}</tr></thead><tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${parseInline(cell, sourceRefsForChapter)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
  ];

  return { html: htmlRows.join(""), nextIndex: index };
}

function parseMarkdown(markdown, sourceRefsForChapter = []) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^```/.test(trimmed)) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      const level = trimmed.match(/^#{1,6}/)[0].length;
      const content = trimmed.replace(/^#{1,6}\s+/, "");
      blocks.push(`<h${level}>${parseInline(content, sourceRefsForChapter)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\|/.test(trimmed)) {
      const table = parseTable(lines, index, sourceRefsForChapter);
      if (table.html) {
        blocks.push(table.html);
        index = table.nextIndex;
        continue;
      }
    }

    if (/^\s*(?:[-*+]\s+|\d+\.\s+)/.test(trimmed)) {
      const listBlock = parseListBlock(lines, index, sourceRefsForChapter);
      blocks.push(listBlock.html);
      index = listBlock.nextIndex;
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length && lines[index].trim()) {
      if (/^#{1,6}\s+/.test(lines[index].trim()) || /^```/.test(lines[index].trim()) || /^\|/.test(lines[index].trim()) || /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(lines[index].trim())) {
        break;
      }
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    if (paragraphLines.length) {
      blocks.push(`<p>${parseInline(paragraphLines.join(" "), sourceRefsForChapter)}</p>`);
      continue;
    }

    index += 1;
  }

  return blocks.join("");
}

function scrollToHash(hash) {
  const anchorId = hash ? hash.replace(/^#/, "") : "";
  if (!anchorId) return;

  const scrollToTarget = (attempt) => {
    const target = document.getElementById(anchorId);
    if (!target) {
      if (attempt < 4) {
        window.setTimeout(() => scrollToTarget(attempt + 1), attempt === 0 ? 0 : 80);
      }
      return;
    }

    const top = window.scrollY + target.getBoundingClientRect().top - 96;
    window.scrollTo({ top: Math.max(0, top), behavior: attempt === 0 ? "smooth" : "auto" });
  };

  window.requestAnimationFrame(() => scrollToTarget(0));
  window.setTimeout(() => scrollToTarget(1), 60);
  window.setTimeout(() => scrollToTarget(2), 180);
  window.setTimeout(() => scrollToTarget(3), 360);
}

function renderSources() {
  const sourceItems = sources.map((source) => {
    return `<li id="source-${source.number}"><a href="?chapter=${source.chapterIndex}#source-${source.number}">[${source.number}]</a>: <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.url)}</a></li>`;
  });

  app.innerHTML = `
    <article class="chapter-card">
      <div class="chapter-toolbar">
        <h2>Sources</h2>
        <select id="chapterSelector" aria-label="Select chapter">
          ${buildNavigationOptions("sources")}
        </select>
      </div>
      <div class="chapter-content">
        <ul class="sources-list">${sourceItems.join("")}</ul>
      </div>
    </article>
  `;

  setPageTheme(pageTheme.bgColor, pageTheme.textColor);

  document.getElementById("chapterSelector").addEventListener("change", (event) => {
    navigateTo(event.target.value);
  });

  scrollToHash(window.location.hash);
}

function renderChapter(index) {
  const chapter = chapters[index];
  const body = getChapterBody(chapter.markdown);
  const content = parseMarkdown(body, chapter.sourceRefs);

  setPageTheme(chapter.bgColor || pageTheme.bgColor, chapter.textColor || pageTheme.textColor);

  app.innerHTML = `
    <article id="chapter-${index + 1}" class="chapter-card">
      <div class="chapter-toolbar">
        <h2>${escapeHtml(chapter.title)}</h2>
        <select id="chapterSelector" aria-label="Select chapter">
          ${buildNavigationOptions(index)}
        </select>
      </div>
      <div class="chapter-content">${content}</div>
      <div class="chapter-actions">
        <button class="next-button" id="continueButton">${index < chapters.length - 1 ? "Next chapter" : "View sources"}</button>
      </div>
    </article>
  `;

  document.getElementById("chapterSelector").addEventListener("change", (event) => {
    navigateTo(event.target.value);
  });

  document.getElementById("continueButton").addEventListener("click", () => {
    if (index < chapters.length - 1) {
      if (!unlockedChapters.includes(index + 1)) {
        unlockedChapters.push(index + 1);
        storeUnlocks();
      }
      navigateTo(index + 1);
    } else {
      navigateTo("sources");
    }
  });

  scrollToHash(window.location.hash);
}

function navigateTo(target) {
  if (target === "sources") {
    currentChapterIndex = "sources";
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("chapter", "sources");
    nextUrl.hash = "";
    history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
    renderSources();
    return;
  }

  const chapterIndex = Number(target);
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0 || chapterIndex >= chapters.length) {
    return;
  }

  if (!isUnlocked(chapterIndex)) {
    return;
  }

  currentChapterIndex = chapterIndex;
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("chapter", String(chapterIndex));
  nextUrl.hash = "";
  history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
  renderChapter(chapterIndex);
}

function initFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const target = params.get("chapter");

  if (target === "sources") {
    currentChapterIndex = "sources";
    renderSources();
    return;
  }

  const requestedIndex = Number(target);
  if (Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < chapters.length && isUnlocked(requestedIndex)) {
    currentChapterIndex = requestedIndex;
    renderChapter(requestedIndex);
    return;
  }

  const fallbackIndex = unlockedChapters[unlockedChapters.length - 1] ?? 0;
  currentChapterIndex = fallbackIndex;
  history.replaceState({}, "", `?chapter=${fallbackIndex}`);
  renderChapter(fallbackIndex);
}

async function loadChapters() {
  loadUnlocks();
  attachScrollListener();

  try {
    const metadataResponse = await fetch("./mdsrc/metadata.json");
    const metadata = await metadataResponse.json();

    chapters = [];
    sources = [];
    pageTheme = {
      bgColor: metadata.sources?.bg_color || "#ead2a8",
      textColor: metadata.sources?.text_color || "#ffffff",
    };

    for (const [index, entry] of metadata.chapters.entries()) {
      const chapterPath = entry.file;
      let response;
      try {
        response = await fetch(`./mdsrc/${chapterPath}`);
      } catch {
        response = await fetch(`./mdsrc/${chapterPath.replace("chap03", "chap-3")}`);
      }

      if (!response.ok) {
        throw new Error(`Could not load chapter ${chapterPath}`);
      }

      const markdown = await response.text();
      const title = getChapterTitle(markdown, index);
      chapters.push({
        title,
        markdown,
        bgColor: entry.bg_color || metadata.sources?.bg_color || "#ead2a8",
        textColor: entry.text_color || metadata.sources?.text_color || "#ffffff",
        sourceRefs: [],
        chapterIndex: index,
      });
    }

    let nextSourceNumber = 1;
    chapters.forEach((chapter) => {
      const sourceRefs = [];
      const pattern = /!source\(([^)]+)\)/g;
      chapter.markdown.replace(pattern, (match, sourceUrl) => {
        const sourceEntry = {
          number: nextSourceNumber,
          url: sourceUrl,
          chapterIndex: chapter.chapterIndex,
          chapterTitle: chapter.title,
        };
        sourceRefs.push(sourceEntry);
        sources.push(sourceEntry);
        nextSourceNumber += 1;
        return match;
      });
      chapter.sourceRefs = sourceRefs;
    });

    initFromQuery();
  } catch (error) {
    app.innerHTML = `<article class="chapter-card"><p>${escapeHtml(error.message)}</p></article>`;
  }
}

loadChapters();
