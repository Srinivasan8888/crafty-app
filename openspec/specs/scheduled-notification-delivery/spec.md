# scheduled-notification-delivery Specification

## Purpose
TBD - created by archiving change feature-bug-audit. Update Purpose after archive.
## Requirements
### Requirement: Event reminders cover every upcoming event exactly once

The event-reminder cron SHALL be configured so that every event receives a T-24h reminder. The look-ahead window in the handler and the cron schedule SHALL be consistent so no events fall between runs, and the job SHALL remain idempotent (no duplicate reminders).

#### Scenario: An event in the look-ahead window gets reminded
- **WHEN** the event-reminder cron runs on its configured schedule and an event starts within the next reminder window
- **THEN** a T-24h reminder is sent for that event

#### Scenario: No event is skipped between runs
- **WHEN** events are spread across all hours of a day
- **THEN** the combination of schedule frequency and window size reminds each of them once — none fall through a gap

#### Scenario: Reminders are not duplicated
- **WHEN** the cron runs again over an event already reminded (`reminder_sent_at` set)
- **THEN** no second reminder is sent

### Requirement: Featured expiry respects overlapping paid windows

The expire-featured cron SHALL NOT un-feature a listing that still has another active PAID feature order covering it. Before clearing `is_featured`, it SHALL confirm no other `FeatureOrder` for the same entity is still active.

#### Scenario: Renewed featuring is preserved
- **WHEN** a listing has an expiring feature order but another PAID feature order with `feature_expires_at >= now` for the same entity
- **THEN** `is_featured` remains true

#### Scenario: Truly expired featuring is cleared
- **WHEN** a listing's only feature order has expired and no other active PAID order covers it
- **THEN** `is_featured` is set false

### Requirement: Digests are never sent to placeholder addresses

The message-digest cron SHALL skip recipients with placeholder/noreply addresses (`@noreply.crafty.app`) and bounced addresses. The guard SHALL be evaluated correctly (no dead-code condition).

#### Scenario: Noreply recipient is skipped
- **WHEN** the message-digest cron processes a recipient whose email ends with `@noreply.crafty.app`
- **THEN** no digest email is sent to that address

#### Scenario: Real recipient still receives a digest
- **WHEN** the cron processes a recipient with a real, non-bounced email and pending messages
- **THEN** a digest email is sent

