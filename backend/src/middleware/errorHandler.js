exports.errorHandler = (err, req, res, next) => {
  // log stack in server logs (avoid leaking stack in production responses)
  console.error(err && err.stack ? err.stack : err);

  const status = err.status || 500;
  const payload = {
    error: err.message || 'Internal Server Error',
  };

  // in non-production, include additional debug info
  if (process.env.NODE_ENV !== 'production') {
    payload.debug = {
      name: err.name,
      stack: err.stack,
    };
  }

  res.status(status).json(payload);
};
