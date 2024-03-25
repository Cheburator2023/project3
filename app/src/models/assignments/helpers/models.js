// Get models arguments for request
const getArguments = (assignmentsIds, user) => {
  const val = assignmentsIds.map(
    ({ rootAssignmentId }) => rootAssignmentId.toString()
  );

  return {
    assignmentsIds: val,
    type: 'initialization',
    active: '1',
    groups: user.groups.join(','),
    is_ds_flg: user.groups.includes('ds') ? '1' : '0',
    is_bc_flg: user.groups.includes('business_customer') ? '1' : '0'
  };
};

// Group response by assignment ID in specified arguments order
const groupResponse = (response = [], argumentsOfModelsRequest = []) =>
  argumentsOfModelsRequest.map(({ rootAssignmentId }) =>
    response.filter(({ ROOT_ASSIGNMENT_ID }) => ROOT_ASSIGNMENT_ID == rootAssignmentId)
  );

module.exports = {
  getArguments,
  groupResponse,
};
