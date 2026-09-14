const input = document.getElementById('input');
const output = document.getElementById('output');
const status = document.getElementById('status');
const indentSelect = document.getElementById('indentSelect');
const formatBtn = document.getElementById('formatBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const pasteBtn = document.getElementById('pasteBtn');

let currentParsedValue = null;
let currentFormattedText = '';

function setStatus(message, type = '') {
  status.textContent = message;
  status.className = type;
}

function looksLikeJsonText(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  return (
    (text.startsWith('{') && text.endsWith('}')) ||
    (text.startsWith('[') && text.endsWith(']')) ||
    (text.startsWith('"') && text.endsWith('"'))
  );
}

function parseRepeatedJson(value, maxDepth = 8) {
  let current = value;
  let parsedAtLeastOnce = false;

  for (let i = 0; i < maxDepth; i++) {
    if (typeof current !== 'string') break;
    const text = current.trim();
    if (!text) break;

    try {
      current = JSON.parse(text);
      parsedAtLeastOnce = true;
      continue;
    } catch (_) {
      break;
    }
  }

  return { value: current, parsedAtLeastOnce };
}

function decodeEscapedJson(text) {
  const source = text.trim();

  // 常见接口日志形态：{\"a\":1} / [\"a\",\"b\"]
  // 先只处理 JSON 结构中最常见的转义，不粗暴删除所有反斜杠。
  const candidates = [
    source,
    source.replace(/\\\"/g, '"'),
    source.replace(/\\\\\"/g, '\\"').replace(/\\\"/g, '"'),
    source.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\"/g, '"')
  ];

  for (const candidate of candidates) {
    const parsed = parseRepeatedJson(candidate);
    if (parsed.parsedAtLeastOnce) return parsed.value;
  }

  // 将整段文本按“JSON 字符串内容”解码一次，再尝试 JSON.parse。
  // JSON.stringify(source) 会安全处理真实换行、引号等字符。
  try {
    const wrapped = '"' + source
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n') + '"';
    const decoded = JSON.parse(wrapped);
    const unescaped = decoded.replace(/\\\"/g, '"').replace(/\\\\/g, '\\');
    const parsed = parseRepeatedJson(unescaped);
    if (parsed.parsedAtLeastOnce) return parsed.value;
  } catch (_) {
    // 继续抛出统一错误
  }

  throw new Error('无法识别为有效 JSON。请检查是否有缺失的引号、逗号或括号。');
}

function parseFlexibleJson(text) {
  const source = text.trim();
  if (!source) throw new Error('请先输入 JSON 内容。');

  const direct = parseRepeatedJson(source);
  if (direct.parsedAtLeastOnce) return direct.value;

  return decodeEscapedJson(source);
}

function appendText(parent, text) {
  parent.append(document.createTextNode(text));
}

function appendToken(parent, className, text) {
  const token = document.createElement('span');
  token.className = `json-token ${className}`;
  token.textContent = text;
  parent.append(token);
}

function appendIndent(parent, depth, indentUnit) {
  appendText(parent, indentUnit.repeat(depth));
}

function renderKey(parent, key) {
  const keyGroup = document.createElement('span');
  keyGroup.className = 'json-key-group';

  appendToken(keyGroup, 'json-key', JSON.stringify(key));

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'copy-field-btn';
  copyButton.textContent = '⧉';
  copyButton.title = `复制全部 ${key} 值`;
  copyButton.setAttribute('aria-label', `复制全部 ${key} 值`);
  copyButton.addEventListener('click', () => {
    void copyValuesByKey(key);
  });

  keyGroup.append(copyButton);
  parent.append(keyGroup);
}

function renderPrimitive(parent, value) {
  if (typeof value === 'string') {
    appendToken(parent, 'json-string', JSON.stringify(value));
    return;
  }

  if (typeof value === 'number') {
    appendToken(parent, 'json-number', JSON.stringify(value));
    return;
  }

  if (typeof value === 'boolean') {
    appendToken(parent, 'json-boolean', String(value));
    return;
  }

  appendToken(parent, 'json-null', 'null');
}

function renderObject(parent, value, depth, indentUnit) {
  const entries = Object.entries(value);
  appendToken(parent, 'json-punctuation', '{');

  if (entries.length > 0) {
    entries.forEach(([key, childValue], index) => {
      appendText(parent, '\n');
      appendIndent(parent, depth + 1, indentUnit);
      renderKey(parent, key);
      appendToken(parent, 'json-punctuation', ':');
      appendText(parent, ' ');
      renderValue(parent, childValue, depth + 1, indentUnit);

      if (index < entries.length - 1) {
        appendToken(parent, 'json-punctuation', ',');
      }
    });

    appendText(parent, '\n');
    appendIndent(parent, depth, indentUnit);
  }

  appendToken(parent, 'json-punctuation', '}');
}

function renderArray(parent, value, depth, indentUnit) {
  appendToken(parent, 'json-punctuation', '[');

  if (value.length > 0) {
    value.forEach((childValue, index) => {
      appendText(parent, '\n');
      appendIndent(parent, depth + 1, indentUnit);
      renderValue(parent, childValue, depth + 1, indentUnit);

      if (index < value.length - 1) {
        appendToken(parent, 'json-punctuation', ',');
      }
    });

    appendText(parent, '\n');
    appendIndent(parent, depth, indentUnit);
  }

  appendToken(parent, 'json-punctuation', ']');
}

function renderValue(parent, value, depth, indentUnit) {
  if (Array.isArray(value)) {
    renderArray(parent, value, depth, indentUnit);
    return;
  }

  if (value !== null && typeof value === 'object') {
    renderObject(parent, value, depth, indentUnit);
    return;
  }

  renderPrimitive(parent, value);
}

function renderJson(value, indent) {
  const indentUnit = ' '.repeat(indent);
  const fragment = document.createDocumentFragment();
  renderValue(fragment, value, 0, indentUnit);
  output.replaceChildren(fragment);
}

function formatJson() {
  try {
    const value = parseFlexibleJson(input.value);
    const indent = Number(indentSelect.value) || 2;
    currentParsedValue = value;
    currentFormattedText = JSON.stringify(value, null, indent);
    renderJson(value, indent);
    setStatus('格式化成功', 'success');
  } catch (error) {
    currentParsedValue = null;
    currentFormattedText = '';
    output.replaceChildren();
    setStatus(error.message || 'JSON 格式错误', 'error');
  }
}

async function writeClipboardText(text) {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch (_) {
    // 尝试使用兼容旧环境的 fallback。
  }

  const fallbackInput = document.createElement('textarea');
  fallbackInput.value = text;
  fallbackInput.setAttribute('readonly', '');
  fallbackInput.style.position = 'fixed';
  fallbackInput.style.top = '-1000px';
  fallbackInput.style.opacity = '0';
  document.body.append(fallbackInput);
  fallbackInput.focus();
  fallbackInput.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    fallbackInput.remove();
  }

  if (!copied) throw new Error('复制失败，请检查浏览器的剪贴板权限。');
}

function appendCopyValues(value, result) {
  if (Array.isArray(value)) {
    for (const item of value) {
      appendCopyValues(item, result);
    }
    return;
  }

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    result.push(value === null ? 'null' : String(value));
    return;
  }

  result.push(JSON.stringify(value, null, 2));
}

function collectValuesByKey(node, targetKey, result = []) {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectValuesByKey(item, targetKey, result);
    }
    return result;
  }

  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === targetKey) {
        appendCopyValues(value, result);
      }
      collectValuesByKey(value, targetKey, result);
    }
  }

  return result;
}

async function copyValuesByKey(targetKey) {
  if (!currentFormattedText) {
    setStatus('没有可复制的字段', 'error');
    return;
  }

  const values = collectValuesByKey(currentParsedValue, targetKey);

  try {
    await writeClipboardText(values.join('\n'));
    setStatus(`已复制 ${values.length} 个 ${targetKey} 值`, 'success');
  } catch (error) {
    setStatus(error.message || '复制失败，请检查浏览器的剪贴板权限。', 'error');
  }
}

async function copyResult() {
  if (!currentFormattedText) {
    setStatus('没有可复制的结果', 'error');
    return;
  }

  try {
    await writeClipboardText(currentFormattedText);
    setStatus('已复制到剪贴板', 'success');
  } catch (error) {
    setStatus(error.message || '复制失败，请检查浏览器的剪贴板权限。', 'error');
  }
}

async function pasteInput() {
  try {
    input.value = await navigator.clipboard.readText();
    setStatus('已从剪贴板粘贴', 'success');
    formatJson();
  } catch (_) {
    input.focus();
    setStatus('浏览器未允许读取剪贴板，请使用 Ctrl / ⌘ + V', 'error');
  }
}

formatBtn.addEventListener('click', formatJson);
copyBtn.addEventListener('click', copyResult);
pasteBtn.addEventListener('click', pasteInput);
clearBtn.addEventListener('click', () => {
  input.value = '';
  currentParsedValue = null;
  currentFormattedText = '';
  output.replaceChildren();
  input.focus();
  setStatus('已清空');
});

input.addEventListener('paste', () => {
  setTimeout(formatJson, 0);
});

input.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    formatJson();
  }
});
