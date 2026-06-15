# saved-listing-update-alerts Specification

## Purpose
TBD - created by archiving change saved-item-notifications. Update Purpose after archive.
## Requirements
### Requirement: Batched update digest for saved makers

A scheduled daily job SHALL send a buyer one batched email when one or more crafters/stores/studios they have saved have new activity (a newly listed product or a newly organized event) created after a per-save watermark. The email SHALL summarize the fresh activity across all of the buyer's saved makers with deep links, and SHALL NOT display any save or popularity count. The job SHALL be authenticated by `CRON_SECRET`, record a `CronRun`, and send email best-effort (never throwing) while skipping recipients whose `email_bounced` is set.

#### Scenario: A saved maker posts new work
- **WHEN** the daily job runs and a buyer has saved a crafter that listed a new product since the buyer's watermark for that save
- **THEN** the buyer receives a single "Makers you saved have something new" email that links to the new item

#### Scenario: No new activity
- **WHEN** none of a buyer's saved makers have activity newer than the buyer's watermarks
- **THEN** the buyer receives no email and no watermark is changed

#### Scenario: Bounced recipient is skipped
- **WHEN** a buyer eligible for a digest has `email_bounced` set
- **THEN** no email is attempted for that buyer

### Requirement: Watermarked, non-repeating updates

Each `Save` SHALL carry a `last_notified_at` watermark. "New" activity SHALL be defined as created strictly after `last_notified_at` when set, otherwise after the save's `created_at` (so a newly created save never triggers a flood of historical activity). After a buyer's digest is dispatched, the scanned crafter/store/studio saves' `last_notified_at` SHALL be advanced so the same activity is not reported again on a later run.

#### Scenario: Baseline is the save time
- **WHEN** a buyer saves a maker that already has older products, and the job runs before any new activity
- **THEN** the buyer is not emailed about the pre-existing (pre-save) products

#### Scenario: No repeats across runs
- **WHEN** a buyer was emailed about a maker's new product and the job runs again the next day with no further new activity
- **THEN** the buyer is not emailed again about the same product
