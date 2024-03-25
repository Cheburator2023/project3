module.exports = data => data.reduce(
  (prev, curr) => {
    if (!prev.length || prev[prev.length - 1].ARTEFACT_ID !== curr.ARTEFACT_ID) {
      curr.VALUES = []
      prev.push(curr)
    }

    const artefactValue = {
      ARTEFACT_ID: curr.ARTEFACT_ID,
      IS_ACTIVE_FLG: curr.IS_ACTIVE_FLG,
      ARTEFACT_PARENT_VALUE_ID: curr.ARTEFACT_PARENT_VALUE_ID,
      ARTEFACT_VALUE_ID: curr.ARTEFACT_VALUE_ID,
      ARTEFACT_VALUE: curr.ARTEFACT_VALUE
    }

    if (artefactValue.ARTEFACT_VALUE_ID)
      prev[prev.length - 1].VALUES.push(artefactValue)

    return prev
  },
  []
)
