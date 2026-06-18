# durable-media-storage Specification

## Purpose
TBD - created by archiving change production-launch-readiness. Update Purpose after archive.
## Requirements
### Requirement: Production media uploads persist in object storage

In production the system SHALL write all processed image variants to an S3-compatible object store (Cloudflare R2 or AWS S3) and serve them from a stable public URL, so that uploaded media survives deploys, restarts, and instance recycling. The system SHALL NOT use the local filesystem driver in production.

#### Scenario: Upload persists across a redeploy
- **WHEN** a user uploads a profile or portfolio image in production and the application is subsequently redeployed
- **THEN** the previously uploaded image is still retrievable at its original public URL

#### Scenario: Storage driver is S3 in production
- **WHEN** the production environment is evaluated
- **THEN** `STORAGE_DRIVER` is set to `s3` and the required `STORAGE_S3_*` variables (bucket, access key, secret, public base, and endpoint/region as applicable) are all present

#### Scenario: Misconfigured storage fails loudly, not silently
- **WHEN** `STORAGE_DRIVER=s3` but a required `STORAGE_S3_*` variable is missing
- **THEN** an upload attempt throws a clear configuration error rather than silently writing to or reading from the local filesystem

### Requirement: S3 SDK dependency is available at build time

The system SHALL include `@aws-sdk/client-s3` as an installed dependency so the production build and runtime can activate the S3 storage driver.

#### Scenario: Build includes the S3 client
- **WHEN** the production build runs with `STORAGE_DRIVER=s3`
- **THEN** the `@aws-sdk/client-s3` module resolves and the S3 driver initializes without a missing-dependency error

### Requirement: Uploaded image is publicly fetchable

The system SHALL return a public-readable URL for each stored image that resolves with HTTP 200 from an unauthenticated client.

#### Scenario: Public URL round-trips
- **WHEN** an image is uploaded in production and its returned URL is fetched by an anonymous client
- **THEN** the response status is 200 and the body is the image content
