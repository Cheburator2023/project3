// Get assignments arguments for request
const getArguments = (assignmentsIds) => {
  const val = assignmentsIds.map(
    ({ rootAssignmentId }) => rootAssignmentId.toString()
  );

  return {
    assignmentsIds: val,
  };
};

// Group response by assignment ID in specified arguments order
const groupResponse = (response = [], argumentsOfAssignmentsRequest = []) =>
  argumentsOfAssignmentsRequest.map(({ rootAssignmentId }) =>
    response.filter(({ ROOT_ASSIGNMENT_ID }) => ROOT_ASSIGNMENT_ID == rootAssignmentId)
  );

module.exports = {
  getArguments,
  groupResponse,
};
