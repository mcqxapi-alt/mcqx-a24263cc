import { Fragment } from "react";
import { cn } from "@/lib/utils";

type RichTextProps = {
  text?: string | null;
  /** Which HTML element to render */
  as?: keyof JSX.IntrinsicElements;
  className?: string;
};

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
 * Safe, dependency-free rich text renderer for our question bank.
 * - Renders **bold** markers from AI/DB cleanly
 * - Renders common math powers like e^(ax), x^2 using <sup>
 * - Preserves newlines and wraps long expressions
 */
export function RichText({ text, as = "span", className }: RichTextProps) {
  const Component = as as any;
  const raw = String(text ?? "");

  const lines = raw.split(/\r?\n/);

  return (
    <Component className={cn("whitespace-pre-wrap break-words", className)}>
      {lines.map((line, lineIndex) => (
        <Fragment key={`l-${lineIndex}`}>
          {renderBoldAndMath(line).map((node, i) => (
            <Fragment key={`n-${lineIndex}-${i}`}>{node}</Fragment>
          ))}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </Fragment>
      ))}
    </Component>
  );
}
