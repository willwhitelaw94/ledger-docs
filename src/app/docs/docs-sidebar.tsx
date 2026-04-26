"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavNode } from "@/lib/docs";
import {
  ChevronRightIcon,
  FileTextIcon,
  FolderIcon,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { CodeIcon } from "lucide-react";

/** Get the first navigable page href for a node */
function getNodeHref(node: NavNode): string | undefined {
  if (node.page) return `/docs/${node.page.slugParts.join("/")}`;
  for (const child of node.children) {
    const href = getNodeHref(child);
    if (href) return href;
  }
  return undefined;
}

/** Check if any descendant of this node is the active page */
function isNodeActive(node: NavNode, pathname: string): boolean {
  if (node.page && pathname === `/docs/${node.page.slugParts.join("/")}`) return true;
  return node.children.some((child) => isNodeActive(child, pathname));
}

/** Collect all ancestor slugs of the active page */
function getAncestorSlugs(nodes: NavNode[], pathname: string): Set<string> {
  const result = new Set<string>();
  function walk(node: NavNode): boolean {
    const active = isNodeActive(node, pathname);
    if (active && node.children.length > 0) {
      result.add(node.slug);
    }
    for (const child of node.children) {
      if (walk(child)) {
        result.add(node.slug);
      }
    }
    return active;
  }
  for (const node of nodes) {
    walk(node);
  }
  return result;
}

function NavSection({
  node,
  pathname,
  depth = 0,
  openSlugs,
  onToggle,
}: {
  node: NavNode;
  pathname: string;
  depth?: number;
  openSlugs: Set<string>;
  onToggle: (slug: string) => void;
}) {
  const isActive = isNodeActive(node, pathname);
  const hasChildren = node.children.length > 0;
  const isLeaf = !hasChildren;
  const isOpen = openSlugs.has(node.slug);

  if (isLeaf && node.page) {
    const pageHref = `/docs/${node.page.slugParts.join("/")}`;
    const isPageActive = pathname === pageHref;

    if (depth > 0) {
      return (
        <SidebarMenuSubItem>
          <SidebarMenuSubButton
            isActive={isPageActive}
            className="text-xs"
            render={<Link href={pageHref} />}
          >
            <span className="truncate">{node.title}</span>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      );
    }

    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isPageActive}
          className="text-xs"
          render={<Link href={pageHref} />}
        >
          <FileTextIcon className="size-3.5" />
          <span className="truncate">{node.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Branch node with children
  if (depth === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isActive}
          className="text-xs"
          render={
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onToggle(node.slug);
              }}
            />
          }
        >
          <FolderIcon className="size-3.5" />
          <span className="truncate">{node.title}</span>
          <ChevronRightIcon
            className={cn(
              "ml-auto size-3 text-sidebar-foreground/40 transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
        </SidebarMenuButton>

        {isOpen && (
          <SidebarMenuSub>
            {node.children.map((child) => (
              <NavSection key={child.slug} node={child} pathname={pathname} depth={depth + 1} openSlugs={openSlugs} onToggle={onToggle} />
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  // Nested branch
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        isActive={isActive}
        className="text-xs font-medium"
        render={
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggle(node.slug);
            }}
          />
        }
      >
        <span className="truncate">{node.title}</span>
        {node.children.length > 0 && (
          <ChevronRightIcon
            className={cn(
              "ml-auto size-3 text-sidebar-foreground/40 transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
        )}
      </SidebarMenuSubButton>

      {isOpen && node.children.length > 0 && (
        <SidebarMenuSub>
          {node.children.map((child) => (
            <NavSection key={child.slug} node={child} pathname={pathname} depth={depth + 1} openSlugs={openSlugs} onToggle={onToggle} />
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuSubItem>
  );
}

const SCROLL_KEY = "docs-sidebar-scroll";

export function DocsSidebarNav({ navTree }: { navTree: NavNode[] }) {
  const pathname = usePathname();
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(() => {
    // Seed with ancestors of the current active path
    return getAncestorSlugs(navTree, pathname);
  });

  // When pathname changes, add ancestors of the new page without collapsing anything
  useEffect(() => {
    const ancestors = getAncestorSlugs(navTree, pathname);
    setOpenSlugs((prev) => {
      if (ancestors.size === 0) return prev;
      const merged = new Set(prev);
      for (const slug of ancestors) {
        merged.add(slug);
      }
      // Return same reference if nothing changed
      if (merged.size === prev.size && [...ancestors].every((s) => prev.has(s))) return prev;
      return merged;
    });
  }, [pathname, navTree]);

  // Find scroll container and save/restore scroll position across navigations
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-sidebar="content"]');
    if (!el) return;

    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      el.scrollTop = Number(saved);
    }

    const onScroll = () => {
      sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const handleToggle = useCallback((slug: string) => {
    setOpenSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  return (
    <div>
      {/* Docs home */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/docs"}
                render={<Link href="/docs" />}
              >
                <CodeIcon className="size-3.5" />
                <span>Docs Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Dynamic navigation tree */}
      {navTree.map((topNode) => (
        <SidebarGroup key={topNode.slug}>
          <SidebarGroupLabel className="gap-2 text-[11px] font-semibold uppercase tracking-wider">
            {topNode.title}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {topNode.children.length > 0 ? (
                topNode.children.map((node) => (
                  <NavSection key={node.slug} node={node} pathname={pathname} depth={0} openSlugs={openSlugs} onToggle={handleToggle} />
                ))
              ) : topNode.page ? (
                <NavSection node={topNode} pathname={pathname} depth={0} openSlugs={openSlugs} onToggle={handleToggle} />
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </div>
  );
}
