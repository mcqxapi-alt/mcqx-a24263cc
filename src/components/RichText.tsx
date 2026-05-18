import { Fragment, useMemo } from "react";
import { cn } from "@/lib/utils";
import katex from "katex";
import "katex/dist/katex.min.css";

type RichTextProps = {
  text?: string | null;
  /** Which HTML element to render */
  as?: keyof JSX.IntrinsicElements;
  className?: string;
};

/**
 * Renders a LaTeX string to HTML using KaTeX.
 * Returns null if rendering fails.
 */
function renderLatex(latex: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
      strict: false,
      trust: false,
      output: "html",
    });
  } catch {
    return null;
  }
}

/**
 * Detects and renders LaTeX expressions in text.
 * Supports:
 * - Display mode: $$...$$ or \[...\]
 * - Inline mode: $...$ or \(...\)
 */
function renderWithLatex(input: string): Array<string | JSX.Element> {
  const nodes: Array<string | JSX.Element> = [];
  
  // Combined regex for all LaTeX delimiters
  // Display: $$...$$ or \[...\]
  // Inline: $...$ (not $$) or \(...\)
  const latexRe = /\$\$([^$]+)\$\$|\\\[([^\]]+)\\\]|\$([^$\n]+)\$|\\\(([^)]+)\\\)/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let latexKey = 0;

  while ((match = latexRe.exec(input))) {
    const start = match.index;
    
    // Add text before this match
    if (start > lastIndex) {
      nodes.push(...renderPlainText(input.slice(lastIndex, start)));
    }

    // Determine if display or inline mode
    const displayContent = match[1] ?? match[2]; // $$...$$ or \[...\]
    const inlineContent = match[3] ?? match[4];  // $...$ or \(...\)
    
    const isDisplay = displayContent !== undefined;
    const latex = displayContent ?? inlineContent ?? "";
    
    const html = renderLatex(latex, isDisplay);
    
    if (html) {
      nodes.push(
        <span
          key={`latex-${latexKey++}`}
          className={cn(
            "katex-wrapper",
            isDisplay && "block my-2 text-center overflow-x-auto"
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } else {
      // Fallback: show original text if KaTeX fails
      nodes.push(isDisplay ? `$$${latex}$$` : `$${latex}$`);
    }

    lastIndex = latexRe.lastIndex;
  }

  // Add remaining text after last match
  if (lastIndex < input.length) {
    nodes.push(...renderPlainText(input.slice(lastIndex)));
  }

  return nodes;
}

/**
 * Renders plain text with superscripts and bold formatting.
 * This is used for text that doesn't contain LaTeX.
 */
function renderPlainText(input: string): Array<string | JSX.Element> {
  return renderBoldAndMath(input);
}

function renderSuperscripts(input: string): Array<string | JSX.Element> {
  const nodes: Array<string | JSX.Element> = [];
  // Supports e^(ax), x^2, a^n (letters/numbers, Unicode letters)
  const re = /([\p{L}\p{N}]+)\^\(([^)]+)\)|([\p{L}\p{N}]+)\^([\p{L}\p{N}]+)/gu;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let supKey = 0;

  while ((match = re.exec(input))) {
    const start = match.index;
    if (start > lastIndex) nodes.push(input.slice(lastIndex, start));

    const base = match[1] ?? match[3] ?? "";
    const exp = match[2] ?? match[4] ?? "";

    if (base) nodes.push(base);
    if (exp) {
      nodes.push(
        <sup key={`sup-${supKey++}`} className="text-[0.75em] align-super">
          {exp}
        </sup>
      );
    }

    lastIndex = re.lastIndex;
  }

  if (lastIndex < input.length) nodes.push(input.slice(lastIndex));
  return nodes;
}

function renderBoldAndMath(input: string): Array<string | JSX.Element> {
  const nodes: Array<string | JSX.Element> = [];
  const boldRe = /\*\*([^*]+)\*\*/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let boldKey = 0;

  while ((match = boldRe.exec(input))) {
    const start = match.index;
    const end = boldRe.lastIndex;

    if (start > lastIndex) {
      nodes.push(...renderSuperscripts(input.slice(lastIndex, start)));
    }

    const inner = match[1] ?? "";
    nodes.push(
      <strong key={`b-${boldKey++}`} className="font-semibold">
        {renderSuperscripts(inner).map((n, i) => (
          <Fragment key={`b-${boldKey}-p-${i}`}>{n}</Fragment>
        ))}
      </strong>
    );

    lastIndex = end;
  }

  if (lastIndex < input.length) {
    nodes.push(...renderSuperscripts(input.slice(lastIndex)));
  }

  return nodes;
}

/**
 * Rich text renderer with full LaTeX/KaTeX support.
 * 
 * Supports:
 * - LaTeX display mode: $$...$$ or \[...\]
 * - LaTeX inline mode: $...$ or \(...\)
 * - Bold text: **bold**
 * - Superscripts: x^2, e^(ax)
 * - Preserves newlines
 * 
 * Examples:
 * - "Find $\frac{1}{2}$ of the value" → renders fraction inline
 * - "Evaluate: $$\int_0^1 x^2 dx$$" → renders integral centered
 * - "$\lim_{x \to 0} \frac{\sin x}{x}$" → renders limit
 * - "$\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}$" → renders matrix
 */
export function RichText({ text, as = "span", className }: RichTextProps) {
  const Component = as as any;
  const raw = String(text ?? "");

  const rendered = useMemo(() => {
    const lines = raw.split(/\r?\n/);
    
    return lines.map((line, lineIndex) => (
      <Fragment key={`l-${lineIndex}`}>
        {renderWithLatex(line).map((node, i) => (
          <Fragment key={`n-${lineIndex}-${i}`}>{node}</Fragment>
        ))}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </Fragment>
    ));
  }, [raw]);

  return (
    <Component className={cn("whitespace-pre-wrap break-words", className)}>
      {rendered}
    </Component>
  );
}
