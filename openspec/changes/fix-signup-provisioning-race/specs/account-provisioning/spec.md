## ADDED Requirements

### Requirement: First-touch provisioning is idempotent under concurrency

The system SHALL map an authenticated identity to a local `User` row on first
touch without ever surfacing a database uniqueness race to the caller. When two
or more concurrent requests (or concurrent renders within one request) attempt
to provision the same not-yet-existing user, exactly one row SHALL be created
and every caller SHALL receive that same row. A unique-constraint violation
(`P2002`) raised while creating the row SHALL be recovered by re-reading the
existing row, not propagated as an error.

#### Scenario: Concurrent first renders for a new user
- **WHEN** a brand-new authenticated user's first page triggers multiple
  concurrent `getCurrentUser()` calls and none find an existing row
- **THEN** exactly one `User` row is created
- **AND** every concurrent call returns that same user
- **AND** no `P2002` / unique-constraint error reaches the caller or the error boundary

#### Scenario: Insert loses the race
- **WHEN** a provisioning insert fails with a unique-constraint violation because
  a concurrent request already created the row
- **THEN** the system re-reads the row by its unique identity (descope id, then email)
- **AND** returns that row instead of throwing

#### Scenario: Existing user is unaffected
- **WHEN** an already-provisioned user makes an authenticated request
- **THEN** the system returns the existing row via a read with no write attempt
- **AND** no additional provisioning latency is incurred

### Requirement: New users render their first authenticated page without a reload

The system SHALL render the destination page (e.g. the dashboard) successfully
on a new user's first authenticated request immediately after signup. The global
error boundary SHALL NOT be shown as a result of first-touch provisioning, and
no manual reload SHALL be required to reach the page.

#### Scenario: First dashboard render after signup
- **WHEN** a user signs up and is routed to the dashboard for the first time
- **THEN** the dashboard renders on the first request
- **AND** the "Something dropped a stitch" error page is not shown
- **AND** the user does not need to reload to see the dashboard

### Requirement: Authenticated identity is resolved once per request

The system SHALL resolve the current user at most once per server request,
sharing the result across all callers within that request, so that multiple
components requesting the current user do not issue duplicate or competing
provisioning operations.

#### Scenario: Multiple components request the current user in one render
- **WHEN** a layout, page, and header all request the current user during a
  single server request
- **THEN** the current-user resolution executes once
- **AND** all callers receive the same result
