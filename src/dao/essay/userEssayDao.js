const prisma = require("../../config/prismaClient");

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


const fetchEssayTopic = async(essayid)=>{
    return await prisma.essays.findUnique({
        where : {
            id : essayid,
        },
        select : {
            essay_topic : true,
        }
    })
}

const storeEssaySubmission = async(essayid, text , userid, time_spent, word_count)=>{
    let endDate = await prisma.essays.findUnique({
      where : {
        id : essayid,
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



    let submittedessay = await prisma.essay_submissions.create({
            data : {
                essay_id : essayid,
                student_id: userid,
                text : text,
                time_spent: time_spent,
                word_count : word_count,
                ontime : Ontime,
            }
        })
        return submittedessay;
}


module.exports = { fetchAllEssay, fetchEssay, fetchEssayTopic, storeEssaySubmission };