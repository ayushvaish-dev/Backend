

const groupDao = require("../../dao/group/groupDao");
const prisma = require('../../config/prismaClient');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
const {
  s3,
   generateProfilePictureFileName
   ,uploadToS3

} = require("../../utils/s3Utils");


const getSocketInstance = (req) => {
  return req.app.get('io');
};


exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name) {
      return errorResponse(req, res, 400, messages.GROUP_NAME_REQUIRED);
    }

     let thumbnail = null;
    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const key = `group-thumbnails/${req.user.id}/${fileName}`;
      const Bucket = process.env.S3_PROFILE_BUCKET_NAME || process.env.S3_BUCKET_NAME;
      const params = { Bucket, Key: key, Body: req.file.buffer, ContentType: req.file.mimetype };
      const result = await s3.upload(params).promise();
      thumbnail = result.Location;
    } else if (req.body.thumbnail) {
      thumbnail = req.body.thumbnail;
    }


    const group = await prisma.groups.create({
      data: {
        name,
        description,
        created_by: req.user.id,
        group_type: 'UNIVERSAL' 
        ,thumbnail
      },
    });

   
    await prisma.group_member.create({
      data: {
        group_id: group.id,
        user_id: req.user.id,
        role: 'ADMIN'
      }
    });

    
    const io = getSocketInstance(req);
    if (io) {
      io.emit('groupCreated', {
        group: group,
        creator: {
          id: req.user.id,
          first_name: req.user.first_name,
          last_name: req.user.last_name
        }
      });
    }

    return successResponse(req, res, group, 201, messages.UNIVERSAL_GROUP_CREATED_SUCCESSFULLY);
  } catch (err) {
    console.error("CreateGroup Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_CREATE_GROUP);
  }
};


exports.createCourseGroup = async (req, res) => {
  try {
    const { name, description, course_id } = req.body;
    const userId = req.user.id;

    if (!name || !course_id) {
      return errorResponse(req, res, 400, messages.GROUP_NAME_AND_COURSE_ID_REQUIRED);
    }

   
    const course = await prisma.courses.findUnique({
      where: { id: course_id }
    });

    if (!course) {
      return errorResponse(req, res, 404, messages.COURSE_NOT_FOUND);
    }

    
    const courseAccess = await prisma.user_course_access.findFirst({
      where: { 
        user_id: userId, 
        course_id: course_id 
      }
    });

    const isInstructor = await prisma.course_instructors.findFirst({
      where: { 
        user_id: userId, 
        course_id: course_id 
      }
    });

    const isAdmin = await prisma.course_admins.findFirst({
      where: { 
        user_id: userId, 
        course_id: course_id 
      }
    });

    if (!courseAccess && !isInstructor && !isAdmin) {
      return errorResponse(req, res, 403, messages.NO_ACCESS_TO_COURSE);
    }

    // Check if group with same name already exists for this course
    const existingGroup = await prisma.groups.findFirst({
      where: {
        name: name,
        course_id: course_id,
        group_type: 'COURSE'
      }
    });

    if (existingGroup) {
      return errorResponse(req, res, 400, messages.GROUP_NAME_ALREADY_EXISTS);
    }

      let thumbnail = null;
    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const key = `group-thumbnails/${req.user.id}/${fileName}`;
      const Bucket = process.env.S3_PROFILE_BUCKET_NAME || process.env.S3_BUCKET_NAME;
      const params = { Bucket, Key: key, Body: req.file.buffer, ContentType: req.file.mimetype };
      const result = await s3.upload(params).promise();
      thumbnail = result.Location;
    } else if (req.body.thumbnail) {
      thumbnail = req.body.thumbnail;
    }

    
    const group = await groupDao.createCourseGroup({
      name,
      description,
      course_id,
      created_by: userId,
      thumbnail
    });

    
    await prisma.group_member.create({
      data: {
        group_id: group.id,
        user_id: userId,
        role: 'ADMIN'
      }
    });

    
    const groupWithDetails = await groupDao.getGroupById(group.id);

    // Emit socket event for course group creation
    const io = getSocketInstance(req);
    if (io) {
      io.emit('courseGroupCreated', {
        group: groupWithDetails,
        creator: {
          id: req.user.id,
          first_name: req.user.first_name,
          last_name: req.user.last_name
        }
      });
    }

    return successResponse(req, res, groupWithDetails, 201, messages.COURSE_GROUP_CREATED_SUCCESSFULLY);
  } catch (err) {
    console.error("CreateCourseGroup Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_CREATE_COURSE_GROUP);
  }
};

// GET ALL GROUPS
exports.getGroups = async (req, res) => {
  try {
    const groups = await groupDao.getGroups();
    return successResponse(req, res, groups, 200, messages.GROUPS_FETCHED_SUCCESSFULLY);
  } catch (err) {
    return errorResponse(req, res, 500, messages.FAILED_TO_FETCH_GROUPS);
  }
};

// GET COURSE GROUPS - NEW FUNCTIONALITY
exports.getCourseGroups = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Check if course exists
    const course = await prisma.courses.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return errorResponse(req, res, 404, messages.COURSE_NOT_FOUND);
    }

    // Check if user has access to the course
    const courseAccess = await prisma.user_course_access.findFirst({
      where: { 
        user_id: userId, 
        course_id: courseId 
      }
    });

    if (!courseAccess) {
      return errorResponse(req, res, 403, messages.NO_ACCESS_TO_COURSE);
    }

    // Get all course groups
    const groups = await groupDao.getCourseGroups(courseId);

    return successResponse(req, res, groups, 200, messages.COURSE_GROUPS_FETCHED_SUCCESSFULLY);
  } catch (err) {
    console.error("GetCourseGroups Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_FETCH_COURSE_GROUPS);
  }
};

// GET USER'S COURSE GROUPS - NEW FUNCTIONALITY
exports.getUserCourseGroups = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Check if course exists
    const course = await prisma.courses.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return errorResponse(req, res, 404, messages.COURSE_NOT_FOUND);
    }

    // Check if user has access to the course
    const courseAccess = await prisma.user_course_access.findFirst({
      where: { 
        user_id: userId, 
        course_id: courseId 
      }
    });

    if (!courseAccess) {
      return errorResponse(req, res, 403, messages.NO_ACCESS_TO_COURSE);
    }

    // Get groups where user is a member
    const groups = await groupDao.getUserCourseGroups(userId, courseId);

    return successResponse(req, res, groups, 200, messages.USER_COURSE_GROUPS_FETCHED_SUCCESSFULLY);
  } catch (err) {
    console.error("GetUserCourseGroups Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_FETCH_USER_COURSE_GROUPS);
  }
};


exports.getGroupsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.id;

    if (!['UNIVERSAL', 'COURSE'].includes(type)) {
      return errorResponse(req, res, 400, messages.INVALID_GROUP_TYPE);
    }

    let groups;
    if (type === 'COURSE') {
     
      const userCourses = await prisma.user_course_access.findMany({
        where: { user_id: userId },
        select: { course_id: true }
      });

      const courseIds = userCourses.map(uc => uc.course_id);
      
      groups = await prisma.groups.findMany({
        where: { 
          group_type: 'COURSE',
          course_id: { in: courseIds }
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
    } else {
      // Universal groups
      groups = await groupDao.getGroupsByType(type);
    }

    return successResponse(req, res, groups, 200, messages.GROUPS_BY_TYPE_FETCHED_SUCCESSFULLY);
  } catch (err) {
    console.error("GetGroupsByType Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_FETCH_GROUPS_BY_TYPE);
  }
};

// GET GROUP BY ID
exports.getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await groupDao.getGroupById(id);

    if (!group) {
      return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
    }

    return successResponse(req, res, group, 200, messages.GROUP_FETCHED_SUCCESSFULLY);
  } catch (err) {
    return errorResponse(req, res, 500, messages.FAILED_TO_FETCH_GROUPS);
  }
};

// GET GROUP MEMBERS
exports.getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Check if group exists
    const group = await prisma.groups.findUnique({ where: { id: groupId } });
    if (!group) {
      return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
    }

    // Get all members with user details
    const members = await groupDao.getGroupMembers(groupId);

    return successResponse(req, res, members, 200, messages.GROUP_MEMBERS_FETCHED_SUCCESSFULLY);
  } catch (err) {
    console.error("GetGroupMembers Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_FETCH_GROUP_MEMBERS);
  }
};

// SEND GROUP MESSAGE
// SEND GROUP MESSAGE
exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content, type } = req.body;
    const userId = req.user.id;

    // Allow either text or media (one of them must exist)
    if ((!content || !String(content).trim()) && !req.file) {
      return errorResponse(req, res, 400, messages.CONTENT_OR_MEDIA_REQUIRED);
    }

    // Check if user is member of the group
    const isMember = await prisma.group_member.findFirst({
      where: { group_id: groupId, user_id: userId }
    });

    if (!isMember) {
      return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);
    }

    let mimeType = null;
    let contentToSave = content && String(content).trim() ? String(content).trim() : null;

    // Derive message type
    let messageType = 'TEXT'; // default
    if (type && ['TEXT','IMAGE','VIDEO','AUDIO','FILE'].includes(type)) {
      messageType = type;
    }

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const key = `group-media/messages/${groupId}/${userId}/${fileName}`;

      const Bucket = process.env.S3_PROFILE_BUCKET_NAME || process.env.S3_BUCKET_NAME;
      const params = {
        Bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      const result = await s3.upload(params).promise();
      contentToSave = result.Location;
      mimeType = req.file.mimetype;

      // Auto-map mimetype to MessageType enum
      if (mimeType.startsWith('image/')) {
        messageType = 'IMAGE';
      } else if (mimeType.startsWith('video/')) {
        messageType = 'VIDEO';
      } else if (mimeType.startsWith('audio/')) {
        messageType = 'AUDIO';
      } else {
        messageType = 'FILE';
      }
    }

    const groupMessage = await prisma.group_message.create({
      data: {
        group_id: groupId,
        sender_id: userId,
        content: contentToSave,
        type: messageType,
        mime_type: mimeType,
        timeStamp: new Date()
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
    });

    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${groupId}`).emit('newGroupMessage', groupMessage);
    }

    return successResponse(req, res, groupMessage, 201, messages.MESSAGE_SENT_SUCCESSFULLY);
  } catch (err) {
    console.error("SendGroupMessage Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_SEND_MESSAGE);
  }
};
// GET GROUP MESSAGES
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    // Check if user is member of the group
    const isMember = await prisma.group_member.findFirst({
      where: { group_id: groupId, user_id: userId }
    });

    if (!isMember) {
      return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);
    }

    const skip = (page - 1) * limit;

    // Get messages with pagination
    const messages = await groupDao.getGroupMessages(groupId, skip, parseInt(limit));

    // Get total count for pagination
    const totalMessages = await groupDao.countGroupMessages(groupId);

    const response = {
      messages: messages.reverse(), // Show oldest first
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        hasNext: page * limit < totalMessages,
        hasPrev: page > 1
      }
    };

    return successResponse(req, res, response, 200, messages.MESSAGES_FETCHED_SUCCESSFULLY);
  } catch (err) {
    console.error("GetGroupMessages Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_FETCH_MESSAGES);
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if group exists
    const group = await prisma.groups.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
    }

    // Check if user is the group creator (admin)
    if (group.created_by !== userId) {
      return errorResponse(req, res, 403, messages.ONLY_GROUP_ADMIN_CAN_DELETE);
    }

    // Delete the group (cascade will handle related records)
    await groupDao.deleteGroup(groupId);

    // Emit socket event for group deletion
    const io = getSocketInstance(req);
    if (io) {
      io.emit('groupDeleted', {
        groupId: groupId,
        deletedBy: {
          id: userId,
          first_name: req.user.first_name,
          last_name: req.user.last_name
        }
      });
    }

    return successResponse(req, res, null, 200, messages.GROUP_DELETED_SUCCESSFULLY);
  } catch (err) {
    console.error("DeleteGroup Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_DELETE_GROUP);
  }
};

// DELETE GROUP MESSAGE
exports.deleteGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Find the message
    const message = await prisma.group_message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return errorResponse(req, res, 404, messages.MESSAGE_NOT_FOUND);
    }

    // Check if user is the message sender or group admin
    const isAdmin = await groupDao.isUserAdmin(message.group_id, userId);
    if (message.sender_id !== userId && !isAdmin) {
      return errorResponse(req, res, 403, messages.CAN_ONLY_DELETE_OWN_MESSAGES);
    }

    // Delete the message
    await groupDao.deleteGroupMessage(messageId);

    // Emit socket event for message deletion
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${message.group_id}`).emit('groupMessageDeleted', {
        messageId: messageId,
        groupId: message.group_id
      });
    }

    return successResponse(req, res, null, 200, messages.MESSAGE_DELETED_SUCCESSFULLY);
  } catch (err) {
    console.error("DeleteGroupMessage Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_DELETE_MESSAGE);
  }
};

exports.updateGroupMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return errorResponse(req, res, 400, messages.MESSAGE_CONTENT_REQUIRED);
    }

    const message = await prisma.group_message.findUnique({ where: { id: messageId } });
    if (!message) return errorResponse(req, res, 404, messages.MESSAGE_NOT_FOUND);
    if (message.group_id !== groupId) {
      return errorResponse(req, res, 400, messages.MESSAGE_DOES_NOT_BELONG_TO_GROUP);
    }

    const isAdmin = await groupDao.isUserAdmin(groupId, userId);
    if (message.sender_id !== userId && !isAdmin) {
      return errorResponse(req, res, 403, messages.CAN_ONLY_EDIT_OWN_MESSAGES);
    }

    const updated = await prisma.group_message.update({
      where: { id: messageId },
      data: { content: content.trim() }
    });

    // Emit socket event for message update
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${groupId}`).emit('groupMessageUpdated', {
        message: updated,
        groupId: groupId
      });
    }

    return successResponse(req, res, updated, 200, messages.MESSAGE_UPDATED_SUCCESSFULLY);
  } catch (err) {
    console.error("UpdateGroupMessage Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_UPDATE_MESSAGE);
  }
};
// ... existing code ...

// CREATE POST
exports.createPost = async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);
    console.log("REQ USER:", req.user);
    const { content, type, title, group_id, is_pinned } = req.body;

    let mediaUrl = null;
    if (req.file) {
      // Store under: post-media/<group>/<user>/<file>
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const key = `group-media/posts/${group_id}/${req.user.id}/${fileName}`;

      const Bucket = process.env.S3_PROFILE_BUCKET_NAME || process.env.S3_BUCKET_NAME;
      const params = {
        Bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      const result = await s3.upload(params).promise();
      mediaUrl = result.Location; // region-correct URL
    }

    const post = await prisma.group_post.create({
      data: {
        group_id: group_id,
        user_id: req.user.id,
        type: type || "POST",
        title: title === "null" ? null : title,
        content: content,
        media_url: mediaUrl,
        is_pinned: is_pinned === "true",
      },
    });

    // Get post with user details
    const postWithDetails = await prisma.group_post.findUnique({
      where: { id: post.id },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            image: true
          }
        },
        comments: true,
        likes: true
      }
    });

    // Emit socket event for new post
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${group_id}`).emit('groupPostCreated', postWithDetails);
    }

    return successResponse(req, res, post, 201, messages.POST_CREATED_SUCCESSFULLY);
  } catch (err) {
    console.error("CreatePost Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_CREATE_POST);
  }
};

// GET POSTS
exports.getPosts = async (req, res) => {
  try {
    const posts = await groupDao.getPosts(req.params.groupId);
    return successResponse(req, res, posts, 200, messages.POSTS_FETCHED_SUCCESSFULLY);
  } catch (err) {
    return errorResponse(req, res, 500, messages.FAILED_TO_CREATE_POST);
  }
};

// ADD COMMENT
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Get post to find group_id
    const post = await prisma.group_post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return errorResponse(req, res, 404, messages.POST_NOT_FOUND);
    }

    const comment = await groupDao.addComment({
      postId: postId,
      userId: userId,
      content: content,
    });

    // Get comment with user details
    const commentWithDetails = await prisma.comment.findUnique({
      where: { id: comment.id },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            image: true
          }
        }
      }
    });

    // Emit socket event for new comment
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${post.group_id}`).emit('commentAdded', {
        comment: commentWithDetails,
        postId: postId
      });
    }

    return successResponse(req, res, comment, 201, messages.COMMENT_ADDED_SUCCESSFULLY);
  } catch (err) {
    return errorResponse(req, res, 500, messages.FAILED_TO_CREATE_POST);
  }
};

// ADD LIKE
exports.addLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Get post to find group_id
    const post = await prisma.group_post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return errorResponse(req, res, 404, messages.POST_NOT_FOUND);
    }

    // Check if user already liked the post
    const existingLike = await prisma.like.findUnique({
      where: {
        post_id_user_id: {
          post_id: postId,
          user_id: userId
        }
      }
    });

    if (existingLike) {
      // Remove like
      await groupDao.removeLike(postId, userId);
      
      // Emit socket event for like removal
      const io = getSocketInstance(req);
      if (io) {
        io.to(`group_${post.group_id}`).emit('likeRemoved', {
          postId: postId,
          userId: userId
        });
      }

      return successResponse(req, res, null, 200, messages.LIKE_REMOVED_SUCCESSFULLY);
    } else {
      // Add like
      const like = await groupDao.addLike({
        post_id: postId,
        user_id: userId,
      });

      // Get like with user details
      const likeWithDetails = await prisma.like.findUnique({
        where: { id: like.id },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              image: true
            }
          }
        }
      });

      // Emit socket event for new like
      const io = getSocketInstance(req);
      if (io) {
        io.to(`group_${post.group_id}`).emit('likeAdded', {
          like: likeWithDetails,
          postId: postId
        });
      }

      return successResponse(req, res, like, 201, messages.LIKE_ADDED_SUCCESSFULLY);
    }
  } catch (err) {
    return errorResponse(req, res, 500, messages.FAILED_TO_CREATE_POST);
  }
};

// ADD MEMBER
exports.addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body; // optional
    const currentUserId = req.user.id;

    // Fetch group info
    const group = await prisma.groups.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ success: false, message: messages.GROUP_NOT_FOUND });
    }

    // Determine which user to add
    let memberToAdd;

    if (userId) {
      // Only admin can add other users
      if (group.created_by !== currentUserId) {
        return res.status(403).json({ success: false, message: messages.ONLY_ADMIN_CAN_ADD_USERS });
      }
      memberToAdd = userId;
    } else {
      // Regular user joining themselves
      memberToAdd = currentUserId;
    }

    // Check if already a member
    const existingMember = await prisma.group_member.findFirst({
      where: { group_id: groupId, user_id: memberToAdd },
    });

    if (existingMember) {
      return res.status(400).json({ success: false, message: messages.USER_ALREADY_IN_GROUP });
    }

    // Add member
    const newMember = await prisma.group_member.create({
      data: { group_id: groupId, user_id: memberToAdd, joined_at: new Date() },
    });

    // Get member with user details
    const memberWithDetails = await prisma.group_member.findUnique({
      where: { id: newMember.id },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            image: true
          }
        }
      }
    });

    // Emit socket event for new member
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${groupId}`).emit('memberAdded', memberWithDetails);
    }

    return res.status(200).json({ success: true, data: newMember });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: messages.FAILED_TO_ADD_MEMBER, error: error.message });
  }
};

exports.makeGroupAdmin = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const requesterId = req.user.id; // logged-in user

    // Check if requester is already an admin
    const requester = await prisma.group_member.findFirst({
      where: {
        group_id: groupId,
        user_id: requesterId,
        role: "ADMIN"
      }
    });

    if (!requester) {
      return res.status(403).json({
        success: false,
        errorMessage: messages.ONLY_ADMINS_CAN_PROMOTE
      });
    }

    // Update user role to ADMIN
    const updated = await prisma.group_member.updateMany({
      where: {
        group_id: groupId,
        user_id: userId
      },
      data: { role: "ADMIN" }
    });

    // Emit socket event for admin promotion
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${groupId}`).emit('memberPromotedToAdmin', {
        userId: userId,
        groupId: groupId,
        promotedBy: {
          id: requesterId,
          first_name: req.user.first_name,
          last_name: req.user.last_name
        }
      });
    }

    return res.json({
      success: true,
      message: messages.USER_PROMOTED_TO_ADMIN_SUCCESSFULLY,
      data: updated
    });
  } catch (err) {
    console.error("MakeAdmin Error:", err);
    res.status(500).json({
      success: false,
      errorMessage: messages.FAILED_TO_PROMOTE_USER
    });
  }
};

// Fetch admins of a group
exports.getGroupAdmins = async (req, res) => {
  try {
    const { groupId } = req.params;
    const admins = await groupDao.getGroupAdmins(groupId);

    return res.json({
      success: true,
      admins
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      errorMessage: error.message
    });
  }
};

// UPDATE GROUP
exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;

    // Check if group exists
    const group = await prisma.groups.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
    }

    // Check if user is admin
    const isAdmin = await groupDao.isUserAdmin(groupId, userId);
    if (!isAdmin) {
      return errorResponse(req, res, 403, messages.ONLY_GROUP_ADMINS_CAN_EDIT_GROUP);
    }

    let thumbnail = undefined; // undefined=no change, null=clear, string=set

    // 1) Prefer explicit body.thumbnail (works for JSON and multipart text fields)
    if (typeof req.body.thumbnail === 'string') {
      const v = req.body.thumbnail.trim();
      if (v === '') {
        thumbnail = null; // clear thumbnail
      } else {
        thumbnail = v;    // accept any non-empty string (URL, S3 link, etc.)
      }
    }

    // 2) If not provided above, fallback to file upload
    if (thumbnail === undefined && req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const key = `group-thumbnails/${req.user.id}/${fileName}`;
      const Bucket = process.env.S3_PROFILE_BUCKET_NAME || process.env.S3_BUCKET_NAME;
      const params = { Bucket, Key: key, Body: req.file.buffer, ContentType: req.file.mimetype };
      const result = await s3.upload(params).promise();
      thumbnail = result.Location;
    }

    const updateData = {
      name: name || group.name,
      description: description !== undefined ? description : group.description
    };
    if (thumbnail !== undefined) {
      updateData.thumbnail = thumbnail;
    }
    const updatedGroup = await groupDao.updateGroup(groupId, updateData);

    // Emit socket event for group update
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${groupId}`).emit('groupInfoUpdated', updatedGroup);
    }

    return successResponse(req, res, updatedGroup, 200, messages.GROUP_UPDATED_SUCCESSFULLY);
  } catch (err) {
    console.error("UpdateGroup Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_UPDATE_GROUP);
  }
};

// UPDATE POST
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, title, type } = req.body;
    const userId = req.user.id;

    // Check if post exists
    const post = await prisma.group_post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return errorResponse(req, res, 404, messages.POST_NOT_FOUND);
    }

    // Check if user is the post creator or group admin
    const isAdmin = await groupDao.isUserAdmin(post.group_id, userId);
    if (post.user_id !== userId && !isAdmin) {
      return errorResponse(req, res, 403, messages.CAN_ONLY_EDIT_OWN_POSTS);
    }

    // Update post
    const updatedPost = await groupDao.updatePost(postId, {
      content: content || post.content,
      title: title !== undefined ? title : post.title,
      type: type || post.type
    });

    // Emit socket event for post update
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${post.group_id}`).emit('groupPostUpdated', updatedPost);
    }

    return successResponse(req, res, updatedPost, 200, messages.POST_UPDATED_SUCCESSFULLY);
  } catch (err) {
    console.error("UpdatePost Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_UPDATE_POST);
  }
};

// DELETE POST
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Check if post exists
    const post = await prisma.group_post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return errorResponse(req, res, 404, messages.POST_NOT_FOUND);
    }

    // Check if user is the post creator or group admin
    const isAdmin = await groupDao.isUserAdmin(post.group_id, userId);
    if (post.user_id !== userId && !isAdmin) {
      return errorResponse(req, res, 403, messages.CAN_ONLY_EDIT_OWN_POSTS);
    }

    // Delete post (cascade will handle comments and likes)
    await groupDao.deletePost(postId);

    // Emit socket event for post deletion
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${post.group_id}`).emit('groupPostDeleted', {
        postId: postId,
        groupId: post.group_id
      });
    }

    return successResponse(req, res, null, 200, messages.POST_DELETED_SUCCESSFULLY);
  } catch (err) {
    console.error("DeletePost Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_DELETE_POST);
  }
};

// UPDATE COMMENT
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true }
    });

    if (!comment) {
      return errorResponse(req, res, 404, messages.POST_NOT_FOUND);
    }

    // Check if user is the comment creator or group admin
    const isAdmin = await groupDao.isUserAdmin(comment.post.group_id, userId);
    if (comment.user_id !== userId && !isAdmin) {
      return errorResponse(req, res, 403, messages.CAN_ONLY_EDIT_OWN_POSTS);
    }

    // Update comment
    const updatedComment = await groupDao.updateComment(commentId, {
      content: content || comment.content
    });

    // Emit socket event for comment update
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${comment.post.group_id}`).emit('commentUpdated', {
        comment: updatedComment,
        postId: comment.post_id
      });
    }

    return successResponse(req, res, updatedComment, 200, messages.COMMENT_UPDATED_SUCCESSFULLY);
  } catch (err) {
    console.error("UpdateComment Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_UPDATE_COMMENT);
  }
};

// DELETE COMMENT
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true }
    });

    if (!comment) {
      return errorResponse(req, res, 404, messages.POST_NOT_FOUND);
    }

    // Check if user is the comment creator or group admin
    const isAdmin = await groupDao.isUserAdmin(comment.post.group_id, userId);
    if (comment.user_id !== userId && !isAdmin) {
      return errorResponse(req, res, 403, messages.CAN_ONLY_EDIT_OWN_POSTS);
    }

    // Delete comment
    await groupDao.deleteComment(commentId);

    // Emit socket event for comment deletion
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${comment.post.group_id}`).emit('commentDeleted', {
        commentId: commentId,
        postId: comment.post_id
      });
    }

    return successResponse(req, res, null, 200, messages.COMMENT_DELETED_SUCCESSFULLY);
  } catch (err) {
    console.error("DeleteComment Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_DELETE_COMMENT);
  }
};

// REMOVE LIKE
exports.removeLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Get post to find group_id
    const post = await prisma.group_post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return errorResponse(req, res, 404, messages.POST_NOT_FOUND);
    }

    // Check if like exists
    const like = await prisma.like.findUnique({
      where: {
        post_id_user_id: {
          post_id: postId,
          user_id: userId
        }
      }
    });

    if (!like) {
      return errorResponse(req, res, 404, messages.LIKE_NOT_FOUND);
    }

    // Remove like
    await groupDao.removeLike(postId, userId);

    // Emit socket event for like removal
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${post.group_id}`).emit('likeRemoved', {
        postId: postId,
        userId: userId
      });
    }

    return successResponse(req, res, null, 200, messages.LIKE_REMOVED_SUCCESSFULLY);
  } catch (err) {
    console.error("RemoveLike Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_REMOVE_LIKE);
  }
};

// REMOVE MEMBER
exports.removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const requesterId = req.user.id;

    // Check if group exists
    const group = await prisma.groups.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
    }

    // Check if requester is admin
    const isAdmin = await groupDao.isUserAdmin(groupId, requesterId);
    if (!isAdmin) {
      return errorResponse(req, res, 403, messages.ONLY_GROUP_ADMINS_CAN_REMOVE_MEMBERS);
    }

    // Check if trying to remove the group creator
    if (group.created_by === userId) {
      return errorResponse(req, res, 400, messages.CANNOT_REMOVE_GROUP_CREATOR);
    }

    // Remove member
    await groupDao.removeMember(groupId, userId);

    // Emit socket event for member removal
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${groupId}`).emit('memberRemoved', {
        userId: userId,
        groupId: groupId,
        removedBy: {
          id: requesterId,
          first_name: req.user.first_name,
          last_name: req.user.last_name
        }
      });
    }

    return successResponse(req, res, null, 200, messages.MEMBER_REMOVED_SUCCESSFULLY);
  } catch (err) {
    console.error("RemoveMember Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_REMOVE_MEMBER);
  }
};

// LEAVE GROUP
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if group exists
    const group = await prisma.groups.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
    }

    // Check if user is member
    const isMember = await groupDao.isUserMember(groupId, userId);
    if (!isMember) {
      return errorResponse(req, res, 400, messages.NOT_MEMBER_OF_GROUP_TO_LEAVE);
    }

    // Check if user is the group creator
    if (group.created_by === userId) {
      return errorResponse(req, res, 400, messages.GROUP_CREATOR_CANNOT_LEAVE);
    }

    // Leave group
    await groupDao.removeMember(groupId, userId);

    // Emit socket event for leaving group
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${groupId}`).emit('userLeftGroup', {
        userId: userId,
        groupId: groupId,
        user: {
          id: userId,
          first_name: req.user.first_name,
          last_name: req.user.last_name
        }
      });
    }

    return successResponse(req, res, null, 200, messages.LEFT_GROUP_SUCCESSFULLY);
  } catch (err) {
    console.error("LeaveGroup Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_LEAVE_GROUP);
  }
};

// CREATE ANNOUNCEMENT
exports.createAnnouncement = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!title || !content) {
      return errorResponse(req, res, 400, messages.TITLE_AND_CONTENT_REQUIRED_FOR_ANNOUNCEMENTS);
    }

    // Check if group exists
    const group = await prisma.groups.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
    }

    // Check if user is member of the group
    const isMember = await groupDao.isUserMember(groupId, userId);
    if (!isMember) {
      return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);
    }

    // Check if user is admin (only admins can create announcements)
    const isAdmin = await groupDao.isUserAdmin(groupId, userId);
    if (!isAdmin) {
      return errorResponse(req, res, 403, messages.ONLY_GROUP_ADMINS_CAN_CREATE_ANNOUNCEMENTS);
    }

    let mediaUrl = null;
    if (req.file) {
      // Upload media file to S3 using the mediaUploadMiddleware
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const key = `group-media/announcements/${groupId}/${userId}/${fileName}`;
      const Bucket = process.env.S3_PROFILE_BUCKET_NAME || process.env.S3_BUCKET_NAME;
      const params = {
        Bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      const result = await s3.upload(params).promise();
      mediaUrl = result.Location;
    }

    // Create announcement
    const announcement = await prisma.group_post.create({
      data: {
        group_id: groupId,
        user_id: userId,
        type: "ANNOUNCEMENT",
        title: title,
        content: content,
        media_url: mediaUrl,
        is_pinned: false,
      },
    });

    // Get the created announcement with user details
    const announcementWithDetails = await prisma.group_post.findUnique({
      where: { id: announcement.id },
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

    // Emit socket event for new announcement
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${groupId}`).emit('groupAnnouncementCreated', announcementWithDetails);
    }

    return successResponse(req, res, announcementWithDetails, 201, messages.ANNOUNCEMENT_CREATED_SUCCESSFULLY);
  } catch (err) {
    console.error("CreateAnnouncement Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_CREATE_ANNOUNCEMENT);
  }
};

// GET ANNOUNCEMENTS
exports.getAnnouncements = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if group exists
    const group = await prisma.groups.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
    }

    // Check if user is member of the group
    const isMember = await groupDao.isUserMember(groupId, userId);
    if (!isMember) {
      return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);
    }

    // Get all announcements for the group
    const announcements = await prisma.group_post.findMany({
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

    return successResponse(req, res, announcements, 200, messages.ANNOUNCEMENTS_FETCHED_SUCCESSFULLY);
  } catch (err) {
    console.error("GetAnnouncements Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_FETCH_ANNOUNCEMENTS);
  }
};

// UPDATE ANNOUNCEMENT (Only Group Admins)
exports.updateAnnouncement = async (req, res) => {
try {
  const { announcementId } = req.params;
  const { title, content } = req.body;
  const userId = req.user.id;

  // Check if announcement exists
  const announcement = await prisma.group_post.findUnique({
    where: { id: announcementId }
  });

  if (!announcement) {
    return errorResponse(req, res, 404, messages.ANNOUNCEMENT_NOT_FOUND);
  }

  // Check if it's actually an announcement
  if (announcement.type !== "ANNOUNCEMENT") {
    return errorResponse(req, res, 400, messages.THIS_IS_NOT_AN_ANNOUNCEMENT);
  }

  // Check if user is member of the group
  const isMember = await groupDao.isUserMember(announcement.group_id, userId);
  if (!isMember) {
    return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);
  }

  // Check if user is admin (only admins can update announcements)
  const isAdmin = await groupDao.isUserAdmin(announcement.group_id, userId);
  if (!isAdmin) {
    return errorResponse(req, res, 403, messages.ONLY_GROUP_ADMINS_CAN_UPDATE_ANNOUNCEMENTS);
  }

  let mediaUrl = announcement.media_url; // Keep existing media if no new file
  if (req.file) {
    // Upload new media file to S3
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const key = `group-media/announcements/${announcement.group_id}/${userId}/${fileName}`;

    const Bucket = process.env.S3_PROFILE_BUCKET_NAME || process.env.S3_BUCKET_NAME;
    const params = {
      Bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const result = await s3.upload(params).promise();
    mediaUrl = result.Location;
  }

  // Update announcement
  const updatedAnnouncement = await prisma.group_post.update({
    where: { id: announcementId },
    data: {
      title: title || announcement.title,
      content: content || announcement.content,
      media_url: mediaUrl,
    },
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

  // Emit socket event for announcement update
  const io = getSocketInstance(req);
  if (io) {
    io.to(`group_${announcement.group_id}`).emit('groupAnnouncementUpdated', updatedAnnouncement);
  }

  return successResponse(req, res, updatedAnnouncement, 200, messages.ANNOUNCEMENT_UPDATED_SUCCESSFULLY);
} catch (err) {
  console.error("UpdateAnnouncement Error:", err);
  return errorResponse(req, res, 500, messages.FAILED_TO_UPDATE_ANNOUNCEMENT);
}
};

// DELETE ANNOUNCEMENT (Only Group Admins)
exports.deleteAnnouncement = async (req, res) => {
try {
  const { announcementId } = req.params;
  const userId = req.user.id;

  // Check if announcement exists
  const announcement = await prisma.group_post.findUnique({
    where: { id: announcementId }
  });

  if (!announcement) {
    return errorResponse(req, res, 404, messages.ANNOUNCEMENT_NOT_FOUND);
  }

  // Check if it's actually an announcement
  if (announcement.type !== "ANNOUNCEMENT") {
    return errorResponse(req, res, 400, messages.THIS_IS_NOT_AN_ANNOUNCEMENT);
  }

  // Check if user is member of the group
  const isMember = await groupDao.isUserMember(announcement.group_id, userId);
  if (!isMember) {
    return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);
  }

  // Check if user is admin (only admins can delete announcements)
  const isAdmin = await groupDao.isUserAdmin(announcement.group_id, userId);
  if (!isAdmin) {
    return errorResponse(req, res, 403, messages.ONLY_GROUP_ADMINS_CAN_DELETE_ANNOUNCEMENTS);
  }

  // Delete announcement
  await prisma.group_post.delete({
    where: { id: announcementId }
  });

  // Emit socket event for announcement deletion
  const io = getSocketInstance(req);
  if (io) {
    io.to(`group_${announcement.group_id}`).emit('groupAnnouncementDeleted', {
      announcementId: announcementId,
      groupId: announcement.group_id
    });
  }

  return successResponse(req, res, null, 200, messages.ANNOUNCEMENT_DELETED_SUCCESSFULLY);
} catch (err) {
  console.error("DeleteAnnouncement Error:", err);
  return errorResponse(req, res, 500, messages.FAILED_TO_DELETE_ANNOUNCEMENT);
}
};

// GET SINGLE ANNOUNCEMENT (All Group Members)
exports.getAnnouncementById = async (req, res) => {
try {
  const { announcementId } = req.params;
  const userId = req.user.id;

  // Check if announcement exists
  const announcement = await prisma.group_post.findUnique({
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

  if (!announcement) {
    return errorResponse(req, res, 404, messages.ANNOUNCEMENT_NOT_FOUND);
  }

  // Check if it's actually an announcement
  if (announcement.type !== "ANNOUNCEMENT") {
    return errorResponse(req, res, 400, messages.THIS_IS_NOT_AN_ANNOUNCEMENT);
  }

  // Check if user is member of the group
  const isMember = await groupDao.isUserMember(announcement.group_id, userId);
  if (!isMember) {
    return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);
  }

  return successResponse(req, res, announcement, 200, messages.ANNOUNCEMENT_FETCHED_SUCCESSFULLY);
} catch (err) {
  console.error("GetAnnouncementById Error:", err);
  return errorResponse(req, res, 500, messages.FAILED_TO_FETCH_ANNOUNCEMENT);
}
};
exports.createPoll = async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.params;
    const { poll_question, poll_expires_at, poll_allow_multiple, poll_is_anonymous, options } = req.body;

    // Validate group membership
    const isMember = await groupDao.isUserMember(groupId, userId);
    if (!isMember) {
      return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);
    }

    // Create poll
    const poll = await groupDao.createPoll({
      group_id: groupId,
      sender_id: userId,
      poll_question,
      poll_expires_at,
      poll_allow_multiple,
      poll_is_anonymous,
      options
    });

    // Broadcast to the group in real-time
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${groupId}`).emit('pollCreated', { poll });
    }

    return successResponse(req, res, poll, 201, messages.POLL_CREATED_SUCCESSFULLY);
  } catch (err) {
    console.error("CreatePoll Error:", err);
    return errorResponse(req, res, 500, messages.FAILED_TO_CREATE_POLL);
  }
};

//  Vote in
exports.votePoll = async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId, pollId } = req.params;
    const { option_id } = req.body;

    const isMember = await groupDao.isUserMember(groupId, userId);
    if (!isMember) return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);

    const updated = await groupDao.votePoll({ message_id: pollId, option_id, user_id: userId });
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${groupId}`).emit('pollUpdated', {
        pollId,
        updated,      // includes poll_options with votes
        voterId: userId,
        option_id
      });
    }
    return successResponse(req, res, updated, 200, messages.VOTE_SUBMITTED_SUCCESSFULLY);
  } catch (err) {
    const status = err.status || 500;
    const msg = status === 500 ? messages.FAILED_TO_SUBMIT_VOTE : err.message;
    return errorResponse(req, res, status, msg);
  }
};
exports.getPoll = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pollId } = req.params;

    const poll = await groupDao.getPollById(pollId);
    if (!poll) return errorResponse(req, res, 404, "Poll not found");

    const isMember = await groupDao.isUserMember(poll.group_id, userId);
    if (!isMember) return errorResponse(req, res, 403, "You are not a member of this group");

    return successResponse(req, res, poll, 200, "Poll fetched successfully");
  } catch (err) {
    console.error("GetPoll Error:", err);
    return errorResponse(req, res, 500, "Failed to fetch poll");
  }
};
// ... existing code ...

// Pin/Unpin Poll
exports.pinPoll = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pollId } = req.params;

    const updated = await groupDao.pinPoll(pollId, userId);
    
    // Broadcast to the group in real-time
    const io = getSocketInstance(req);
    if (io) {
      io.to(`group_${updated.group_id}`).emit('pollPinned', {
        pollId: pollId,
        isPinned: updated.is_pinned,
        poll: updated,
        pinnedBy: {
          id: userId,
          first_name: req.user.first_name,
          last_name: req.user.last_name
        }
      });
    }

    const message = updated.is_pinned ? "Poll pinned successfully" : "Poll unpinned successfully";
    return successResponse(req, res, updated, 200, message);
  } catch (err) {
    const status = err.status || 500;
    const msg = status === 500 ? "Failed to pin/unpin poll" : err.message;
    return errorResponse(req, res, status, msg);
  }
};

// Get Pinned Polls
exports.getPinnedPolls = async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.params;

    // Check if user is member of the group
    const isMember = await groupDao.isUserMember(groupId, userId);
    if (!isMember) {
      return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);
    }

    const pinnedPolls = await groupDao.getPinnedPolls(groupId);
    return successResponse(req, res, pinnedPolls, 200, "Pinned polls fetched successfully");
  } catch (err) {
    console.error("GetPinnedPolls Error:", err);
    return errorResponse(req, res, 500, "Failed to fetch pinned polls");
  }
};
