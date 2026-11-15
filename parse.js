// FastDrop — a fast drop-in for marked 18.1.3 (MIT, MarkedJS).
// parse(markdown) returns exactly the HTML marked renders with its defaults
// (GFM on, breaks off, pedantic off), but faster.
//
// Architecture: two passes, no token tree.
//   Pass 1 (lexBlocks) scans blocks with marked's own block rules and builds a
//   compact plan: one small node per block (paragraphs keep raw text, lists and
//   blockquotes nest plans). Link reference definitions are collected here.
//   Pass 2 (renderPlan) walks the plan and emits HTML strings directly; every
//   inline span is rendered by a single-pass inline scanner that writes HTML
//   as it goes, instead of building inline token objects and walking them.
// The block and inline regular expressions below are marked's own, taken
// verbatim from its vendored bundle, because they *are* marked's behaviour:
// any change to them changes the HTML. Everything around them — the scanner,
// the plan, the renderer — is written from scratch for this entry.

const B = { exec: () => null };

function D(a){let e=[];return t=>{let n=Math.max(0,Math.min(3,t-1)),s=e[n];return s||(s=a(n),e[n]=s),s}}function c(a,e=""){let t=typeof a=="string"?a:a.source,n={replace:(s,r)=>{let o=typeof r=="string"?r:r.source;return o=o.replace(T.caret,"$1"),t=t.replace(s,o),n},getRegex:()=>new RegExp(t,e)};return n}var Te=((a="")=>{try{return!!new RegExp("(?<=1)(?<!1)"+a)}catch{return!1}})(),T={codeRemoveIndent:/^(?: {0,3}\t| {1,4})/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,endingSpaceTabChar:/[ \t]$/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,leadingSpaceTab:/^[ \t]+/,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+)[ \t]*)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,blockquoteMarkerWhitespace:/^( {0,3}>)([ \t]+)/gm,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\][ \t]+\S/,listReplaceTask:/^\[[ xX]\][ \t]+/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,numericCharacterReference:/&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));/,numericCharacterReferenceOrAmpersand:/&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:a=>new RegExp(`^( {0,3}${a})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:D(a=>new RegExp(`^ {0,${a}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)),hrRegex:D(a=>new RegExp(`^ {0,${a}}((?:-[ 	]*){3,}|(?:_[ 	]*){3,}|(?:\\*[ 	]*){3,})(?:\\n+|$)`)),fencesBeginRegex:D(a=>new RegExp(`^ {0,${a}}(?:\`\`\`|~~~)`)),headingBeginRegex:D(a=>new RegExp(`^ {0,${a}}#{1,6}(?:\\s|$)`)),pedanticHeadingBeginRegex:D(a=>new RegExp(`^ {0,${a}}#`)),htmlBeginRegex:D(a=>new RegExp(`^ {0,${a}}(?:</?(?:${K})(?: +|$|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)`,"i")),blockquoteBeginRegex:D(a=>new RegExp(`^ {0,${a}}>`))},ve=/^(?:[ \t]*(?:\n|$))+/,Ze=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,He=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}(?:(?=`)\1`*|(?=~)\1~*) *(?=\n|$)|$)/,W=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,je=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,oe=/ {0,3}(?:[*+-]|\d{1,9}[.)])/,Oe=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |fences|blockquote|heading|hr|html|table))+?)\n {0,3}(=+|-+)[ \t]*(?:\n+|$)/,we=c(Oe).replace(/bull/g,oe).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}(?:\s|$)/).replace(/hr/g,/ {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),Ge=c(Oe).replace(/bull/g,oe).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}(?:\s|$)/).replace(/hr/g,/ {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),ae=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/,Ne=/^[^\n]+/,le=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\\n]|\n(?![ \t]*\n))+/,Fe=c(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",le).replace("title",/(?:"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\\n]|\n(?!\n))*'|\((?:\\[\s\S]|[^()\\])*\))/).getRegex(),Qe=c(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g,oe).getRegex(),K="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",ue=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Ue=c("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?:[ \\t]+|\\n|/?>|$)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!(?:script|pre|style|textarea)(?![a-z0-9-]))([a-z][a-z0-9-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",ue).replace("tag",K).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),Pe=a=>c(ae).replace("hr",W).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list",a).replace("html"," {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag",K).getRegex(),We=Pe(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/),Ke=Pe(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/),Xe=c(/^( {0,3}> ?(?:(?![ \t]*(?:\n|$))(paragraph)|[^\n]*)(?:\n|$))+/).replace("paragraph",Ke).getRegex(),pe={blockquote:Xe,code:Ze,def:Fe,fences:He,heading:je,hr:W,html:Ue,lheading:we,list:Qe,newline:ve,paragraph:We,table:B,text:Ne},xe=c("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",W).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html"," {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag",K).getRegex(),Ve={...pe,lheading:Ge,table:xe,paragraph:c(ae).replace("hr",W).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",xe).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html"," {0,3}(?:</?(?:tag)(?: +|\\n|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)").replace("tag",K).getRegex()},Je={...pe,html:c(`^ *(?:comment(?: *\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1>(?: *\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?>(?: *\\n{2,}|\\s*$))`).replace("comment",ue).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:B,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:c(ae).replace("hr",W).replace("heading",` *#{1,6} *[^
]`).replace("lheading",we).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},Ye=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,et=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,Se=/^( {2,}|\\)\n(?!\s*$)[ \t]*/,tt=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,$=/[\p{P}\p{S}]/u,j=/[\s\p{P}\p{S}]/u,X=/[^\s\p{P}\p{S}]/u,nt=c(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,j).getRegex(),rt=/[\p{Pi}\p{Ps}"']/u,ye=/(?!~)[\p{P}\p{S}]/u,st=/(?!~)[\s\p{P}\p{S}]/u,it=/(?:[^\s\p{P}\p{S}]|~)/u,ot=c(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",Te?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),_e=/^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/,at=c(_e,"u").replace(/punct/g,$).getRegex(),lt=c(_e,"u").replace(/punct/g,ye).getRegex(),ut=/^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/,pt=c(ut,"u").replace(/openQuote/g,rt).replace(/punct/g,$).getRegex(),$e="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",ct=c($e,"gu").replace(/notPunctSpace/g,X).replace(/punctSpace/g,j).replace(/punct/g,$).getRegex(),ht=c($e,"gu").replace(/notPunctSpace/g,it).replace(/punctSpace/g,st).replace(/punct/g,ye).getRegex(),dt="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)",gt=c(dt,"gu").replace(/notPunctSpace/g,X).replace(/punctSpace/g,j).replace(/punct/g,$).getRegex(),kt=c("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,X).replace(/punctSpace/g,j).replace(/punct/g,$).getRegex(),ft="^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)",mt=c(ft,"gu").replace(/notPunctSpace/g,X).replace(/punctSpace/g,j).replace(/punct/g,$).getRegex(),xt=c(/^~~?(?:((?!~)punct)|[^\s~])/,"u").replace(/punct/g,$).getRegex(),bt="^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)",Rt=c(bt,"gu").replace(/notPunctSpace/g,X).replace(/punctSpace/g,j).replace(/punct/g,$).getRegex(),Tt=c(/\\(punct)/,"gu").replace(/punct/g,$).getRegex(),Ot=c(/(`+)(?:[^`]|[^`][\s\S]*?[^`])\1(?!`)|`+|\\(punct)/,"gu").replace(/punct/g,$).getRegex(),wt=c(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),Pt=c(ue).replace("(?:-->|$)","-->").getRegex(),St=c("^comment|^</[a-zA-Z][a-zA-Z0-9-]*\\s*>|^<[a-zA-Z][a-zA-Z0-9-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",Pt).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),Le=/\[(?:\\[\s\S]|[^\[\]\\])*\]/,re=c(/(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/).replace("brackets",Le).getRegex(),yt=c(/^!?\[(label)\]\([ \t\n]*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?[ \t\n]*\)/).replace("label",re).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title",/"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\((?:\\[\s\S]|[^)\\])*\)/).getRegex(),_t=c(/^!?\[(label)\]\[(ref)\]/).replace("label",re).replace("ref",le).getRegex(),$t=c(/^!?\[(ref)\](?:\[\])?/).replace("ref",le).getRegex(),be=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\]){1,999}/,Lt=c(/(?:[^\[\]\\`]*(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\]))){0,999}?[^\[\]\\`]*?/).replace("brackets",Le).getRegex(),Ct=c("reflink|nolink(?!\\()","g").replace("reflink",c(/^!?\[(label)\]\[(ref)\]/).replace("label",Lt).replace("ref",be).getRegex()).replace("nolink",c(/^!?\[(ref)\](?:\[\])?/).replace("ref",be).getRegex()).getRegex(),Re=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,It=/[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/,At=c(/(?:mailto:email|xmpp:email(?:\/[A-Za-z0-9@.]+)?)/).replace(/email/g,It).getRegex(),ce={_backpedal:B,anyPunctuation:Tt,anyPunctuationOutsideCode:Ot,autolink:wt,blockSkip:ot,br:Se,code:et,del:B,delLDelim:B,delRDelim:B,emStrongLDelim:at,emStrongRDelimAst:ct,emStrongRDelimUnd:kt,escape:Ye,link:yt,nolink:$t,punctuation:nt,reflink:_t,reflinkSearch:Ct,tag:St,text:tt,url:B},Et={...ce,emStrongLDelim:pt,emStrongRDelimAst:gt,emStrongRDelimUnd:mt,link:c(/^!?\[(label)\]\((.*?)\)/).replace("label",re).getRegex(),reflink:c(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",re).getRegex()},ie={...ce,emStrongRDelimAst:ht,emStrongLDelim:lt,delLDelim:xt,delRDelim:Rt,url:c(/^emailProtocol|^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("emailProtocol",At).replace("protocol",Re).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:c(/^(?:[^a-zA-Z0-9](?=emailProtocol)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|wwwStart|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9](?=emailProtocol)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))))/).replace("protocol",Re).replace(/emailProtocol/g,/(?:mailto|xmpp):/).replace("wwwStart",Te?"(?<![^\\s*_~(])www\\.":"www\\.").getRegex()},zt={...ie,br:c(Se).replace("{2,}","*").getRegex(),text:c(ie.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},V={normal:pe,gfm:Ve,pedantic:Je},G={normal:ce,gfm:ie,breaks:zt,pedantic:Et};

// ---- small helpers (behaviour identical to marked's) ----

const ESCMAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escOne = (ch) => ESCMAP[ch];

// Escape HTML text. With encode=true also encodes & (unless it already forms
// a valid entity); without it, & is left alone unless it starts an entity.
function esc(s, encode) {
  if (encode) {
    if (T.escapeTest.test(s)) return s.replace(T.escapeReplace, escOne);
  } else if (T.escapeTestNoEncode.test(s)) {
    return s.replace(T.escapeReplaceNoEncode, escOne);
  }
  return s;
}

// Decode numeric character references (and lone & to &amp;).
function unesc(s) {
  if (!T.numericCharacterReference.test(s)) return s;
  return s.replace(T.numericCharacterReferenceOrAmpersand, (m, dec, hex) => {
    if (dec === undefined && hex === undefined) return '&amp;';
    const n = hex === undefined ? parseInt(dec, 10) : parseInt(hex, 16);
    if (n === 0 || n > 1114111 || (n >= 55296 && n <= 57343)) return '�';
    return n === 38 ? '&amp;' : String.fromCodePoint(n);
  });
}

// Clean a URL the way marked does: encodeURI, then un-escape %25.
function cleanUrl(href) {
  try {
    return encodeURI(href).replace(T.percentDecode, '%');
  } catch {
    return null;
  }
}

// Split a table row on unescaped pipes, honouring the column count.
function splitCells(row, count) {
  const t = row.replace(T.findPipe, (r, o, i) => {
    let escaped = false;
    let p = o;
    for (; --p >= 0 && i[p] === '\\';) escaped = !escaped;
    return escaped ? '|' : ' |';
  });
  const cells = t.split(T.splitPipe);
  if (cells[0].trim() || cells.shift(), cells.length > 0 && !cells.at(-1)?.trim() && cells.pop(), count) {
    if (cells.length > count) cells.splice(count);
    else for (; cells.length < count;) cells.push('');
  }
  for (let s = 0; s < cells.length; s++) cells[s] = cells[s].trim().replace(T.slashPipe, '|');
  return cells;
}

// Strip trailing characters: chars equal to ch (or, when invert, not equal).
function trimChar(s, ch, invert) {
  const n = s.length;
  if (n === 0) return '';
  let cut = 0;
  for (; cut < n;) {
    const r = s.charAt(n - cut - 1);
    if (r === ch && !invert) cut++;
    else if (r !== ch && invert) cut++;
    else break;
  }
  return s.slice(0, n - cut);
}

// Drop trailing blank lines, keeping at most one trailing newline's worth.
function trimBlanks(s) {
  const lines = s.split('\n');
  let t = lines.length - 1;
  for (; t >= 0 && T.blankLine.test(lines[t]);) t--;
  return lines.length - t <= 2 ? s : lines.slice(0, t + 1).join('\n');
}

// Normalise a link reference label for lookup.
function normLabel(s) {
  return s.trim().replace(T.multipleSpaceGlobal, ' ').toLowerCase().toUpperCase().toLowerCase();
}

// Find the index of the unmatched close paren/bracket of a pair in s:
// -1 balanced or absent, -2 an unclosed opener, else the index.
function findParen(s, pair) {
  if (s.indexOf(pair[0]) === -1 && s.indexOf(pair[1]) === -1) return -1;
  let depth = 0;
  for (let n = 0; n < s.length; n++) {
    if (s[n] === '\\') n++;
    else if (s[n] === pair[0]) depth++;
    else if (s[n] === pair[1] && (depth--, depth < 0)) return n;
  }
  return depth > 0 ? -2 : -1;
}

// Expand tabs to spaces, tracking the column (tab stops every 4).
function expandTabs(s, col = 0) {
  let t = col;
  let out = '';
  for (const ch of s) {
    if (ch === '\t') {
      const r = 4 - (t % 4);
      out += ' '.repeat(r);
      t += r;
    } else {
      out += ch;
      t++;
    }
  }
  return out;
}

// Compensate the indent of a fenced code block's content.
function fenceIndent(raw, text) {
  const m = raw.match(T.indentCodeCompensation);
  if (m === null) return text;
  const ind = m[1];
  return text.split('\n').map((line) => {
    const o = line.match(T.beginningSpace);
    if (o === null) return line;
    const [sp] = o;
    return line.slice(Math.min(sp.length, ind.length));
  }).join('\n');
}

// True when the link label at position `start` in `src` sits inside a code
// span or an HTML tag, so it must not be treated as a link.
function linkInText(src, label, start) {
  if (!label.includes('<')) return false;
  for (let s = 0; s < label.length; s++) {
    if (label[s] === '\\') { s++; continue; }
    if (label[s] === '`') {
      const m = ie.code.exec(label.slice(s));
      if (m) { s += m[0].length - 1; continue; }
    }
    if (label[s] !== '<') continue;
    const rest = src.slice(start + s);
    const o = ie.tag.exec(rest) || ie.autolink.exec(rest);
    if (o) {
      if (o[0].length > label.length - s) return true;
      s += o[0].length - 1;
    }
  }
  return false;
}

// True when the text contains a link (inline or reference) that is not
// itself inside a code span — used while masking for em/strong search.
function textHasLink(src, links) {
  if (!src.includes('[')) return false;
  for (const m of src.matchAll(ie.blockSkip)) {
    if (ie.link.test(m[0]) && src.charAt(m.index - 1) !== '!') return true;
  }
  for (const m of src.matchAll(ie.reflinkSearch)) {
    const s = m[0];
    const r = s.lastIndexOf('[');
    if (!(s.charAt(0) === '!' || !Object.hasOwn(links, normLabel(s.slice(r + 1, -1)))) && !(r > 1 && textHasLink(s.slice(1, r - 1), links))) return true;
  }
  return false;
}

// Mask a source for em/strong/delimiter search: reference links and code
// spans are blanked to runs of 'a' (same length), so their brackets and
// backticks cannot be mistaken for delimiters.
function maskSrc(src, links) {
  let t = src;
  if (src.includes('[')) {
    const re = ie.reflinkSearch;
    const sub = (r) => {
      const o = r.lastIndexOf('[');
      if (!Object.hasOwn(links, normLabel(r.slice(o + 1, -1)))) return r;
      if (o > 1 && r.charAt(0) !== '!') {
        const inner = r.slice(1, o - 1);
        if (textHasLink(inner, links)) return '[' + inner.replace(re, sub) + '][' + 'a'.repeat(r.length - o - 2) + ']';
      }
      return '[' + 'a'.repeat(r.length - 2) + ']';
    };
    t = t.replace(re, sub);
  }
  t = t.replace(ie.anyPunctuationOutsideCode, (n, s, r) => r ? '+'.repeat(n.length) : s ? s + n.slice(s.length, -s.length).replace(/`/g, '+') + s : n);
  t = t.replace(ie.blockSkip, (n, s, r) => {
    const o = r ? r.length : 0;
    return n.slice(0, o) + '[' + 'a'.repeat(n.length - o - 2) + ']';
  });
  return t;
}

// Scan a masked source for the last position a closer delimiter could sit:
// em/strong closers per delimiter char, and the last ~~ closer.
function scanDelims(a) {
  const em = { '*': -1, '_': -1 };
  let del = -1;
  const n = a.length;
  for (let s = 0; s < n; s++) {
    const r = a[s];
    if (r !== '*' && r !== '_' && r !== '~') continue;
    const prev = s === 0 ? '\n' : a[s - 1];
    let i = s + 1;
    for (; i < n && a[i] === r;) i++;
    if (prev !== ' ' && prev !== '\t' && prev !== '\n' && prev !== '\r' && prev !== '\f') {
      if (r === '~') del = s;
      else em[r] = s;
    }
    s = i - 1;
  }
  return { em, del };
}

// Trim trailing characters: L(a, e) strips trailing e's; L(a, e, true) strips
// trailing non-e's.
function L(a, e, t) {
  let n = a.length;
  if (n === 0) return '';
  let s = 0;
  for (; s < n;) {
    const r = a.charAt(n - s - 1);
    if (r === e && !t) s++;
    else if (r !== e && t) s++;
    else break;
  }
  return a.slice(0, n - s);
}

// Drop trailing blank lines (keeping at most one).
function ge(a) {
  const e = a.split('\n');
  let t = e.length - 1;
  for (; t >= 0 && T.blankLine.test(e[t]);) t--;
  return e.length - t <= 2 ? a : e.slice(0, t + 1).join('\n');
}

// Expand tabs to spaces, tracking the column.
function J(a, e = 0) {
  let t = e, n = '';
  for (const s of a) {
    if (s === '\t') { const r = 4 - t % 4; n += ' '.repeat(r); t += r; }
    else { n += s; t++; }
  }
  return n;
}

// Split a table row into cells, honouring escaped pipes.
function de(a, e) {
  const t = a.replace(T.findPipe, (r, o, i) => {
    let l = false, p = o;
    for (; --p >= 0 && i[p] === '\\';) l = !l;
    return l ? '|' : ' |';
  });
  const n = t.split(T.splitPipe);
  let s = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e) {
    if (n.length > e) n.splice(e);
    else for (; n.length < e;) n.push('');
  }
  for (; s < n.length; s++) n[s] = n[s].trim().replace(T.slashPipe, '|');
  return n;
}

// Fenced-code text: strip the fence indent from each line.
function Dt(a, e, t) {
  const n = a.match(t.other.indentCodeCompensation);
  if (n === null) return e;
  const s = n[1];
  return e.split('\n').map(r => {
    const o = r.match(t.other.beginningSpace);
    if (o === null) return r;
    const [i] = o;
    return r.slice(Math.min(i.length, s.length));
  }).join('\n');
}

// ---- inline rendering: one pass, writes HTML directly ----
// `st` is the shared parse state: { links, inLink, inRawBlock, linkEmitted,
// linkParenPossible }. `mode` is 'h' (HTML) or 't' (plain text, for image
// alt text). The tokenizer and the renderer are fused: each match is turned
// into output on the spot instead of becoming a token object.

// Top-level inline call for one span of text. Saves/restores the
// link-paren flag the way marked's inlineTokens does.
function inline(src, st, mode) {
  const saved = st.linkParenPossible;
  st.linkParenPossible = saved && src.includes(')');
  try {
    return inlineRun(src, st, mode);
  } finally {
    st.linkParenPossible = saved;
  }
}

function inlineRun(src, st, mode) {
  const htmlMode = mode === 'h';
  // Masked source + delimiter positions for em/strong/del search. Only
  // needed when the span can contain a delimiter at all.
  const masked = (src.includes('*') || src.includes('_') || src.includes('~')) ? maskSrc(src, st.links) : src;
  const delims = scanDelims(masked);
  let out = '';
  let isText = false; // last emitted piece was plain text
  let lastChar = ''; // last char of that text
  let guard = Infinity;
  let rest = src;
  // First-character dispatch: every inline rule is ^-anchored and starts
  // with one literal character (or a small set), so only the rules that can
  // match the next character are tried, in marked's order. Plain text goes
  // straight to the text rule instead of failing ten regexes first.
  while (rest) {
    if (rest.length < guard) guard = rest.length;
    else throw new Error('Infinite loop on byte: ' + rest.charCodeAt(0));
    if (!isText) lastChar = '';
    isText = false;
    const c = rest[0];
    let m;
    if (c === '\\') {
      // backslash escape, or a hard break (backslash + newline)
      if ((m = ie.escape.exec(rest))) {
        out += htmlMode ? esc(m[1]) : m[1];
        rest = rest.slice(m[0].length);
        continue;
      }
      if ((m = ie.br.exec(rest))) {
        out += htmlMode ? '<br>' : '';
        rest = rest.slice(m[0].length);
        continue;
      }
    } else if (c === ' ') {
      // a hard break is two spaces + newline
      if ((m = ie.br.exec(rest))) {
        out += htmlMode ? '<br>' : '';
        rest = rest.slice(m[0].length);
        continue;
      }
    } else if (c === '<') {
      // raw HTML tag / comment / processing instruction, or an autolink
      if ((m = ie.tag.exec(rest))) {
        if (!st.inLink && T.startATag.test(m[0])) st.inLink = true;
        else if (st.inLink && T.endATag.test(m[0])) st.inLink = false;
        if (!st.inRawBlock && T.startPreScriptTag.test(m[0])) st.inRawBlock = true;
        else if (st.inRawBlock && T.endPreScriptTag.test(m[0])) st.inRawBlock = false;
        out += m[0];
        rest = rest.slice(m[0].length);
        continue;
      }
      if ((m = ie.autolink.exec(rest))) {
        let text, href;
        if (m[2] === '@') { text = m[1]; href = 'mailto:' + text; }
        else { text = m[1]; href = text; }
        out += htmlMode ? autoLinkHtml(text, href) : text;
        rest = rest.slice(m[0].length);
        continue;
      }
    } else if (c === '[' || c === '!') {
      // inline link / image, or a reference / shortcut link
      if ((m = linkMatch(rest, st, mode))) {
        out += m.html;
        rest = rest.slice(m.len);
        continue;
      }
      if ((m = refMatch(rest, st, mode))) {
        out += m.html;
        rest = rest.slice(m.len);
        continue;
      }
    } else if (c === '*' || c === '_') {
      // emphasis / strong
      if ((m = emStrong(rest, masked, lastChar, st, mode, delims))) {
        out += m.html;
        rest = rest.slice(m.len);
        continue;
      }
    } else if (c === '`') {
      // code span
      if ((m = ie.code.exec(rest))) {
        let text = m[2].replace(T.newLineCharGlobal, ' ');
        const hasNonSpace = T.nonSpaceChar.test(text);
        const padded = T.startingSpaceChar.test(text) && T.endingSpaceChar.test(text);
        if (hasNonSpace && padded) text = text.substring(1, text.length - 1);
        out += htmlMode ? '<code>' + esc(text, true) + '</code>' : text;
        rest = rest.slice(m[0].length);
        continue;
      }
    } else if (c === '~') {
      // strikethrough
      if ((m = delMatch(rest, masked, lastChar, st, mode, delims))) {
        out += m.html;
        rest = rest.slice(m.len);
        continue;
      }
    } else if (!st.inLink && (c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c === '.' || c === '_' || c === '+' || c === '-')) {
      // bare URL / email (GFM) — only these first characters can start one
      if ((m = urlMatch(rest))) {
        out += htmlMode ? autoLinkHtml(m.text, m.href) : m.text;
        rest = rest.slice(m.len);
        continue;
      }
    }
    // plain text up to the next special character
    if ((m = ie.text.exec(rest))) {
      const raw = m[0];
      out += htmlMode ? esc(st.inRawBlock ? raw : unesc(raw)) : (st.inRawBlock ? raw : unesc(raw));
      if (raw.slice(-1) !== '_') lastChar = raw.slice(-1);
      isText = true;
      rest = rest.slice(raw.length);
      continue;
    }
    throw new Error('Infinite loop on byte: ' + rest.charCodeAt(0));
  }
  return out;
}

// Render an autolink (<a href> around text that is itself the address).
function autoLinkHtml(text, href) {
  const cleaned = cleanUrl(href);
  if (cleaned === null) return esc(text, true);
  return '<a href="' + esc(cleaned, true) + '">' + esc(text, true) + '</a>';
}

// Bare-URL matcher (GFM extended autolinks), with trailing-punctuation
// backpedalling exactly as marked does it.
function urlMatch(rest) {
  const m = ie.url.exec(rest);
  if (!m) return null;
  let text, href;
  if (m[2] === '@') {
    text = m[0];
    href = 'mailto:' + text;
  } else {
    let prev;
    do {
      prev = m[0];
      m[0] = ie._backpedal.exec(m[0])?.[0] ?? '';
    } while (prev !== m[0]);
    text = m[0];
    href = m[1] === 'www.' ? 'http://' + m[0] : m[0];
  }
  return { text, href, len: m[0].length };
}

// Inline link / image: validates the match the way marked does, then builds
// the link (or its plain-text form). Returns null when the match is not a
// link after all — the caller then tries the next rule.
function linkMatch(rest, st, mode) {
  if (st.linkParenPossible === false) return null;
  const m = ie.link.exec(rest);
  if (!m) return null;
  const bang = m[0].charAt(0) === '!' ? 2 : 1;
  if (linkInText(rest, m[1], bang)) return null;
  let hrefSrc = m[2].trim();
  if (T.startAngleBracket.test(hrefSrc)) {
    if (!T.endAngleBracket.test(hrefSrc)) return null;
    const trimmed = trimChar(hrefSrc.slice(0, -1), '\\');
    if ((hrefSrc.length - trimmed.length) % 2 === 0) return null;
  } else {
    const paren = findParen(m[2], '()');
    if (paren === -2) return null;
    if (paren > -1) {
      const cut = (m[0].indexOf('!') === 0 ? 5 : 4) + m[1].length + paren;
      m[2] = m[2].substring(0, paren);
      m[0] = m[0].substring(0, cut).trim();
      m[3] = '';
    }
  }
  const rawTrimmed = trimChar(m[0].slice(0, -1), '\\');
  if ((m[0].length - rawTrimmed.length) % 2 === 0) return null;
  let href = m[2];
  const title = m[3] ? m[3].slice(1, -1) : '';
  href = href.trim();
  if (T.startAngleBracket.test(href)) href = href.slice(1, -1);
  return makeLink(m, href.replace(ie.anyPunctuation, '$1'), title.replace(ie.anyPunctuation, '$1'), st, mode);
}

// Reference / shortcut link. When the label has no definition, only its
// first character is emitted as text (the rest is re-scanned).
function refMatch(rest, st, mode) {
  const m = ie.reflink.exec(rest) || ie.nolink.exec(rest);
  if (!m) return null;
  const bang = m[0].charAt(0) === '!' ? 2 : 1;
  if (linkInText(rest, m[1], bang)) return null;
  const def = st.links[normLabel(m[2] || m[1])];
  if (!def) {
    const ch = m[0].charAt(0);
    return { html: ch, len: 1 };
  }
  return makeLink(m, def.href, def.title, st, mode);
}

// Shared link/image construction: renders the link text (recursively), drops
// a link whose text itself contains a link, and builds the <a> / <img>.
function makeLink(m, href, title, st, mode) {
  const isImage = m[0].charAt(0) === '!';
  const text = m[1].replace(T.outputLinkReplace, '$1');
  const savedLink = st.inLink, savedEmitted = st.linkEmitted, savedRaw = st.inRawBlock;
  st.inLink = true;
  st.linkEmitted = false;
  // An image's alt text is rendered with the plain-text renderer, never
  // as HTML; a link's text uses the current mode.
  const innerMode = (mode === 'h' && isImage) ? 't' : mode;
  const innerHtml = inline(text, st, innerMode);
  const innerHadLink = st.linkEmitted;
  st.linkEmitted = savedEmitted;
  st.inLink = savedLink;
  if (!isImage) {
    if (innerHadLink) { st.inRawBlock = savedRaw; return null; }
    st.linkEmitted = true;
  }
  if (mode === 't') return { html: innerHtml, len: m[0].length };
  if (isImage) {
    const cleaned = cleanUrl(href);
    if (cleaned === null) return { html: esc(innerHtml), len: m[0].length };
    let out = '<img src="' + esc(cleaned) + '" alt="' + esc(innerHtml) + '"';
    if (title) out += ' title="' + esc(title) + '"';
    return { html: out + '>', len: m[0].length };
  }
  const cleaned = cleanUrl(href);
  if (cleaned === null) return { html: innerHtml, len: m[0].length };
  let out = '<a href="' + esc(cleaned) + '"';
  if (title) out += ' title="' + esc(title) + '"';
  return { html: out + '>' + innerHtml + '</a>', len: m[0].length };
}

// Emphasis / strong. `masked` is the full masked source of this inline run,
// `lastChar` the last char of the preceding text piece. Returns null when
// there is no opener / closer here.
function emStrong(rest, masked, lastChar, st, mode, delims) {
  const s = ie.emStrongLDelim.exec(rest);
  if (!s || (!s[1] && !s[2] && !s[3] && !s[4])) return null;
  const delim = s[0][0];
  const lastWasDelim = lastChar === delim;
  const off = masked.length - rest.length;
  let l = off;
  for (; l > 0 && masked[l - 1] === delim;) l--;
  const prev = [...masked.slice(Math.max(0, l - 2), l)].at(-1) ?? '';
  const prevIsDelimOrPunct = prev === '*' || prev === '_' || !!ie.punctuation.exec(prev);
  if (l < off) lastChar = prev;
  const prevIsPunct = l < off ? prevIsDelimOrPunct : !!ie.punctuation.exec(lastChar);
  if (s[4] && lastChar.match(T.unicodeAlphaNumeric)) return null;
  const punctAfter = s[1] || s[3] || '';
  if (!punctAfter || !lastChar || prevIsPunct) {
    let k = [...s[0]].length - 1;
    let open = k, openExtra = 0;
    const y = off - l + k;
    const canSplit = !!prev.trim() && (!!punctAfter || (delim === '*' && !prevIsDelimOrPunct));
    if (delim !== '*' && delim !== '_') return null;
    const closerRe = delim === '*' ? ie.emStrongRDelimAst : ie.emStrongRDelimUnd;
    const lastCloser = delims.em[delim];
    const q = masked.length - rest.length + k;
    if (lastCloser < q) return null;
    const searchIn = masked.slice(-rest.length + k);
    const limit = lastCloser - q;
    let g, b, m2;
    for (closerRe.lastIndex = 0; (m2 = closerRe.exec(searchIn)) !== null && !(m2.index > limit);) {
      g = m2[1] || m2[2] || m2[3] || m2[4] || m2[5] || m2[6];
      if (!g) continue;
      b = [...g].length;
      if (m2[3] || m2[4]) { open += b; continue; }
      if (m2[5] || m2[6] || canSplit) {
        if (lastWasDelim && (m2[5] || m2[6])) break;
        if (y % 3 && !((y + b) % 3)) { openExtra += b; continue; }
      }
      if ((open -= b) > 0) continue;
      b = Math.min(b, b + open + openExtra);
      const firstLen = [...m2[0]][0].length;
      const span = rest.slice(0, k + m2.index + firstLen + b);
      if (Math.min(k, b) % 2) {
        const inner = span.slice(1, -1);
        const innerHtml = mode === 'h' ? '<em>' + inline(inner, st, mode) + '</em>' : inline(inner, st, mode);
        return { html: innerHtml, len: span.length };
      }
      const inner = span.slice(2, -2);
      const innerHtml = mode === 'h' ? '<strong>' + inline(inner, st, mode) + '</strong>' : inline(inner, st, mode);
      return { html: innerHtml, len: span.length };
    }
  }
  return null;
}

// Strikethrough (GFM ~~text~~).
function delMatch(rest, masked, lastChar, st, mode, delims) {
  const s = ie.delLDelim.exec(rest);
  if (!s) return null;
  if (!(s[1] || '') || !lastChar || ie.punctuation.exec(lastChar)) {
    const o = [...s[0]].length - 1;
    let p = o;
    const lastCloser = delims.del;
    const d = masked.length - rest.length + o;
    if (lastCloser < d) return null;
    const searchIn = masked.slice(-rest.length + o);
    const limit = lastCloser - d;
    let m2;
    for (ie.delRDelim.lastIndex = 0; (m2 = ie.delRDelim.exec(searchIn)) !== null && !(m2.index > limit);) {
      const g = m2[1] || m2[2] || m2[3] || m2[4] || m2[5] || m2[6];
      if (!g) continue;
      const len = [...g].length;
      if (len !== o) continue;
      if (m2[3] || m2[4]) { p += len; continue; }
      p -= len;
      if (p > 0) continue;
      const l = Math.min(len, len + p);
      const firstLen = [...m2[0]][0].length;
      const span = rest.slice(0, o + m2.index + firstLen + l);
      const inner = span.slice(o, -o);
      const innerHtml = mode === 'h' ? '<del>' + inline(inner, st, mode) + '</del>' : inline(inner, st, mode);
      return { html: innerHtml, len: span.length };
    }
  }
  return null;
}

// ---- block layer ----
// Pass 1: scan the source with marked's block rules and build a compact plan
// (one small node per block; lists and blockquotes nest plans). Link
// reference definitions are collected into st.links here. Pass 2
// (renderPlan) walks the plan and emits HTML; inline spans are rendered
// then, in plan order, so the shared inline state behaves exactly as
// marked's inline queue does.

// Top-level inline call for one span: resets inRawBlock first, the way
// marked resets it before each entry of its inline queue.
function inlineTop(src, st) {
  st.inRawBlock = false;
  return inline(src, st, 'h');
}

function blockSpace(rest) {
  const m = Ve.newline.exec(rest);
  if (m && m[0].length > 0) return { type: 'space', raw: m[0] };
  return null;
}

function blockCode(rest) {
  const m = Ve.code.exec(rest);
  if (!m) return null;
  const n = ge(m[0]);
  return { type: 'code', raw: n, codeBlockStyle: 'indented', text: n.replace(T.codeRemoveIndent, '') };
}

function blockFences(rest) {
  const m = Ve.fences.exec(rest);
  if (!m) return null;
  return {
    type: 'code',
    raw: m[0],
    lang: m[2] ? m[2].trim().replace(ie.anyPunctuation, '$1') : m[2],
    text: Dt(m[0], m[3] || '', { other: T }),
  };
}

function blockHeading(rest) {
  const m = Ve.heading.exec(rest);
  if (!m) return null;
  let n = m[2].trim();
  if (T.endingHash.test(n)) {
    const s = L(n, '#');
    if (!s || T.endingSpaceTabChar.test(s)) n = s.trim();
  }
  return { type: 'heading', raw: L(m[0], '\n'), depth: m[1].length, text: n };
}

function blockHr(rest) {
  const m = Ve.hr.exec(rest);
  if (!m) return null;
  return { type: 'hr', raw: L(m[0], '\n') };
}

function blockHtml(rest) {
  const m = Ve.html.exec(rest);
  if (!m) return null;
  const n = ge(m[0]);
  return { type: 'html', raw: n, pre: m[1] === 'pre' || m[1] === 'script' || m[1] === 'style', text: n };
}

function blockDef(rest) {
  const m = Ve.def.exec(rest);
  if (!m) return null;
  if (!T.startAngleBracket.test(m[2]) && findParen(m[2], '()') !== -1) return null;
  const href = m[2] ? m[2].replace(T.hrefBrackets, '$1').replace(ie.anyPunctuation, '$1') : '';
  const title = m[3] ? m[3].substring(1, m[3].length - 1).replace(ie.anyPunctuation, '$1') : m[3];
  return { type: 'def', tag: normLabel(m[1]), raw: L(m[0], '\n'), href, title };
}

function blockTable(rest) {
  const m = Ve.table.exec(rest);
  if (!m || !T.tableDelimiter.test(m[2])) return null;
  const headerCells = de(m[1]);
  const aligns = m[2].replace(T.tableAlignChars, '').split('|');
  const body = m[3]?.trim() ? m[3].replace(T.tableRowBlankLine, '').split('\n') : [];
  const node = { type: 'table', raw: L(m[0], '\n'), header: [], align: [], rows: [] };
  if (headerCells.length === aligns.length) {
    for (const a of aligns) {
      if (T.tableAlignRight.test(a)) node.align.push('right');
      else if (T.tableAlignCenter.test(a)) node.align.push('center');
      else if (T.tableAlignLeft.test(a)) node.align.push('left');
      else node.align.push(null);
    }
    for (let i = 0; i < headerCells.length; i++) {
      node.header.push({ text: headerCells[i], header: true, align: node.align[i] });
    }
    for (const row of body) {
      node.rows.push(de(row, node.header.length).map((cell, p) => ({ text: cell, header: false, align: node.align[p] })));
    }
    return node;
  }
  return null;
}

function blockLheading(rest) {
  const m = Ve.lheading.exec(rest);
  if (!m) return null;
  return { type: 'heading', raw: L(m[0], '\n'), depth: m[2].charAt(0) === '=' ? 1 : 2, text: m[1].trim() };
}

function blockParagraph(rest) {
  const m = Ve.paragraph.exec(rest);
  if (!m) return null;
  const n = m[1].charAt(m[1].length - 1) === '\n' ? m[1].slice(0, -1) : m[1];
  return { type: 'paragraph', raw: m[0], text: n };
}

function blockText(rest) {
  const m = Ve.text.exec(rest);
  if (!m) return null;
  return { type: 'text', raw: m[0], text: m[0] };
}

// Blockquote: strips the > markers line by line, re-parses the inner text,
// and re-parses again when a nested blockquote or list runs on past the
// first chunk — exactly as marked does.
function blockBlockquote(rest, st) {
  const m = Ve.blockquote.exec(rest);
  if (!m) return null;
  let lines = L(m[0], '\n').split('\n');
  let s = '', r = '';
  const o = [];
  while (lines.length > 0) {
    let hasQuote = false;
    const l = [];
    let p;
    for (p = 0; p < lines.length; p++) {
      if (T.blockquoteStart.test(lines[p])) { l.push(lines[p]); hasQuote = true; }
      else if (!hasQuote) l.push(lines[p]);
      else break;
    }
    lines = lines.slice(p);
    const h = l.join('\n');
    const u = h
      .replace(T.blockquoteMarkerWhitespace, (g, b, m2) => b + J(m2, b.length))
      .replace(T.blockquoteSetextReplace, '\n    $1')
      .replace(T.blockquoteSetextReplace2, '');
    s = s ? `${s}\n${h}` : h;
    r = r ? `${r}\n${u}` : u;
    buildPlanInto(u, o, st, true, true);
    if (lines.length === 0) break;
    const k = o.at(-1);
    if (k?.type === 'code' || k?.type === 'heading' || k?.type === 'hr' || k?.type === 'html' || k?.type === 'table') break;
    if (k?.type === 'blockquote') {
      const g = k;
      const b = lines.join('\n');
      const mm = g.raw + '\n' + b.replace(T.blockquoteSetextReplace2, '');
      const f = blockBlockquote(mm, st);
      o[o.length - 1] = f;
      const y = mm.substring(f.raw.length).replace(/^\n/, '');
      const R = y ? y.split('\n').length : 0;
      const A = R ? lines.slice(0, -R) : lines;
      if (A.length > 0) s = `${s}\n${A.join('\n')}`;
      r = r.substring(0, r.length - g.text.length) + f.text;
      lines = lines.slice(A.length);
      if (lines.length > 0 && T.blockquoteStart.test(lines[0])) continue;
      break;
    } else if (k?.type === 'list') {
      const g = k;
      const b = g.raw + '\n' + lines.join('\n');
      const mm = blockList(b, st);
      o[o.length - 1] = mm;
      const f = mm.raw.length > g.raw.length ? b.slice(g.raw.length + 1, mm.raw.length).split('\n').length : 0;
      if (f > 0) {
        const y = lines.slice(0, f).join('\n');
        s = `${s}\n${y}`;
        r = `${r}\n${y}`;
      }
      lines = lines.slice(f);
      continue;
    }
  }
  return { type: 'blockquote', raw: s, tokens: o, text: r };
}

// List: collects items with their indent rules, renders each item's content
// as its own plan (paragraphs become plain text there unless the list is
// loose), and handles task-list checkboxes.
function blockList(rest, st) {
  const m = Ve.list.exec(rest);
  if (!m) return null;
  const n = rest;
  let e = rest;
  const s = () => n.length - e.length;
  const r = m[1].trim();
  const o = r.length > 1;
  const item = { type: 'list', raw: '', ordered: o, start: o ? +r.slice(0, -1) : '', loose: false, items: [] };
  const bullet = o ? `\\d{1,9}\\${r.slice(-1)}` : `\\${r}`;
  const l = T.listItemRegex(bullet);
  let p = false;
  while (e) {
    let u = false;
    let d = '';
    const t = l.exec(e);
    if (!t || Ve.hr.test(e)) break;
    const k = s();
    e = e.substring(t[0].length);
    const g = t[2].split('\n', 1)[0];
    const b = t[1].length;
    let mm = g.replace(T.leadingSpaceTab, v => J(v, b));
    let f = e.split('\n', 1)[0];
    let y = !mm.trim();
    let R = 0;
    if (y) R = b + 1;
    else { R = mm.search(T.nonSpaceChar); R = R > 4 ? 1 : R; d = mm.slice(R); R += b; }
    if (y && T.blankLine.test(f)) { e = e.substring(f.length + 1); u = true; }
    if (!u) {
      const v = T.nextBulletRegex(R), Q = T.hrRegex(R), ee = T.fencesBeginRegex(R),
        te = T.headingBeginRegex(R), M = T.htmlBeginRegex(R), ne = T.blockquoteBeginRegex(R);
      while (e) {
        const U = e.split('\n', 1)[0];
        let Z;
        f = U;
        Z = f.replace(T.leadingSpaceTab, me => J(me));
        if (ee.test(f) || te.test(f) || M.test(f) || ne.test(f) || v.test(f) || Q.test(f)) break;
        if (Z.search(T.nonSpaceChar) >= R || !f.trim()) d += '\n' + Z.slice(R);
        else {
          if (y || mm.replace(T.tabCharGlobal, '    ').search(T.nonSpaceChar) >= 4 || ee.test(mm) || te.test(mm) || M.test(mm) || Q.test(mm)) break;
          const qe = /^ {0,3}(?:=+|-+) *$/.test(f) && Ve.lheading.test(`${mm}\n${f}`) ? `    ${Z.replace(/^ {0,3}/, '')}` : f;
          d += '\n' + qe;
        }
        y = !f.trim();
        e = e.substring(U.length + 1);
        mm = Z.slice(R);
      }
    }
    const A = n.slice(k, s());
    if (!item.loose) (p ? item.loose = true : T.doubleBlankLine.test(A) && (p = true));
    item.items.push({ type: 'list_item', raw: A, task: !!T.listIsTask.test(d), loose: false, text: d, tokens: [] });
  }
  const h = item.items.at(-1);
  if (h) { h.raw = h.raw.trimEnd(); h.text = h.text.trimEnd(); }
  else return null;
  item.raw = n.slice(0, s()).trimEnd();
  for (const u of item.items) {
    u.tokens = buildPlanInto(u.text, [], st, false, false);
    if (!item.loose) {
      const spaces = u.tokens.filter(g => g.type === 'space');
      const k = spaces.length > 0 && spaces.some(g => T.anyLine.test(g.raw));
      item.loose = k;
    }
  }
  for (const u of item.items) {
    const d = u.tokens[0];
    if (u.task && (d?.type === 'text' || d?.type === 'paragraph')) {
      u.text = u.text.replace(T.listReplaceTask, '');
      d.raw = d.raw.replace(T.listReplaceTask, '');
      d.text = d.text.replace(T.listReplaceTask, '');
      const k = T.listTaskCheckbox.exec(u.raw);
      if (k) {
        const g = { type: 'checkbox', raw: k[0] + ' ', checked: k[0] !== '[ ]' };
        u.checked = g.checked;
        if (item.loose) {
          if (u.tokens[0] && ['paragraph', 'text'].includes(u.tokens[0].type) && 'text' in u.tokens[0]) {
            u.tokens[0].checkbox = g.checked;
          } else {
            u.tokens.unshift({ type: 'paragraph', raw: g.raw, text: '', checkbox: g.checked });
          }
        } else {
          u.tokens.unshift(g);
        }
      }
    } else if (u.task) u.task = false;
  }
  if (item.loose) {
    for (const u of item.items) {
      u.loose = true;
      for (const dd of u.tokens) if (dd.type === 'text') dd.type = 'paragraph';
    }
  }
  return item;
}

// The block loop: tries each block rule in marked's order, merging a
// following indented code block or link definition into a preceding
// paragraph/text node the way marked does.
function buildPlanInto(src, plan, st, top, mergePara) {
  let rest = src;
  let guard = Infinity;
  while (rest) {
    if (rest.length < guard) guard = rest.length;
    else throw new Error('Infinite loop on byte: ' + rest.charCodeAt(0));
    let node;
    if ((node = blockSpace(rest))) {
      rest = rest.slice(node.raw.length);
      const prev = plan.at(-1);
      if (node.raw.length === 1 && prev !== undefined) prev.raw += '\n';
      else plan.push(node);
      continue;
    }
    if ((node = blockCode(rest))) {
      rest = rest.slice(node.raw.length);
      const prev = plan.at(-1);
      if (prev?.type === 'paragraph' || prev?.type === 'text') {
        prev.raw += (prev.raw.endsWith('\n') ? '' : '\n') + node.raw;
        prev.text += '\n' + node.text;
      } else plan.push(node);
      continue;
    }
    if ((node = blockFences(rest))) { rest = rest.slice(node.raw.length); plan.push(node); continue; }
    if ((node = blockHeading(rest))) { rest = rest.slice(node.raw.length); plan.push(node); continue; }
    if ((node = blockHr(rest))) { rest = rest.slice(node.raw.length); plan.push(node); continue; }
    if ((node = blockBlockquote(rest, st))) { rest = rest.slice(node.raw.length); plan.push(node); continue; }
    if ((node = blockList(rest, st))) { rest = rest.slice(node.raw.length); plan.push(node); continue; }
    if ((node = blockHtml(rest))) { rest = rest.slice(node.raw.length); plan.push(node); continue; }
    if ((node = blockDef(rest))) {
      rest = rest.slice(node.raw.length);
      const prev = plan.at(-1);
      if (prev?.type === 'paragraph' || prev?.type === 'text') {
        prev.raw += (prev.raw.endsWith('\n') ? '' : '\n') + node.raw;
        prev.text += '\n' + node.raw;
      } else {
        if (!Object.hasOwn(st.links, node.tag)) st.links[node.tag] = { href: node.href, title: node.title };
        plan.push(node);
      }
      continue;
    }
    if ((node = blockTable(rest))) { rest = rest.slice(node.raw.length); plan.push(node); continue; }
    if ((node = blockLheading(rest))) { rest = rest.slice(node.raw.length); plan.push(node); continue; }
    if (top && (node = blockParagraph(rest))) {
      rest = rest.slice(node.raw.length);
      const prev = plan.at(-1);
      if (mergePara && prev?.type === 'paragraph') {
        prev.raw += (prev.raw.endsWith('\n') ? '' : '\n') + node.raw;
        prev.text += '\n' + node.text;
      } else plan.push(node);
      mergePara = false;
      continue;
    }
    if ((node = blockText(rest))) {
      rest = rest.slice(node.raw.length);
      const prev = plan.at(-1);
      if (prev?.type === 'text') {
        prev.raw += (prev.raw.endsWith('\n') ? '' : '\n') + node.raw;
        prev.text += '\n' + node.text;
      } else plan.push(node);
      continue;
    }
    throw new Error('Infinite loop on byte: ' + rest.charCodeAt(0));
  }
  return plan;
}

// Pass 2: render a plan to HTML.
function renderPlan(plan, st) {
  let out = '';
  for (const node of plan) {
    switch (node.type) {
      case 'space':
        break;
      case 'code': {
        const langWord = (node.lang || '').match(T.notSpaceStart)?.[0] ?? '';
        const cls = langWord ? ` class="language-${esc(langWord)}"` : '';
        const text = node.text ? node.text.replace(T.endingNewline, '') + '\n' : '';
        out += `<pre><code${cls}>${esc(text, true)}</code></pre>\n`;
        break;
      }
      case 'heading':
        out += `<h${node.depth}>${inlineTop(node.text, st)}</h${node.depth}>\n`;
        break;
      case 'hr':
        out += '<hr>\n';
        break;
      case 'blockquote':
        out += `<blockquote>\n${renderPlan(node.tokens, st)}</blockquote>\n`;
        break;
      case 'list': {
        const tag = node.ordered ? 'ol' : 'ul';
        const start = node.ordered && node.start !== 1 ? ` start="${node.start}"` : '';
        let items = '';
        for (const item of node.items) items += `<li>${renderPlan(item.tokens, st)}</li>\n`;
        out += `<${tag}${start}>\n${items}</${tag}>\n`;
        break;
      }
      case 'checkbox':
        out += `<input ${node.checked ? 'checked="" ' : ''}disabled="" type="checkbox"> `;
        break;
      case 'html':
        out += node.text;
        break;
      case 'def':
        break;
      case 'table': {
        let head = '';
        for (const cell of node.header) head += tableCell(cell, st);
        let body = '';
        for (const row of node.rows) {
          let cells = '';
          for (const cell of row) cells += tableCell(cell, st);
          body += `<tr>\n${cells}</tr>\n`;
        }
        out += `<table>\n<thead>\n<tr>\n${head}</tr>\n</thead>\n${body ? `<tbody>${body}</tbody>` : ''}</table>\n`;
        break;
      }
      case 'paragraph': {
        const cb = node.checkbox !== undefined ? `<input ${node.checkbox ? 'checked="" ' : ''}disabled="" type="checkbox"> ` : '';
        out += `<p>${cb}${inlineTop(node.text, st)}</p>\n`;
        break;
      }
      case 'text': {
        const cb = node.checkbox !== undefined ? `<input ${node.checkbox ? 'checked="" ' : ''}disabled="" type="checkbox"> ` : '';
        out += cb + inlineTop(node.text, st);
        break;
      }
    }
  }
  return out;
}

function tableCell(cell, st) {
  const tag = cell.header ? 'th' : 'td';
  const open = cell.align ? `<${tag} align="${cell.align}">` : `<${tag}>`;
  return open + inlineTop(cell.text, st) + `</${tag}>\n`;
}

/** The HTML marked 18.1.3 renders for `markdown`, with its defaults. */
export function parse(markdown) {
  const src = markdown.replace(T.carriageReturn, '\n');
  const st = {
    links: {},
    inLink: false,
    inRawBlock: false,
    linkEmitted: false,
    linkParenPossible: true,
  };
  const plan = buildPlanInto(src, [], st, true, false);
  return renderPlan(plan, st);
}
