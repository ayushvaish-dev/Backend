// src/dao/Learner/LearnerDao.js
const prisma = require('../../config/prismaClient');

async function updateUserPassword(userId, hashedPassword) {
    try {
        return await prisma.users.update({
            where: { 
                id: userId 
            },
            data: { 
                password: hashedPassword,
                updated_at: new Date()
            },
            select: {
                id: true,
                updated_at: true
            }
        });
    } catch (error) {
        console.error('Error updating user password:', error);
        throw new Error(`Failed to update password: ${error.message}`);
    }
}

async function getUserById(userId) {
    try {
        return await prisma.users.findUnique({
            where: { 
                id: userId 
            },
            select: {
                id: true,
                email: true,
                password: true,
                first_name: true,
                last_name: true,
                auth_provider: true,
                image: true,
                bio: true,
                social_handles: true,
                user_roles: {  
                    select: {
                        role: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        throw new Error(`Failed to fetch user: ${error.message}`);
    }
}



const convertUsersOrInstructorsToAdmin = async (userIds) => {
  try {
    const users = await prisma.user_roles.findMany({
      where: { user_id: { in: userIds } },
      select: {
        user_id: true,
        role: true,
        user: { select: { email: true } } 
      }
    });
    const alreadyAdmins = [];
    const toBeUpdated = [];
    users.forEach(user => {
      if (user.role === 'admin') {
        alreadyAdmins.push(user.user.email);
      } else {
        toBeUpdated.push(user.user_id);
      }
    });
    let updateCount = 0;
    if (toBeUpdated.length > 0) {
      const updated = await prisma.user_roles.updateMany({
        where: { user_id: { in: toBeUpdated } },
        data: { role: 'admin' }
      });
      updateCount = updated.count;
    }
    const messages = users.map(user => {
      if (user.role === 'admin') {
        return `${user.user.email} is already an admin.`;
      } else {
        return `${user.user.email} converted to admin.`;
      }
    });
    return { count: updateCount, messages, allAlreadyAdmins: toBeUpdated.length === 0 };
  } catch (error) {
    console.error("DAO Error in converting to admin:", error);
    throw error;
  }
};


const markEventAttendance = async(userId , eventid)=>{
  try{
    return await prisma.attendance.create({
      data : {
        event_id : eventid,
        user_id : userId,
        isPresent : true
      }
    })
  }
  catch(err){
    console.error("error in saving attendance in database ", err);
    throw err;
  }
}


const fetchAttendance = async(userId, eventid )=>{
    try{
      return await prisma.attendance.findFirst({
        where : {
          event_id : eventid,
          user_id : userId
        }
      })
    }
    catch(err){
      console.error("error in fetching attendance", err);
      throw err;
    }
}



module.exports = { 
    updateUserPassword,
    getUserById,
    convertUsersOrInstructorsToAdmin,
    markEventAttendance,
    fetchAttendance,

};
