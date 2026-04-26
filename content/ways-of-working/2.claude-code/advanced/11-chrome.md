---
title: Chrome
description: Browser automation, debugging, and Cowork for knowledge work
---

Three ways to connect Claude with your browser:

| Tool | What It Does | Best For |
|------|-------------|----------|
| **Cowork** | Desktop agent for knowledge work | Research, documents, file management |
| **Chrome Extension** | Real-time screenshots + pair debugging | Visual issues, interactive debugging |
| **Chrome DevTools MCP** | Programmatic browser control | Deep debugging, network/console |

---

## Cowork - Desktop Agent

Cowork is Anthropic's general-purpose desktop agent. Think of it as **Claude Code without the terminal** - designed for knowledge work that doesn't involve coding.

### How It Works

1. Give Claude access to a folder on your computer
2. Claude can read, edit, and create files in that folder
3. Complex tasks spawn parallel sub-agents, each with fresh context
4. You review and approve actions

### Best For

- Document organization and analysis
- Research and summarization
- File management and cleanup
- Business planning and strategy
- Any multi-step knowledge work

### Requirements

- Claude Max subscription ($100-200/month)
- Claude Desktop app (macOS)
- Windows support coming soon

---

## Chrome Extension

Let Claude see your browser in real-time via screenshots.

### When to Use

- **Pair Debugging**: Work together with Claude on a live problem
- **Real-time Guidance**: Claude guides your next steps based on what it sees
- **Visual Context**: Claude sees screenshots of your current browser state
- **Web Research**: Read pages, fill forms, navigate sites

### Installation

1. Join the waitlist at [claude.ai/chrome](https://claude.ai/chrome)
2. Install the extension from Chrome Web Store
3. Authenticate with your Claude credentials
4. Configure trusted site access

### How It Works

```text
You: "Help me debug why the form isn't submitting"

Extension: Sends screenshot to Claude
Claude: "I see the form. Let me check the console..."

You: Click inspect, examine network tab
Extension: Sends updated screenshot
Claude: "I see a 400 error on the API call. Try..."
```

### What Claude Sees

- **Page Screenshots**: Visual state of current page
- **URL**: Which page you're on
- **Console Logs**: Errors and warnings
- **Network Activity**: Recent API calls
- **DOM Inspector**: Element information if you inspect

### Security Considerations

- Runs in a filesystem sandbox by default
- Limit extension access to trusted sites only
- Be careful extending default internet access settings
- Review automations before approving sensitive actions

---

## Chrome DevTools MCP

Use Chrome DevTools as an MCP server for programmatic browser debugging.

### When to Use

- **Real-time Debugging**: Watch your code execute in the browser
- **Console Interaction**: Run JavaScript and see results immediately
- **Network Debugging**: Inspect XHR, API calls, WebSocket traffic
- **DOM Inspection**: Examine and modify the live DOM
- **Performance Analysis**: Profile page load and execution

### Setup

1. Install Chrome DevTools MCP server
2. Configure in Claude settings:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "node",
      "args": ["path/to/chrome-devtools-mcp.js"]
    }
  }
}
```

3. Start Chrome with debugging port:

```bash
google-chrome --remote-debugging-port=9222
```

### Available Tools

#### Navigation & Tabs

| Tool | Purpose |
|------|---------|
| `chrome_navigate` | Navigate to URL |
| `chrome_reload` | Reload page |
| `chrome_go_back` | Go back in history |
| `chrome_create_tab` | Open new tab |
| `chrome_close_tab` | Close tab |

#### DOM & Elements

| Tool | Purpose |
|------|---------|
| `chrome_query_selector` | Find element by selector |
| `chrome_get_element` | Get element properties |
| `chrome_inspect_element` | Inspect element details |
| `chrome_modify_dom` | Update DOM element |

#### JavaScript Execution

| Tool | Purpose |
|------|---------|
| `chrome_console_eval` | Execute JavaScript |
| `chrome_get_console_logs` | Read console output |
| `chrome_clear_console` | Clear console |

#### Network

| Tool | Purpose |
|------|---------|
| `chrome_get_network_requests` | View all network traffic |
| `chrome_monitor_network` | Watch network activity |
| `chrome_get_response` | Get response body from request |

---

## Cowork + Chrome Together

The real power comes from combining both:

```
User: "Research competitors and summarize findings"

Cowork: Creates research folder structure
Chrome: Visits competitor websites, extracts data
Cowork: Organizes findings into summary document
```

### Practical Examples

**Research Project:**
1. Cowork creates folder structure
2. Chrome gathers information from multiple sources
3. Cowork organizes and summarizes findings
4. Final output: structured research document

**Competitive Analysis:**
1. Chrome visits competitor websites
2. Extracts pricing, features, positioning
3. Cowork compiles comparison matrix
4. Exports to spreadsheet format

---

## Playwright CLI vs Chrome DevTools: The Full Picture

Understanding when to use **Playwright MCP** vs **Chrome DevTools MCP** is critical for effective browser automation with Claude Code.

### The Fundamental Difference

| Aspect | Playwright CLI (MCP) | Chrome DevTools (MCP) |
|--------|----------------------|------------------------|
| **Architecture** | Standalone browser automation | Attaches to running Chrome instance |
| **Control** | Claude fully controls browser | Claude inspects/modifies existing session |
| **Setup** | Just install MCP server | Requires Chrome with debugging port |
| **State** | Fresh browser every time | Preserves your existing session |

### Why Playwright CLI is Powerful

**Superpowers:**

1. **Hermetic Testing** - Each test starts with clean slate
2. **Parallelization** - Run multiple browser instances simultaneously
3. **Cross-browser** - Test Chrome, Firefox, Safari, Edge
4. **Headless by Default** - Faster execution, CI/CD friendly
5. **Network Interception** - Mock API responses, simulate failures
6. **Device Emulation** - Test mobile layouts programmatically
7. **Auto-wait** - Intelligent waiting for elements/network
8. **Video/Trace Recording** - Full replay of test execution

**Best for:**
- Automated testing (unit, integration, E2E)
- CI/CD pipelines
- Regression testing
- Performance testing
- Visual regression testing
- Scraping/automation tasks

**Limitations:**
- Can't access your authenticated sessions
- Can't see your extensions
- Can't interact with your bookmarks/settings
- Starts fresh every time

### Why Chrome DevTools is Powerful

**Superpowers:**

1. **Real Session** - Access authenticated apps (no login needed)
2. **Extensions Access** - Works with your installed extensions
3. **Live Debugging** - Debug while you interact
4. **Cookies/Storage** - Preserves your session state
5. **Personalization** - Your settings, history, autofill
6. **Network Throttling** - Simulate slow connections
7. **Coverage Analysis** - See unused CSS/JS
8. **Performance Profiling** - CPU/Memory analysis

**Best for:**
- Debugging authenticated applications
- Pair programming with Claude
- Interactive exploration
- Real-time troubleshooting
- Inspecting production sites
- Using existing sessions

**Limitations:**
- Single browser instance only
- Requires manual Chrome startup
- Not CI/CD friendly
- Slower than headless
- Can't run in parallel

### Practical Decision Tree

```
Need to test? → Playwright CLI
└─ Automated tests, CI/CD, regression testing

Need to debug? → Chrome DevTools
└─ Visual issues, live debugging, authenticated apps

Need both? → Use both!
└─ Playwright for tests, DevTools for debugging
```

### Real-World Examples

**Use Playwright CLI when:**

```text
✓ "Run all E2E tests and report failures"
✓ "Test login flow with invalid credentials"
✓ "Take screenshots of all pages at mobile width"
✓ "Scrape pricing data from 10 competitor sites"
✓ "Test checkout flow with mock payment gateway"
```

**Use Chrome DevTools when:**

```text
✓ "Debug why the form submit isn't working in staging"
✓ "Inspect why this authenticated API call is failing"
✓ "Check what network requests happen when I click this"
✓ "See what's in localStorage after login"
✓ "Profile memory usage on the dashboard page"
```

### Performance Comparison

| Task | Playwright CLI | Chrome DevTools | Winner |
|------|----------------|-----------------|--------|
| Test execution | ~2-5s per test | ~5-10s per test | Playwright |
| Startup time | ~500ms | Manual (varies) | Playwright |
| Parallel tests | Yes (unlimited) | No (single instance) | Playwright |
| CI/CD integration | Native | Not supported | Playwright |
| Interactive debugging | No | Yes | DevTools |
| Authenticated testing | Manual setup | Automatic | DevTools |

### The Hybrid Approach

**Maximum effectiveness: Use both together**

1. **Develop with DevTools** - Debug interactively in real browser
2. **Automate with Playwright** - Convert debugging to automated tests
3. **Repeat** - DevTools finds issues, Playwright prevents regressions

```text
Example workflow:
1. Bug reported in authenticated app
2. Use Chrome DevTools to debug live
3. Identify root cause
4. Write Playwright test to prevent regression
5. Test runs in CI on every commit
```

## Comparison: When to Use What

| Feature | Cowork | Chrome Extension | DevTools MCP | Playwright MCP |
|---------|--------|------------------|--------------|----------------|
| **Best for** | Knowledge work | Visual debugging | Live debugging | Automated testing |
| **Interaction** | File-based | Interactive UI | Programmatic | Programmatic |
| **User involvement** | Medium | High (you drive) | Medium | Low (fully automated) |
| **CI/CD compatible** | No | No | No | Yes |
| **Authenticated sessions** | N/A | Yes | Yes | No (requires setup) |
| **Parallel execution** | Via subagents | No | No | Yes |
| **Speed** | Medium | Slow (visual) | Medium | Fast (headless) |

### Choose Based On:

- **Documents and research**: Cowork
- **Visual issues / pair debugging**: Chrome Extension
- **Live debugging authenticated apps**: Chrome DevTools MCP
- **Automated testing / CI/CD**: Playwright MCP
- **Maximum effectiveness**: Use all together

---

## Reference: Reddit Community Insights

The Claude Code community has extensively documented the power of Playwright CLI + Claude Code for browser automation. Key insights:

- **"Playwright CLI superpowers"** - Ability to fully automate complex user journeys
- **Testing at scale** - Run hundreds of tests in parallel
- **Visual regression** - Catch UI bugs before production
- **Network mocking** - Test edge cases without backend changes

See: [r/ClaudeCode discussion on Playwright CLI](https://www.reddit.com/r/ClaudeCode/comments/1r03a0t/claude_code_playwright_cli_superpowers/)

---

## Troubleshooting

### Extension Won't Connect
- Is Claude Code running?
- Is the extension enabled?
- Try refreshing the browser tab

### DevTools Won't Connect
- Is Chrome running with `--remote-debugging-port=9222`?
- Check MCP server logs
- Verify no firewall blocking localhost:9222

### Commands Timing Out
- Chrome tab might be frozen
- Try `chrome_reload`
- Check console for JavaScript errors

---

## Sources

- [Introducing Cowork](https://claude.com/blog/cowork-research-preview) - Anthropic's announcement
- [Piloting Claude in Chrome](https://www.anthropic.com/news/claude-for-chrome) - Chrome extension details
- [Simon Willison's First Impressions](https://simonwillison.net/2026/Jan/12/claude-cowork/) - Detailed hands-on review
