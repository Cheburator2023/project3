module.exports = (error, req, res, next) => {
  console.log(new Date(), 'ERROR:', error);

  if (!res.status || res.status === 200) res.status(500);

  res.end(error.message);
};
