# creator-message-notifications Specification

## Purpose
TBD - created by archiving change close-the-return-loop. Update Purpose after archive.
## Requirements
### Requirement: Notify the listing owner of a new buyer message

When a buyer sends a message to a listing owner (a new conversation or a new message in an existing one), the system SHALL send the owner a transactional email informing them and linking to the conversation. The notification SHALL be best-effort: it MUST NOT block or fail the message write, MUST respect the recipient's `email_bounced` flag, and MUST be throttled to at most one email per conversation per hour so a rapid exchange does not flood the owner. Messages sent by the owner themselves SHALL NOT trigger a notification to the owner.

#### Scenario: Buyer messages a creator
- **WHEN** a buyer creates or adds to a conversation with a listing owner
- **THEN** the owner receives a "new message" email linking to the conversation, and the message is persisted regardless of whether the email send succeeds

#### Scenario: Throttle rapid messages
- **WHEN** a buyer sends multiple messages in the same conversation within an hour
- **THEN** the owner receives at most one notification email for that conversation in that window

#### Scenario: Owner reply does not self-notify
- **WHEN** the listing owner replies in the conversation
- **THEN** no new-message email is sent to the owner

#### Scenario: Bounced recipient
- **WHEN** the owner's email is flagged as bounced
- **THEN** no notification email is attempted

### Requirement: Unread message indicator in the creator dashboard

The creator dashboard SHALL display an unread-conversation count where messages are surfaced (the "Messages" navigation entry and the activity strip), derived from the existing conversation read pointers. The indicator SHALL reflect only conversations with unread messages addressed to the current user and SHALL clear once those conversations are read.

#### Scenario: Unread conversations exist
- **WHEN** an owner with 2 unread conversations opens the dashboard
- **THEN** the "Messages" nav shows an unread badge of 2

#### Scenario: All read
- **WHEN** the owner has opened all conversations
- **THEN** no unread badge is shown
