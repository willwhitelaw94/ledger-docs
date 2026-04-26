---
title: "Models Explained"
description: Haiku vs Sonnet vs Opus 4.5 - cost vs capability
---

Understanding which model to use and when in Claude Code.

## The `/model` Command

Switch models at any time during your session:

```bash
/model           # Opens interactive model selection menu
/model opus      # Switch directly to Opus 4.5
/model sonnet    # Switch directly to Sonnet 4.5
/model haiku     # Switch directly to Haiku
```

You can also set your model at startup:

```bash
claude --model opus     # Start with Opus
claude --model sonnet   # Start with Sonnet
```

Use `/status` to check which model you're currently using.

## Model Comparison

| Model | Best For | Speed | Cost | Context Window |
|-------|----------|-------|------|----------------|
| **Opus 4.5** | Complex reasoning, architecture decisions, nuanced problems | Slowest | Highest | 200K tokens |
| **Sonnet 4.5** | Daily coding, balanced speed/capability | Medium | Medium | 200K (1M beta) |
| **Haiku** | Quick tasks, simple edits, fast iteration | Fastest | Lowest | 200K tokens |

## Pricing (API)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| **Opus 4.5** | $5 | $25 |
| **Sonnet 4.5** | $3 | $15 |
| **Haiku** | $1 | $5 |

> **Note**: Claude Code subscriptions (Max plans) use different billing. These API prices are for reference when understanding relative costs.

## When to Use Each Model

### Opus 4.5 (Default in Claude Code)

Opus is the default for good reason - it's the most capable model for complex software engineering:

- **Architecture decisions** - designing systems, evaluating trade-offs
- **Complex debugging** - multi-file issues, subtle bugs
- **Nuanced code reviews** - catching edge cases, security issues
- **Large refactors** - understanding entire codebases
- **Agentic workflows** - multi-step tasks that require planning

Most developers use Opus exclusively unless they have specific cost constraints.

### Sonnet 4.5

A solid middle ground when you want faster responses:

- **Routine coding tasks** - implementing straightforward features
- **Quick iterations** - when you're making small changes repeatedly
- **Cost-conscious teams** - ~40% cheaper than Opus with good capability
- **1M context window** - use `sonnet[1m]` alias for very large codebases

### Haiku

Best for speed and simple tasks:

- **Quick edits** - typos, simple refactors, renaming
- **Fast exploration** - when you need rapid responses
- **Simple questions** - syntax lookups, straightforward explanations
- **CI/CD pipelines** - automated checks where speed matters

## What Boris Cherny Uses (Claude Code Creator)

> "I use Opus 4.5 with thinking for everything. It's the best coding model I've ever used, and even though it's bigger & slower than Sonnet, since you have to steer it less and it's better at tool use, it is almost always faster than using a smaller model in the end."
> — Boris Cherny, Head of Claude Code

This is the key insight: **Opus requires less steering**. You spend less time correcting, clarifying, and re-prompting - which often makes it faster overall despite being a "slower" model.

## Practical Guidance

**Default recommendation**: Just use Opus. The capability difference is worth it for most development work. The cost difference is minimal for individual developers, and the reduced need for follow-up questions saves time.

**When to switch to Sonnet/Haiku**:
- You're doing many small, repetitive tasks
- You're on a tight token budget
- You need faster response times for iteration
- The task is straightforward (you know exactly what you want)

**Model aliases available**:
- `default` - Recommended model for your account type
- `opus` - Claude Opus 4.5
- `sonnet` - Claude Sonnet 4.5
- `haiku` - Claude Haiku
- `sonnet[1m]` - Sonnet with 1 million token context
- `opusplan` - Uses Opus for planning, Sonnet for execution (cost optimization)

## Max Plan Auto-Allocation

On Claude's Max subscription plans, the system automatically manages model usage to balance capability and cost. It allocates **Opus until roughly 50% of your token budget** is consumed, then switches to **Sonnet** for the remainder. You can manually override this at any time with `/model`, but the automatic allocation works well for most workflows.

## Key Takeaways

- Use `/model <alias>` to switch models mid-session
- **Opus is the default** - most capable for complex engineering tasks
- **Sonnet** is a good balance of speed and capability
- **Haiku** is fastest and cheapest for simple tasks
- Don't over-optimize - capability usually matters more than cost savings
- Use `/status` to check your current model

## Further Reading

- [How Boris Cherny Uses Claude Code](https://karozieminski.substack.com/p/boris-cherny-claude-code-workflow) - Workflow insights from the creator
- [Claude AI Models 2025: Opus vs Sonnet vs Haiku Guide](https://dev.to/dr_hernani_costa/claude-ai-models-2025-opus-vs-sonnet-vs-haiku-guide-24mn)
- [Which Claude Model Is Best for Coding](https://www.dataannotation.tech/developers/which-claude-model-is-best-for-coding)
- [Claude Pricing Documentation](https://platform.claude.com/docs/en/about-claude/pricing)
- [Claude Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview)
