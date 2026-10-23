"use strict";
import React from "react";
import { ExternalLink } from "lucide-react";
import { useTheme, T as defaultT } from "../context/ThemeContext";

/**
 * Strips and validates URLs to prevent javascript: or malformed URLs.
 */
function sanitizeUrl(rawUrl = "") {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed) return "";
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:") {
      return parsed.toString();
    }
  } catch {
    // If relative path or unparseable, return empty
  }
  return "";
}

/**
 * Pre-processes plain-text descriptions with compressed Markdown formatting
 * by inserting logical section and list line-breaks.
 */
function preprocessMarkup(text = "") {
  if (!text) return "";
  let str = text;

  // 0. Clean any linebreaks inside parenthetical URLs (e.g. https://www.google.com/maps?\nq=...)
  str = str.replace(/\((https?:\/\/[^)]+)\)/g, (m, url) => `(${url.replace(/[\r\n\t]+/g, "")})`);

  // 1. Separate major uppercase headings like **JOB SUMMARY**, **CANDIDATE PROFILE**, **CORE WORK ACTIVITIES**
  str = str.replace(/([^\n])\s*(\*\*[A-Z\s]{4,40}\*\*)/g, (m, p1, p2) => `${p1}\n\n${p2}\n\n`);

  // 2. Separate sub-headings followed by bullet points like **Assisting in Managing...** - Assists in...
  str = str.replace(
    /([^\n])\s*(\*\*[A-Z][a-zA-Z0-9\s,\/\-’']{3,65}\*\*)\s*-\s*/g,
    (m, p1, p2) => `${p1}\n\n${p2}\n- `
  );

  // 3. Separate consecutive key-value headers like **Schedule** Full Time **Located Remotely?** N
  str = str.replace(
    /([^\n])\s*(\*\*(?:Job Number|Job Category|Location|Schedule|Located Remotely\?|Position Type|Education and Experience|Additional Information)\*\*)/gi,
    (m, p1, p2) => `${p1}\n${p2}`
  );

  // 4. Separate inline bullet points like ". - Assists in" or "; - Attends" or "OR - 2-year"
  str = str.replace(/([.;]|OR)\s+-\s+([A-Za-z])/g, (m, p1, p2) => `${p1}\n- ${p2}`);
  str = str.replace(/([^\n])\s+•\s+/g, (m, p1) => `${p1}\n• `);

  return str;
}

/**
 * Tokenizes and parses an inline string into React nodes:
 * Supports **bold**, _italic_, [link](url), Label (https://...), and raw URLs.
 */
function parseInlineMarkup(text = "", T = defaultT) {
  if (!text) return null;

  // Regex captures:
  // 1. Markdown link: [Label](url)
  // 2. Labeled URL: Label (https://...)
  // 3. Raw URL: https://... or http://...
  // 4. Bold: **text** or __text__
  // 5. Italic: *text* or _text_
  const tokenRegex = /(\[[^\]]+\]\([^\)]+\)|[A-Za-z0-9\s\?]+?\s*\((?:https?:\/\/[^\)]+)\)|https?:\/\/[^\s\)]+|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;

  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold **text** or __text__
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} style={{ color: T.text, fontWeight: 700 }}>
          {inner}
        </strong>
      );
    }

    // Italic *text* or _text_
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} style={{ color: T.textMid, fontStyle: "italic" }}>
          {inner}
        </em>
      );
    }

    // Markdown link [Label](url)
    const mdLinkMatch = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
    if (mdLinkMatch) {
      const label = mdLinkMatch[1].trim();
      const safeHref = sanitizeUrl(mdLinkMatch[2]);
      if (safeHref) {
        return (
          <a
            key={index}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: T.purpleL,
              fontWeight: 600,
              textDecoration: "underline",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <span>{label}</span>
            <ExternalLink size={12} style={{ flexShrink: 0 }} />
          </a>
        );
      }
      return label;
    }

    // Labeled URL: Label (https://...) e.g. VIEW ON MAP (https://www.google.com/maps?...)
    const labeledUrlMatch = part.match(/^([A-Za-z0-9\s\?]+?)\s*\((https?:\/\/[^\)]+)\)$/);
    if (labeledUrlMatch) {
      const label = labeledUrlMatch[1].trim();
      const safeHref = sanitizeUrl(labeledUrlMatch[2]);
      if (safeHref) {
        return (
          <a
            key={index}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: T.purpleL,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: T.purpleDim,
              padding: "2px 8px",
              borderRadius: 6,
              border: `1px solid ${T.purpleL}33`,
              margin: "0 2px",
              fontSize: "0.85em",
              verticalAlign: "middle",
              transition: "all 0.15s ease",
            }}
          >
            <span>{label}</span>
            <ExternalLink size={11} style={{ flexShrink: 0 }} />
          </a>
        );
      }
      return `${label} (${labeledUrlMatch[2]})`;
    }

    // Raw standalone URL: https://...
    if (part.startsWith("http://") || part.startsWith("https://")) {
      let url = part;
      let trailing = "";
      const m = url.match(/[.,;!]+$/);
      if (m) {
        trailing = m[0];
        url = url.slice(0, -trailing.length);
      }
      const safeHref = sanitizeUrl(url);
      if (safeHref) {
        return (
          <React.Fragment key={index}>
            <a
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: T.purpleL,
                fontWeight: 500,
                textDecoration: "underline",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                wordBreak: "break-all",
              }}
            >
              <span>{url}</span>
              <ExternalLink size={11} style={{ flexShrink: 0 }} />
            </a>
            {trailing}
          </React.Fragment>
        );
      }
      return part;
    }

    return part;
  });
}

/**
 * JobDescriptionMarkup:
 * Renders job descriptions with full formatting support for:
 * - Bold headings and keywords (**text**)
 * - Links (both markdown [text](url) and interactive labeled links like VIEW ON MAP (url))
 * - Bullet lists (- item or • item)
 * - Section headers
 * - Paragraphs with comfortable line-height and theme-awareness
 */
export default function JobDescriptionMarkup({ content = "", className = "" }) {
  const { isDark } = useTheme();
  const T = defaultT;

  if (!content || typeof content !== "string" || !content.trim()) {
    return (
      <div style={{ color: T.textDim, fontStyle: "italic", fontSize: "0.9rem" }}>
        No detailed description available for this position. Please visit the provider website for full details.
      </div>
    );
  }

  const preprocessed = preprocessMarkup(content);
  const rawParagraphs = preprocessed.split(/\n{2,}/);

  return (
    <div
      className={className}
      style={{
        color: T.textMid,
        fontSize: "0.92rem",
        lineHeight: 1.75,
        wordBreak: "break-word",
      }}
    >
      {rawParagraphs.map((para, pIdx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        const lines = trimmed.split(/\n/);

        // Check if block is a bulleted list
        const isList = lines.every((l) => /^[-•*–—]|\d+\.\s/.test(l.trim()));
        if (isList) {
          return (
            <ul
              key={pIdx}
              style={{
                margin: "0 0 16px",
                paddingLeft: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {lines.map((line, lIdx) => {
                const cleanLine = line.trim().replace(/^[-•*–—\d.)]+\s*/, "");
                return (
                  <li
                    key={lIdx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      lineHeight: 1.65,
                    }}
                  >
                    <span
                      style={{
                        color: T.purpleL,
                        fontWeight: 700,
                        flexShrink: 0,
                        fontSize: "0.85rem",
                        marginTop: 2,
                      }}
                    >
                      •
                    </span>
                    <span style={{ flex: 1 }}>{parseInlineMarkup(cleanLine, T)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Check if paragraph is a major standalone section heading: e.g. **JOB SUMMARY** or ### Heading
        const headingMatch = trimmed.match(/^(?:#{1,4}\s+|\*\*)([A-Z\s,\/\-]{3,45})(?:\*\*|:)?$/);
        if (headingMatch) {
          return (
            <div
              key={pIdx}
              style={{
                margin: pIdx === 0 ? "0 0 10px" : "24px 0 10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 3,
                  height: 16,
                  borderRadius: 2,
                  background: T.purpleL,
                  display: "inline-block",
                }}
              />
              <h4
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: T.text,
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                {headingMatch[1].trim()}
              </h4>
            </div>
          );
        }

        // Mixed block: may contain lines of key-value pairs or mixed bullet points
        return (
          <div key={pIdx} style={{ marginBottom: 14 }}>
            {lines.map((line, lIdx) => {
              const lineTrimmed = line.trim();
              if (!lineTrimmed) return null;

              // Bullet item within paragraph
              if (/^[-•*–—]|\d+\.\s/.test(lineTrimmed)) {
                const clean = lineTrimmed.replace(/^[-•*–—\d.)]+\s*/, "");
                return (
                  <div
                    key={lIdx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      margin: "6px 0",
                      paddingLeft: 4,
                      lineHeight: 1.65,
                    }}
                  >
                    <span
                      style={{
                        color: T.purpleL,
                        fontWeight: 700,
                        flexShrink: 0,
                        fontSize: "0.85rem",
                        marginTop: 2,
                      }}
                    >
                      •
                    </span>
                    <span style={{ flex: 1 }}>{parseInlineMarkup(clean, T)}</span>
                  </div>
                );
              }

              return (
                <p key={lIdx} style={{ margin: "0 0 8px", lineHeight: 1.75 }}>
                  {parseInlineMarkup(lineTrimmed, T)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
