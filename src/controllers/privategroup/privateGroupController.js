const prisma = require('../../config/prismaClient');
const dao = require('../../dao/privategroup/privateGroupDao');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
const { s3 } = require('../../utils/s3Utils');
const crypto = require('crypto');
const redis = require('../../config/redis');

const getSocketInstance = (req) => req.app.get('io');

// Roles helpers (DB + token fallbacks)
const getUserRoles = async (userId, req) => {
	const rows = await prisma.user_roles.findMany({
		where: { user_id: userId },
		select: { role: true }
	});
	const dbRoles = rows.map(r => String(r.role).toLowerCase());

	const tokenRoles = [];
	if (req.user?.role) tokenRoles.push(String(req.user.role).toLowerCase());
	if (Array.isArray(req.user?.roles)) {
		tokenRoles.push(...req.user.roles.map(r => String(r).toLowerCase()));
	}
	return new Set([...dbRoles, ...tokenRoles]);
};

// Allow if: has 'user' OR no roles at all. Block only if explicitly admin or instructor without 'user'.
const canCreatePrivateGroup = async (userId, req) => {
	const roles = await getUserRoles(userId, req);
  
	if (roles.size === 0) return true; // no role → allow
	if (roles.has('user') || roles.has('admin') || roles.has('instructor')) {
	  return true; // user, admin, or instructor → allow
	}
  
	return false;
  };


// Admin bypass (view/access)
const isSystemAdmin = async (userId, req) => {
	const roles = await getUserRoles(userId, req);
	return roles.has('admin');
};

exports.createPrivateGroup = async (req, res) => {
	try {
		const userId = req.user.id;

		if (!(await canCreatePrivateGroup(userId, req))) {
			return errorResponse(req, res, 403, "Only standard users (role=user) can create private groups");
		}

		const existing = await dao.findUserPrivateGroup(userId);
		if (existing) return errorResponse(req, res, 400, "You already have a private group. Delete it first.");

		const { name, description, invited_user_ids } = req.body;
		if (!name) return errorResponse(req, res, 400, messages.GROUP_NAME_REQUIRED);

		let thumbnail = null;
		if (req.file) {
			const fileName = `${Date.now()}-${req.file.originalname}`;
			const key = `group-thumbnails/${userId}/${fileName}`;
			const Bucket = process.env.S3_PROFILE_BUCKET_NAME || process.env.S3_BUCKET_NAME;
			const params = { Bucket, Key: key, Body: req.file.buffer, ContentType: req.file.mimetype };
			const result = await s3.upload(params).promise();
			thumbnail = result.Location;
		} else if (req.body.thumbnail) {
			thumbnail = req.body.thumbnail;
		}

		const group = await dao.createPrivateGroup({
			name, description, created_by: userId, group_type: 'PRIVATE', thumbnail
		});
		await dao.addAdminMember(group.id, userId);

		if (Array.isArray(invited_user_ids) && invited_user_ids.length) {
			await dao.addMembers(group.id, invited_user_ids);
			const io = getSocketInstance(req);
			if (io) io.emit('privateGroupMembersAdded', { groupId: group.id, users: invited_user_ids });
		}

		const io = getSocketInstance(req);
		if (io) io.emit('privateGroupCreated', { group });

		return successResponse(req, res, group, 201, "Private group created successfully");
	} catch (e) {
		console.error("createPrivateGroup error:", e);
		return errorResponse(req, res, 500, "Failed to create private group");
	}
};

exports.getMyPrivateGroup = async (req, res) => {
	try {
		const group = await dao.findUserPrivateGroup(req.user.id);
		return successResponse(req, res, group, 200, "Private group fetched");
	} catch (e) {
		return errorResponse(req, res, 500, "Failed to fetch private group");
	}
};

exports.deleteMyPrivateGroup = async (req, res) => {
	try {
		const userId = req.user.id;
		const group = await dao.findUserPrivateGroup(userId);
		if (!group) return errorResponse(req, res, 404, "No private group found");

        await dao.deleteGroupDeep(group.id);

		const io = getSocketInstance(req);
		if (io) io.emit('privateGroupDeleted', { groupId: group.id, deletedBy: userId });

		return successResponse(req, res, null, 200, "Private group deleted");
    } catch (e) {
        console.error("deleteMyPrivateGroup error:", e);
        return errorResponse(req, res, 500, "Failed to delete private group");
	}
};

exports.getAllPrivateGroups = async (req, res) => {
	try {
		if (!(await isSystemAdmin(req.user.id, req))) {
			return errorResponse(req, res, 403, "Only admins can access all private groups");
		}
		const groups = await prisma.groups.findMany({
			where: { group_type: 'PRIVATE' },
			include: { members: true },
			orderBy: { createdAt: 'desc' }
		});
		return successResponse(req, res, groups, 200, "All private groups fetched");
	} catch (e) {
		return errorResponse(req, res, 500, "Failed to fetch private groups");
	}
};

// Get PRIVATE groups where current user is a member
exports.getMyMemberPrivateGroups = async (req, res) => {
	try {
		const userId = req.user.id;
		const groups = await prisma.groups.findMany({
			where: {
				group_type: 'PRIVATE',
				members: { some: { user_id: userId } }
			},
			select: {
				id: true,
				name: true,
				description: true,
				thumbnail: true,
				createdAt: true,
				created_by: true,
				members: { where: { user_id: userId }, select: { role: true } }
			},
			orderBy: { createdAt: 'desc' }
		});
		return successResponse(req, res, groups, 200, 'Private groups (member-of) fetched');
	} catch (e) {
		return errorResponse(req, res, 500, 'Failed to fetch private groups (member-of)');
	}
};

// Update private group details (name, description, thumbnail)
exports.updatePrivateGroup = async (req, res) => {
	try {
		const { groupId } = req.params;
		const userId = req.user.id;

		const group = await prisma.groups.findUnique({ where: { id: groupId } });
		if (!group) return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
		if (group.group_type !== 'PRIVATE') return errorResponse(req, res, 400, 'Only private groups can be updated here');

		const isGroupAdmin = await dao.isUserAdmin(groupId, userId);
		const adminBypass = await isSystemAdmin(userId, req);
		if (!isGroupAdmin && !adminBypass) {
			return errorResponse(req, res, 403, 'Only group admins or system admins can edit the group');
		}

		const updates = {};
		if (typeof req.body.name === 'string' && req.body.name.trim().length) {
			updates.name = req.body.name.trim();
		}
		if (typeof req.body.description === 'string') {
			updates.description = req.body.description;
		}

		// Handle thumbnail from file or direct URL
		if (req.file) {
			const fileName = `${Date.now()}-${req.file.originalname}`;
			const key = `group-thumbnails/${group.created_by}/${fileName}`;
			const Bucket = process.env.S3_PROFILE_BUCKET_NAME || process.env.S3_BUCKET_NAME;
			const result = await s3.upload({ Bucket, Key: key, Body: req.file.buffer, ContentType: req.file.mimetype }).promise();
			updates.thumbnail = result.Location;
		} else if (req.body.thumbnail && typeof req.body.thumbnail === 'string') {
			updates.thumbnail = req.body.thumbnail;
		}

		if (Object.keys(updates).length === 0) {
			return successResponse(req, res, group, 200, 'No changes provided');
		}

		const updated = await prisma.groups.update({ where: { id: groupId }, data: updates });

		const io = getSocketInstance(req);
		if (io) io.emit('privateGroupUpdated', { groupId, updates, updatedBy: userId });

		return successResponse(req, res, updated, 200, 'Private group updated successfully');
	} catch (e) {
		return errorResponse(req, res, 500, 'Failed to update private group');
	}
};

exports.getMembers = async (req, res) => {
	try {
		const { groupId } = req.params;
		const adminBypass = await isSystemAdmin(req.user.id, req);
		const isMember = await dao.isUserMember(groupId, req.user.id);
		if (!adminBypass && !isMember) return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);

		const members = await dao.getMembers(groupId);
		return successResponse(req, res, members, 200, messages.GROUP_MEMBERS_FETCHED_SUCCESSFULLY);
	} catch (e) {
		return errorResponse(req, res, 500, messages.FAILED_TO_FETCH_GROUP_MEMBERS);
	}
};

exports.leaveGroup = async (req, res) => {
	try {
		const { groupId } = req.params;
		const group = await prisma.groups.findUnique({ where: { id: groupId } });
		if (!group) return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
		if (group.created_by === req.user.id) {
			return errorResponse(req, res, 400, "Group creator cannot leave their private group");
		}
		const isMember = await dao.isUserMember(groupId, req.user.id);
		if (!isMember) return errorResponse(req, res, 400, messages.NOT_MEMBER_OF_GROUP_TO_LEAVE);

		await dao.removeMember(groupId, req.user.id);
		const io = getSocketInstance(req);
		if (io) io.to(`group_${groupId}`).emit('userLeftGroup', { userId: req.user.id, groupId });

		return successResponse(req, res, null, 200, messages.LEFT_GROUP_SUCCESSFULLY);
	} catch (e) {
		return errorResponse(req, res, 500, messages.FAILED_TO_LEAVE_GROUP);
	}
};

exports.inviteMembers = async (req, res) => {
	try {
		const { groupId } = req.params;
		const { user_ids = [], expires_in_hours = 72 } = req.body;
		if (!user_ids.length) return errorResponse(req, res, 400, "User IDs are required");

		const group = await prisma.groups.findUnique({ where: { id: groupId } });
		if (!group) return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
		if (group.group_type !== 'PRIVATE') return errorResponse(req, res, 400, "Only for private groups");

		const canInvite = (await dao.isUserAdmin(groupId, req.user.id)) || (await isSystemAdmin(req.user.id, req));
		if (!canInvite) return errorResponse(req, res, 403, "Only group admins or system admins can invite");

		const expires_at = new Date(Date.now() + expires_in_hours * 3600 * 1000);
		const tokens = [];

		for (const invitee_id of user_ids) {
			const token = crypto.randomBytes(24).toString('hex');
			await dao.createInvitation(groupId, req.user.id, invitee_id, token, expires_at);
			tokens.push({ invitee_id, token });
		}

		const io = getSocketInstance(req);
		if (io) io.emit('privateGroupInvitationSent', { groupId, invites: tokens });

		return successResponse(req, res, tokens, 201, "Invitations created");
	} catch (e) {
		console.error("inviteMembers error:", e);
		return errorResponse(req, res, 500, "Failed to create invitations");
	}
};

exports.getInvitationByToken = async (req, res) => {
	try {
	  const { token } = req.params;
	  const inv = await dao.getInvitationByToken(token);
	  if (!inv) return errorResponse(req, res, 404, "Invitation not found");
	  if (inv.status !== 'PENDING') {
		return errorResponse(req, res, 400, `Invitation already ${inv.status.toLowerCase()}`);
	  }
	  if (inv.expires_at && inv.expires_at < new Date()) {
		return errorResponse(req, res, 400, "Invitation expired");
	  }

	  return successResponse(req, res, {
		token: inv.token,
		group: { id: inv.group_id, name: inv.group.name, thumbnail: inv.group.thumbnail },
		invitee: inv.invitee,
		inviter: inv.inviter,
		status: inv.status,
		created_at: inv.createdAt
	  }, 200, "Invitation fetched");
	} catch (e) {
	  return errorResponse(req, res, 500, "Failed to fetch invitation");
	}
};

exports.getMyPendingInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const invites = await dao.getPendingInvitationsForUser(userId);

    const data = invites.map(inv => ({
      id: inv.id,
      token: inv.token,
      invitee_id: inv.invitee_id,
      group_id: inv.group_id,
      status: inv.status,
      created_at: inv.createdAt,
      expires_at: inv.expires_at,
      group: inv.group,
      inviter: inv.inviter
    }));

    return successResponse(req, res, data, 200, "Pending invitations fetched");
  } catch (e) {
    console.error("getMyPendingInvitations error:", e);
    return errorResponse(req, res, 500, "Failed to fetch pending invitations");
  }
};

exports.acceptInvitation = async (req, res) => {
	try {
		const { token } = req.params;
		const inv = await dao.getInvitationByToken(token);
		if (!inv) return errorResponse(req, res, 404, "Invitation not found");
		if (inv.invitee_id !== req.user.id) return errorResponse(req, res, 403, "This invitation is not for you");
		if (inv.status !== 'PENDING') return errorResponse(req, res, 400, `Invitation already ${inv.status.toLowerCase()}`);
		if (inv.expires_at && inv.expires_at < new Date()) return errorResponse(req, res, 400, "Invitation expired");

		const alreadyMember = await dao.isUserMember(inv.group_id, req.user.id);
		if (!alreadyMember) await dao.addMembers(inv.group_id, [req.user.id]);
		await dao.updateInvitationStatus(inv.id, 'ACCEPTED');

		const io = getSocketInstance(req);
		if (io) io.to(`group_${inv.group_id}`).emit('privateGroupInvitationAccepted', { groupId: inv.group_id, userId: req.user.id });

		return successResponse(req, res, null, 200, "Joined the group");
	} catch (e) {
		return errorResponse(req, res, 500, "Failed to accept invitation");
	}
};

exports.rejectInvitation = async (req, res) => {
	try {
		const { token } = req.params;
		const inv = await dao.getInvitationByToken(token);
		if (!inv) return errorResponse(req, res, 404, "Invitation not found");
		if (inv.invitee_id !== req.user.id) return errorResponse(req, res, 403, "This invitation is not for you");
		if (inv.status !== 'PENDING') return errorResponse(req, res, 400, `Invitation already ${inv.status.toLowerCase()}`);

		await dao.updateInvitationStatus(inv.id, 'REJECTED');

		const io = getSocketInstance(req);
		if (io) io.emit('privateGroupInvitationRejected', { groupId: inv.group_id, userId: req.user.id });

		return successResponse(req, res, null, 200, "Invitation rejected");
	} catch (e) {
		return errorResponse(req, res, 500, "Failed to reject invitation");
	}
};

exports.sendMessage = async (req, res) => {
	try {
		const { groupId } = req.params;
		const userId = req.user.id;

		const group = await prisma.groups.findUnique({ where: { id: groupId } });
		if (!group) return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
		if (group.group_type !== 'PRIVATE') return errorResponse(req, res, 400, "Only for private groups");

		const adminBypass = await isSystemAdmin(userId, req);
		const isMember = await dao.isUserMember(groupId, userId);
		if (!adminBypass && !isMember) return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);

		let content = req.body.content && String(req.body.content).trim();
		let mimeType = null;
		let messageType = 'TEXT';
		if ((!content || !content.length) && !req.file) {
			return errorResponse(req, res, 400, messages.CONTENT_OR_MEDIA_REQUIRED);
		}

		if (req.file) {
			const fileName = `${Date.now()}-${req.file.originalname}`;
			const key = `group-media/messages/${groupId}/${userId}/${fileName}`;
			const Bucket = process.env.S3_PROFILE_BUCKET_NAME || process.env.S3_BUCKET_NAME;
			const result = await s3.upload({ Bucket, Key: key, Body: req.file.buffer, ContentType: req.file.mimetype }).promise();
			content = result.Location;
			mimeType = req.file.mimetype;
			if (mimeType.startsWith('image/')) messageType = 'IMAGE';
			else if (mimeType.startsWith('video/')) messageType = 'VIDEO';
			else if (mimeType.startsWith('audio/')) messageType = 'AUDIO';
			else messageType = 'FILE';
		}

		const msg = await dao.createMessage({
			group_id: groupId,
			sender_id: userId,
			content,
			type: messageType,
			mime_type: mimeType,
			timeStamp: new Date()
		});

		const io = getSocketInstance(req);
		if (io) io.to(`group_${groupId}`).emit('newGroupMessage', msg);

		return successResponse(req, res, msg, 201, messages.MESSAGE_SENT_SUCCESSFULLY);
	} catch (e) {
		return errorResponse(req, res, 500, messages.FAILED_TO_SEND_MESSAGE);
	}
};

exports.getMessages = async (req, res) => {
	try {
		const { groupId } = req.params;
		const userId = req.user.id;

		const adminBypass = await isSystemAdmin(userId, req);
		const isMember = await dao.isUserMember(groupId, userId);
		if (!adminBypass && !isMember) return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);

		const { page = 1, limit = 50 } = req.query;
		const skip = (page - 1) * limit;

		const msgs = await dao.getMessages(groupId, skip, parseInt(limit));
		const total = await dao.countMessages(groupId);

		return successResponse(req, res, {
			messages: msgs.reverse(),
			pagination: {
				currentPage: parseInt(page),
				totalPages: Math.ceil(total / limit),
				totalMessages: total,
				hasNext: page * limit < total,
				hasPrev: page > 1
			}
		}, 200, messages.MESSAGES_FETCHED_SUCCESSFULLY);
	} catch (e) {
		return errorResponse(req, res, 500, messages.FAILED_TO_FETCH_MESSAGES);
	}
};

exports.createPoll = async (req, res) => {
	try {
		const { groupId } = req.params;
		const userId = req.user.id;
		const isMember = await dao.isUserMember(groupId, userId);
		if (!isMember) return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);

		const poll = await dao.createPoll({
			group_id: groupId,
			sender_id: userId,
			poll_question: req.body.poll_question,
			poll_expires_at: req.body.poll_expires_at,
			poll_allow_multiple: req.body.poll_allow_multiple,
			poll_is_anonymous: req.body.poll_is_anonymous,
			options: req.body.options || []
		});

		const io = getSocketInstance(req);
		if (io) io.to(`group_${groupId}`).emit('pollCreated', { poll });

		return successResponse(req, res, poll, 201, messages.POLL_CREATED_SUCCESSFULLY);
	} catch (e) {
		return errorResponse(req, res, 500, messages.FAILED_TO_CREATE_POLL);
	}
};

exports.getPoll = async (req, res) => {
	try {
		const poll = await dao.getPollById(req.params.pollId);
		if (!poll) return errorResponse(req, res, 404, "Poll not found");
		const isMember = await dao.isUserMember(poll.group_id, req.user.id);
		if (!isMember) return errorResponse(req, res, 403, "You are not a member of this group");
		return successResponse(req, res, poll, 200, "Poll fetched successfully");
	} catch (e) {
		return errorResponse(req, res, 500, "Failed to fetch poll");
	}
};

exports.votePoll = async (req, res) => {
	try {
		const updated = await dao.votePoll({ message_id: req.params.pollId, option_id: req.body.option_id, user_id: req.user.id });
		const io = getSocketInstance(req);
		if (io) io.to(`group_${updated.group_id}`).emit('pollUpdated', { pollId: req.params.pollId, updated, voterId: req.user.id, option_id: req.body.option_id });
		return successResponse(req, res, updated, 200, "Vote submitted successfully");
	} catch (e) {
		const status = e.status || 500;
		return errorResponse(req, res, status, status === 500 ? "Failed to submit vote" : e.message);
	}
};

exports.pinPoll = async (req, res) => {
	try {
		const updated = await dao.pinPoll(req.params.pollId, req.user.id);
		const io = getSocketInstance(req);
		if (io) io.to(`group_${updated.group_id}`).emit('pollPinned', { pollId: req.params.pollId, isPinned: updated.is_pinned, poll: updated, pinnedBy: { id: req.user.id, first_name: req.user.first_name, last_name: req.user.last_name } });
		return successResponse(req, res, updated, 200, updated.is_pinned ? "Poll pinned successfully" : "Poll unpinned successfully");
	} catch (e) {
		const status = e.status || 500;
		return errorResponse(req, res, status, status === 500 ? "Failed to pin/unpin poll" : e.message);
	}
};

exports.getPinnedPolls = async (req, res) => {
	try {
		const isMember = await dao.isUserMember(req.params.groupId, req.user.id);
		if (!isMember) return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);
		const polls = await dao.getPinnedPolls(req.params.groupId);
		return successResponse(req, res, polls, 200, "Pinned polls fetched successfully");
	} catch (e) {
		return errorResponse(req, res, 500, "Failed to fetch pinned polls");
	}
};

// Admin: delete any private group by id
exports.adminDeleteGroup = async (req, res) => {
	try {
		const userId = req.user.id;
		const { groupId } = req.params;

		if (!(await isSystemAdmin(userId, req))) {
			return errorResponse(req, res, 403, "Only admins can delete private groups");
		}

		const group = await prisma.groups.findUnique({ where: { id: groupId } });
		if (!group) return errorResponse(req, res, 404, messages.GROUP_NOT_FOUND);
		if (group.group_type !== 'PRIVATE') {
			return errorResponse(req, res, 400, "Only private groups can be deleted via this endpoint");
		}

        await dao.deleteGroupDeep(groupId);

		const io = getSocketInstance(req);
		if (io) io.emit('privateGroupDeleted', { groupId, deletedBy: userId, isAdminAction: true });

		return successResponse(req, res, null, 200, "Private group deleted by admin");
    } catch (e) {
        console.error("adminDeleteGroup error:", e);
        return errorResponse(req, res, 500, "Failed to delete private group");
	}
};

exports.removeMember = async (req, res) => {
	try {
	  const { groupId, userId } = req.params;
	  const currentUserId = req.user.id;
  
	  console.log("Debug - Current User ID:", currentUserId);
	  console.log("Debug - Group ID:", groupId);
	  console.log("Debug - Target User ID:", userId);
  
	  // Check if current user is group admin or system admin
	  const isGroupAdmin = await dao.isUserAdmin(groupId, currentUserId);
	  const isSystemAdminUser = await isSystemAdmin(currentUserId, req); // Fixed variable name
	  
	  console.log("Debug - Is Group Admin:", isGroupAdmin);
	  console.log("Debug - Is System Admin:", isSystemAdminUser);
	  
	  if (!isGroupAdmin && !isSystemAdminUser) {
		return errorResponse(req, res, 403, "Only group admins or system admins can remove members");
	  }
  
	  // Check if target user is a member
	  const isMember = await dao.isUserMember(groupId, userId);
	  if (!isMember) {
		return errorResponse(req, res, 404, "User is not a member of this group");
	  }
  
	  // Check if trying to remove group creator
	  const group = await prisma.groups.findUnique({
		where: { id: groupId },
		select: { id: true, created_by: true }
	  });
	  if (group.created_by === userId) {
		return errorResponse(req, res, 400, "Cannot remove group creator");
	  }
  
	  // Remove the member
	  await dao.removeMember(groupId, userId);
  
	  const io = getSocketInstance(req);
	  if (io) io.to(`group_${groupId}`).emit('memberRemoved', { 
		groupId, 
		removedUserId: userId, 
		removedBy: currentUserId 
	  });
  
	  return successResponse(req, res, null, 200, "Member removed successfully");
	} catch (e) {
	  console.error("removeMember error:", e);
	  return errorResponse(req, res, 500, "Failed to remove member");
	}
  };

  exports.updateMessage = async (req, res) => {
	try {
	  const { groupId, messageId } = req.params;
	  const userId = req.user.id;
	  const { content } = req.body;
  
	  if (!content || !String(content).trim()) {
		return errorResponse(req, res, 400, "Content is required");
	  }
  
	  const msg = await prisma.group_message.findUnique({ where: { id: messageId } });
	  if (!msg || msg.group_id !== groupId) return errorResponse(req, res, 404, "Message not found");
  
	  const isOwner = msg.sender_id === userId;
	  const roles = await prisma.user_roles.findMany({ where: { user_id: userId }, select: { role: true } });
	  const isSysAdmin = roles.some(r => String(r.role).toLowerCase() === 'admin');
	  if (!isOwner && !isSysAdmin) return errorResponse(req, res, 403, "Not allowed to edit this message");
  
	  const updated = await prisma.group_message.update({
		where: { id: messageId },
		data: { content }
	  });
  
	  const io = getSocketInstance(req);
	  if (io) io.to(`group_${groupId}`).emit('groupMessageUpdated', { messageId, content, groupId });
  
	  return successResponse(req, res, updated, 200, "Message updated successfully");
	} catch (e) {
	  return errorResponse(req, res, 500, "Failed to update message");
	}
  };
  
  exports.deleteMessage = async (req, res) => {
	try {
	  const { groupId, messageId } = req.params;
	  const userId = req.user.id;
  
	  const msg = await prisma.group_message.findUnique({ where: { id: messageId } });
	  if (!msg || msg.group_id !== groupId) return errorResponse(req, res, 404, "Message not found");
  
	  // Sender, group admin, or system admin can delete
	  const isOwner = msg.sender_id === userId;
	  const isGroupAdmin = await prisma.group_member.findFirst({
		where: { group_id: groupId, user_id: userId, role: 'ADMIN' }
	  });
	  const roles = await prisma.user_roles.findMany({ where: { user_id: userId }, select: { role: true } });
	  const isSysAdmin = roles.some(r => String(r.role).toLowerCase() === 'admin');
  
	  if (!isOwner && !isGroupAdmin && !isSysAdmin) {
		return errorResponse(req, res, 403, "Not allowed to delete this message");
	  }
  
	  await prisma.group_message.delete({ where: { id: messageId } });
  
	  const io = getSocketInstance(req);
	  if (io) io.to(`group_${groupId}`).emit('groupMessageDeleted', { messageId, groupId });
  
	  return successResponse(req, res, null, 200, "Message deleted successfully");
	} catch (e) {
	  return errorResponse(req, res, 500, "Failed to delete message");
	}
  };

// Mark a group message as read (Redis-based, no DB schema change)
exports.markMessageRead = async (req, res) => {
    try {
        const { groupId, messageId } = req.params;
        const userId = req.user.id;

        const isMember = await dao.isUserMember(groupId, userId);
        if (!isMember) return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);

        // Ensure message belongs to group
        const msg = await prisma.group_message.findUnique({ where: { id: messageId }, select: { group_id: true } });
        if (!msg || msg.group_id !== groupId) return errorResponse(req, res, 404, 'Message not found');

        const key = `grp:${groupId}:msg:${messageId}:readers`;
        // Idempotent add and TTL
        await redis.sAdd(key, userId);
        await redis.expire(key, 60 * 60 * 24 * 30);

        const readerIds = await redis.sMembers(key);
        const readers = readerIds.length ? await prisma.users.findMany({
            where: { id: { in: readerIds } },
            select: { id: true, first_name: true, last_name: true, image: true }
        }) : [];

        const io = getSocketInstance(req);
        if (io) io.to(`group_${groupId}`).emit('groupMessageRead', { messageId, readers });

        return successResponse(req, res, { messageId, readers, count: readers.length }, 200, 'Message marked as read');
    } catch (e) {
        console.error('markMessageRead error:', e);
        return errorResponse(req, res, 500, 'Failed to mark message as read');
    }
};

exports.getMessageReadStatus = async (req, res) => {
    try {
        const { groupId, messageId } = req.params;
        const userId = req.user.id;

        const isMember = await dao.isUserMember(groupId, userId);
        if (!isMember) return errorResponse(req, res, 403, messages.NOT_MEMBER_OF_GROUP);

        const key = `grp:${groupId}:msg:${messageId}:readers`;
        const readerIds = await redis.sMembers(key);
        const readers = readerIds.length ? await prisma.users.findMany({
            where: { id: { in: readerIds } },
            select: { id: true, first_name: true, last_name: true, image: true }
        }) : [];

        return successResponse(req, res, { messageId, readers, count: readers.length }, 200, 'Read status fetched');
    } catch (e) {
        console.error('getMessageReadStatus error:', e);
        return errorResponse(req, res, 500, 'Failed to fetch read status');
    }
};