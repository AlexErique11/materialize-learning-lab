type Value = { kind: 'column' | 'string' | 'number' | 'interval' | 'clock'; text: string } | { kind: 'add'; left: Value; right: Value };
export type Predicate = { kind: 'and'; terms: Predicate[] } | { kind: 'boolean'; value: boolean } | { kind: 'compare'; left: Value; operator: string; right: Value };
interface Token { text: string; at: number; quoted?: boolean }

function tokenize(source: string): Token[] {
  if (source.length > 4000) throw new Error('Keep the repair predicate under 4,000 characters.');
  const tokens: Token[] = [];
  const pattern = /\s+|--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|(?:\d+(?:\.\d+)?)|[a-z_][a-z_0-9]*(?:\.[a-z_][a-z_0-9]*)?|<=|>=|<>|!=|[<>=+(),]/iy;
  let at = 0;
  while (at < source.length) {
    pattern.lastIndex = at;
    const match = pattern.exec(source);
    if (!match) throw new Error(`Unsupported character at position ${at + 1}. Use comparisons, AND, parentheses, and intervals.`);
    const text = match[0];
    if (!/^\s|^--|^\/\*/.test(text)) tokens.push({ text, at, quoted: text.startsWith("'") });
    at = pattern.lastIndex;
  }
  if (tokens.length > 250) throw new Error('This predicate is too large for the incident workspace.');
  return tokens;
}

/** A bounded expression grammar, independent of the correct business predicate. */
export function parsePredicate(source: string): Predicate {
  const tokens = tokenize(source);
  let index = 0;
  let depth = 0;
  const peek = () => tokens[index]?.text.toLowerCase();
  const take = () => {
    const token = tokens[index++];
    if (!token) throw new Error('The predicate ends before the expression is complete.');
    return token;
  };
  const expect = (text: string) => { if (take().text.toLowerCase() !== text) throw new Error(`Expected ${text} near position ${tokens[index - 1]?.at ?? source.length}.`); };
  const value = (): Value => {
    if (++depth > 24) throw new Error('Use fewer nested parentheses.');
    const token = take();
    const text = token.text.toLowerCase();
    let result: Value;
    if (text === '(') { result = arithmetic(); expect(')'); }
    else if (text === 'mz_now') { expect('('); expect(')'); result = { kind: 'clock', text: 'mz_now()' }; }
    else if (text === 'interval') {
      const literal = take();
      if (!literal.quoted || !/^'\d+(?:\.\d+)?\s+(milliseconds?|seconds?|minutes?)'$/i.test(literal.text)) throw new Error("Use an interval such as INTERVAL '5 minutes'.");
      result = { kind: 'interval', text: literal.text };
    } else if (token.quoted) result = { kind: 'string', text: token.text };
    else if (/^\d/.test(text)) result = { kind: 'number', text };
    else {
      const columns: Record<string, string> = { order_id: 'o.order_id', customer_id: 'o.customer_id', status: 'o.status', amount: 'o.amount', event_at: 'o.event_at', arrived_at: 'o.arrived_at', region: 'c.region' };
      const column = columns[text] ?? (Object.values(columns).includes(text) ? text : undefined);
      if (!column) throw new Error(`Unknown expression ${token.text}. Inspect the schema in Reference.`);
      result = { kind: 'column', text: column };
    }
    depth--;
    return result;
  };
  const arithmetic = (): Value => {
    let left = value();
    while (peek() === '+') {
      take(); const right = value();
      if (left.kind === 'clock' || right.kind === 'clock') throw new Error('Keep mz_now() directly on one side of a comparison; put interval arithmetic on the row expression.');
      left = { kind: 'add', left, right };
    }
    return left;
  };
  const atom = (): Predicate => {
    // A leading parenthesis may wrap a scalar expression or an entire condition.
    // Inspect the token after its matching close before choosing the grammar.
    if (peek() === '(') {
      let nesting = 0;
      let end = index;
      do {
        const token = tokens[end++];
        if (!token) throw new Error('Close the parenthesized expression.');
        if (token.text === '(') nesting++;
        if (token.text === ')') nesting--;
      } while (nesting > 0);
      if (!['<', '>', '<=', '>=', '=', '!=', '<>', '+'].includes(tokens[end]?.text ?? '')) {
        if (++depth > 24) throw new Error('Use fewer nested parentheses.');
        take(); const result = conjunction(); expect(')'); depth--; return result;
      }
    }
    if (peek() === 'true' || peek() === 'false') return { kind: 'boolean', value: take().text.toLowerCase() === 'true' };
    const left = arithmetic();
    const operator = take().text;
    if (!['<', '>', '<=', '>=', '=', '!=', '<>'].includes(operator)) throw new Error('Use a comparison operator, with AND between conditions.');
    const right = arithmetic();
    if (left.kind === 'clock' && right.kind === 'clock') throw new Error('Compare mz_now() with a row expression, not another clock call.');
    if ((left.kind === 'clock' || right.kind === 'clock') && ['!=', '<>'].includes(operator)) throw new Error('Materialize temporal filters support =, <, <=, >, and >= with mz_now(); != and <> are not supported.');
    return { kind: 'compare', left, operator, right };
  };
  const conjunction = (): Predicate => {
    const terms = [atom()];
    while (peek() === 'and') { take(); terms.push(atom()); }
    return terms.length === 1 ? terms[0]! : { kind: 'and', terms };
  };
  const result = conjunction();
  if (index !== tokens.length) throw new Error(`Unsupported expression ${tokens[index]!.text}. This maintained query supports AND comparisons; use the diagnostic console for other SELECT queries.`);
  return result;
}

const valueSql = (value: Value): string => value.kind === 'add' ? `(${valueSql(value.left)} + ${valueSql(value.right)})` : value.kind === 'interval' ? `INTERVAL ${value.text}` : value.text;
export function predicateSql(predicate: Predicate): string {
  return predicate.kind === 'and' ? predicate.terms.map(term => `(${predicateSql(term)})`).join(' AND ')
    : predicate.kind === 'boolean' ? String(predicate.value).toUpperCase()
      : `${valueSql(predicate.left)} ${predicate.operator} ${valueSql(predicate.right)}`;
}
export function aggregateSql(predicate: string) {
  return `SELECT c.region, COUNT(*) AS orders, SUM(o.amount) AS total\nFROM orders AS o JOIN customers AS c ON o.customer_id = c.customer_id\nWHERE ${predicateSql(parsePredicate(predicate))}\nGROUP BY c.region ORDER BY c.region`;
}
