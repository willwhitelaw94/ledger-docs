/**
 * Remark plugin that transforms Nuxt MDC directive syntax into MDX component nodes.
 *
 * Converts:
 *   ::tabs{default="Business View"}
 *   :::tab{label="Business View"}
 *   content
 *   :::
 *   ::
 *
 * Into JSX component calls for ContentTabs / ContentTab.
 *
 * Also injects a `tabLabels` prop on ContentTabs listing all child tab labels,
 * so the client component can render tab buttons without inspecting children.
 */
import { visit } from "unist-util-visit"
import type { Plugin } from "unified"

// Maps directive names to component names
const COMPONENT_MAP: Record<string, string> = {
  tabs: "ContentTabs",
  tab: "ContentTab",
  steps: "ContentSteps",
  step: "ContentStep",
}

const remarkDirectivesToMdx: Plugin = () => {
  return (tree) => {
    visit(tree, (node) => {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        const directive = node as {
          type: string
          name: string
          attributes?: Record<string, string>
          data?: Record<string, unknown>
          children?: Array<{ name?: string; attributes?: Record<string, string> }>
        }

        const componentName = COMPONENT_MAP[directive.name]
        if (!componentName) return

        const attributes = directive.attributes || {}
        const jsxAttributes = Object.entries(attributes).map(([key, value]) => ({
          type: "mdxJsxAttribute" as const,
          name: key === "default" ? "defaultTab" : key,
          value: value,
        }))

        // For tabs containers, extract child tab labels and pass as a prop
        if (directive.name === "tabs" && directive.children) {
          const labels = directive.children
            .filter((c) => c.name === "tab" && c.attributes?.label)
            .map((c) => c.attributes!.label)

          if (labels.length > 0) {
            jsxAttributes.push({
              type: "mdxJsxAttribute",
              name: "tabLabels",
              value: JSON.stringify(labels),
            })
          }
        }

        Object.assign(directive, {
          type: "mdxJsxFlowElement",
          name: componentName,
          attributes: jsxAttributes,
          children: directive.children || [],
          data: { _mdxExplicitJsx: true },
        })
      }
    })
  }
}

export default remarkDirectivesToMdx
