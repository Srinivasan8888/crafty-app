## ADDED Requirements

### Requirement: Invite admins by email
A SUPERADMIN SHALL be able to invite a person by email to become an ADMIN or SUPERADMIN, even if that person has no account yet. Each invite SHALL be single-use, expire after a bounded period (default 14 days), and store its token hashed at rest. Only SUPERADMINs SHALL be able to create invites. An invitation email SHALL be sent via the existing email pipeline (no-op when email is not configured).

#### Scenario: Superadmin creates an invite
- **WHEN** a SUPERADMIN submits an email and target role
- **THEN** a PENDING invite is created with an expiry, a hashed token is stored, an invitation email is dispatched, and the action is audited

#### Scenario: Non-superadmin cannot invite
- **WHEN** an ADMIN or any non-superadmin attempts to create an invite
- **THEN** the request is denied

### Requirement: Invitations are consumed on first authenticated request
A PENDING, unexpired invite SHALL be consumed when the invited email next authenticates, applying the invited role and marking the invite CONSUMED. Consumption SHALL NOT require clicking the email link.

#### Scenario: Invited person signs in and is promoted
- **WHEN** a user whose email has a PENDING, unexpired invite authenticates
- **THEN** their role is set to the invited role, the invite is marked CONSUMED with a timestamp, and the promotion is audited

#### Scenario: Expired invite is not consumed
- **WHEN** the invited email authenticates after the invite's expiry
- **THEN** the role is unchanged and the invite is treated as EXPIRED

#### Scenario: Invite is single-use
- **WHEN** an already-CONSUMED or REVOKED invite would be consumed again
- **THEN** no role change occurs

### Requirement: Manage existing admins
A SUPERADMIN SHALL be able to promote, demote, and revoke admin access for existing accounts, and revoke pending invites. Role mutation SHALL be restricted to SUPERADMINs (ADMINs SHALL NOT change roles). Every change SHALL be written to the audit log.

#### Scenario: Promote and demote
- **WHEN** a SUPERADMIN promotes a CREATOR to ADMIN, or demotes an ADMIN to CREATOR
- **THEN** the target role changes and the action is audited, subject to the last-superadmin invariant

#### Scenario: Revoke a pending invite
- **WHEN** a SUPERADMIN revokes a PENDING invite
- **THEN** the invite status becomes REVOKED and can no longer be consumed
