import React from "react"

import type { ExtractedArticle } from "../types"
import { normalizeContentHtml } from "./normalize-content"

interface ExportDocumentProps {
  article: ExtractedArticle
}

export function ExportDocument({ article }: ExportDocumentProps) {
  const normalizedHtml = normalizeContentHtml(article.contentHtml)

  return (
    <article className="plasmo-mx-auto plasmo-w-full plasmo-max-w-[860px] plasmo-rounded-[28px] plasmo-border plasmo-border-[#e9dfd3] plasmo-bg-[#fffdf8] plasmo-px-12 plasmo-py-14 plasmo-text-[#3f3427] plasmo-shadow-[0_24px_60px_rgba(120,84,50,0.12)]">
      <style>
        {`
          .web-export-body {
            font-size: 16px;
            line-height: 1.9;
            color: #3f3427;
            word-break: break-word;
          }

          .web-export-body > :first-child {
            margin-top: 0;
          }

          .web-export-body h1,
          .web-export-body h2,
          .web-export-body h3,
          .web-export-body h4,
          .web-export-body h5,
          .web-export-body h6 {
            margin: 1.8em 0 0.7em;
            font-weight: 600;
            line-height: 1.35;
            color: #2d241b;
          }

          .web-export-body h1 {
            font-size: 2rem;
          }

          .web-export-body h2 {
            font-size: 1.6rem;
          }

          .web-export-body h3 {
            font-size: 1.32rem;
          }

          .web-export-body p,
          .web-export-body ul,
          .web-export-body ol,
          .web-export-body pre,
          .web-export-body table,
          .web-export-body blockquote {
            margin: 1em 0;
          }

          .web-export-body ul,
          .web-export-body ol {
            padding-left: 1.5em;
          }

          .web-export-body li + li {
            margin-top: 0.45em;
          }

          .web-export-body blockquote {
            border-left: 4px solid #dfc5a8;
            background: #fbf4ea;
            color: #6b5642;
            padding: 0.9em 1.1em;
            border-radius: 0 14px 14px 0;
          }

          .web-export-body pre,
          .web-export-body code {
            font-family: "SFMono-Regular", "Menlo", "Consolas", monospace;
          }

          .web-export-body pre {
            overflow: hidden;
            white-space: pre-wrap;
            background: #f7efe4;
            border: 1px solid #eadcc8;
            border-radius: 16px;
            padding: 1em 1.1em;
            line-height: 1.7;
          }

          .web-export-body code {
            background: #f7efe4;
            border-radius: 6px;
            padding: 0.15em 0.35em;
            font-size: 0.92em;
          }

          .web-export-body pre code {
            background: transparent;
            padding: 0;
          }

          .web-export-body table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.95rem;
          }

          .web-export-body th,
          .web-export-body td {
            border: 1px solid #eadcc8;
            padding: 0.7em 0.85em;
            vertical-align: top;
            text-align: left;
          }

          .web-export-body th {
            background: #f8f1e7;
            font-weight: 600;
          }

          .web-export-body a {
            color: #9b5b22;
            text-decoration: underline;
          }

          .web-export-body hr {
            border: 0;
            border-top: 1px solid #eadcc8;
            margin: 2em 0;
          }
        `}
      </style>
      <header className="plasmo-border-b plasmo-border-[#efe4d6] plasmo-pb-8">
        <div className="plasmo-text-[12px] plasmo-uppercase plasmo-tracking-[0.24em] plasmo-text-[#b07d48]">
          Web Export Snapshot
        </div>
        <h1 className="plasmo-mt-4 plasmo-text-4xl plasmo-font-semibold plasmo-leading-tight">
          {article.title}
        </h1>
        <div className="plasmo-mt-5 plasmo-space-y-1 plasmo-text-sm plasmo-text-[#7a6650]">
          <div>{article.url}</div>
          <div>Captured at {new Date(article.capturedAt).toLocaleString()}</div>
          {article.byline ? <div>By {article.byline}</div> : null}
        </div>
        {article.excerpt ? (
          <p className="plasmo-mt-6 plasmo-rounded-2xl plasmo-bg-[#f6ede2] plasmo-px-5 plasmo-py-4 plasmo-text-base plasmo-leading-7 plasmo-text-[#6c5238]">
            {article.excerpt}
          </p>
        ) : null}
      </header>

      <section
        className="web-export-body plasmo-mt-10"
        dangerouslySetInnerHTML={{ __html: normalizedHtml }}
      />
    </article>
  )
}
