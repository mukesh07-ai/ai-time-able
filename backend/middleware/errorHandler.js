module.exports = (err, req, res, next) => {
  console.error('ERROR:', err.message);
  if (process.env.NODE_ENV === 'development') console.error(err.stack);

  let statusCode = err.status || err.statusCode || 500;

  // IMPORTANT: Anthropic/external API 401s must NOT be forwarded as 401
  // (that would trigger the client to log out the user).
  // Only our own auth middleware should return 401.
  if (statusCode === 401 && !err._isAuthError) {
    statusCode = 503; // Service unavailable (e.g. bad API key)
  }

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
