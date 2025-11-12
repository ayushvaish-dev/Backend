const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const { grantUserCourseAccess } = require("../../dao/admin/courseDao.js");
const { checkAndCreateWelcomeNotification } = require('../notifications/notificationController');
const xlsx = require('xlsx');
const {
  verifyOTP,
  sendOTP,
  storeOTP,
  getOTP,
  deleteOTP,
  generateAccessToken,
  // issueRefreshToken,
  // revokeRefreshToken
} = require("../../helpers/auth/auth.function.js");
const {
  createUser,
  findByEmail,
  updatePassword,
  checkEmailOrPhone,
} = require("../../dao/auth/auth.js");
const crypto = require("crypto");

const { userUnifiedSchema} = require('../../validator/userAuthValidate.js')

const { sendMail } = require('../../utils/mail.js');
const activityDao = require('../../dao/activity/activityDao.js');

// Create single or multiple users by admin
async function createUsersByAdmin(req, res) {
  try {
    let users = [];
    if (req.file) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      users = xlsx.utils.sheet_to_json(sheet);
      console.log(users);
      
    }
    else if (Array.isArray(req.body)) {
      users = req.body;
    } else if (typeof req.body === 'object') {
      users = [req.body];
    } else {
      return res.status(400).json({ success: false, message: 'Invalid input format' });
    }
    const createdUsers = [];
    const failedUsers = [];

    for (const user of users) {
      try {
        const { error } = userUnifiedSchema.validate(user);
        if (error) throw new Error(error.details[0].message);

        const hashedPassword = await bcrypt.hash(user.password, 10);

        const newUser = await createUser({
          ...user,
          password: hashedPassword,
          auth_provider: 'local',
          provider_id: null,
          role: user.role || 'user', // Default to 'user' if not provided
        });

        createdUsers.push(newUser);
        const emailSubject = 'Welcome to LMS Portal';
const emailBody = `
Hi ${user.first_name || 'User'},

Your LMS account has been created successfully.

Email: ${user.email}
Password: ${user.password}

Please use the temporary password provided to you separately to log in.

You can log in here: https://www.creditoracademy.com/

Thanks,
Creditor LMS Team
`;

await sendMail(user.email, emailSubject, emailBody);
        
      } catch (err) {
        failedUsers.push({
          email: user?.email || 'unknown',
          error: err.message,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Users created: ${createdUsers.length}, Failed: ${failedUsers.length}`,
      data: createdUsers,
      failed: failedUsers,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message,
    });
  }
}


const registerUser = async (req, res) => {
  try {
    const { email, phone } = req.body;
    console.log(new Date().toLocaleTimeString());    
    // Check if email is provided
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    // Check if user already exists
    const checkUser = await checkEmailOrPhone(email, phone);
    if (checkUser) {
      return res.status(400).json({
        message: `User already exists with email ${email} or phone ${phone}`,
      });
    }
    // Check if OTP already sent
    const storedOtp = await getOTP(email);
    if (storedOtp) {
      return res.status(400).json({
        message: `OTP already sent to ${email}, please verify`,
      });
    }

    // Generate secure OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    storeOTP(email, otp, 300); // 5 minutes TTL

    // Send OTP
    await sendMail(email,`OTP Verification`, `Your OTP for email verification is ${otp}` );

    res.status(201).json({
      success: true,
      message: `OTP sent to ${email}`,
    });
  } catch (error) {
    console.log(`Error on registration: `, error);
    if (error.name === "RedisError") {
      return res.status(500).json({ message: "Redis connection error", error });
    }
    return res.status(500).json({ message: "Internal server error", error });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, gender, dob, otp, auth_provider = "local", provider_id } = req.body;

    if (auth_provider === "local") {
      const verifyOptResponse = await verifyOTP(otp, email);
      if (!verifyOptResponse.success) {
        return res.status(400).json({ message: verifyOptResponse.message });
      }
      await deleteOTP(email);
    }

    const hashedPassword = auth_provider === "local" ? await bcrypt.hash(password, 10) : null;

    // Create user
    const newUser = await createUser({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      phone,
      gender,
      dob,
      auth_provider,
      provider_id: auth_provider === "google" ? provider_id : null,
    });

    const subscriptionStart = new Date();
    const subscriptionEnd = new Date(subscriptionStart);
    subscriptionEnd.setDate(subscriptionStart.getDate() + 14);

    console.log(`Subscription starting from ${subscriptionStart} to ${subscriptionEnd}`)

    const freeCourses = [
      "ecd7f254-0748-4fe5-aa2d-58ca75b95cbc",
    ];
for (const courseId of freeCourses) {
  await grantUserCourseAccess({
    course_id: courseId,
    learnerIds: newUser.id,
    isTrial: true,
    subscription_start: subscriptionStart,
    subscription_end: subscriptionEnd,
  });
}
    const accessPayload = {
      id: newUser.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
    };

    const accessToken = await generateAccessToken(accessPayload);


    // await issueRefreshToken(res, { userId: newUser.id });

    res.cookie("Access-Token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      // partitioned: true,
      path: '/',
  });
  await checkAndCreateWelcomeNotification(newUser.id);

    res.status(201).json({
      success: true,
      accessToken,
      message: "User registered successfully",
    });
  } catch (err) {
    console.error(`Error on verifying OTP: ${err.message}`);
    return res.status(500).json({ message: `Error on verifying OTP: ${err.message}` });
  }
};
const resendOtp = async (req, res) => {
  const { email } = req.body;

  const storedOtp = await getOTP(email);
  if (storedOtp) {
    return res.status(400).json({
      message: `OTP already sent to ${email}, please verify`,
    });
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  await storeOTP(email, otp);
  await sendOTP(email, otp);

  console.log(`OTP sent to ${email}: ${otp}`);
  return res.status(201).json({ message: `otp sent at mail :- ${email}` });
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existingUser = await findByEmail(email);
    console.log('Existing user:', existingUser);

    if (!existingUser) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (existingUser.auth_provider === 'google') {
      return res.status(400).json({ message: 'Please use Google OAuth to login' });
    }

    const isCorrectPassword = await bcrypt.compare(password, existingUser.password || '');
    console.log('Password verification:', isCorrectPassword);
    if (!isCorrectPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessPayload = {
      id: existingUser.id,
      email: existingUser.email,
      first_name: existingUser.first_name,
      last_name: existingUser.last_name,
    };

    const accessToken = await generateAccessToken(accessPayload);

    
    res.cookie("Access-Token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      // partitioned: true,
      path: '/',
    });

    // await issueRefreshToken(res, { userId: existingUser.id});

    await activityDao.logActivity({
      userId: existingUser.id,
      action: 'USER_LOGIN',
      targetId: existingUser.id,
    });
    await checkAndCreateWelcomeNotification(existingUser.id);

    return res.status(200).json({
      success: true,
      accessToken,
      message: 'User logged in successfully',
    });
  } catch (error) {
    console.error(`Error on login: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


const logoutUser = async (req, res) => {
  try {
    // await revokeRefreshToken(req, res, { revokeAll: false });
    res.clearCookie("Access-Token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: '/',
  });
    if (req.logout) {
      req.logout((err) => {
        if (err) {
          console.log(`Error logging out from pasport session`, err);
        }
      });
    }
    return res
      .status(200)
      .json({ message: "User logged out and token removed !" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

const forgotPassword = async (req, res) => {
  try{
    const { email } = req.body;

    console.log(`Requested email on forgetPassword controller controller: ${email}`)

    // Check if user exists
    const user = await findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
  
    // Generate JWT token with expiration
    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });
    const resetLink = `https://lmsathena.com/reset-password?token=${resetToken}`;
      const emailSubject = "Password Reset - Athena LMS";
      const emailBody = `
  Hi ${user.first_name || 'User'},
  
  We received a request to reset your password.
  
  Click the link below to reset your password (valid for 5 minutes):
  ${resetLink}
  
  If you did not request this, please ignore this email.
  
  Thanks,
  Creditor LMS Team
  `;
  
    
  sendMail(user.email, emailSubject, emailBody)
  .then(() => console.log("Reset email sent"))
  .catch(err => console.log(`Email send failed: ${err}`));
  
    res.json({ message: "Reset token generated", token: resetToken });
  }
  catch(error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

const resetPassword = async (req, res) => {
  try {
    const email = req.email;
    console.log(`Requested email on resetPassword controller: ${email}`)
    const { password } = req.body;

    // Hash password
    //const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    const updatedUser = await updatePassword(email, password);

    if (!updatedUser) {
      return res.status(500).json({ message: "Error updating password" });
    }
    
    // Get full user details (important for email)
    const emailSubject = 'Password Reset';
    const emailBody = `
Hi ${updatedUser.first_name || 'User'},

Your LMS account password has been reset successfully.

Email: ${updatedUser.email}
Password: ${password}

You can log in here: https://www.creditoracademy.com/

Thanks,
Creditor LMS Team
`;

    // Send email
    await sendMail(updatedUser.email, emailSubject, emailBody);
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating password", error: error.message });
  }
};




module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  verifyOtp,
  resendOtp,
  createUsersByAdmin,
};