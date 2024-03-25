const dbVar = ASSIGNMENT_ID => artefact => ({
  ASSIGNMENT_ID,
  ARTEFACT_ID: artefact.ARTEFACT_ID,
  ARTEFACT_VALUE_ID: artefact.ARTEFACT_VALUE_ID || null,
  ARTEFACT_STRING_VALUE: artefact.ARTEFACT_STRING_VALUE || null,
  ARTEFACT_ORIGINAL_VALUE: artefact.ARTEFACT_ORIGINAL_VALUE || null
})

module.exports = dbVar
