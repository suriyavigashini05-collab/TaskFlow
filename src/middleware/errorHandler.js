function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`
    });
  }
  next();
}

function errorHandler(err, req, res, next) {
  console.error('[Error]', err.stack || err.message || err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
