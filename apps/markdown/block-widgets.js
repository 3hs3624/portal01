/* Local database views, media and advanced blocks. Data travels with the document. */
"use strict";
const EXTRA_BLOCKS = [
  ["pageLink", "페이지 링크", "↗", "기본 블록"],
  ["video", "동영상", "▷", "미디어"],
  ["audio", "오디오", "♫", "미디어"],
  ["file", "파일", "♧", "미디어"],
  ["bookmark", "웹 북마크", "▣", "미디어"],
  ...[
    ["table", "표"],
    ["board", "보드"],
    ["gallery", "갤러리"],
    ["list", "리스트"],
    ["feed", "피드"],
    ["dashboard", "대시보드"],
    ["calendar", "캘린더"],
    ["timeline", "타임라인"],
    ["map", "지도"],
  ].map(([id, n]) => ["db-" + id, n + " 보기", "▦", "데이터베이스"]),
  ...[
    ["bar", "세로 막대"],
    ["horizontal", "가로 막대"],
    ["line", "꺾은선"],
    ["donut", "도넛"],
    ["number", "숫자"],
  ].map(([id, n]) => ["chart-" + id, n + " 차트", "▥", "데이터베이스"]),
  ["db-form", "폼", "☷", "데이터베이스"],
  ["db-inline", "데이터베이스 - 인라인", "▦", "데이터베이스"],
  ["db-page", "데이터베이스 - 전체 페이지", "▤", "데이터베이스"],
  ["db-source", "데이터 소스 보기 연결", "↗", "데이터베이스"],
  ["toc", "목차", "☷", "고급 블록"],
  ["equation", "수학 공식 블록", "∑", "고급 블록"],
  ["button", "버튼", "➜", "고급 블록"],
  ["breadcrumb", "이동 경로", "⌂", "고급 블록"],
  ["tabs", "탭", "▣", "고급 블록"],
  ["sync", "동기화 블록", "⇄", "고급 블록"],
  ["toggle2", "토글 제목2", "▸H₂", "고급 블록"],
  ...[2, 3, 4, 5].map((n) => ["columns" + n, n + "개의 열", "▥", "고급 블록"]),
  ["mermaid", "코드 - Mermaid", "⑂", "추천"],
  ["ai", "AI 블록", "✧", "고급 블록"],
  ["mention", "사용자 멘션하기", "@", "인라인"],
  ["pageMention", "페이지나 데이터 소스 멘션", "▤", "인라인"],
  ["date", "날짜 또는 리마인더", "◷", "인라인"],
  ["emoji", "이모지", "☺", "인라인"],
  ["inlineEquation", "인라인 수학 공식", "√", "인라인"],
  ["urlEmbed", "임베드", "↗", "임베드"],
  ["html", "HTML", "‹/›", "임베드"],
  ...[
    "Google Drive",
    "GitHub Gist",
    "Google Maps",
    "Figma",
    "Abstract",
    "Invision",
    "Mixpanel",
    "Framer",
    "Whimsical",
    "Miro",
    "Sketch",
  ].map((n) => ["service-" + n, n, "↗", "임베드"]),
];
const STUDIO_COLOR_LABELS = [
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
];
EXTRA_BLOCKS.push(
  ...[
    ["copy", "블록 링크 복사", "↗"],
    ["duplicate", "복제", "▢"],
    ["move", "옮기기", "↪"],
    ["delete", "삭제", "×"],
    ["present", "여기에서 발표", "▷"],
    ["ai", "AI에게 질문하기", "✧"],
  ].map(([id, label, icon]) => ["action-" + id, label, icon, "작업"]),
);
for (const [attr, title] of [
  ["studioColor", "텍스트 색상"],
  ["studioBackground", "배경 색상"],
])
  STUDIO_COLORS.forEach((color, i) =>
    EXTRA_BLOCKS.push([
      "color-" + attr + "-" + color,
      STUDIO_COLOR_LABELS[i] + (attr === "studioColor" ? " 텍스트" : " 배경"),
      attr === "studioColor" ? "A" : "□",
      title,
    ]),
  );
const STUDIO_EXTRA = new Set([...EXTRA_BLOCKS.map((i) => i[0]), "image"]);
SLASH.push(...EXTRA_BLOCKS.map((i) => [...i, ""]));
const STUDIO_GROUP_ORDER = [
  "추천",
  "기본 블록",
  "미디어",
  "데이터베이스",
  "고급 블록",
  "인라인",
  "임베드",
  "작업",
  "텍스트 색상",
  "배경 색상",
];
SLASH.sort(
  (a, b) =>
    STUDIO_GROUP_ORDER.indexOf(a[3]) - STUDIO_GROUP_ORDER.indexOf(b[3]) ||
    (a[3] === "추천"
      ? ["note", "embed", "mermaid", "toggle3"].indexOf(a[0]) -
        ["note", "embed", "mermaid", "toggle3"].indexOf(b[0])
      : 0),
);
const DB_VIEWS = {
  table: "표",
  board: "보드",
  gallery: "갤러리",
  list: "리스트",
  feed: "피드",
  dashboard: "대시보드",
  calendar: "캘린더",
  timeline: "타임라인",
  map: "지도",
  form: "폼",
  bar: "세로 막대 차트",
  horizontal: "가로 막대 차트",
  line: "꺾은선 차트",
  donut: "도넛 차트",
  number: "숫자 차트",
};
function studioWidgetExtensions() {
  return [
    studioInlineEquationExtension(),
    BlockEngine.Node.create({
      name: "studioWidget",
      group: "block",
      atom: true,
      selectable: true,
      addAttributes() {
        return {
          kind: {
            default: "database",
            renderHTML: () => ({}),
            parseHTML: (n) => n.getAttribute("data-studio-widget"),
          },
          data: {
            default: "{}",
            renderHTML: () => ({}),
            parseHTML: (n) =>
              studioDecodeAttribute(n.getAttribute("data-studio-data")) || "{}",
          },
        };
      },
      parseHTML() {
        return [{ tag: "section[data-studio-widget]" }];
      },
      renderHTML({ node, HTMLAttributes }) {
        const dom = el("section", "studio-widget");
        for (const [k, v] of Object.entries(HTMLAttributes))
          if (v !== null) dom.setAttribute(k, v);
        dom.dataset.studioWidget = node.attrs.kind;
        dom.dataset.studioData = encodeURIComponent(node.attrs.data);
        dom.append(el("p", "", widgetSummary(node)));
        return dom;
      },
      addNodeView() {
        return ({ node, getPos, editor }) => {
          const dom = el("section", "studio-widget");
          dom.contentEditable = "false";
          let current = node;
          const objectURLs = [];
          const render = () => {
            objectURLs.splice(0).forEach((url) => URL.revokeObjectURL(url));
            dom.replaceChildren();
            dom.dataset.studioWidget = current.attrs.kind;
            dom.dataset.blockId = current.attrs.blockId;
            dom.dataset.studioData = encodeURIComponent(current.attrs.data);
            for (const attr of [
              "studioColor",
              "studioBackground",
              "studioNotes",
            ]) {
              const key =
                "data-" + attr.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
              if (current.attrs[attr])
                dom.setAttribute(key, current.attrs[attr]);
              else dom.removeAttribute(key);
            }
            let data;
            try {
              data = JSON.parse(current.attrs.data);
            } catch {
              data = {};
            }
            const update = (next) => {
              if (!editor.isEditable) return;
              const pos = getPos();
              if (typeof pos !== "number") return;
              historyBoundary();
              HISTORY.area = "preview";
              editor.view.dispatch(
                editor.state.tr.setNodeMarkup(pos, undefined, {
                  ...current.attrs,
                  data: JSON.stringify(next),
                  studioEdited: new Date().toISOString(),
                }),
              );
              historyBoundary();
            };
            try {
              renderStudioWidget(
                dom,
                current.attrs.kind,
                data,
                update,
                editor.isEditable,
                objectURLs,
              );
            } catch (e) {
              dom.append(
                el(
                  "p",
                  "studio-widget-error",
                  "블록을 표시할 수 없습니다: " + e.message,
                ),
              );
            }
          };
          render();
          const refresh = () => {
            if (
              ["toc", "breadcrumb", "sync", "database-link"].includes(
                current.attrs.kind,
              )
            )
              render();
          };
          document.addEventListener("studio:document-changed", refresh);
          return {
            dom,
            update(next) {
              if (next.type !== current.type) return false;
              const changed =
                next.attrs.data !== current.attrs.data ||
                next.attrs.studioColor !== current.attrs.studioColor ||
                next.attrs.studioBackground !==
                  current.attrs.studioBackground ||
                next.attrs.studioNotes !== current.attrs.studioNotes;
              current = next;
              if (changed) render();
              return true;
            },
            stopEvent: (e) =>
              !["contextmenu", "pointermove", "mousemove"].includes(e.type),
            ignoreMutation: () => true,
            destroy() {
              document.removeEventListener("studio:document-changed", refresh);
              objectURLs.forEach((url) => URL.revokeObjectURL(url));
            },
          };
        };
      },
    }),
  ];
}
function widgetSummary(node) {
  let d;
  try {
    d = JSON.parse(node.attrs.data);
  } catch {
    d = {};
  }
  return (
    d.title ||
    {
      database: "데이터베이스",
      toc: "목차",
      sync: "동기화 블록",
      equation: "수학 공식",
      columns: "열",
      tabs: "탭",
      mermaid: "Mermaid",
      media: "미디어",
      button: "버튼",
      breadcrumb: "이동 경로",
    }[node.attrs.kind] ||
    "블록"
  );
}
function newStudioDatabase(view = "table") {
  return {
    title: "새 데이터베이스",
    view,
    fields: [
      { id: "title", name: "이름", type: "text" },
      { id: "status", name: "상태", type: "select" },
      { id: "date", name: "날짜", type: "date" },
      { id: "end", name: "종료일", type: "date" },
      { id: "value", name: "값", type: "number" },
      { id: "lat", name: "위도", type: "number" },
      { id: "lng", name: "경도", type: "number" },
    ],
    rows: [],
  };
}
function studioWidgetNode(kind, data) {
  return RICH.editor.schema.nodes.studioWidget.create({
    blockId: crypto.randomUUID(),
    kind,
    data: JSON.stringify(data),
    studioEdited: new Date().toISOString(),
  });
}
function insertExtraNode(state, node) {
  if (state.document !== APP.activeId || !RICH.editor.isEditable) return;
  closeBlockMenus();
  historyBoundary();
  HISTORY.area = "preview";
  if (state.mode === "slash")
    RICH.editor.commands.deleteRange({ from: state.from, to: state.to });
  const b = currentStudioBlock(state.id);
  if (!b) return;
  const replace =
      state.mode === "slash" &&
      b.node.type.name === "paragraph" &&
      !b.node.textContent,
    pos = replace ? b.pos : b.pos + b.node.nodeSize,
    tr = replace
      ? RICH.editor.state.tr.replaceWith(pos, pos + b.node.nodeSize, node)
      : RICH.editor.state.tr.insert(pos, node);
  tr.setSelection(
    BlockEngine.TextSelection.near(
      tr.doc.resolve(Math.min(pos + node.nodeSize, tr.doc.content.size)),
    ),
  );
  RICH.editor.view.dispatch(tr);
  RICH.editor.commands.focus();
  historyBoundary();
}
function insertExtraInline(state, text, href = null) {
  closeBlockMenus();
  historyBoundary();
  HISTORY.area = "preview";
  const chain = RICH.editor.chain().focus();
  if (state.mode === "slash")
    chain.deleteRange({ from: state.from, to: state.to });
  else {
    const b = currentStudioBlock(state.id);
    if (b?.node.isTextblock)
      chain.setTextSelection(b.pos + b.node.nodeSize - 1);
  }
  chain
    .insertContent({
      type: "text",
      text,
      marks: href ? [{ type: "link", attrs: { href } }] : [],
    })
    .run();
  historyBoundary();
}
function safeStudioURL(value) {
  try {
    const u = new URL(value);
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
      return null;
    return u.href;
  } catch {
    return null;
  }
}
function chooseStudioDocument(title, onchoose) {
  openStudioDialog(title, (dialog) => {
    const rows = el("div"),
      input = el("input");
    input.placeholder = "페이지 검색";
    input.setAttribute("aria-label", "페이지 검색");
    const draw = () => {
      rows.replaceChildren(
        ...APP.documents
          .filter((d) =>
            d.title.toLowerCase().includes(input.value.toLowerCase()),
          )
          .map((d) =>
            menuButton(
              d.title,
              () => {
                studioDialog.close();
                onchoose(d);
              },
              "▤",
            ),
          ),
      );
    };
    input.oninput = draw;
    dialog.append(input, rows);
    draw();
  });
}
function studioSourceOptions(kind) {
  const options = [];
  for (const doc of APP.documents) {
    let i = 0;
    for (const token of marked.lexer(doc.content, { gfm: true })) {
      if (token.type !== "html") continue;
      const template = richSanitize(token.raw);
      for (const dom of template.content.querySelectorAll(
        'section[data-studio-widget="database"]',
      )) {
        try {
          const data = JSON.parse(
            studioDecodeAttribute(dom.getAttribute("data-studio-data")),
          );
          options.push({
            docId: doc.id,
            id: dom.getAttribute("data-block-id"),
            title: doc.title + " / " + data.title,
            data,
          });
        } catch {}
      }
      i++;
    }
  }
  return options;
}
function chooseStudioSource(onchoose) {
  const options = studioSourceOptions();
  if (!options.length) {
    toast("먼저 데이터베이스를 만들고 저장하세요.", true);
    return;
  }
  openStudioDialog("데이터 소스 선택", (dialog) => {
    for (const option of options)
      dialog.append(
        menuButton(
          option.title,
          () => {
            studioDialog.close();
            onchoose(option);
          },
          "▦",
        ),
      );
  });
}
function insertStudioExtra(command, state) {
  if (command.startsWith("action-") || command.startsWith("color-")) {
    closeBlockMenus();
    historyBoundary();
    if (state.mode === "slash")
      RICH.editor.commands.deleteRange({ from: state.from, to: state.to });
    if (!activateBlock(state.id)) return;
    if (command.startsWith("color-")) {
      const [, attr, color] = command.split("-");
      studioPatch({ [attr]: color === "default" ? null : color });
      RICH.editor.commands.focus();
      return;
    }
    const action = command.slice(7);
    if (action === "copy") copyBlockLink();
    else if (action === "duplicate" || action === "delete")
      mutateRichBlocks(action, state.id);
    else if (action === "present") startBlockPresentation();
    else if (action === "ai") openStudioAI();
    else if (action === "move") {
      const rect = RICH.editor.view
        .nodeDOM(currentStudioBlock(state.id).pos)
        .getBoundingClientRect();
      openBlockMenu(state.id, rect.left, rect.top);
      showMoveMenu();
    }
    return;
  }

  if (command === "html") {
    runSlash("embed");
    return;
  }
  if (command === "toggle2") {
    const b = currentStudioBlock(state.id);
    if (state.mode === "slash")
      RICH.editor.commands.deleteRange({ from: state.from, to: state.to });
    insertExtraNode(
      { ...state, mode: "insert" },
      RICH.editor.schema.nodes.studioToggle.create(
        { blockId: crypto.randomUUID(), summary: "토글 제목", level: 2 },
        studioParagraph(),
      ),
    );
    return;
  }
  if (["pageLink", "pageMention"].includes(command)) {
    chooseStudioDocument("페이지 연결", (d) =>
      insertExtraInline(state, d.title, "#doc-" + d.id),
    );
    return;
  }
  if (command === "mention") {
    const name = prompt("멘션할 사용자 이름 (알림은 전송되지 않습니다)");
    if (name?.trim()) insertExtraInline(state, "@" + name.trim());
    return;
  }
  if (command === "emoji") {
    openStudioDialog("이모지", (dialog) => {
      const input = el("input");
      input.placeholder = "이모지를 입력하거나 아래에서 선택하세요";
      dialog.append(
        input,
        menuButton("삽입", () => {
          if (input.value.trim()) {
            studioDialog.close();
            insertExtraInline(state, input.value.trim());
          }
        }),
      );
      const list = el("div", "studio-emojis");
      for (const text of [
        "😀",
        "😊",
        "🎉",
        "💡",
        "✅",
        "📌",
        "📝",
        "🚀",
        "❤️",
        "⭐",
        "🔥",
        "👍",
        "📅",
        "📚",
        "🌱",
        "🔗",
        "🎯",
        "💬",
        "⚠️",
        "☕",
      ])
        list.append(
          menuButton(text, () => {
            studioDialog.close();
            insertExtraInline(state, text);
          }),
        );
      dialog.append(list);
    });
    return;
  }
  if (command === "date") {
    openStudioDialog("날짜 또는 리마인더", (dialog) => {
      const input = el("input");
      input.type = "datetime-local";
      input.setAttribute("aria-label", "날짜와 시간");
      const remind = el("input");
      remind.type = "checkbox";
      const label = el("label", "", "문서 내 리마인더 표시");
      label.prepend(remind);
      dialog.append(
        input,
        label,
        el(
          "p",
          "studio-empty",
          "리마인더는 문서에 표시됩니다. 백그라운드 알림·이메일은 전송되지 않습니다.",
        ),
        menuButton("삽입", () => {
          if (!input.value) return input.focus();
          const date = new Date(input.value);
          studioDialog.close();
          insertExtraInline(
            state,
            (remind.checked ? "⏰ " : "📅 ") + date.toLocaleString("ko-KR"),
          );
        }),
      );
    });
    return;
  }
  if (command === "inlineEquation") {
    const formula = prompt("인라인 수학 공식 (LaTeX)");
    if (formula?.trim()) {
      closeBlockMenus();
      historyBoundary();
      const chain = RICH.editor.chain().focus();
      if (state.mode === "slash")
        chain.deleteRange({ from: state.from, to: state.to });
      chain
        .insertContent({
          type: "studioInlineEquation",
          attrs: { formula: formula.trim() },
        })
        .run();
      historyBoundary();
    }
    return;
  }
  if (command.startsWith("db-") || command.startsWith("chart-")) {
    if (command === "db-source") {
      chooseStudioSource((source) =>
        insertExtraNode(
          state,
          studioWidgetNode("database-link", {
            title: source.title,
            docId: source.docId,
            id: source.id,
            view: "table",
          }),
        ),
      );
      return;
    }
    const view = command.startsWith("chart-")
        ? command.slice(6)
        : command === "db-inline" || command === "db-page"
          ? "table"
          : command.slice(3),
      data = newStudioDatabase(view);
    if (command === "db-page") {
      const title = prompt("데이터베이스 페이지 제목", "새 데이터베이스");
      if (!title?.trim()) return;
      if (APP.documents.length >= 500)
        return toast("문서는 최대 500개입니다.", true);
      data.title = title.trim().slice(0, 200);
      const node = studioWidgetNode("database", data),
        d = newRecord(data.title, studioSerialize(node));
      APP.documents.push(d);
      insertExtraInline(state, d.title, "#doc-" + d.id);
      return;
    }
    insertExtraNode(state, studioWidgetNode("database", data));
    return;
  }
  if (command.startsWith("columns")) {
    insertExtraNode(
      state,
      studioWidgetNode("columns", {
        columns: Array.from({ length: Number(command.slice(7)) }, () => ({
          title: "",
          content: "",
        })),
      }),
    );
    return;
  }
  if (command === "sync") {
    const blocks = richTopBlocks().filter(
      (b) => b.id !== state.id && b.node.type.name !== "studioWidget",
    );
    openStudioDialog("동기화할 블록 선택", (dialog) => {
      if (!blocks.length)
        dialog.append(el("p", "", "동기화할 텍스트 블록을 먼저 만드세요."));
      for (const b of blocks)
        dialog.append(
          menuButton(
            b.node.textContent.slice(0, 80) || "빈 블록",
            () => {
              studioDialog.close();
              const id = b.id.startsWith("link-")
                ? b.id
                : "link-" + crypto.randomUUID();
              if (id !== b.id) studioPatch({ blockId: id }, b.id);
              insertExtraNode(
                state,
                studioWidgetNode("sync", {
                  docId: APP.activeId,
                  id,
                  title: "동기화 블록",
                }),
              );
            },
            "⇄",
          ),
        );
    });
    return;
  }
  if (
    ["image", "video", "audio", "file", "bookmark", "urlEmbed"].includes(
      command,
    ) ||
    command.startsWith("service-")
  ) {
    openStudioMediaPicker(command, state);
    return;
  }
  const defaults = {
    toc: { title: "목차" },
    equation: { title: "수학 공식", formula: "E = mc^2" },
    button: { title: "버튼", action: "insert", text: "새 블록" },
    breadcrumb: { title: "이동 경로" },
    tabs: {
      tabs: [
        { title: "탭 1", content: "" },
        { title: "탭 2", content: "" },
      ],
      active: 0,
    },
    mermaid: {
      title: "Mermaid",
      source: "flowchart LR\n  A[시작] --> B[작업] --> C[완료]",
    },
    ai: { title: "AI 블록", prompt: "", answer: "" },
  };
  if (defaults[command])
    insertExtraNode(state, studioWidgetNode(command, defaults[command]));
}
function widgetButton(label, fn, disabled = false) {
  const button = menuButton(label, fn);
  button.disabled = disabled;
  button.classList.add("studio-widget-button");
  return button;
}
function renderStudioWidget(
  dom,
  kind,
  data,
  update,
  editable,
  objectURLs = [],
) {
  if (kind === "database") {
    renderStudioDatabase(dom, data, update, editable);
    return;
  }
  if (kind === "database-link") {
    const source = studioSourceOptions().find(
      (s) => s.id === data.id && s.docId === data.docId,
    );
    if (!source) {
      dom.append(
        el(
          "p",
          "studio-widget-error",
          "데이터 소스를 찾을 수 없습니다. 원본 페이지를 확인하세요.",
        ),
      );
      return;
    }
    dom.append(el("small", "studio-source-label", "↗ " + source.title));
    renderStudioDatabase(
      dom,
      { ...source.data, view: data.view || source.data.view },
      (next) => {
        const original = APP.documents.find((d) => d.id === data.docId);
        if (!original) return;
        if (next.view !== data.view) {
          update({ ...data, view: next.view });
          return;
        }
        updateStudioSource(source, next);
      },
      editable,
    );
    return;
  }
  if (kind === "media") {
    renderStudioMedia(dom, data, update, editable, objectURLs);
    return;
  }
  if (kind === "toc") {
    dom.append(el("strong", "", "목차"));
    RICH.editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading")
        dom.append(
          widgetButton(node.textContent || "제목 없음", () => {
            RICH.editor.view
              .nodeDOM(pos)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }),
        );
    });
    if (dom.childNodes.length === 1)
      dom.append(el("p", "studio-empty", "문서에 제목을 추가하면 표시됩니다."));
    return;
  }
  if (kind === "breadcrumb") {
    dom.append(
      el(
        "span",
        "studio-breadcrumb",
        "Write Studio / " +
          (typeof folderPath === "function"
            ? folderPath(currentDoc().folderId || "") + " / "
            : "") +
          currentDoc().title,
      ),
    );
    return;
  }
  if (kind === "sync") {
    let node;
    if (data.docId === APP.activeId)
      node = richTopBlocks().find((b) => b.id === data.id)?.node;
    else {
      const source = APP.documents.find((d) => d.id === data.docId);
      if (source) {
        const template = richSanitize(
            marked.parse(source.content, { gfm: true }),
          ),
          parsed = BlockEngine.DOMParser.fromSchema(RICH.editor.schema).parse(
            template.content,
          );
        parsed.forEach((n) => {
          if (n.attrs.blockId === data.id) node = n;
        });
      }
    }
    dom.append(el("small", "studio-source-label", "⇄ 원본과 동기화됨"));
    if (node && node.type.name !== "studioWidget")
      dom.append(
        BlockEngine.DOMSerializer.fromSchema(RICH.editor.schema).serializeNode(
          node,
        ),
      );
    else dom.append(el("p", "studio-empty", "원본 블록을 찾을 수 없습니다."));
    dom.append(
      widgetButton(
        "원본 편집",
        () => {
          if (data.docId !== APP.activeId) selectDocument(data.docId);
          const b = currentStudioBlock(data.id);
          if (b) {
            RICH.editor.commands.setTextSelection(b.pos + 1);
            RICH.editor.commands.focus();
            RICH.editor.view
              .nodeDOM(b.pos)
              ?.scrollIntoView({ block: "center" });
          }
        },
        !editable,
      ),
    );
    return;
  }
  if (kind === "columns" || kind === "tabs") {
    const key = kind === "columns" ? "columns" : "tabs",
      items = data[key] || [],
      active = Math.max(0, Math.min(data.active || 0, items.length - 1)),
      bar = el("div", "studio-widget-toolbar"),
      container = el(
        "div",
        kind === "columns" ? "studio-columns" : "studio-tabs-content",
      );
    if (kind === "columns")
      container.style.setProperty("--studio-columns", items.length);
    if (kind === "tabs") {
      items.forEach((tab, i) => {
        const btn = widgetButton(tab.title || "탭 " + (i + 1), () => {
          dom
            .querySelectorAll("[data-tab-index]")
            .forEach((n) => (n.hidden = Number(n.dataset.tabIndex) !== i));
          bar
            .querySelectorAll("button")
            .forEach((n, j) => n.classList.toggle("selected", j === i));
        });
        btn.classList.toggle("selected", i === active);
        bar.append(btn);
      });
      bar.append(
        widgetButton(
          "+",
          () =>
            update({
              ...data,
              tabs: [...items, { title: "새 탭", content: "" }],
            }),
          !editable,
        ),
      );
      dom.append(bar);
    }
    items.forEach((item, i) => {
      const section = el("section", "studio-column");
      section.dataset.tabIndex = i;
      if (kind === "tabs") section.hidden = i !== active;
      const title = el(
          "strong",
          "",
          item.title ||
            (kind === "columns" ? "열 " + (i + 1) : "탭 " + (i + 1)),
        ),
        content = el("div", "studio-widget-markdown");
      content.innerHTML = DOMPurify.sanitize(
        marked.parse(item.content || "내용을 추가하세요.", { gfm: true }),
      );
      section.append(
        title,
        content,
        widgetButton(
          "편집",
          () =>
            openStudioDialog(
              kind === "columns" ? "열 편집" : "탭 편집",
              (dialog) => {
                const name = el("input"),
                  text = el("textarea");
                name.value = item.title;
                name.placeholder = "제목";
                text.value = item.content;
                text.placeholder = "Markdown 내용";
                dialog.append(
                  name,
                  text,
                  widgetButton("저장", () => {
                    const next = structuredClone(items);
                    next[i] = { title: name.value, content: text.value };
                    update({ ...data, [key]: next });
                    studioDialog.close();
                  }),
                );
              },
            ),
          !editable,
        ),
      );
      if (items.length > 1)
        section.append(
          widgetButton(
            "삭제",
            () => update({ ...data, [key]: items.filter((_, j) => i !== j) }),
            !editable,
          ),
        );
      container.append(section);
    });
    dom.append(container);
    return;
  }
  if (kind === "equation") {
    const output = el("div", "studio-equation");
    output.textContent = data.formula || "";
    output.setAttribute("aria-label", "LaTeX 수학 공식");
    dom.append(output);
    renderStudioMath(output, data.formula, false);
    if (editable)
      dom.append(
        widgetButton("공식 편집", () => {
          const value = prompt("LaTeX 수학 공식", data.formula || "");
          if (value !== null) update({ ...data, formula: value });
        }),
      );
    return;
  }
  if (kind === "mermaid") {
    const output = el("div", "studio-mermaid");
    dom.append(output);
    renderStudioMermaid(output, data.source);
    dom.append(
      widgetButton(
        "코드 편집",
        () =>
          openStudioDialog("Mermaid 코드", (dialog) => {
            const input = el("textarea");
            input.value = data.source || "";
            dialog.append(
              input,
              widgetButton("저장", () => {
                update({ ...data, source: input.value });
                studioDialog.close();
              }),
            );
          }),
        !editable,
      ),
    );
    return;
  }
  if (kind === "button") {
    dom.append(
      widgetButton(
        data.title || "버튼",
        () => {
          if (data.action === "url") {
            const url = safeStudioURL(data.url);
            if (url) window.open(url, "_blank", "noopener,noreferrer");
          } else if (data.action === "page") {
            if (APP.documents.some((d) => d.id === data.docId))
              selectDocument(data.docId);
          } else if (editable) {
            const b = richTopBlocks().find(
                (b) => RICH.editor.view.nodeDOM(b.pos) === dom,
              ),
              text = data.text || "새 블록";
            if (b) {
              historyBoundary();
              RICH.editor.commands.insertContentAt(b.pos + b.node.nodeSize, {
                type: "paragraph",
                content: [{ type: "text", text }],
              });
              historyBoundary();
            }
          }
        },
        data.action === "insert" && !editable,
      ),
    );
    dom.append(
      widgetButton(
        "버튼 설정",
        () =>
          openStudioDialog("버튼 설정", (dialog) => {
            const title = el("input"),
              action = el("select"),
              value = el("input");
            title.value = data.title || "";
            title.placeholder = "버튼 이름";
            for (const [id, label] of [
              ["insert", "텍스트 블록 추가"],
              ["url", "URL 열기"],
              ["page", "페이지 열기"],
            ])
              action.append(new Option(label, id));
            action.value = data.action || "insert";
            value.value = data.text || data.url || data.docId || "";
            value.placeholder = "추가할 텍스트 / URL / 페이지 ID";
            dialog.append(
              title,
              action,
              value,
              widgetButton("저장", () => {
                if (action.value === "url" && !safeStudioURL(value.value))
                  return toast("올바른 URL을 입력하세요.", true);
                update({
                  title: title.value,
                  action: action.value,
                  text: value.value,
                  url: value.value,
                  docId: value.value,
                });
                studioDialog.close();
              }),
            );
          }),
        !editable,
      ),
    );
    return;
  }
  if (kind === "ai") {
    dom.append(
      el("strong", "", "✧ AI 블록"),
      el(
        "p",
        "studio-connection-note",
        "AI 서비스 미연결 · 질문과 답변을 직접 보관하고 복사할 수 있습니다.",
      ),
    );
    for (const [key, label] of [
      ["prompt", "질문"],
      ["answer", "답변 / 메모"],
    ]) {
      const input = el("textarea");
      input.placeholder = label;
      input.setAttribute("aria-label", label);
      input.value = data[key] || "";
      input.disabled = !editable;
      input.onchange = () => update({ ...data, [key]: input.value });
      dom.append(input);
    }
    dom.append(
      widgetButton("질문 복사", async () => {
        try {
          await navigator.clipboard.writeText(data.prompt || "");
          toast("질문을 복사했습니다.");
        } catch {
          toast("브라우저 복사 권한을 확인하세요.", true);
        }
      }),
    );
    return;
  }
}
function updateStudioSource(source, data) {
  const doc = APP.documents.find((d) => d.id === source.docId);
  if (!doc) return;
  if (doc.id === APP.activeId) {
    const b = currentStudioBlock(source.id);
    if (b) studioPatch({ data: JSON.stringify(data) }, source.id);
    return;
  }
  let found = false;
  const text = doc.content.replace(/<section\b[^>]*>/g, (tag) => {
    const template = document.createElement("template");
    template.innerHTML = tag + "</section>";
    const target = template.content.firstElementChild;
    if (found || target?.getAttribute("data-block-id") !== source.id)
      return tag;
    found = true;
    target.setAttribute(
      "data-studio-data",
      encodeURIComponent(JSON.stringify(data)),
    );
    return target.outerHTML.slice(0, target.outerHTML.indexOf(">") + 1);
  });
  if (!found) return;
  if (new TextEncoder().encode(text).length > EditorCore.MAX_DOC)
    return toast("문서 크기 제한을 초과합니다.", true);
  doc.content = text;
  doc.updatedAt = new Date().toISOString();
  changed(false);
  document.dispatchEvent(new Event("studio:document-changed"));
}
function databaseFieldInput(field, value) {
  const input = el(field.type === "select" ? "select" : "input");
  if (field.type === "select") {
    for (const text of ["시작 전", "진행 중", "완료"])
      input.append(new Option(text, text));
    if (value && !["시작 전", "진행 중", "완료"].includes(value))
      input.append(new Option(value, value));
  } else
    input.type =
      field.type === "number"
        ? "number"
        : field.type === "date"
          ? "date"
          : field.type === "checkbox"
            ? "checkbox"
            : "text";
  if (field.type === "checkbox") input.checked = Boolean(value);
  else input.value = value ?? "";
  input.setAttribute("aria-label", field.name);
  return input;
}
function editDatabaseRow(data, row, update) {
  openStudioDialog(row ? "항목 편집" : "새 항목", (dialog) => {
    const fields = [];
    for (const field of data.fields) {
      const label = el("label", "", field.name),
        input = databaseFieldInput(field, row?.[field.id]);
      if (field.type === "number") input.step = "any";
      label.append(input);
      dialog.append(label);
      fields.push([field, input]);
    }
    dialog.append(
      widgetButton("저장", () => {
        const item = { id: row?.id || crypto.randomUUID() };
        for (const [field, input] of fields)
          item[field.id] =
            field.type === "checkbox"
              ? input.checked
              : field.type === "number"
                ? input.value === ""
                  ? ""
                  : Number(input.value)
                : input.value;
        if (!String(item.title || "").trim())
          return toast("이름을 입력하세요.", true);
        update({
          ...data,
          rows: row
            ? data.rows.map((r) => (r.id === row.id ? item : r))
            : [...data.rows, item],
        });
        studioDialog.close();
      }),
    );
    if (row)
      dialog.append(
        widgetButton("항목 삭제", () => {
          update({ ...data, rows: data.rows.filter((r) => r.id !== row.id) });
          studioDialog.close();
        }),
      );
  });
}
function renderStudioDatabase(dom, data, update, editable) {
  data = { ...newStudioDatabase(), ...data };
  const header = el("div", "studio-db-header"),
    title = el("strong", "", data.title),
    views = el("select");
  views.setAttribute("aria-label", "데이터베이스 보기");
  for (const [id, label] of Object.entries(DB_VIEWS))
    views.append(new Option(label, id));
  views.value = data.view;
  views.disabled = !editable;
  views.onchange = () => update({ ...data, view: views.value });
  header.append(title, views);
  if (editable)
    header.append(
      widgetButton("이름 변경", () => {
        const v = prompt("데이터베이스 이름", data.title);
        if (v?.trim()) update({ ...data, title: v.trim() });
      }),
    );
  dom.append(header);
  const toolbar = el("div", "studio-db-toolbar"),
    search = el("input"),
    sort = el("select");
  search.placeholder = "항목 검색";
  search.setAttribute("aria-label", "데이터베이스 항목 검색");
  sort.setAttribute("aria-label", "정렬");
  sort.append(new Option("기본 순서", ""));
  for (const f of data.fields)
    sort.append(
      new Option(f.name + " 오름차순", f.id),
      new Option(f.name + " 내림차순", "-" + f.id),
    );
  toolbar.append(search, sort);
  if (editable)
    toolbar.append(
      widgetButton("+ 새 항목", () => editDatabaseRow(data, null, update)),
      widgetButton("+ 속성", () =>
        openStudioDialog("속성 추가", (dialog) => {
          const input = el("input"),
            type = el("select");
          input.placeholder = "속성 이름";
          for (const [id, name] of [
            ["text", "텍스트"],
            ["number", "숫자"],
            ["date", "날짜"],
            ["select", "상태"],
            ["checkbox", "체크박스"],
            ["url", "URL"],
          ])
            type.append(new Option(name, id));
          dialog.append(
            input,
            type,
            widgetButton("추가", () => {
              if (!input.value.trim()) return input.focus();
              update({
                ...data,
                fields: [
                  ...data.fields,
                  {
                    id: "field-" + crypto.randomUUID(),
                    name: input.value.trim(),
                    type: type.value,
                  },
                ],
              });
              studioDialog.close();
            }),
          );
        }),
      ),
    );
  dom.append(toolbar);
  const body = el("div", "studio-db-body");
  dom.append(body);
  let calendarMonth = new Date().toISOString().slice(0, 7);
  const draw = () => {
    body.replaceChildren();
    let rows = data.rows.filter((r) =>
      data.fields.some((f) =>
        String(r[f.id] ?? "")
          .toLowerCase()
          .includes(search.value.toLowerCase()),
      ),
    );
    if (sort.value) {
      const desc = sort.value.startsWith("-"),
        key = desc ? sort.value.slice(1) : sort.value,
        field = data.fields.find((f) => f.id === key);
      rows = [...rows].sort(
        (a, b) =>
          (field?.type === "number"
            ? Number(a[key] || 0) - Number(b[key] || 0)
            : String(a[key] || "").localeCompare(String(b[key] || ""), "ko")) *
          (desc ? -1 : 1),
      );
    }
    const edit = (row) => {
      if (editable) editDatabaseRow(data, row, update);
    };
    if (data.view === "form") {
      const form = el("form", "studio-db-form"),
        inputs = [];
      for (const field of data.fields) {
        const label = el("label", "", field.name),
          input = databaseFieldInput(field, "");
        input.disabled = !editable;
        label.append(input);
        form.append(label);
        inputs.push([field, input]);
      }
      const submit = el("button", "", "제출");
      submit.type = "submit";
      submit.disabled = !editable;
      form.append(submit);
      form.onsubmit = (e) => {
        e.preventDefault();
        const row = { id: crypto.randomUUID() };
        for (const [f, i] of inputs)
          row[f.id] =
            f.type === "checkbox"
              ? i.checked
              : f.type === "number"
                ? i.value === ""
                  ? ""
                  : Number(i.value)
                : i.value;
        if (!String(row.title || "").trim())
          return toast("이름을 입력하세요.", true);
        update({ ...data, rows: [...data.rows, row] });
        toast("항목을 등록했습니다.");
      };
      body.append(
        el(
          "p",
          "studio-empty",
          "이 폼의 제출 내용은 현재 작업공간에 저장됩니다.",
        ),
        form,
      );
      return;
    }
    if (["bar", "horizontal", "line", "donut", "number"].includes(data.view)) {
      renderStudioChart(body, data, rows);
      return;
    }
    if (data.view === "dashboard") {
      const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0),
        cards = el("div", "studio-db-stats");
      for (const [label, value] of [
        ["전체 항목", rows.length],
        ["완료", rows.filter((r) => r.status === "완료").length],
        ["값 합계", total],
      ]) {
        const c = el("div");
        c.append(el("small", "", label), el("strong", "", String(value)));
        cards.append(c);
      }
      body.append(cards);
      renderStudioChart(body, { ...data, view: "bar" }, rows);
      return;
    }
    if (data.view === "board") {
      const board = el("div", "studio-db-board"),
        groups = [
          ...new Set([
            "시작 전",
            "진행 중",
            "완료",
            ...rows.map((r) => r.status || "시작 전"),
          ]),
        ];
      for (const group of groups) {
        const column = el("section", "studio-db-board-column");
        column.append(el("strong", "", group));
        column.ondragover = (e) => {
          if (editable) e.preventDefault();
        };
        column.ondrop = (e) => {
          if (!editable) return;
          e.preventDefault();
          const id = e.dataTransfer.getData("application/x-studio-row");
          if (rows.some((r) => r.id === id))
            update({
              ...data,
              rows: data.rows.map((r) =>
                r.id === id ? { ...r, status: group } : r,
              ),
            });
        };
        for (const row of rows.filter(
          (r) => (r.status || "시작 전") === group,
        )) {
          const card = widgetButton(row.title, () => edit(row));
          card.draggable = editable;
          card.ondragstart = (e) =>
            e.dataTransfer.setData("application/x-studio-row", row.id);
          column.append(card);
        }
        board.append(column);
      }
      body.append(board);
      return;
    }
    if (data.view === "calendar") {
      const bar = el("div", "studio-widget-toolbar"),
        month = el("input");
      month.type = "month";
      month.value = calendarMonth;
      month.setAttribute("aria-label", "표시할 달");
      month.onchange = () => {
        calendarMonth = month.value;
        draw();
      };
      bar.append(month);
      body.append(bar);
      const [year, m] = calendarMonth.split("-").map(Number),
        days = new Date(year, m, 0).getDate(),
        first = new Date(year, m - 1, 1).getDay(),
        grid = el("div", "studio-db-calendar");
      for (const day of ["일", "월", "화", "수", "목", "금", "토"])
        grid.append(el("strong", "", day));
      for (let i = 0; i < first; i++) grid.append(el("div"));
      for (let d = 1; d <= days; d++) {
        const cell = el("div", "studio-calendar-day"),
          date = calendarMonth + "-" + String(d).padStart(2, "0");
        cell.append(el("small", "", String(d)));
        for (const row of rows.filter((r) => r.date === date))
          cell.append(widgetButton(row.title, () => edit(row)));
        grid.append(cell);
      }
      body.append(grid);
      const noDate = rows.filter((r) => !r.date);
      if (noDate.length)
        body.append(
          el(
            "p",
            "studio-empty",
            "날짜 미지정: " + noDate.map((r) => r.title).join(", "),
          ),
        );
      return;
    }
    if (data.view === "timeline") {
      const valid = rows.filter((r) =>
          /^\d{4}-\d{2}-\d{2}$/.test(r.date || ""),
        ),
        dates = valid.flatMap((r) => [
          Date.parse(r.date),
          Date.parse(r.end || r.date),
        ]),
        min = Math.min(...dates),
        max = Math.max(...dates),
        span = Math.max(86400000, max - min);
      for (const row of valid) {
        const line = el("div", "studio-timeline-row"),
          label = widgetButton(row.title, () => edit(row)),
          track = el("div", "studio-timeline-track"),
          bar = el("div", "studio-timeline-bar");
        bar.style.left = ((Date.parse(row.date) - min) / span) * 85 + "%";
        bar.style.width =
          Math.max(
            8,
            ((Date.parse(row.end || row.date) - Date.parse(row.date)) / span) *
              85,
          ) + "%";
        bar.title = row.date + " ~ " + (row.end || row.date);
        bar.textContent = row.date;
        track.append(bar);
        line.append(label, track);
        body.append(line);
      }
      if (!valid.length)
        body.append(
          el("p", "studio-empty", "항목에 날짜와 종료일을 입력하세요."),
        );
      return;
    }
    if (data.view === "map") {
      const map = el("div", "studio-db-map");
      const svg = studioSVG("svg", {
        viewBox: "0 0 720 360",
        role: "img",
        "aria-label": "위도·경도 지도",
      });
      for (let x = 0; x <= 720; x += 60)
        svg.append(
          studioSVG("line", {
            x1: x,
            y1: 0,
            x2: x,
            y2: 360,
            stroke: "#b8c9d2",
            "stroke-width": 1,
          }),
        );
      for (let y = 0; y <= 360; y += 60)
        svg.append(
          studioSVG("line", {
            x1: 0,
            y1: y,
            x2: 720,
            y2: y,
            stroke: "#b8c9d2",
            "stroke-width": 1,
          }),
        );
      let count = 0;
      for (const row of rows) {
        if (
          row.lat === "" ||
          row.lat == null ||
          row.lng === "" ||
          row.lng == null ||
          Math.abs(Number(row.lat)) > 90 ||
          Math.abs(Number(row.lng)) > 180
        )
          continue;
        count++;
        const g = studioSVG("g", {
            tabindex: 0,
            role: "button",
            "aria-label": row.title,
          }),
          dot = studioSVG("circle", {
            cx: (Number(row.lng) + 180) * 2,
            cy: (90 - Number(row.lat)) * 2,
            r: 5,
            fill: "#407ad5",
          }),
          text = studioSVG("text", {
            x: (Number(row.lng) + 180) * 2 + 7,
            y: (90 - Number(row.lat)) * 2,
            fill: "#263d4c",
            "font-size": 11,
          });
        text.textContent = row.title;
        g.append(dot, text);
        g.onclick = () => edit(row);
        g.onkeydown = (e) => {
          if (e.key === "Enter") edit(row);
        };
        svg.append(g);
        const link = el("a", "studio-map-link", row.title + " ↗");
        link.href =
          "https://www.openstreetmap.org/?mlat=" +
          Number(row.lat) +
          "&mlon=" +
          Number(row.lng) +
          "#map=12/" +
          Number(row.lat) +
          "/" +
          Number(row.lng);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        body.append(link);
      }
      map.append(svg);
      body.prepend(map);
      if (!count)
        body.append(
          el(
            "p",
            "studio-empty",
            "항목에 위도·경도를 입력하면 위치가 표시됩니다.",
          ),
        );
      return;
    }
    if (["gallery", "list", "feed"].includes(data.view)) {
      const list = el("div", "studio-db-" + data.view);
      for (const row of rows) {
        const card = el("article", "studio-db-card");
        card.append(widgetButton(row.title, () => edit(row)));
        for (const field of data.fields.filter(
          (f) => f.id !== "title" && row[f.id] !== "" && row[f.id] != null,
        ))
          card.append(el("p", "", field.name + ": " + String(row[field.id])));
        list.append(card);
      }
      body.append(list);
      if (!rows.length)
        body.append(el("p", "studio-empty", "새 항목을 추가하세요."));
      return;
    }
    const table = el("table", "studio-db-table"),
      head = el("tr");
    for (const field of data.fields) {
      const th = el("th", "", field.name);
      if (editable)
        th.ondblclick = () => {
          if (field.id === "title") return;
          openStudioDialog("속성 편집", (dialog) => {
            const input = el("input");
            input.value = field.name;
            dialog.append(
              input,
              widgetButton("이름 변경", () => {
                if (input.value.trim())
                  update({
                    ...data,
                    fields: data.fields.map((f) =>
                      f.id === field.id
                        ? { ...f, name: input.value.trim() }
                        : f,
                    ),
                  });
                studioDialog.close();
              }),
              widgetButton("속성 삭제", () => {
                update({
                  ...data,
                  fields: data.fields.filter((f) => f.id !== field.id),
                });
                studioDialog.close();
              }),
            );
          });
        };
      head.append(th);
    }
    head.append(el("th", "", ""));
    table.append(head);
    for (const row of rows) {
      const tr = el("tr");
      for (const field of data.fields) {
        const cell = el("td");
        if (field.type === "checkbox") {
          const input = el("input");
          input.type = "checkbox";
          input.checked = Boolean(row[field.id]);
          input.disabled = !editable;
          input.setAttribute("aria-label", row.title + " " + field.name);
          input.onchange = () =>
            update({
              ...data,
              rows: data.rows.map((r) =>
                r.id === row.id ? { ...r, [field.id]: input.checked } : r,
              ),
            });
          cell.append(input);
        } else if (field.type === "url" && safeStudioURL(row[field.id])) {
          const link = el("a", "", row[field.id]);
          link.href = safeStudioURL(row[field.id]);
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          cell.append(link);
        } else cell.textContent = row[field.id] ?? "";
        cell.ondblclick = () => edit(row);
        tr.append(cell);
      }
      const action = el("td");
      action.append(widgetButton("편집", () => edit(row), !editable));
      tr.append(action);
      table.append(tr);
    }
    body.append(table);
    if (!rows.length)
      body.append(
        el("p", "studio-empty", "새 항목을 추가하거나 폼 보기에서 입력하세요."),
      );
  };
  search.oninput = sort.onchange = draw;
  draw();
}
function studioSVG(tag, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs))
    node.setAttribute(key, value);
  return node;
}
function renderStudioChart(dom, data, rows) {
  const field =
      data.fields.find((f) => f.id === "value" && f.type === "number") ||
      data.fields.find((f) => f.type === "number"),
    values = rows.map((r) => Number(r[field?.id]) || 0);
  if (data.view === "number") {
    const stat = el("div", "studio-number-chart");
    stat.append(
      el("small", "", field?.name || "항목 수"),
      el(
        "strong",
        "",
        String(field ? values.reduce((a, b) => a + b, 0) : rows.length),
      ),
    );
    dom.append(stat);
    return;
  }
  if (!rows.length) {
    dom.append(
      el(
        "p",
        "studio-empty",
        "새 항목에 이름과 숫자 값을 입력하면 차트가 표시됩니다.",
      ),
    );
    return;
  }
  const width = 680,
    height = 300,
    max = Math.max(1, ...values.map(Math.abs)),
    svg = studioSVG("svg", {
      viewBox: "0 0 " + width + " " + height,
      role: "img",
      "aria-label": DB_VIEWS[data.view],
    });
  let cumulative = 0,
    total = values.reduce((s, n) => s + Math.max(0, n), 0);
  const palette = [
    "#7185cd",
    "#75b3a1",
    "#e3b46c",
    "#d391b2",
    "#74a8c9",
    "#a593cd",
  ];
  if (data.view === "donut") {
    rows.forEach((r, i) => {
      const part = Math.max(0, values[i]) / Math.max(1, total),
        circle = studioSVG("circle", {
          cx: 200,
          cy: 145,
          r: 95,
          fill: "none",
          stroke: palette[i % palette.length],
          "stroke-width": 42,
          "stroke-dasharray": part * 597 + " " + 597,
          "stroke-dashoffset": -cumulative * 597,
          transform: "rotate(-90 200 145)",
        });
      circle.append(studioSVG("title", {}));
      circle.firstChild.textContent = r.title + ": " + values[i];
      svg.append(circle);
      const text = studioSVG("text", {
        x: 350,
        y: 35 + i * 24,
        "font-size": 13,
        fill: palette[i % palette.length],
      });
      text.textContent = r.title + ": " + values[i];
      svg.append(text);
      cumulative += part;
    });
  } else {
    const points = [];
    rows.slice(0, 50).forEach((r, i) => {
      const horizontal = data.view === "horizontal",
        n = Math.min(rows.length, 50),
        step = (horizontal ? 250 : 600) / n,
        x = horizontal ? 100 : 50 + i * step,
        y = horizontal
          ? 15 + i * step
          : 260 - (Math.max(0, values[i]) / max) * 220;
      let shape;
      if (data.view === "line") {
        points.push(x + step / 2 + "," + (260 - (values[i] / max) * 220));
        shape = studioSVG("circle", {
          cx: x + step / 2,
          cy: 260 - (values[i] / max) * 220,
          r: 4,
          fill: palette[0],
        });
      } else
        shape = studioSVG("rect", {
          x,
          y,
          width: horizontal
            ? Math.max(1, (Math.abs(values[i]) / max) * 500)
            : Math.max(3, step - 8),
          height: horizontal
            ? Math.max(3, step - 5)
            : Math.max(1, (Math.abs(values[i]) / max) * 220),
          fill: palette[i % palette.length],
          rx: 3,
        });
      const title = studioSVG("title", {});
      title.textContent = r.title + ": " + values[i];
      shape.append(title);
      svg.append(shape);
      const text = studioSVG("text", {
        x: horizontal ? 0 : x,
        y: horizontal ? y + 12 : 280,
        "font-size": 11,
        fill: "currentColor",
      });
      text.textContent = r.title.slice(0, 12);
      svg.append(text);
    });
    if (points.length)
      svg.prepend(
        studioSVG("polyline", {
          points: points.join(" "),
          fill: "none",
          stroke: palette[0],
          "stroke-width": 3,
        }),
      );
  }
  dom.append(svg);
  const accessible = el("details", "studio-chart-data");
  accessible.append(el("summary", "", "차트 데이터"));
  for (let i = 0; i < rows.length; i++)
    accessible.append(el("p", "", rows[i].title + ": " + values[i]));
  dom.append(accessible);
}
function studioEmbedURL(url) {
  const u = new URL(url);
  if (u.hostname === "youtu.be")
    return (
      "https://www.youtube-nocookie.com/embed/" +
      encodeURIComponent(u.pathname.slice(1))
    );
  if (["www.youtube.com", "youtube.com"].includes(u.hostname)) {
    const id = u.searchParams.get("v") || u.pathname.split("/").at(-1);
    return "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id);
  }
  if (u.hostname === "vimeo.com" && /^\/\d+$/.test(u.pathname))
    return "https://player.vimeo.com/video/" + u.pathname.slice(1);
  if (u.hostname.endsWith("figma.com"))
    return (
      "https://www.figma.com/embed?embed_host=share&url=" +
      encodeURIComponent(url)
    );
  if (u.hostname === "drive.google.com") {
    const match = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (match)
      return (
        "https://drive.google.com/file/d/" +
        encodeURIComponent(match[1]) +
        "/preview"
      );
  }
  return url;
}
function renderStudioMedia(dom, data, update, editable, objectURLs = []) {
  let url = safeStudioURL(data.url);
  if (data.fileData) {
    try {
      const bytes = Uint8Array.from(atob(data.fileData), (c) =>
        c.charCodeAt(0),
      );
      url = URL.createObjectURL(
        new Blob([bytes], { type: data.mime || "application/octet-stream" }),
      );
      objectURLs.push(url);
    } catch {
      url = null;
    }
  }

  if (!url) {
    dom.append(el("p", "studio-widget-error", "올바른 URL이 필요합니다."));
    return;
  }
  const heading = el("div", "studio-widget-toolbar");
  heading.append(el("strong", "", data.title || "미디어"));
  const link = el("a", "", "원본 열기 ↗");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  if (data.fileData) link.download = data.name || "download";
  heading.append(link);
  if (editable)
    heading.append(
      widgetButton("주소 변경", () => {
        const value = prompt("미디어 URL", url);
        if (value === null) return;
        const next = safeStudioURL(value);
        if (!next) return toast("올바른 HTTP(S) URL을 입력하세요.", true);
        update({ ...data, url: next, fileData: null, mime: null, name: null });
      }),
    );
  dom.append(heading);
  if (data.mode === "image") {
    const image = el("img");
    image.src = url;
    image.alt = data.name || data.title || "이미지";
    dom.append(image);
  } else if (
    data.mode === "video" &&
    !/youtu\.be|youtube\.com|vimeo\.com/.test(new URL(url).hostname)
  ) {
    const media = el("video");
    media.src = url;
    media.controls = true;
    media.preload = "metadata";
    dom.append(media);
  } else if (data.mode === "audio") {
    const audio = el("audio");
    audio.src = url;
    audio.controls = true;
    audio.preload = "metadata";
    dom.append(audio);
  } else if (data.mode === "file") {
    const file = el(
      "a",
      "studio-file-link",
      "📎 " +
        (data.name ||
          decodeURIComponent(
            new URL(url).pathname.split("/").pop() || "파일 열기",
          )),
    );
    file.href = url;
    file.target = "_blank";
    file.rel = "noopener noreferrer";
    if (data.fileData) file.download = data.name || "download";
    dom.append(file);
  } else if (data.mode === "bookmark") {
    dom.append(el("p", "studio-bookmark-url", url));
  } else {
    const iframe = el("iframe");
    iframe.src = studioEmbedURL(url);
    iframe.title = data.title || "외부 콘텐츠";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer";
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-presentation",
    );
    iframe.allow = "fullscreen; picture-in-picture";
    dom.append(
      iframe,
      el(
        "small",
        "studio-connection-note",
        "서비스가 임베드를 허용하고 로그인되어 있어야 표시됩니다. 표시되지 않으면 원본 열기를 사용하세요.",
      ),
    );
  }
}
let studioMathLoading = null,
  studioMermaidLoading = null;
function studioLoadScript(url, check) {
  if (check()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = el("script");
    script.src = url;
    script.onload = () =>
      check()
        ? resolve()
        : reject(Error("라이브러리를 초기화하지 못했습니다."));
    script.onerror = () =>
      reject(Error("렌더링 라이브러리를 불러오지 못했습니다."));
    document.head.append(script);
  });
}
async function renderStudioMath(dom, formula, inline) {
  try {
    if (!studioMathLoading)
      studioMathLoading = studioLoadScript("vendor/katex.min.js", () =>
        Boolean(window.katex),
      );
    await studioMathLoading;
    if (!dom.isConnected) return;
    window.katex.render(formula || "", dom, {
      throwOnError: false,
      displayMode: !inline,
      trust: false,
      strict: "warn",
    });
  } catch {
    dom.title = "수식 렌더러를 불러올 수 없어 LaTeX 원문을 표시합니다.";
  }
}
async function renderStudioMermaid(dom, source) {
  dom.textContent = source || "";
  try {
    if (!studioMermaidLoading)
      studioMermaidLoading = studioLoadScript("vendor/mermaid.min.js", () =>
        Boolean(window.mermaid),
      );
    await studioMermaidLoading;
    if (!dom.isConnected) return;
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      flowchart: { htmlLabels: false },
      theme: APP.theme === "dark" ? "dark" : "default",
      suppressErrorRendering: true,
    });
    const result = await window.mermaid.render(
      "studio-diagram-" + crypto.randomUUID().replaceAll("-", ""),
      source || "",
    );
    if (dom.isConnected)
      dom.innerHTML = DOMPurify.sanitize(result.svg, {
        USE_PROFILES: { svg: true, svgFilters: true },

        ADD_ATTR: ["dominant-baseline"],
      });
  } catch (e) {
    dom.replaceChildren(
      el("pre", "", source || ""),
      el(
        "small",
        "studio-widget-error",
        "Mermaid 코드를 확인하세요. " + e.message,
      ),
    );
  }
}
function studioInlineEquationExtension() {
  return BlockEngine.Node.create({
    name: "studioInlineEquation",
    group: "inline",
    inline: true,
    atom: true,
    addAttributes() {
      return {
        formula: {
          default: "",
          parseHTML: (n) => n.getAttribute("data-formula"),
        },
      };
    },
    parseHTML() {
      return [{ tag: "span[data-studio-inline-equation]" }];
    },
    renderHTML({ node }) {
      return [
        "span",
        {
          "data-studio-inline-equation": "true",
          "data-formula": node.attrs.formula,
          class: "studio-inline-equation",
        },
        node.attrs.formula,
      ];
    },
    addNodeView() {
      return ({ node, getPos, editor }) => {
        const dom = el("span", "studio-inline-equation", node.attrs.formula);
        dom.contentEditable = "false";
        dom.dataset.studioInlineEquation = "true";
        dom.dataset.formula = node.attrs.formula;
        renderStudioMath(dom, node.attrs.formula, true);
        dom.ondblclick = () => {
          if (!editor.isEditable) return;
          const formula = prompt("LaTeX 수학 공식", node.attrs.formula);
          if (formula !== null)
            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(getPos(), undefined, { formula }),
            );
        };
        return { dom };
      };
    },
  });
}

function openStudioMediaPicker(command, state) {
  const service = command.startsWith("service-") ? command.slice(8) : "";
  const labels = {
    image: "이미지",
    video: "동영상",
    audio: "오디오",
    file: "파일",
    bookmark: "웹 북마크",
    urlEmbed: "임베드",
  };
  openStudioDialog(service || labels[command] || "미디어", (dialog) => {
    const input = el("input");
    input.type = "url";
    input.placeholder = "https://";
    input.setAttribute("aria-label", "미디어 URL");
    dialog.append(
      input,
      widgetButton("URL 삽입", () => {
        const url = safeStudioURL(input.value);
        if (!url) return toast("올바른 HTTP(S) URL을 입력하세요.", true);
        studioDialog.close();
        insertExtraNode(
          state,
          studioWidgetNode("media", {
            title: service || labels[command],
            mode: service ? "embed" : command,
            url,
          }),
        );
      }),
    );
    if (["image", "video", "audio", "file"].includes(command)) {
      const file = el("input");
      file.type = "file";
      file.setAttribute("aria-label", "로컬 파일 선택");
      if (command !== "file")
        file.accept =
          command === "image"
            ? "image/png,image/jpeg,image/gif,image/webp"
            : command + "/*";
      dialog.append(
        el(
          "p",
          "studio-empty",
          "또는 로컬 파일을 선택하세요. 파일당 2MB, 문서 전체 5MB까지 문서 안에 보관됩니다.",
        ),
        file,
      );
      file.onchange = async () => {
        const chosen = file.files?.[0];
        if (!chosen) return;
        if (chosen.size > 2 * 1024 * 1024)
          return toast(
            "로컬 파일은 2MB까지 첨부할 수 있습니다. 큰 파일은 URL로 연결하세요.",
            true,
          );
        if (
          command !== "file" &&
          !(
            command === "image"
              ? /^image\/(png|jpeg|gif|webp)$/
              : new RegExp("^" + command + "/")
          ).test(chosen.type)
        )
          return toast(
            "지원하는 " + labels[command] + " 파일을 선택하세요.",
            true,
          );
        try {
          const bytes = new Uint8Array(await chosen.arrayBuffer());
          let binary = "";
          for (let i = 0; i < bytes.length; i += 32768)
            binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
          if (state.document !== APP.activeId) return;
          studioDialog.close();
          insertExtraNode(
            state,
            studioWidgetNode("media", {
              title: labels[command],
              mode: command,
              fileData: btoa(binary),
              name: chosen.name,
              mime: chosen.type || "application/octet-stream",
            }),
          );
        } catch (e) {
          onError(e);
        }
      };
    }
  });
}
