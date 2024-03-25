const getUserName = ({ given_name, family_name, username }) => {
    if (given_name && family_name) {
        return `${given_name} ${family_name}`
    }
  
    return username;
  }
  
  module.exports = getUserName;
