const userProfileDao = require('../../dao/user/userProfile');
const { findUserById } = require('../../dao/auth/auth');
const { sendOTP, storeOTP, verifyOTP, deleteOTP } = require('../../helpers/auth/auth.function');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const cloudinary = require('../../config/cloudinaryConfig');
const messages = require('../../utils/messages');
const { getUserById } = require('../../dao/user/userDao');


// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await findUserById(userId);

    if (!user) {
      return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
    }

    user.last_login = user.activity_log[0].createdAt;    

    return successResponse(req, res, user, 200, messages.PROFILE_FETCH);
  } catch (error) {
    return errorResponse(req, res, 500, `Error fetching user profile: ${error.message}`);
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await userProfileDao.getAllUsers();
    return successResponse(req, res, users, 200, 'All users fetched successfully');
  } catch (error) {
    return errorResponse(req, res, 500, `Error fetching users: ${error.message}`);
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, phone, location, bio, timezone, gender, facebook, linkedin } = req.body;

    // Check if user exists
    const userExist = await findUserById(userId);
    if (!userExist) {
      return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
    }

    // Create updates object with only provided fields
    const updates = {};
    if (first_name) updates.first_name = first_name;
    if (last_name) updates.last_name = last_name;
    if (phone) updates.phone = phone;
    if (location) updates.location = location;
    if (bio) updates.bio = bio;
    if (timezone) updates.timezone = timezone;
    if (gender) updates.gender = gender; 
    if (facebook || linkedin) {
        updates.social_handles = {}; 
    if (facebook) updates.social_handles.facebook = facebook;
    if (linkedin) updates.social_handles.linkedin = linkedin;
    }

    // Check if any fields were provided for update
    if (Object.keys(updates).length === 0) {
      return errorResponse(req, res, 400, messages.FIELD_REQUIRED);
    }

    const updatedUser = await userProfileDao.userProfileUpdate(userId, updates);
    return successResponse(req, res, updatedUser, 200, messages.PROFILE_UPDATED_SUCCESSFULLY);

  } catch (error) {

    return errorResponse(req, res, 500, `Error updating user profile: ${error.message}`);
  }
};

// Initiate email update
const emailUpdate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newEmail } = req.body;

    if (!newEmail) {
      return errorResponse(req, res, 400, messages.NEW_EMAIL_REQUIRED);
    }

    // Check if user exists
    const userExist = await findUserById(userId);
    if (!userExist) {
      return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
    }

    // Check if new email is different from current email
    if (userExist.email === newEmail) {
      return errorResponse(req, res, 400, messages.NEW_EMAIL_IS_SAME_AS_CURRENT_EMAIL);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await storeOTP(newEmail, otp);
    await sendOTP(newEmail, otp, 'Email Update Verification', `Your OTP for email update verification is: ${otp}`);

    return successResponse(req, res, null, 200, `OTP sent to ${newEmail}`);

  } catch (error) {
    console.error('Email update initiation error:', error);
    return errorResponse(req, res, 500, `Failed to initiate email update: ${error.message}`);
  }
};

// Verify and update email
const verifyEmail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newEmail, otp } = req.body;

    if (!newEmail || !otp) {
      return errorResponse(req, res, 400, messages.NEW_EMAIL_AND_OTP_REQUIRED);
    }

    // Verify OTP
    const verifyResult = await verifyOTP(otp, newEmail);
    if (!verifyResult.success) {
      return errorResponse(req, res, 400, verifyResult.message);
    }

    // Update email
    const updatedUser = await userProfileDao.updateUserEmail(userId, newEmail);
    await deleteOTP(newEmail);

    return successResponse(req, res, updatedUser, 200, messages.EMAIL_UPDATED_SUCCESSFULLY);

  } catch (error) {
    console.error('Email update error:', error);
    return errorResponse(req, res, 500, `Failed to update email: ${error.message}`);
  }
};

// Update profile image
const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    let imageUrl;

    // Check if user exists
    const userExist = await findUserById(userId);
    if (!userExist) {
      return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
    }

    // Handle file upload
    if (req.file) {
      imageUrl = req.file.path; // Cloudinary URL from multer-storage-cloudinary
    } 
    // Handle URL update
    else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    } else {
      return errorResponse(req, res, 400, 'Please provide either a file or imageUrl');
    }

    // Delete old image if exists
    if (userExist.image) {
      const publicId = userExist.image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    // Update user's image
    const updatedUser = await userProfileDao.updateProfileImage(userId, imageUrl);
    return successResponse(req, res, updatedUser, 200, 'Profile image updated successfully');

  } catch (error) {
    return errorResponse(req, res, 500, `Error updating profile image: ${error.message}`);
  }
};

// Update profile avatar by URL
const updateProfileAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageUrl } = req.body;

    // Validate input
    if (!imageUrl) {
      return errorResponse(req, res, 400, 'Image URL is required');
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch (error) {
      return errorResponse(req, res, 400, 'Invalid URL format');
    }

    // Check if user exists
    const userExist = await findUserById(userId);
    if (!userExist) {
      return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
    }

    // Delete old image if exists (only if it's a Cloudinary URL)
    if (userExist.image && userExist.image.includes('cloudinary.com')) {
      try {
        const publicId = userExist.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.log('Cloudinary deletion failed:', cloudinaryError.message);
        // Continue with update even if deletion fails
      }
    }

    // Update user's image with new avatar URL
    const updatedUser = await userProfileDao.updateProfileImage(userId, imageUrl);
    return successResponse(req, res, updatedUser, 200, 'Profile avatar updated successfully');

  } catch (error) {
    return errorResponse(req, res, 500, `Error updating profile avatar: ${error.message}`);
  }
};

// Get profile avatar/image link
const getProfileAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user exists
    const userExist = await findUserById(userId);
    if (!userExist) {
      return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
    }

    // Return the image/avatar link
    return successResponse(req, res, { 
      imageUrl: userExist.image || null,
      hasAvatar: !!userExist.image 
    }, 200, 'Profile avatar retrieved successfully');

  } catch (error) {
    return errorResponse(req, res, 500, `Error retrieving profile avatar: ${error.message}`);
  }
};

// Update profile picture using AWS S3
const updateProfilePictureS3 = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    // Check if user exists
    const userExist = await findUserById(userId);
    if (!userExist) {
      return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
    }

    // Import S3 utilities
    const { 
      uploadToS3, 
      deleteFromS3, 
      extractS3KeyFromUrl, 
      generateProfilePictureFileName 
    } = require('../../utils/s3Utils');

    // Generate unique filename
    const fileName = generateProfilePictureFileName(userId, file.originalname);

    // Upload to S3
    const uploadResult = await uploadToS3(
      file.buffer,
      fileName,
      file.mimetype,
      {
        'original-name': file.originalname,
        'uploaded-by': userId,
        'upload-date': new Date().toISOString()
      }
    );
    
    // Delete old profile picture from S3 if it exists
    if (userExist.image) {
      const oldKey = extractS3KeyFromUrl(userExist.image);
      if (oldKey) {
        try {
          await deleteFromS3(oldKey);
        } catch (deleteError) {
          console.log('Failed to delete old profile picture:', deleteError.message);
          // Continue with update even if deletion fails
        }
      }
    }

    // Update user's image URL in database
    const updatedUser = await userProfileDao.updateProfileImage(userId, uploadResult.Location);
    
    return successResponse(req, res, {
      user: updatedUser,
      imageUrl: uploadResult.Location
    }, 200, 'Profile picture updated successfully');

  } catch (error) {
    console.error('Profile picture upload error:', error);
    return errorResponse(req, res, 500, `Error uploading profile picture: ${error.message}`);
  }
};

const getUserDetailById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return errorResponse(req, res, 400, 'userId is required');
    }

    const user = await getUserById(userId);

    if (!user) {
      return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
    }

    const payload = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_photo: user.image || null,
      social_handles: user.social_handles || null,
      bio: user.bio || null
    };

    return successResponse(req, res, payload, 200, 'User details fetched successfully');
  } catch (error) {
    return errorResponse(req, res, 500, `Error fetching user details: ${error.message}`);
  }
};

module.exports = {
  getAllUsers,
  getUserProfile,
  updateUserProfile,
  emailUpdate,
  verifyEmail,
  updateProfileImage,
  updateProfileAvatar,
  getProfileAvatar,
  updateProfilePictureS3,
  getUserDetailById
};
