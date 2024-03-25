const { user_roles } = require("../constants");

const formatUserTasks = (userTasks) =>
  userTasks.reduce((allTasks, groupTask, index) => {
    const formattedGroupTasks = groupTask.map(
      ({ name, processInstanceId }) => ({
        name,
        processInstanceId,
        role: user_roles[index],
      })
    );

    return [...allTasks, ...formattedGroupTasks];
  }, []);

module.exports = {
  formatUserTasks,
};
