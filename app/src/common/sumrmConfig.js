/**
 * SumRM Integration Configuration
 * 
 * This file contains configuration settings for the SumRM artefact synchronization feature.
 * It defines which artefacts should be synchronized between Sum and SumRM systems,
 * along with environment variable settings and preferences.
 */

// Artefact IDs that should be synchronized between Sum and SumRM
const SYNC_ARTEFACT_IDS = [
    '803', // RFD (mentioned in the API documentation example)
    // Add other artefact IDs that need synchronization here
]

// Configuration for the synchronization
const SYNC_CONFIG = {
    // Whether to enable SumRM synchronization
    enabled: process.env.SUMRM_SYNC_ENABLED === 'true',
    
    // Artefact IDs to sync
    artefactIds: SYNC_ARTEFACT_IDS,
    
    // Whether to prefer SumRM values over local values when dates are equal
    preferSumRM: process.env.SUMRM_PREFER_SUMRM === 'true',
    
    // Timeout for API calls (in milliseconds)
    timeout: parseInt(process.env.SUMRM_API_TIMEOUT) || 5000,
}

module.exports = {
    SYNC_ARTEFACT_IDS,
    SYNC_CONFIG
}
