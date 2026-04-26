---
title: "Voice Input with Whisper Flow"
description: Using voice to communicate with Claude Code
---

Hit a command, speak naturally, get results.

## The Math: Why Voice Input Matters

**Average speaking speed**: ~150-180 words per minute (comfortable pace)
**Professional speaking speed**: ~200-300 words per minute
**Average typing speed**: ~40-60 words per minute
**Fast typist**: ~80-100 words per minute

Even a fast typist at 100 WPM gets **100-200% more context** into their prompts by speaking instead.

### Test Your Own Typing Speed

Before dismissing voice input, take a typing test: [typing.com/student/tests](https://www.typing.com/student/tests)

If you type less than 150 WPM (most people do), voice input will significantly increase the context you can provide to Claude.

## Why More Context = Better Results

**Ambiguity kills AI performance.** When Claude has to guess what you mean, it often guesses wrong. The fix isn't better prompting techniques - it's more detail.

Voice input removes the friction of adding context:
- You naturally explain background and constraints
- You mention edge cases you'd skip when typing
- You provide the "why" along with the "what"
- You think out loud, which Claude can use

A 50-100% increase in prompt detail often means:
- Fewer follow-up questions from Claude
- Better first-attempt solutions
- Less time spent correcting misunderstandings

## Setup Options

### Option 1: Wispr Flow (Recommended)

[Wispr Flow](https://wisprflow.ai/use-cases/claude) is a dedicated voice-to-text app that works anywhere on your system.

**Features:**
- Claims 4x faster than typing (~220 WPM)
- Works in any application (terminal, browser, editors)
- Available on Mac, Windows, and iPhone
- Syncs personal dictionary across devices

**Privacy**: Data never used for training unless you opt-in. You own your data.

**Setup**: Download from [wisprflow.ai](https://wisprflow.ai), grant microphone permissions, set your hotkey.

### Option 2: VoiceMode MCP (Local/Free)

For privacy-conscious users who want fully local transcription with no cloud APIs.

```bash
# Install VoiceMode
curl -LsSf https://astral.sh/uv/install.sh | sh
uvx voice-mode-install

# Install local Whisper STT
voicemode whisper install
```

Once configured, type "listen" in Claude Code to activate voice input.

**Pros**: Free, fully offline, no subscription
**Cons**: Requires setup, may need GPU for fast transcription

### Option 3: Mac Built-in Dictation

macOS has built-in dictation that works in any text field:

1. **System Settings** → **Keyboard** → **Dictation** → Enable
2. Set a keyboard shortcut (default: press Fn twice)
3. Use in terminal or any app

**Pros**: Already installed, no setup
**Cons**: Requires internet (uses Apple servers), less accurate for technical terms

### Option 4: Spokenly (Mac)

[Spokenly](https://www.vibesparking.com/en/blog/ai/claude-code/2025-08-26-spokenly-claude-code-voice-vibe-coding-mac/) offers on-device Apple Speech Recognition.

- 100+ languages supported
- Local-only privacy mode (fully offline)
- Push-to-talk hotkey

## Best Practices

### When to Use Voice

- **Complex explanations** - describing architecture, requirements, or context
- **Initial prompts** - setting up the problem space
- **Brainstorming** - thinking through approaches out loud
- **Long instructions** - when typing would take too long

### When to Type

- **Code snippets** - specific syntax, variable names
- **Quick commands** - `/commit`, `/model opus`
- **Corrections** - fixing small errors in Claude's output
- **Quiet environments** - meetings, shared spaces

### Tips for Better Voice Input

1. **Speak naturally** - Don't try to dictate punctuation or formatting
2. **Pause between thoughts** - Give the transcription time to catch up
3. **Spell out technical terms** - "the API endpoint, A-P-I endpoint"
4. **Review before sending** - Glance at the transcription for errors

## Key Takeaways

- Speaking is 2-4x faster than typing for most people
- More context = less ambiguity = better Claude output
- Voice input gives you 50-100% uplift in prompt detail
- Multiple setup options: Wispr Flow (easiest), VoiceMode MCP (free/local), Mac dictation (built-in)
- Test your typing speed first - if under 150 WPM, voice input will help

## Further Reading

- [Wispr Flow with Claude](https://wisprflow.ai/use-cases/claude)
- [VoiceMode MCP on GitHub](https://github.com/mbailey/voicemode)
- [Voice-Driven Coding with Spokenly](https://www.vibesparking.com/en/blog/ai/claude-code/2025-08-26-spokenly-claude-code-voice-vibe-coding-mac/)
