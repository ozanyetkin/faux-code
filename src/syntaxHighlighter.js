/**
 * Simple syntax highlighter for multiple languages
 * Maps tokens to CSS classes that match gist-syntax-bindings.json
 */

const keywords = {
  javascript: [
    'abstract', 'arguments', 'await', 'boolean', 'break', 'byte', 'case', 'catch',
    'char', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
    'double', 'else', 'enum', 'eval', 'export', 'extends', 'false', 'final',
    'finally', 'float', 'for', 'function', 'goto', 'if', 'implements', 'import',
    'in', 'instanceof', 'int', 'interface', 'let', 'long', 'native', 'new', 'null',
    'package', 'private', 'protected', 'public', 'return', 'short', 'static',
    'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
    'true', 'try', 'typeof', 'var', 'void', 'volatile', 'while', 'with', 'yield',
    'async', 'of',
  ],
  python: [
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
    'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for',
    'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or',
    'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
  ],
  java: [
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
    'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
    'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
    'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'null',
    'package', 'private', 'protected', 'public', 'return', 'short', 'static',
    'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
    'transient', 'try', 'void', 'volatile', 'while', 'true', 'false',
  ],
};

/**
 * Detect language from file extension or content
 */
const detectLanguage = (content, filePath = '') => {
  const ext = filePath.split('.').pop().toLowerCase();
  if (ext === 'py') return 'python';
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return 'javascript';
  if (ext === 'java') return 'java';
  return 'javascript'; // default
};

/**
 * Tokenize code and apply syntax highlighting
 */
const highlightCode = (line, language = 'javascript') => {
  const tokens = [];
  let i = 0;

  while (i < line.length) {
    // Skip whitespace
    if (/\s/.test(line[i])) {
      tokens.push({ type: 'whitespace', value: line[i] });
      i++;
      continue;
    }

    // Comments
    if (line[i] === '/' && line[i + 1] === '/') {
      const comment = line.slice(i);
      tokens.push({ type: 'comment', value: comment });
      break;
    }

    // Strings (double quotes)
    if (line[i] === '"') {
      let str = '"';
      i++;
      while (i < line.length && line[i] !== '"') {
        if (line[i] === '\\') {
          str += line[i] + line[i + 1];
          i += 2;
        } else {
          str += line[i];
          i++;
        }
      }
      str += '"';
      tokens.push({ type: 'string', value: str });
      i++;
      continue;
    }

    // Strings (single quotes)
    if (line[i] === "'") {
      let str = "'";
      i++;
      while (i < line.length && line[i] !== "'") {
        if (line[i] === '\\') {
          str += line[i] + line[i + 1];
          i += 2;
        } else {
          str += line[i];
          i++;
        }
      }
      str += "'";
      tokens.push({ type: 'string', value: str });
      i++;
      continue;
    }

    // Strings (backticks for JavaScript)
    if (line[i] === '`') {
      let str = '`';
      i++;
      while (i < line.length && line[i] !== '`') {
        if (line[i] === '\\') {
          str += line[i] + line[i + 1];
          i += 2;
        } else {
          str += line[i];
          i++;
        }
      }
      str += '`';
      tokens.push({ type: 'string', value: str });
      i++;
      continue;
    }

    // Numbers
    if (/\d/.test(line[i])) {
      let num = '';
      while (i < line.length && /[\d._xXoObB]/.test(line[i])) {
        num += line[i];
        i++;
      }
      tokens.push({ type: 'atom', value: num });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(line[i])) {
      let ident = '';
      while (i < line.length && /[a-zA-Z0-9_$]/.test(line[i])) {
        ident += line[i];
        i++;
      }

      const keywordList = keywords[language] || keywords.javascript;
      if (keywordList.includes(ident)) {
        tokens.push({ type: 'keyword', value: ident });
      } else {
        tokens.push({ type: 'variable', value: ident });
      }
      continue;
    }

    // Operators and punctuation
    tokens.push({ type: 'operator', value: line[i] });
    i++;
  }

  return tokens;
};

/**
 * Convert tokens to HTML with syntax highlighting classes
 */
const tokensToHtml = (tokens) => {
  return tokens
    .map((token) => {
      if (token.type === 'whitespace') {
        return token.value;
      }
      // Map token type to gist-syntax-bindings class
      const classMap = {
        keyword: 'pl-k',
        string: 'pl-s',
        comment: 'pl-c',
        atom: 'pl-c1',
        variable: 'pl-e',
        operator: 'pl-o',
      };
      const cssClass = classMap[token.type] || 'pl-e';
      return `<span class="${cssClass}">${escapeHtml(token.value)}</span>`;
    })
    .join('');
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};

export { highlightCode, tokensToHtml, detectLanguage };
