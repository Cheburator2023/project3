const reduce = (prev, curr) => {
  let index

  const value = {
    ARTEFACT_VALUE: curr.ARTEFACT_VALUE,
    ARTEFACT_VALUE_ID: curr.ARTEFACT_VALUE_ID
  }

  prev.forEach((p, i) => {
    if (p.ARTEFACT_ID === curr.ARTEFACT_ID) {
      index = i
    }
  })

  if (index !== undefined) {
    prev[index].VALUES.push(value)
  } else {
    prev.push({ ...curr, VALUES: curr.ARTEFACT_VALUE_ID ? [value] : [] })
  }
  return prev
}

const map = artefact => {
  artefact.VALUES = artefact.VALUES.filter(
    (v, i, self) => self.indexOf(v) === i
  )
  return artefact
}

module.exports = { reduce, map }
