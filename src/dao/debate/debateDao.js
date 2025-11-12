const prisma = require('../../config/prismaClient');
const { v4: uuidv4 } = require('uuid');


async function createDebate(data) {
    const { title, statement, module_id, total_marks, instruction, createdBy } = data;
    return prisma.debates.create({
        data: { title, statement, module_id, total_marks, instruction, createdBy }
    });
}
async function addParticipant({ debate_id, user_id, group }) {
    return prisma.debate_participants.create({
        data: {
            debate_id,
            user_id,
            group
        }
    });
}


async function removeParticipant({ debate_id, user_id }) {
    return prisma.debate_participants.deleteMany({
        where: {
            debate_id,
            user_id
        }
    });
}


async function addResponse({ id, debate_id, user_id, text }) {
  return await prisma.debate_response.create({
    data: {
      id,
      debate_id,
      user_id,
      text
    }
  });
}



async function giveMarksAndFeedback(response_id, marks, feedback) {
    return prisma.debate_response.update({
        where: { id: response_id },
        data: { marks, feedback }
    });
}


async function engageResponse({ response_id, user_id, action }) {
    // Try to find an existing engagement
    const existing = await prisma.engagement.findUnique({
        where: {
            res_id_user_id: {
                res_id: response_id,
                user_id
            }
        }
    });
    if (existing) {
        return prisma.engagement.update({
            where: { id: existing.id },
            data: { type: action }
        });
    } else {
        return prisma.engagement.create({
            data: {
                id: uuidv4(),
                res_id: response_id,
                user_id,
                type: action
            }
        });
    }
}



async function getDebateById(debate_id) {
    return prisma.debates.findUnique({
        where: { id: debate_id },
        include: {
            participants: true,
            statements: true
        }
    });
}



async function updateDebate(debate_id, data, updatedBy) {
    return prisma.debates.update({
        where: { id: debate_id },
        data: {
            ...data,
            updatedBy,
            updated_at: new Date()
        }
    });
}


async function deleteDebate(debate_id) {
    return prisma.debates.delete({
        where: { id: debate_id }
    });
}



async function submitDebate({ debate_id, user_id }) {
  return prisma.debate_participants.update({
    where: {
      debate_id_user_id: { debate_id, user_id },
    },
    data: {
      submitted_at: new Date(),
    },
  });
}



async function getUserResponseByDebateId(debate_id, user_id) {
    return prisma.debate_response.findFirst({
        where: {
            debate_id,
            user_id
        },
        select: {
            id: true,
            text: true,
            marks: true,
            feedback: true,
            created_at: true,
            updated_at: true
        }
    });
}

async function getAnalyticDebate(debate_id) {
    const participants = await prisma.debate_participants.count({
        where: { debate_id }
    });
    const responses = await prisma.debate_response.findMany({
        where: {
            debate_id,
            marks: { not: null }
        },
        select: {
            user_id: true,
            marks: true
        }
    });
    if (responses.length === 0) {
        return {
            participants,
            highestMarks: null,
            lowestMarks: null,
            averageMarks: null
        };
    }
    let highest = responses[0];
    let lowest = responses[0];
    let totalMarks = 0;
    for (const res of responses) {
        if (res.marks > highest.marks) highest = res;
        if (res.marks < lowest.marks) lowest = res;
        totalMarks += res.marks;
    }
    const averageMarks = (totalMarks / responses.length).toFixed(2);
    return {
        participants,
        highestMarks: highest,
        lowestMarks: lowest,
        averageMarks
    };
}


async function getDebateParticipantStatuses(debate_id) {
  const participants = await prisma.debate_participants.findMany({
    where: { debate_id },
    select: {
      user_id: true,
      submitted_at: true
    }
  });

  const responses = await prisma.debate_response.findMany({
    where: { debate_id },
    select: {
      user_id: true
    }
  });

  const respondedUserIds = new Set(responses.map(r => r.user_id));

  return participants.map(p => {
    if (p.submitted_at) {
      return { user_id: p.user_id, status: "Completed" };
    } else if (respondedUserIds.has(p.user_id)) {
      return { user_id: p.user_id, status: "Pending" };
    } else {
      return { user_id: p.user_id, status: "Not Attempted" };
    }
  });
}



module.exports = {
    createDebate,
    getDebateById,
    updateDebate,
    deleteDebate,
    getAnalyticDebate,
    addParticipant,
    submitDebate,
    giveMarksAndFeedback,
    engageResponse,
    addResponse,
    removeParticipant,
    getDebateParticipantStatuses,
    getUserResponseByDebateId
};
