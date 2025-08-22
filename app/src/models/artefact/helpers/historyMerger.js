/**
 * History Merger for SumRM Integration
 * 
 * This module provides helper functions for merging artefact history data
 * between the local Sum system and the SumRM system. It handles date-based
 * comparison, sorting, and deduplication of historical records.
 */

const { SYNC_CONFIG } = require('../../../common/sumrmConfig')

/**
 * Check if an artefact should be synchronized with SumRM
 * @param {number} artefactId - The artefact ID to check
 * @returns {boolean} - Whether the artefact should be synced
 */
const isArtefactSynced = (artefactId) => {
    return SYNC_CONFIG.artefactIdMapping.hasOwnProperty(artefactId.toString())
}

/**
 * Get the SumRM artefact ID for a given Sum artefact ID
 * @param {number} artefactId - The Sum artefact ID
 * @returns {string|null} - The corresponding SumRM artefact ID or null if not mapped
 */
const getSumrmArtefactId = (artefactId) => {
    return SYNC_CONFIG.artefactIdMapping[artefactId.toString()] || null
}

/**
 * Transform SumRM history record to match local format
 * @param {Object} sumrmRecord - Raw history record from SumRM API
 * @returns {Object} - Transformed record matching local format
 */
const transformSumrmHistoryRecord = (sumrmRecord) => {
    return {
        ARTEFACT_ID: parseInt(sumrmRecord.artefact_id),
        MODEL_ID: sumrmRecord.model_id,
        ARTEFACT_VALUE_ID: sumrmRecord.artefact_value_id,
        ARTEFACT_STRING_VALUE: sumrmRecord.artefact_string_value,
        CREATOR: sumrmRecord.creator,
        EFFECTIVE_FROM: sumrmRecord.effective_from,
        EFFECTIVE_TO: sumrmRecord.effective_to,
        ARTEFACT_TECH_LABEL: null, // Will be filled from local data
        ARTEFACT_LABEL: null, // Will be filled from local data
        ARTEFACT_DESC: null, // Will be filled from local data
        ARTEFACT_CONTEXT: null, // Will be filled from local data
        IS_MAIN_INFO_FLG: null, // Will be filled from local data
        IS_CLASS_FLG: null, // Will be filled from local data
        ARTEFACT_TYPE_ID: null, // Will be filled from local data
        ARTEFACT_BUSINESS_GROUP_ID: null, // Will be filled from local data
        BUSINESS_GROUP_LABEL: null, // Will be filled from local data
        ARTEFACT_VALUE: null, // Will be filled from local data
        IS_ACTIVE_FLG: sumrmRecord.is_active ? '1' : '0',
        ARTEFACT_PARENT_VALUE_ID: null, // Will be filled from local data
        ARTEFACT_TYPE_DESC: null, // Will be filled from local data
        BPMN_NAME: null, // Will be filled from local data
        source: 'sumrm'
    }
}

/**
 * Merge local artefact metadata into SumRM history records
 * @param {Array} sumrmHistory - SumRM history records
 * @param {Array} localHistory - Local history records (for metadata)
 * @returns {Array} - SumRM records with local metadata merged
 */
const mergeLocalMetadata = (sumrmHistory, localHistory) => {
    if (!localHistory || localHistory.length === 0) {
        return sumrmHistory
    }

    // Get metadata from the first local record (all should have same metadata)
    const localMetadata = localHistory[0]

    return sumrmHistory.map(sumrmRecord => ({
        ...sumrmRecord,
        ARTEFACT_TECH_LABEL: localMetadata.ARTEFACT_TECH_LABEL,
        ARTEFACT_LABEL: localMetadata.ARTEFACT_LABEL,
        ARTEFACT_DESC: localMetadata.ARTEFACT_DESC,
        ARTEFACT_CONTEXT: localMetadata.ARTEFACT_CONTEXT,
        IS_MAIN_INFO_FLG: localMetadata.IS_MAIN_INFO_FLG,
        IS_CLASS_FLG: localMetadata.IS_CLASS_FLG,
        ARTEFACT_TYPE_ID: localMetadata.ARTEFACT_TYPE_ID,
        ARTEFACT_BUSINESS_GROUP_ID: localMetadata.ARTEFACT_BUSINESS_GROUP_ID,
        BUSINESS_GROUP_LABEL: localMetadata.BUSINESS_GROUP_LABEL,
        ARTEFACT_VALUE: localMetadata.ARTEFACT_VALUE,
        ARTEFACT_PARENT_VALUE_ID: localMetadata.ARTEFACT_PARENT_VALUE_ID,
        ARTEFACT_TYPE_DESC: localMetadata.ARTEFACT_TYPE_DESC,
        BPMN_NAME: localMetadata.BPMN_NAME
    }))
}

/**
 * Compare two history records by effective_from date
 * @param {Object} recordA - First history record
 * @param {Object} recordB - Second history record
 * @returns {number} - Comparison result for sorting
 */
const compareHistoryRecords = (recordA, recordB) => {
    const dateA = new Date(recordA.EFFECTIVE_FROM).getTime()
    const dateB = new Date(recordB.EFFECTIVE_FROM).getTime()
    
    // Sort by effective_from DESC (newest first)
    return dateB - dateA
}

/**
 * Remove duplicate records based on effective_from and artefact_value_id
 * @param {Array} records - Array of history records
 * @returns {Array} - Deduplicated records
 */
const deduplicateRecords = (records) => {
    const seen = new Set()
    return records.filter(record => {
        const key = `${record.EFFECTIVE_FROM}_${record.ARTEFACT_VALUE_ID}`
        if (seen.has(key)) {
            return false
        }
        seen.add(key)
        return true
    })
}

/**
 * Merge local and SumRM history data
 * @param {Array} localHistory - Local history records from database
 * @param {Array} sumrmHistory - SumRM history records from API
 * @returns {Array} - Merged and sorted history records
 */
const mergeHistoryData = (localHistory, sumrmHistory) => {
    if (!localHistory && !sumrmHistory) {
        return []
    }

    if (!localHistory) {
        return sumrmHistory
    }

    if (!sumrmHistory) {
        return localHistory.map(record => ({
            ...record,
            source: 'local'
        }))
    }

    // Transform SumRM records and merge local metadata
    const transformedSumrmHistory = mergeLocalMetadata(
        sumrmHistory.map(transformSumrmHistoryRecord),
        localHistory
    )

    // Mark local records with source
    const markedLocalHistory = localHistory.map(record => ({
        ...record,
        source: 'local'
    }))

    // Combine and deduplicate records
    const combinedRecords = [...markedLocalHistory, ...transformedSumrmHistory]
    const deduplicatedRecords = deduplicateRecords(combinedRecords)

    // Sort by effective_from date (newest first)
    return deduplicatedRecords.sort(compareHistoryRecords)
}

module.exports = {
    isArtefactSynced,
    getSumrmArtefactId,
    transformSumrmHistoryRecord,
    mergeLocalMetadata,
    compareHistoryRecords,
    deduplicateRecords,
    mergeHistoryData
}
