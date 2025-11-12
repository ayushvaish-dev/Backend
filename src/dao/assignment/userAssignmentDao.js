const prisma = require('../../config/prismaClient')

const getAllAssignment = async(moduleid)=>{
  return await prisma.modules.findUnique({
    where: {
    id : moduleid,
  },
  select : {
    assignment : true,
  },
  })
}

const getAssignment = async (assignmentid)=>{
  return await prisma.assignments.findUnique({
    where : {
      id : assignmentid,
    }
  })
}

const getAssignmentQuestions = async(assignmentid)=>{
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

const saveAssignmentSubmission = async (assignmentid, userid, url ,additional_notes) => {

    let endDate = await prisma.assignments.findUnique({
      where : {
        id : assignmentid,
      },
      select : {
        end_date : true,
      }
    })

    let { end_date } = endDate;

    const currentDate = new Date();

    let Ontime = false;
    if(currentDate < end_date ){
      Ontime = true;
    }
    
    let savedassignment = await prisma.assignment_submission.create({
      data : {
        assignment_id : assignmentid,
        url : url,
        additional_notes: additional_notes ,
        student_id: userid,
        ontime : Ontime,
      },
    });

    return savedassignment;
  };


module.exports = {saveAssignmentSubmission, getAssignment, getAllAssignment, getAssignmentQuestions};