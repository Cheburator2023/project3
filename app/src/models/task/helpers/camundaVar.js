const camundaVar = artefacts => artefacts
  .reduce((prev, curr) => {
    prev.variables[curr.ARTEFACT_TECH_LABEL] = { value: curr.ARTEFACT_STRING_VALUE || false }
    return prev
  }, { variables: {} })


module.exports = camundaVar
