# Product

## Register

product

## Users

Developers who are new to Materialize and understand ordinary SQL, but do not yet have a reliable mental model for incrementally maintained results, temporal filters, and subscription diffs. They use the product alongside the Materialize documentation to learn one concept through direct observation.

## Product Purpose

The SQL Time Lab turns a temporal Materialize query into a guided, inspectable scenario. It succeeds when a learner can explain why a row entered or left the maintained result, whether the cause was source data or logical time, and how that change appears in a subscription stream.

## Brand Personality

Precise, calm, and instructive. The experience should feel native to the Materialize documentation while remaining clearly identifiable as an interactive learning prototype.

## Anti-references

- Dark observability dashboards with decorative glow and oversized metrics.
- Generic KPI card grids.
- A full SQL IDE or universal query-plan visualizer.
- Gamified learning interfaces that distract from the data model.
- Passive animations that do not require the learner to notice cause and effect.

## Design Principles

1. Keep the source data, timeline, maintained result, current event, and subscription changes visible together.
2. Teach one causal change at a time and pause before moving forward.
3. Make time-driven and data-driven changes visually distinct without relying on color alone.
4. Use the vocabulary and restrained geometry of the Materialize documentation.
5. Prefer a faithful mental model over feature breadth.

## Accessibility & Inclusion

Target WCAG 2.2 AA contrast and keyboard-operable controls. Never communicate inserts, retractions, or focus using color alone. Respect reduced-motion preferences and keep the tutorial usable when text is enlarged.
