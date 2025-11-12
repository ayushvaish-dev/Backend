const debateDao = require('../../dao/debate/debateDao');
const prisma = require('../../config/prismaClient');
const { v4: uuidv4 } = require('uuid');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
const {
  debateSchema,
  addParticipantSchema,
  responseSchema,
  giveMarksSchema,
} = require('../../validator/debateValidate');
//create debate
async function createDebate(req, res) {
  try {
    const { error, value } = debateSchema.validate(req.body);
    if (error) return errorResponse(req, res, 400, error.details[0].message);
    // Extract user ID from token
    const userId = req.user?.id;
    if (!userId) return errorResponse(req, res, 401, messages.USER_ID_REQUIRED);
    const debateData = {
      ...value,
      createdBy: userId,
    };
    const debate = await debateDao.createDebate(debateData);
    return successResponse(req, res, debate, 201, messages.DEBATE_CREATED_SUCCESSFULLY);
  } catch (err) {
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}
// Add Participant
async function addParticipant(req, res) {
  try {
    const { error, value } = addParticipantSchema.validate(req.body);
    if (error) return errorResponse(req, res, 400, error.details[0].message);
    const participant = await debateDao.addParticipant(value);
    return successResponse(req, res, participant, 201, messages.PARTICIPANT_CREATED);
  } catch (err) {
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}

// Remove Participant
async function removeParticipant(req, res) {
  try {
    const { debate_id, user_id } = req.body;
    if (!debate_id || !user_id) {
      return errorResponse(req, res, 400, messages.DEBATE_ID_REQUIRED);
    }
    const result = await debateDao.removeParticipant({ debate_id, user_id });
    if (result.count === 0) {
      return errorResponse(req, res, 404, messages.PARTICIPANT_NOT_FOUND);
    }
    return successResponse(req, res, null, 200, messages.PARTICIPANT_REMOVE_SUCCESSFULLY);
  } catch (err) {
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}
// Submit Debate
async function submitDebate(req, res) {
  try {
    const { debate_id, user_id } = req.body;
    if (!debate_id || !user_id) {
      return errorResponse(req, res, 400, messages.DEBATE_ID_REQUIRED);
    }

    const participant = await prisma.debate_participants.findUnique({
      where: { debate_id_user_id: { debate_id, user_id } }
    });

    if (!participant) {
      return errorResponse(req, res, 404, messages.PARTICIPANT_NOT_FOUND);
    }

    if (participant.submitted_at !== null) {
      return errorResponse(req, res, 400, messages.DEBATE_ALREADY_SUBMITTED);
    }
    const responseCount = await prisma.debate_response.count({
      where: { debate_id, user_id }
    });

    if (responseCount === 0) {
      return errorResponse(req, res, 400, messages.NEED_RESPONSE_FOR_SUBMITTING);
    }

    const result = await debateDao.submitDebate({ debate_id, user_id });
    return successResponse(req, res, result, 200, messages.DEBATE_SUBMITTED_SUCCESSFULLY);
  } catch (err) {
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}
// Add Response
async function addResponse(req, res) {
  console.log("addResponse - req.body:", req.body);

  const { error, value } = responseSchema.validate(req.body);
  if (error) {
    console.log("addResponse - validation error:", error.details[0].message);
    return errorResponse(req, res, 400, error.details[0].message);
  }
  const id = uuidv4();
  try {
    console.log("addResponse - validated value:", value);
    const newResponse = await debateDao.addResponse({ ...value, id });
    return successResponse(req, res, newResponse, 201, messages.RESPONSE_ADDED_SUCCESSFULLY);
  } catch (err) {
    console.error("addResponse - error:", err);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}

// Give Marks and feedback to Response
async function submitMarksAndFeedback(req, res) {
  try {
    const { error, value } = giveMarksSchema.validate(req.body);
    if (error) {
      return errorResponse(req, res, 400, error.details[0].message);
    }
    const { response_id, marks, feedback } = value;
    // Get total_marks of the debate linked to the response
    const response = await prisma.debate_response.findUnique({
      where: { id: response_id },
      include: {
        debate: {
          select: { total_marks: true }
        }
      }
    });
    if (!response) {
      return errorResponse(req, res, 404, messages.RESPONSE_NOT_FOUND);
    }
    const maxMarks = response.debate.total_marks;
    if (marks > maxMarks) {
      return errorResponse(req, res, 400, `Marks (${marks}) cannot exceed total marks (${maxMarks}).`);
    }
    // Proceed if validation passes
    const result = await debateDao.giveMarksAndFeedback(response_id, marks, feedback);
    return successResponse(req, res, result, 200, messages.MARKS_AND_FEEDBCK_SUCCESSFULLY);
  } catch (err) {
    console.error("submitMarksAndFeedback - error:", err);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}
// Like or Dislike a Response
async function engageResponse(req, res) {
  try {
    const result = await debateDao.engageResponse(req.body);
    if (!result) return errorResponse(req, res, 404, messages.ENGAGEMENT_FAILED);
    return successResponse(req, res, result, 200, messages.ENGAGEMENT_SUCCESSFUL);
  } catch (err) {
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}
// Get Debate by ID
async function getDebateById(req, res) {
  try {
    const debateId = req.params.debate_id;
    const debate = await debateDao.getDebateById(debateId);
    if (!debate) return errorResponse(req, res, 404, messages.DEBATE_NOT_FOUND);
    return successResponse(req, res, debate, 200, messages.DEBATE_FETCHED_SUCCESSFULLY);
  } catch (err) {
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}
//get debate by id
async function getMyDebateResponse(req, res) {
  try {
    const { debate_id, user_id } = req.params;
    if (!debate_id || !user_id) {
      return errorResponse(req, res, 400, messages.DEBATE_ID_REQUIRED);
    }
    const response = await debateDao.getUserResponseByDebateId(debate_id, user_id);
    if (!response) {
      return errorResponse(req, res, 404, messages.RESPONSE_NOT_FOUND);
    }
    return successResponse(req, res, response, 200, messages.RESPONSE_FETCHED_SUCCESSFULLY);
  } catch (err) {
    console.error("getMyDebateResponse - error:", err);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}

//update debate
async function updateDebate(req, res) {
  try {
    const debateId = req.params.debate_id;
    // Get user ID from token
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(req, res, 401, messages.USER_ID_REQUIRED);
    }
    // Merge updated_by into the update data
    const updateData = {
      ...req.body,
      updatedBy: userId
    };
    const updated = await debateDao.updateDebate(debateId, updateData);
    return successResponse(req, res, updated, 200, messages.DEBATE_UPDATED_SUCCESSFULLY);
  } catch (err) {
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}

// Delete Debate
async function deleteDebate(req, res) {
  try {
    const debateId = req.params.debate_id;
    await debateDao.deleteDebate(debateId);
    return successResponse(req, res, null, 200, messages.DEBATE_DELETED_SUCCESSFULLY);
  } catch (err) {
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}
// Get Debate Analytics
async function getDebateAnalytics(req, res) {
  try {
    console.log("Request params:", req.params);
    const debateId = req.params.debate_id;
    if (!debateId) {
      return errorResponse(req, res, 400, messages.DEBATE_ID_REQUIRED);
    }
    const result = await debateDao.getAnalyticDebate(debateId);
    console.log("Analytics result:", result);
    return successResponse(req, res, result, 200, messages.DEBATE_ANALYTICS_FETCHED);
  } catch (error) {
    console.error("Error in getDebateAnalytics:", error);
    return errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
}
// status
async function getParticipantStatus(req, res) {
  try {
    const { debate_id } = req.params;
    if (!debate_id) {
      return errorResponse(req, res, 400, "Debate ID is required");
    }
    const statuses = await debateDao.getDebateParticipantStatuses(debate_id);
    return successResponse(req, res, statuses, 200, "Statuses fetched successfully");
  } catch (err) {
    console.error("getParticipantStatusesController - error:", err);
    return errorResponse(req, res, 500, "Server error");
  }
}


module.exports = {
  createDebate,
  addParticipant,
  submitDebate,
  addResponse,
  submitMarksAndFeedback,
  engageResponse,
  getDebateById,
  updateDebate,
  deleteDebate,
  getDebateAnalytics,
  removeParticipant,
  getMyDebateResponse,
  getParticipantStatus
};
