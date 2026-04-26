import { notFound } from 'next/navigation'
import { ExternalLinkIcon } from 'lucide-react'
import { findPageBySlug, extractHeadings, getPrevNextPages, getAllPages } from '@/lib/docs'
import { renderMdxContent } from '@/lib/mdx'
import { AnimatedDocHeader, AnimatedDocContent, AnimatedDocNav, AnimatedDocToc } from './doc-page-animated'

const GITHUB_REPO = process.env.GITHUB_REPO || 'Trilogy-Care/tc-docs'

export const revalidate = 60

export function generateStaticParams() {
  return getAllPages().map((page) => ({ slug: page.slugParts }))
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const result = findPageBySlug(slug)

  if (!result) notFound()

  const { page, breadcrumb } = result
  const { prev, next } = getPrevNextPages(page.slugParts)

  const githubEditUrl = GITHUB_REPO
    ? `https://github.com/${GITHUB_REPO}/edit/main/${page.filePath}`
    : null
  const isDev = process.env.NODE_ENV === 'development'

  const headings = extractHeadings(page.content)
  const renderedContent = await renderMdxContent(page.content)

  return (
    <div className="flex gap-10">
      <article className="min-w-0 flex-1 space-y-8">
        <AnimatedDocHeader>
          <div>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <a href="/docs" className="hover:text-foreground transition-colors">Docs</a>
                {breadcrumb.slice(0, -1).map((node) => (
                  <span key={node.slug} className="flex items-center gap-2">
                    <span>/</span>
                    <span>{node.title}</span>
                  </span>
                ))}
              </div>

              {githubEditUrl && (
                <a
                  href={githubEditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                  title="Edit on GitHub"
                >
                  <ExternalLinkIcon className="size-3" />
                  Edit on GitHub
                </a>
              )}
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
            {page.description && (
              <p className="mt-2 text-lg text-muted-foreground">{page.description}</p>
            )}
            {page.status && (
              <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {page.status}
              </span>
            )}
          </div>
        </AnimatedDocHeader>

        <AnimatedDocContent>
          <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-headings:font-semibold prose-a:text-primary prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:text-zinc-800 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-100 prose-pre:text-zinc-800 prose-pre:border prose-pre:border-zinc-200 prose-pre:[&_code]:bg-transparent prose-pre:[&_code]:p-0 dark:prose-code:bg-zinc-800 dark:prose-code:text-zinc-200 dark:prose-pre:bg-zinc-900 dark:prose-pre:text-zinc-200 dark:prose-pre:border-zinc-700">
            {renderedContent}
          </div>
        </AnimatedDocContent>

        {isDev && (
          <AnimatedDocNav>
            <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground font-mono">
              {page.filePath}
            </div>
          </AnimatedDocNav>
        )}

        <AnimatedDocNav>
          <nav className="flex items-center justify-between gap-4 border-t pt-6">
            {prev ? (
              <a
                href={`/docs/${prev.slugParts.join('/')}`}
                className="group flex flex-col items-start gap-1 text-sm"
              >
                <span className="text-muted-foreground">Previous</span>
                <span className="font-medium group-hover:text-primary transition-colors">
                  {prev.title}
                </span>
              </a>
            ) : (
              <div />
            )}
            {next ? (
              <a
                href={`/docs/${next.slugParts.join('/')}`}
                className="group flex flex-col items-end gap-1 text-sm"
              >
                <span className="text-muted-foreground">Next</span>
                <span className="font-medium group-hover:text-primary transition-colors">
                  {next.title}
                </span>
              </a>
            ) : (
              <div />
            )}
          </nav>
        </AnimatedDocNav>
      </article>

      {headings.length > 2 && (
        <AnimatedDocToc>
          <aside className="sticky top-20 hidden h-fit w-48 shrink-0 xl:block">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              On this page
            </p>
            <nav className="flex flex-col gap-1.5 border-l">
              {headings.map((heading) => (
                <a
                  key={heading.slug}
                  href={`#${heading.slug}`}
                  className={`text-xs text-muted-foreground transition-colors hover:text-foreground ${
                    heading.level === 2 ? 'pl-3' : heading.level === 3 ? 'pl-5' : 'pl-7'
                  }`}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </aside>
        </AnimatedDocToc>
      )}
    </div>
  )
}
