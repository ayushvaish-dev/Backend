const bcrypt = require("bcryptjs");
const prisma = require("../../config/prismaClient");



const checkEmailOrPhone = async (email, phone) => {
  const user = await prisma.users.findFirst({
    where: {
      OR: [{ email }, { phone }],
    },
  });
  return user;
};



const createUser = async ({
  first_name,
  last_name,
  email,
  password,
  phone = null,
  gender = null,
  auth_provider = "local",
  provider_id = null,
  image = "",
  dob = new Date(),
  role = 'user', // Default role
}) => {
  try {
    // Validate auth_provider and hash password for local auth
    const validAuthProviders = ["local", "google"];
    if (!validAuthProviders.includes(auth_provider)) {
      throw new Error("Invalid auth_provider");
    }

    // Create user and assign default 'user' role in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.users.create({
        data: {
          first_name,
          last_name,
          email,
          password,
          phone:phone || '',
          gender,
          auth_provider,
          provider_id,
          image,
          dob
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone:true,
          auth_provider: true,
          provider_id: true,
          created_at: true,
          updated_at: true
        }
      });

      // Assign default 'user' role
      await tx.user_roles.create({
        data: {
          user_id: newUser.id,
          role:role||'user',
        }
      });

      return newUser;
    });

    return user;
  } catch (err) {
    if (err.code === "P2002") {
      throw new Error("Email or provider_id already exists");
    }
    console.error(`Error creating user: ${err.message}`);
    throw new Error(`Error creating user: ${err.message}`);
  }
};

const findUserById = async (id) => {
  try{
    return await prisma.users.findUnique({
      where: {id},
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        gender: true,
        created_at: true,
        updated_at: true,
        image: true,
        dob: true,
        bio: true,
        location: true,
        timezone: true,
        social_handles : true,
        user_roles: {
          select: {role: true}
        },
        activity_log: {
          where: {
            userId : id,
            action: 'USER_LOGIN' 
            },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true }
        }
      }
    });
  }
  catch(err){
    throw new Error(`Error finding user by ID : ${err.message}`)
  }
}


const findByEmail = async (email) => {
  try {
    // Validate email
    if (!email) {
      throw new Error('Email is required');
    }

    // Query user by email
    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        password: true,
        phone: true,
        gender: true,
        auth_provider: true,
        provider_id: true,
        created_at: true,
        updated_at: true,
      },
    });


    return user;
  } catch (error) {
    console.error(`Error finding user by email: ${error.message}`);
    throw new Error(`Error finding user by email: ${error.message}`);
  }
};

const findUserRoles = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const roles = await prisma.user_roles.findMany({
      where: { user_id: userId },
      select: { role: true },
    });

    return roles.length ? roles : [];
  } catch (err) {
    console.error(`Error finding user roles: ${err.message}`);
    throw new Error(`Error finding user roles: ${err.message}`);
  }
};

const updateUserProfileFunc = async (updates, userId) => {
  try {
    if (!Object.keys(updates).length) {
      throw new Error("No fields provided for update.");
    }
   
    return await prisma.users.update({
      where: {id: userId},
      data: {
        ...updates,
        updated_at: new Date(),
      },
      select: {id: true, first_name: true, last_name: true, phone: true, gender: true, updated_at: true},
    });
  } catch (error) {
    throw new Error(`Error on updating proflie : ${error.message}`);
  }
};


const updatePassword = async (email, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    return await prisma.users.update({
      where: {email},
      data: {password: hashedPassword}
    })
  } catch (error) {
    throw new Error(`Error updating password: ${error.message}`);
  }
};

const updateUserEmail = async (userId, email) => {
  try {
    return await prisma.users.update({
      where: {userId},
      data: {email}
    })
  } catch (error) {
    throw new Error(`Error on updating user email : ${error.messagee}`);
  }
};


// const checkEmailOrPhone = async (email, phone) => {
//   try {
//    return await prisma.users.findFirst({
//     where: {
//       OR: [{email}, {phone}],
//     },
//    });
//   } catch (error) {
//     throw new Error(`Error finding user by email or phone: ${error.message}`);
//   }
// };

const getUserDetailFunc = async (userId) => {
  try {
    return await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        image: true,
        dob: true,
        created_at: true,
      }
    });
  } catch (error) {
    console.error("Error fetching user data:", error.message);
    throw new Error("Database query failed");
  }
};


module.exports = {
  createUser,
  findByEmail,
  findUserById,
  updatePassword,
  checkEmailOrPhone,
  updateUserProfileFunc,
  updateUserEmail,
  getUserDetailFunc,
  findUserRoles,
};
