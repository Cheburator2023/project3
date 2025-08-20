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

    // Convert dates to UTC timestamps for comparison
    // Local date needs special handling - it's stored as local time but needs to be treated as UTC
    const localDateString = localArtefact.EFFECTIVE_FROM.toString()
    const dateTimeMatch = localDateString.match(/(\w{3})\s+(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/)
    
    let localUTCTime
    if (dateTimeMatch) {
        // Extract date components from local date string
        const monthName = dateTimeMatch[2]
        const day = parseInt(dateTimeMatch[3])
        const year = parseInt(dateTimeMatch[4])
        const hours = parseInt(dateTimeMatch[5])
        const minutes = parseInt(dateTimeMatch[6])
        const seconds = parseInt(dateTimeMatch[7])
        
        // Convert month name to number
        const monthMap = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        }
        
        const month = monthMap[monthName]
        // Create UTC date string using the local time components (treating them as UTC)
        const utcDateString = `${year}-${month}-${day.toString().padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}Z`
        
        localUTCTime = new Date(utcDateString).getTime()
    } else {
        // Fallback: use the original method
        localUTCTime = new Date(localArtefact.EFFECTIVE_FROM).getTime()
    }
    
    const sumrmUTCTime = new Date(sumrmArtefact.effective_from).getTime()
    
    // Compare dates using UTC timestamps
    if (localUTCTime > sumrmUTCTime) {
        return {
            ...localArtefact,
            source: 'local'
        }
    } else if (sumrmUTCTime > localUTCTime) {
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
    // Create the value object that matches the local structure
    const valueObject = {
        ARTEFACT_VALUE: null,
        ARTEFACT_VALUE_ID: sumrmArtefact.artefact_value_id,
        ARTEFACT_STRING_VALUE: sumrmArtefact.artefact_string_value,
        ARTEFACT_ORIGINAL_VALUE: sumrmArtefact.artefact_original_value
    }

    return {
        ARTEFACT_ID: sumrmArtefact.artefact_id,
        MODEL_ID: sumrmArtefact.model_id,
        ARTEFACT_VALUE_ID: sumrmArtefact.artefact_value_id,
        ARTEFACT_STRING_VALUE: sumrmArtefact.artefact_string_value,
        ARTEFACT_ORIGINAL_VALUE: sumrmArtefact.artefact_original_value,
        CREATOR: sumrmArtefact.creator,
        EFFECTIVE_FROM: sumrmArtefact.effective_from,
        EFFECTIVE_TO: sumrmArtefact.effective_to,
        VALUES: sumrmArtefact.artefact_string_value || sumrmArtefact.artefact_value_id ? [valueObject] : [],
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
        
        const shouldSync = SYNC_CONFIG.artefactIdMapping.hasOwnProperty(artefactId)
        
        if (shouldSync) {
            const sumrmArtefactId = SYNC_CONFIG.artefactIdMapping[artefactId]
            const sumrmArtefact = sumrmArtefactsMap.get(sumrmArtefactId)
            
            if (sumrmArtefact) {
                const mergedArtefact = compareArtefactValues(localArtefact, sumrmArtefact)
                
                if (mergedArtefact && mergedArtefact.source === 'sumrm') {
                    // Replace local artefact with SumRM artefact
                    const transformedSumrmArtefact = transformSumrmArtefact(sumrmArtefact)
                    transformedSumrmArtefact.ARTEFACT_ID = parseInt(artefactId)
                    
                    // Preserve local artefact properties
                    if (localArtefact.ARTEFACT_TYPE) {
                        transformedSumrmArtefact.ARTEFACT_TYPE = localArtefact.ARTEFACT_TYPE
                    }
                    if (localArtefact.ARTEFACT_NAME) {
                        transformedSumrmArtefact.ARTEFACT_NAME = localArtefact.ARTEFACT_NAME
                    }
                    mergedArtefacts.push(transformedSumrmArtefact)
                } else {
                    // Keep local artefact
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
            // This artefact doesn't need synchronization
            mergedArtefacts.push({
                ...localArtefact,
                source: 'local'
            })
        }
    })

    // Add SumRM artefacts that don't exist locally
    sumrmArtefacts.forEach(sumrmArtefact => {
        const sumrmArtefactId = sumrmArtefact.artefact_id
        const sumArtefactId = Object.keys(SYNC_CONFIG.artefactIdMapping).find(
            key => SYNC_CONFIG.artefactIdMapping[key] === sumrmArtefactId
        )
        
        if (sumArtefactId && !localArtefactsMap.has(parseInt(sumArtefactId))) {
            const transformedArtefact = transformSumrmArtefact(sumrmArtefact)
            transformedArtefact.VALUES = []
            transformedArtefact.ARTEFACT_ID = parseInt(sumArtefactId)
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
