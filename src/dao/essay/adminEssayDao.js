const prisma = require('../../config/prismaClient')

const insertEssayData = async(Essaydata)=>{
    return await prisma.essays.create({
        data: Essaydata,
    })
}

const fetchAllEssay = async(moduleid)=>{
    return await prisma.essays.findMany({
        where : {
            module_id : moduleid,
        }
    })
}

const fetchEssay = async(essayid)=>{
    return await prisma.essays.findUnique({
        where : {
            id : essayid,
        }
    })
}

const updateEssayData = async(essayid, title, description, essay_topic , time_limit, word_limit, max_points,  difficulty, instructions, userid)=>{
    return await prisma.essays.update({
        where : {
            id : essayid
        },
        data : {
            title : title,
            description : description,
            essay_topic : essay_topic,
            time_limit : time_limit,
            word_limit : word_limit,
            max_points :  max_points,
            difficulty : difficulty,
            instructions: instructions,
            updated_by : userid,
        }
    })
}

const fetchOverViewDetails = async(essayid)=>{
    return await prisma.essays.findUnique({
        where : {
            id : essayid,
        }
  })

}


const fetchScores = async(essayid)=>{
let studentScores = await prisma.essay_submissions.findMany({
        where : {
            essay_id : essayid
        },
        select : {
            id : true,
            score : true,
            grading_status: true,
            time_spent: true,
            word_count : true,
            submitted_at: true,
            student :{
                select :{
                    first_name: true,
                    last_name : true,
                    email : true,
                    image : true
                }
            }
        },
    })

 let totalsubmissions = await prisma.essay_submissions.count({
    where : {
        essay_id : essayid
    }
 })


 let gradedSubmissions = await prisma.essay_submissions.count({
    where : {
        AND : [
            {essay_id : essayid},
            {grading_status : 'GRADED'},
        ]
    }
 })

 let pendingForGradingSubmissions = totalsubmissions - gradedSubmissions;

 let scoreSectionData = {studentScores , totalsubmissions, gradedSubmissions , pendingForGradingSubmissions};
 return scoreSectionData;
}


const fetchSubmissions = async(essayid, courseid)=>{

const StudentSubmissionStatus = await prisma.user_course_access.findMany({
  where: {
    course_id: courseid,
  },
  include: {
    user: { 
      select: {
        first_name: true,
        last_name: true,
        email: true,
        image: true,
        essay_submission: {
                where: {
                    essay_id: essayid 
                },
                select: {
                    submitted_at: true,
                    score: true,
                    time_spent: true,
                    word_count: true,
          }
        }
      }
    }
  }
});

const allStudentSubmissionStatus = StudentSubmissionStatus.map((res) => {
  const hasSubmitted = res.user.essay_submission.length > 0;

  return {
    first_name: res.user.first_name,
    last_name: res.user.last_name,
    email: res.user.email,
    image: res.user.image,
    submissionStatus: hasSubmitted ? "COMPLETED" : "NOT ATTEMPTED",
    essay_submission: hasSubmitted ? res.user.essay_submission[0] : null
  };
}); 



 let totalStudentsEnrolled = await prisma.user_course_access.count({
            where : {
                course_id : courseid,
            }
 }) 

 let StatusComplete = await prisma.essay_submissions.count({
    where : {
        essay_id : essayid,
    }
 })

    let StatusNotAttempted = totalStudentsEnrolled- StatusComplete;
 let submissionStatistics = {totalStudentsEnrolled, StatusComplete, StatusNotAttempted }
 
 let submissionData = { allStudentSubmissionStatus, submissionStatistics};
 return submissionData;
}


const fetchSubmittedEssay = async(Submissionid)=>{
    return await prisma.essay_submissions.findUnique({
        where : {
            id : Submissionid
        },
        select : {
             text : true,
             submitted_at: true,
             time_spent: true,
             word_count : true,
             student : {
                select : {
                    first_name: true,
                    last_name : true,
                    email : true,
                    image : true,
                }
            }
        },
    })
}

const StoreGrades = async(submissionid, score, feedback)=>{
    return await prisma.essay_submissions.update({
        where: {
            id : submissionid,
        },
        data: {
            score: score,
            feedback: feedback,
            grading_status : 'GRADED'
        },
    })
}


const fetchAnalytics = async(essayid, courseid)=>{
    let averageScores = await prisma.essay_submissions.aggregate({
        _avg : {
            score : true,
        },
        where : {
            essay_id : essayid
        }
    })

    let highestScores = await prisma.essay_submissions.aggregate({
        _max : {
            score : true,
        },
        where : {
            essay_id : essayid
        }
    })

    let lowestScores = await prisma.essay_submissions.aggregate({
        _min : {
            score : true,
        },
        where : {
            essay_id : essayid
        }
    })

     let totalStudents = await prisma.user_course_access.count({
            where : {
                course_id : courseid,
            }
     })

     let totalsubmissions = await prisma.essay_submissions.count({
        where : {
            essay_id : essayid
        }
     })

    let completionRate = (totalsubmissions / totalStudents)*100;


    let avgWordCounts = await prisma.essay_submissions.aggregate({
        _avg : {
            word_count : true,
        },
        where : {
            essay_id : essayid
        }
    })

    let averageTimeSpents = await prisma.essay_submissions.aggregate({
        _avg : {
            time_spent : true,
        },
        where : {
            essay_id : essayid
        }
    })

    let highestScore = highestScores._max.score;
    let lowestScore = lowestScores._min.score;
    let averageScore = averageScores._avg.score;
    let avgWordCount = avgWordCounts._avg.word_count;
    let averageTimeSpent = averageTimeSpents._avg.time_spent;

  let AnalyticsData = {averageScore , highestScore,  lowestScore, totalStudents, totalsubmissions,  completionRate,  avgWordCount, averageTimeSpent}
  return AnalyticsData;
}

module.exports = {insertEssayData ,fetchAllEssay, fetchEssay,updateEssayData, fetchOverViewDetails, fetchScores, fetchSubmissions , fetchSubmittedEssay, StoreGrades, fetchAnalytics};
