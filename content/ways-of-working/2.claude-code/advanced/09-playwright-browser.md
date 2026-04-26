---
title: "Playwright Browser Automation"
description: Browser automation for testing, debugging, and web tasks
---

Automate browser interactions using Playwright MCP server tools for testing, debugging, screenshots, and web automation tasks.

## When to Use

- **UI Testing**: Test user flows, forms, and interactive components
- **Visual Debugging**: Take screenshots or snapshots of pages
- **Frontend Investigation**: Debug rendering issues, check console logs
- **Form Automation**: Fill and submit forms programmatically
- **Integration Testing**: Test full user journeys across multiple pages

## Usage

```
/playwright-browser
```

Or directly use Playwright MCP tools in your conversation.

## Available Tools

### Navigation
| Tool | Purpose |
|------|---------|
| `browser_navigate` | Go to a URL |
| `browser_navigate_back` | Go back to previous page |
| `browser_tabs` | List, create, close, or select tabs |

### Page Inspection
| Tool | Purpose |
|------|---------|
| `browser_snapshot` | Capture accessibility snapshot (best for automation) |
| `browser_take_screenshot` | Take PNG/JPEG screenshot |
| `browser_console_messages` | Get console logs (error, warning, info) |
| `browser_network_requests` | View all network requests |

### Interactions
| Tool | Purpose |
|------|---------|
| `browser_click` | Click elements |
| `browser_type` | Type text into fields |
| `browser_fill_form` | Fill multiple form fields at once |
| `browser_select_option` | Select dropdown options |
| `browser_press_key` | Press keyboard keys |
| `browser_hover` | Hover over elements |
| `browser_drag` | Drag and drop |

### Advanced
| Tool | Purpose |
|------|---------|
| `browser_evaluate` | Execute JavaScript on page |
| `browser_run_code` | Run Playwright code snippets |
| `browser_wait_for` | Wait for text or time |
| `browser_handle_dialog` | Handle alerts/confirms |
| `browser_file_upload` | Upload files |

## Core Workflow

### 1. Navigate to Page
```
browser_navigate → target URL
```

### 2. Inspect Page State
```
browser_snapshot → see accessibility tree and element refs
```

### 3. Interact with Elements
```
browser_click / browser_type / browser_fill_form
```

### 4. Verify Results
```
browser_snapshot → check updated state
browser_console_messages → check for errors
browser_take_screenshot → visual verification
```

## Snapshots vs Screenshots

| Use Snapshots | Use Screenshots |
|---------------|-----------------|
| Understanding page structure | Visual verification |
| Getting element references | Debugging visual issues |
| Faster automation | Sharing with team |
| Most interactions | Documentation |

**Key insight**: Snapshots are better for automation because they provide element references you can interact with.

## Common Workflows

### Test Form Submission

1. Navigate to form page
2. Take snapshot to see form fields
3. Fill form using `browser_fill_form`
4. Click submit button
5. Wait for response
6. Take snapshot to verify success
7. Check network requests for API calls

### Debug UI Issue

1. Navigate to problematic page
2. Take screenshot to see visual state
3. Get console messages for errors
4. Get network requests for failed API calls
5. Take snapshot to see DOM structure
6. Use evaluate to inspect JavaScript state

### Test User Journey

1. Navigate to starting page
2. Click through navigation
3. Fill forms as needed
4. Verify each step with snapshots
5. Check console for errors throughout
6. Take final screenshot

## Example: Test Login Flow

```markdown
1. Navigate to login page
   browser_navigate: https://tc-portal.test/login

2. Take snapshot to see form fields
   browser_snapshot

3. Fill login form
   browser_fill_form:
     - email: "test@example.com"
     - password: "password123"

4. Click login button
   browser_click: "login submit button"

5. Wait for redirect
   browser_wait_for: text "Dashboard"

6. Verify login success
   browser_snapshot
   browser_take_screenshot: "dashboard.png"
   browser_console_messages: level "error"

7. Close browser
   browser_close
```

## Integration with Laravel/Herd

When testing Laravel applications:

- Site is available via Herd at `https://tc-portal.test`
- Use `get-absolute-url` Boost tool to get correct URLs
- Test both happy paths and error states
- Verify validation messages appear correctly
- Check that API endpoints are called

## Best Practices

### Wait Strategies
- Use `browser_wait_for` for dynamic content
- Wait for specific text to appear
- Avoid arbitrary time waits

### Error Handling
- Always check console messages after page loads
- Check network requests for failed API calls
- Take screenshots when tests fail

### Form Filling
- Prefer `browser_fill_form` for multiple fields
- Use `browser_type` for individual fields
- Use `submit: true` to submit forms

## Debugging Tips

### Page Not Loading
- Check network requests for failures
- Check console for JavaScript errors
- Verify URL is correct

### Element Not Found
- Take fresh snapshot
- Verify element ref is correct
- Check if element is in dialog/tab
- Wait for dynamic content

### Interaction Not Working
- Verify element is visible/enabled
- Check for iframes
- Try hovering before clicking
- Check console for JS errors

### Flaky Tests
- Add explicit waits
- Wait for network requests to complete
- Use text-based waits over time-based

## Comparison: Playwright MCP vs Chrome Integration

See [Chrome page](/ways-of-working/claude-code/advanced/11-chrome) for a **detailed comparison of Playwright CLI vs Chrome DevTools** including pros/cons, performance benchmarks, and decision tree.

### Quick Reference

| Feature | Playwright MCP | Chrome DevTools | Chrome Extension |
|---------|----------------|-----------------|------------------|
| **Setup** | Requires MCP server | Built-in MCP | Browser extension |
| **Speed** | Faster (headless) | Variable | Interactive |
| **Headless** | Yes | No | Visual |
| **Automation** | Full programmatic | Programmatic | Interactive |
| **Parallel tests** | Yes (unlimited) | No | No |
| **CI/CD** | Yes | No | No |
| **Authenticated sessions** | No (manual setup) | Yes (preserves) | Yes (preserves) |
| **Best for** | Testing, CI/CD, automation | Live debugging | Real-time pair debugging |

### When to Choose Playwright

✅ **Use Playwright CLI (this tool) when:**
- Writing automated tests
- Running tests in CI/CD
- Testing login flows from scratch
- Need parallel execution
- Testing across browsers
- Performance is critical
- Need network mocking
- Visual regression testing

❌ **Don't use Playwright when:**
- Debugging authenticated sessions
- Need your browser extensions
- Want interactive exploration
- Prefer visual/manual debugging

👉 **For authenticated debugging, use [Chrome DevTools MCP](/ways-of-working/claude-code/advanced/11-chrome) instead.**

## Security Notes

- Only automate authorized websites
- Don't store credentials in code
- Use environment variables for sensitive data
- Respect rate limits when scraping
- Check robots.txt before scraping external sites
