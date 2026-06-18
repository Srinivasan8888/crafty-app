## ADDED Requirements

### Requirement: "This weekend" event window includes the current Sunday

The "This weekend" events filter SHALL include events occurring on the current weekend — including Sunday — when viewed on a Sunday, rather than deferring to the following weekend.

#### Scenario: Viewing "This weekend" on a Sunday

- **WHEN** a user opens the "This weekend" events filter on a Sunday (IST)
- **THEN** events occurring on that same Sunday are included in the results

#### Scenario: Past events still excluded

- **WHEN** the weekend window is computed and part of it is already in the past
- **THEN** events whose end time is before now are still excluded

### Requirement: City-scoped personalized recommendations apply the city filter before candidate selection

City-scoped "Picks for you" recommendations SHALL apply the city constraint before the candidate limit so the rail is filled with eligible in-city results up to the requested count.

#### Scenario: Top global co-saves are in other cities

- **WHEN** personalized recommendations are requested for a city and the highest-scoring co-saved entities are outside that city
- **THEN** the city's eligible lower-ranked entities still fill the rail up to the requested count instead of the rail under-filling
