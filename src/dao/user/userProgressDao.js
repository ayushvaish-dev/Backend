const prisma = require('../../config/prismaClient');

const getAllCompletedCourse = async( userId ) => {
    return await prisma.user_course_progress.count({
        where : {
            user_id : userId,
            completed : true,
        }
    })
}

const getUserAllCourses = async( userId )=> {
    return await prisma.user_course_access.count({
        where : {
            user_id : userId,
            status : "ACTIVE",
        }
    })
}

const getCompletedModules = async( userId )=>{
    return await prisma.user_module_progress.count({
        where : {
            user_id : userId,
            completed : true, 
        }
    })
}


const getcompletedQuizzes = async(userId)=>{

let completedQuizzes = await prisma.user_quiz_attempts.groupBy({
                        by: ["quiz_id"],
                            where: {
                                user_id: userId,
                                status: "COMPLETED",
                            },
                            _count: {
                                quiz_id: true,
                            },
                    });

// Total completed quizzes for the user
const totalCompletedQuizzes = completedQuizzes.length;

// console.log(totalCompletedQuizzes);
return totalCompletedQuizzes;
}





module.exports = {
                   getAllCompletedCourse, 
                   getUserAllCourses,
                   getCompletedModules,
                   getcompletedQuizzes
                 };