## ADDED Requirements

### Requirement: Generated placeholder fields never block submission

Auto-generated image placeholder fields (`*_blurhash`, e.g. `profile_photo_blurhash`, `portfolio_blurhashes`, `logo_photo_blurhash`, `cover_image_blurhash`, `photo_blurhashes`) are produced by the system, not entered by the user. Their validation limits MUST be wide enough to always accept any value the system itself generates, so that a successfully uploaded image can never cause a submission to fail.

The placeholder is a base64 data-URL of a small thumbnail (`data:image/jpeg;base64,…`), which can reach roughly 1,100 characters. The schema length cap MUST be at least 4000 characters for these fields across every listing route (crafters, stores, studios, events, products), for both create (POST) and edit (PATCH) endpoints.

#### Scenario: Uploaded photo produces a long placeholder

- **WHEN** a user uploads a profile or portfolio photo whose generated placeholder data-URL exceeds 500 characters
- **THEN** the form submits successfully
- **AND** no "string must contain at most 500 character(s)" error is shown for any blurhash field

#### Scenario: Placeholder length cap matches generator output

- **WHEN** the system generates an image placeholder via the image-processing pipeline
- **THEN** the generated string length is always within the schema's accepted maximum for that field

### Requirement: Phone and WhatsApp inputs accept only valid phone characters

Phone and WhatsApp number inputs MUST restrict entry, at the moment of typing or pasting, to characters that form a valid phone number: digits `0-9`, a leading `+`, spaces, hyphens, parentheses, and dots. Any other character MUST be rejected/stripped so it never appears in the field. This applies to every phone/WhatsApp input across the listing forms.

#### Scenario: User types a non-numeric character

- **WHEN** a user types a letter or disallowed symbol into a phone or WhatsApp field
- **THEN** the character does not appear in the field

#### Scenario: User pastes a mixed string

- **WHEN** a user pastes text containing letters and phone characters into a phone or WhatsApp field
- **THEN** only the valid phone characters are retained in the field

#### Scenario: Valid number passes validation

- **WHEN** a user enters a number using only allowed phone characters with at least 7 digits
- **THEN** the field is considered valid and does not show "enter a valid phone number"

### Requirement: Validation feedback is shown inline on the field while filling it out

Each form field's validation error MUST be shown inline, directly associated with that field, as the user fills out the form (on blur and/or change for a touched field) — not deferred until the user navigates to a later step or submits the whole form. In a multi-step form, a step's field errors MUST be surfaced on that step.

#### Scenario: Invalid field on the current step

- **WHEN** a user enters an invalid value in a field and moves focus away (blur)
- **THEN** an error message appears under that field describing what is wrong
- **AND** the user does not have to advance to a later step or submit to discover the error

#### Scenario: Error clears when corrected

- **WHEN** a user corrects a previously invalid field to a valid value
- **THEN** the inline error for that field is removed

#### Scenario: Multi-step form blocks advancing with a visible reason

- **WHEN** a user clicks "Next" while the current step has an invalid or missing required field
- **THEN** the relevant field shows its inline error on the current step
- **AND** the form does not silently advance and surface the error on a later step

### Requirement: Consistent validation behavior across all listing forms

The three behaviors above (placeholder caps, phone-character restriction, inline field-level feedback) MUST be applied consistently across all listing creation and edit forms — crafters, stores, studios, events, and products — so the same class of bug does not survive in one form while being fixed in another.

#### Scenario: Equivalent fields behave the same in every form

- **WHEN** a given field type (phone/WhatsApp, generated placeholder, required text, URL) appears in more than one listing form
- **THEN** it enforces the same input restriction and shows the same inline validation behavior in every form that contains it
