---
name: playwright
description: Browser automation and testing capabilities for frontend development, UI verification, and JavaScript debugging
icon: "simple-icons:playwright"
---

# Playwright MCP Server

The Playwright MCP server provides comprehensive browser automation and testing capabilities, enabling you to interact with web applications, verify UI behavior, capture screenshots, and debug JavaScript issues.

## Overview

Playwright allows you to control a real browser (Chromium, Firefox, or WebKit) programmatically. Use it to test frontend functionality, verify UI renders correctly, debug JavaScript console errors, and capture visual snapshots of your application.

## Navigation & Page Management

### `browser_navigate`
Navigate to a specific URL.

**Parameters**:
- `url` (required): URL to navigate to

**Use when**: Opening a page to test or inspect.

### `browser_navigate_back`
Go back to the previous page in history.

**Use when**: Returning to a previous page during testing.

### `browser_tabs`
Manage browser tabs (list, create, close, select).

**Parameters**:
- `action` (required): Operation (list, new, close, select)
- `index`: Tab index for close/select operations

**Use when**: Working with multiple tabs.

### `browser_close`
Close the current browser page.

**Use when**: Cleaning up after tests.

## Page Inspection

### `browser_snapshot`
Capture an accessibility snapshot of the current page. **Better than screenshots** for understanding page structure.

**Use when**: You need to understand page layout and elements.

### `browser_take_screenshot`
Take a visual screenshot of the page or specific element.

**Parameters**:
- `filename`: Save location (default: `page-{timestamp}.png`)
- `type`: Image format (png, jpeg) (default: png)
- `fullPage`: Capture full scrollable page (cannot be used with element)
- `element`: Human-readable element description
- `ref`: Exact element reference from snapshot

**Use when**: You need visual verification or to show UI state to user.

### `browser_console_messages`
Get all console messages (logs, errors, warnings).

**Parameters**:
- `onlyErrors`: Return only error messages

**Use when**: Debugging JavaScript errors or checking console output.

### `browser_network_requests`
Get all network requests since page load.

**Use when**: Debugging API calls or checking network activity.

## User Interactions

### `browser_click`
Click on an element.

**Parameters**:
- `element` (required): Human-readable element description
- `ref` (required): Exact element reference from snapshot
- `button`: Mouse button (left, right, middle) (default: left)
- `modifiers`: Modifier keys (Alt, Control, Meta, Shift)
- `doubleClick`: Perform double-click

**Use when**: Interacting with buttons, links, or clickable elements.

### `browser_type`
Type text into an input field.

**Parameters**:
- `element` (required): Human-readable element description
- `ref` (required): Exact element reference from snapshot
- `text` (required): Text to type
- `slowly`: Type one character at a time (for triggering key handlers)
- `submit`: Press Enter after typing

**Use when**: Filling out forms or input fields.

### `browser_press_key`
Press a keyboard key.

**Parameters**:
- `key` (required): Key name (ArrowLeft, Enter, etc.) or character (a, 1, etc.)

**Use when**: Testing keyboard shortcuts or navigation.

### `browser_fill_form`
Fill multiple form fields at once.

**Parameters**:
- `fields` (required): Array of field objects with name, type, ref, and value

**Use when**: Filling out multi-field forms efficiently.

### `browser_hover`
Hover over an element.

**Parameters**:
- `element` (required): Human-readable element description
- `ref` (required): Exact element reference from snapshot

**Use when**: Testing hover effects or tooltips.

### `browser_drag`
Drag and drop between two elements.

**Parameters**:
- `startElement` (required): Source element description
- `startRef` (required): Source element reference
- `endElement` (required): Target element description
- `endRef` (required): Target element reference

**Use when**: Testing drag-and-drop functionality.

### `browser_select_option`
Select an option from a dropdown.

**Parameters**:
- `element` (required): Human-readable dropdown description
- `ref` (required): Exact dropdown reference
- `values` (required): Array of values to select

**Use when**: Selecting from dropdowns or multi-select fields.

### `browser_file_upload`
Upload files to a file input.

**Parameters**:
- `paths`: Array of absolute file paths to upload (if omitted, cancels file chooser)

**Use when**: Testing file upload functionality.

## Advanced Interactions

### `browser_evaluate`
Execute JavaScript in the browser context.

**Parameters**:
- `function` (required): JavaScript function (e.g., `() => { /* code */ }`)
- `element`: Element description (if function needs element parameter)
- `ref`: Element reference (if function needs element parameter)

**Use when**: Executing custom JavaScript or inspecting page state.

```javascript
() => { return document.title }
```

### `browser_wait_for`
Wait for text to appear/disappear or a specific time.

**Parameters**:
- `text`: Text to wait for
- `textGone`: Text to wait to disappear
- `time`: Time to wait in seconds

**Use when**: Waiting for dynamic content or animations.

## Dialog & Window Management

### `browser_handle_dialog`
Handle browser dialogs (alert, confirm, prompt).

**Parameters**:
- `accept` (required): Whether to accept the dialog
- `promptText`: Text for prompt dialogs

**Use when**: A dialog appears during testing.

### `browser_resize`
Resize the browser window.

**Parameters**:
- `width` (required): Window width in pixels
- `height` (required): Window height in pixels

**Use when**: Testing responsive layouts.

## Installation

### `browser_install`
Install the browser specified in the Playwright configuration.

**Use when**: You get an error about the browser not being installed.

## Common Workflows

### Testing Form Submission
1. Use `browser_navigate` to open the page
2. Use `browser_snapshot` to identify form fields
3. Use `browser_fill_form` or `browser_type` to fill fields
4. Use `browser_click` to submit
5. Use `browser_wait_for` for success message
6. Use `browser_snapshot` to verify result

### Debugging JavaScript Errors
1. Use `browser_navigate` to open the page
2. Use `browser_console_messages` with `onlyErrors: true`
3. Use `browser_network_requests` to check API calls
4. Use `browser-logs` tool from Laravel Boost for recent errors

### Visual Regression Testing
1. Use `browser_navigate` to open the page
2. Use `browser_take_screenshot` with `fullPage: true`
3. Compare with previous screenshots

### Testing Interactive Components
1. Use `browser_navigate` to open the page
2. Use `browser_snapshot` to identify elements
3. Use `browser_click`, `browser_hover`, etc. to interact
4. Use `browser_wait_for` for state changes
5. Use `browser_snapshot` to verify new state

## Best Practices

1. **Always use `browser_snapshot` first** to identify elements and get `ref` values
2. **Use `browser_console_messages`** to check for JavaScript errors
3. **Use `browser_take_screenshot`** for visual verification or to show UI to user
4. **Wait for dynamic content** with `browser_wait_for` before assertions
5. **Use exact `ref` values** from snapshots for reliable element targeting
6. **Check network requests** with `browser_network_requests` for API issues

## Element References

When interacting with elements, you need both:
- **`element`**: Human-readable description for permission/context
- **`ref`**: Exact reference from `browser_snapshot` for targeting

Always use `browser_snapshot` first to get these values.

## Limitations

- Cannot perform actions based on screenshots (use `browser_snapshot` instead)
- Interactive input (like `grep -i` or `git rebase -i`) is not supported
- Use `browser_evaluate` for custom JavaScript that doesn't fit other tools
