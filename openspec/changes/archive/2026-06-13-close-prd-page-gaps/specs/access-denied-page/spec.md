## ADDED Requirements

### Requirement: Branded 403 page for unauthorized access

The system SHALL present a branded access-denied page when an authenticated user attempts to reach a route they lack permission for, instead of silently redirecting them elsewhere. The page SHALL identify the situation ("you don't have access") and offer a path forward (sign in as a different account, or return home).

#### Scenario: Non-admin reaches an admin route
- **WHEN** an authenticated non-admin user navigates to an `/admin/*` route
- **THEN** they are shown the branded access-denied page (not a silent redirect to the dashboard and not a raw error)

#### Scenario: Access-denied page is reachable by anyone
- **WHEN** the access-denied route is requested by an anonymous or authenticated user
- **THEN** it renders successfully (it is not itself behind the auth gate)

#### Scenario: Unauthenticated users still go to sign-in
- **WHEN** an unauthenticated user requests a protected route
- **THEN** they are redirected to sign-in (the access-denied page is for authenticated-but-unauthorized users, not anonymous ones)
