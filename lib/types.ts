export const ENTITY_TYPES = ['CRAFTER', 'STORE', 'STUDIO', 'EVENT'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const FLAG_REASONS = ['INAPPROPRIATE', 'SPAM', 'MISLEADING', 'COPYRIGHT', 'OTHER'] as const;
export type FlagReason = (typeof FLAG_REASONS)[number];

export const LISTING_STATUSES = ['PUBLISHED', 'UNPUBLISHED', 'HIDDEN', 'DELETED'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];
