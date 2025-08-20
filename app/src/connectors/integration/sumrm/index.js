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

        const path = `/api/rest/v1/api/v1/artefact-realizations/by-key?${params.toString()}`
        
        console.sys('SUMRM', `[DEBUG] Making API call for model ${modelId}, artefact ${artefactId}`)
        console.sys('SUMRM', `[DEBUG] Full path: ${path}`)
        console.sys('SUMRM', `[DEBUG] Token provided: ${!!token}`)
        
        try {
            const result = await this.connector({ path, token })
            console.sys('SUMRM', `[DEBUG] API response for model ${modelId}, artefact ${artefactId}:`, JSON.stringify(result, null, 2))
            return result
        } catch (error) {
            console.sys('SUMRM', `[ERROR] Failed for model ${modelId}, artefact ${artefactId}:`, error.message)
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
        console.sys('SUMRM', `[DEBUG] === SUMRM API CALL ===`)
        console.sys('SUMRM', `[DEBUG] Model ID: ${modelId}`)
        console.sys('SUMRM', `[DEBUG] Artefact IDs: ${artefactIds.join(', ')}`)
        console.sys('SUMRM', `[DEBUG] As of: ${asOf || 'current time'}`)
        console.sys('SUMRM', `[DEBUG] Token provided: ${!!token}`)
        
        const promises = artefactIds.map(artefactId => 
            this.getArtefactRealization(modelId, artefactId, asOf, token)
        )
        
        const results = await Promise.allSettled(promises)
        
        console.sys('SUMRM', `[DEBUG] API call results:`, results.map((result, index) => ({
            artefactId: artefactIds[index],
            status: result.status,
            value: result.value,
            reason: result.reason
        })))
        
        const successfulResults = results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value)
            
        console.sys('SUMRM', `[DEBUG] Successful results count: ${successfulResults.length}`)
        console.sys('SUMRM', `[DEBUG] Final results:`, JSON.stringify(successfulResults, null, 2))
        console.sys('SUMRM', `[DEBUG] ======================`)
            
        return successfulResults
    }
}

module.exports = SumRM
