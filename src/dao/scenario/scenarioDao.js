// src/dao/scenarioDao.js
const prisma = require('../../config/prismaClient');


const createScenario = async (scenarioData) => {
  try {
    const newScenario = await prisma.scenarios.create({
      data: {
        module_id: scenarioData.moduleId, 
        title: scenarioData.title,
        description: scenarioData.description ?? null,
        max_attempts: scenarioData.max_attempts ?? 1,
        avatar_url: scenarioData.avatar_url ?? null,
        background_url: scenarioData.background_url ?? null,
      },
    });
    return newScenario;
  } catch (error) {
    console.error('Error creating scenario:', error);
    throw error;
  }
};


const updateScenario = async (scenarioId, scenarioData) => {
  try {
    const updatedScenario = await prisma.scenarios.update({
      where: {
        id: scenarioId,
      },
      data: {
        module_id: scenarioData.moduleId, 
        title: scenarioData.title,
        description: scenarioData.description,
        max_attempts: scenarioData.max_attempts,
        avatar_url: scenarioData.avatar_url,
        background_url: scenarioData.background_url,
      },
    });
    return updatedScenario;
  } catch (error) {
    console.error("Error updating scenario:", error);
    throw error;
  }
};


const deleteScenario = async (scenarioId) => {
  try {
    const existing = await prisma.scenarios.findUnique({
      where: { id: scenarioId },
    });

    if (!existing) {
      return null; 
    }
    const deleted = await prisma.scenarios.delete({
      where: { id: scenarioId },
    });
    return deleted;
  } catch (error) {
    console.error("DAO deleteScenario error:", error);
    throw error;
  }
};


const createDecision = async (scenarioId, decisionsData) => {
  if (!scenarioId || typeof scenarioId !== "string") {
    throw new Error("Invalid scenarioId (must be UUID string)");
  }

  try {
    const newDecisions = await prisma.$transaction(
      decisionsData.map((decision) =>
        prisma.scenario_decisions.create({
          data: {
            scenario_id: scenarioId,
            description: decision.description ?? null,
            decisionOrder: decision.decisionOrder ?? null,
          },
        })
      )
    );
    return newDecisions;
  } catch (error) {
    console.error("Error creating decisions:", error);
    throw error;
  }
};



const validateNextDecisionExistence = async (nextDecisionId) => {
    return prisma.scenario_decisions.findUnique({
        where: { id: nextDecisionId },
        select: { id: true }
    });
};


const createChoices = async (decisionId, choicesData) => {
  try {
    const newChoices = await prisma.scenario_choices.createMany({
      data: choicesData.map(choice => ({
        decision_id: decisionId,
        text: choice.text,
        branch_type: choice.outcomeType.toUpperCase(),  
        feedback: choice.feedback ?? null,
        next_action: choice.nextAction?.toUpperCase() || "CONTINUE", 
        next_decision_id: choice.nextDecisionId ?? null,
        points: choice.points ?? 0
      })),
      skipDuplicates: true
    });

    return newChoices;
  } catch (error) {
    console.error("Error creating choices:", error);
    throw error;
  }
};


const getScenariosByModule = async (moduleId) => {
  try {
    const scenarios = await prisma.scenarios.findMany({
      where: {
        module_id: moduleId, 
      },
      orderBy: { created_at: "desc" },
    });

    return scenarios;
  } catch (error) {
    console.error("Error in getScenariosByModule DAO:", error);
    throw error;
  }
};


const getScenario = async (scenarioId) => {
  try {
    const scenario = await prisma.scenarios.findUnique({
      where: {
        id: scenarioId,
      },
      include: {
        decisions: {
          include: {
            choices: true, 
          },
        },
      },
    });
    return scenario;
  } catch (error) {
    console.error("Error in getScenarioById DAO:", error);
    throw error;
  }
};


const startOrResumeScenarioAttempt = async (userId, scenarioId) => {
  const scenario = await prisma.scenarios.findUnique({
    where: { id: scenarioId },
    include: {
      decisions: {
        include: {
          choices: true
        }
      }
    }
  });

  if (!scenario) return null;

  // Check max attempts
  const completedAttemptsCount = await prisma.scenario_attempts.count({
    where: {
      user_id: userId,
      scenario_id: scenarioId,
      status: "COMPLETED"
    }
  });
  if (completedAttemptsCount >= scenario.max_attempts) return null;

  // Resume existing in-progress attempt
  let attempt = await prisma.scenario_attempts.findFirst({
    where: {
      user_id: userId,
      scenario_id: scenarioId,
      status: "IN_PROGRESS"
    }
  });

  if (!attempt) {
    // Create new attempt
    attempt = await prisma.scenario_attempts.create({
      data: {
        user_id: userId,
        scenario_id: scenarioId,
        status: "IN_PROGRESS",
        score: 0,
        attempt_no: completedAttemptsCount + 1
      }
    });
  }

  // Prepare response
  return {
    attempt: {
      id: attempt.id,
      scenario_id: attempt.scenario_id,
      status: attempt.status,
      started_at: attempt.started_at
    },
    scenario: {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      max_attempts: scenario.max_attempts,
      avatar_url: scenario.avatar_url,
      background_url: scenario.background_url
    },
    decisions: scenario.decisions.map(decision => ({
      id: decision.id,
      description: decision.description,
      decisionOrder: decision.decisionOrder,
      choices: decision.choices.map(choice => ({
        id: choice.id,
        text: choice.text,
        branch_type: choice.branch_type,
        points: choice.points,
        feedback: choice.feedback,
        next_action: choice.next_action,
        next_decision_id: choice.next_decision_id
      }))
    }))
  };
};


const submitResponseAndCalculateScore = async (attemptId, choiceId) => {
  return await prisma.$transaction(async (tx) => {
    const attempt = await tx.scenario_attempts.findFirst({
      where: { id: attemptId, status: "IN_PROGRESS" },
      select: { id: true, scenario_id: true, score: true, attempt_no: true, status: true }
    });

    if (!attempt) {
      console.error("Attempt not found or not in progress:", attemptId);
      return null;
    }
    const choice = await tx.scenario_choices.findUnique({
      where: { id: choiceId },
      select: {
        id: true,
        decision_id: true,
        points: true,
        next_action: true,
        next_decision_id: true,
        branch_type: true,
      },
    });

    if (!choice) {
      console.error("Choice not found:", choiceId);
      return null;
    }
    const decision = await tx.scenario_decisions.findUnique({
      where: { id: choice.decision_id },
      select: { id: true, scenario_id: true }
    });

    if (!decision) {
      console.error("Decision for choice not found:", choice.decision_id);
      return null;
    }

    if (decision.scenario_id !== attempt.scenario_id) {
      console.error("Choice/Decision does not belong to same scenario as attempt", {
        attemptScenario: attempt.scenario_id,
        decisionScenario: decision.scenario_id
      });
      return null;
    }

    // Create response row
    await tx.scenario_responses.create({
      data: {
        attempt_id: attempt.id,
        decision_id: choice.decision_id,
        choice_id: choice.id,
        points_awarded: choice.points ?? 0,
      },
    });

    // Compute new score 
    const newScore = (attempt.score ?? 0) + (choice.points ?? 0);
    const updateData = {
      score: newScore
    };

    let isScenarioComplete = false;
    let nextDecisionId = choice.next_decision_id ?? null;
    if (choice.branch_type === "FAILURE" || choice.next_action === "END") {
      updateData.status = "COMPLETED";
      updateData.completed_at = new Date();
      isScenarioComplete = true;
      nextDecisionId = null;
    }

    // Update attempt 
    const updatedAttempt = await tx.scenario_attempts.update({
      where: { id: attempt.id },
      data: updateData
    });
    return {
      score: updatedAttempt.score,
      nextDecisionId,
      isScenarioComplete
    };
  });
};


const getScenarioAttemptsByScenarioId = async (scenarioId) => {
  return await prisma.scenario_attempts.findMany({
    where: { scenario_id: scenarioId },
    select: {
      id: true,
      attempt_no: true,
      score: true,
      completed_at: true,
      user_id: true,
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        }
      },
      _count: {
        select: { responses: true }
      }
    },
    orderBy: { attempt_no: 'asc' }
  });
};


const getScenarioScore = async (userId, scenarioId) => {
  const attempt = await prisma.scenario_attempts.findFirst({
    where: {
      user_id: userId,
      scenario_id: scenarioId,
    },
    orderBy: { started_at: "desc" },
    select: { score: true }
  });
  if (!attempt) return null;
  return { score: attempt.score ?? 0 };
};


const getScenarioMaxAttempts = async (scenarioId) => {
  return await prisma.scenarios.findUnique({
    where: { id: scenarioId },
    select: { max_attempts: true }
  });
};


const getUserScenarioAttemptCount = async (userId, scenarioId) => {
  return await prisma.scenario_attempts.count({
    where: {
      user_id: userId,
      scenario_id: scenarioId,
      status: "COMPLETED"   
    },
  });
};



module.exports = { 
  createScenario, 
  createDecision,
  deleteScenario, 
  validateNextDecisionExistence,
  createChoices, 
  getScenariosByModule, 
  updateScenario, 
  getScenario,
  startOrResumeScenarioAttempt,
  submitResponseAndCalculateScore,
  getScenarioAttemptsByScenarioId,
  getScenarioScore,
  getScenarioMaxAttempts,
  getUserScenarioAttemptCount
};