module.exports = data => data
  .reduce((prev, curr) => {
    let prevItem = null

    if (prev.length)
      prevItem = prev[prev.length - 1]

    const currValue = {
      ARTEFACT_VALUE: curr.ARTEFACT_VALUE,
      ARTEFACT_VALUE_ID: curr.ARTEFACT_VALUE_ID,
      ARTEFACT_STRING_VALUE: curr.ARTEFACT_STRING_VALUE,
      ARTEFACT_ORIGINAL_VALUE: curr.ARTEFACT_ORIGINAL_VALUE
    }

    if (!prevItem || prevItem.ARTEFACT_ID !== curr.ARTEFACT_ID) {
      curr.VALUES = currValue.ARTEFACT_VALUE_ID || currValue.ARTEFACT_STRING_VALUE
        ? [currValue]
        : []
      prev.push(curr)
      return prev
    }
    if (curr.ARTEFACT_STRING_VALUE || curr.ARTEFACT_VALUE_ID)
      prev[prev.length - 1].VALUES.push(currValue)
    return prev
  }, [])
