const prisma = require("../../config/prismaClient");


async function getallConversation(userid) {

const conversations = await prisma.conversations.findMany({
  where: {
    participants: {
      some: { user_id: userid }
    }
  },
  include: {
    participants: {
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, image : true  }
        }
      }
    },
    cov_messages: {
      orderBy: { createdAt: "desc" },
      take: 1,
      include: {
        sender: { select: { id: true, first_name: true, last_name: true } }
      }
    }
  }
});


const AllConversationData = conversations.map(conv => {
  // In private chat → pick the "other user"
  const otherUser = conv.participants.find(p => p.user_id !== userid);

  return {
    id: conv.id,
    room : conv.roomid,
    title: otherUser ? `${otherUser.user.first_name} ${otherUser.user.last_name}` : "Unknown",
    image : otherUser.user.image,
    lastMessage: conv.cov_messages[0]?.content || null,
    lastMessageType : conv.cov_messages[0]?.type || null,
    isRead : conv.cov_messages[0] ? conv.cov_messages[0].isRead : null,
    lastMessageFrom: conv.cov_messages[0] ? `${conv.cov_messages[0].sender.id}` : null,
    lastMessageAt: conv.cov_messages[0]?.createdAt || null
  };
});

// Sort by lastMessageAt (latest first)
AllConversationData.sort((a, b) => {
  return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
});

return AllConversationData;
}





async function getAllConversationMessages(conversationid){
  return await prisma.conversations.findUnique({
  where: {
    id : conversationid,
  },
  include: {
    cov_messages : {
      orderBy: { createdAt: "asc" },
          include: {
              sender: { select: { id: true, first_name: true, last_name: true, image : true } }
          }
    },
  },
})
}


async function StoreMediaMessage(ImageUrl, conversation_id, userId, type) {
    return await prisma.chat_message.create({
      data : {
        sender_id : userId,
        content : ImageUrl,
        type : type,
        conversation_id : conversation_id,
      },
      include: {
        sender: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            image: true
          }
        }
      }
    })
}



const fetchMessage = async(messageid)=>{
    return await prisma.chat_message.findUnique({
      where : {
        id : messageid
      }
    })
}


const deleteMessageFromDB = async(messageid)=>{
  return await prisma.chat_message.delete({
      where : {
        id : messageid,
      }
  })
}

const fetchLastMessage = async(conversation_id)=>{
  return await prisma.chat_message.findMany({
    where : {
      conversation_id : conversation_id
    },
    orderBy : {
      createdAt : "desc"
    },
    take : 1,
    include : {
      sender: { select: { id: true, first_name: true, last_name: true } }
    }
  })
}


const getAllImagesInConversation = async(conversation_id)=>{
      return await prisma.chat_message.findMany({
        where : {
          conversation_id : conversation_id,
          type : 'IMAGE'
        },
        select : {
          content : true,
          type : true,
        }
      })
}


const deleteConversationFromDB = async(conversation_id) => {
    return await prisma.conversations.delete({
      where : {
        id : conversation_id,
      }
    })
}

module.exports = {getallConversation , 
                  getAllConversationMessages, 
                  StoreMediaMessage,
                  fetchMessage,
                  deleteMessageFromDB,
                  fetchLastMessage,
                  getAllImagesInConversation,
                  deleteConversationFromDB,
                };