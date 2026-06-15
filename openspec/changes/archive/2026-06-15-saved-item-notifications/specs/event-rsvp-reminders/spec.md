## ADDED Requirements

### Requirement: T-24h reminder to buyers who saved an event

When an event enters its T-24h reminder window, the system SHALL send a reminder email to every buyer who has saved that event (entity_type EVENT), in addition to the existing organizer reminder. The attendee reminder SHALL include the event name, city, venue, and a calendar/add link, SHALL be sent best-effort (never blocking or failing the cron), and SHALL skip savers whose `email_bounced` is set. Each event's reminders (organizer plus all savers) SHALL be sent exactly once, guarded by the event's existing `reminder_sent_at` stamp.

#### Scenario: Saver gets a reminder
- **WHEN** an event a buyer saved starts within the next 24 hours and its reminder has not yet been sent
- **THEN** the buyer receives a "Tomorrow: {event} in {City}" reminder email with the venue and an add-to-calendar link

#### Scenario: Organizer reminder preserved
- **WHEN** the same event is processed
- **THEN** the organizer still receives their reminder as before

#### Scenario: Sent exactly once
- **WHEN** the hourly reminder cron runs again over the same event whose `reminder_sent_at` is already set
- **THEN** no saver (and no organizer) is emailed again for that event

#### Scenario: Bounced saver is skipped
- **WHEN** a saver of the event has `email_bounced` set
- **THEN** no reminder email is attempted for that saver, and other savers are still emailed
