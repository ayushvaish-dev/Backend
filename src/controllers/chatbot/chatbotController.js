const {findQuestionById, getAllQuestions} = require('../../dao/chatbot/chatbot.js');
const { sendMail, sendMailToMultiUsers} = require("../../utils/mail.js");
const { successResponse, errorResponse } = require("../../utils/apiResponse.js");

let displayquestions = async(req, res)=>{
    
    try{
        let allrecords =  getAllQuestions();
        allrecords.then((AllQuestions)=>{
        //   console.log(AllQuestions[0].questions);
        // res.json({allQuestions : AllQuestions[0].questions}); 
        successResponse(req, res, AllQuestions[0].questions, 200); 
        })
      } catch(err){
         console.log("this is chatbotsection error: ", err);
        //  res.status(500).json({message : "Internal server error"});
        errorResponse(req, res, 500, "Internal server error" );
      }        
}


let getAnswer = async(req , res )=>{

     let  questionid = req.body.id;

    if(!questionid) {
        // return res.status(400).json({ message : "Question id is required"});
        return errorResponse(req, res, 400, "Question id is required" );
    }

  try{
    let ans = await findQuestionById(questionid);
    console.log(ans.response);
    // successResponse(req, res, )
    // res.status(200).json({answer : ans.response});
    successResponse(req, res, ans.response, 200, "answer sent sucessfully" );
  } catch(err){
    console.log("chatbot error :",  err);
    // res.status(500).json({message : "Internal server error"});
    errorResponse(req, res, 500, "Internal server error" );
  }
}


let sendDetails = (req, res)=>{
   let {name , email, query} = req.body;

    try{
        sendMail(email, `NAME-${name}, SUBJECT- User Query from Chatbot`, `QUERY- ${query}`);
        // res.json({message : "your query sent successfully through email"});
        successResponse(req, res,"",200, "your query sent sucessfully through email" );

    } catch(err){
        console.log("Contactus error", err);
        // res.status(500).json({message : "Internal server error"});
        errorResponse(req, res, 500, "Internal server error" );
    }   
   
}



let contactAll = (req , res)=>{
  let {emails} = req.body;
   console.log(emails);
   
  sendMailToMultiUsers(emails,`NAME- zubair, SUBJECT- User Query from Chatbot`, `QUERY- `  )
  successResponse(req, res,"",200, "your emails sent sucessfully through email" );
}

module.exports = {displayquestions, getAnswer, sendDetails, contactAll};




