module.exports = async (req, res) => {
  const { common } = req.context;
  const { rootAssignmentId } = req.body;

  if(!rootAssignmentId) {
    const message = 'rootAssignmentId property required';

    console.error(message);
    res.status(400).end(message);

    return;
  }

  try {
    await common.assignments.deleteAssignment(rootAssignmentId);

    res.status(200).end(`${rootAssignmentId} successfully deleted`);
  } catch (err) {
    console.error(err);
    res.status(500).end(err.message);
  }
};
