const reduce = (prev, curr) => {
  if (!prev.length) {
    curr.VALUES = []
    curr.CURRENT_VALUES = []
    prev.push(curr)
  }

  if (prev[prev.length - 1].ARTEFACT_ID !== curr.ARTEFACT_ID) {
    curr.VALUES = []
    curr.CURRENT_VALUES = []
    prev.push(curr)
  }

  const currentValue = {
    ARTEFACT_STRING_VALUE: curr.CURRENT_ARTEFACT_STRING_VALUE,
    ARTEFACT_ORIGINAL_VALUE: curr.CURRENT_ARTEFACT_ORIGINAL_VALUE,
    ARTEFACT_VALUE_ID: curr.CURRENT_ARTEFACT_VALUE_ID,
    ARTEFACT_TYPE: curr.ARTEFACT_TYPE_DESC
  }

  const newValue = {
    ARTEFACT_VALUE: curr.ARTEFACT_VALUE,
    ARTEFACT_VALUE_ID: curr.ARTEFACT_VALUE_ID,
    ARTEFACT_PARENT_VALUE_ID: curr.ARTEFACT_PARENT_VALUE_ID
  }

  if (curr.ARTEFACT_VALUE_ID)
    prev[prev.length - 1].VALUES.push(newValue)

  if (curr.CURRENT_ARTEFACT_STRING_VALUE || curr.CURRENT_ARTEFACT_VALUE_ID)
    prev[prev.length - 1].CURRENT_VALUES.push(currentValue)

  return prev

}

const map = artefact => {
  artefact.VALUES = artefact
    .VALUES
    .filter(
      (v, i, self) =>
        self.indexOf(v) === i
    )
  artefact.CURRENT_VALUES = artefact
    .CURRENT_VALUES
    .filter(
      (v, i, self) =>
        self.indexOf(v) === i
    )
  return artefact
}

module.exports = { reduce, map }
