import { compileMDX } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import remarkDirective from "remark-directive"
import remarkDirectivesToMdx from "./remark-directives-to-mdx"
import { ContentTabs, ContentTab } from "@/components/content/tabs"
import { ContentSteps, ContentStep } from "@/components/content/steps"
import { SelfEvaluation } from "@/components/content/self-evaluation"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

function HeadingWithAnchor({
  level,
  children,
  ...props
}: {
  level: number
  children: React.ReactNode
  [key: string]: unknown
}) {
  const text = typeof children === "string" ? children : String(children)
  const id = slugify(text)
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements

  return (
    <Tag id={id} className="group" {...props}>
      <a href={`#${id}`} className="no-underline">
        {children}
        <span className="ml-2 opacity-0 transition-opacity group-hover:opacity-50">
          #
        </span>
      </a>
    </Tag>
  )
}

/**
 * MDX components available in all content files.
 * Maps component names used in the remark directive transform to actual React components.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const mdxComponents: Record<string, React.ComponentType<any>> = {
  ContentTabs,
  ContentTab,
  ContentSteps,
  ContentStep,
  SelfEvaluation,
  h1: ({ children, ...props }: any) => (
    <HeadingWithAnchor level={1} {...props}>
      {children}
    </HeadingWithAnchor>
  ),
  h2: ({ children, ...props }: any) => (
    <HeadingWithAnchor level={2} {...props}>
      {children}
    </HeadingWithAnchor>
  ),
  h3: ({ children, ...props }: any) => (
    <HeadingWithAnchor level={3} {...props}>
      {children}
    </HeadingWithAnchor>
  ),
  h4: ({ children, ...props }: any) => (
    <HeadingWithAnchor level={4} {...props}>
      {children}
    </HeadingWithAnchor>
  ),
  pre({ children, ...props }: any) {
    return <pre {...props}>{children}</pre>
  },
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Compile markdown/MDX content string into a React element.
 * Supports:
 *  - Standard markdown + GFM (tables, strikethrough, task lists)
 *  - Nuxt MDC directive syntax (::tabs, :::tab, ::steps, :::step)
 *  - Heading anchors with # links
 *  - JSX components via MDX
 */
/**
 * Convert HTML style strings to JSX style objects.
 * MDX requires style={{}} not style="", e.g.:
 *   style="display:flex;gap:12px" → style={{display:"flex",gap:"12px"}}
 */
function convertHtmlStyleToJsx(source: string): string {
  return source.replace(
    /style="([^"]*)"/g,
    (_match, styleStr: string) => {
      const pairs = styleStr
        .split(";")
        .filter((s: string) => s.trim())
        .map((pair: string) => {
          const [prop, ...rest] = pair.split(":")
          const key = prop
            .trim()
            .replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase())
          const value = rest.join(":").trim()
          return `${key}:"${value}"`
        })
      return `style={{${pairs.join(",")}}}`
    }
  )
}

/**
 * Escape angle brackets that aren't valid HTML/JSX tags or code blocks.
 * MDX parses `<int>`, `<5`, `<$50`, `Set<int>` as JSX — escape them.
 * Preserves legitimate HTML tags (div, span, a, img, etc.) and React components (PascalCase).
 */
function escapeBareAngleBrackets(source: string): string {
  // Known HTML tags that may appear in markdown content
  const htmlTags = new Set([
    'a', 'abbr', 'address', 'article', 'aside', 'b', 'bdi', 'bdo', 'blockquote',
    'br', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'dd', 'del',
    'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'fieldset', 'figcaption',
    'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
    'hgroup', 'hr', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend',
    'li', 'main', 'mark', 'menu', 'meter', 'nav', 'ol', 'optgroup', 'option',
    'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's',
    'samp', 'section', 'select', 'slot', 'small', 'source', 'span', 'strong',
    'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea',
    'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr',
    // SVG common
    'svg', 'path', 'circle', 'rect', 'line', 'g', 'text', 'defs', 'use',
  ])

  const lines = source.split("\n")
  let inCodeBlock = false
  const result: string[] = []

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock
      result.push(line)
      continue
    }
    if (inCodeBlock) {
      result.push(line)
      continue
    }
    // Replace < that forms invalid JSX:
    // - <nonLetter... (numbers, symbols) — already caught
    // - <word> where word is not a known HTML tag and not PascalCase (React component)
    result.push(
      line.replace(/<(\/?)([\w-]*)/g, (match, slash: string, tag: string) => {
        if (!tag) {
          // Bare < with no tag name (e.g. <5, <$)
          return "&lt;" + slash
        }
        // Allow closing tags for known HTML
        const tagLower = tag.toLowerCase()
        if (htmlTags.has(tagLower)) return match
        // Allow PascalCase (React components)
        if (/^[A-Z]/.test(tag)) return match
        // Allow HTML comments
        if (tag.startsWith("!")) return match
        // Everything else: escape
        return "&lt;" + slash + tag
      })
    )
  }

  return result.join("\n")
}

/**
 * Convert Nuxt MDC directive syntax to remark-directive syntax.
 *
 * Nuxt MDC uses:
 *   ::name{attrs}  → container open
 *   :::name{attrs} → nested container open
 *   :::            → nested container close
 *   ::             → container close
 *
 * remark-directive uses:
 *   :::name{attrs}  → container (fence style, 3+ colons)
 *   ::::name{attrs} → nested container (4+ colons)
 *   ::::            → nested container close
 *   :::             → container close
 */
function convertMdcToRemarkDirective(source: string): string {
  const lines = source.split("\n")
  let inCodeBlock = false
  const result: string[] = []

  for (const line of lines) {
    const trimmed = line.trimStart()

    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock
      result.push(line)
      continue
    }
    if (inCodeBlock) {
      result.push(line)
      continue
    }

    // Convert Nuxt MDC directive syntax to remark-directive syntax.
    //
    // In Nuxt MDC, parent containers use FEWER colons than children:
    //   ::tabs   (parent, 2 colons)
    //   :::tab   (child, 3 colons)
    //
    // In remark-directive, parent containers need MORE colons than children:
    //   :::::tabs (parent, 5 colons)
    //   ::::tab   (child, 4 colons)
    //
    // Matching order matters: check 3-colon (nested) before 2-colon (container).

    const nestedOpenMatch = trimmed.match(/^:::([\w-]+)(.*)$/)
    const containerOpenMatch = trimmed.match(/^::([\w-]+)(.*)$/)

    if (trimmed === ":::") {
      // Nested container close → 4 colons (matches ::::child)
      result.push(line.replace(":::", "::::"))
    } else if (trimmed === "::") {
      // Container close → 5 colons (matches :::::parent)
      result.push(line.replace("::", ":::::"))
    } else if (nestedOpenMatch) {
      // :::name{...} → ::::name{...} (child, 4 colons)
      result.push(line.replace(/^(\s*):::/, "$1::::"))
    } else if (containerOpenMatch) {
      // ::name{...} → :::::name{...} (parent, 5 colons)
      result.push(line.replace(/^(\s*)::/, "$1:::::"))
    } else {
      result.push(line)
    }
  }

  return result.join("\n")
}

/**
 * Strip Nuxt Content / Markdown-IT attribute syntax that MDX cannot parse.
 * Patterns: {.class-name}, {#id}, {.class .another}, {target="_blank"}, etc.
 * These appear inline after links, images, headings, and blockquotes.
 */
function stripMarkdownAttributes(source: string): string {
  const lines = source.split("\n")
  let inCodeBlock = false
  const result: string[] = []

  for (const line of lines) {
    const trimmed = line.trimStart()
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock
      result.push(line)
      continue
    }
    if (inCodeBlock) {
      result.push(line)
      continue
    }
    // Remove {.class}, {#id}, {attr="value"} patterns outside code blocks
    result.push(line.replace(/\{[.#][^}]*\}/g, ""))
  }

  return result.join("\n")
}

/**
 * Escape all HTML-like angle brackets outside fenced code blocks.
 * This is more aggressive than escapeBareAngleBrackets — it escapes ALL < except
 * in fenced code blocks. Used as a fallback when MDX compilation fails.
 */
function escapeAllAngleBrackets(source: string): string {
  const lines = source.split("\n")
  let inCodeBlock = false
  const result: string[] = []

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock
      result.push(line)
      continue
    }
    if (inCodeBlock) {
      result.push(line)
      continue
    }
    // Escape all < outside code blocks, but preserve inline code spans
    let escaped = ""
    let inInlineCode = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === "`") {
        inInlineCode = !inInlineCode
        escaped += "`"
      } else if (line[i] === "<" && !inInlineCode) {
        escaped += "&lt;"
      } else {
        escaped += line[i]
      }
    }
    result.push(escaped)
  }

  return result.join("\n")
}

export async function renderMdxContent(source: string) {
  const preprocessed = convertMdcToRemarkDirective(
    escapeBareAngleBrackets(stripMarkdownAttributes(convertHtmlStyleToJsx(source)))
  )

  try {
    const { content } = await compileMDX({
      source: preprocessed,
      options: {
        mdxOptions: {
          remarkPlugins: [remarkGfm, remarkDirective, remarkDirectivesToMdx],
        },
      },
      components: mdxComponents,
    })
    return content
  } catch {
    // Fallback: aggressively escape all angle brackets and retry
    const fallback = convertMdcToRemarkDirective(
      escapeAllAngleBrackets(stripMarkdownAttributes(convertHtmlStyleToJsx(source)))
    )
    try {
      const { content } = await compileMDX({
        source: fallback,
        options: {
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkDirective, remarkDirectivesToMdx],
          },
        },
        components: mdxComponents,
      })
      return content
    } catch {
      // Last resort: render as plain pre-formatted text
      return <pre className="whitespace-pre-wrap text-sm">{source}</pre>
    }
  }
}
