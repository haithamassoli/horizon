# Horizon Design System

## Direction

Horizon uses a calm nocturnal desktop aesthetic built for trust:

- observatory-inspired dark surfaces instead of aggressive productivity colors
- cool aurora and mint accents to signal focus, recovery, and completion
- serif display typography for premium calm, paired with system sans text for clarity
- soft glass panels and orbital framing to reinforce the Break Loop metaphor

## Tailwind v4 theme

The renderer now defines its theme in `src/renderer/styles.css` with Tailwind v4 `@theme` tokens.

### Core palette

- `ink-*`: shell backgrounds and quiet surfaces
- `mist-*`: foreground text and low-contrast copy
- `aurora-*`: primary emphasis and active states
- `violet-*`: ambient depth and decorative structure
- `mint-*`: recovery, success, and completion cues

### Typography

- `font-sans`: system-first UI copy for native-feeling desktop readability
- `font-display`: serif display stack for headings, countdowns, and hero moments

### Shared primitives

- `horizon-panel`: primary glass container for settings and key surfaces
- `horizon-panel-soft`: lighter support panel for secondary content
- `metric-card`: reusable card for stats, principles, and status modules
- `hero-kicker`: compact uppercase status pill
- `control-button-*`: primary, secondary, and ghost button treatments
- `break-orbit`: circular recovery frame for the break overlay countdown

## Usage guidance

- Favor calm contrast over bright saturation.
- Use mint sparingly for relief and completion, not as a dominant brand color.
- Keep motion restrained and supportive when animation is added later.
- Prefer generous spacing and small clusters of information over dense dashboard layouts.
- Use the break overlay for a single focused action, not multi-step workflows.
