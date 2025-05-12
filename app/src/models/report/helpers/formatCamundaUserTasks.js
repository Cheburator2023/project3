const { user_roles } = require("../constants");

const formatUserTasks = (userTasks) =>
  userTasks.reduce((allTasks, groupTask, index) => {
    const formattedGroupTasks = groupTask.map(
      ({ name, processInstanceId, assignee }) => ({
        name,
        processInstanceId,
        assignee,
        role: user_roles[index],
      })
    );

    return [...allTasks, ...formattedGroupTasks];
  }, []);

module.exports = {
  formatUserTasks,
};
