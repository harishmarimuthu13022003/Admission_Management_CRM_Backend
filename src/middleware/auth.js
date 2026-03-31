const jwt = require('jsonwebtoken');

// ──────────────────────────────────────────────
// RBAC Permission Matrix
// ──────────────────────────────────────────────
// Roles: Admin, Officer, Management
//
// Permissions define what each role can DO (write/update actions)
// Read access is handled separately where needed
// ──────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  Admin: {
    // Master Setup
    createInstitution: true,
    createCampus: true,
    createDepartment: true,
    createProgram: true,
    readMaster: true,

    // Applicants
    createApplicant: true,
    allocateSeat: true,
    updateApplicantStatus: true,
    readApplicants: true,

    // Admissions
    confirmAdmission: true,
    updateDocumentStatus: true,
    updateFeeStatus: true,
    readAdmissions: true,

    // Dashboard
    readDashboard: true,

    // User Management
    registerUser: true,
  },

  'Admission Officer': {
    // Master Setup - read only
    createInstitution: false,
    createCampus: false,
    createDepartment: false,
    createProgram: false,
    readMaster: true,

    // Applicants
    createApplicant: true,
    allocateSeat: true,
    updateApplicantStatus: true,
    readApplicants: true,

    // Admissions
    confirmAdmission: true,
    updateDocumentStatus: true,
    updateFeeStatus: true,
    readAdmissions: true,

    // Dashboard
    readDashboard: true,

    // User Management
    registerUser: false,
  },

  Management: {
    // Master Setup - no access
    createInstitution: false,
    createCampus: false,
    createDepartment: false,
    createProgram: false,
    readMaster: false,

    // Applicants - no access
    createApplicant: false,
    allocateSeat: false,
    updateApplicantStatus: false,
    readApplicants: false,

    // Admissions - no access
    confirmAdmission: false,
    updateDocumentStatus: false,
    updateFeeStatus: false,
    readAdmissions: false,

    // Dashboard - read only
    readDashboard: true,

    // User Management
    registerUser: false,
  },
};

// ──────────────────────────────────────────────
// Middleware: Verify JWT Token
// ──────────────────────────────────────────────
const auth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Invalid token format.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// ──────────────────────────────────────────────
// Middleware: Check if user has specific role(s)
// Usage: checkRole(['Admin', 'Officer'])
// ──────────────────────────────────────────────
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        requiredRoles: allowedRoles,
        currentRole: req.user.role,
      });
    }
    next();
  };
};

// ──────────────────────────────────────────────
// Middleware: Check if user has specific permission
// Usage: checkPermission('createApplicant')
// ──────────────────────────────────────────────
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const role = req.user.role;
    const permissions = ROLE_PERMISSIONS[role];

    if (!permissions || !permissions[permission]) {
      return res.status(403).json({
        error: `Access denied. Role '${role}' does not have '${permission}' permission.`,
        permission,
        currentRole: role,
      });
    }

    next();
  };
};

// ──────────────────────────────────────────────
// Helper: Get permissions for a role (for frontend)
// ──────────────────────────────────────────────
const getPermissionsForRole = (role) => {
  return ROLE_PERMISSIONS[role] || {};
};

module.exports = { auth, checkRole, checkPermission, getPermissionsForRole, ROLE_PERMISSIONS };
