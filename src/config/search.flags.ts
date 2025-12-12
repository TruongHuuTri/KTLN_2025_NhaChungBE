// Centralized search feature flags and tuning constants
// - ENV is used only for major toggles (enable/disable features per environment)
// - Tuning knobs are constants here for clarity and easy code review

export const RERANK_TOPK = 10; // Number of top results to send to AI reranker
export const DIVERSIFY_MAX_PER_ROOM = 2; // Max items per roomId after rerank
export const DIVERSIFY_MAX_PER_BUILDING = 3; // Max items per buildingName after rerank
export const POP_BOOST_ALPHA = 0.2; // Popularity boost weight used to slightly adjust ordering

// In the future, other knobs can be centralized here as well, e.g. default TTLs, weights, etc.
