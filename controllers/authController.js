const bcrypt = require('bcryptjs');
const User = require('../schema/User'); // Ensure path is correct
const Otp = require('../schema/Otp');   // Ensure path is correct for your OTP model
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken'); // You need this import here for JWT operations

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'varun.kumar.sharma.2365@gmail.com',
        pass: 'wvlg umjq icvb qied'
    }
});

// --- Helper Functions ---

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtp = async (email, otp) => {
    try {
        const mailOptions = {
            from: '"FunnelsEye" <varun.kumar.sharma.2365@gmail.com>',
            to: email,
            subject: 'FunnelsEye: Your One-Time Password (OTP)',
            html: `
                <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7fa; padding: 20px 0;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 16px rgba(0,0,0,0.1);">
                        <div style="position: relative; height: 120px; background-color: #6a1b9a; padding-top: 20px; text-align: center;">
                            <h1 style="color: #ffffff; font-size: 32px; margin: 0; padding-bottom: 10px;">FunnelsEye</h1>
                            <p style="color: #ffffff; font-size: 16px; margin: 0;">Your Path to Growth</p>
                            <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 60px; fill: #f4f7fa;">
                                <path d="M0,32L120,42.7C240,53,480,75,720,74.7C960,75,1200,53,1320,42.7L1440,32L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z"></path>
                            </svg>
                        </div>
                        <div style="padding: 30px; text-align: center;">
                            <h2 style="color: #0056b3; font-size: 24px; margin-bottom: 20px;">Email Verification</h2>
                            <p style="font-size: 16px; margin-bottom: 25px;">Dear User,</p>
                            <p style="font-size: 18px; margin-bottom: 30px;">To complete your verification, please use the following One-Time Password (OTP):</p>
                            <div style="background-color: #e0f2f7; border: 1px solid #b3e5fc; border-radius: 10px; padding: 18px 30px; display: inline-block; margin-bottom: 30px;">
                                <h3 style="font-size: 38px; color: #e91e63; margin: 0; font-weight: bold; letter-spacing: 3px;">${otp}</h3>
                            </div>
                            <p style="font-size: 14px; color: #777; margin-top: 0;">This OTP is valid for 5 minutes. Please ensure you use it promptly.</p>
                            <p style="font-size: 14px; color: #777; margin-top: 15px;">If you did not request this OTP, please disregard this email.</p>
                            <p style="font-size: 16px; font-weight: bold; margin-top: 30px; color: #555;">Thank you,<br/>The FunnelsEye Team</p>
                        </div>
                        <div style="position: relative; height: 80px; background-color: #6a1b9a; padding: 10px 0; text-align: center;">
                            <p style="color: #ffffff; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} FunnelsEye. All rights reserved.</p>
                            <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style="position: absolute; top: 0; left: 0; width: 100%; height: 60px; fill: #ffffff; transform: rotateX(180deg);">
                                <path d="M0,32L120,42.7C240,53,480,75,720,74.7C960,75,1200,53,1320,42.7L1440,32L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`OTP sent successfully to ${email}`);
        return true;
    } catch (error) {
        console.error(`Error sending OTP to ${email}:`, error.message);
        return false;
    }
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    user.password = undefined;

    res.status(statusCode)
       .cookie('token', token, options)
       .json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                profilePictureUrl: user.profilePictureUrl
            }
        });
};


// --- Authentication Controllers ---

// Changed from exports.signup to const signup
const signup = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Please enter all required fields: name, email, password, and role.' });
    }
    if (!['coach', 'admin', 'client', 'super_admin'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    try {
        let user = await User.findOne({ email });
        if (user) {
            if (!user.isVerified) {
                await Otp.deleteMany({ email });
                const otp = generateOtp();
                await Otp.create({ email, otp });
                const otpSent = await sendOtp(email, otp);
                if (otpSent) {
                    return res.status(200).json({ success: true, message: 'User already exists but is not verified. A new OTP has been sent to your email.' });
                } else {
                    return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
                }
            }
            return res.status(400).json({ success: false, message: 'User with this email already exists and is verified.' });
        }

        user = await User.create({
            name,
            email,
            password,
            role,
            isVerified: false
        });

        const otp = generateOtp();
        await Otp.create({ email, otp, createdAt: new Date(), expiresAt: new Date(Date.now() + 5 * 60 * 1000) });

        const otpSent = await sendOtp(email, otp);

        if (otpSent) {
            res.status(201).json({
                success: true,
                message: 'User registered successfully. An OTP has been sent to your email for verification.',
                userId: user._id,
                email: user.email
            });
        } else {
            res.status(500).json({ success: false, message: 'User registered, but failed to send OTP. Please try logging in and re-requesting OTP.' });
        }

    } catch (error) {
        console.error('Error during signup:', error.message);
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'User with this email already exists.' });
        }
        res.status(500).json({ success: false, message: 'Server error during signup.' });
    }
};

// Changed from exports.verifyOtp to const verifyOtp
const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    // 1. Basic input validation
    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required for verification.' });
    }

    try {
        // 2. Find the OTP record by email and OTP.
        // We rely on the TTL index on `createdAt` in the Otp schema to handle expiration.
        // If an otpRecord is found, it means it exists AND has not yet been deleted by the TTL index.
        const otpRecord = await Otp.findOne({ email, otp });

        // 3. Check if an OTP record was found
        if (!otpRecord) {
            // If no record is found, it means:
            // a) The email or OTP is incorrect.
            // b) The OTP has expired and was automatically deleted by MongoDB's TTL.
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        // 4. Find the corresponding user
        const user = await User.findOne({ email });
        if (!user) {
            // This case should ideally not happen if signup created the user first,
            // but it's good practice for robustness.
            return res.status(404).json({ success: false, message: 'User not found for this email.' });
        }

        // 5. Mark user as verified
        user.isVerified = true;
        await user.save();

        // 6. Delete the used OTP record
        // This ensures the OTP cannot be reused.
        await Otp.deleteOne({ email }); // Delete by email because we have a unique index on email in Otp schema

        // 7. Send token response (login the user)
        sendTokenResponse(user, 200, res);

    } catch (error) {
        console.error('Error during OTP verification:', error.message);
        res.status(500).json({ success: false, message: 'Server error during OTP verification.' });
    }
};

// Changed from exports.login to const login
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please enter both email and password.' });
    }

    try {
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ success: false, message: 'Please verify your email first. A new OTP can be requested via signup or a dedicated resend endpoint.' });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }

        sendTokenResponse(user, 200, res);

    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
};

// Changed from exports.getMe to const getMe
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.coachId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(200).json({ success: true, user });
    } catch (err) {
        console.error("GetMe error:", err);
        res.status(500).json({ success: false, message: 'Server Error fetching user data.' });
    }
};

// Changed from exports.logout to const logout
const logout = (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({ success: true, message: 'Logged out successfully.' });
};


module.exports = {
    signup,
    verifyOtp,
    login,
    getMe,
    logout
};