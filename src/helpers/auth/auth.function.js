const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const redisClient = require("../../config/redis");
// const {
//   createRefreshToken,
//   findRefreshTokenByHash,
//   revokeRefreshTokenById,
//   revokeAllForUser,
// } = require('../../dao/auth/refreshToken');
const crypto = require('crypto')
const { promisify } = require('util')


const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
  });

const sendOTP = async (email, otp, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: subject || `OTP Verification`,
    text: text || `Hello there \n Your OTP code is ${otp}. It will expire in 5 minutes.`,
  };
    console.log(new Date().toLocaleTimeString());
    await transporter.sendMail(mailOptions);    
    console.log(new Date().toLocaleTimeString());
};

const clearToken = (res) => {
    res.clearCookie("Access-Token", {
      httpOnly: true,
      secure: true, 
      sameSite: "None",
    });
};


const verifyResetToken = (req, res, next) => {
  const token = req.headers['reset-token']; // Get token from headers

  if (!token) {
    return res.status(401).json({ message: 'Token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.email = decoded.email; // Attach email to request
    next();
  } catch (error) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
};

const storeOTP = async (key, otp, ttl = 300) => {
  try {
    await redisClient.set(`otp:${key}`, otp, { EX: ttl });
    console.log(`OTP stored for ${key}`);
  } catch (error) {
    console.error("Error storing OTP:", error);
    throw error;
  }
};

const getOTP = async (key) => {
  try {
    return await redisClient.get(`otp:${key}`);
  } catch (error) {
    console.error("Error retrieving OTP:", error);
    throw error;
  }
};

const deleteOTP = async (key) => {
  try {
    await redisClient.del(`otp:${key}`);
    console.log(`OTP deleted for ${key}`);
  } catch (error) {
    console.error("Error deleting OTP:", error);
    throw error;
  }
};

const verifyOTP = async (otp, email) => {
  if (!otp) {
    return { success: false, message: "OTP is required" };
  }

  const storedOtp = await getOTP(email);
  if (!storedOtp) {
    return { success: false, message: "OTP expired or not found" };
  }

  if (String(storedOtp).trim() !== String(otp).trim()) {
    return { success: false, message: "Invalid OTP" };
  }

  return { success: true, message: "OTP verified successfully" };
};



// ************************************************************************



const ACCESS_EXPIRES_MINUTES = parseInt(process.env.JWT_ACCESS_EXPIRES_MINUTES || 120);
const REFRESH_EXPIRES_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || 7);
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const REFRESH_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME 
const REFRESH_HASH_PEPPER = process.env.REFRESH_TOKEN_HASH_PEPPER 


const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);


// function cookieOptionsForRefresh(expiresAt) {
//   return {
//       httpOnly: true,
//       secure: true,
//       expires: expiresAt,
//       sameSite: 'None',
//       path: '/refresh',
//   };
// }

// function hashToken(token) {
//   return crypto.createHash('sha256').update(token + REFRESH_HASH_PEPPER).digest('hex');
// }

async function generateAccessToken(payload) {
  const expiresIn = `${ACCESS_EXPIRES_MINUTES}m`;
  return signAsync(payload, ACCESS_SECRET, { expiresIn });
}

// async function generateRefreshRawAndExpiry() {
//   const expiresIn = `${REFRESH_EXPIRES_DAYS}d`;
//   const token = await signAsync({}, REFRESH_SECRET, { expiresIn });
//   const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
//   return { token, expiresAt };
// }

// async function issueRefreshToken(res, { userId }) {
//   const { token, expiresAt } = await generateRefreshRawAndExpiry();
//   const hashed = hashToken(token);

//   const data = {
//     userId,
//     tokenHash: hashed,
//     expiresAt,
//   }

//   // await createRefreshToken(data);

//   res.cookie(REFRESH_COOKIE_NAME, token, cookieOptionsForRefresh(expiresAt));
//   return token;
// }

// async function verifyAndRotateRefreshToken(req, res) {
//   const raw = req.cookies?.[REFRESH_COOKIE_NAME];
//   if (!raw) throw new Error('No refresh token');

//   let decoded;
//   try {
//     decoded = await verifyAsync(raw, REFRESH_SECRET);
//   } catch (err) {
//     throw new Error('Invalid or expired refresh token');
//   }

//   const hashed = hashToken(raw);
//   const found = await findRefreshTokenByHash(hashed);
//   if (!found || found.revoked) throw new Error('Refresh token revoked or not found');
//   if (new Date(found.expiresAt) < new Date()) throw new Error('Refresh token expired');

//   await revokeRefreshTokenById(found.id);

//   const newRaw = await issueRefreshToken(res, { userId: found.userId});

//   return { newRaw, userId: found.userId };
// }

// async function revokeRefreshToken(req, res, { revokeAll = false } = {}) {
//   const raw = req.cookies?.[REFRESH_COOKIE_NAME];
//   if (raw) {
//     try {
//       const hashed = hashToken(raw);
//       const found = await findRefreshTokenByHash(hashed);
//       if (found) await revokeRefreshTokenById(found.id);
//     } catch (e) {
//       console.error('Error revoking refresh token', e);
//     }
//   }

//   if (revokeAll && req.user?.id) {
//     await revokeAllForUser(req.user.id);
//   }

//   res.clearCookie(REFRESH_COOKIE_NAME);
// }

module.exports = { 
  sendOTP, 
  clearToken,
  verifyResetToken, 
  storeOTP, 
  getOTP, 
  deleteOTP, 
  verifyOTP, 
  generateAccessToken,
  // issueRefreshToken,
  // verifyAndRotateRefreshToken,
  // revokeRefreshToken,
  // hashToken,
  // cookieName: REFRESH_COOKIE_NAME,
};