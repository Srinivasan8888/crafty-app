# discovery-ux-correctness Specification

## Purpose
TBD - created by archiving change feature-bug-audit. Update Purpose after archive.
## Requirements
### Requirement: No dead links, anchors, or inert markup

Public detail pages SHALL NOT contain links or anchors whose targets do not exist, or no-op rendered expressions. In-page jump links SHALL resolve to an element with the matching `id`.

#### Scenario: "View on map" anchor resolves
- **WHEN** a user clicks the "View on map" link on an event detail page
- **THEN** the page scrolls to the "Getting there" section (its `id` target exists)

#### Scenario: No no-op JSX renders
- **WHEN** a store detail page renders
- **THEN** there is no dead expression that always renders nothing (e.g. an unused `phoneDigits` ternary)

### Requirement: Dashboard listing rows deep-link correctly

Dashboard overview rows SHALL link "View" to the public detail page and "Edit" to the entity's edit page for every entity type, including events, and SHALL show the listing's city where applicable.

#### Scenario: Event row View/Edit are specific
- **WHEN** a creator views an event row on the dashboard overview
- **THEN** "View" opens that event's public page and "Edit" opens that event's edit page (not the events list)

#### Scenario: Event row shows its city
- **WHEN** an event row renders on the dashboard overview
- **THEN** it displays the event's city, consistent with other entity rows

### Requirement: Date filters include ongoing events

The events "Today" filter SHALL include events whose interval overlaps today, not only events whose `start_at` falls within today, so multi-day events in progress are not hidden.

#### Scenario: Ongoing multi-day event shows under "Today"
- **WHEN** an event started before today but is still running today and a user selects the "Today" filter
- **THEN** that event appears in the results

### Requirement: Headings and status copy are accurate

UI copy SHALL NOT assert relationships or behaviors that do not exist. Association sections SHALL be labeled by what they actually show, and order-status copy SHALL NOT promise automatic updates where there is no polling.

#### Scenario: Association heading is honest
- **WHEN** a store or studio detail page shows nearby crafters with no real source/teach relationship
- **THEN** the heading describes them as crafters in the city, not as crafters who source/teach at that listing

#### Scenario: Order status copy matches behavior
- **WHEN** an order detail page shows a PENDING order with no live polling
- **THEN** the copy does not claim the page updates automatically; it tells the user how to check status

### Requirement: Shipped UI strings have locale parity

Strings used by shipped UI SHALL exist in every supported locale file so non-English users do not see English fallbacks for shipped surfaces.

#### Scenario: Community eyebrow string is translated
- **WHEN** a non-English user (hi/kn/ta) views the community section
- **THEN** the `community.eyebrow` label renders in their locale, not English

### Requirement: "This weekend" event window includes the current Sunday

The "This weekend" events filter SHALL include events occurring on the current weekend — including Sunday — when viewed on a Sunday, rather than deferring to the following weekend.

#### Scenario: Viewing "This weekend" on a Sunday

- **WHEN** a user opens the "This weekend" events filter on a Sunday (IST)
- **THEN** events occurring on that same Sunday are included in the results

#### Scenario: Past events still excluded

- **WHEN** the weekend window is computed and part of it is already in the past
- **THEN** events whose end time is before now are still excluded

### Requirement: City-scoped personalized recommendations apply the city filter before candidate selection

City-scoped "Picks for you" recommendations SHALL apply the city constraint before the candidate limit so the rail is filled with eligible in-city results up to the requested count.

#### Scenario: Top global co-saves are in other cities

- **WHEN** personalized recommendations are requested for a city and the highest-scoring co-saved entities are outside that city
- **THEN** the city's eligible lower-ranked entities still fill the rail up to the requested count instead of the rail under-filling

