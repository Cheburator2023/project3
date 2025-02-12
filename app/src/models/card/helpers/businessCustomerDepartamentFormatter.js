/**
 * Formats the customer department information.
 * - Splits the input string by ;
 * - Trims each department name
 * - Removes duplicates
 * - Joins the result into a single string separated by ,
 *
 * @param {string|null|undefined} deptInfo - The raw department info string (can be null or undefined).
 * @returns {string} - A formatted string of unique department names separated by , .
 */
function formatCustomerDeptInfo(deptInfo) {
  return [...new Set((deptInfo || '').split(';').map(dep => dep.trim()))].join(', ');
}
module.exports = {
  formatCustomerDeptInfo
}
