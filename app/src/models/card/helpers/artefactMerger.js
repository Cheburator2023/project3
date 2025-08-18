/**
 * Artefact Merger for SumRM Integration
 * 
 * This module provides helper functions for comparing and merging artefact values
 * between the local Sum system and the SumRM system. It handles date-based comparison
 * and preference settings to determine which artefact value should be displayed.
 */

const { SYNC_CONFIG } = require('../../../common/sumrmConfig')

/**
 * Compare artefact values from Sum and SumRM systems and return the latest one
 * @param {Object} localArtefact - Local artefact data from Sum (processed by cardArtefacts helper)
 * @param {Object} sumrmArtefact - Artefact data from SumRM API
 * @returns {Object} - The artefact with the latest value
 */
const compareArtefactValues = (localArtefact, sumrmArtefact) => {
    if (!localArtefact && !sumrmArtefact) {
        return null
    }

    if (!localArtefact) {
        return {
            ...sumrmArtefact,
            source: 'sumrm'
        }
    }

    if (!sumrmArtefact) {
        return {
            ...localArtefact,
            source: 'local'
        }
    }

    // For local artefacts, we need to get the effective date from the current value
    // Local artefacts are processed by cardArtefacts helper, so we need to check VALUES
    let localEffectiveDate = null
    
    if (localArtefact.VALUES && localArtefact.VALUES.length > 0) {
        // Use the first value's effective date (most recent)
        localEffectiveDate = new Date(localArtefact.EFFECTIVE_FROM)
    } else {
        // No values, use the artefact's effective date
        localEffectiveDate = new Date(localArtefact.EFFECTIVE_FROM)
    }

    const sumrmDate = new Date(sumrmArtefact.effective_from)

    // Compare dates
    if (localEffectiveDate > sumrmDate) {
        return {
            ...localArtefact,
            source: 'local'
        }
    } else if (sumrmDate > localEffectiveDate) {
        return {
            ...sumrmArtefact,
            source: 'sumrm'
        }
    } else {
        // Dates are equal, use preference setting
        if (SYNC_CONFIG.preferSumRM) {
            return {
                ...sumrmArtefact,
                source: 'sumrm'
            }
        } else {
            return {
                ...localArtefact,
                source: 'local'
            }
        }
    }
}

/**
 * Transform SumRM artefact data to match local format
 * @param {Object} sumrmArtefact - Raw data from SumRM API
 * @returns {Object} - Transformed artefact data
 */
const transformSumrmArtefact = (sumrmArtefact) => {
    return {
        ARTEFACT_ID: sumrmArtefact.artefact_id,
        MODEL_ID: sumrmArtefact.model_id,
        ARTEFACT_VALUE_ID: sumrmArtefact.artefact_value_id,
        ARTEFACT_STRING_VALUE: sumrmArtefact.artefact_string_value,
        ARTEFACT_ORIGINAL_VALUE: sumrmArtefact.artefact_original_value,
        CREATOR: sumrmArtefact.creator,
        EFFECTIVE_FROM: sumrmArtefact.effective_from,
        EFFECTIVE_TO: sumrmArtefact.effective_to,
        // Add source indicator
        source: 'sumrm'
    }
}

/**
 * Merge local artefacts with SumRM artefacts for synchronized artefact IDs
 * @param {Array} localArtefacts - Local artefacts from Sum (processed by cardArtefacts helper)
 * @param {Array} sumrmArtefacts - Artefacts from SumRM API
 * @returns {Array} - Merged artefacts with latest values
 */
const mergeArtefacts = (localArtefacts, sumrmArtefacts) => {
    const localArtefactsMap = new Map()
    const sumrmArtefactsMap = new Map()

    // Create maps for easy lookup
    localArtefacts.forEach(artefact => {
        localArtefactsMap.set(artefact.ARTEFACT_ID, artefact)
    })

    sumrmArtefacts.forEach(artefact => {
        sumrmArtefactsMap.set(artefact.artefact_id, artefact)
    })

    const mergedArtefacts = []

    // Process all local artefacts
    localArtefacts.forEach(localArtefact => {
        const artefactId = localArtefact.ARTEFACT_ID.toString()
        
        if (SYNC_CONFIG.artefactIds.includes(artefactId)) {
            // This artefact should be synchronized
            const sumrmArtefact = sumrmArtefactsMap.get(artefactId)
            
            if (sumrmArtefact) {
                // Compare and potentially replace with SumRM value
                const mergedArtefact = compareArtefactValues(localArtefact, sumrmArtefact)
                
                if (mergedArtefact && mergedArtefact.source === 'sumrm') {
                    // Replace local artefact with SumRM artefact
                    const transformedSumrmArtefact = transformSumrmArtefact(sumrmArtefact)
                    // Preserve the VALUES structure from local artefact
                    transformedSumrmArtefact.VALUES = localArtefact.VALUES || []
                    mergedArtefacts.push(transformedSumrmArtefact)
                } else {
                    // Keep local artefact, just add source indicator
                    mergedArtefacts.push({
                        ...localArtefact,
                        source: 'local'
                    })
                }
            } else {
                // No SumRM artefact found, keep local value
                mergedArtefacts.push({
                    ...localArtefact,
                    source: 'local'
                })
            }
        } else {
            // This artefact doesn't need synchronization, keep local value
            mergedArtefacts.push({
                ...localArtefact,
                source: 'local'
            })
        }
    })

    // Add SumRM artefacts that don't exist locally
    sumrmArtefacts.forEach(sumrmArtefact => {
        const artefactId = sumrmArtefact.artefact_id
        if (SYNC_CONFIG.artefactIds.includes(artefactId) && !localArtefactsMap.has(parseInt(artefactId))) {
            const transformedArtefact = transformSumrmArtefact(sumrmArtefact)
            // Initialize empty VALUES array for new artefacts
            transformedArtefact.VALUES = []
            mergedArtefacts.push(transformedArtefact)
        }
    })

    return mergedArtefacts
}

module.exports = {
    compareArtefactValues,
    transformSumrmArtefact,
    mergeArtefacts
}
