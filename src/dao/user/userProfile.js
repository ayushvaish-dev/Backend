const prisma = require("../../config/prismaClient");

// Get user profile
const getUserProfile = async (userId) => {
  try {
    return await prisma.users.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        gender: true,
        location: true,
        dob: true,
        bio: true,
        image: true,
        created_at: true,
        updated_at: true,
        user_roles: {
          select: {
            role: true
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Error fetching user profile: ${error.message}`);
  }
};

// Get all users
const getAllUsers = async () => {
  try {
    return await prisma.users.findMany({
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        gender: true,
        location: true,
        dob: true,
        bio: true,
        image: true,
        timezone: true,
        created_at: true,
        updated_at: true,
        user_roles: {
          select: {
            role: true
          }
        },
        activity_log: {
          where: { action: 'USER_LOGIN' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true }
        }
      }
    });
  } catch (error) {
    throw new Error(`Error fetching all users: ${error.message}`);
  }
};

//user profile update
const userProfileUpdate = async (userId, updateData) => {
  try {
    return await prisma.users.update({
      where: {
        id: userId
      },
      data: {
        ...updateData,
        updated_at: new Date()
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
        gender: true,
        location: true,
        dob: true,
        bio: true,
        timezone: true,
        updated_at: true,
        social_handles : true,
      }
    });
  } catch (error) {
    throw new Error(`Error on updating profile: ${error.message}`);
  }
};

//user email update
const updateUserEmail = async (userId, newEmail) => {
  try {
    return await prisma.users.update({
      where: {
        id: userId
      },
      data: {
        email: newEmail,
        updated_at: new Date()
      },
      select: {
        id: true,
        email: true,
        updated_at: true
      }
    });
  } catch (error) {
    throw new Error(`Error on updating email: ${error.message}`);
  }
};

//user profile picture update
const updateProfileImage = async (userId, imageUrl) => {
  try {
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { image: imageUrl },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        image: true
      }
    });

    return updatedUser;
  } catch(error) {
    console.error('Update profile image error:', error);
    throw new Error(`Error on updating profile image: ${error.message}`);
  }
};

module.exports = {
  getAllUsers,
  getUserProfile,
  userProfileUpdate,
  updateUserEmail,
  updateProfileImage
};
