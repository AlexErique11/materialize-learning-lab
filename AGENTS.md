# Repository Instructions

Before working in this repository, read and follow:

- [CLAUDE.md](./CLAUDE.md): product, architecture, chapter styling, checks, and Git.
- [MAINTAINABILITY.md](./MAINTAINABILITY.md): code quality and required workflow.

For UI work, also read [UI_LAYOUTS.md](./UI_LAYOUTS.md) for the reusable lecture
templates, shared component ownership, and current controls. Read the relevant
chapter README for its visualization and scenario details.

Consistency has two required levels (see CLAUDE.md): shared typography, fonts,
buttons, and styling across the app; and matching layout, spacing, and dimensions
for equivalent visualizations within a chapter. Inspect and reuse the identified
reference page's implementation before changing a comparable page. Chapters may
use different visualizations and panels when their learning goals differ.

Preserve spacing and the positions of titles, buttons, metrics, and panels unless
the user explicitly requests a layout change. Update shared templates and controls
at their source instead of applying the same adjustment separately to each page.

Keep maintainability rules in MAINTAINABILITY.md as the single source of truth.
Explicit user instructions take precedence.
