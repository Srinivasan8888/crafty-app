## ADDED Requirements

### Requirement: Counterparty identity never exposes a raw email

The messaging inbox and thread views SHALL NOT render the counterparty's raw email address. When a counterparty has no display name, the UI SHALL fall back to a privacy-safe label.

#### Scenario: Owner has no display name (buyer's view)

- **WHEN** a buyer views a conversation or inbox row for an owner whose `display_name` is null
- **THEN** the UI shows the linked listing/business name, and never the owner's email

#### Scenario: Buyer has no display name (owner's view)

- **WHEN** an owner views a conversation or inbox row for a buyer whose `display_name` is null
- **THEN** the UI shows a neutral label (e.g. "Crafty member"), and never the buyer's email

#### Scenario: Counterparty has a display name

- **WHEN** the counterparty has a non-empty `display_name`
- **THEN** that display name is shown

### Requirement: Friendly localized timestamps

Message and conversation timestamps SHALL be rendered in a human-friendly, IST-localized format rather than a raw UTC ISO string.

#### Scenario: Rendering a message time

- **WHEN** a message or conversation last-activity time is displayed
- **THEN** it is formatted via the shared date helper (IST), not `toISOString()`

### Requirement: Live thread freshness

An open conversation thread SHALL surface newly received messages without a manual page reload, by polling on a short interval and on tab focus, and SHALL pause polling while the tab is hidden.

#### Scenario: Incoming reply while the thread is open

- **WHEN** the other participant sends a message while the viewer has the thread open and focused
- **THEN** the new message appears within the poll interval without the viewer reloading the page

#### Scenario: Tab hidden

- **WHEN** the thread's browser tab is hidden
- **THEN** polling is paused until the tab is focused again

### Requirement: Send-failure feedback

When sending a reply fails, the composer SHALL inform the user and preserve the typed text.

#### Scenario: Reply POST fails

- **WHEN** a reply send request returns a non-OK response or throws
- **THEN** the user is shown an error and the typed message text is retained for retry
