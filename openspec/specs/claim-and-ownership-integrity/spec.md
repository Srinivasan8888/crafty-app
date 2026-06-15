# claim-and-ownership-integrity Specification

## Purpose
TBD - created by archiving change feature-bug-audit. Update Purpose after archive.
## Requirements
### Requirement: Claim approval cannot clobber an existing owner

Approving a claim request SHALL re-check the listing's current ownership server-side and SHALL NOT overwrite an `owner_user_id` belonging to a different user. The "still claimable" check SHALL be enforced in the approval handler, not only surfaced as a UI warning.

#### Scenario: Stale claim against an owned listing is rejected
- **WHEN** an admin approves a claim request for a listing already owned by a different user
- **THEN** the approval is rejected (or requires an explicit override) and the existing owner is preserved

#### Scenario: Claim on an unclaimed listing still works
- **WHEN** an admin approves a claim for a listing with no current owner
- **THEN** ownership transfers to the requester and the listing is marked claimed

### Requirement: Admin reordering swaps deterministically

Admin city reordering SHALL swap `display_order` with the adjacent city at the target position within a transaction, rather than incrementing one row's value, so a single up/down action reliably changes the visible order without collisions.

#### Scenario: Move a city up swaps with its neighbor
- **WHEN** an admin clicks the up arrow on a city
- **THEN** that city and the one above it exchange `display_order` values and the visible order updates

#### Scenario: No duplicate order values
- **WHEN** reordering completes
- **THEN** no two cities share the same `display_order` as a result of the action

### Requirement: Status transitions leave consistent timestamps

Listing status transitions SHALL keep `deleted_at` consistent with status: any transition to a non-`DELETED` status (including `HIDDEN`) SHALL clear `deleted_at`.

#### Scenario: Hiding a previously deleted listing clears deleted_at
- **WHEN** an admin transitions a `DELETED` listing to `HIDDEN`
- **THEN** `deleted_at` is cleared so the row is not internally inconsistent

### Requirement: Request and report attribution is session-derived

Endpoints that record who submitted a request or report SHALL derive the submitter's email from the authenticated session, not from a client-supplied field, matching the flags endpoint's policy.

#### Scenario: City-request reporter email is trusted
- **WHEN** a city request is submitted
- **THEN** the stored reporter email comes from the session (or is omitted for anonymous requests), and a client-supplied `reporter_email` in the body is not trusted

