const dbVar = MODEL_ID => artefact => ({
  MODEL_ID,
  ARTEFACT_ID: artefact.ARTEFACT_ID,
  ARTEFACT_VALUE_ID: artefact.ARTEFACT_VALUE_ID || null,
  ARTEFACT_STRING_VALUE: artefact.ARTEFACT_STRING_VALUE
})

module.exports = dbVar
