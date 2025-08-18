const connector = require('./connector')

class SumRM {
    constructor() {
        this.connector = connector
    }

    /**
     * Fetch the active artefact realization for a specific (model_id, artefact_id) pair
     * @param {string} modelId - The model identifier
     * @param {string} artefactId - The artefact identifier (numeric as string)
     * @param {string} asOf - ISO-8601 timestamp for point-in-time query (optional)
     * @returns {Promise<Object|null>} - The artefact realization data or null if not found
     */
    getArtefactRealization = async (modelId, artefactId, asOf = null) => {
        const params = new URLSearchParams({
            model_id: modelId,
            artefact_id: artefactId
        })

        if (asOf) {
            params.append('as_of', asOf)
        }

        const path = `/api/v1/artefact-realizations/by-key?${params.toString()}`
        
        try {
            const result = await this.connector({ path })
            return result
        } catch (error) {
            console.error(`Error fetching artefact realization for model ${modelId}, artefact ${artefactId}:`, error)
            return null
        }
    }

    /**
     * Fetch multiple artefact realizations for a model
     * @param {string} modelId - The model identifier
     * @param {Array<string>} artefactIds - Array of artefact identifiers
     * @param {string} asOf - ISO-8601 timestamp for point-in-time query (optional)
     * @returns {Promise<Array>} - Array of artefact realization data
     */
    getArtefactRealizations = async (modelId, artefactIds, asOf = null) => {
        const promises = artefactIds.map(artefactId => 
            this.getArtefactRealization(modelId, artefactId, asOf)
        )
        
        const results = await Promise.allSettled(promises)
        
        return results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value)
    }
}

module.exports = SumRM
