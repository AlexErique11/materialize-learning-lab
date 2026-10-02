# Domain boundary

Future simulation and Materialize semantics belong here as pure, deterministic
TypeScript. Keep React, browser APIs, and learning copy out of this layer.

The foundation deliberately defines no domain types or simulation behavior.
Chapter scenarios and objectives will live beside their chapter; presentation
components receive their display state through props or children.
