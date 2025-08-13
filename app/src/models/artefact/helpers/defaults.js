// Utilities to enrich artefacts payload with defaults on creation

/**
 * Ensures default artefact values are present for model creation.
 * Currently applies: if 'rfd' is missing => set to 'Нет'.
 *
 * @param {Object} params
 * @param {Object} params.db - db models container (context.db)
 * @param {string} params.modelId - MODEL_ID of the new model
 * @param {Array} params.artefacts - incoming ARTEFACTS payload (may be mutated)
 * @returns {Promise<Array>} - resulting artefacts array with defaults applied
 */
const applyCreationDefaults = async ({ db, modelId, artefacts }) => {
  const result = Array.isArray(artefacts) ? [...artefacts] : [];

  try {
    // Resolve artefact id by tech label
    const artefactIdRes = await db.integration.artefactId('rfd');
    const artefactId = artefactIdRes?.rows?.[0]?.ARTEFACT_ID;

    if (artefactId) {
      const alreadyProvided = result.some(
        (a) => a?.ARTEFACT_ID === artefactId || a?.ARTEFACT_TECH_LABEL === 'rfd'
      );

      if (!alreadyProvided) {
        const valueRow = await db.artefact.getArtefactValueIdByValue({
          artefactId,
          value: 'Нет',
        });

        result.push({
          MODEL_ID: modelId,
          ARTEFACT_ID: artefactId,
          ARTEFACT_VALUE_ID: valueRow?.ARTEFACT_VALUE_ID || null,
          ARTEFACT_STRING_VALUE: valueRow ? null : 'Нет',
        });
      }
    }
  } catch (e) {
    // Non-fatal: if lookups fail, skip defaulting
    console.warn('applyCreationDefaults failed:', e?.message || e);
  }

  return result;
};

module.exports = { applyCreationDefaults };


