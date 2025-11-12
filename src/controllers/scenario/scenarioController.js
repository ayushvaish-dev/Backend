const messages = require('../../utils/messages');
const {successResponse, errorResponse} = require('../../utils/apiResponse');
const scenarioDao = require('../../dao/scenario/scenarioDao');
const {
  scenarioSchema, scenarioUpdateSchema, scenarioIdParamSchema, 
  decisionIdParamSchema, createDecisionsBodySchema, createChoicesBodySchema,
  scenarioIdRequiredParamSchema}
  = require('../../validator/scenarioValidate');


const createScenario = async (req, res) => {
    try {
        const { error, value } = scenarioSchema.validate(req.body);
        if (error) {
            return errorResponse(req, res, 400, error.details[0].message);
        }
        const scenario = await scenarioDao.createScenario(value);
        
        return successResponse(req, res, scenario, 201, messages.SCENARIO_CREATED_SUCCESSFULLY);
    } catch (error) {
        console.error("Error creating scenario:", error);
        return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
    }
};



const updateScenario = async (req, res) => {
    try {
        const paramResult = scenarioIdParamSchema.validate(req.params);
        if (paramResult.error) {
            return errorResponse(req, res, 400, paramResult.error.details[0].message);
        }
        const { id } = paramResult.value;
        const { error, value } = scenarioUpdateSchema.validate(req.body);
        if (error) {
            return errorResponse(req, res, 400, error.details[0].message);
        }
        const updatedScenario = await scenarioDao.updateScenario(id, value);
        
        if (!updatedScenario) { 
            return errorResponse(req, res, 404, messages.SCENARIO_NOT_FOUND);
        }
        return successResponse(req, res, updatedScenario, 200, messages.SCENARIO_UPDATED_SUCCESSFULLY);
    } catch (error) {
        console.error("Error updating scenario:", error);
        return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
    }
};



const deleteScenario = async (req, res) => {
  try {
    const { scenarioId } = req.params;
    if (!scenarioId) {
      return errorResponse(req, res, 400, messages.SCENARIO_ID_REQUIRED);
    }
    const deleted = await scenarioDao.deleteScenario(scenarioId);
    if (!deleted) {
      return errorResponse(req, res, 404, messages.SCENARIO_NOT_FOUND);
    }
    return successResponse(req, res, deleted, 200, messages.SCENARIO_DELETED);
  } catch (error) {
    console.error("Error deleting scenario:", error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const createDecision = async (req, res) => {
    try {
        const paramResult = scenarioIdRequiredParamSchema.validate(req.params);
        if (paramResult.error) {
            return errorResponse(req, res, 400, paramResult.error.details[0].message);
        }
        const { scenarioId } = paramResult.value;
        const bodyResult = createDecisionsBodySchema.validate(req.body);
        if (bodyResult.error) {
            return errorResponse(req, res, 400, bodyResult.error.details[0].message);
        }
        const { decisions } = bodyResult.value;
        
        const newDecisions = await scenarioDao.createDecision(scenarioId, decisions);
        
        return res.status(201).json({
            success: true,
            message: "Decisions created successfully",
            data: newDecisions,
        });
    } catch (error) {
        console.error("Error creating decision(s):", error);
        return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
    }
};


const createChoices = async (req, res) => {
    try {
        const paramResult = decisionIdParamSchema.validate(req.params);
        if (paramResult.error) {
            return errorResponse(req, res, 400, paramResult.error.details[0].message);
        }
        const { decisionId } = paramResult.value;
        const bodyResult = createChoicesBodySchema.validate(req.body);
        if (bodyResult.error) {
            return errorResponse(req, res, 400, bodyResult.error.details[0].message);
        }
        const { choices } = bodyResult.value;
        for (const choice of choices) {
            if (choice.nextDecisionId) {
                const nextDecision = await scenarioDao.validateNextDecisionExistence(choice.nextDecisionId);
               
                if (!nextDecision) {
                    return errorResponse(req, res, 400, `Invalid nextDecisionId: ${choice.nextDecisionId}`);
                }
            }
        }
        const newChoices = await scenarioDao.createChoices(decisionId, choices);
        return successResponse(req, res, newChoices, 201, messages.CHOICES_CREATED_SUCCESSFULLY);
    } catch (error) {
        console.error("Error creating choices:", error);
        return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
    }
};





const getScenariosByModule = async (req, res) => {
  try {
    const { module_id } = req.params;

    if (!module_id) {
      return errorResponse(req, res, 400, messages.MODULE_ID_REQUIRED);
    }
    const scenarios = await scenarioDao.getScenariosByModule(module_id);
    if (scenarios.length === 0) {
      return errorResponse(req, res, 404, messages.NO_SCENARIOS_FOUND_FOR_MODULE);
    }
    return successResponse(req, res, scenarios, 200, messages.SCORES_FETCHED_SUCCESSFULLY);
  } catch (error) {
    console.error("Error fetching scenarios by module:", error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const getScenario = async (req, res) => {
  try {
    const { scenarioId } = req.params;

    if (!scenarioId) {
      return errorResponse(req, res, 400, messages.SCENARIO_ID_REQUIRED);
    }
    const scenario = await scenarioDao.getScenario(scenarioId);
    if (!scenario) {
      return errorResponse(req, res, 404, messages.SCENARIO_NOT_FOUND);
    }
    return successResponse(req, res, scenario, 200, messages.SCORES_FETCHED_SUCCESSFULLY);
  } catch (error) {
    console.error("Error fetching scenario:", error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const startScenarioAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { scenarioId } = req.params;

    const data = await scenarioDao.startOrResumeScenarioAttempt(userId, scenarioId);
    if (!data) {
      return errorResponse(
        req,
        res,
        403,
        messages.MAX_ATTEMPTS_REACHED_OR_SCENARIO_NOT_FOUND
      );
    }
    return successResponse(req, res, data, 200, messages.SCENARIO_ATTEMPT_STARTED);
  } catch (error) {
    console.error("Error starting/resuming scenario:", error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};



const submitScenarioResponse = async (req, res) => {
  try {
    const { attemptId, choiceId } = req.body;

    if (!attemptId || !choiceId) {
      return errorResponse(req, res, 400, messages.MISSING_REQUIRED_FIELDS);
    }
    const result = await scenarioDao.submitResponseAndCalculateScore(attemptId, choiceId);
    if (!result) {
      return errorResponse(req, res, 404, messages.ATTEMPT_OR_CHOICE_NOT_FOUND);
    }
    return successResponse(req, res, result, 200, messages.RESPONSE_SUBMITTED_AND_SCORE_UPDATED);
  } catch (error) {
    console.error('Error submitting scenario response:', error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const getScenarioUserAttempts = async (req, res) => {
  try {
    const { scenarioId } = req.params;
    if (!scenarioId) {
      return errorResponse(req, res, 400, messages.SCENARIO_ID_REQUIRED);
    }
    const attempts = await scenarioDao.getScenarioAttemptsByScenarioId(scenarioId);
    
    // Group attempts by user
    const grouped = {};
    attempts.forEach((a) => {
      const userId = a.user_id;
      if (!grouped[userId]) {
        grouped[userId] = {
          userId,
          name: `${(a.user.first_name || a.user.firstName || '').trim()} ${(a.user.last_name || a.user.lastName || '').trim()}`.trim(),
          email: a.user.email || null,
          totalAttempts: 0,
          attempts: []
        };
      }

      grouped[userId].totalAttempts += 1;
      grouped[userId].attempts.push({
        attemptId: a.id,
        attemptNo: a.attempt_no,
        score: a.score,
        status: a.status,
        completedAt: a.completed_at
      });
    });

    return successResponse(req, res, Object.values(grouped), 200, messages.SCENARIO_ATTEMPTS_FETCHED || 'Scenario attempts fetched');
  } catch (error) {
    console.error('Error fetching scenario user attempts:', error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const getScenarioScore = async (req, res) => {
  try {
    const { scenarioId } = req.params;  
    const userId = req.user.id;          

    const result = await scenarioDao.getScenarioScore(userId, scenarioId);
    if (!result) {
      return errorResponse(req, res, 404, messages.ATTEMPT_NOT_FOUND);
    }
    return successResponse(req, res, result, 200, messages.SCORES_FETCHED_SUCCESSFULLY);
  } catch (error) {
    console.error("Error fetching scenario score:", error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const getRemainingScenarioAttempts = async (req, res) => {
  try {
    const userId = req.user.id;          
    const { scenarioId } = req.params;  
    const scenario = await scenarioDao.getScenarioMaxAttempts(scenarioId);
    if (!scenario) {
      return errorResponse(req, res, 404, messages.SCENARIO_NOT_FOUND);
    }
    const attempted = await scenarioDao.getUserScenarioAttemptCount(userId, scenarioId);

    const maxAttempts = scenario.max_attempts || 1;
    const remaining = Math.max(0, maxAttempts - attempted);
    return successResponse(
      req,
      res,
      { scenarioId, maxAttempts, attempted, remainingAttempts: remaining },
      200,
      messages.REMAINING_ATTEMPTS_FETCHED
    );
  } catch (error) {
    console.error("Error fetching remaining scenario attempts:", error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


module.exports = { 
  createScenario, 
  createDecision, 
  createChoices, 
  getScenariosByModule, 
  updateScenario, 
  getScenario,
  deleteScenario,
  startScenarioAttempt,
  submitScenarioResponse,
  getScenarioUserAttempts,
  getScenarioScore,
  getRemainingScenarioAttempts
};
