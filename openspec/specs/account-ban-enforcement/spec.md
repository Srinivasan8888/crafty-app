# account-ban-enforcement Specification

## Purpose
TBD - created by archiving change feature-bug-audit. Update Purpose after archive.
## Requirements
### Requirement: Banned accounts are denied authenticated access

The system SHALL treat a User with `is_banned = true` as not authenticated for all server-side authorization checks. `requireUser()`, `requireCreator()`, and `requireAdmin()` SHALL deny access when the resolved user is banned, so the admin "Ban" action has a real effect rather than being a silent no-op.

#### Scenario: Banned user is blocked from authenticated pages
- **WHEN** a user whose account has `is_banned = true` requests an authenticated route (e.g. `/dashboard`)
- **THEN** the request is treated as unauthenticated/denied (redirect to sign-in or `/forbidden`) and the user does not see authenticated content

#### Scenario: Banned user cannot mutate listings
- **WHEN** a banned user submits any creator mutation (create/edit/delete crafter, store, studio, event, product, review, message)
- **THEN** the request is rejected by the auth guard before any write occurs

#### Scenario: Banning takes effect without a separate revocation step
- **WHEN** an admin clicks "Ban" on a user in `/admin/users`
- **THEN** that user's subsequent authenticated requests are denied based solely on the `is_banned` flag

### Requirement: Ban does not affect non-banned users

The system SHALL deny access only when `is_banned` is explicitly true; users without the flag set SHALL retain their existing access.

#### Scenario: Normal users unaffected
- **WHEN** a user with `is_banned` false or unset makes an authenticated request
- **THEN** access is granted exactly as before this change

### Requirement: Account deletion does not permanently block re-registration

A Descope "User Deleted" webhook event SHALL detach the local account from its Descope identity without marking it banned, so the same email address can register again later. Ban state SHALL be tracked separately from deletion state.

#### Scenario: Deleted user signs up again

- **WHEN** a user is deleted in Descope and later signs up again with the same email address
- **THEN** the new sign-up is not treated as a banned account and the user can access the app

#### Scenario: Banned user remains blocked

- **WHEN** a user is banned (not deleted) and attempts to access the app
- **THEN** the account is still treated as anonymous/blocked, unchanged by this requirement

