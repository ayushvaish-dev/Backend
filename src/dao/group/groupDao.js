const prisma = require('../../config/prismaClient');
exports.createGroup = (data) => prisma.groups.create({ data });
exports.getGroups = () => prisma.groups.findMany({
  where: {
    group_type: { in: ['UNIVERSAL', 'COURSE'] }
  },
  include: { members: true }
});
exports.getGroupById = async (id) => {
  return await prisma.groups.findUnique({
    where: { id: id },  
    include: {
      members: true,
      post: true,        
      messages: true
    },
  });
}
exports.addMember = (data) => prisma.group_member.create({ data });


exports.createCourseGroup = (data) => prisma.groups.create({ 
  data: {
    ...data,
    group_type: 'COURSE'
  }
});

exports.getCourseGroups = (courseId) => prisma.groups.findMany({
  where: { 
    course_id: courseId,
    group_type: 'COURSE'
  },
  include: { 
    members: true,
    course: {
      select: {
        id: true,
        title: true,
        thumbnail: true
      }
    }
  }
});

exports.getGroupsByType = (type) => prisma.groups.findMany({
  where: { group_type: type },
  include: { 
    members: true,
    course: type === 'COURSE' ? {
      select: {
        id: true,
        title: true,
        thumbnail: true
      }
    } : false
  }
});

exports.getUserCourseGroups = (userId, courseId) => prisma.groups.findMany({
  where: { 
    course_id: courseId,
    group_type: 'COURSE',
    members: {
      some: {
        user_id: userId
      }
    }
  },
  include: { 
    members: true,
    course: {
      select: {
        id: true,
        title: true,
        thumbnail: true
      }
    }
  }
});


exports.getGroupMembers = (groupId) => prisma.group_member.findMany({
  where: { group_id: groupId },
  include: {
    user: {
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        image: true,
        created_at: true
      }
    }
  },
  orderBy: { joined_at: 'asc' }
});


exports.createGroupMessage = (data) => prisma.group_message.create({ data });
exports.getGroupMessages = (groupId, skip, take) => prisma.group_message.findMany({
  where: { group_id: groupId },
  include: {
    sender: {
      select: {
        id: true,
        first_name: true,
        last_name: true,
        image: true
      }
    }
  },
  orderBy: { timeStamp: 'desc' },
  skip,
  take
});
exports.countGroupMessages = (groupId) => prisma.group_message.count({
  where: { group_id: groupId }
});
exports.deleteGroupMessage = (messageId) => prisma.group_message.delete({
  where: { id: messageId }
});

// POSTS
exports.createPost = (data) =>
  prisma.group_post.create({
    data: {
      group_id: data.group_id,
      user_id: data.user_id,
      type: data.type || "POST",
      title: data.title || null,
      content: data.content,
      media_url: data.media_url || null,
      is_pinned: data.is_pinned || false,
    },
  });

exports.getPosts = (groupId) =>
  prisma.group_post.findMany({
    where: {
      group_id: groupId,
    },
    include: {
      comments: true,
      likes: true,
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

// COMMENTS & LIKES
exports.addComment = (data) => {
  return prisma.comment.create({
    data: {
      post_id: data.postId,
      user_id: data.userId,
      content: data.content,
    },
  });
};
exports.addLike = (data) => {
  return prisma.like.create({
    data,
  });
};
exports.deleteGroup = (groupId) => prisma.groups.delete({
  where: { id: groupId }
});

// Get all admins of a group
exports.getGroupAdmins = async (groupId) => {
  return await prisma.group_member.findMany({
    where: {
      group_id: groupId,
      role: "ADMIN"
    },
    include: {
      user: true 
    }
  });
};


exports.updateGroup = (groupId, data) => prisma.groups.update({
  where: { id: groupId },
  data
});


exports.updatePost = (postId, data) => prisma.group_post.update({
  where: { id: postId },
  data
});

// DELETE POST
exports.deletePost = (postId) => prisma.group_post.delete({
  where: { id: postId }
});

// UPDATE COMMENT
exports.updateComment = (commentId, data) => prisma.comment.update({
  where: { id: commentId },
  data
});

// DELETE COMMENT
exports.deleteComment = (commentId) => prisma.comment.delete({
  where: { id: commentId }
});

// REMOVE LIKE
exports.removeLike = (postId, userId) => prisma.like.delete({
  where: {
    post_id_user_id: {
      post_id: postId,
      user_id: userId
    }
  }
});

// REMOVE MEMBER
exports.removeMember = (groupId, userId) => prisma.group_member.delete({
  where: {
    user_id_group_id: {
      user_id: userId,
      group_id: groupId
    }
  }
});

// LEAVE GROUP (same as removeMember but different context)
exports.leaveGroup = (groupId, userId) => prisma.group_member.delete({
  where: {
    user_id_group_id: {
      user_id: userId,
      group_id: groupId
    }
  }
});

// CHECK IF USER IS MEMBER
exports.isUserMember = async (groupId, userId) => {
  const member = await prisma.group_member.findFirst({
    where: {
      group_id: groupId,
      user_id: userId
    }
  });
  return !!member;
};

// CHECK IF USER IS ADMIN
exports.isUserAdmin = async (groupId, userId) => {
  const member = await prisma.group_member.findFirst({
    where: {
      group_id: groupId,
      user_id: userId,
      role: 'ADMIN'
    }
  });
  return !!member;
};

// ANNOUNCEMENTS
exports.createAnnouncement = (data) => prisma.group_post.create({
  data: {
    group_id: data.group_id,
    user_id: data.user_id,
    type: "ANNOUNCEMENT",
    title: data.title,
    content: data.content,
    media_url: data.media_url || null,
    is_pinned: data.is_pinned || false,
  },
});

exports.getAnnouncements = (groupId) => prisma.group_post.findMany({
  where: {
    group_id: groupId,
    type: "ANNOUNCEMENT"
  },
  include: {
    user: {
      select: {
        id: true,
        first_name: true,
        last_name: true,
        image: true
      }
    }
  },
  orderBy: {
    createdAt: "desc"
  }
});

exports.getAnnouncementById = (announcementId) => prisma.group_post.findUnique({
  where: { id: announcementId },
  include: {
    user: {
      select: {
        id: true,
        first_name: true,
        last_name: true,
        image: true
      }
    },
    group: {
      select: {
        id: true,
        name: true
      }
    }
  }
});

exports.updateAnnouncement = (announcementId, data) => prisma.group_post.update({
  where: { id: announcementId },
  data,
  include: {
    user: {
      select: {
        id: true,
        first_name: true,
        last_name: true,
        image: true
      }
    },
    group: {
      select: {
        id: true,
        name: true
      }
    }
  }
});

exports.deleteAnnouncement = (announcementId) => prisma.group_post.delete({
  where: { id: announcementId }
});
// ✅ Create Poll
exports.createPoll = async (data) => {
  const {
    group_id,
    sender_id,
    poll_question,      // <- get question from frontend
    poll_expires_at,
    poll_allow_multiple,
    poll_is_anonymous,
    options
  } = data;

  return prisma.group_message.create({
    data: {
      group_id,
      sender_id,
      type: "POLL",
      content: poll_question,   
      poll_question,               
      poll_expires_at,
      poll_allow_multiple,
      poll_is_anonymous,
      poll_options: {
        create: options.map((opt) => ({ option_text: opt }))
      }
    },
    include: { poll_options: true }
  });
};
// creditor_backend/src/dao/group/groupDao.js
exports.votePoll = async ({ message_id, option_id, user_id }) => {
  return prisma.$transaction(async (tx) => {
    const poll = await tx.group_message.findUnique({
      where: { id: message_id },
      select: { poll_allow_multiple: true, poll_expires_at: true }
    });
    if (!poll) throw Object.assign(new Error("Poll not found"), { status: 404 });
    if (poll.poll_expires_at && new Date(poll.poll_expires_at) < new Date()) {
      throw Object.assign(new Error("Poll has expired"), { status: 400 });
    }

    const opt = await tx.poll_options.findFirst({ where: { id: option_id, message_id } });
    if (!opt) throw Object.assign(new Error("Option does not belong to this poll"), { status: 400 });

    if (!poll.poll_allow_multiple) {
      // SINGLE-CHOICE: tap same option = unvote; different option = switch
      const existing = await tx.poll_votes.findFirst({ where: { message_id, user_id } });
      if (existing) {
        if (existing.option_id === option_id) {
          await tx.poll_votes.delete({ where: { id: existing.id } }); // unvote
        } else {
          await tx.poll_votes.delete({ where: { id: existing.id } }); // switch
          await tx.poll_votes.create({ data: { message_id, option_id, user_id } });
        }
      } else {
        await tx.poll_votes.create({ data: { message_id, option_id, user_id } });
      }
    } else {
      // MULTI-SELECT: toggle only this option (do not touch other selections)
      const existing = await tx.poll_votes.findUnique({
        where: { message_id_user_id_option_id: { message_id, user_id, option_id } }
      });
      if (existing) {
        await tx.poll_votes.delete({ where: { id: existing.id } }); // unvote this option
      } else {
        await tx.poll_votes.create({ data: { message_id, option_id, user_id } }); // add this option
      }
    }

    return tx.group_message.findUnique({
      where: { id: message_id },
      include: { poll_options: { include: { votes: true } }, poll_votes: true }
    });
  });
};

// ✅ Get Poll with results
exports.getPollById = async (message_id) => {
  if (!message_id) throw new Error("message_id is required"); // add safety check
  return prisma.group_message.findUnique({
    where: { id: message_id },
    include: {
      poll_options: { include: { votes: true } },
      poll_votes: true
    }
  });
};
// ✅ Pin/Unpin Poll
exports.pinPoll = async (message_id, user_id) => {
  return prisma.$transaction(async (tx) => {
    // Check if poll exists and user is admin
    const poll = await tx.group_message.findUnique({
      where: { id: message_id },
      select: { 
        id: true, 
        group_id: true, 
        type: true,
        is_pinned: true 
      }
    });
    
    if (!poll) throw Object.assign(new Error("Poll not found"), { status: 404 });
    if (poll.type !== "POLL") throw Object.assign(new Error("This is not a poll"), { status: 400 });
    
    // Check if user is admin of the group
    const isAdmin = await tx.group_member.findFirst({
      where: { 
        group_id: poll.group_id, 
        user_id: user_id, 
        role: 'ADMIN' 
      }
    });
    
    if (!isAdmin) throw Object.assign(new Error("Only group admins can pin polls"), { status: 403 });
    
    // Update pin status
    const updated = await tx.group_message.update({
      where: { id: message_id },
      data: { is_pinned: !poll.is_pinned },
      include: { 
        poll_options: { include: { votes: true } }, 
        poll_votes: true,
        sender: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            image: true
          }
        }
      }
    });
    
    return updated;
  });
};
exports.getPinnedPolls = async (group_id) => {
  return prisma.group_message.findMany({
    where: { group_id, type: "POLL", is_pinned: true },
    include: {
      poll_options: { include: { votes: true } },
      poll_votes: true,
      sender: { select: { id: true, first_name: true, last_name: true, image: true } }
    },
    orderBy: { timeStamp: "desc" }
  });
};