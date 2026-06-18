## ADDED Requirements

### Requirement: Lifecycle re-engagement email de-duplication

The lifecycle re-engagement cron SHALL NOT send a re-engagement email to the same user more than once per cooldown window. The system SHALL persist a per-user lifecycle-email watermark and exclude users whose watermark falls within the cooldown window from every segment query.

#### Scenario: User already emailed within the cooldown window

- **WHEN** the lifecycle cron runs and a candidate user was last sent a lifecycle email less than the cooldown window ago
- **THEN** that user is excluded from all segments and receives no email on this run

#### Scenario: Watermark is written after a successful send

- **WHEN** the lifecycle cron sends a re-engagement email to a user
- **THEN** the user's lifecycle-email watermark is set to the send time, so the next daily run does not re-select them

### Requirement: Scheduled organizer reminders respect bounce state

Scheduled event-organizer reminder emails SHALL be suppressed for organizers whose email has bounced or is a no-reply placeholder, consistent with all other scheduled notifications.

#### Scenario: Organizer email previously bounced

- **WHEN** the event-reminder cron prepares an organizer reminder for an organizer whose email is flagged bounced
- **THEN** no reminder email is sent to that organizer
