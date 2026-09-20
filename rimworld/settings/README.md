# RimWorld framework settings examples

These files are design examples for the proposed RimWorld AI framework. RimAgent does not load them yet.

Each file has an independent revision and stable IDs. Runtime references use IDs, not labels or file order. Secrets use backend secret references and never appear in these files.

| File | Human-editable input |
|---|---|
| `registry.example.yaml` | Settings manifest, load order, ownership, and active revisions |
| `endpoints.example.yaml` | Planner and Decision Selector adapters, limits, and fallbacks |
| `objectives.example.yaml` | Colony outcomes, priorities, constraints, and maintenance targets |
| `task-templates.example.yaml` | Bounded task types and their registered actions and checks |
| `attention.example.yaml` | Interrupts, scoring weights, review cadence, and resource limits |
| `decision-matrices.example.yaml` | Limited choices for food, shelter, mood, research, and combat |
| `guidance/planner.example.md` | Planner instructions and output contract |
| `guidance/reviewer.example.md` | Failure reviewer instructions and proposal contract |
| `evaluation.example.yaml` | Scenarios, metrics, regression fixtures, and promotion gates |
| `research-priorities.example.yaml` | Ranked research capabilities, pins, exclusions, and queue policy |
| `long-term-plans.example.yaml` | Multi-horizon strategy, milestones, dependencies, and replan triggers |
| `action-workflows.example.yaml` | Reusable, bounded task graphs for carrying out goals |
| `settings-generation.example.yaml` | Rules for agent-created settings proposal packages |

## Agent-created settings

The Planner may call a future application tool named `propose_settings_package`. That tool writes only to a proposal workspace. It accepts new instances of allowlisted setting kinds, checks schema versions, IDs, references, workflow cycles, budgets, and tests, then produces a reviewable manifest and diff.

Proposal creation does not activate settings. Activation is a separate transaction that revalidates the complete candidate registry, records the approving policy or human, and preserves the previous registry revision for rollback. A new setting kind, provider secret, action implementation, game predicate, or schema still requires code and human review.

`settings/proposals/winter-readiness/` shows one proposal package for a complex, long-horizon goal. Its files are examples of generated output; they are not active inputs.
