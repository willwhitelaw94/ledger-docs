import { FileTextIcon, FolderIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getNavTree } from '@/lib/docs'
import type { NavNode } from '@/lib/docs'

function getNodeHref(node: NavNode): string | undefined {
  if (node.page) return `/docs/${node.page.slugParts.join('/')}`
  for (const child of node.children) {
    const href = getNodeHref(child)
    if (href) return href
  }
  return undefined
}

function countPages(node: NavNode): number {
  let count = node.page ? 1 : 0
  for (const child of node.children) {
    count += countPages(child)
  }
  return count
}

export default function DocsIndexPage() {
  const navTree = getNavTree()

  return (
    <div className="space-y-12">
      <div>
        <Badge variant="outline" className="mb-3">Documentation</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          TC-Docs
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Everything you need to understand Story-Driven Development — from process
          guides to tools reference and architecture docs.
        </p>
      </div>

      {navTree.map((topNode) => (
        <div key={topNode.slug} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{topNode.title}</h2>
            <Separator className="mt-2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {topNode.children.map((node) => {
              const href = getNodeHref(node)
              const pageCount = countPages(node)
              if (!href) return null

              return (
                <a key={node.slug} href={href}>
                  <Card className="group flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-lg">
                    <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                      {node.children.length > 0 ? (
                        <FolderIcon className="size-5" />
                      ) : (
                        <FileTextIcon className="size-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {node.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                      </p>
                    </div>
                  </Card>
                </a>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
