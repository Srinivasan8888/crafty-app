## ADDED Requirements

### Requirement: Admin surfaces are hidden and unreachable for non-admins
The system SHALL ensure that users without the ADMIN (or higher) role neither see admin navigation/links nor can reach admin routes. Route protection SHALL be the authoritative boundary (failing closed), with navigation visibility mirroring it.

#### Scenario: Regular user sees no admin entry points
- **WHEN** a VISITOR or CREATOR views the app (including the dashboard)
- **THEN** no admin links, badges, or controls are rendered for them

#### Scenario: Regular user is blocked from admin routes
- **WHEN** a non-admin requests any `/admin/*` route directly
- **THEN** access is denied (redirect to `/forbidden`) regardless of UI state

### Requirement: Superadmin-only surfaces are hidden from plain admins
The system SHALL hide SUPERADMIN-only entry points (owner console, admin management) from ADMINs, and protect their routes with `requireSuperadmin()`.

#### Scenario: Admin does not see owner-only navigation
- **WHEN** an ADMIN views the admin console
- **THEN** the owner console and admin-management links are not rendered

#### Scenario: Admin is blocked from owner-only routes
- **WHEN** an ADMIN requests an owner-only route directly
- **THEN** they are redirected to `/forbidden`
