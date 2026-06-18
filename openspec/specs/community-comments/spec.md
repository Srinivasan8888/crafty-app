# community-comments Specification

## Purpose
TBD - created by archiving change storefront-completeness. Update Purpose after archive.
## Requirements
### Requirement: Signed-in members can post community comments

A signed-in member SHALL be able to post a short text comment on the Community page. Posting MUST require authentication (`requireUser`), MUST reject empty or over-length content, and MUST be rate-limited to prevent spam.

#### Scenario: Authenticated member posts a comment

- **WHEN** a signed-in member submits a non-empty comment within the length limit
- **THEN** a `CommunityComment` record is created attributed to that member
- **AND** the comment appears in the comment list without a full page reload (or after the page revalidates)

#### Scenario: Anonymous visitor cannot post

- **WHEN** a signed-out visitor attempts to submit a comment
- **THEN** the submission is rejected and the member is prompted to sign in

#### Scenario: Empty or oversized content is rejected

- **WHEN** a member submits empty, whitespace-only, or over-the-limit content
- **THEN** the comment is not created and a validation message is shown

#### Scenario: Rapid repeated posting is throttled

- **WHEN** a member submits comments faster than the allowed rate
- **THEN** further submissions are rejected with a rate-limit response until the window resets

### Requirement: Community comments are readable and privacy-safe

The Community page SHALL display existing comments in reverse-chronological order, showing only the author's display name (never an email or other private contact detail), and SHALL replace the read-only "comments coming in V3.1" teaser.

#### Scenario: Comments render with a safe author label

- **WHEN** the Community page is rendered
- **THEN** each comment shows the author's `display_name`, or a neutral label when none is set
- **AND** no comment ever exposes the author's email address

#### Scenario: Teaser is removed

- **WHEN** the Community page is rendered
- **THEN** the read-only "comments coming in V3.1" teaser is no longer the only comment-area content

### Requirement: Community comments are moderatable

Community comments SHALL be subject to moderation. A signed-in member MUST be able to report a comment, and an admin MUST be able to remove (and restore) a comment through an admin moderation queue. Removal is a soft delete (the row is retained with a hidden status) so it preserves an audit trail.

#### Scenario: Member reports a comment

- **WHEN** a signed-in member reports a visible comment
- **THEN** the comment's report count is incremented and the comment surfaces (ranked by report count) in the admin moderation queue

#### Scenario: Admin removes a comment

- **WHEN** an admin removes a reported comment
- **THEN** the comment's status is set to hidden and it no longer renders on the Community page for any visitor

#### Scenario: Admin restores a comment

- **WHEN** an admin restores a previously hidden comment
- **THEN** the comment becomes visible on the Community page again

