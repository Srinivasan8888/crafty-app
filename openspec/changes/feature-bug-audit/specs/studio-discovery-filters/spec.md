## ADDED Requirements

### Requirement: Learn listing honors its filter and sort controls

The Learn (studios) listing page SHALL apply every filter and sort control its UI exposes, or SHALL NOT expose controls it cannot apply. Each control whose query param is present SHALL affect the result set; controls that cannot be backed by real data SHALL be removed.

#### Scenario: A working filter narrows results
- **WHEN** a user applies a supported filter (e.g. discipline, online/trial availability, or featured) on the Learn page
- **THEN** the listing query reflects that filter and the visible results change accordingly

#### Scenario: Sort control reorders results
- **WHEN** a user selects a sort option that the page supports
- **THEN** the listing is reordered by that option

#### Scenario: No control silently does nothing
- **WHEN** the Learn filter sheet presents any control
- **THEN** that control either changes the results or is not shown — there are no inert controls

### Requirement: No fabricated filter data is shown

The Learn filters SHALL NOT display hardcoded or invented values that misrepresent real data. The neighbourhood facet SHALL be sourced from real per-city data or removed; counts SHALL reflect actual records or not be shown.

#### Scenario: Neighbourhood facet is real or absent
- **WHEN** a user opens the Learn filter sheet in any city
- **THEN** they do not see a hardcoded Bengaluru-only neighbourhood list with invented counts; the facet is either backed by real per-city data or removed

#### Scenario: "Featured first" defaults off
- **WHEN** the Learn filter sheet first opens
- **THEN** the "Featured first" toggle is not pre-enabled and applying with no choices does not append spurious params to the URL

### Requirement: Learn search routes to the search experience

The Learn page mobile search box SHALL route queries to the city search experience, consistent with the Crafters and Stores listings, rather than to a URL the page ignores.

#### Scenario: Submitting a Learn search reaches results
- **WHEN** a user submits a query in the Learn page search box
- **THEN** they land on `/{city}/search?q=…` and see search results, not an unfiltered Learn list
