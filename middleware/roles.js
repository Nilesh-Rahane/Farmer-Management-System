// Role-based authorization middleware

const requireFarmer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'farmer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Farmer privileges required for this action',
    });
  }

  next();
};

const requireWorker = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'worker') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Worker privileges required for this action',
    });
  }

  next();
};

module.exports = {
  requireFarmer,
  requireWorker,
};
