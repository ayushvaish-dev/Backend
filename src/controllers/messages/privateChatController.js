const { getAllConversationMessages , getallConversation, StoreMediaMessage, fetchMessage, deleteMessageFromDB, fetchLastMessage, getAllImagesInConversation, deleteConversationFromDB} = require('../../dao/messages/privateChatDao.js');
const { errorResponse, successResponse } = require('../../utils/apiResponse.js');
const messages = require('../../utils/messages.js');
const { uploadToS3 } = require("../../utils/privateChatImageAws.js");
const {deleteFromS3, extractS3KeyFromUrl} = require("../../utils/s3Utils.js");


const getSocketInstance = (req) => {
  return req.app.get('io');
};

const getAllConversations = async(req, res)=>{ 
   try{
    let userid = req.user.id;

    if (!userid || typeof userid !== 'string') {
      return errorResponse(req, res, 400, messages.VALID_USER_ID_REQUIRED);
    }

    let allConversationIds = await getallConversation(userid);
    return successResponse(req, res, allConversationIds, 200,  messages.USER_MESSAGE_CONVERSATION_SENT);

   }catch(err){
    console.log("Error in fetching user's conversations", err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
   }
}


const getConversationMessages = async(req, res)=>{  
    try{
      let conversationid = req.body.conversationid;

      if(!conversationid){
        return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
      }

      let messages = await getAllConversationMessages(conversationid);
      return successResponse(req, res, messages, 200, messages.MESSAGES_FETCHED_SUCCESSFULLY)
    }catch(err){
      console.log("Error in fetching this conversation messages", err);
      return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
    }
} 


const sendImageController = async(req, res)=>{
    try{
       const userId = req.user.id;
       const file =  req.file;
       const { conversation_id, roomId } = req.body;

       if(!file){
        return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
       }

       if(!conversation_id){
        return errorResponse(req, res, 500, "Conversation id is not defined");
      }

      if(!roomId){
        return errorResponse(req, res, 500, "room id is not defined");
      }

       const randomString = Math.random().toString(36).substring(2);
        let fileName = `${Date.now()}-${randomString}-${file.originalname}`;

        const uploadedImage = await uploadToS3(
                file.buffer,
                fileName,
                file.mimetype,
                {
                    'original-name': file.originalname,
                    'uploaded-by': userId,
                    'upload-date': new Date().toISOString()
                }     
            );
           
            let ImageUrl = uploadedImage.Location;
            let type = 'IMAGE'

            let messageStored =  await StoreMediaMessage(ImageUrl, conversation_id, userId, type);

          const io = getSocketInstance(req);
          if(io){
            let from = messageStored.sender.id;
            let message = messageStored.content;
            let messageid =  messageStored.id;
            let conversationid = messageStored.conversation_id;
            let image = messageStored.sender.image;
            let type = messageStored.type;
            io.to(roomId).emit('receiveMessage', { from, message , image, messageid, type, conversationid});
            console.log("message image emited to room");

            const participants = await prisma.conversation_participants.findMany({
                where: { conversation_id: conversation_id },
                include : {
                  user: {
                    select: { id: true, first_name: true, last_name: true, image: true }
                  }
                }
            });

            participants.forEach( p => {
              const otherUser = participants.find(u => u.user_id !== p.user_id);
              
               const personalizedPayload = {
                  id: conversation_id,
                  room: roomId,
                  // show OTHER user’s name & image
                  title: `${otherUser.user.first_name} ${otherUser.user.last_name}`,
                  image: otherUser.user.image,
                  lastMessage: messageStored.content,
                  lastMessageType : messageStored.type,
                  isRead : messageStored.isRead,
                  lastMessageFrom: `${messageStored.sender.id}`,
                  lastMessageAt: messageStored.createdAt
                };

              io.to(`user_${p.user_id}`).emit("conversationUpdated", personalizedPayload);
            });
            
          }

        return successResponse(req, res, messageStored, 200, messages.MESSAGE_SENT_SUCCESSFULLY )
    }
    catch(err){
        console.log("error in uploading image to AWS and storing in database");
        return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
    }
}

const deleteMessage = async(req, res)=>{
    try{
      const userId = req.user.id;
      const {messageid, conversation_id, roomId}  = req.body;
    
      if(!messageid){
        return errorResponse(req, res, 500, "message id is not defined");
      }

      if(!conversation_id){
        return errorResponse(req, res, 500, "Conversation id is not defined");
      }

      if(!roomId){
        return errorResponse(req, res, 500, "room id is not defined");
      }

      let message = await fetchMessage(messageid);

      if(!message){
        return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
      }

      if(userId != message.sender_id){
        return errorResponse(req, res, 500, "Only the sender can delete his message")
      }

      if(message.type == 'IMAGE'){
        //delete image from aws 
        let url =  message.content;
        let key = await extractS3KeyFromUrl(url);
        try{
            if(key){
              await deleteFromS3(key);
            }
        }catch(err){
          console.log("Error in deleting Image", err);
        }
         
      }

      let deletedMsg = await deleteMessageFromDB(messageid);

      const io = getSocketInstance(req);
      if(io){
        let messageid = deletedMsg.id;
        io.to(roomId).emit("deleteMessage", {messageid, conversation_id  } )


        const LastMessage = await fetchLastMessage(conversation_id);

        const participants = await prisma.conversation_participants.findMany({
                where: { conversation_id: conversation_id },
                include : {
                  user: {
                    select: { id: true, first_name: true, last_name: true, image: true }
                  }
                }
            });

            participants.forEach( p => {
              const otherUser = participants.find(u => u.user_id !== p.user_id);
              
               const personalizedPayload = {
                  id: conversation_id,
                  room: roomId,
                  // show OTHER user’s name & image
                  title: `${otherUser.user.first_name} ${otherUser.user.last_name}`,
                  image: otherUser.user.image,
                  lastMessage: LastMessage[0].content,
                  lastMessageType : LastMessage[0].type,
                  isRead : LastMessage[0].isRead,
                  lastMessageFrom: `${LastMessage[0].sender.id}`,
                  lastMessageAt: LastMessage[0].createdAt
                };

              io.to(`user_${p.user_id}`).emit("conversationUpdated", personalizedPayload);
            });

      }

      return successResponse(req, res, deletedMsg, 200, messages.MESSAGE_DELETED_SUCCESSFULLY );
    }
    catch(err){
      console.log("Error in deleting message", err);
      return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);      
    }
}

const deleteConversation = async(req, res)=>{
  try{
    const { conversation_id } = req.body;
    
    if(!conversation_id){
      return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
    }

    let allConversationImages = await getAllImagesInConversation(conversation_id);

    for(const img of allConversationImages){
        let url = img.content;

        let key = extractS3KeyFromUrl(url); 

        if(key){
            let deletedimage = await deleteFromS3(key);
            console.log("deletedimage: ", deletedimage);
        } 
    }

    const participants = await prisma.conversation_participants.findMany({
            where: { conversation_id: conversation_id },
        });


    const deletedConversation = await deleteConversationFromDB(conversation_id);

    let io = getSocketInstance(req);
    if(io){
        participants.forEach( p => {
              io.to(`user_${p.user_id}`).emit("conversationdeleted", conversation_id);
        });
    }       
    return successResponse(req, res, deletedConversation , 200, messages.CONVERSATION_DELETED);

  }catch(err){
    console.log("Error in deleting conversation ", err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
}

module.exports = {getAllConversations ,
                    getConversationMessages,   
                    sendImageController,
                    deleteMessage,
                    deleteConversation,
                };