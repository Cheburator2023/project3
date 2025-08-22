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
     * @param {string} token - Authorization token (optional)
     * @returns {Promise<Object|null>} - The artefact realization data or null if not found
     */
    getArtefactRealization = async (modelId, artefactId, asOf = null, token = null) => {
        const params = new URLSearchParams({
            model_id: modelId,
            artefact_id: artefactId
        })

        if (asOf) {
            params.append('as_of', asOf)
        }

        const path = `/artefact-realizations/by-key?${params.toString()}`
        
        try {
            const result = await this.connector({ path, token })
            return result
        } catch (error) {
            console.sys('SUMRM', `[ERROR] Failed for model ${modelId}, artefact ${artefactId}:`, error.message)
            return null
        }
    }

    /**
     * Fetch historical artefact realizations for a specific (model_id, artefact_id) pair
     * @param {string} modelId - The model identifier
     * @param {string} artefactId - The artefact identifier (numeric as string)
     * @param {string} token - Authorization token (optional)
     * @returns {Promise<Array|null>} - Array of historical artefact realizations or null if not found
     */
    getArtefactHistory = async (modelId, artefactId, token = null) => {
        const params = new URLSearchParams({
            model_id: modelId,
            artefact_id: artefactId,
            include_history: 'true'
        })

        const path = `/artefact-realizations/by-key?${params.toString()}`
        
        try {
            const result = await this.connector({ path, token })
            
            // Check if the response has the history format
            if (result && result.history && Array.isArray(result.history)) {
                console.sys('SUMRM', `[INFO] Retrieved ${result.history.length} history records for model ${modelId}, artefact ${artefactId}`)
                return result.history
            } else {
                console.sys('SUMRM', `[WARNING] Unexpected response format for history request: model ${modelId}, artefact ${artefactId}`)
                return null
            }
        } catch (error) {
            console.sys('SUMRM', `[ERROR] Failed to fetch history for model ${modelId}, artefact ${artefactId}:`, error.message)
            return null
        }
    }

    /**
     * Fetch multiple artefact realizations for a model
     * @param {string} modelId - The model identifier
     * @param {Array<string>} artefactIds - Array of artefact identifiers
     * @param {string} asOf - ISO-8601 timestamp for point-in-time query (optional)
     * @param {string} token - Authorization token (optional)
     * @returns {Promise<Array>} - Array of artefact realization data
     */
    getArtefactRealizations = async (modelId, artefactIds, asOf = null, token = null) => {
        const promises = artefactIds.map(artefactId => 
            this.getArtefactRealization(modelId, artefactId, asOf, token)
        )
        
        const results = await Promise.allSettled(promises)
        
        const successfulResults = results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value)
            
        return successfulResults
    }
}

module.exports = SumRM
