// alg.js
const fs = require("fs");
const crypto = require("crypto");

function stripInlineMd(s) {
  return s
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/(\*\*|__|\*|_|~~)/g, "")
    .replace(/<\/?[^>]+>/g, "")
    .trim();
}
function isHeading(line) {
  return /^\s{0,3}#{1,6}\s+/.test(line);
}
function isCodeFence(line) {
  return /^\s*```/.test(line);
}
function getListMatch(line) {
  const ordered = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
  if (ordered) return { indent: ordered[1], text: ordered[3] };
  const unordered = /^(\s*)[-+*]\s+(.*)$/.exec(line);
  if (unordered) return { indent: unordered[1], text: unordered[2] };
  return null;
}
function calcDepth(indentRaw) {
  const tabs = (indentRaw.match(/\t/g) || []).length;
  const spaces = (indentRaw.replace(/\t/g, "    ").match(/ /g) || []).length;
  return tabs > 0 ? tabs : Math.floor(spaces / 2);
}
function makeId(text, index) {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-zа-я0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const hash = crypto
    .createHash("sha1")
    .update(normalized)
    .digest("hex")
    .slice(0, 8);
  return `q-${index}-${hash}`;
}

function mdToJson(markdown) {
  const lines = markdown.split(/\r?\n/);

  // Корень оставляем как { items: [...] } для совместимости
  const root = { items: [] };
  // В стеке храним «контейнер» (куда класть детей) и глубину
  const stack = [{ type: "normal", container: root.items, depth: -1 }];

  let inCode = false;
  let lastItem = null; // последний добавленный узел (для склейки параграфов)
  let questionCount = 0;

  for (let raw of lines) {
    if (isCodeFence(raw)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (isHeading(raw)) continue;

    const m = getListMatch(raw);
    if (m) {
      const depth = calcDepth(m.indent);
      const text = stripInlineMd(m.text);
      if (!text) {
        lastItem = null;
        continue;
      }

      // Сдвигаем стек на текущую глубину
      while (stack.length && stack[stack.length - 1].depth >= depth)
        stack.pop();
      const top = stack[stack.length - 1];
      // Если мы внутри сбора строк для ответа вопроса — просто добавляем сырую строку
      if (top && top.type === "lines") {
        top.lines.push(raw);
        // Заводим новый фрейм той же коллекции строк на текущей глубине,
        // чтобы корректно отслеживать выход из подразделов
        stack.push({ type: "lines", lines: top.lines, depth });
        lastItem = null;
        continue;
      }
      const parentContainer = top.container;

      const isQuestion = /\?\s*$/.test(text);
      let item;
      if (isQuestion) {
        questionCount += 1;
        item = {
          question: text,
          id: makeId(text, questionCount),
          answer: "",
          _answerLines: [],
        };
      } else {
        item = { text, answer: [] };
      }

      parentContainer.push(item);
      // Для вопроса — начинаем собирать ответ как сырые строки с сохранением табуляции
      if (isQuestion) {
        stack.push({ type: "lines", lines: item._answerLines, depth });
      } else {
        // Дети обычного узла идут в его answer как массив
        stack.push({ type: "normal", container: item.answer, depth });
      }
      lastItem = item;
      continue;
    }

    // Параграф/детали — привязываем к последнему узлу
    const top = stack[stack.length - 1];
    // Если мы внутри ответа вопроса — добавляем сырую строку как есть
    if (top && top.type === "lines") {
      top.lines.push(raw);
      lastItem = null;
      continue;
    }
    const clean = stripInlineMd(raw);
    if (clean && lastItem) {
      if ("text" in lastItem && !("question" in lastItem)) {
        // продлеваем текст ответа
        lastItem.text = lastItem.text ? `${lastItem.text}\n${clean}` : clean;
      } else {
        // под вопросом — создаём новый ответ-параграф
        const para = { text: clean, answer: [] };
        const topContainer = stack[stack.length - 1].container;
        topContainer.push(para);
        lastItem = para;
      }
    } else if (!clean) {
      // пустая строка — не объединяем дальше
      lastItem = lastItem;
    }
  }

  // Преобразуем накопленные строки в литеральную строку ответа для всех вопросов
  function finalize(items) {
    for (const it of items) {
      if (typeof it.answer === "string" && Array.isArray(it._answerLines)) {
        it.answer = it._answerLines.join("\n");
        delete it._answerLines;
      } else if (Array.isArray(it.answer)) {
        finalize(it.answer);
      }
    }
  }
  finalize(root.items);

  return root;
}

// CLI
if (require.main === module) {
  const [, , inPath, outPath] = process.argv;
  if (!inPath || !outPath) {
    console.error("Usage: node alg.js <input.md> <output.json>");
    process.exit(1);
  }
  const md = fs.readFileSync(inPath, "utf8");
  const json = mdToJson(md);
  fs.writeFileSync(outPath, JSON.stringify(json, null, 2), "utf8");
  console.log(`Saved: ${outPath}`);
}

module.exports = { mdToJson };
