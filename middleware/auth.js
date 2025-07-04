const jwt = require('jsonwebtoken'); // For verifying JWT tokens
const User = require('../Schema/User'); // Import your User model (adjust path if needed, e.g., ../schema/User)

// @desc    Protect routes - Middleware to check for valid JWT
const protect = async (req, res, next) => {
    
    let token;

    // 1) Check if token exists in the Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]; // Extract token from "Bearer <token>"
    }
    // 2) Alternatively, check if token is in a cookie (if you set it that way)
    // else if (req.cookies.token) {
    //     token = req.cookies.token;
    // }

    // Check if token is provided
    if (!token) {
        // If no token, the user is not authenticated
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route, no token provided.'
        });
    }

    try {
        // Verify token
        // This decodes the token using the secret and checks for expiration
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user by the ID extracted from the token's payload
        // .select('-password') is implicitly handled by `select: false` in User model
        const user = await User.findById(decoded.id);

        if (!user) {
            // If user associated with the token is not found (e.g., user deleted)
            return res.status(401).json({
                success: false,
                message: 'User belonging to this token no longer exists.'
            });
        }

        // Attach the user's ID and role to the request object
        // This makes the user's ID and role available in subsequent route handlers
        req.coachId = user._id; // Use req.coachId as per your controller logic
        req.role = user.role;
        req.user = user; // Optionally attach the full user object (excluding password)


        next(); // Proceed to the next middleware or route handler

    } catch (error) {
        console.error('Error in protect middleware:', error.message);
        // Handle different JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route, invalid token.'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route, token has expired.'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error in authentication process.'
        });
    }
};

// @desc    Authorize specific roles - Middleware to check user roles
// @params  ...roles (e.g., 'admin', 'coach')
const authorizeCoach = (...roles) => {
    // This returns another middleware function

    return (req, res, next) => {
        // req.role is set by the 'protect' middleware
        // Check if the user's role is included in the allowed roles for this route
        // If req.coachId is meant to verify *ownership*, this middleware needs to compare req.coachId with req.params.coachId.
        // The current implementation is for general role-based access control.
        // If it's for ownership, consider renaming to authorizeOwnership or similar.
        // For example, to ensure coach only accesses their own funnels:
        if (req.coachId && req.params.coachId && req.coachId.toString() !== req.params.coachId.toString()) {
             return res.status(403).json({
                 success: false,
                 message: `Forbidden: You are not authorized to access this resource for Coach ID ${req.params.coachId}.`
             });
        }

        // If you need to restrict by roles (e.g., only 'admin' or 'coach' can access)
        if (roles.length > 0 && !roles.includes(req.role)) {
            return res.status(403).json({
                success: false,
                message: `User role (${req.role}) is not authorized to access this route.`
            });
        }

        next(); // User is authorized, proceed
    };
};


module.exports = {
    protect,
    authorizeCoach
};