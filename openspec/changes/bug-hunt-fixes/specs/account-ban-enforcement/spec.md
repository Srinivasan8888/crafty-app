## ADDED Requirements

### Requirement: Account deletion does not permanently block re-registration

A Descope "User Deleted" webhook event SHALL detach the local account from its Descope identity without marking it banned, so the same email address can register again later. Ban state SHALL be tracked separately from deletion state.

#### Scenario: Deleted user signs up again

- **WHEN** a user is deleted in Descope and later signs up again with the same email address
- **THEN** the new sign-up is not treated as a banned account and the user can access the app

#### Scenario: Banned user remains blocked

- **WHEN** a user is banned (not deleted) and attempts to access the app
- **THEN** the account is still treated as anonymous/blocked, unchanged by this requirement
