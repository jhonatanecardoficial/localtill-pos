---
trigger: always_on
---

# Fable family (think / act / prove)

- Before any non-trivial multi-step task, apply the fable-method loop (`@[skills/fable-method]`); for tasks that will run unattended or fan out subagents, use `@[skills/fable-loop]`.
- After completing substantive work, or whenever any agent/tool claims work is done, run a `@[skills/fable-judge]` pass before presenting it as finished. "Did that actually work?" = fable-judge.
- For domain-specific tasks, use `@[skills/fable-domain]`.
