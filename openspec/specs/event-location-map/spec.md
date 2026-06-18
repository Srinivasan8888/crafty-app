# event-location-map Specification

## Purpose
TBD - created by archiving change storefront-completeness. Update Purpose after archive.
## Requirements
### Requirement: Event detail page renders a venue map

The event detail page SHALL render an interactive map of the venue when the event has a usable venue address, and SHALL provide a link to open the location in an external maps application. The embed MUST NOT require any third-party API key or new environment credential.

#### Scenario: Event with a venue address shows a map

- **WHEN** a visitor opens an event detail page for an event whose `venue_address` is a non-empty, non-placeholder value
- **THEN** an embedded map centered on that address is shown in the "Getting there" section in place of the previous placeholder box
- **AND** an "Open in Google Maps" (or equivalent) link is shown that opens the same location in a new tab

#### Scenario: Event without a usable address falls back gracefully

- **WHEN** a visitor opens an event detail page whose `venue_address` is empty, hash-only, or a known placeholder host
- **THEN** no broken or empty map iframe is rendered
- **AND** the venue name and address block is still shown as it is today, with no "coming soon" placeholder text

#### Scenario: No "coming soon" copy remains

- **WHEN** any event detail page is rendered
- **THEN** the string "Map embed coming soon" does not appear anywhere on the page

