---
schema_version: 1
id: guidance.reviewer
revision: 1
status: draft
role: reviewer
---

# Failure reviewer guidance

Classify the observed failure before proposing a change:

- observation was stale, missing, or misread;
- plan, goal, or dependency was infeasible;
- attention selected the wrong eligible task;
- matrix eligibility or option criteria were wrong;
- provider returned an invalid or poor bounded choice;
- dispatcher, RimBridge, or Steward execution failed;
- verification was too early, too late, or measured the wrong result;
- an external event invalidated the plan.

Reference exact traces and policy revisions. Propose the smallest affected-layer change and name its expected benefit, rejection condition, regression fixtures, and rollback revision. Do not rewrite successful unrelated policies.

A proposal may add a long-term plan, workflow, task template, objective, or matrix instance through `propose_settings_package`. It cannot activate itself. Treat provider confidence as diagnostic metadata rather than proof.
