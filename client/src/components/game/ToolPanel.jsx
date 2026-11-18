import { useId, useState } from "react";
import { TOOLS, base64Decode, hexToText, inspectCharacters, modPowMany, morseDecode, vigenereDecode } from "../../lib/tools.js";
import Button from "../ui/Button.jsx";
import Icon from "../ui/Icon.jsx";

// The built-in tools a checkpoint lists in challenges.json ("tools": ["base64", ...]). Outside websites are not
// allowed (the hunt runs in full screen), so anything a puzzle needs is here. Free: no points, no limits.
// Everything runs in the browser (lib/tools.js); nothing is sent to the server.

const fieldCls =
  "w-full rounded-chip border border-line bg-ink/80 px-3 py-2 font-mono text-sm text-bone placeholder:text-muted/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-gold";

function Field({ label, multiline = false, ...props }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-type text-[11px] tracking-[0.2em] text-muted uppercase">
        {label}
      </label>
      {multiline ? (
        <textarea id={id} rows={4} maxLength={5000} spellCheck={false} className={fieldCls} {...props} />
      ) : (
        <input id={id} maxLength={200} spellCheck={false} autoComplete="off" className={fieldCls} {...props} />
      )}
    </div>
  );
}

function Output({ children }) {
  return (
    <div className="mt-3">
      <p className="mb-1 font-type text-[11px] tracking-[0.2em] text-muted uppercase">Output</p>
      <div className="min-h-10 rounded-chip border border-gold-soft/40 bg-ink px-3 py-2 font-mono text-sm break-all whitespace-pre-wrap text-gold">
        {children}
      </div>
    </div>
  );
}

// Runs fn and returns its result, or an error message string.
function attempt(fn) {
  try {
    return { value: fn(), error: null };
  } catch (e) {
    return { value: null, error: e.message };
  }
}

function TextTool({ decode, placeholder }) {
  const [input, setInput] = useState("");
  const out = input.trim() ? attempt(() => decode(input)) : null;
  return (
    <>
      <Field label="Input" multiline value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} />
      <Output>{out?.error ? <span className="text-blood-bright">{out.error}</span> : out?.value}</Output>
    </>
  );
}

function VigenereTool() {
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const out = text.trim() && key.trim() ? attempt(() => vigenereDecode(text, key)) : null;
  return (
    <div className="space-y-3">
      <Field label="Ciphertext" multiline value={text} onChange={(e) => setText(e.target.value)} />
      <Field label="Key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="letters only" />
      <Output>{out?.error ? <span className="text-blood-bright">{out.error}</span> : out?.value}</Output>
    </div>
  );
}

function InspectorTool() {
  const [text, setText] = useState("");
  const chars = text ? inspectCharacters(text) : [];
  const odd = chars.filter((c) => c.suspicious);
  return (
    <>
      <Field label="Paste text" multiline value={text} onChange={(e) => setText(e.target.value)} />
      {text && (
        <>
          <Output>
            {chars.map((c, i) =>
              c.suspicious ? (
                <mark key={i} className="rounded-[2px] bg-blood-bright/30 px-0.5 text-bone">
                  {c.ch}
                </mark>
              ) : (
                <span key={i}>{c.ch}</span>
              )
            )}
          </Output>
          <p className="mt-3 text-sm text-muted">
            {odd.length === 0 ? "Every letter is plain A-Z." : `${odd.length} letter${odd.length === 1 ? "" : "s"} outside plain A-Z, in order:`}
          </p>
          {odd.length > 0 && (
            <ol className="mt-2 flex flex-wrap gap-2">
              {odd.map((c, i) => (
                <li key={i} className="rounded-chip border border-line bg-ink px-2 py-1 font-mono text-xs text-bone">
                  <span className="text-base text-gold">{c.ch}</span> {c.code} {c.script}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </>
  );
}

function ModPowTool() {
  const [bases, setBases] = useState("");
  const [exp, setExp] = useState("");
  const [mod, setMod] = useState("");
  const out = bases.trim() && exp.trim() && mod.trim() ? attempt(() => modPowMany(bases, exp, mod)) : null;
  return (
    <div className="space-y-3">
      <Field label="Base (one or more numbers)" value={bases} onChange={(e) => setBases(e.target.value)} placeholder="e.g. 12 7 40" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Exponent" inputMode="numeric" value={exp} onChange={(e) => setExp(e.target.value)} />
        <Field label="Modulus" inputMode="numeric" value={mod} onChange={(e) => setMod(e.target.value)} />
      </div>
      <Output>
        {out?.error ? (
          <span className="text-blood-bright">{out.error}</span>
        ) : (
          out?.value?.map((r, i) => (
            <span key={i} className="block">
              {r.base}^{exp.trim()} mod {mod.trim()} = {r.result}
            </span>
          ))
        )}
      </Output>
    </div>
  );
}

const BODY = {
  base64: () => <TextTool decode={base64Decode} placeholder="Paste or type here" />,
  hex: () => <TextTool decode={hexToText} placeholder="Paste or type here, one row per line" />,
  morse: () => <TextTool decode={morseDecode} placeholder="Paste or type here" />,
  vigenere: VigenereTool,
  unicode: InspectorTool,
  modpow: ModPowTool,
};

function Tool({ type }) {
  const [open, setOpen] = useState(false);
  const meta = TOOLS[type];
  const Body = BODY[type];
  const panelId = useId();
  if (!meta || !Body) return null;
  return (
    <div className="rounded-card border border-line bg-ink-soft/80">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-heading font-semibold text-bone">{meta.title}</p>
          <p className="text-sm text-muted">{meta.blurb}</p>
        </div>
        <Button size="sm" variant={open ? "primary" : "outline"} caps={false} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
          {open ? "Close" : meta.button}
        </Button>
      </div>
      {open && (
        <div id={panelId} className="border-t border-line px-4 pt-3 pb-4">
          <Body />
        </div>
      )}
    </div>
  );
}

export default function ToolPanel({ tools }) {
  const list = (tools ?? []).filter((t) => TOOLS[t]);
  if (!list.length) return null;
  return (
    <section aria-labelledby="tools-heading" className="mt-6">
      <h2 id="tools-heading" className="flex items-center gap-2 font-heading text-sm font-bold tracking-wider text-muted uppercase">
        <Icon name="bulb" className="size-4 text-gold" /> Tools for this checkpoint
      </h2>
      <p className="mt-1 text-xs text-muted">Free to use: no points are deducted. Outside websites and apps are not allowed.</p>
      <div className="mt-3 space-y-3">
        {list.map((t) => (
          <Tool key={t} type={t} />
        ))}
      </div>
    </section>
  );
}
