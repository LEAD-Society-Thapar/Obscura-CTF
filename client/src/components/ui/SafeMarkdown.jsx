import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders challenge text written in a small markdown subset (paragraphs, bold/italic, inline code, fenced code,
// tables, lists, blockquote). Safety rules:
//   - No raw HTML: no rehype-raw, no dangerouslySetInnerHTML. HTML in the source is shown as literal text
//     (remarkHtmlAsText below), so CP 1.1's HTML code can never render.
//   - Only ALLOWED elements are produced. Anything else (links, images, headings, ...) is unwrapped to its text
//     or dropped when it has none (images).
//   - Text is never trimmed or rewritten, and nothing in here blocks selection or copying.
//
// tone: "dark" (default, on ink surfaces) or "paper" (on parchment, e.g. the Reel Card).

const ALLOWED = ["p", "strong", "em", "code", "pre", "ul", "ol", "li", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "br"];

// Flow-level HTML becomes a literal code block (keeps its line breaks); inline HTML becomes plain text.
// React escapes both, so markup is displayed, never interpreted.
const FLOW_PARENTS = new Set(["root", "blockquote", "listItem"]);
function remarkHtmlAsText() {
  const walk = (node) => {
    if (!node.children) return;
    node.children = node.children.map((child) => {
      if (child.type !== "html") {
        walk(child);
        return child;
      }
      return FLOW_PARENTS.has(node.type)
        ? { type: "code", lang: null, meta: null, value: child.value, position: child.position }
        : { type: "text", value: child.value, position: child.position };
    });
  };
  return walk;
}

const REMARK_PLUGINS = [remarkGfm, remarkHtmlAsText];

// The telegram in CP 2.4 hides Cyrillic look-alike letters. It must use a system font stack that covers Cyrillic
// (a Latin-only webfont would fall back per-glyph and give the letters away) and nothing that alters glyph shapes.
const TELEGRAM_STYLE = {
  fontFamily: 'system-ui, "Segoe UI", Roboto, Arial, sans-serif',
  textTransform: "none",
  letterSpacing: "normal",
  fontStyle: "normal",
  fontVariantLigatures: "none",
  fontFeatureSettings: '"liga" 0, "clig" 0, "dlig" 0',
};

const TONES = {
  dark: {
    text: "text-bone/90",
    strong: "text-bone",
    chip: "border border-line bg-ink-raised text-gold",
    pre: "border border-line bg-ink/90 text-bone",
    quote: "border-l-4 border-blood-bright/80 bg-ink-raised/80 text-bone",
    table: "border-line",
    th: "bg-ink-raised text-gold",
    rowAlt: "even:bg-ink-soft/60",
    marker: "marker:text-gold",
  },
  paper: {
    text: "text-parchment-ink",
    strong: "text-parchment-ink",
    chip: "border border-parchment-ink/20 bg-parchment-dark/50 text-parchment-ink",
    pre: "border border-parchment-ink/25 bg-ink text-bone",
    quote: "border-l-4 border-blood/70 bg-parchment-dark/40 text-parchment-ink",
    table: "border-parchment-ink/25",
    th: "bg-parchment-dark/60 text-parchment-ink",
    rowAlt: "even:bg-parchment-dark/25",
    marker: "marker:text-blood",
  },
};

function components(t) {
  return {
    p: ({ node, ...props }) => <p className="my-3 first:mt-0 last:mb-0" {...props} />,
    strong: ({ node, ...props }) => <strong className={`font-bold ${t.strong}`} {...props} />,
    em: ({ node, ...props }) => <em className="italic" {...props} />,
    // Inline code chip. Inside <pre> the chip styling is reset (see pre below).
    code: ({ node, className, ...props }) => (
      <code
        className={`rounded-chip px-1.5 py-0.5 font-mono text-[0.9em] break-words ${t.chip} ${className || ""}`}
        {...props}
      />
    ),
    // Code blocks never wrap: alignment matters (CP 5.4 is a number grid). The wrapper scrolls sideways instead.
    pre: ({ node, ...props }) => (
      <div className={`my-4 max-w-full overflow-x-auto rounded-card ${t.pre}`}>
        <pre
          className="w-max min-w-full px-4 py-3 font-mono text-sm leading-relaxed whitespace-pre [tab-size:4] sm:text-base [&>code]:rounded-none [&>code]:border-0 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-[length:inherit] [&>code]:text-inherit [&>code]:break-normal"
          {...props}
        />
      </div>
    ),
    ul: ({ node, ...props }) => <ul className={`my-3 list-disc space-y-1 pl-6 ${t.marker}`} {...props} />,
    ol: ({ node, ...props }) => <ol className={`my-3 list-decimal space-y-1 pl-6 ${t.marker}`} {...props} />,
    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
    blockquote: ({ node, ...props }) => (
      <blockquote className={`my-4 rounded-r-card px-4 py-3 leading-relaxed ${t.quote}`} style={TELEGRAM_STYLE} {...props} />
    ),
    table: ({ node, ...props }) => (
      <div className={`my-4 max-w-full overflow-x-auto rounded-card border ${t.table}`}>
        <table className="w-full min-w-max border-collapse text-left text-sm sm:text-base" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => <thead {...props} />,
    tbody: ({ node, ...props }) => <tbody {...props} />,
    tr: ({ node, ...props }) => <tr className={`border-t first:border-t-0 ${t.table} ${t.rowAlt}`} {...props} />,
    th: ({ node, style, ...props }) => (
      <th className={`px-3 py-2 font-semibold whitespace-nowrap ${t.th}`} style={style} {...props} />
    ),
    td: ({ node, style, ...props }) => <td className="px-3 py-2 align-top" style={style} {...props} />,
  };
}

const COMPONENTS = { dark: components(TONES.dark), paper: components(TONES.paper) };

export default function SafeMarkdown({ children, tone = "dark", className = "" }) {
  if (typeof children !== "string" || children === "") return null;
  const t = TONES[tone] ? tone : "dark";
  return (
    <div className={`min-w-0 break-words ${TONES[t].text} ${className}`}>
      <Markdown
        remarkPlugins={REMARK_PLUGINS}
        allowedElements={ALLOWED}
        unwrapDisallowed
        skipHtml={false}
        components={COMPONENTS[t]}
      >
        {children}
      </Markdown>
    </div>
  );
}
