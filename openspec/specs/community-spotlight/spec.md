# community-spotlight Specification

## Purpose
TBD - created by archiving change close-the-return-loop. Update Purpose after archive.
## Requirements
### Requirement: Weekly crafter feature is editorial, not a popularity ranking

The community page's weekly crafter feature SHALL be presented as an editorial spotlight and SHALL NOT expose or rank by a public save/popularity count. The featured crafter SHALL be selected by an optional admin pin (reusing the existing `is_featured` flag), and otherwise by a deterministic weekly rotation among active crafters in the city that is stable within a given week and varies across weeks. The page copy SHALL frame it editorially (e.g. "This week in {City}") rather than as "most-saved".

#### Scenario: No public count shown
- **WHEN** the community page renders the weekly crafter feature
- **THEN** no save count or "most-saved" ranking label is displayed for the featured crafter

#### Scenario: Stable within a week
- **WHEN** the community page is loaded multiple times within the same ISO week with no admin pin set
- **THEN** the same crafter is featured each time

#### Scenario: Admin pin overrides rotation
- **WHEN** a crafter is pinned via `is_featured` for the city
- **THEN** that crafter is shown as the weekly feature instead of the rotation pick
