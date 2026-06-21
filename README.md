# D-Tech Web-Editor Claude Kit

A lean agent team + skills + a master prompt, built to stop the two-week loop on
the D-Tech Studio web editor and get the editor↔live-site link working and the
sections/components/themes/hover-cards to a high bar.

## The core idea
The loop wasn't a "not enough agents" problem — it was a **verification** problem.
The agent edited blind (stale sandbox files + logged-out editor), so it could never
confirm a change reached the real site. This kit fixes that:
**skill teaches the how · hook enforces the rule · subagent isolates the work**,
all built around one gate — *seen live on the real route = done; nothing else.*

## What's inside
```
.claude/
  CLAUDE.md                      # always-loaded project context + the prime directive
  agents/
    lead-orchestrator.md         # the conductor (main session)
    explorer-analyst.md          # read-only: maps code & reproduces bugs BEFORE edits
    builder.md                   # implements ONE atomic change
    verifier.md                  # proves it live (build + login + publish + screenshot)
    design-reviewer.md           # judges visual quality + hover-cards
  skills/
    verify-live/                 # the mandatory live-verification gate
    no-loop-protocol/            # atomic changes, checkpoints, two-strike stop
    editor-architecture/         # how the editor↔live link is wired
    section-component-design/    # the "so good, so simple" bar + hover-card spec
    theme-system/                # the 8 themes + how theming reaches the live site
  hooks/
    README.md                    # optional deterministic enforcement of the gate
MASTER_PROMPT.md                 # paste this to start a work session
```

## Install (3 steps)
1. Copy the `.claude/` folder into the root of your dtech-showroom repo. Commit it.
2. Open `.claude/CLAUDE.md` and fill every `__FILL__`:
   - repo path, dev command, build command,
   - **how the agent logs into `/editor`** (most important — without it, it can't
     verify and will loop),
   - 2–3 design reference sites you want to benchmark against.
   Then do the same `__FILL__` swaps in the skill/agent bodies (`__BUILD_CMD__`,
   `__DEV_CMD__`, `__LOGIN_METHOD__`, `linear.app, framer.com, stripe.com`).
3. Open Claude Code / Cowork on the repo and paste `MASTER_PROMPT.md`. It starts at
   Phase 0 (make verification possible) — let it.

## The team (why these five, not nine)
Current docs put the sweet spot at 3–5 subagents; beyond that you spend more time
merging summaries than you save, and context fragments — which *causes* loops.
Themes and components aren't separate agents because they're **how-knowledge** →
skills the builder and reviewer both load. Supervisor/problem-solver/tester aren't
separate agents because they're the lead's job, the build-loop itself, and the
verifier respectively.

## One honest expectation
No kit makes the model "never make a mistake." This one makes it **catch its own
mistakes inside one iteration and revert instead of piling on** — which is what
actually ends a loop. Phase 0 is non-negotiable: if the agent can't build, log in,
and load the live site, fix that before anything else.
