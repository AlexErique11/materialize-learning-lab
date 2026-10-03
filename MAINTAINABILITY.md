# Maintainability Rules

These rules apply to every code change in this repository.

The goal is not only to make the requested feature work. Every change must also keep the project easy to understand, modify, extend, test, and debug.

## Core Principle

A developer unfamiliar with the project should be able to:

1. Find where a feature is implemented.
2. Understand the relevant code without reading unrelated parts of the project.
3. Modify the feature without breaking unrelated functionality.
4. Verify that the change works.

Prefer simple, explicit, predictable code over clever abstractions.

---

# Before Making Any Change

Before editing code:

1. Inspect the relevant existing files.
2. Understand the current project structure and conventions.
3. Search for existing components, utilities, styles, hooks, constants, or patterns that already solve part of the problem.
4. Identify whether the requested change belongs in:
   - UI/presentation
   - application logic
   - data/configuration
   - shared styling
   - utilities
   - state management
5. Prefer extending an existing appropriate abstraction over creating a parallel implementation.

Do not immediately create new files, components, utilities, or abstractions without first checking whether the project already has an appropriate place for the change.

---

# 1. Keep Changes Local

A change to one feature should affect as few unrelated files as reasonably possible.

Avoid designs where modifying one page or feature requires understanding many unrelated parts of the application.

Do not introduce unnecessary coupling between components or features.

Prefer:

```text
Feature
├── UI
├── feature-specific logic
└── feature-specific data
```

over unrelated code spread throughout the repository.

---

# 2. Single Responsibility

Each component, function, hook, utility, or module should have one clear responsibility.

Avoid large components that simultaneously handle:

- rendering
- data transformation
- application logic
- API interaction
- configuration
- complex state management

If clearly separate responsibilities exist, separate them.

However, do not split code into tiny files purely for the sake of abstraction.

A small component containing closely related logic is preferable to unnecessary fragmentation.

---

# 3. Reuse Existing Components

Before creating a new component, check whether an existing component can be reused or extended cleanly.

If the same UI structure appears multiple times, prefer a reusable component with clearly defined props.

Do not copy and paste large UI sections and modify them slightly.

Example:

```jsx
<MetricCard title="Rows" value={rowCount} />
<MetricCard title="Latency" value={latency} />
```

is preferable to maintaining two nearly identical implementations.

Do not force unrelated UI into one generic component merely because they look somewhat similar.

Reuse should reduce duplication without making the component difficult to understand.

---

# 4. Separate Content From Presentation

Content that changes independently from the layout should generally live outside the rendering code.

Examples include:

- chapter information
- documentation links
- exercises
- checkpoints
- labels
- navigation items
- educational content
- configuration

Prefer structured data:

```js
const documentationLinks = [
  {
    title: "Temporal filters",
    url: "...",
  },
];
```

instead of repeatedly hardcoding equivalent structures inside JSX.

The UI should primarily be responsible for displaying the data.

---

# 5. Separate Logic From Rendering

Complex calculations and application behavior should not be buried inside JSX.

Prefer:

```text
Component
    ↓
hook / utility / feature logic
    ↓
result
```

The component should primarily decide how the result is displayed.

Examples of logic that should usually be extracted when non-trivial:

- checkpoint conditions
- filtering
- progress calculations
- transformations
- parsing
- validation
- state transitions

Do not extract trivial one-line expressions just to satisfy this rule.

---

# 6. Use One Source of Truth

Do not duplicate information that represents the same concept.

Examples:

- colors
- spacing
- breakpoints
- route names
- documentation URLs
- feature configuration
- thresholds
- shared labels
- status definitions

If changing one conceptual value requires editing several unrelated places, consider centralizing it.

---

# 7. Use Shared Design Tokens

Do not introduce arbitrary visual values if the project already has an established design system.

Reuse existing:

- colors
- spacing
- typography
- border radii
- shadows
- breakpoints
- component styles

Prefer variables/tokens such as:

```css
var(--color-primary)
var(--spacing-section)
var(--radius-card)
```

over repeatedly hardcoding values.

Before introducing a new visual value, check whether an equivalent already exists.

Small one-off layout adjustments are acceptable when genuinely specific to a component.

---

# 8. Avoid Style Duplication

Do not create multiple large style definitions that differ by only one or two properties.

Extract shared base styles when doing so clearly reduces duplication.

For example:

```text
.card
.documentation-card
.checkpoint-card
```

can share a common base when appropriate.

Do not create complicated CSS abstractions merely to eliminate a few repeated declarations.

Readability is more important than eliminating every repeated line.

---

# 9. Use Clear Names

Names should communicate intent.

Prefer:

```text
DocumentationPanel
CheckpointOverlay
MetricCard
ChapterNavigation
getCheckpointProgress
documentationLinks
```

Avoid vague names such as:

```text
Box2
Thing
NewComponent
FinalCard
data2
temp
helper
```

A developer should usually understand what something represents from its name.

---

# 10. Avoid Magic Values

Values with domain meaning should not appear unexplained throughout the code.

Avoid:

```js
if (progress >= 0.72)
```

when `0.72` represents an actual rule.

Prefer:

```js
const CHECKPOINT_COMPLETION_THRESHOLD = 0.72;
```

Do not create constants for obvious local values that have no independent meaning.

---

# 11. Keep Interfaces Small

Components and functions should receive only the data they need.

Avoid:

```jsx
<MetricCard appState={appState} />
```

when the component only requires:

```jsx
<MetricCard
  label="Rows processed"
  value={rowsProcessed}
/>
```

Small interfaces reduce coupling and make components easier to understand and reuse.

---

# 12. Preserve Existing Project Structure

Follow the project's existing folder structure and naming conventions.

Do not introduce a new architectural pattern for a single feature unless the existing structure cannot reasonably support it.

New files should be placed where another developer would naturally expect to find them.

If similar files already exist, follow their location and naming pattern.

---

# 13. Avoid Unnecessary Dependencies

Do not add a third-party dependency unless it provides meaningful value over a simple local implementation.

Before adding a dependency, consider:

- maintenance burden
- bundle size
- security
- API stability
- whether the project already has equivalent functionality

Do not install a library to solve a trivial problem.

---

# 14. Avoid Premature Abstraction

Do not create generic systems for hypothetical future requirements.

Do not introduce:

- factories
- registries
- plugin architectures
- generic configuration engines
- deep class hierarchies
- unnecessary wrapper components

unless the current problem genuinely requires them.

Prefer solving the current known requirements cleanly.

A little duplication can be better than the wrong abstraction.

---

# 15. Keep Functions and Components Understandable

If a function or component becomes difficult to understand in one pass, identify whether it contains several responsibilities.

There is no strict line-count limit.

Do not split code mechanically based on size alone.

Split when doing so creates clearer conceptual boundaries.

---

# 16. Comments Explain Why

Do not write comments that merely repeat the code.

Bad:

```js
// Increment count
count++;
```

Useful:

```js
// Keep checkpoint state locally so the lab remains usable
// during temporary database disconnections.
```

Comments should primarily explain:

- non-obvious decisions
- constraints
- workarounds
- unusual behavior
- architectural reasoning

Prefer making code self-explanatory through good naming whenever possible.

---

# 17. Temporary Workarounds Must Be Explicit

Avoid unexplained hacks.

For example:

```css
margin-left: -37px;
```

may be valid, but if the reason is not obvious and the value depends on another layout constraint, document why it exists.

Do not leave vague comments such as:

```text
TODO fix this later
```

when the actual problem can be described.

---

# 18. Preserve Backwards Compatibility

When changing an existing component, function, or data structure:

1. Search for its usages.
2. Determine what existing behavior depends on it.
3. Avoid changing its interface unnecessarily.
4. Update all affected usages if an interface change is genuinely required.

Do not silently change shared behavior to satisfy one caller.

---

# 19. Handle Edge Cases Deliberately

For logic changes, consider relevant edge cases such as:

- empty data
- missing optional values
- loading states
- errors
- duplicate values
- repeated actions
- unexpected input
- zero values
- long text
- different viewport sizes

Do not add defensive code for impossible scenarios without reason.

Handle realistic failure cases based on how the application actually works.

---

# 20. Tests Should Protect Important Behavior

When modifying important application logic, update or add tests when practical.

Prioritize testing:

- calculations
- state transitions
- parsing
- filtering
- checkpoint behavior
- navigation behavior
- validation
- data transformations
- bug regressions

Do not add tests purely to increase test count.

Tests should protect behavior that could realistically break during future changes.

---

# 21. Keep Diffs Focused

When implementing a requested change, do not unnecessarily:

- reformat unrelated files
- rename unrelated variables
- restructure unrelated components
- rewrite working code
- change styles outside the requested area

A pull request or commit should make it easy to see what changed and why.

If significant refactoring is necessary to implement the feature correctly, keep the refactoring clearly related to the requested change.

---

# 22. Do Not Silently Rewrite Architecture

If implementing a seemingly small request would require a major architectural change, do not perform that rewrite casually.

First determine whether there is a simpler solution consistent with the existing architecture.

Large architectural changes should have a clear technical reason.

---

# 23. Prefer Explicit Code

Prefer straightforward code that another developer can follow over shorter but cryptic implementations.

Avoid clever abstractions, excessive chaining, obscure language tricks, or heavily compressed logic when a more explicit implementation is easier to maintain.

Optimize for readability first unless performance requirements prove otherwise.

---

# 24. Do Not Overengineer

Maintainability does not mean maximum abstraction.

A maintainable solution should be:

- simple
- predictable
- easy to locate
- easy to modify
- difficult to misuse

Do not add architecture merely because it might be useful someday.

---

# Required Workflow For Every Change

Before implementing:

```text
1. Locate the relevant code.
2. Inspect nearby patterns and conventions.
3. Search for reusable existing components/utilities/styles.
4. Identify the smallest clean change.
```

During implementation:

```text
5. Keep responsibilities separated.
6. Avoid duplication where meaningful.
7. Reuse existing design tokens and conventions.
8. Keep the change local and explicit.
9. Avoid unrelated refactoring.
```

After implementation:

```text
10. Check all usages of modified shared code.
11. Check realistic edge cases.
12. Run relevant tests/lint/build checks when available.
13. Remove dead code, unused imports, debug logs, and temporary code.
14. Review the diff for unnecessary complexity.
```

---

# Final Maintainability Check

Before considering a change complete, ask:

### Understandability
Can another developer understand what changed without reading unrelated parts of the project?

### Locality
Can this feature be modified later without touching many unrelated files?

### Duplication
Did this change introduce duplicated logic, data, or UI that should reasonably be shared?

### Coupling
Does the new code depend on more application state or modules than necessary?

### Consistency
Does the implementation follow the existing project structure and conventions?

### Simplicity
Is there a simpler solution that provides the same behavior?

### Verification
Is there a clear way to confirm that the change works and has not broken existing behavior?

If any answer is problematic, improve the implementation before considering the task complete.

---

# Priority Order

When trade-offs are necessary, prioritize:

```text
Correctness
    ↓
Clarity
    ↓
Consistency with existing architecture
    ↓
Maintainability
    ↓
Reusability
    ↓
Performance optimization
    ↓
Cleverness
```

Performance may take higher priority when there is an actual measured or explicit performance requirement.

---

# Most Important Rule

Do not optimize the code for the AI that is writing it.

Optimize it for the human developer who will need to understand and change it six months later.