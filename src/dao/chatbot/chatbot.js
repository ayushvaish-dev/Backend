const prisma = require('../../config/prismaClient')


async function getAllQuestions() {
    let allrecords = prisma.chatbot_sections.findMany({
        include : {
            questions : true
        },
    });
    console.log(allrecords);
    
    return allrecords;
}

async function findQuestionById(questionid){
    let answer = prisma.chatbot_questions.findUnique({
        where : {
            id : questionid,
        },
    });
    
    return answer ? answer : "sorry i have no response";
}

module.exports = {findQuestionById, getAllQuestions};