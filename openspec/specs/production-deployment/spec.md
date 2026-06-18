# production-deployment Specification

## Purpose
TBD - created by archiving change production-launch-readiness. Update Purpose after archive.
## Requirements
### Requirement: Production deployment resolves and renders

The system SHALL be deployed to Vercel such that the production URL resolves (no `DEPLOYMENT_NOT_FOUND` / 404 at the root) and renders core public pages server-side.

#### Scenario: Homepage and a listing render in production
- **WHEN** an anonymous user visits the production root URL
- **THEN** they are routed to the default city and a listing/discovery page renders with content (HTTP 200, no 5xx)

#### Scenario: Build succeeds on the deployment platform
- **WHEN** the production build runs on Vercel
- **THEN** it completes without errors and the deployment is promoted to production

### Requirement: Environment parity between local and production

The production environment SHALL contain every runtime-required environment variable, with production-appropriate values: `DEV_AUTH=false`, `NEXT_PUBLIC_SITE_URL` equal to the live production URL, and `STORAGE_DRIVER=s3`.

#### Scenario: Launch-critical keys present in production
- **WHEN** the production environment variables are listed
- **THEN** the launch-critical set (database, auth, storage, rate-limit, email, error-tracking, analytics, cron secret) is present with non-placeholder values

#### Scenario: Dev auth bypass is disabled in production
- **WHEN** the production app handles an authenticated route
- **THEN** `DEV_AUTH` is `false` and authentication is enforced through Descope, not the dev stub

### Requirement: Authentication works against the live deployment

The system SHALL allow a user to sign in via Descope on the production deployment, and SHALL keep the Descope user-sync webhook reachable at the live domain.

#### Scenario: User signs in on production
- **WHEN** a user completes the Descope sign-in flow on the production URL
- **THEN** they reach an authenticated surface (e.g., dashboard) as their synced user

#### Scenario: Descope webhook targets the live domain
- **WHEN** the Descope console webhook configuration is inspected
- **THEN** its target URL points at the live production domain's `/api/webhooks/descope` endpoint, not a placeholder or dev URL

### Requirement: Scheduled jobs are authenticated and reachable

The system SHALL expose its cron endpoints on the production deployment, protected by `CRON_SECRET`, and reachable by the Vercel cron scheduler defined in `vercel.json`.

#### Scenario: Cron endpoint rejects unauthenticated calls
- **WHEN** a cron endpoint is called in production without the correct `CRON_SECRET` bearer token
- **THEN** the request is rejected (401/403) and no job work runs

#### Scenario: Cron endpoint accepts the scheduler
- **WHEN** a cron endpoint is called with the correct `CRON_SECRET`
- **THEN** the job executes and returns a success response

### Requirement: Pre-launch smoke verification passes

Before the deployment is considered launched, the system SHALL pass a smoke-verification checklist covering page render, authentication, durable image upload, cron authentication, and webhook reachability.

#### Scenario: Smoke checklist is green
- **WHEN** the smoke-verification checklist is executed against the production URL
- **THEN** every item (render, sign-in, upload-persists, cron-auth, webhook-reachable) passes before launch is announced
