const input = document.getElementById('input');
const output = document.getElementById('output');
const status = document.getElementById('status');
const indentSelect = document.getElementById('indentSelect');
const formatBtn = document.getElementById('formatBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const pasteBtn = document.getElementById('pasteBtn');

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

function formatJson() {
  try {
    const value = parseFlexibleJson(input.value);
    const indent = Number(indentSelect.value) || 2;
    output.value = JSON.stringify(value, null, indent);
    setStatus('格式化成功', 'success');
  } catch (error) {
    output.value = '';
    setStatus(error.message || 'JSON 格式错误', 'error');
  }
}

async function copyResult() {
  if (!output.value) {
    setStatus('没有可复制的结果', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(output.value);
    setStatus('已复制到剪贴板', 'success');
  } catch (_) {
    output.focus();
    output.select();
    document.execCommand('copy');
    setStatus('已复制到剪贴板', 'success');
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
  output.value = '';
  input.focus();
  setStatus('已清空');
});

input.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    formatJson();
  }
});
