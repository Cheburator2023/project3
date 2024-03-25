const reduce = (prev, curr) => {
  let index

  const value = {
    ARTEFACT_VALUE: curr.ARTEFACT_VALUE,
    ARTEFACT_VALUE_ID: curr.ARTEFACT_VALUE_ID,
    ARTEFACT_STRING_VALUE: curr.ARTEFACT_STRING_VALUE,
    ARTEFACT_ORIGINAL_VALUE: curr.ARTEFACT_ORIGINAL_VALUE
  }

  prev.forEach((p, i) => {
    if (p.ARTEFACT_ID === curr.ARTEFACT_ID) {
      index = i
    }
  })

  if (index !== undefined) {
    prev[index].VALUES.push(value)
  } else {
    prev.push({ ...curr, VALUES: [value] })
  }
  return prev
}

const map = artefact => {
  artefact.VALUES = artefact.VALUES.filter(
    (v, i, self) => self.indexOf(v) === i
  )
  return artefact
}

// Get artefacts arguments for request
const getArguments = (assignmentsIds) => {
  const val = assignmentsIds.map(
    ({ assignmentId }) => assignmentId.toString()
  );

  return {
    assignmentsIds: val,
  };
};

// Group response by assignment ID in specified arguments order
const groupResponse = (response = [], argumentsOfArtefactsRequest = []) =>
  argumentsOfArtefactsRequest.map(({ assignmentId }) => {
      const assignmentResult = response.filter(({ ASSIGNMENT_ID }) => ASSIGNMENT_ID == assignmentId);

      return assignmentResult.length ? assignmentResult.reduce(reduce, []).map(map) : [];
    }
  );

module.exports = {
  reduce,
  map,
  getArguments,
  groupResponse
}
