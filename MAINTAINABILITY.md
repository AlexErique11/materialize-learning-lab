# Maintainability

Every change must keep the repository clean and easy for a human developer to
understand, modify, and verify. Prefer simple, explicit code over cleverness.

## Code quality

- Follow existing structure and conventions. Keep feature code local, dependencies
  narrow, and interfaces limited to what callers need.
- Give each module, component, and function a clear responsibility. Separate domain
  logic and state transitions from rendering; keep independently changing content
  in structured data. Do not fragment trivial logic into unnecessary files.
- Reuse appropriate components, hooks, utilities, and design tokens. Extract shared
  behavior when real repetition warrants it; do not force unrelated features into
  a generic abstraction or create systems for hypothetical future needs.
- Avoid duplicated domain logic, large copied UI blocks, parallel implementations,
  unnecessary dependencies, and repeated hardcoded style values.
- Keep one source of truth for shared labels, routes, documentation URLs,
  configuration, thresholds, and status definitions. Centralize repeated conceptual
  values where it makes changes safer and clearer.
- Keep presentation rules in CLAUDE.md and the implementation map in UI_LAYOUTS.md.
  Chapter READMEs add chapter-specific details rather than alternate shared-layout
  rules. Update these documents with changes to reusable templates or controls;
  label old audits and prototypes as historical instead of treating them as policy.
- Before adding a dependency, consider existing alternatives, maintenance, bundle
  size, security, and API stability. Do not install libraries for trivial problems.
- Use descriptive names and readable control flow. Name values with domain meaning;
  do not introduce constants or wrappers for obvious expressions.
- Preserve shared interfaces and behavior unless the change requires otherwise.
  Check callers and update affected usages together.
- Handle realistic edge cases. Avoid speculative defensive code, unexplained
  workarounds, and silent architecture changes.
- Comments explain constraints or non-obvious decisions, not what the code already
  says. Document necessary workarounds with a concrete reason.
- Leave production-quality code: no AI attribution, prompt transcripts, generated
  filler comments, debug logs, abandoned alternatives, placeholder scaffolding,
  unused exports, or temporary artifacts. Keep useful technical documentation.
- Keep diffs focused. Do not reformat, rename, or refactor unrelated code.

## Required workflow

1. Locate relevant code and inspect nearby conventions. Search for existing
   implementations before adding components or abstractions. Read only the files
   and sections needed to understand the change. For UI work, identify the exact
   reference page(s), then inspect their component, markup, shared styles, and
   rendered layout before editing. Reuse that implementation where practical;
   do not independently recreate a comparable page and tune it by eye afterward.
   Follow both levels of consistency in [CLAUDE.md](./CLAUDE.md): app-wide shared
   styling across chapters, and equivalent layout and spacing for matching
   visualizations within a chapter. Keep distinct chapter visualizations when
   they serve different learning goals.
2. Make the smallest clean change, with clear boundaries and consistent styling.
   If shared presentation changes, apply it through the shared implementation so
   all affected pages stay aligned. Locate the owner in [UI_LAYOUTS.md](./UI_LAYOUTS.md)
   before editing; a request that applies to all lectures must not become separate
   button markup or spacing fixes in each lecture. For chapter presentation
   requirements, follow [CLAUDE.md](./CLAUDE.md).
3. Check affected callers, realistic edge cases, and relevant tests. Scale
   verification to risk; prioritize semantic correctness and meaningful regressions.
   For UI changes, compare the affected page with its reference pages at relevant
   viewport sizes and states. Check spacing, dimensions, alignment, and responsive
   behavior as well as colors and fonts. Verify structure and equivalent behavior,
   not just the absence of overflow.
   When spacing must stay unchanged, compare the affected title, toolbar, and panel
   bounds before and after. For a shared template change, include every variant and
   the visualization without metric cards; for a control change, check hover,
   keyboard focus, and both themes as applicable.
4. Review the diff. Remove dead code and temporary artifacts, and confirm the
   feature is easy to locate, understand, and change without unrelated knowledge.

Correctness, clarity, and consistency come before abstraction or cleverness.
