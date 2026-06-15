# discovery-surfaces Specification

## Purpose
TBD - created by archiving change close-the-return-loop. Update Purpose after archive.
## Requirements
### Requirement: New-this-week freshness rail on the city landing

The city landing page SHALL render a "New this week in {City}" rail showing recently published listings for that city, so a returning buyer can see the directory is alive since their last visit. The rail SHALL include published crafters, stores, studios, and upcoming events whose `created_at` is within the last 14 days, scoped to the current city, newest first, each capped to a small bounded count. The rail SHALL be hidden entirely when fewer than 3 fresh items exist, so it never renders a thin or empty section. The rail SHALL NOT display any save or popularity count.

#### Scenario: Fresh items exist
- **WHEN** a buyer opens `/{city}` and 3 or more listings were published in that city in the last 14 days
- **THEN** a "New this week in {City}" rail appears above the standard rails, showing those listings newest-first with a relative "Added …" caption

#### Scenario: Too few fresh items
- **WHEN** fewer than 3 listings were published in that city in the last 14 days
- **THEN** the rail is not rendered at all (no empty or single-card section)

#### Scenario: Events filtered to upcoming
- **WHEN** the freshness rail includes events
- **THEN** only events whose `end_at` is in the future are shown, even if recently created

### Requirement: Personalized picks rail for signed-in buyers

The city landing SHALL render a "Picks for you in {City}" rail for an authenticated buyer who has at least one save, using the existing co-save recommendation engine scoped to the current city. The personalized query SHALL NOT run for anonymous visitors or signed-in users with zero saves, and for those users the landing SHALL be unchanged from its current rails. Recommendations SHALL be limited to PUBLISHED, non-expired listings in the current city.

#### Scenario: Signed-in buyer with saves
- **WHEN** an authenticated buyer with at least one save opens `/{city}`
- **THEN** a "Picks for you in {City}" rail renders city-scoped recommendations from the co-save engine

#### Scenario: Anonymous or zero-save visitor
- **WHEN** an anonymous visitor, or a signed-in user with no saves, opens `/{city}`
- **THEN** no personalized rail is rendered and no recommendation query is executed for that request

### Requirement: Cross-entity links on listing detail pages

Crafter, store, and studio detail pages SHALL surface cross-links to related entities (e.g. the studio a maker teaches at, events they appear in, associated listings) derived only from relations that already exist in the data. A cross-link section SHALL be omitted when it has no related entities, and SHALL render below the primary contact action so it never competes with it. No new public metric SHALL be introduced by these links.

#### Scenario: Related entities exist
- **WHEN** a crafter who appears in an event (or teaches at a studio) is viewed
- **THEN** a cross-link card links to that event/studio

#### Scenario: No related entities
- **WHEN** a listing has no related entities
- **THEN** no cross-link section is rendered for that relation
