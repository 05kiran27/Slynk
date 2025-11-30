exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // normalize role types to lowercase to match schema
    const role = (req.user.role || '').toString().toLowerCase();
    const allowed = allowedRoles.map(r => r.toString().toLowerCase());

    if (!allowed.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }

    next();
  };
};
