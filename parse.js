// FastDrop — from-scratch reimplementation of marked 18.1.3 (GFM, default options),
// written as a direct renderer: one block scan over the document (index-based,
// sticky regexes, no token objects), then a direct inline renderer that returns
// HTML strings. No dependency on marked at runtime.
//
// Design notes (all semantics follow marked's own algorithms, same regexes):
// - Block phase collects compact nodes (kind + inline source strings); the links
//   map is complete before any inline rendering, as in marked's two phases.
// - Inline phase is a single loop over the source with an index pointer; emphasis
//   and strikethrough use marked's delimiter-run algorithm over a masked copy.
// - The block and inline tokenizers use sticky (y) regexes with the leading ^
//   stripped: sticky already forces the match to start at lastIndex, and in this
//   engine ^ only matches at position 0, so a kept ^ would break every match
//   after the first block. The masking / closer-search regexes keep marked's
//   own flags and are run on slices, exactly as marked does.

function C(pat, flags) {
  let t = typeof pat === "string" ? pat : pat.source;
  const api = {
    replace(s, r) {
      let o = typeof r === "string" ? r : r.source;
      o = o.replace(/(^|[^\[])\^/g, "$1");
      t = t.replace(s, o);
      return api;
    },
    getRegex() { return new RegExp(t, flags || ""); },
  };
  return api;
}
function D(factory) {
  const cache = [];
  return (t) => {
    const n = Math.max(0, Math.min(3, t - 1));
    let s = cache[n];
    if (!s) { s = factory(n); cache[n] = s; }
    return s;
  };
}
// Strip ^ anchors that sit at the start of the pattern or at the start of a
// top-level alternative: with the sticky flag the match must start at
// lastIndex anyway, and ^ here only matches position 0. ^ inside character
// classes and escaped ^ are left alone.
function stickySrc(src) {
  let out = "", inClass = false, esc = false, depth = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === "\\") { out += ch; esc = true; continue; }
    if (ch === "[") inClass = true;
    else if (ch === "]") inClass = false;
    else if (ch === "(" && !inClass) depth++;
    else if (ch === ")" && !inClass) depth--;
    if (ch === "^" && !inClass && depth === 0 && (i === 0 || src[i - 1] === "|")) continue;
    out += ch;
  }
  return out;
}
function sticky(re) {
  return new RegExp(stickySrc(re.source), (re.flags.replace("g", "") + "y").replace("yy", "y"));
}

const K = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";

const O = {
  codeRemoveIndent: /^(?: {0,3}\t| {1,4})/gm,
  outputLinkReplace: /\\([\[\]])/g,
  indentCodeCompensation: /^(\s+)(?:```)/,
  beginningSpace: /^\s+/,
  endingHash: /#$/,
  startingSpaceChar: /^ /,
  endingSpaceChar: / $/,
  endingSpaceTabChar: /[ \t]$/,
  nonSpaceChar: /[^ ]/,
  newLineCharGlobal: /\n/g,
  tabCharGlobal: /\t/g,
  leadingSpaceTab: /^[ \t]+/,
  multipleSpaceGlobal: /\s+/g,
  blankLine: /^[ \t]*$/,
  doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
  blockquoteStart: /^ {0,3}>/,
  blockquoteSetextReplace: /\n {0,3}((?:=+|-+)[ \t]*)(?=\n|$)/g,
  blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
  blockquoteMarkerWhitespace: /^( {0,3}>)([ \t]+)/gm,
  listIsTask: /^\[[ xX]\][ \t]+\S/,
  listReplaceTask: /^\[[ xX]\][ \t]+/,
  listTaskCheckbox: /\[[ xX]\]/,
  anyLine: /\n.*\n/,
  hrefBrackets: /^<(.*)>$/,
  tableDelimiter: /[:|]/,
  tableAlignChars: /^\||\| *$/g,
  tableRowBlankLine: /\n[ \t]*$/,
  tableAlignRight: /^ *-+: *$/,
  tableAlignCenter: /^ *:-+: *$/,
  tableAlignLeft: /^ *:-+ *$/,
  startATag: /^<a /i,
  endATag: /^<\/a>/i,
  startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
  endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
  startAngleBracket: /^</,
  endAngleBracket: />$/,
  unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
  punctuation: /^((?![*_])[\s\p{P}\p{S}])/u,
  numericCharacterReference: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));/,
  numericCharacterReferenceOrAmpersand: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  escapeTest: /[&<>"']/,
  escapeReplace: /[&<>"']/g,
  escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
  escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  percentDecode: /%25/g,
  findPipe: /\|/g,
  splitPipe: / \|/,
  slashPipe: /\\\|/g,
  carriageReturn: /\r\n|\r/g,
  notSpaceStart: /^\S*/,
  endingNewline: /\n$/,
  listItemRegex: (a) => new RegExp(`^( {0,3}${a})((?:[ \t][^\\n]*)?(?:\\n|$))`),
  nextBulletRegex: D((a) => new RegExp(`^ {0,${a}}(?:[*+-]|\\d{1,9}[.)])((?:[ \t][^\\n]*)?(?:\\n|$))`)),
  hrRegex: D((a) => new RegExp(`^ {0,${a}}((?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\\*[ \t]*){3,})(?:\\n+|$)`)),
  fencesBeginRegex: D((a) => new RegExp(`^ {0,${a}}(?:\`\`\`|~~~)`)),
  headingBeginRegex: D((a) => new RegExp(`^ {0,${a}}#{1,6}(?:\\s|$)`)),
  htmlBeginRegex: D((a) => new RegExp(`^ {0,${a}}(?:</?(?:${K})(?: +|$|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)`, "i")),
  blockquoteBeginRegex: D((a) => new RegExp(`^ {0,${a}}>`)),
};

// ---- block regexes (GFM) ----
const RE_NEWLINE = /^(?:[ \t]*(?:\n|$))+/;
const RE_CODE = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
const RE_FENCES = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}(?:(?=`)\1`*|(?=~)\1~*) *(?=\n|$)|$)/;
const RE_HR = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
// Non-capturing form of the hr pattern, for substituting into templates
// where a capturing group would shift the group numbering (marked's
// lheading does exactly this).
const RE_HR_NC = / {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
const RE_HEADING = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
const RE_BULLET = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
const RE_LHEADING_TMPL = /^(?!bull |blockCode|fences|blockquote|heading|hr|html|table)((?:.|\n(?!\s*?\n|bull |fences|blockquote|heading|hr|html|table))+?)\n {0,3}(=+|-+)[ \t]*(?:\n+|$)/;
const RE_LHEADING = C(RE_LHEADING_TMPL).replace(/bull/g, RE_BULLET).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/hr/g, RE_HR_NC).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
const RE_PARA_TMPL = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/;
const RE_LABEL = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\\n]|\n(?![ \t]*\n))+/;
const RE_DEF = C(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", RE_LABEL).replace("title", /(?:"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\\n]|\n(?!\n))*'|\((?:\\[\s\S]|[^()\\])*\))/).getRegex();
const RE_LIST = C(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g, RE_BULLET).getRegex();
const RE_COMMENT = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
const RE_HTML = C("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?:[ \\t]+|\\n|/?>|$)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<(?!(?:script|pre|style|textarea)(?![a-z0-9-]))([a-z][a-z0-9-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|</[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$))", "i").replace("comment", RE_COMMENT).replace("tag", K).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
const RE_TABLE = C("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", RE_HR).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}\t)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", " {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag", K).getRegex();
const RE_PARA = C(RE_PARA_TMPL).replace("hr", RE_HR).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", RE_TABLE).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html", " {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag", K).getRegex();
const RE_BLOCKQUOTE = C(/^( {0,3}> ?(?:(?![ \t]*(?:\n|$))(paragraph)|[^\n]*)(?:\n|$))+/).replace("paragraph", RE_PARA).getRegex();
const RE_BLOCK_TEXT = /^[^\n]+/;

// sticky variants used by the block scanner (match must start at lastIndex)
const S_NEWLINE = sticky(RE_NEWLINE);
const S_CODE = sticky(RE_CODE);
const S_FENCES = sticky(RE_FENCES);
const S_HR = sticky(RE_HR);
const S_HEADING = sticky(RE_HEADING);
const S_LHEADING = sticky(RE_LHEADING);
const S_LIST = sticky(RE_LIST);
const S_HTML = sticky(RE_HTML);
const S_DEF = sticky(RE_DEF);
const S_TABLE = sticky(RE_TABLE);
const S_PARA = sticky(RE_PARA);
const S_BLOCK_TEXT = sticky(RE_BLOCK_TEXT);
const S_BLOCKQUOTE = sticky(RE_BLOCKQUOTE);

// ---- inline regexes (GFM) ----
const RE_ESCAPE = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
const RE_CODESPAN = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
const RE_BR = /^( {2,}|\\)\n(?!\s*$)[ \t]*/;
const RX_PUNCT = /[\p{P}\p{S}]/u;
const RX_PUNCTSPACE = /[\s\p{P}\p{S}]/u;
const RX_NOTPUNCTSPACE = /[^\s\p{P}\p{S}]/u;
const RX_PUNCT_GFM = /(?!~)[\p{P}\p{S}]/u;
const RX_PUNCTSPACE_GFM = /(?!~)[\s\p{P}\p{S}]/u;
const RX_NOTPUNCTSPACE_GFM = /(?:[^\s\p{P}\p{S}]|~)/u;
const RX_PUNCT_TEST = C(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, RX_PUNCTSPACE).getRegex();
const RE_EM_LDELIM_TMPL = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/;
const RE_EM_LDELIM = C(RE_EM_LDELIM_TMPL, "u").replace(/punct/g, RX_PUNCT_GFM).getRegex();
const RX_RDELIM_AST_TMPL = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
const RE_EM_RDELIM_AST = C(RX_RDELIM_AST_TMPL, "gu").replace(/notPunctSpace/g, RX_NOTPUNCTSPACE_GFM).replace(/punctSpace/g, RX_PUNCTSPACE_GFM).replace(/punct/g, RX_PUNCT_GFM).getRegex();
const RX_RDELIM_UND_TMPL = "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)";
const RE_EM_RDELIM_UND = C(RX_RDELIM_UND_TMPL, "gu").replace(/notPunctSpace/g, RX_NOTPUNCTSPACE).replace(/punctSpace/g, RX_PUNCTSPACE).replace(/punct/g, RX_PUNCT).getRegex();
const RE_DEL_LDELIM = C(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, RX_PUNCT).getRegex();
const RX_DEL_RDELIM_TMPL = "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)";
const RE_DEL_RDELIM = C(RX_DEL_RDELIM_TMPL, "gu").replace(/notPunctSpace/g, RX_NOTPUNCTSPACE).replace(/punctSpace/g, RX_PUNCTSPACE).replace(/punct/g, RX_PUNCT).getRegex();
const RE_AUTOLINK = C(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
const RE_TAG_COMMENT = C(RE_COMMENT).replace("(?:-->|$)", "-->").getRegex();
const RE_TAG = C("^comment|^</[a-zA-Z][a-zA-Z0-9-]*\\s*>|^<[a-zA-Z][a-zA-Z0-9-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", RE_TAG_COMMENT).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
const RE_BRACKETS = /\[(?:\\[\s\S]|[^\[\]\\])*\]/;
const RE_LABEL_IN = C(/(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/).replace("brackets", RE_BRACKETS).getRegex();
const RE_LINK = C(/^!?\[(label)\]\([ \t\n]*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?[ \t\n]*\)/).replace("label", RE_LABEL_IN).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title", /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\((?:\\[\s\S]|[^)\\])*\)/).getRegex();
const RE_REFLINK = C(/^!?\[(label)\]\[(ref)\]/).replace("label", RE_LABEL_IN).replace("ref", RE_LABEL).getRegex();
const RE_NOLINK = C(/^!?\[(ref)\](?:\[\])?/).replace("ref", RE_LABEL).getRegex();
const RE_REF_SEARCH_LABEL = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\]){1,999}/;
const RE_REF_SEARCH_LBL = C(/(?:[^\[\]\\`]*(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\]))){0,999}?[^\[\]\\`]*?/).replace("brackets", RE_BRACKETS).getRegex();
const RE_REFLINK_SEARCH = C("reflink|nolink(?!\\()", "g").replace("reflink", C(/^!?\[(label)\]\[(ref)\]/).replace("label", RE_REF_SEARCH_LBL).replace("ref", RE_REF_SEARCH_LABEL).getRegex()).replace("nolink", C(/^!?\[(ref)\](?:\[\])?/).replace("ref", RE_REF_SEARCH_LABEL).getRegex()).getRegex();
const RE_PROTOCOL = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
const RE_EMAIL_URL = /[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/;
const RE_EMAIL_PROTO = C(/(?:mailto:email|xmpp:email(?:\/[A-Za-z0-9@.]+)?)/).replace(/email/g, RE_EMAIL_URL).getRegex();
const RE_URL = C(/^emailProtocol|^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("emailProtocol", RE_EMAIL_PROTO).replace("protocol", RE_PROTOCOL).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/).getRegex();
const RE_BACKPEDAL = /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/;
const RE_ANY_PUNCT = C(/\\(punct)/, "gu").replace(/punct/g, RX_PUNCT).getRegex();
const RE_ANY_PUNCT_CODE = C(/(`+)(?:[^`]|[^`][\s\S]*?[^`])\1(?!`)|`+|\\(punct)/, "gu").replace(/punct/g, RX_PUNCT).getRegex();
const RE_BLOCKSKIP = C(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", "(?<!`)()").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
const RE_TEXT = C(/^(?:[^a-zA-Z0-9](?=emailProtocol)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|wwwStart|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9](?=emailProtocol)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))))/).replace("protocol", RE_PROTOCOL).replace(/emailProtocol/g, /(?:mailto|xmpp):/).replace("wwwStart", /(?<![^\s*_~(])www\./).getRegex();

// sticky variants for the inline loop
const S_ESCAPE = sticky(RE_ESCAPE);
const S_TAG = sticky(RE_TAG);
const S_LINK = sticky(RE_LINK);
const S_REFLINK = sticky(RE_REFLINK);
const S_NOLINK = sticky(RE_NOLINK);
const S_EM_LDELIM = sticky(RE_EM_LDELIM);
const S_CODESPAN = sticky(RE_CODESPAN);
const S_BR = sticky(RE_BR);
const S_DEL_LDELIM = sticky(RE_DEL_LDELIM);
const S_AUTOLINK = sticky(RE_AUTOLINK);
const S_URL = sticky(RE_URL);
const S_TEXT = sticky(RE_TEXT);

// ---- string helpers (marked's, verbatim logic) ----
const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function esc(s, encode) {
  if (encode) {
    if (O.escapeTest.test(s)) return s.replace(O.escapeReplace, (ch) => ESC_MAP[ch]);
  } else if (O.escapeTestNoEncode.test(s)) {
    return s.replace(O.escapeReplaceNoEncode, (ch) => ESC_MAP[ch]);
  }
  return s;
}
function unesc(s) {
  if (!O.numericCharacterReference.test(s)) return s;
  return s.replace(O.numericCharacterReferenceOrAmpersand, (m, dec, hex) => {
    if (dec === undefined && hex === undefined) return "&amp;";
    const cp = dec === undefined ? parseInt(hex, 16) : parseInt(dec, 10);
    if (cp === 0 || cp > 1114111 || (cp >= 55296 && cp <= 57343)) return "\uFFFD";
    if (cp === 38) return "&amp;";
    return String.fromCodePoint(cp);
  });
}
function encURI(href) {
  try { return encodeURI(href).replace(O.percentDecode, "%"); } catch { return null; }
}
function normLabel(s) {
  return s.trim().replace(O.multipleSpaceGlobal, " ").toLowerCase().toUpperCase().toLowerCase();
}
function splitRow(s, count) {
  const t = s.replace(O.findPipe, (ch, off, str) => {
    let escaped = false, p = off;
    while (--p >= 0 && str[p] === "\\") escaped = !escaped;
    return escaped ? "|" : " |";
  });
  const parts = t.split(O.splitPipe);
  let i = 0;
  if (parts[0].trim() || parts.shift(), parts.length > 0 && !parts[parts.length - 1]?.trim() && parts.pop(), count) {
    if (parts.length > count) parts.splice(count);
    else while (parts.length < count) parts.push("");
  }
  for (; i < parts.length; i++) parts[i] = parts[i].trim().replace(O.slashPipe, "|");
  return parts;
}
function trimEndChar(s, ch) {
  const n = s.length;
  if (n === 0) return "";
  let k = 0;
  for (; k < n;) {
    const r = s.charAt(n - k - 1);
    if (r === ch) k++;
    else break;
  }
  return s.slice(0, n - k);
}
function trimBlankTail(s) {
  const lines = s.split("\n");
  let t = lines.length - 1;
  for (; t >= 0 && O.blankLine.test(lines[t]);) t--;
  return lines.length - t <= 2 ? s : lines.slice(0, t + 1).join("\n");
}
function expandTabs(s, col) {
  let t = col, out = "";
  for (const ch of s) {
    if (ch === "\t") { const r = 4 - (t % 4); out += " ".repeat(r); t += r; }
    else { out += ch; t++; }
  }
  return out;
}
function parenBalance(s, pair) {
  if (s.indexOf(pair[0]) === -1 && s.indexOf(pair[1]) === -1) return -1;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\") i++;
    else if (s[i] === pair[0]) depth++;
    else if (s[i] === pair[1] && (depth--, depth < 0)) return i;
  }
  return depth > 0 ? -2 : -1;
}
function fenceDedent(raw, text) {
  const m = raw.match(O.indentCodeCompensation);
  if (m === null) return text;
  const ind = m[1];
  return text.split("\n").map((line) => {
    const sp = line.match(O.beginningSpace);
    if (sp === null) return line;
    const [w] = sp;
    return line.slice(Math.min(w.length, ind.length));
  }).join("\n");
}
function linkInText(src, links) {
  if (!src.includes("[")) return false;
  const skip = new RegExp(RE_BLOCKSKIP.source, RE_BLOCKSKIP.flags);
  const search = new RegExp(RE_REFLINK_SEARCH.source, RE_REFLINK_SEARCH.flags);
  let m;
  while ((m = skip.exec(src)) !== null) {
    S_LINK.lastIndex = 0;
    if (S_LINK.test(m[0]) && src.charAt(m.index - 1) !== "!") return true;
  }
  while ((m = search.exec(src)) !== null) {
    const s = m[0], r = s.lastIndexOf("[");
    if (!(s.charAt(0) === "!" || !Object.hasOwn(links, normLabel(s.slice(r + 1, -1)))) && !(r > 1 && linkInText(s.slice(1, r - 1), links))) return true;
  }
  return false;
}
// Masking for the emphasis/delimiter search: replaces link, code-span and
// HTML spans (and unresolvable reference labels) with same-length runs so
// delimiter positions stay aligned with the original source.
function maskReflinks(str, links) {
  const search = new RegExp(RE_REFLINK_SEARCH.source, RE_REFLINK_SEARCH.flags);
  return str.replace(search, (r) => {
    const o = r.lastIndexOf("[");
    if (!Object.hasOwn(links, normLabel(r.slice(o + 1, -1)))) return r;
    if (o > 1 && r.charAt(0) !== "!") {
      const inner = r.slice(1, o - 1);
      if (linkInText(inner, links)) return "[" + maskReflinks(inner, links) + "][" + "a".repeat(r.length - o - 2) + "]";
    }
    return "[" + "a".repeat(r.length - 2) + "]";
  });
}
function maskSrc(src, links) {
  // Fast path: the three masking passes can only change the string when it
  // contains a backslash (escaped punctuation), a backtick (code span), a
  // '[' (reference link) or a '<' (HTML). Otherwise the masked copy is the
  // source itself.
  if (src.indexOf("\\") === -1 && src.indexOf("`") === -1 && src.indexOf("[") === -1 && src.indexOf("<") === -1) return src;
  let t = src;
  if (links && src.includes("[")) t = maskReflinks(t, links);
  t = t.replace(RE_ANY_PUNCT_CODE, (n, s, r) => r ? "+".repeat(n.length) : s ? s + n.slice(s.length, -s.length).replace(/`/g, "+") + s : n);
  t = t.replace(RE_BLOCKSKIP, (n, s, r) => {
    const o = r ? r.length : 0;
    return n.slice(0, o) + "[" + "a".repeat(n.length - o - 2) + "]";
  });
  return t;
}
// Last possible closer index for * / _ (and ~) in a masked source.
function lastCloser(src) {
  const em = { "*": -1, "_": -1 };
  let del = -1;
  const n = src.length;
  for (let s = 0; s < n; s++) {
    const r = src[s];
    if (r !== "*" && r !== "_" && r !== "~") continue;
    const prev = s === 0 ? "\n" : src[s - 1];
    let i = s + 1;
    while (i < n && src[i] === r) i++;
    if (prev !== " " && prev !== "\t" && prev !== "\n" && prev !== "\r" && prev !== "\f") {
      if (r === "~") del = s;
      else em[r] = s;
    }
    s = i - 1;
  }
  return { em, del };
}
const maskCache = new Map();
function maskedInfo(src, links) {
  let info = maskCache.get(src);
  if (info) return info;
  const m = maskSrc(src, links);
  info = { masked: m, closer: lastCloser(m) };
  if (maskCache.size > 64) maskCache.clear();
  maskCache.set(src, info);
  return info;
}

// ---- block scanner ----
// Returns an array of compact nodes. `top` = paragraph blocks allowed,
// `nested` = paragraph-paragraph merging allowed (inside blockquotes).
// Node kinds: space, code{text,lang}, heading{d,src}, hr, bq{children,raw,text},
// list{ordered,start,loose,items:[{children,task,checked}]}, html{text}, def,
// table{head:[{src,align}],rows:[[{src,align}]]}, para{src}, text{src},
// checkbox{checked} (inside list items only). Every node carries `raw`.
function scanBlocks(src, top, nested, links, out = []) {
  const nodes = out;
  const prev = () => nodes.length ? nodes[nodes.length - 1] : undefined;
  let pos = 0;
  let guard = Infinity;
  const execAt = (re, p) => { re.lastIndex = p; return re.exec(src); };
  while (pos < src.length) {
    if (src.length - pos >= guard) throw new Error("Infinite loop on byte: " + src.charCodeAt(pos));
    guard = src.length - pos;
    let m;
    // space
    if ((m = execAt(S_NEWLINE, pos))) {
      const raw = m[0];
      if (raw.length === 1 && prev()) prev().raw += "\n";
      else nodes.push({ k: "space", raw });
      pos += raw.length;
      continue;
    }
    // indented code
    if ((m = execAt(S_CODE, pos))) {
      const raw = trimBlankTail(m[0]);
      const text = raw.replace(O.codeRemoveIndent, "");
      const p = prev();
      if (p && (p.k === "para" || p.k === "text")) {
        p.raw += (p.raw.endsWith("\n") ? "" : "\n") + raw;
        p.src += "\n" + text;
      } else {
        nodes.push({ k: "code", raw, text, lang: "" });
      }
      pos += raw.length;
      continue;
    }
    // fenced code
    if ((m = execAt(S_FENCES, pos))) {
      const raw = m[0];
      const lang = m[2] ? m[2].trim().replace(RE_ANY_PUNCT, "$1") : m[2];
      nodes.push({ k: "code", raw, text: fenceDedent(raw, m[3] || ""), lang });
      pos += raw.length;
      continue;
    }
    // heading
    if ((m = execAt(S_HEADING, pos))) {
      let text = m[2].trim();
      if (O.endingHash.test(text)) {
        const s = trimEndChar(text, "#");
        if (!s || O.endingSpaceTabChar.test(s)) text = s.trim();
      }
      nodes.push({ k: "heading", raw: trimEndChar(m[0], "\n"), d: m[1].length, src: text });
      pos += m[0].length - (m[0].length - trimEndChar(m[0], "\n").length);
      continue;
    }
    // hr
    if ((m = execAt(S_HR, pos))) {
      const raw = trimEndChar(m[0], "\n");
      nodes.push({ k: "hr", raw });
      pos += raw.length;
      continue;
    }
    // blockquote
    if ((m = execAt(S_BLOCKQUOTE, pos))) {
      const bq = scanBlockquote(src, pos, links);
      if (bq) {
        nodes.push(bq.node);
        pos += bq.node.raw.length;
        continue;
      }
    }
    // list
    if ((m = execAt(S_LIST, pos))) {
      const lst = scanList(src, pos, links);
      if (lst) {
        nodes.push(lst.node);
        pos += lst.node.raw.length;
        continue;
      }
    }
    // html block
    if ((m = execAt(S_HTML, pos))) {
      const raw = trimBlankTail(m[0]);
      nodes.push({ k: "html", raw, text: raw, pre: m[1] === "pre" || m[1] === "script" || m[1] === "style" });
      pos += raw.length;
      continue;
    }
    // link reference definition
    if ((m = execAt(S_DEF, pos))) {
      if (!O.startAngleBracket.test(m[2]) && parenBalance(m[2], "()") !== -1) {
        // not a def; fall through to table/lheading/paragraph/text
      } else {
        const raw = trimEndChar(m[0], "\n");
        const tag = normLabel(m[1]);
        const href = m[2] ? m[2].replace(O.hrefBrackets, "$1").replace(RE_ANY_PUNCT, "$1") : "";
        const title = m[3] ? m[3].substring(1, m[3].length - 1).replace(RE_ANY_PUNCT, "$1") : m[3];
        const p = prev();
        if (p && (p.k === "para" || p.k === "text")) {
          p.raw += (p.raw.endsWith("\n") ? "" : "\n") + raw;
          p.src += "\n" + raw;
        } else {
          if (!links[tag]) links[tag] = { href, title };
          nodes.push({ k: "def", raw });
        }
        pos += raw.length;
        continue;
      }
    }
    // table
    if ((m = execAt(S_TABLE, pos))) {
      if (O.tableDelimiter.test(m[2])) {
        const headCells = splitRow(m[1]);
        const aligns = m[2].replace(O.tableAlignChars, "").split("|");
        if (headCells.length === aligns.length) {
          const align = [];
          for (const a of aligns) {
            if (O.tableAlignRight.test(a)) align.push("right");
            else if (O.tableAlignCenter.test(a)) align.push("center");
            else if (O.tableAlignLeft.test(a)) align.push("left");
            else align.push(null);
          }
          const head = headCells.map((c, i) => ({ src: c, align: align[i] }));
          const rows = [];
          if (m[3] && m[3].trim()) {
            for (const line of m[3].replace(O.tableRowBlankLine, "").split("\n")) {
              rows.push(splitRow(line, head.length).map((c, i) => ({ src: c, align: align[i] })));
            }
          }
          const raw = trimEndChar(m[0], "\n");
          nodes.push({ k: "table", raw, head, rows });
          pos += raw.length;
          continue;
        }
      }
      // not a table: fall through
    }
    // setext heading
    if ((m = execAt(S_LHEADING, pos))) {
      const raw = trimEndChar(m[0], "\n");
      nodes.push({ k: "heading", raw, d: m[2].charAt(0) === "=" ? 1 : 2, src: m[1].trim() });
      pos += raw.length;
      continue;
    }
    // paragraph (only at top level of a block context)
    if (top && (m = execAt(S_PARA, pos))) {
      const raw = m[0];
      let text = m[1];
      if (text.charAt(text.length - 1) === "\n") text = text.slice(0, -1);
      const p = prev();
      if (nested && p && p.k === "para") {
        p.raw += (p.raw.endsWith("\n") ? "" : "\n") + raw;
        p.src += "\n" + text;
      } else {
        nodes.push({ k: "para", raw, src: text });
      }
      pos += raw.length;
      continue;
    }
    // text
    if ((m = execAt(S_BLOCK_TEXT, pos))) {
      const raw = m[0];
      const p = prev();
      if (p && p.k === "text") {
        p.raw += (p.raw.endsWith("\n") ? "" : "\n") + raw;
        p.src += "\n" + raw;
      } else {
        nodes.push({ k: "text", raw, src: raw });
      }
      pos += raw.length;
      continue;
    }
    throw new Error("Infinite loop on byte: " + src.charCodeAt(pos));
  }
  return nodes;
}

function scanBlockquote(src, pos, links) {
  S_BLOCKQUOTE.lastIndex = pos;
  const t = S_BLOCKQUOTE.exec(src);
  if (!t) return null;
  let lines = trimEndChar(t[0], "\n").split("\n");
  let s = "", r = "";
  const children = [];
  while (lines.length > 0) {
    let started = false;
    const chunk = [];
    let p = 0;
    for (; p < lines.length; p++) {
      if (O.blockquoteStart.test(lines[p])) { chunk.push(lines[p]); started = true; }
      else if (!started) chunk.push(lines[p]);
      else break;
    }
    lines = lines.slice(p);
    const h = chunk.join("\n");
    const u = h.replace(O.blockquoteMarkerWhitespace, (g, b, m) => b + expandTabs(m, b.length)).replace(O.blockquoteSetextReplace, "\n    $1").replace(O.blockquoteSetextReplace2, "");
    s = s ? s + "\n" + h : h;
    r = r ? r + "\n" + u : u;
    const sub = scanBlocks(u, true, true, links, children);
    if (lines.length === 0) break;
    const k = children[children.length - 1];
    if (!k) break;
    if (k.k === "code" || k.k === "heading" || k.k === "hr" || k.k === "html" || k.k === "table") break;
    if (k.k === "bq") {
      const b = lines.join("\n");
      const mm = k.raw + "\n" + b.replace(O.blockquoteSetextReplace2, "");
      const f = scanBlockquote(mm, 0, links);
      if (!f) break;
      children[children.length - 1] = f.node;
      const y = mm.substring(f.node.raw.length).replace(/^\n/, "");
      const R = y ? y.split("\n").length : 0;
      const A = R ? lines.slice(0, -R) : lines;
      if (A.length > 0) s = s + "\n" + A.join("\n");
      r = r.substring(0, r.length - k.text.length) + f.node.text;
      lines = lines.slice(A.length);
      if (lines.length > 0 && O.blockquoteStart.test(lines[0])) continue;
      break;
    } else if (k.k === "list") {
      const b = k.raw + "\n" + lines.join("\n");
      const mm = scanList(b, 0, links);
      if (!mm) break;
      children[children.length - 1] = mm.node;
      const f = mm.node.raw.length > k.raw.length ? b.slice(k.raw.length + 1, mm.node.raw.length).split("\n").length : 0;
      if (f > 0) {
        const y = lines.slice(0, f).join("\n");
        s = s + "\n" + y;
        r = r + "\n" + y;
      }
      lines = lines.slice(f);
      continue;
    }
  }
  return { node: { k: "bq", raw: s, text: r, children } };
}

function scanList(src, pos, links) {
  const listStart = pos;
  S_LIST.lastIndex = pos;
  const t = S_LIST.exec(src);
  if (!t) return null;
  const bullet = t[1].trim();
  const ordered = bullet.length > 1;
  const start = ordered ? +bullet.slice(0, -1) : "";
  const bulletPat = ordered ? `\\d{1,9}\\${bullet.slice(-1)}` : `\\${bullet}`;
  const itemRe = new RegExp(stickySrc(O.listItemRegex(bulletPat).source), "y");
  let loose = false;
  let sawDoubleBlank = false;
  const items = [];
  while (pos < src.length) {
    itemRe.lastIndex = pos;
    const it = itemRe.exec(src);
    if (!it) break;
    S_HR.lastIndex = pos;
    if (S_HR.test(src)) break;
    const itemStart = pos;
    pos += it[0].length;
    const g = (it[2] || "").split("\n", 1)[0];
    const b = it[1].length;
    let mText = g.replace(O.leadingSpaceTab, (v) => expandTabs(v, b));
    const f0 = src.slice(pos).split("\n", 1)[0];
    let y0 = !mText.trim();
    let R = 0;
    let d = "";
    let empty = false;
    if (y0) {
      R = b + 1;
    } else {
      R = mText.search(O.nonSpaceChar);
      R = R > 4 ? 1 : R;
      d = mText.slice(R);
      R += b;
    }
    if (y0 && O.blankLine.test(f0)) {
      pos = Math.min(pos + f0.length + 1, src.length);
      empty = true;
    }
    if (!empty) {
      const vRe = O.nextBulletRegex(R);
      const qRe = O.hrRegex(R);
      const eeRe = O.fencesBeginRegex(R);
      const teRe = O.headingBeginRegex(R);
      const mRe = O.htmlBeginRegex(R);
      const neRe = O.blockquoteBeginRegex(R);
      while (pos < src.length) {
        const U = src.slice(pos).split("\n", 1)[0];
        const f = U;
        const Z = f.replace(O.leadingSpaceTab, (me) => expandTabs(me, 0));
        if (eeRe.test(f) || teRe.test(f) || mRe.test(f) || neRe.test(f) || vRe.test(f) || qRe.test(f)) break;
        if (Z.search(O.nonSpaceChar) >= R || !f.trim()) {
          d += "\n" + Z.slice(R);
        } else {
          if (y0 || mText.replace(O.tabCharGlobal, "    ").search(O.nonSpaceChar) >= 4 || eeRe.test(mText) || teRe.test(mText) || mRe.test(mText) || qRe.test(mText)) break;
          const qe = /^ {0,3}(?:=+|-+) *$/.test(f) && RE_LHEADING.test(mText + "\n" + f) ? `    ${Z.replace(/^ {0,3}/, "")}` : f;
          d += "\n" + qe;
        }
        // y is !f.trim() for the next iteration; mText becomes the stripped line
        pos = Math.min(pos + U.length + 1, src.length);
        mText = Z.slice(R);
        // NOTE: y0 is only the first line's emptiness in marked's code the
        // variable is reassigned per line (y = !f.trim()); replicate via a
        // local that the loop above reads through `y0` only on the first
        // pass — see the `y` handling in the else branch: it uses the
        // current line's y, tracked here:
        y0 = !f.trim();
      }
    }
    const itemRaw = src.slice(itemStart, pos);
    if (!loose) {
      if (sawDoubleBlank) loose = true;
      else if (O.doubleBlankLine.test(itemRaw)) sawDoubleBlank = true;
    }
    items.push({ raw: itemRaw, task: O.listIsTask.test(d), text: d });
  }
  const last = items[items.length - 1];
  if (!last) return null;
  last.raw = last.raw.trimEnd();
  last.text = last.text.trimEnd();
  const listRaw = src.slice(listStart, pos).trimEnd();
  for (const item of items) {
    item.children = scanBlocks(item.text, false, false, links);
    if (!loose) {
      const spaces = item.children.filter((n) => n.k === "space");
      if (spaces.length > 0 && spaces.some((n) => O.anyLine.test(n.raw))) loose = true;
    }
  }
  for (const item of items) {
    const d0 = item.children[0];
    if (item.task && (d0 && (d0.k === "text" || d0.k === "para"))) {
      item.text = item.text.replace(O.listReplaceTask, "");
      d0.raw = d0.raw.replace(O.listReplaceTask, "");
      d0.src = d0.src.replace(O.listReplaceTask, "");
      const ck = O.listTaskCheckbox.exec(item.raw);
      if (ck) {
        const cbRaw = ck[0] + " ";
        item.checked = ck[0] !== "[ ]";
        if (loose) {
          d0.raw = cbRaw + d0.raw;
          d0.checkbox = item.checked;
        } else {
          item.children.unshift({ k: "checkbox", raw: cbRaw, checked: item.checked });
        }
      }
    } else if (item.task) {
      item.task = false;
    }
  }
  if (loose) {
    for (const item of items) {
      for (const n of item.children) if (n.k === "text") n.k = "para";
    }
  }
  return { node: { k: "list", raw: listRaw, ordered, start, loose, items: items.map((it) => ({ children: it.children, task: it.task, checked: it.checked })) } };
}

// ---- inline rendering (direct to HTML; no token objects) ----
// Per-inline-job state, threaded in document order.
function newInlineState() {
  return { inLink: false, inRawBlock: false, linkEmitted: false, linkParenPossible: true };
}
// marked's fe(): last possible closer indices in a masked source.
function closerInfo(masked) {
  const em = { "*": -1, _: -1 };
  let del = -1;
  const n = masked.length;
  for (let s = 0; s < n; s++) {
    const r = masked[s];
    if (r !== "*" && r !== "_" && r !== "~") continue;
    const o = s === 0 ? "\n" : masked[s - 1];
    let i = s + 1;
    for (; i < n && masked[i] === r;) i++;
    if (o !== " " && o !== "\t" && o !== "\n" && o !== "\r" && o !== "\f") {
      if (r === "~") del = s; else em[r] = s;
    }
    s = i - 1;
  }
  return { em, del };
}
// marked's Be(): does the label contain a "<" that opens a tag/autolink
// extending past the end of the label? src = remaining source, pos = start,
// label = m[1], offset = 1 ("[") or 2 ("![").
function hasLinkInLabel(src, pos, label, offset) {
  if (!label.includes("<")) return false;
  for (let s = 0; s < label.length; s++) {
    if (label[s] === "\\") { s++; continue; }
    if (label[s] === "`") {
      const i = RE_CODESPAN.exec(label.slice(s));
      if (i) { s += i[0].length - 1; continue; }
    }
    if (label[s] !== "<") continue;
    const r = src.slice(pos + offset + s);
    const o = RE_TAG.exec(r) || RE_AUTOLINK.exec(r);
    if (o) {
      if (o[0].length > label.length - s) return true;
      s += o[0].length - 1;
    }
  }
  return false;
}
// marked's De() + Parser.link/image, fused: renders a link/image whose
// label text is `m[1]`. Returns {html, consumed} or null (rejected: the
// label itself emitted a link and this is not an image).
function finishLinkOrImage(m, isImage, href, title, raw, links, st, plain) {
  const label = m[1].replace(O.outputLinkReplace, "$1");
  const savedInLink = st.inLink, savedEmitted = st.linkEmitted, savedRaw = st.inRawBlock;
  st.inLink = true; st.linkEmitted = false;
  const inner = renderInline(label, links, st, isImage);
  const k = st.linkEmitted;
  st.linkEmitted = savedEmitted; st.inLink = savedInLink;
  if (!isImage) {
    if (k) { st.inRawBlock = savedRaw; return null; }
    st.linkEmitted = true;
  }
  if (plain) return { html: inner, consumed: raw.length };
  const clean = encURI(href);
  if (isImage) {
    if (clean === null) return { html: esc(inner), consumed: raw.length };
    let o = `<img src="${esc(clean)}" alt="${esc(inner)}"`;
    if (title) o += ` title="${esc(title)}"`;
    return { html: o + ">", consumed: raw.length };
  }
  if (clean === null) return { html: inner, consumed: raw.length };
  let o = `<a href="${esc(clean)}"`;
  if (title) o += ` title="${esc(title)}"`;
  return { html: o + ">" + inner + "</a>", consumed: raw.length };
}
// marked's Tokenizer.link, fused with De(). Returns {html, consumed} or null.
function tryInlineLink(m, src, pos, links, st, plain) {
  const isImage = m[0].charAt(0) === "!";
  const n = isImage ? 2 : 1;
  if (hasLinkInLabel(src, pos, m[1], n)) return null;
  const s = m[2].trim();
  let raw = m[0], href = m[2], title = m[3];
  if (O.startAngleBracket.test(s)) {
    if (!O.endAngleBracket.test(s)) return null;
    const l = trimEndChar(s.slice(0, -1), "\\");
    if ((s.length - l.length) % 2 === 0) return null;
  } else {
    const l = parenBalance(m[2], "()");
    if (l === -2) return null;
    if (l > -1) {
      const h = (isImage ? 5 : 4) + m[1].length + l;
      href = m[2].substring(0, l);
      raw = m[0].substring(0, h).trim();
      title = "";
    }
  }
  const r = trimEndChar(raw.slice(0, -1), "\\");
  if ((raw.length - r.length) % 2 === 0) return null;
  let o = href.trim();
  const i = title ? title.slice(1, -1) : "";
  if (O.startAngleBracket.test(o)) o = o.slice(1, -1);
  return finishLinkOrImage(m, isImage, o && o.replace(RE_ANY_PUNCT, "$1"), i && i.replace(RE_ANY_PUNCT, "$1"), raw, links, st, plain);
}
// marked's Tokenizer.reflink (handles reflink + nolink). Returns
// {html, consumed} or null (Be() failed -> fall through).
function tryReflink(m, src, pos, links, st, plain) {
  const isImage = m[0].charAt(0) === "!";
  const s = isImage ? 2 : 1;
  if (hasLinkInLabel(src, pos, m[1], s)) return null;
  const r = links[normLabel(m[2] || m[1])];
  if (!r) {
    const o = m[0].charAt(0);
    return { html: plain ? o : esc(o), consumed: 1 };
  }
  return finishLinkOrImage(m, isImage, r.href, r.title, m[0], links, st, plain);
}
// marked's Tokenizer.emStrong, fused with Parser.em/strong.
// getMasked = lazy masked source of this inline job; getFe = lazy closer
// info; pos = current offset; lastChar = last char of the previous text
// token (""). Returns {html, consumed} or null.
function tryEmStrong(src, pos, getMasked, getFe, lastChar, links, st, plain) {
  S_EM_LDELIM.lastIndex = pos;
  const s0 = S_EM_LDELIM.exec(src);
  if (!s0 || (!s0[1] && !s0[2] && !s0[3] && !s0[4])) return null;
  const masked = getMasked();
  const fe = getFe();
  const r = s0[0][0];
  const o = lastChar === r;
  const i = pos; // masked.length === src.length, so the offset is pos
  let n = lastChar;
  let l = i;
  for (; l > 0 && masked[l - 1] === r;) l--;
  const p = [...masked.slice(Math.max(0, l - 2), l)].at(-1) ?? "";
  const h = p === "*" || p === "_" || !!O.punctuation.exec(p);
  if (l < i) n = p;
  const u = l < i ? h : !!O.punctuation.exec(n);
  if (s0[4] && n.match(O.unicodeAlphaNumeric)) return null;
  const d = s0[1] || s0[3] || "";
  if (!d || !n || u) {
    const k = [...s0[0]].length - 1;
    let g, b, m = k, f = 0;
    const y = i - l + k;
    const R = !!p.trim() && (!!d || (r === "*" && !h));
    if (r !== "*" && r !== "_") return null;
    const A = r === "*" ? RE_EM_RDELIM_AST : RE_EM_RDELIM_UND;
    const v = fe.em[r];
    const Q = i + k;
    if (v < Q) return null;
    const t = masked.slice(pos + k);
    const ee = v - Q;
    A.lastIndex = 0;
    let s;
    while ((s = A.exec(t)) !== null && !(s.index > ee)) {
      g = s[1] || s[2] || s[3] || s[4] || s[5] || s[6];
      if (!g) continue;
      b = [...g].length;
      if (s[3] || s[4]) { m += b; continue; }
      else if (s[5] || s[6] || R) {
        if (o && (s[5] || s[6])) break;
        if (y % 3 && !((y + b) % 3)) { f += b; continue; }
      }
      m -= b;
      if (m > 0) continue;
      b = Math.min(b, b + m + f);
      const te = [...s[0]][0].length;
      const M = src.slice(pos, pos + k + s.index + te + b);
      if (Math.min(k, b) % 2) {
        const U = M.slice(1, -1);
        const inner = renderInline(U, links, st, plain);
        return { html: plain ? inner : "<em>" + inner + "</em>", consumed: M.length };
      }
      const ne = M.slice(2, -2);
      const inner = renderInline(ne, links, st, plain);
      return { html: plain ? inner : "<strong>" + inner + "</strong>", consumed: M.length };
    }
  }
  return null;
}
// marked's Tokenizer.del, fused with Parser.del. Returns {html, consumed} or null.
function tryDel(src, pos, getMasked, getFe, lastChar, links, st, plain) {
  S_DEL_LDELIM.lastIndex = pos;
  const s0 = S_DEL_LDELIM.exec(src);
  if (!s0) return null;
  if (!(s0[1] || "") || !lastChar || O.punctuation.exec(lastChar)) {
    const masked = getMasked();
    const fe = getFe();
    const o = [...s0[0]].length - 1;
    let p = o;
    const u = fe.del;
    const d = pos + o;
    if (u < d) return null;
    const t = masked.slice(pos + o);
    const k = u - d;
    RE_DEL_RDELIM.lastIndex = 0;
    let s;
    while ((s = RE_DEL_RDELIM.exec(t)) !== null && !(s.index > k)) {
      const it = s[1] || s[2] || s[3] || s[4] || s[5] || s[6];
      if (!it) continue;
      let l = [...it].length;
      if (l !== o) continue;
      if (s[3] || s[4]) { p += l; continue; }
      p -= l;
      if (p > 0) continue;
      l = Math.min(l, l + p);
      const g = [...s[0]][0].length;
      const b = src.slice(pos, pos + o + s.index + g + l);
      const inner = renderInline(b.slice(o, -o), links, st, plain);
      return { html: plain ? inner : "<del>" + inner + "</del>", consumed: b.length };
    }
  }
  return null;
}

// Main inline loop (marked's Lexer#t order: escape, tag, link, reflink,
// emStrong, codespan, br, del, autolink, url, text). Renders directly to
// HTML (plain=true renders to plain text, for image alt attributes).
// A character dispatch skips the tokenizers that cannot match at the
// current character, so plain text is consumed by one text match; the
// masked source and closer info are computed lazily, only when a
// delimiter run is actually attempted.
function renderInline(src, links, st, plain = false) {
  const savedLPP = st.linkParenPossible;
  st.linkParenPossible = savedLPP && src.includes(")");
  let masked = null, fe = null;
  const getMasked = () => (masked ?? (masked = (src.includes("*") || src.includes("_") || src.includes("~")) ? maskSrc(src, links) : src));
  const getFe = () => (fe || (fe = closerInfo(getMasked())));
  let out = "";
  let pos = 0;
  let lastChar = "";
  let prevText = false;
  const execAt = (re, p) => { re.lastIndex = p; return re.exec(src); };
  const textAt = () => {
    const m = execAt(S_TEXT, pos);
    if (!m) return false;
    const raw = m[0];
    if (plain) {
      // plain mode: entity-decode unless inside a raw block (unesc() only
      // changes strings containing a numeric character reference, i.e. '&')
      out += (st.inRawBlock || raw.indexOf("&") === -1) ? raw : unesc(raw);
    } else if (st.inRawBlock) {
      out += raw;
    } else if (raw.indexOf("&") === -1 && raw.indexOf("<") === -1 && raw.indexOf(">") === -1 && raw.indexOf('"') === -1 && raw.indexOf("'") === -1) {
      // no escapable characters: unesc() and esc() are both no-ops here
      out += raw;
    } else {
      out += esc(unesc(raw));
    }
    if (!raw.endsWith("_")) lastChar = raw.slice(-1);
    prevText = true;
    pos += raw.length;
    return true;
  };
  while (pos < src.length) {
    if (!prevText) lastChar = "";
    prevText = false;
    let m;
    const ch = src.charCodeAt(pos);
    if (ch === 92) { // backslash: escape, then hard break
      if ((m = execAt(S_ESCAPE, pos))) { out += plain ? m[1] : esc(m[1]); pos += m[0].length; continue; }
      if ((m = execAt(S_BR, pos))) { out += plain ? "" : "<br>"; pos += m[0].length; continue; }
    } else if (ch === 60) { // <: html tag, then autolink
      if ((m = execAt(S_TAG, pos))) {
        if (!st.inLink && O.startATag.test(m[0])) st.inLink = true;
        else if (st.inLink && O.endATag.test(m[0])) st.inLink = false;
        if (!st.inRawBlock && O.startPreScriptTag.test(m[0])) st.inRawBlock = true;
        else if (st.inRawBlock && O.endPreScriptTag.test(m[0])) st.inRawBlock = false;
        out += m[0];
        pos += m[0].length;
        continue;
      }
      if ((m = execAt(S_AUTOLINK, pos))) {
        let text, href;
        if (m[2] === "@") { text = m[1]; href = "mailto:" + m[1]; }
        else { text = m[1]; href = m[1]; }
        const clean = encURI(href);
        if (plain) out += text;
        else if (clean === null) out += esc(text, true);
        else out += `<a href="${esc(clean, true)}">${esc(text, true)}</a>`;
        pos += m[0].length;
        continue;
      }
    } else if (ch === 91 || ch === 33) { // [ or !: inline link, then reference link
      if (st.linkParenPossible && (m = execAt(S_LINK, pos))) {
        const res = tryInlineLink(m, src, pos, links, st, plain);
        if (res) { out += res.html; pos += res.consumed; continue; }
      }
      if ((m = execAt(S_REFLINK, pos)) || (m = execAt(S_NOLINK, pos))) {
        const res = tryReflink(m, src, pos, links, st, plain);
        if (res) { out += res.html; pos += res.consumed; continue; }
      }
    } else if (ch === 42 || ch === 95) { // * or _: emphasis / strong
      const res = tryEmStrong(src, pos, getMasked, getFe, lastChar, links, st, plain);
      if (res) { out += res.html; pos += res.consumed; continue; }
    } else if (ch === 96) { // `: code span
      if ((m = execAt(S_CODESPAN, pos))) {
        let text = m[2].replace(O.newLineCharGlobal, " ");
        if (O.nonSpaceChar.test(text) && O.startingSpaceChar.test(text) && O.endingSpaceChar.test(text)) text = text.substring(1, text.length - 1);
        out += plain ? text : "<code>" + esc(text, true) + "</code>";
        pos += m[0].length;
        continue;
      }
    } else if (ch === 126) { // ~: strikethrough
      const res = tryDel(src, pos, getMasked, getFe, lastChar, links, st, plain);
      if (res) { out += res.html; pos += res.consumed; continue; }
    } else if (ch === 32) { // space: hard break (two or more spaces + newline)
      if ((m = execAt(S_BR, pos))) { out += plain ? "" : "<br>"; pos += m[0].length; continue; }
    } else if (!st.inLink && ((ch >= 48 && ch <= 57) || (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122))) { // word char: extended autolink (URL / email)
      if ((m = execAt(S_URL, pos))) {
        let text, href;
        if (m[2] === "@") { text = m[0]; href = "mailto:" + m[0]; }
        else {
          let r;
          do { r = m[0]; m[0] = RE_BACKPEDAL.exec(m[0])?.[0] ?? ""; } while (r !== m[0]);
          text = m[0];
          href = m[1] === "www." ? "http://" + m[0] : m[0];
        }
        const clean = encURI(href);
        if (plain) out += text;
        else if (clean === null) out += esc(text, true);
        else out += `<a href="${esc(clean, true)}">${esc(text, true)}</a>`;
        pos += m[0].length;
        continue;
      }
    }
    // text (also reached when the dispatched tokenizers above fail)
    if (textAt()) continue;
    // fallback: single char (should not happen; S_TEXT matches >= 1 char)
    const c = src[pos];
    out += plain ? c : esc(c);
    pos += 1;
  }
  st.linkParenPossible = savedLPP;
  return out;
}

// ---- block rendering (marked's Parser, fused) ----
function checkboxHtml(checked) {
  return `<input ${checked ? 'checked="" ' : ""}disabled="" type="checkbox"> `;
}
function tableCell(c, isHead, links, st) {
  const tag = isHead ? "th" : "td";
  const inner = renderInline(c.src, links, st);
  return (c.align ? `<${tag} align="${c.align}">` : `<${tag}>`) + inner + `</${tag}>\n`;
}
function renderBlocks(nodes, links, st) {
  let out = "";
  for (const n of nodes) {
    switch (n.k) {
      case "space":
      case "def":
        break;
      case "code": {
        const lang = (n.lang || "").match(O.notSpaceStart)?.[0];
        const text = n.text ? n.text.replace(O.endingNewline, "") + "\n" : "";
        if (lang) out += `<pre><code class="language-${esc(lang)}">${esc(text, true)}</code></pre>\n`;
        else out += `<pre><code>${esc(text, true)}</code></pre>\n`;
        break;
      }
      case "heading":
        out += `<h${n.d}>${renderInline(n.src, links, st)}</h${n.d}>\n`;
        break;
      case "hr":
        out += "<hr>\n";
        break;
      case "bq":
        out += `<blockquote>\n${renderBlocks(n.children, links, st)}</blockquote>\n`;
        break;
      case "list": {
        const tag = n.ordered ? "ol" : "ul";
        const startAttr = n.ordered && n.start !== 1 ? ` start="${n.start}"` : "";
        let items = "";
        for (const it of n.items) items += "<li>" + renderBlocks(it.children, links, st) + "</li>\n";
        out += `<${tag}${startAttr}>\n${items}</${tag}>\n`;
        break;
      }
      case "checkbox":
        out += checkboxHtml(n.checked);
        break;
      case "html":
        out += n.text;
        break;
      case "table": {
        let head = "";
        for (const c of n.head) head += tableCell(c, true, links, st);
        let body = "";
        for (const row of n.rows) {
          let cells = "";
          for (const c of row) cells += tableCell(c, false, links, st);
          body += `<tr>\n${cells}</tr>\n`;
        }
        if (body) body = `<tbody>${body}</tbody>`;
        out += `<table>\n<thead>\n<tr>\n${head}</tr>\n</thead>\n${body}</table>\n`;
        break;
      }
      case "para": {
        const cb = n.checkbox !== undefined ? checkboxHtml(n.checkbox) : "";
        out += `<p>${cb}${renderInline(n.src, links, st)}</p>\n`;
        break;
      }
      case "text": {
        const cb = n.checkbox !== undefined ? checkboxHtml(n.checkbox) : "";
        out += cb + renderInline(n.src, links, st);
        break;
      }
    }
  }
  return out;
}

// ---- public entry point: exactly marked 18.1.3, default options, GFM on ----
export function parse(src, options = {}) {
  src = src.replace(O.carriageReturn, "\n");
  const links = {};
  const nodes = scanBlocks(src, true, false, links);
  const st = newInlineState();
  return renderBlocks(nodes, links, st);
}
export default parse;
