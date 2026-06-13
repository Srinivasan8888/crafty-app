# listing-reporting Specification

## Purpose
TBD - created by archiving change close-prd-page-gaps. Update Purpose after archive.
## Requirements
### Requirement: Users can report a listing

The system SHALL let a user report any published crafter, store, studio, or event listing through a working form that submits to the moderation backend (`/api/flags`). The report entry point on every detail page SHALL lead to this form, not to a dead-end.

#### Scenario: Report form opens from a detail page
- **WHEN** a user clicks "Report this listing" on a crafter, store, studio, or event detail page
- **THEN** they reach a report form pre-scoped to that listing (entity type + identity resolved), offering a reason and an optional note

#### Scenario: Submitting a report creates a flag
- **WHEN** a user submits the report form with a valid reason
- **THEN** a flag record is created via `/api/flags` for the correct entity and the user sees a confirmation

#### Scenario: Event detail pages can be reported
- **WHEN** a user views an event detail page
- **THEN** a "Report this listing" entry point is present (parity with crafter/store/studio)

#### Scenario: Unresolvable listing fails gracefully
- **WHEN** the report form is opened for a listing that cannot be resolved (wrong/stale slug)
- **THEN** the user sees a friendly "couldn't find that listing" message with a contact fallback, not a crash

### Requirement: General contact page is functional

The system SHALL provide a usable way to contact support from `/contact` when not reporting a listing.

#### Scenario: Contact path without a report context
- **WHEN** a user visits `/contact` without a `ref=report` context
- **THEN** they are given a working way to send a message to support (form or prefilled email), not a broken state

