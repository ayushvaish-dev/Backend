const prisma = require('../../config/prismaClient')
const messages = require('../../utils/messages');


const userExist = async (userId) => {
    try{
      return await prisma.users.findUnique({
        where: {id: userId}
      })
    }
    catch(err){
      throw new Error(messages.USER_NOT_FOUND)
    }
}

const createCourse = async (data) => {
  try{
    const {userId, ...courseData} = data;
    const userExists = await prisma.users.findUnique({ where: { id: userId } });
    if (!userExists) throw new Error('User not found');
    
    const result = await prisma.$transaction(async (prisma) => {
      
      const course = await prisma.courses.create({
        data: {
          ...courseData,
          created_at: new Date(),
          updated_at: new Date(),
          createdBy: userId,
          updatedBy: userId
        }
      })


      await prisma.course_instructors.create({
        data: {
          user_id: userId,
          course_id: course.id,
          isPrimary: true
        }
      })
      return course
    });

    return result;
    
  }
  catch(error){
    console.error('Error creating course or instructor relationship:', error);
    throw new Error('Failed to create course due to an internal error');
  }
}


const editCourse = async (courseId, data) => {
  try{
    const courseExist = await prisma.courses.findUnique({
      where: {id: courseId}
    });
    if(!courseExist) throw new Error(messages.ERROR_EDITING_COURSE);

    const updatedData = {
      ...data,
      updated_at: new Date(),
      updatedBy: data.updatedBy
    };

    const result = await prisma.courses.update({
      where: {id: courseId},
      data: updatedData
    });

    return result;
  }
  catch(error) {
    console.error('Error editing course:', error);
    throw new Error(messages.ERROR_EDITING_COURSE);
  }
}


const grantUserCourseAccess = async (accessData) => {
  const { course_id, learnerIds, isTrial, subscription_start, subscription_end } = accessData;

  if (typeof isTrial !== "boolean") {
    throw new Error("isTrial must be explicitly set (true or false)");
  }

  const learnersArray = Array.isArray(learnerIds) ? learnerIds : [learnerIds];

  const data = learnersArray.map((learnerId) => ({
    user_id: learnerId,
    course_id,
    isTrial,
    subscription_start: subscription_start || new Date(),
    subscription_end: subscription_end || null,
    status: "ACTIVE",
  }));

  return prisma.user_course_access.createMany({
    data,
    skipDuplicates: true,
  });
};



// const addInstructorsToCourse = async (courseId, instructorIds) => {
//   try {
//     const course = await prisma.courses.findUnique({ where: { id: courseId } });
//     if (!course) throw new Error('Course not found.');

//     const instructorArray = Array.isArray(instructorIds) ? instructorIds : [instructorIds];

//     // Filter only valid users
//     const validUsers = await prisma.users.findMany({
//       where: { id: { in: instructorArray } },
//       select: { id: true },
//     });

//     const validUserIds = validUsers.map(u => u.id);
//     if (validUserIds.length === 0) throw new Error('No valid users found.');

//     // Existing admins and learners in course
//     const [existingAdmins, existingLearners] = await Promise.all([
//       prisma.course_instructors.findMany({
//         where: { course_id: courseId },
//         select: { user_id: true },
//       }),
//       prisma.user_course_access.findMany({
//         where: { course_id: courseId, status: 'ACTIVE' },
//         select: { user_id: true },
//       }),
//     ]);

//     const ineligibleIds = new Set([
//       ...existingAdmins.map(a => a.user_id),
//       ...existingLearners.map(l => l.user_id),
//     ]);

//     const eligibleIds = validUserIds.filter(id => !ineligibleIds.has(id));
//     if (eligibleIds.length === 0) return { count: 0 };

//     const dataToInsert = eligibleIds.map(id => ({
//       user_id: id,
//       course_id: courseId,
//       isPrimary: false,
//     }));

//     const insertResult = await prisma.course_instructors.createMany({
//       data: dataToInsert,
//       skipDuplicates: true,
//     });

//     return insertResult;
//   } catch (err) {
//     console.error('DAO Error - addInstructorsToCourse:', err);
//     throw new Error(messages.ERROR_ON_ADDING_INSTRUCTOR);
//   }
// };



const addAdminToCourse = async (courseId, adminIds) => {
  try {
    const courseExists = await prisma.courses.findUnique({ where: { id: courseId } });
    if (!courseExists) throw new Error(messages.ERROR_ON_ADDING_ADMIN);

    const adminArr = Array.isArray(adminIds) ? adminIds : [adminIds];

    const existingInstructors = await prisma.course_instructors.findMany({
      where: { course_id: courseId },
      select: { user_id: true },
    });
    const existingLearners = await prisma.user_course_access.findMany({
      where: { course_id: courseId, status: 'ACTIVE' },
      select: { user_id: true },
    });

    const instructorIds = new Set(existingInstructors.map(i => i.user_id));
    const learnerIds = new Set(existingLearners.map(l => l.user_id));
    const ineligibleIds = new Set([...instructorIds, ...learnerIds]);

    const eligibleAdminIds = adminArr.filter(id => !ineligibleIds.has(id));

    if (eligibleAdminIds.length === 0) {
      throw new Error('All provided users are already instructors or learners');
    }

    const data = eligibleAdminIds.map((id) => ({
      user_id: id,
      course_id: courseId,
    }));

    const result = await prisma.course_admins.createMany({
      data,
      skipDuplicates: true,
    });

    return result;
  } catch (error) {
    console.error('Error adding admin:', error);
    throw new Error(messages.ERROR_ON_ADDING_ADMIN);
  }
};



const getUserCourses = async (userId) => {
    try{
      const userCourses = await prisma.courses.findMany({
        where: {
          user_course_access: {
            some: {
              user_id: userId,
            }
          },
          course_status : 'PUBLISHED',
        },
           include: {
      _count: {
        select: { modules: true } 
      },
      user_course_access: {
        where: { user_id: userId }, // optional: filter by the current user
        select: {
          isTrial: true,
          subscription_start: true,
          subscription_end: true,
          status: true,
        }
      }
    }
      });
    
      // console.log(`User courses - ${userCourses}`)
      return userCourses;
    }
    catch(err){
      console.log(`Error fetching courses : ${err.message}`);
      throw new Error(messages.ERROR_FETCHING_COURSES)
    }
};


const getAllCourses = async (filters) => {
  try {
    const whereClause = {};
    
    if (filters.isHidden !== undefined) {
      whereClause.isHidden = filters.isHidden === 'true';
    }
    if (filters.course_status) {
      whereClause.course_status = filters.course_status;
    }
    if (filters.course_level) {
      whereClause.course_level = filters.course_level;
    }
    if (filters.courseType) {
      whereClause.courseType = filters.courseType;
    }

    const courses = await prisma.courses.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc',
      },
       include: {
      _count: {
        select: { modules: true } 
      }
    }
    });

    return courses;
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw new Error('Failed to fetch courses');
  }
};


const getCourseById = async (id) => {
  return await prisma.courses.findUnique({
    where: { id },
  });
};

const createModule = async (data) => {
    return await prisma.modules.create({
      data,
    });
  };
  

const fetchAllUsersByCourseId = async(courseId) =>{
  let fetchedusers = await prisma.user_course_access.findMany({
    where : {
      course_id : courseId
    },
    include : {
      user : {
        select : {
          first_name: true,
          last_name: true,
          email: true,
          image: true,
          user_roles : {
            select : {
              role : true
            }
          }
        },
      }
    }
  })

  return fetchedusers.map((userdata)=>{
     return {user_id : userdata.user_id, user : userdata.user}
  })
}


const deleteCourse = async(courseId)=>{
  return await prisma.courses.delete({
    where : {
      id : courseId,
    }
  })
}

const unenrollUser = async(courseId, userId)=>{
  return await prisma.user_course_access.delete({
    where : {
      user_id_course_id: {
        user_id : userId,
        course_id : courseId
       }
    }
  })
}


const getValidInstructors = async (userIds) => {
  const users = await prisma.users.findMany({
    where: { id: { in: userIds } },
    include: { user_roles: true },
  });
  return users;
}

const getExistingInstructors = async (courseId, userIds) => {
  return await prisma.course_instructors.findMany({
    where: { course_id: courseId, user_id: { in: userIds } },
  });
}

const getExistingAdmins = async (courseId, userIds) => {
  return await prisma.course_admins.findMany({
    where: { course_id: courseId, user_id: { in: userIds } },
  });
}

const getPrimaryInstructor = async (courseId) => {
  return await prisma.course_instructors.findFirst({
    where: { course_id: courseId, isPrimary: true },
  });
}

const addInstructorsToCourse = async (courseId, userIds) => {
  return await prisma.$transaction(
    userIds.map((userId) =>
      prisma.course_instructors.create({
        data: {
          course_id: courseId,
          user_id: userId,
        },
      })
    )
  );
};


const getValidAdmins = async (userIds) => {
  const users = await prisma.users.findMany({
    where: { id: { in: userIds } },
    include: { user_roles: true },
  });
  return users;
};


const addAdminsToCourse = async (courseId, userIds) => {
  return await prisma.$transaction(
    userIds.map((userId) =>
      prisma.course_admins.create({
        data: {
          course_id: courseId,
          user_id: userId,
        },
      })
    )
  );
};



module.exports = {
  createCourse,
  editCourse,
  grantUserCourseAccess,
  addInstructorsToCourse,
  addAdminToCourse,
  userExist,
  getAllCourses,
  getUserCourses,
  getCourseById,
  createModule,
  fetchAllUsersByCourseId
  ,deleteCourse
  ,unenrollUser,
  fetchAllUsersByCourseId,
  deleteCourse,
  getValidInstructors,
  getExistingInstructors,
  getExistingAdmins,
  getPrimaryInstructor,
  getValidAdmins,
  addAdminsToCourse
};
