## ADDED Requirements

### Requirement: Edits preserve image blurhash placeholders

When a creator replaces an image while editing a crafter, store, studio, or event, the system SHALL persist the new image's blurhash alongside the new image. The PATCH validation schemas SHALL accept the `*_blurhash` fields, and edit pages SHALL pre-fill stored blurhash values so unchanged images keep their placeholders.

#### Scenario: Replacing a photo updates its blurhash
- **WHEN** a creator uploads a new photo on an edit form and saves
- **THEN** the stored blurhash for that image is updated to match the new photo (no stale/mismatched blur)

#### Scenario: Edit form pre-fills existing blurhashes
- **WHEN** an edit page loads for an entity with stored blurhashes
- **THEN** the form's initial values include those blurhashes so saving without changing the image preserves them

### Requirement: Soft-deleted listings do not block re-creation

The 1-per-type creation cap SHALL exclude soft-deleted (`status = "DELETED"`) records, consistent with stores and studios, so a user who deletes a listing can create a new one.

#### Scenario: Re-create after delete
- **WHEN** a user soft-deletes their crafter profile and then creates a new crafter
- **THEN** creation succeeds (the deleted row does not count toward the cap)

#### Scenario: Active duplicate still blocked
- **WHEN** a user with an existing non-deleted crafter tries to create a second one
- **THEN** creation is still rejected by the cap

### Requirement: Edit validation matches create validation

The PATCH validation for an entity SHALL be at least as strict as its POST validation for shared fields, so values rejected on create cannot be introduced via edit.

#### Scenario: Event price integer constraint on edit
- **WHEN** a user submits a non-integer `price_amount` via event edit (PATCH)
- **THEN** the request is rejected, matching the create-path constraint (`int`, nonnegative)
