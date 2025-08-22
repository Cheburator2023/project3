/**
 * SumRM Integration Configuration
 * 
 * This file contains configuration settings for the SumRM artefact synchronization feature.
 * It defines which artefacts should be synchronized between Sum and SumRM systems,
 * along with environment variable settings and preferences.
 */

// Mapping between Sum artefact IDs and SumRM artefact IDs
// Key: Sum artefact ID, Value: SumRM artefact ID
const ARTEFACT_ID_MAPPING = {
    '803': '2073', // RFD artefact - Sum ID 803 maps to SumRM ID 2073
    // Add more mappings as needed:
    // '804': '2074', // Example: another artefact mapping
    // '805': '2075', // Example: another artefact mapping
}

// Get SumRM artefact IDs from the mapping
const SYNC_ARTEFACT_IDS = Object.values(ARTEFACT_ID_MAPPING)

// Configuration for the synchronization
const SYNC_CONFIG = {
    // Whether to enable SumRM synchronization
    enabled: process.env.SUMRM_SYNC_ENABLED === 'true',
    
    // Whether to enable SumRM history synchronization
    historyEnabled: process.env.SUMRM_HISTORY_SYNC_ENABLED === 'true',
    
    // Artefact ID mapping
    artefactIdMapping: ARTEFACT_ID_MAPPING,
    
    // SumRM artefact IDs to sync (derived from mapping)
    artefactIds: SYNC_ARTEFACT_IDS,
    
    // Whether to prefer SumRM values over local values when dates are equal
    preferSumRM: process.env.SUMRM_PREFER_SUMRM === 'true',
    
    // Timeout for API calls (in milliseconds)
    timeout: parseInt(process.env.SUMRM_API_TIMEOUT) || 5000,
}

module.exports = {
    SYNC_ARTEFACT_IDS,
    SYNC_CONFIG,
    ARTEFACT_ID_MAPPING
}
