## ADDED Requirements

### Requirement: Product creation enforces the per-tier cap

The system SHALL enforce the per-tier product limit (`getMaxProducts`: free vs Pro) when a seller creates a product. `POST /api/products` SHALL count the seller's existing non-deleted products and reject the request when creating another would exceed the cap for their current subscription tier.

#### Scenario: Free-tier seller at the cap is blocked
- **WHEN** a free-tier seller who already has the maximum allowed products submits another `POST /api/products`
- **THEN** the request is rejected with a clear limit error and no product is created

#### Scenario: Pro-tier seller has the higher cap
- **WHEN** a Pro-tier seller creates products
- **THEN** they are allowed up to the Pro maximum, above the free-tier limit

#### Scenario: Soft-deleted products do not count toward the cap
- **WHEN** the cap is evaluated for a seller
- **THEN** products with `status = "DELETED"` are excluded from the count

#### Scenario: Within-cap creation still succeeds
- **WHEN** a seller below their tier cap creates a product
- **THEN** the product is created as before
