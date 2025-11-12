const prisma = require('../../config/prismaClient');


const findUserData = async(userId)=>{
    try{
    return await prisma.users.findUnique({
      where: {id : userId},
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        gender: true,
        last_login: true,
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
        }
      }
    });
  }
  catch(err){
    throw new Error(`Error finding user by ID : ${err.message}`)
  }
}

const getAllCompletedCourses = async(userId)=>{
    try{
      return await prisma.user_course_progress.findMany({
        where : {
            user_id : userId,
            completed : true,
        },
        include : {
          course : {
            select : {
              title : true,
              // description : true,
            }
          }
        }
      })
    }
    catch(err){
      throw new Error(`Error getting all completed courses of a user  : ${err.message}`);
    }
}

const getUserAllCourses = async(userId)=>{
    try{
      return await prisma.user_course_access.findMany({
        where : {
            user_id : userId,
            status : "ACTIVE",
        },
        include : {
          course : {
            select : {
              title : true,
              // description : true,
            }
          }
        }
      })
    }
    catch(err){
      throw new Error(`Error getting all enrolled courses of a user  : ${err.message}`);
    }
}

const getCompletedModules = async(userId)=>{
    try{
      return await prisma.user_module_progress.findMany({
        where : {
            user_id : userId,
            completed : true, 
        },
        include : {
          module : {
            select : {
              title : true,
              // description : true,
            }
          }
        }
      })
    }
    catch(err){
      throw new Error(`Error getting all completed modules of a user  : ${err.message}`);
    }
}

const getcompletedQuizzes = async(userId)=>{
    try{
        // Fetch distinct completed quizzes for the user
        const completedQuizzes = await prisma.user_quiz_attempts.findMany({
          where: {
            user_id: userId,
            status: "COMPLETED",
          },
          distinct: ["quiz_id"], // ensures only one row per quiz
          include: {
            quiz: {
              select: {
                id: true,
                title: true,
                type: true,
                max_score: true,
                min_score: true,
                module_id: true,
              },
            },
          },
        });

        // Count of completed quizzes
        const totalCompletedQuizzes = completedQuizzes.length;

        return {totalCompletedQuizzes, completedQuizzes};
    }
    catch(err){
      throw new Error(`Error getting all completed quiz of a user  : ${err.message}`);
    }
}





const getTopAndLeastCourses = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch courses with counts
  const courses = await prisma.courses.findMany({
    where: { course_status: 'PUBLISHED' },
    include: {
      _count: { select: { user_course_access: true } }, // total enrolled users
      user_course_access: {
        where: { granted_on: { gt: thirtyDaysAgo } }, // last 30 days
        select: { user_id: true },
      },
    },
  });

  // Map and add computed field
  const mappedCourses = courses.map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    course_level: course.course_level,
    thumbnail: course.thumbnail,
    total_enrolled_users: course._count.user_course_access,
    enrolled_last_30_days: course.user_course_access.length,
  }));

  // Sort descending by enrolled_last_30_days
  const sortedDesc = [...mappedCourses].sort(
    (a, b) => b.enrolled_last_30_days - a.enrolled_last_30_days
  );

  // Sort ascending by enrolled_last_30_days
  const sortedAsc = [...mappedCourses].sort(
    (a, b) => a.enrolled_last_30_days - b.enrolled_last_30_days
  );

  // Slice top 3 and least 3
  const top3Courses = sortedDesc.slice(0, 3);
  const least3Courses = sortedAsc.slice(0, 3);
  const allCourseAnalytics = sortedDesc; // still keeping all courses sorted by recent activity

  return { top3Courses, least3Courses, allCourseAnalytics };
};

const getCourseCount = async()=>{
  return await prisma.courses.count();
} 

const getTotalEnrollments = async()=>{
  return await prisma.user_course_access.count();
}


const fetchEventAttendance = async(eventid)=>{
  try {
    return await prisma.attendance.findMany({
      where : {
        event_id : eventid
      }, 
      include : {
        user : {
          select : {
            first_name : true,
            last_name : true,
            email : true
          }
        }
      }
    })
  } catch (error) {
    console.error("Error in fetching attendance from database", error);
    throw error;
  }
}


const addPrivateNote = async(private_note, userid)=>{
  try{
    return await prisma.users.update({
      where : {
        id : userid
      },
      data : {
        private_note : private_note
      }
    })
  }
  catch(err){
    throw err;
  }
}

const getPrivateNoteByUserId = async (userId) => {
  try {
    return await prisma.users.findUnique({
      where: { id: userId },
      select: { private_note: true }
    });
  } catch (err) {
    throw err;
  }
}


module.exports = {
    findUserData, getAllCompletedCourses, getUserAllCourses, getCompletedModules , getcompletedQuizzes, getTopAndLeastCourses, getCourseCount, getTotalEnrollments, fetchEventAttendance, addPrivateNote, getPrivateNoteByUserId,
}