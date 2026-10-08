# Domain boundary

Shared simulation and Materialize semantics belong here as pure, deterministic
TypeScript when multiple chapters actually need the same domain logic. Keep
React, browser APIs, and learning copy out of this layer.

Chapters 1 and 2 already keep their focused simulations, fixtures, and grading
beside their chapter components. Preserve those boundaries rather than moving
code here solely to create a common framework. Presentation components receive
derived display state through props or children. Shared UI templates are separate
from domain logic; see [UI_LAYOUTS.md](../../UI_LAYOUTS.md).
