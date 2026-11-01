/* Block menus and document-safe extensions for the static Write Studio. */
"use strict";
function studioDecodeAttribute(value) {
  if (!value || !value.startsWith("%")) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
const STUDIO_TYPES = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
  "table",
  "horizontalRule",
  "image",
  "rawBlock",
  "studioToggle",
  "studioCallout",
  "studioNote",
  "studioEmbed",
  "studioWidget",
];
const STUDIO_COLORS = [
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
];
function studioExtensions() {
  const { Node, Extension } = BlockEngine;
  const metadata = Extension.create({
    name: "studioMetadata",
    addGlobalAttributes() {
      return [
        {
          types: STUDIO_TYPES,
          attributes: {
            blockId: {
              default: null,
              parseHTML: (n) => n.getAttribute("data-block-id"),
              renderHTML: (a) =>
                a.blockId ? { "data-block-id": a.blockId } : {},
            },
            studioColor: {
              default: null,
              parseHTML: (n) => n.getAttribute("data-studio-color"),
              renderHTML: (a) =>
                a.studioColor ? { "data-studio-color": a.studioColor } : {},
            },
            studioBackground: {
              default: null,
              parseHTML: (n) => n.getAttribute("data-studio-background"),
              renderHTML: (a) =>
                a.studioBackground
                  ? { "data-studio-background": a.studioBackground }
                  : {},
            },
            studioList: {
              default: null,
              parseHTML: (n) => n.getAttribute("data-studio-list"),
              renderHTML: (a) =>
                a.studioList ? { "data-studio-list": a.studioList } : {},
            },
            studioNotes: {
              default: null,
              parseHTML: (n) =>
                studioDecodeAttribute(n.getAttribute("data-studio-notes")),
              renderHTML: (a) =>
                a.studioNotes
                  ? { "data-studio-notes": encodeURIComponent(a.studioNotes) }
                  : {},
            },
            studioEdited: {
              default: null,
              parseHTML: (n) => n.getAttribute("data-studio-edited"),
              renderHTML: (a) =>
                a.studioEdited ? { "data-studio-edited": a.studioEdited } : {},
            },
          },
        },
      ];
    },
  });
  const toggle = Node.create({
    name: "studioToggle",
    group: "block",
    content: "block+",
    defining: true,
    addAttributes() {
      return {
        summary: { default: "토글 제목" },
        level: { default: 0 },
        open: { default: true, parseHTML: (n) => n.hasAttribute("open") },
      };
    },
    parseHTML() {
      return [
        {
          tag: "details[data-studio-toggle]",
          contentElement: "[data-studio-toggle-body]",
          getAttrs: (n) => ({
            summary: n.querySelector("summary")?.textContent || "토글 제목",
            level: Number(n.dataset.level) || 0,
          }),
        },
      ];
    },
    renderHTML({ node, HTMLAttributes }) {
      return [
        "details",
        {
          ...HTMLAttributes,
          "data-studio-toggle": "true",
          "data-level": node.attrs.level,
          open: node.attrs.open ? "" : null,
        },
        [
          "summary",
          { contenteditable: "false", tabindex: "0" },
          node.attrs.summary,
        ],
        ["div", { "data-studio-toggle-body": "true" }, 0],
      ];
    },
    addNodeView() {
      return ({ node, HTMLAttributes, getPos, editor }) => {
        const dom = document.createElement("details"),
          summary = el("summary", "", node.attrs.summary),
          body = el("div");
        for (const [k, v] of Object.entries(HTMLAttributes))
          if (v !== null) dom.setAttribute(k, v);
        dom.dataset.studioToggle = "true";
        dom.dataset.level = node.attrs.level;
        dom.open = node.attrs.open;
        summary.contentEditable = "false";
        summary.tabIndex = 0;
        summary.title = "클릭하여 접기·펼치기 · 더블 클릭하여 제목 편집";
        body.dataset.studioToggleBody = "true";
        dom.append(summary, body);
        dom.addEventListener("toggle", () => {
          const pos = getPos();
          if (
            typeof pos === "number" &&
            editor.state.doc.nodeAt(pos)?.type.name === "studioToggle" &&
            editor.state.doc.nodeAt(pos).attrs.open !== dom.open
          )
            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(pos, undefined, {
                ...editor.state.doc.nodeAt(pos).attrs,
                open: dom.open,
              }),
            );
        });
        summary.ondblclick = (e) => {
          e.preventDefault();
          const value = prompt("토글 제목", summary.textContent);
          if (value !== null && value.trim()) {
            const pos = getPos();
            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(pos, undefined, {
                ...editor.state.doc.nodeAt(pos).attrs,
                summary: value.trim(),
              }),
            );
          }
        };
        return { dom, contentDOM: body };
      };
    },
  });
  const container = (name, label) =>
    Node.create({
      name,
      group: "block",
      content: "block+",
      defining: true,
      parseHTML() {
        return [{ tag: 'aside[data-studio-kind="' + name + '"]' }];
      },
      renderHTML({ HTMLAttributes }) {
        return [
          "aside",
          { ...HTMLAttributes, "data-studio-kind": name, "aria-label": label },
          0,
        ];
      },
    });
  const embed = Node.create({
    name: "studioEmbed",
    group: "block",
    atom: true,
    selectable: true,
    addAttributes() {
      return {
        html: {
          default: "",
          renderHTML: () => ({}),
          parseHTML: (n) =>
            studioDecodeAttribute(n.getAttribute("data-studio-html")),
        },
      };
    },
    parseHTML() {
      return [{ tag: "div[data-studio-embed]" }];
    },
    renderHTML({ node, HTMLAttributes }) {
      const dom = el("div", "studio-embed");
      for (const [k, v] of Object.entries(HTMLAttributes))
        if (v !== null) dom.setAttribute(k, v);
      dom.dataset.studioEmbed = "true";
      dom.dataset.studioHtml = encodeURIComponent(node.attrs.html);
      dom.contentEditable = "false";
      const content = el("div", "studio-embed-content");
      content.innerHTML = DOMPurify.sanitize(node.attrs.html, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: [
          "style",
          "iframe",
          "form",
          "input",
          "button",
          "textarea",
          "select",
        ],
        FORBID_ATTR: [
          "style",
          "id",
          "name",
          "contenteditable",
          "autofocus",
          "tabindex",
        ],
      });
      dom.append(content);
      return dom;
    },
  });
  return [
    metadata,
    toggle,
    container("studioCallout", "콜아웃"),
    container("studioNote", "AI 노트 · 수동 작성"),
    embed,
    ...studioWidgetExtensions(),
  ];
}
function studioNeedsHTML(node) {
  let inline = false;
  node.descendants((n) => {
    if (n.type.name === "studioInlineEquation") inline = true;
  });
  return (
    inline ||
    node.type.name.startsWith("studio") ||
    [
      "studioColor",
      "studioBackground",
      "studioList",
      "studioNotes",
      "studioEdited",
    ].some((k) => node.attrs[k]) ||
    node.attrs.blockId?.startsWith("link-")
  );
}
function studioSerialize(node) {
  const dom = BlockEngine.DOMSerializer.fromSchema(
    RICH.editor.schema,
  ).serializeNode(node);
  for (const col of dom.querySelectorAll("colgroup")) col.remove();
  return dom.outerHTML;
}
const BLOCK_UI = {
  menu: null,
  document: null,
  id: null,
  selection: null,
  dragging: false,
  slashSuppressed: null,
};
const blockControls = el("div", "block-controls");
blockControls.id = "blockControls";
blockControls.hidden = true;
blockControls.setAttribute("aria-label", "블록 도구");
const addBlock = el("button", "block-add", "+");
addBlock.type = "button";
addBlock.innerHTML =
  '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3v14M3 10h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
addBlock.dataset.tooltip = "아래에 블록 추가";
addBlock.setAttribute("aria-label", "블록 추가");
const dragBlock = el("button", "block-handle");
dragBlock.type = "button";
dragBlock.dataset.blockDrag = "true";
dragBlock.dataset.tooltip = "드래그해서 옮기기 · 클릭하거나 Ctrl+/로 메뉴 열기";
dragBlock.setAttribute("aria-label", "블록 이동 또는 메뉴 열기");
dragBlock.setAttribute("aria-haspopup", "menu");
for (let i = 0; i < 6; i++) dragBlock.append(el("i"));
blockControls.append(addBlock, dragBlock);
document.body.append(blockControls);
const slashMenu = el("div", "slash-menu studio-menu");
slashMenu.id = "slashMenu";
slashMenu.hidden = true;
slashMenu.setAttribute("role", "dialog");
slashMenu.setAttribute("aria-label", "블록 추가");
document.body.append(slashMenu);
const blockMenu = el("div", "studio-menu block-menu");
blockMenu.id = "blockMenu";
blockMenu.hidden = true;
blockMenu.setAttribute("role", "dialog");
blockMenu.setAttribute("aria-label", "블록 작업");
document.body.append(blockMenu);
const SLASH = [
  ["note", "AI 노트", "▤", "추천", "수동 노트 · AI 서비스 연결 필요"],
  ["embed", "HTML · 임베드", "‹/›", "추천", "안전한 HTML 콘텐츠"],
  ["toggle3", "토글 제목3", "▸H₃", "추천", "### >"],
  ["toggle1", "토글 제목1", "▸H₁", "추천", "# >"],
  ["paragraph", "텍스트", "T", "기본 블록", ""],
  ["heading1", "제목1", "H₁", "기본 블록", "#"],
  ["heading2", "제목2", "H₂", "기본 블록", "##"],
  ["heading3", "제목3", "H₃", "기본 블록", "###"],
  ["heading4", "제목4", "H₄", "기본 블록", "####"],
  ["bullet", "글머리 기호 목록", "☷", "기본 블록", "-"],
  ["number", "번호 매기기 목록", "1.", "기본 블록", "1."],
  ["task", "할 일 목록", "☑", "기본 블록", "[]"],
  ["toggle", "토글 목록", "▸", "기본 블록", ">"],
  ["page", "페이지", "▤", "기본 블록", ""],
  ["callout", "콜아웃", "▣", "기본 블록", ""],
  ["quote", "인용", "❞", "기본 블록", '"'],
  ["table", "표", "▦", "기본 블록", ""],
  ["rule", "구분선", "―", "기본 블록", "---"],
  ["fence", "코드 블록", "{}", "미디어", "```"],
  ["image", "이미지", "▧", "미디어", ""],
  ["link", "링크", "↗", "미디어", ""],
];
let slashState = null;
function currentStudioBlock(id = BLOCK_UI.id || RICH.activeBlock) {
  return richTopBlocks().find((b) => b.id === id);
}
function blockUIValid() {
  return (
    RICH.editor?.isEditable &&
    BLOCK_UI.document === APP.activeId &&
    currentStudioBlock()
  );
}
function closeBlockMenus(focus = false) {
  const had = !blockMenu.hidden || !slashMenu.hidden;
  blockMenu.hidden = slashMenu.hidden = true;
  slashState = null;
  BLOCK_UI.menu = null;
  if (focus && had) RICH.editor?.commands.focus();
}
function placeStudioMenu(menu, x, y) {
  menu.style.left =
    Math.max(8, Math.min(x, innerWidth - Math.min(350, innerWidth - 16) - 8)) +
    "px";
  menu.style.top =
    Math.max(
      8,
      Math.min(y, innerHeight - Math.min(510, innerHeight - 24) - 8),
    ) + "px";
  menu.style.maxHeight = Math.min(510, innerHeight - 24) + "px";
}
function menuButton(label, action, icon = "", hint = "") {
  const b = el("button", "studio-menu-item");
  b.type = "button";
  b.setAttribute("aria-label", label);
  b.append(
    el("span", "studio-menu-icon", icon),
    el("span", "studio-menu-label", label),
  );
  if (hint) b.append(el("small", "studio-menu-hint", hint));
  b.onmousedown = (e) => e.preventDefault();
  b.onclick = () => {
    try {
      action();
    } catch (e) {
      onError(e);
    }
  };
  return b;
}
function menuHeading(menu, text) {
  menu.append(el("div", "studio-menu-heading", text));
}
function menuSearch(menu, placeholder, oninput) {
  const input = el("input", "studio-menu-search");
  input.placeholder = placeholder;
  input.setAttribute("aria-label", placeholder);
  input.oninput = () => oninput(input.value);
  menu.append(input);
  return input;
}
function updateBlockControls(block) {
  if (!RICH.editor?.isEditable || APP.view === "edit") {
    blockControls.hidden = true;
    closeBlockMenus();
    return;
  }
  if (BLOCK_UI.document && BLOCK_UI.document !== APP.activeId)
    closeBlockMenus();
  if (BLOCK_UI.dragging || BLOCK_UI.menu) return;
  const b = block || activeRichBlock();
  if (!b) return;
  RICH.activeBlock = b.id;
  const dom = RICH.editor.view.nodeDOM(b.pos);
  if (!dom?.getBoundingClientRect) return;
  const r = dom.getBoundingClientRect(),
    bounds = $("#preview").getBoundingClientRect(),
    visibleTop = Math.max(bounds.top, 0);
  if (r.bottom < visibleTop || r.top > Math.min(bounds.bottom, innerHeight)) {
    blockControls.hidden = true;
    return;
  }
  blockControls.style.left = Math.max(bounds.left + 2, r.left - 57) + "px";
  // Align both gutter buttons to the text line, including container padding.
  let anchor = b.pos + 1;
  if (!b.node.isTextblock) {
    let found = false;
    b.node.descendants((node, offset) => {
      if (found) return false;
      if (node.isTextblock) {
        anchor = b.pos + offset + 2;
        found = true;
        return false;
      }
    });
  }
  const selection = RICH.editor.state.selection;
  if (
    RICH.editor.isFocused &&
    selection.from > b.pos &&
    selection.from < b.pos + b.node.nodeSize &&
    selection.$from.parent.isTextblock
  )
    anchor = selection.from;
  let center = r.top + Math.min(r.height, 28) / 2;
  if (!b.node.isAtom) {
    const caret = RICH.editor.view.coordsAtPos(anchor);
    center = (caret.top + caret.bottom) / 2;
  }
  blockControls.style.top = Math.max(visibleTop + 2, center - 14) + "px";
  blockControls.hidden = false;
}
function activateBlock(id) {
  const b = currentStudioBlock(id);
  if (!b) return null;
  RICH.activeBlock = b.id;
  BLOCK_UI.id = b.id;
  BLOCK_UI.document = APP.activeId;
  return b;
}
function studioReplace(b, nodes) {
  if (!b || !RICH.editor.isEditable) return;
  historyBoundary();
  HISTORY.area = "preview";
  const tr = RICH.editor.state.tr.replaceWith(
    b.pos,
    b.pos + b.node.nodeSize,
    BlockEngine.Fragment.fromArray(nodes),
  );
  tr.setSelection(
    BlockEngine.TextSelection.near(
      tr.doc.resolve(Math.min(b.pos + 1, tr.doc.content.size)),
    ),
  );
  RICH.editor.view.dispatch(tr);
  historyBoundary();
}
function studioPatch(attrs, id = BLOCK_UI.id) {
  const b = currentStudioBlock(id);
  if (!b) return;
  historyBoundary();
  RICH.editor.view.dispatch(
    RICH.editor.state.tr.setNodeMarkup(b.pos, undefined, {
      ...b.node.attrs,
      ...attrs,
      studioEdited: new Date().toISOString(),
    }),
  );
  historyBoundary();
}
function studioParagraph(text = "") {
  return RICH.editor.schema.nodes.paragraph.create(
    null,
    text ? RICH.editor.schema.text(text) : null,
  );
}
function selectBlockText(b) {
  RICH.editor.commands.setTextSelection({
    from: b.pos + 1,
    to: Math.max(b.pos + 1, b.pos + b.node.nodeSize - 1),
  });
}
function convertStudioBlock(command) {
  if (!blockUIValid()) return;
  const b = currentStudioBlock(),
    schema = RICH.editor.schema,
    attrs = { ...b.node.attrs, studioEdited: new Date().toISOString() };
  let node;
  const textContent = b.node.textContent
    ? schema.text(b.node.textContent)
    : null;
  const p = schema.nodes.paragraph.create(
    null,
    b.node.isTextblock ? b.node.content : textContent,
  );
  if (command === "paragraph")
    node = schema.nodes.paragraph.create(
      attrs,
      b.node.isTextblock ? b.node.content : textContent,
    );
  else if (/^heading[1-4]$/.test(command))
    node = schema.nodes.heading.create(
      { ...attrs, level: Number(command.at(-1)) },
      b.node.isTextblock ? b.node.content : textContent,
    );
  else if (["bullet", "number", "task"].includes(command)) {
    const list =
        command === "bullet"
          ? "bulletList"
          : command === "number"
            ? "orderedList"
            : "taskList",
      item = command === "task" ? "taskItem" : "listItem";
    const oldItems = ["bulletList", "orderedList", "taskList"].includes(
      b.node.type.name,
    )
      ? Array.from({ length: b.node.childCount }, (_, i) => b.node.child(i))
      : null;
    node = schema.nodes[list].create(
      attrs,
      oldItems
        ? oldItems.map((n) =>
            schema.nodes[item].create(
              command === "task" ? { checked: n.attrs.checked || false } : null,
              n.content,
            ),
          )
        : schema.nodes[item].create(null, p),
    );
  } else if (command === "quote")
    node = schema.nodes.blockquote.create(attrs, p);
  else if (command === "fence")
    node = schema.nodes.codeBlock.create(attrs, textContent);
  else if (command === "callout" || command === "note")
    node = schema.nodes[
      command === "callout" ? "studioCallout" : "studioNote"
    ].create(attrs, p);
  else if (command.startsWith("toggle"))
    node = schema.nodes.studioToggle.create(
      {
        ...attrs,
        summary: b.node.textContent || "토글 제목",
        level: Number(command.slice(6)) || 0,
      },
      studioParagraph("내용을 입력하세요."),
    );
  if (node) {
    closeBlockMenus();
    studioReplace(b, [node]);
    RICH.editor.commands.focus();
  }
}
function openInsertMenu(b, x, y, mode = "insert") {
  if (!b || !RICH.editor.isEditable) return;
  closeBlockMenus();
  activateBlock(b.id);
  BLOCK_UI.menu = "insert";
  slashState = {
    mode,
    document: APP.activeId,
    id: b.id,
    items: SLASH,
    index: 0,
    query: "",
  };
  slashMenu.replaceChildren();
  const search = menuSearch(slashMenu, "블록 검색", (q) => {
    if (slashState) {
      slashState.query = q;
      slashState.index = 0;
      renderInsertItems();
    }
  });
  slashMenu.append(el("div", "studio-menu-list"));
  const foot = menuButton("메뉴 닫기", () => closeBlockMenus(true), "", "esc");
  foot.classList.add("studio-menu-footer");
  slashMenu.append(foot);
  renderInsertItems();
  placeStudioMenu(slashMenu, x, y);
  slashMenu.hidden = false;
  search.focus();
}
function renderInsertItems() {
  if (!slashState) return;
  const list = slashMenu.querySelector(".studio-menu-list");
  const q = slashState.query.toLocaleLowerCase();
  slashState.items = SLASH.filter((i) =>
    (i[0] + " " + i[1]).toLocaleLowerCase().includes(q),
  );
  slashState.index = Math.min(
    slashState.index,
    Math.max(0, slashState.items.length - 1),
  );
  list.replaceChildren();
  let section = "";
  slashState.items.forEach(([cmd, label, icon, group, hint], i) => {
    if (group !== section) {
      menuHeading(list, group);
      section = group;
    }
    const b = menuButton(label, () => runSlash(cmd), icon, hint);
    b.classList.toggle("selected", i === slashState.index);
    b.dataset.command = cmd;
    b.title =
      {
        paragraph: "일반 텍스트를 작성합니다.",
        page: "새 페이지를 만들고 연결합니다.",
        callout: "아이콘과 배경으로 중요한 내용을 강조합니다.",
        toggle: "접고 펼칠 수 있는 내용을 추가합니다.",
        table: "행과 열로 된 표를 추가합니다.",
        note: "노트를 작성합니다. AI 자동 작성에는 서비스 연결이 필요합니다.",
      }[cmd] ||
      (group === "데이터베이스"
        ? label + "로 데이터를 관리하고 표시합니다."
        : label + " · " + group);
    if (cmd.startsWith("color-")) {
      const [, attr, color] = cmd.split("-"),
        swatch = b.querySelector(".studio-menu-icon");
      swatch.classList.add("studio-color-swatch");
      if (attr === "studioBackground") {
        swatch.textContent = "";
        swatch.dataset.studioBackground = color;
      } else swatch.dataset.studioColor = color;
    }
    b.onpointermove = () => {
      if (slashState) {
        slashState.index = i;
        list
          .querySelectorAll("button")
          .forEach((n) => n.classList.toggle("selected", n === b));
      }
    };
    list.append(b);
  });
  if (!slashState.items.length)
    list.append(el("p", "studio-empty", "검색 결과가 없습니다."));
}
function updateSlashMenu() {
  if (BLOCK_UI.document && BLOCK_UI.document !== APP.activeId) {
    closeBlockMenus();
    return;
  }
  if (slashState && slashState.mode !== "slash") return;
  if (
    !RICH.editor?.isEditable ||
    !RICH.editor.isFocused ||
    RICH.editor.isActive("codeBlock")
  ) {
    if (
      slashState?.mode === "slash" &&
      !slashMenu.contains(document.activeElement)
    )
      closeBlockMenus();
    return;
  }
  const s = RICH.editor.state.selection,
    text = s.$from.parent.textBetween(0, s.$from.parentOffset, "", ""),
    match = text.match(/(?:^|\s)\/([^\s/]*)$/);
  if (!s.empty || !match) {
    if (slashState?.mode === "slash") closeBlockMenus();
    return;
  }
  const from = s.from - match[1].length - 1,
    key = APP.activeId + ":" + from + ":" + text;
  if (BLOCK_UI.slashSuppressed === key) return;
  const b = activeRichBlock();
  activateBlock(b.id);
  BLOCK_UI.menu = "insert";
  const index = slashState?.index || 0;
  slashState = {
    mode: "slash",
    document: APP.activeId,
    id: b.id,
    from,
    to: s.from,
    query: match[1],
    items: SLASH,
    index,
  };
  slashMenu.replaceChildren(el("div", "studio-menu-list"));
  renderInsertItems();
  slashMenu.append(
    el("div", "studio-menu-footer", "↑ ↓ 선택 · Enter 추가 · Esc 닫기"),
  );
  const rect = RICH.editor.view.coordsAtPos(s.from);
  placeStudioMenu(slashMenu, rect.left, rect.bottom + 6);
  slashMenu.hidden = false;
}
function runSlash(command) {
  if (!slashState || slashState.document !== APP.activeId)
    return closeBlockMenus();
  if (STUDIO_EXTRA.has(command))
    return insertStudioExtra(command, { ...slashState });
  const state = { ...slashState },
    b = currentStudioBlock(state.id);
  if (!b) return closeBlockMenus();
  if (["image", "link", "embed"].includes(command)) {
    const value = prompt(
      command === "embed"
        ? "삽입할 HTML (스크립트·폼·iframe은 제거됩니다)"
        : command === "image"
          ? "이미지 URL (HTTPS)"
          : "링크 URL (HTTPS)",
    );
    if (value === null) return;
    if (command !== "embed" && !/^https?:\/\//i.test(value.trim()))
      return toast("HTTP(S) 주소를 입력하세요.", true);
    state.value = value;
  }
  if (command === "page") {
    const title = prompt("새 페이지 제목", "제목 없는 문서");
    if (title === null || !title.trim()) return;
    state.value = title.trim().slice(0, 200);
  }
  closeBlockMenus();
  historyBoundary();
  HISTORY.area = "preview";
  if (state.mode === "slash") {
    RICH.editor.commands.deleteRange({ from: state.from, to: state.to });
  }
  const target = currentStudioBlock(state.id);
  if (!target) return;
  if (state.mode === "convert") {
    activateBlock(target.id);
    convertStudioBlock(command);
    return;
  }
  const schema = RICH.editor.schema,
    id = crypto.randomUUID(),
    attrs = { blockId: id, studioEdited: new Date().toISOString() };
  let node;
  if (command === "paragraph") node = schema.nodes.paragraph.create(attrs);
  else if (/^heading[1-4]$/.test(command))
    node = schema.nodes.heading.create({
      ...attrs,
      level: Number(command.at(-1)),
    });
  else if (["bullet", "number", "task"].includes(command)) {
    const type = {
      bullet: "bulletList",
      number: "orderedList",
      task: "taskList",
    }[command];
    node = schema.nodes[type].create(
      attrs,
      schema.nodes[command === "task" ? "taskItem" : "listItem"].create(
        null,
        studioParagraph(),
      ),
    );
  } else if (command.startsWith("toggle"))
    node = schema.nodes.studioToggle.create(
      { ...attrs, summary: "토글 제목", level: Number(command.slice(6)) || 0 },
      studioParagraph(),
    );
  else if (command === "callout" || command === "note")
    node = schema.nodes[
      command === "callout" ? "studioCallout" : "studioNote"
    ].create(
      attrs,
      studioParagraph(
        command === "note"
          ? "AI 서비스 미연결 · 이곳에 직접 노트를 작성하세요."
          : "",
      ),
    );
  else if (command === "quote")
    node = schema.nodes.blockquote.create(attrs, studioParagraph());
  else if (command === "fence") node = schema.nodes.codeBlock.create(attrs);
  else if (command === "rule") node = schema.nodes.horizontalRule.create(attrs);
  else if (command === "image")
    node = schema.nodes.image.create({
      ...attrs,
      src: state.value.trim(),
      alt: "이미지",
    });
  else if (command === "link")
    node = schema.nodes.paragraph.create(
      attrs,
      schema.text(state.value.trim(), [
        schema.marks.link.create({ href: state.value.trim() }),
      ]),
    );
  else if (command === "embed")
    node = schema.nodes.studioEmbed.create({
      ...attrs,
      html: DOMPurify.sanitize(state.value, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: [
          "style",
          "iframe",
          "form",
          "input",
          "button",
          "textarea",
          "select",
        ],
        FORBID_ATTR: [
          "style",
          "id",
          "name",
          "contenteditable",
          "autofocus",
          "tabindex",
        ],
      }),
    });
  else if (command === "page") {
    if (APP.documents.length >= 500)
      return toast("문서는 최대 500개입니다.", true);
    const d = newRecord(state.value, "");
    APP.documents.push(d);
    node = schema.nodes.paragraph.create(
      attrs,
      schema.text(state.value, [
        schema.marks.link.create({ href: "#doc-" + d.id }),
      ]),
    );
  } else if (command === "table") {
    const row = (header) =>
      schema.nodes.tableRow.create(
        null,
        [0, 1].map(() =>
          schema.nodes[header ? "tableHeader" : "tableCell"].create(
            null,
            studioParagraph(),
          ),
        ),
      );
    node = schema.nodes.table.create(attrs, [
      row(true),
      row(false),
      row(false),
    ]);
  }
  if (!node) return;
  const replace =
    state.mode === "slash" &&
    target.node.type.name === "paragraph" &&
    !target.node.textContent;
  const pos = replace ? target.pos : target.pos + target.node.nodeSize;
  const tr = replace
    ? RICH.editor.state.tr.replaceWith(pos, pos + target.node.nodeSize, node)
    : RICH.editor.state.tr.insert(pos, node);
  tr.setSelection(
    BlockEngine.TextSelection.near(
      tr.doc.resolve(Math.min(pos + 1, tr.doc.content.size)),
    ),
  );
  RICH.editor.view.dispatch(tr);
  RICH.editor.commands.focus();
  historyBoundary();
  updateBlockControls();
}
function openBlockMenu(id, x, y) {
  const b = activateBlock(id);
  if (!b || !RICH.editor.isEditable) return;
  closeBlockMenus();
  activateBlock(id);
  BLOCK_UI.menu = "actions";
  blockMenu.replaceChildren();
  const search = menuSearch(blockMenu, "작업을 검색하세요", (q) =>
    blockMenu
      .querySelectorAll("[data-action-label]")
      .forEach((n) => (n.hidden = !n.dataset.actionLabel.includes(q))),
  );
  menuHeading(
    blockMenu,
    SLASH.find(
      (i) =>
        ({
          paragraph: "paragraph",
          heading: "heading" + b.node.attrs.level,
          bulletList: "bullet",
          orderedList: "number",
          taskList: "task",
          studioToggle: "toggle",
          studioCallout: "callout",
          studioNote: "note",
          blockquote: "quote",
          codeBlock: "fence",
          table: "table",
          horizontalRule: "rule",
          image: "image",
          studioEmbed: "embed",
        })[b.node.type.name] === i[0],
    )?.[1] || "블록",
  );
  const actions = [
    ["전환", "⇄", "›", () => showConvertMenu()],
    ["색", "⚑", "›", () => showColorMenu()],
    ["목록 형식", "☷", "›", () => showListMenu()],
    ["블록 링크 복사", "↗", "Alt+Shift+L", () => copyBlockLink()],
    [
      "복제",
      "▢",
      "Ctrl+D",
      () => {
        const id = BLOCK_UI.id;
        closeBlockMenus();
        mutateRichBlocks("duplicate", id);
      },
    ],
    ["옮기기", "↪", "Ctrl+Shift+P", () => showMoveMenu()],
    [
      "삭제",
      "×",
      "Del",
      () => {
        const id = BLOCK_UI.id;
        closeBlockMenus();
        mutateRichBlocks("delete", id);
      },
    ],
    ["댓글", "▣", "Ctrl+Shift+M", () => openAnnotations("comment")],
    [
      "편집 내용 제안",
      "✎",
      "Ctrl+Shift+Alt+X",
      () => openAnnotations("suggestion"),
    ],
    ["여기에서 발표", "▷", "Ctrl+Alt+P", () => startBlockPresentation()],
    ["AI에게 질문하기", "✧", "Ctrl+J", () => openStudioAI()],
    ["스킬", "▧", "›", () => showSkillsMenu()],
  ];
  for (const [label, icon, hint, fn] of actions) {
    if (
      ["블록 링크 복사", "댓글", "여기에서 발표", "AI에게 질문하기"].includes(
        label,
      )
    )
      blockMenu.append(el("hr"));
    const button = menuButton(
      label,
      () => {
        if (blockUIValid()) fn();
        else closeBlockMenus();
      },
      icon,
      hint,
    );
    button.dataset.actionLabel = label;
    blockMenu.append(button);
  }
  const foot = el("div", "studio-menu-meta");
  foot.append(
    el("span", "", "최종 편집 일시"),
    el(
      "span",
      "",
      new Date(
        b.node.attrs.studioEdited || currentDoc().updatedAt,
      ).toLocaleString("ko-KR"),
    ),
    el(
      "span",
      "",
      b.node.textContent.trim().split(/\s+/u).filter(Boolean).length +
        "개의 단어, " +
        b.node.textContent.length +
        "자",
    ),
  );
  blockMenu.append(foot);
  placeStudioMenu(blockMenu, x, y);
  blockMenu.hidden = false;
  search.focus();
}
function submenu(title) {
  const id = BLOCK_UI.id;
  blockMenu.replaceChildren(
    menuButton(
      "뒤로",
      () =>
        openBlockMenu(
          id,
          parseFloat(blockMenu.style.left),
          parseFloat(blockMenu.style.top),
        ),
      "‹",
    ),
  );
  menuHeading(blockMenu, title);
  return blockMenu;
}
function showConvertMenu() {
  const menu = submenu("전환");
  for (const [cmd, label, icon] of SLASH.filter(
    (i) =>
      !["note", "embed", "image", "page", "table", "rule", "link"].includes(
        i[0],
      ),
  ))
    menu.append(menuButton(label, () => convertStudioBlock(cmd), icon));
}
function showColorMenu() {
  const labels = [
      "기본",
      "회색",
      "갈색",
      "주황색",
      "노란색",
      "초록색",
      "파란색",
      "보라색",
      "분홍색",
      "빨간색",
    ],
    menu = submenu("색");
  for (const [attr, title] of [
    ["studioColor", "텍스트 색"],
    ["studioBackground", "배경색"],
  ]) {
    menuHeading(menu, title);
    STUDIO_COLORS.forEach((c, i) => {
      const button = menuButton(
        labels[i] + (attr === "studioBackground" ? " 배경" : " 텍스트"),
        () => {
          studioPatch({ [attr]: c === "default" ? null : c });
          closeBlockMenus(true);
        },
        "A",
      );
      const swatch = button.querySelector(".studio-menu-icon");
      swatch.classList.add("studio-color-swatch");
      if (attr === "studioBackground") {
        swatch.textContent = "";
        swatch.dataset.studioBackground = c;
      } else swatch.dataset.studioColor = c;
      menu.append(button);
    });
  }
}
function showListMenu() {
  const menu = submenu("목록 형식");
  for (const [cmd, label] of [
    ["bullet", "글머리 기호 목록"],
    ["number", "번호 매기기 목록"],
    ["task", "할 일 목록"],
  ])
    menu.append(menuButton(label, () => convertStudioBlock(cmd)));
  for (const [value, label] of [
    ["disc", "● 원"],
    ["circle", "○ 빈 원"],
    ["square", "■ 사각형"],
    ["decimal", "1. 숫자"],
    ["lower-alpha", "a. 알파벳"],
    ["upper-roman", "I. 로마 숫자"],
  ])
    menu.append(
      menuButton(label, () => {
        const b = currentStudioBlock();
        if (!["bulletList", "orderedList"].includes(b.node.type.name))
          convertStudioBlock(
            ["decimal", "lower-alpha", "upper-roman"].includes(value)
              ? "number"
              : "bullet",
          );
        studioPatch({ studioList: value });
        closeBlockMenus(true);
      }),
    );
}
async function copyBlockLink() {
  const b = currentStudioBlock();
  if (!b) return;
  if (!b.id.startsWith("link-")) {
    const id = "link-" + crypto.randomUUID();
    studioPatch({ blockId: id }, b.id);
    BLOCK_UI.id = id;
  }
  const url = new URL("../../", location.href);
  url.searchParams.set("studioDoc", APP.activeId);
  url.searchParams.set("studioBlock", BLOCK_UI.id);
  url.hash = "markdown";
  try {
    await navigator.clipboard.writeText(url.href);
    toast("블록 링크를 복사했습니다. 같은 계정·작업공간에서 열 수 있습니다.");
  } catch {
    openStudioDialog("블록 링크", (dialog) => {
      const input = el("textarea");
      input.value = url.href;
      input.readOnly = true;
      dialog.append(input);
      input.select();
    });
  }
  closeBlockMenus();
}
function restoreBlockLink() {
  if (!location.hash.startsWith("#block=")) return;
  const params = new URLSearchParams(location.hash.slice(1)),
    doc = params.get("block"),
    id = params.get("id");
  if (APP.loading || !APP.documents.some((d) => d.id === doc)) return;
  if (APP.activeId !== doc) {
    selectDocument(doc);
    return;
  }
  const b = currentStudioBlock(id);
  if (b)
    requestAnimationFrame(() => {
      const dom = RICH.editor.view.nodeDOM(b.pos);
      dom?.scrollIntoView({ block: "center" });
      dom?.classList.add("studio-linked-block");
      setTimeout(() => dom?.classList.remove("studio-linked-block"), 2000);
    });
}
addEventListener("hashchange", restoreBlockLink);
addEventListener("DOMContentLoaded", () => setTimeout(restoreBlockLink, 100));
function showMoveMenu() {
  const menu = submenu("옮기기"),
    id = BLOCK_UI.id;
  menu.append(
    menuButton("문서 맨 위로", () => {
      closeBlockMenus();
      mutateRichBlocks("move", id, 0);
    }),
  );
  menu.append(
    menuButton("문서 맨 아래로", () => {
      const index = richTopBlocks().length - 1;
      closeBlockMenus();
      mutateRichBlocks("move", id, index);
    }),
  );
  menuHeading(menu, "다른 페이지로 이동");
  const rows = el("div");
  menuSearch(menu, "페이지 검색", (q) =>
    rows
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.hidden = !b.textContent.toLowerCase().includes(q.toLowerCase())),
      ),
  );
  for (const doc of APP.documents.filter((d) => d.id !== APP.activeId))
    rows.append(
      menuButton(
        doc.title,
        () => {
          const b = currentStudioBlock(id);
          if (!b) return;
          const text = serializeRichNode(b.node),
            combined = doc.content + (doc.content ? "\n\n" : "") + text;
          if (new TextEncoder().encode(combined).length > EditorCore.MAX_DOC)
            return toast("대상 문서가 5MB 제한을 초과합니다.", true);
          const before = { content: doc.content, updatedAt: doc.updatedAt };
          const record = historyRecord(),
            previousIndex = record.index;
          doc.content = combined;
          doc.updatedAt = new Date().toISOString();
          closeBlockMenus();
          mutateRichBlocks("delete", id);
          const updated = historyRecord();
          if (updated.index > previousIndex)
            updated.entries[updated.index].relatedDocuments = [
              {
                id: doc.id,
                before,
                after: { content: doc.content, updatedAt: doc.updatedAt },
              },
            ];
          toast("“" + doc.title + "” 페이지로 옮겼습니다.");
        },
        "▤",
      ),
    );
  if (!rows.childNodes.length)
    rows.append(el("p", "studio-empty", "먼저 다른 페이지를 만드세요."));
  menu.append(rows);
}
const studioDialog = el("dialog", "studio-dialog");
document.body.append(studioDialog);
function openStudioDialog(title, build) {
  studioDialog.replaceChildren();
  const header = el("div", "studio-dialog-header");
  header.append(
    el("h2", "", title),
    menuButton("닫기", () => studioDialog.close(), "×"),
  );
  studioDialog.append(header);
  build(studioDialog);
  if (!studioDialog.open) studioDialog.showModal();
}
function studioNotes(b) {
  try {
    const notes = JSON.parse(b.node.attrs.studioNotes || "[]");
    return Array.isArray(notes) ? notes : [];
  } catch {
    return [];
  }
}
function openAnnotations(kind) {
  if (!blockUIValid()) return;
  const id = BLOCK_UI.id,
    documentId = APP.activeId;
  closeBlockMenus();
  openStudioDialog(
    kind === "comment" ? "블록 댓글" : "편집 내용 제안",
    (dialog) => {
      const b = currentStudioBlock(id),
        quote = el(
          "blockquote",
          "studio-dialog-quote",
          b.node.textContent || "빈 블록",
        );
      dialog.append(quote);
      const list = el("div", "studio-annotations");
      const draw = () => {
        const current = currentStudioBlock(id);
        if (!current) return;
        list.replaceChildren();
        studioNotes(current).forEach((note) => {
          const row = el("article", "studio-annotation");
          row.append(
            el(
              "small",
              "",
              (note.kind === "suggestion" ? "편집 제안" : "댓글") +
                " · " +
                new Date(note.date).toLocaleString("ko-KR"),
            ),
            el("p", "", note.text),
          );
          if (note.kind === "suggestion") {
            row.append(
              menuButton(
                note.status === "accepted"
                  ? "수락됨"
                  : note.status === "rejected"
                    ? "거절됨"
                    : "수락",
                () => {
                  if (note.status || documentId !== APP.activeId) return;
                  const target = currentStudioBlock(id);
                  if (target.node.textContent !== note.original)
                    return toast(
                      "원문이 변경되었습니다. 새 제안을 작성하세요.",
                      true,
                    );
                  const attrs = {
                    ...target.node.attrs,
                    studioNotes: JSON.stringify(
                      studioNotes(target).map((n) =>
                        n.id === note.id ? { ...n, status: "accepted" } : n,
                      ),
                    ),
                    studioEdited: new Date().toISOString(),
                  };
                  studioReplace(target, [
                    RICH.editor.schema.nodes.paragraph.create(
                      attrs,
                      note.text ? RICH.editor.schema.text(note.text) : null,
                    ),
                  ]);
                  draw();
                },
              ),
            );
            if (!note.status)
              row.append(
                menuButton("거절", () => {
                  studioPatch(
                    {
                      studioNotes: JSON.stringify(
                        studioNotes(currentStudioBlock(id)).map((n) =>
                          n.id === note.id ? { ...n, status: "rejected" } : n,
                        ),
                      ),
                    },
                    id,
                  );
                  draw();
                }),
              );
          } else
            row.append(
              menuButton(note.resolved ? "다시 열기" : "해결", () => {
                studioPatch(
                  {
                    studioNotes: JSON.stringify(
                      studioNotes(currentStudioBlock(id)).map((n) =>
                        n.id === note.id ? { ...n, resolved: !n.resolved } : n,
                      ),
                    ),
                  },
                  id,
                );
                draw();
              }),
            );
          row.classList.toggle("resolved", Boolean(note.resolved));
          row.append(
            menuButton("삭제", () => {
              studioPatch(
                {
                  studioNotes: JSON.stringify(
                    studioNotes(currentStudioBlock(id)).filter(
                      (n) => n.id !== note.id,
                    ),
                  ),
                },
                id,
              );
              draw();
            }),
          );
          list.append(row);
        });
      };
      dialog.append(list);
      draw();
      const input = el("textarea");
      input.placeholder =
        kind === "comment"
          ? "댓글을 작성하세요."
          : "이 블록을 대체할 텍스트를 제안하세요. 수락 시 텍스트 블록으로 바뀝니다.";
      input.setAttribute(
        "aria-label",
        kind === "comment" ? "댓글 내용" : "제안 내용",
      );
      input.maxLength = 20000;
      dialog.append(
        input,
        menuButton(kind === "comment" ? "댓글 등록" : "제안 등록", () => {
          if (documentId !== APP.activeId || !currentStudioBlock(id))
            return studioDialog.close();
          if (!input.value.trim()) return input.focus();
          const target = currentStudioBlock(id),
            notes = studioNotes(target);
          notes.push({
            id: crypto.randomUUID(),
            kind,
            text: input.value.trim(),
            original: target.node.textContent,
            date: new Date().toISOString(),
          });
          studioPatch({ studioNotes: JSON.stringify(notes) }, id);
          input.value = "";
          draw();
        }),
      );
    },
  );
}
function openStudioAI() {
  const b = currentStudioBlock();
  if (!b) return;
  const context = b.node.textContent;
  closeBlockMenus();
  openStudioDialog("AI에게 질문하기", (dialog) => {
    dialog.append(
      el(
        "p",
        "studio-connection-note",
        "AI 서비스가 연결되지 않았습니다. 질문을 작성해 복사한 뒤 사용하는 AI 서비스에 붙여 넣을 수 있습니다.",
      ),
    );
    const question = el("textarea");
    question.placeholder = "이 블록에 대해 무엇이 궁금한가요?";
    question.setAttribute("aria-label", "AI에게 할 질문");
    dialog.append(
      question,
      menuButton("질문과 블록 내용 복사", async () => {
        try {
          await navigator.clipboard.writeText(
            question.value + "\n\n" + context,
          );
          toast("질문과 블록 내용을 복사했습니다.");
        } catch {
          question.value += "\n\n" + context;
          question.select();
          toast("텍스트를 선택했습니다. 복사 단축키를 사용하세요.");
        }
      }),
    );
  });
}
function showSkillsMenu() {
  const menu = submenu("스킬");
  for (const [label, fn] of [
    [
      "단어·글자 수 보기",
      () => {
        const text = currentStudioBlock().node.textContent;
        toast(
          text.trim().split(/\s+/).filter(Boolean).length +
            "개의 단어, " +
            text.length +
            "자",
        );
        closeBlockMenus(true);
      },
    ],
    [
      "블록 텍스트 복사",
      async () => {
        try {
          await navigator.clipboard.writeText(
            currentStudioBlock().node.textContent,
          );
          closeBlockMenus(true);
          toast("블록 텍스트를 복사했습니다.");
        } catch {
          toast("복사 권한을 확인하세요.", true);
        }
      },
    ],
    ["체크리스트로 정리", () => convertStudioBlock("task")],
    ["인용으로 정리", () => convertStudioBlock("quote")],
  ])
    menu.append(menuButton(label, fn));
  menu.append(
    el(
      "p",
      "studio-empty",
      "로컬 편집 도구입니다. AI 자동 실행에는 서비스 연결이 필요합니다.",
    ),
  );
}
const presentation = el("dialog", "studio-presentation");
document.body.append(presentation);
function startBlockPresentation() {
  const blocks = richTopBlocks(),
    start = blocks.findIndex((b) => b.id === BLOCK_UI.id);
  if (start < 0) return;
  let index = start;
  closeBlockMenus();
  const draw = () => {
    presentation.replaceChildren();
    const toolbar = el("div", "studio-presentation-tools"),
      content = el("article", "markdown-body studio-slide");
    toolbar.append(
      menuButton(
        "이전",
        () => {
          index = Math.max(0, index - 1);
          draw();
        },
        "←",
      ),
      el("span", "", index + 1 + " / " + blocks.length),
      menuButton(
        "다음",
        () => {
          index = Math.min(blocks.length - 1, index + 1);
          draw();
        },
        "→",
      ),
      menuButton("발표 종료", () => presentation.close(), "×"),
    );
    const dom = BlockEngine.DOMSerializer.fromSchema(
      RICH.editor.schema,
    ).serializeNode(blocks[index].node);
    content.append(dom);
    presentation.append(toolbar, content);
  };
  presentation.onkeydown = (e) => {
    if (["ArrowRight", "ArrowDown", " "].includes(e.key)) {
      e.preventDefault();
      index = Math.min(blocks.length - 1, index + 1);
      draw();
    } else if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      index = Math.max(0, index - 1);
      draw();
    }
  };
  draw();
  presentation.showModal();
}
addBlock.onmousedown = (e) => e.preventDefault();
addBlock.onclick = () => {
  const b = currentStudioBlock(RICH.activeBlock),
    r = addBlock.getBoundingClientRect();
  openInsertMenu(b, r.left, r.bottom + 5);
};
dragBlock.oncontextmenu = (e) => {
  e.preventDefault();
  openBlockMenu(RICH.activeBlock, e.clientX, e.clientY);
};
dragBlock.onpointerdown = (event) => {
  if (event.button !== 0 || !RICH.editor?.isEditable) return;
  event.preventDefault();
  closeBlockMenus();
  const id = RICH.activeBlock,
    documentId = APP.activeId,
    start = { x: event.clientX, y: event.clientY };
  let moving = false,
    target = null,
    line = null;
  dragBlock.setPointerCapture(event.pointerId);
  const cleanup = () => {
    line?.remove();
    BLOCK_UI.dragging = false;
    document.body.classList.remove("studio-dragging");
    dragBlock.onpointermove =
      dragBlock.onpointerup =
      dragBlock.onpointercancel =
        null;
  };
  dragBlock.onpointermove = (e) => {
    moving = moving || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5;
    if (!moving) return;
    BLOCK_UI.dragging = true;
    document.body.classList.add("studio-dragging");
    const bounds = $("#preview").getBoundingClientRect();
    if (e.clientY < bounds.top + 35) $("#preview").scrollTop -= 16;
    if (e.clientY > bounds.bottom - 35) $("#preview").scrollTop += 16;
    const blocks = richTopBlocks(),
      found = blocks
        .map((b) => ({
          b,
          r: RICH.editor.view.nodeDOM(b.pos)?.getBoundingClientRect(),
        }))
        .filter((o) => o.r);
    const hit = found.find((o) => e.clientY < o.r.bottom) || found.at(-1);
    if (!hit) return;
    target = { id: hit.b.id, after: e.clientY > hit.r.top + hit.r.height / 2 };
    if (!line) {
      line = el("div", "studio-drop-line");
      document.body.append(line);
    }
    line.style.left = Math.max(bounds.left + 10, hit.r.left) + "px";
    line.style.width = Math.min(hit.r.width, bounds.width - 20) + "px";
    line.style.top = (target.after ? hit.r.bottom : hit.r.top) + "px";
  };
  dragBlock.onpointerup = (e) => {
    if (dragBlock.hasPointerCapture(e.pointerId))
      dragBlock.releasePointerCapture(e.pointerId);
    const chosen = target;
    cleanup();
    if (APP.activeId !== documentId) return;
    if (!moving) {
      openBlockMenu(id, e.clientX, e.clientY);
      return;
    }
    if (!chosen || chosen.id === id) return;
    const blocks = richTopBlocks(),
      source = blocks.findIndex((b) => b.id === id),
      dest = blocks.findIndex((b) => b.id === chosen.id);
    let next = dest + (chosen.after ? 1 : 0);
    if (source < next) next--;
    mutateRichBlocks("move", id, next);
  };
  dragBlock.onpointercancel = cleanup;
};
$("#preview").addEventListener("mousemove", (e) => {
  if (BLOCK_UI.dragging || BLOCK_UI.menu) return;
  const hit = RICH.editor?.view.posAtCoords({
    left: e.clientX,
    top: e.clientY,
  });
  if (hit)
    updateBlockControls(
      richTopBlocks().find(
        (b) => hit.pos >= b.pos && hit.pos < b.pos + b.node.nodeSize,
      ),
    );
});
$("#preview").addEventListener("contextmenu", (e) => {
  if (!RICH.editor?.isEditable || APP.view === "edit") return;
  const hit = RICH.editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
  const b = richTopBlocks().find(
    (b) => hit && hit.pos >= b.pos && hit.pos < b.pos + b.node.nodeSize,
  );
  if (!b) return;
  e.preventDefault();
  RICH.editor.commands.setTextSelection(
    Math.min(hit.pos, RICH.editor.state.doc.content.size - 1),
  );
  openInsertMenu(b, e.clientX, e.clientY);
});
$("#preview").addEventListener("scroll", () => {
  if (!BLOCK_UI.dragging) closeBlockMenus();
  requestAnimationFrame(() => {
    updateBlockControls();
    updateSelectionBubble();
  });
});
document.addEventListener("pointerdown", (e) => {
  if (
    !blockMenu.contains(e.target) &&
    !slashMenu.contains(e.target) &&
    !blockControls.contains(e.target)
  )
    closeBlockMenus();
});
addEventListener("resize", () => {
  closeBlockMenus();
  updateBlockControls();
});
function handleRichKey(event) {
  if (event.isComposing) return false;
  if (slashState && !slashMenu.hidden) {
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      if (!slashState.items.length) return true;
      slashState.index =
        (slashState.index +
          (event.key === "ArrowDown" ? 1 : -1) +
          slashState.items.length) %
        slashState.items.length;
      renderInsertItems();
      slashMenu
        .querySelector(".selected")
        ?.scrollIntoView({ block: "nearest" });
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (slashState.items.length)
        runSlash(slashState.items[slashState.index][0]);
      return true;
    }
  }
  return false;
}
document.addEventListener(
  "keydown",
  (event) => {
    if (event.isComposing) return;
    const inMenu =
      blockMenu.contains(document.activeElement) ||
      slashMenu.contains(document.activeElement);
    if (event.key === "Escape" && (!blockMenu.hidden || !slashMenu.hidden)) {
      event.preventDefault();
      if (slashState?.mode === "slash") {
        const s = RICH.editor.state.selection;
        BLOCK_UI.slashSuppressed =
          APP.activeId +
          ":" +
          slashState.from +
          ":" +
          s.$from.parent.textBetween(0, s.$from.parentOffset, "", "");
      }
      closeBlockMenus(true);
      return;
    }
    if (inMenu && slashState && handleRichKey(event)) return;
    if (inMenu && !slashState && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      const buttons = [...blockMenu.querySelectorAll("button")].filter(
          (b) => !b.hidden,
        ),
        index = buttons.indexOf(document.activeElement);
      buttons[
        (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
          buttons.length
      ]?.focus();
      return;
    }
    if (
      !RICH.editor?.isEditable ||
      (!previewHasFocus() && !inMenu) ||
      studioDialog.open ||
      presentation.open
    )
      return;
    const mod = event.ctrlKey || event.metaKey,
      key = event.key.toLowerCase(),
      b = activeRichBlock();
    if (!b) return;
    let action = null;
    if (mod && key === "/" && !event.shiftKey)
      action = () => {
        const r = RICH.editor.view.nodeDOM(b.pos).getBoundingClientRect();
        openBlockMenu(b.id, r.left, r.top);
      };
    else if (mod && key === "d" && !event.shiftKey && !event.altKey)
      action = () => mutateRichBlocks("duplicate", inMenu ? BLOCK_UI.id : b.id);
    else if (mod && event.shiftKey && key === "p" && !event.altKey)
      action = showMoveMenu;
    else if (mod && event.shiftKey && key === "m")
      action = () => openAnnotations("comment");
    else if (mod && event.shiftKey && event.altKey && key === "x")
      action = () => openAnnotations("suggestion");
    else if (mod && event.altKey && key === "p")
      action = startBlockPresentation;
    else if (mod && key === "j" && !event.shiftKey && !event.altKey)
      action = openStudioAI;
    else if (event.altKey && event.shiftKey && key === "l")
      action = copyBlockLink;
    else if (inMenu && event.key === "Delete")
      action = () => {
        const id = BLOCK_UI.id;
        closeBlockMenus();
        mutateRichBlocks("delete", id);
      };
    if (action) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!inMenu) activateBlock(b.id);
      action();
    }
  },
  true,
);

// A click below the final block starts a paragraph outside containers/code.
$("#preview").addEventListener(
  "pointerdown",
  (event) => {
    if (
      event.button !== 0 ||
      !RICH.editor?.isEditable ||
      APP.view === "edit" ||
      BLOCK_UI.dragging
    )
      return;
    const root = engineRoot();
    if (event.target !== $("#preview") && event.target !== root) return;
    const last = richTopBlocks().at(-1);
    if (!last) return;
    const dom = RICH.editor.view.nodeDOM(last.pos),
      rect = dom?.getBoundingClientRect();
    if (!rect || event.clientY <= rect.bottom + 4) return;
    event.preventDefault();
    event.stopPropagation();
    closeBlockMenus();
    if (last.node.type.name === "paragraph" && !last.node.content.size) {
      RICH.editor
        .chain()
        .setTextSelection(last.pos + 1)
        .focus()
        .run();
    } else {
      historyBoundary();
      HISTORY.area = "preview";
      const end = RICH.editor.state.doc.content.size;
      RICH.editor
        .chain()
        .insertContentAt(end, {
          type: "paragraph",
          attrs: { blockId: crypto.randomUUID() },
        })
        .setTextSelection(end + 1)
        .focus()
        .run();
      historyBoundary();
    }
    updateBlockControls();
  },
  true,
);
