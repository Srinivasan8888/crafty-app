# listing-cross-references Specification

## Purpose
TBD - created by archiving change storefront-completeness. Update Purpose after archive.
## Requirements
### Requirement: Owners can tag crafters on their studio

A studio owner SHALL be able to associate ("tag") one or more published crafters with their studio to indicate the crafters who teach there. The association MUST be owner-scoped: only the studio's owner (or an admin) may add or remove tags, enforced by `requireCreator` ownership checks.

#### Scenario: Owner tags a crafter on their studio

- **WHEN** a studio owner edits their studio and selects a published crafter to tag
- **THEN** a `StudioCrafter` association is created between that studio and crafter
- **AND** the association is idempotent — tagging the same crafter twice does not create a duplicate

#### Scenario: Non-owner cannot tag

- **WHEN** a signed-in user who does not own a given studio attempts to add or remove a crafter tag on it
- **THEN** the request is rejected with a not-authorized response and no association is changed

### Requirement: Owners can tag crafters on their store

A store owner SHALL be able to associate one or more published crafters with their store to indicate the crafters it sources or stocks. The association MUST be owner-scoped in the same way as studio tagging.

#### Scenario: Owner tags a crafter on their store

- **WHEN** a store owner edits their store and selects a published crafter to tag
- **THEN** a `StoreCrafter` association is created between that store and crafter, idempotently

### Requirement: Detail pages surface tagged crafters

The studio and store detail pages SHALL display the crafters tagged on that listing. When at least one crafter is tagged, the page MUST show the tagged crafters instead of the generic city sample. When none are tagged, the page MUST fall back to the existing city-wide crafter sample.

#### Scenario: Studio with tagged crafters

- **WHEN** a visitor opens a studio detail page that has one or more tagged crafters
- **THEN** the "Crafters" section lists the tagged crafters
- **AND** the "studio tagging coming soon" footnote is not shown

#### Scenario: Store with no tagged crafters

- **WHEN** a visitor opens a store detail page that has no tagged crafters
- **THEN** the section falls back to the existing city-wide crafter sample
- **AND** the "sourcing tags coming soon" footnote is not shown

#### Scenario: Tagged crafter is unpublished or removed

- **WHEN** a crafter that was tagged is later unpublished or deleted
- **THEN** that crafter no longer appears in the listing's tagged-crafter section

