## ADDED Requirements

### Requirement: Superadmin-only god-mode console
The system SHALL provide an owner console at `/admin/owner`, reachable only by SUPERADMINs, that presents a read-only, app-wide overview of the business. Non-superadmins SHALL NOT be able to view or reach it.

#### Scenario: Superadmin opens the console
- **WHEN** a SUPERADMIN navigates to `/admin/owner`
- **THEN** the god-mode overview renders

#### Scenario: Admin is blocked from the console
- **WHEN** an ADMIN (not SUPERADMIN) navigates to `/admin/owner`
- **THEN** they are redirected to `/forbidden`

### Requirement: App-wide insights
The console SHALL aggregate live metrics across the whole application, derived from existing data, covering at least: users (total, new in 7/30 days, breakdown by role, banned count); listings (counts by type, status, and city); commerce (orders, gross merchandise value, commission, payouts pending/paid, active PRO subscriptions); engagement (saves, messages, reviews over recent windows); moderation (open flags, pending claim and city requests); and system health (cron status).

#### Scenario: Metrics reflect current data
- **WHEN** the console renders
- **THEN** each metric shows a current aggregate computed from the live database

#### Scenario: Read-only with drill-through
- **WHEN** a SUPERADMIN reviews a metric that maps to an existing admin page
- **THEN** the card links through to that page, and the console itself performs no mutations
