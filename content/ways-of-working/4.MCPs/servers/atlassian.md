---
name: atlassian
description: Full access to Jira and Confluence for project management, documentation, and team collaboration
icon: "simple-icons:atlassian"
---

# Atlassian MCP Server

The Atlassian MCP server provides comprehensive integration with Jira and Confluence, enabling seamless project management, issue tracking, and documentation workflows directly within Claude.

## Overview

This server connects to your Atlassian Cloud instance to provide access to issues, projects, workflows, and Confluence spaces, pages, and comments. It uses the Atlassian Cloud ID to identify your instance.

### Cloud ID

Most tools require a `cloudId` parameter. You can:
- Use a site URL (e.g., "yoursite.atlassian.net")
- Extract from Atlassian URLs
- Use `getAccessibleAtlassianResources` to find your Cloud ID

## Jira Tools

### Issues

#### `getJiraIssue`
Get detailed information about a specific Jira issue.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID or site URL
- `issueIdOrKey` (required): Issue ID (e.g., 10000) or key (e.g., "PROJ-123")
- `expand`: Additional data to include
- `fields`: Specific fields to return

**Use when**: You need details about a specific issue.

#### `searchJiraIssuesUsingJql`
Search for Jira issues using JQL (Jira Query Language).

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `jql` (required): JQL query (e.g., "project = PROJ AND status = Open")
- `fields`: Fields to return (default: summary, description, status, issuetype, priority, created)
- `maxResults`: Maximum results per page (default: 50, max: 100)
- `nextPageToken`: Pagination token

**Use when**: You need to find issues matching specific criteria.

```jql
project = TP AND status = "In Progress" AND assignee = currentUser()
```

#### `createJiraIssue`
Create a new Jira issue in a project.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `projectKey` (required): Project key (e.g., "TP")
- `issueTypeName` (required): Issue type (e.g., "Story", "Bug", "Task")
- `summary` (required): Issue title
- `description`: Issue description in Markdown
- `assignee_account_id`: Assignee's account ID
- `parent`: Parent issue key for subtasks
- `additional_fields`: Additional field values

**Use when**: Creating new issues from conversation.

#### `editJiraIssue`
Update an existing Jira issue.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `issueIdOrKey` (required): Issue ID or key
- `fields` (required): Object with fields to update

**Use when**: Modifying issue details.

#### `transitionJiraIssue`
Move an issue to a new status (e.g., "In Progress" → "Done").

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `issueIdOrKey` (required): Issue ID or key
- `transition` (required): Transition object with ID
- `fields`: Fields to update during transition
- `update`: Operations to perform

**Use when**: Changing issue workflow status.

#### `getTransitionsForJiraIssue`
Get available transitions for an issue.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `issueIdOrKey` (required): Issue ID or key

**Use when**: You need to see what status changes are possible.

#### `addCommentToJiraIssue`
Add a comment to an issue.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `issueIdOrKey` (required): Issue ID or key
- `commentBody` (required): Comment text in Markdown
- `commentVisibility`: Restrict visibility to group or role

**Use when**: Adding notes or updates to issues.

#### `getJiraIssueRemoteIssueLinks`
Get remote links (e.g., Confluence pages) attached to an issue.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `issueIdOrKey` (required): Issue ID or key
- `globalId`: Filter by specific remote item ID

**Use when**: Finding linked Confluence pages or external resources.

### Projects

#### `getVisibleJiraProjects`
Get projects visible to the user.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `action`: Filter by permission (view, browse, edit, create) (default: create)
- `searchString`: Filter by project name or key
- `expandIssueTypes`: Include issue types (default: true)
- `maxResults`: Max results (default: 50, max: 50)
- `startAt`: Pagination offset

**Use when**: Finding projects or checking permissions.

#### `getJiraProjectIssueTypesMetadata`
Get issue types and their metadata for a project.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `projectIdOrKey` (required): Project ID or key
- `maxResults`: Max results (default: 50, max: 200)

**Use when**: Creating issues and need to see available issue types.

#### `getJiraIssueTypeMetaWithFields`
Get detailed field metadata for an issue type.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `projectIdOrKey` (required): Project ID or key
- `issueTypeId` (required): Issue type ID

**Use when**: You need to know what fields are available for an issue type.

### Users

#### `lookupJiraAccountId`
Find user account IDs by display name or email.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `searchString` (required): User name or email

**Use when**: You need to assign issues to users.

#### `atlassianUserInfo`
Get current user information.

**Use when**: You need details about the authenticated user.

### Search

#### `search`
Search Jira and Confluence using Rovo Search.

**Parameters**:
- `query` (required): Search query

**Use when**: You need to search across both Jira and Confluence.

**Important**: Always use this tool instead of JQL/CQL unless explicitly asked for JQL or CQL.

#### `fetch`
Get details of a Jira issue or Confluence page by ARI (Atlassian Resource Identifier).

**Parameters**:
- `id` (required): ARI from search results (e.g., "ari:cloud:jira:cloudId:issue/10107")

**Use when**: Following up on search results.

## Confluence Tools

### Spaces

#### `getConfluenceSpaces`
Get available Confluence spaces.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `keys`: Filter by space keys
- `ids`: Filter by space IDs
- `type`: Filter by space type (global, collaboration, knowledge_base, personal)
- `status`: Filter by status (current, archived)
- `labels`: Filter by labels
- `favoritedBy`: Filter by user favorites
- `sort`: Sort order (id, key, name, etc.)
- `limit`: Max results (default: 25, max: 250)
- `cursor`: Pagination cursor

**Use when**: Discovering available spaces or getting space IDs.

### Pages

#### `getConfluencePage`
Get a specific page with its content (as Markdown).

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `pageId` (required): Page ID (extract from URL)

**Use when**: Reading page content.

#### `getPagesInConfluenceSpace`
Get all pages in a space.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `spaceId` (required): Space ID
- `title`: Filter by title
- `status`: Filter by status (current, archived, deleted, trashed)
- `subtype`: Filter by subtype (live, page)
- `depth`: Filter by depth (all, root)
- `sort`: Sort order
- `limit`: Max results (default: 25, max: 250)

**Use when**: Browsing space content.

#### `getConfluencePageDescendants`
Get all child pages of a specific page.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `pageId` (required): Parent page ID
- `depth`: Maximum depth to traverse
- `limit`: Max results

**Use when**: Exploring page hierarchy.

#### `createConfluencePage`
Create a new Confluence page or live doc.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `spaceId` (required): Space ID
- `title`: Page title
- `body` (required): Page content in **Markdown**
- `parentId`: Parent page ID for nested pages
- `subtype`: Set to "live" for live docs
- `isPrivate`: Make page private to creator

**Use when**: Creating documentation.

#### `updateConfluencePage`
Update an existing Confluence page.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `pageId` (required): Page ID
- `body` (required): Updated content in **Markdown**
- `title`: New title
- `spaceId`: Move to different space
- `parentId`: Change parent page
- `status`: Update status (current, draft)
- `versionMessage`: Describe changes

**Use when**: Updating documentation.

### Comments

#### `getConfluencePageFooterComments`
Get footer comments for a page.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `pageId` (required): Page ID
- `status`: Filter by status (default: current)
- `sort`: Sort order
- `limit`: Max results

**Use when**: Reading page discussions.

#### `getConfluencePageInlineComments`
Get inline comments attached to specific text.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `pageId` (required): Page ID
- `resolutionStatus`: Filter by status (resolved, open, reopened) (default: open)
- `status`: Filter by comment status
- `sort`: Sort order

**Use when**: Reading inline feedback.

#### `createConfluenceFooterComment`
Add a footer comment to a page.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `body` (required): Comment content in Markdown
- `pageId`: Page ID to comment on
- `parentCommentId`: Reply to another comment
- `attachmentId`: Attach file
- `customContentId`: Attach custom content

**Use when**: Adding general page comments.

#### `createConfluenceInlineComment`
Add an inline comment to specific text.

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `body` (required): Comment content in Markdown
- `pageId`: Page ID
- `inlineCommentProperties`: Text selection details (textSelection, textSelectionMatchIndex, textSelectionMatchCount)
- `parentCommentId`: Reply to comment

**Use when**: Commenting on specific text selections.

### Search

#### `searchConfluenceUsingCql`
Search Confluence using CQL (Confluence Query Language).

**Parameters**:
- `cloudId` (required): Atlassian Cloud ID
- `cql` (required): CQL query (e.g., "title ~ 'meeting' AND type = page")
- `expand`: Properties to expand
- `limit`: Max results (default: 25, max: 250)
- `cursor`: Pagination cursor

**Use when**: Searching Confluence with specific criteria.

## Common Workflows

### Syncing Epic Status from Jira
1. Use `searchJiraIssuesUsingJql` to find epic and its stories
2. Calculate completion percentage
3. Update local documentation

### Creating Documentation from PRD
1. Use `getConfluenceSpaces` to find target space
2. Use `createConfluencePage` with Markdown content
3. Link back to Jira epic using comments or remote links

### Updating Issue Progress
1. Use `getJiraIssue` to get current status
2. Use `getTransitionsForJiraIssue` to see available transitions
3. Use `transitionJiraIssue` to move to new status
4. Use `addCommentToJiraIssue` to add progress notes

## Best Practices

1. **Always use Rovo Search** (`search`) unless specifically asked for JQL/CQL
2. **Use Markdown** for all Confluence page content and comments
3. **Extract IDs from URLs** when user provides Jira/Confluence links
4. **Check permissions** with `getVisibleJiraProjects` before creating issues
5. **Use `getAccessibleAtlassianResources`** if Cloud ID is unknown
