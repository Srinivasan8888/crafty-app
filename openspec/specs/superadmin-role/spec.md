# superadmin-role Specification

## Purpose
TBD - created by archiving change superadmin-god-mode. Update Purpose after archive.
## Requirements
### Requirement: SUPERADMIN tier above ADMIN
The system SHALL provide a SUPERADMIN role that ranks strictly above ADMIN in the hierarchy VISITOR < CREATOR < ADMIN < SUPERADMIN. A `requireSuperadmin()` guard SHALL admit only SUPERADMIN, while `requireAdmin()` SHALL admit both ADMIN and SUPERADMIN. The session user SHALL expose an `is_superadmin` flag, and any account that is SUPERADMIN SHALL also report `is_admin = true` for back-compatibility.

#### Scenario: Superadmin reaches an owner-only route
- **WHEN** a SUPERADMIN requests an owner-only route guarded by `requireSuperadmin()`
- **THEN** access is granted

#### Scenario: Admin is denied an owner-only route
- **WHEN** an ADMIN (not SUPERADMIN) requests a route guarded by `requireSuperadmin()`
- **THEN** access is denied and the user is redirected to `/forbidden`

#### Scenario: Admin guards still admit superadmin
- **WHEN** a SUPERADMIN requests any route guarded by `requireAdmin()`
- **THEN** access is granted and `is_admin` reports true

### Requirement: Bootstrap the first owner from environment
The system SHALL treat any authenticated email listed in the `SUPERADMIN_EMAIL` allow-list (comma-separated) as SUPERADMIN, applied idempotently on each authenticated request so an owner always exists without manual database edits. In development mode (`DEV_AUTH=true`) the dev user SHALL be treated as SUPERADMIN.

#### Scenario: Allow-listed email becomes superadmin
- **WHEN** a user whose email is in `SUPERADMIN_EMAIL` authenticates
- **THEN** their account role is ensured to be SUPERADMIN

#### Scenario: Existing admin seed is unaffected
- **WHEN** `SIC_ADMIN_EMAIL` is set for an account not in `SUPERADMIN_EMAIL`
- **THEN** that account remains an ADMIN and is not elevated to SUPERADMIN

### Requirement: Safe ownership transfer
A SUPERADMIN SHALL be able to transfer the owner role to another account behind an explicit confirmation, and MAY step down to ADMIN. The system SHALL refuse any role change that would leave zero SUPERADMINs.

#### Scenario: Transfer ownership to the real owner
- **WHEN** a SUPERADMIN promotes another account to SUPERADMIN and confirms
- **THEN** the target account becomes SUPERADMIN and the action is recorded in the audit log

#### Scenario: Last superadmin cannot be removed
- **WHEN** an action would demote or transfer away the only remaining SUPERADMIN
- **THEN** the action is refused with an explanatory error and no change is made
