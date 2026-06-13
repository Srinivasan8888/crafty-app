## ADDED Requirements

### Requirement: Cron handlers record their runs

Each scheduled cron handler SHALL record a `CronRun` entry on successful completion, capturing the job name, completion time, and rows affected, so that runs are observable. A handler that throws before completing records no success row — which surfaces as a stale job on the health page (the alert we want).

#### Scenario: Successful run is recorded
- **WHEN** a cron handler completes successfully
- **THEN** a `CronRun` row exists for that job with a completion time and `status = success`

#### Scenario: Failed run surfaces as stale
- **WHEN** a cron handler throws before recording a successful run
- **THEN** no new success row is written, so the job's last-run age grows and it is flagged stale on the health page

#### Scenario: Unauthorized pings do not record runs
- **WHEN** a cron endpoint is called without the valid `CRON_SECRET`
- **THEN** the request is rejected and no `CronRun` row is created

### Requirement: Admin cron health page

The system SHALL provide an admin-only page at `/admin/health` that shows, per cron job, the most recent run's timestamp and status, and SHALL visually flag a job whose latest run is stale (older than 25 hours) or never recorded.

#### Scenario: Health page lists every job's latest status
- **WHEN** an admin opens `/admin/health`
- **THEN** each known cron job is listed with its last-run time and status

#### Scenario: Stale job is flagged
- **WHEN** a job's most recent run is older than 25 hours (or no run has ever been recorded)
- **THEN** that job's row is visually flagged (e.g., red / "stale" / "never run")

#### Scenario: Health page is admin-gated
- **WHEN** a non-admin attempts to open `/admin/health`
- **THEN** access is denied (per the access-denied behavior), consistent with other `/admin/*` routes
