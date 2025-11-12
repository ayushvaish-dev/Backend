const prisma = require('../../config/prismaClient');
const { InvitationStatus } = require('@prisma/client');

exports.findUserPrivateGroup = (userId) => prisma.groups.findFirst({
	where: { created_by: userId, group_type: 'PRIVATE' },
	include: { members: true }
});

exports.createPrivateGroup = (data) => prisma.groups.create({ data });

exports.addAdminMember = (group_id, user_id) =>
	prisma.group_member.create({ data: { group_id, user_id, role: 'ADMIN' } });

exports.addMembers = (group_id, userIds) => prisma.group_member.createMany({
	data: userIds.map(uid => ({ group_id, user_id: uid, role: 'LEARNER' })),
	skipDuplicates: true
});

exports.getGroupById = (groupId) => prisma.groups.findUnique({
	where: { id: groupId },
	include: { members: { include: { user: true } } }
});

exports.deleteGroup = (groupId) => prisma.groups.delete({ where: { id: groupId } });

// Deep, transactional delete to avoid FK issues and ensure clean removal
exports.deleteGroupDeep = async (groupId) => {
	return prisma.$transaction(async (tx) => {
		// Gather dependent IDs first
		const messages = await tx.group_message.findMany({
			where: { group_id: groupId },
			select: { id: true }
		});
		const messageIds = messages.map(m => m.id);

		const posts = await tx.group_post.findMany({
			where: { group_id: groupId },
			select: { id: true }
		});
		const postIds = posts.map(p => p.id);

		// Delete poll data linked to messages
		if (messageIds.length) {
			await tx.poll_votes.deleteMany({ where: { message_id: { in: messageIds } } });
			await tx.poll_options.deleteMany({ where: { message_id: { in: messageIds } } });
		}

		// Delete messages
		await tx.group_message.deleteMany({ where: { group_id: groupId } });

		// Delete post-related entities then posts
		if (postIds.length) {
			await tx.like.deleteMany({ where: { post_id: { in: postIds } } });
			await tx.comment.deleteMany({ where: { post_id: { in: postIds } } });
		}
		await tx.group_post.deleteMany({ where: { group_id: groupId } });

		// Invitations, resources, members
		await tx.group_invitations.deleteMany({ where: { group_id: groupId } });
		await tx.resource.deleteMany({ where: { group_id: groupId } });
		await tx.group_member.deleteMany({ where: { group_id: groupId } });

		// Finally delete the group
		await tx.groups.delete({ where: { id: groupId } });
	});
};

exports.isUserMember = (groupId, userId) =>
	prisma.group_member.findFirst({ where: { group_id: groupId, user_id: userId } }).then(Boolean);

exports.isUserAdmin = (groupId, userId) =>
	prisma.group_member.findFirst({ where: { group_id: groupId, user_id: userId, role: 'ADMIN' } }).then(Boolean);

exports.getMembers = (groupId) => prisma.group_member.findMany({
	where: { group_id: groupId },
	include: {
		user: { select: { id: true, first_name: true, last_name: true, email: true, image: true } }
	},
	orderBy: { joined_at: 'asc' }
});

exports.removeMember = (groupId, userId) =>
	prisma.group_member.delete({ where: { user_id_group_id: { user_id: userId, group_id: groupId } } });

exports.createInvitation = (group_id, inviter_id, invitee_id, token, expires_at) =>
	prisma.group_invitations.create({ data: { group_id, inviter_id, invitee_id, token, expires_at } });

exports.getInvitationByToken = (token) => prisma.group_invitations.findUnique({
	where: { token },
	include: {
		group: true,
		invitee: { select: { id: true, first_name: true, last_name: true, email: true } },
		inviter: { select: { id: true, first_name: true, last_name: true, email: true, image: true } }
	}
});

exports.getPendingInvitationsForUser = (user_id) =>
  prisma.group_invitations.findMany({
    where: {
      invitee_id: user_id,
      status: InvitationStatus.PENDING,
      OR: [
        { expires_at: { equals: null } },
        { expires_at: { gt: new Date() } }
      ]
    },
    include: {
      group:   { select: { id: true, name: true, thumbnail: true } },
      inviter: { select: { id: true, first_name: true, last_name: true, image: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

exports.updateInvitationStatus = (id, status) =>
	prisma.group_invitations.update({ where: { id }, data: { status } });

exports.createMessage = (data) => prisma.group_message.create({
	data,
	include: { sender: { select: { id: true, first_name: true, last_name: true, image: true } } }
});

exports.getMessages = (groupId, skip, take) => prisma.group_message.findMany({
	where: { group_id: groupId },
	include: { sender: { select: { id: true, first_name: true, last_name: true, image: true } } },
	orderBy: { timeStamp: 'desc' },
	skip,
	take
});

exports.countMessages = (groupId) => prisma.group_message.count({ where: { group_id: groupId } });

exports.createPoll = (data) => prisma.group_message.create({
	data: {
		group_id: data.group_id,
		sender_id: data.sender_id,
		type: 'POLL',
		content: data.poll_question,
		poll_question: data.poll_question,
		poll_expires_at: data.poll_expires_at,
		poll_allow_multiple: data.poll_allow_multiple,
		poll_is_anonymous: data.poll_is_anonymous,
		poll_options: { create: (data.options || []).map(o => ({ option_text: o })) }
	},
	include: { poll_options: true }
});

// Delegate complex poll ops to shared group DAO
exports.votePoll = (args) => require('../group/groupDao').votePoll(args);
exports.getPollById = (id) => require('../group/groupDao').getPollById(id);
exports.pinPoll = (id, uid) => require('../group/groupDao').pinPoll(id, uid);
exports.getPinnedPolls = (group_id) => require('../group/groupDao').getPinnedPolls(group_id);
exports.deleteGroup = (groupId) => prisma.groups.delete({ where: { id: groupId } });