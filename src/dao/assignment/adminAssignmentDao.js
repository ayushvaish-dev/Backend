const prisma = require('../../config/prismaClient')

const createassignment = async (value)=>{
    let {title, description, max_score , time_limit, difficulty, instructions, created_by, updated_by, end_date, module_id , questions } = value;    

    let createdAssignment= await prisma.assignments.create({
           data : {
            title : title , 
            description : description, 
            max_score : max_score , 
            time_limit: time_limit, 
            difficulty: difficulty, 
            instructions: instructions, 
            created_by: created_by, 
            updated_by : updated_by, 
            end_date : end_date, 
            module_id : module_id 
           }
        })
        
        

    let questionsdata = questions.map((item)=> {
       return {...item , assignment_id : createdAssignment.id }
    })

    
    let createdQuestion = await prisma.assignment_questions.createMany({
        data : questionsdata,
    })
      
   return {createdAssignment , createdQuestion};   
}


const  fetchAllAssignment = async(moduleid)=>{
        return await prisma.assignments.findMany({
            where : {
                module_id : moduleid,
            }
        })
}

const fetchAssignment = async(assignmentid)=>{
    let assignment = await prisma.assignments.findUnique({
        where : {
            id : assignmentid
        },
        select : {
            title : true,
            description : true,
            time_limit : true,
            max_score : true,
        }
    })
    
    let totalQuestions = await prisma.assignment_questions.count({
        where : {
            assignment_id : assignmentid,
        }
    })

    return { assignment, totalQuestions };
}

const fetchOverView = async(assignmentid)=>{
    return await prisma.assignments.findUnique({
        where : {
            id : assignmentid,
        },
    })
}

const updateAssignment = async(assignmentid , title , description,  time_limit, max_score, difficulty, instructions)=>{
    return await prisma.assignments.update({
        where : {
            id : assignmentid,
        },
        data: {
            title : title,
            description : description,
            time_limit : time_limit,
            max_score : max_score,
            difficulty : difficulty,
            instructions : instructions,
        },
    })
}

const  fetchAllQuestions = async(assignmentid)=>{
    return await prisma.assignment_questions.findMany({
        where : {
            assignment_id : assignmentid
        },
        select : {
            question_text : true,
            points : true
        }
    })
}

const  fetchQuestion = async(questionid)=>{
    return await prisma.assignment_questions.findUnique({
        where : {
            id : questionid,
        }
    })
}

const updateQuestion = async(questionid, question_text , points)=>{
    return await prisma.assignment_questions.update({
        where : {
            id : questionid,
        },
        data : {
            question_text : question_text,
            points : points,
        }
    })    
}

const storeAssignmentQuestion = async(assignmentid, question_text , points)=>{
    return await prisma.assignment_questions.create({
        data : {
            question_text : question_text,
            points : points,
            assignment_id : assignmentid
        }
    })
}

const fetchAssignmentScores = async(assignmentid)=>{
    let submittedAssignmentScore = await prisma.assignment_submission.findMany({
        where : {
            assignment_id : assignmentid,
        },
        select : {
            id : true,
            score : true,
            grading_status: true,
            submitted_at : true,
            student : {
                select : {
                    first_name : true,
                    last_name : true,
                    email : true,
                    image : true,
                },
            }
        },
    })

    let totalsubmissions = await prisma.assignment_submission.count({
        where : {
            assignment_id : assignmentid,
        },
    })

    let gradedSubmissions = await prisma.assignment_submission.count({
        where : {
            AND : [
                { assignment_id : assignmentid },
                {grading_status : 'GRADED'},
            ]
        }
    })
    
    let penndingSubmissions = totalsubmissions - gradedSubmissions;

    let AssignmentScoreData = {submittedAssignmentScore , totalsubmissions, gradedSubmissions ,penndingSubmissions}
return AssignmentScoreData;
}

const  fetchSubmittedAssignment = async(assignmentSubmissionid)=>{
    return await prisma.assignment_submission.findUnique({
        where : {
            id : assignmentSubmissionid,
        },
        select : {
            url : true,
            additional_notes : true,
            submitted_at : true,
            student : {
                select : {
                    first_name : true,
                    last_name : true,
                    email : true,
                    image : true,
                }
            }
        },
    })
}

const storeAssignmentGrades = async(assignmentSubmissionid, score , feedback)=>{
    return await prisma.assignment_submission.update({
        where : {
            id : assignmentSubmissionid
        },
        data : {
            score : score,
            feedback: feedback,
            grading_status : 'GRADED',
        }
    })
}

const fetchAssignmentSubmissionStatus = async(assignmentid, courseid)=>{
    let allSubmissions = await prisma.user_course_access.findMany({
        where : {
            course_id : courseid,
        },
        include : {
            user : {
                select : {
                    first_name : true,
                    last_name : true,
                    email : true,
                    image : true,
                    assignment_submission : {
                        where : {
                            assignment_id : assignmentid,
                        },
                        select : {
                            submitted_at : true,
                            score : true,
                        }
                    }
                }
            }
        }
    })

const allStudentSubmissionStatus = allSubmissions.map((res) => {
  const hasSubmitted = res.user.assignment_submission.length > 0;

  return {
    first_name: res.user.first_name,
    last_name: res.user.last_name,
    email: res.user.email,
    image: res.user.image,
    submissionStatus: hasSubmitted ? "COMPLETED" : "NOT ATTEMPTED",
    assignment_submission: hasSubmitted ? res.user.assignment_submission[0] : null
  };
});

    let totalEnrolled = await prisma.user_course_access.count({
        where : {
            course_id : courseid,
        }
    })

    let totalCompleted = await prisma.assignment_submission.count({
        where : {
            assignment_id : assignmentid,
        },
    })    

    let NotAttempted = totalEnrolled- totalCompleted;

    let AssignmentSubmissionData = { allStudentSubmissionStatus, totalEnrolled, totalCompleted, NotAttempted };

return AssignmentSubmissionData;
}

const fetchAnalytics = async(assignmentid, courseid)=>{
    let highestScores = await prisma.assignment_submission.aggregate({
        _max : {
            score : true
        },
        where : {
            assignment_id : assignmentid
        }
    })

    let lowestScores = await prisma.assignment_submission.aggregate({
        _min : {
            score : true
        },
        where : {
            assignment_id : assignmentid
        }
    })

    let averageScores = await prisma.assignment_submission.aggregate({
        _avg : {
            score : true
        },
        where : {
            assignment_id : assignmentid
        }
    })

    let totalParticipants = await prisma.user_course_access.count({
            where : {
                course_id : courseid,
            }
     })


    let totalsubmissions = await prisma.assignment_submission.count({
        where : {
            assignment_id : assignmentid,
        },
    })

    let completionRate = (totalsubmissions / totalParticipants)*100;


    let highestScore = highestScores._max.score;
    let lowestScore = lowestScores._min.score;
    let averageScore = averageScores._avg.score;
    
    return {highestScore , lowestScore, averageScore, totalParticipants, totalsubmissions, completionRate};
}

module.exports = {createassignment, 
    fetchAllAssignment, 
    fetchAssignment, 
    fetchOverView,
    updateAssignment,
    fetchAllQuestions,
    fetchQuestion,
    updateQuestion,
    storeAssignmentQuestion,
    fetchAssignmentScores,
    fetchSubmittedAssignment,
    storeAssignmentGrades,
    fetchAssignmentSubmissionStatus,
    fetchAnalytics};