const prisma = require('../../config/prismaClient');
const createQuiz = async (quizData) => {
  try {
    const newQuiz = await prisma.quizzes.create({
      data: {
        module_id: quizData.module_id,
        title: quizData.title,
        type: quizData.type,
        maxAttempts: quizData.maxAttempts ?? null,
        time_estimate: quizData.time_estimate ?? null,
        max_score: quizData.max_score ?? 100,
        min_score: quizData.min_score ?? 30
      }
    });
    return newQuiz;
  } catch (error) {
    console.error('Error creating quiz:', error);
    throw error;
  }
};

const getQuizById = async (quizId) => {
  const quiz = await prisma.quizzes.findUnique({
    where: { id: quizId },
    include: {
      _count: {
        select: { questions: true },
      },
    },
  });

  if (!quiz) return null;

  const questionCount = quiz._count.questions;

  // Assuming 3 marks per question
  const marksPerQuestion = 3;
  const totalScore = questionCount * marksPerQuestion;
  const { _count, ...quizData } = quiz;

  return {
    ...quizData,
    questionCount,
    totalScore,
  };
};




const updateQuizById = async (quizId, data) => {
  return await prisma.quizzes.update({
    where: { id: quizId },
    data,
  });
};



const deleteQuiz = async (quizId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.quiz_question_responses.deleteMany({
        where: {
          question: {
            quiz_id: quizId,
          },
        },
      });
      await tx.question_options.deleteMany({
        where: {
          question: {
            quiz_id: quizId,
          },
        },
      });
      await tx.quiz_questions.deleteMany({
        where: {
          quiz_id: quizId,
        },
      });
      await tx.user_quiz_attempts.deleteMany({
        where: {
          quiz_id: quizId,
        },
      });
      const deletedQuiz = await tx.quizzes.delete({
        where: {
          id: quizId,
        },
      });
      return deletedQuiz;
    });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    throw error;
  }
};


const bulkUploadQuestions = async (quizId, questions) => {
  const createdQuestions = [];

  // Insert each question individually to get its ID
  for (const q of questions) {
    const createdQuestion = await prisma.quiz_questions.create({
      data: {
        quiz_id: quizId,
        question: q.text,
        correct_answer: q.correctAnswer,
        question_type: q.question_type,
      },
    });
    createdQuestions.push(createdQuestion);
  }

  // Prepare all options with correct question IDs
  const allOptions = [];
  createdQuestions.forEach((question, index) => {
    const q = questions[index];
    if (q.question_options && q.question_options.length > 0) {
      q.question_options.forEach(opt => {
        allOptions.push({
          questionId: question.id,
          text: opt.text || '',
          isCorrect: opt.isCorrect ?? null,
          matchWith: opt.matchWith || null,
          orderIndex: opt.orderIndex ?? null,
          category: opt.category || null,
          isCategory: opt.isCategory ?? false
        });
      });
    }
  });

  // Batch insert all options at once
  if (allOptions.length > 0) {
    await prisma.question_options.createMany({ data: allOptions });
  }
  return createdQuestions;
};


const updateQuestionWithOptions = async (quizId, questionId, { question, correct_answer, question_type, question_options }) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.quiz_questions.findUnique({
      where: { id: questionId },
    });
    if (!existing || existing.quiz_id !== quizId) {
      throw new Error('Question not found in specified quiz');
    }
    // Update question
    const updatedQuestion = await tx.quiz_questions.update({
      where: { id: questionId },
      data: {
        question,
        correct_answer,
        question_type,
      },
    });
    // Delete existing options
    await tx.question_options.deleteMany({
      where: { questionId },
    });

    // Format new options
    const formattedOptions = question_options.map((opt, idx) => {
      if (question_type === 'CATEGORIZATION') {
        return {
          questionId,
          text: opt.text,
          category: opt.category || null,
          isCategory: opt.isCategory ?? false,
          orderIndex: opt.orderIndex ?? idx + 1,
        };
      }
      // For other types
      return {
        questionId,
        text: opt.text,
        isCorrect: opt.isCorrect ?? null,
        matchWith: opt.matchWith || null,
        orderIndex: opt.orderIndex ?? idx + 1,
      };
    });
    await tx.question_options.createMany({
      data: formattedOptions,
    });
    return updatedQuestion;
  });
};


const deleteQuestionById = async (quizId, questionId) => {
  return await prisma.$transaction(async (tx) => {
    const question = await tx.quiz_questions.findUnique({
      where: { id: questionId },
    });
    if (!question || question.quiz_id !== quizId) {
      throw new Error('Question not found in this quiz');
    }
    await tx.quiz_question_responses.deleteMany({
      where: { questionId },
    });
    await tx.question_options.deleteMany({
      where: { questionId },
    });
    const deleted = await tx.quiz_questions.delete({
      where: { id: questionId },
    });
    return deleted;
  });
};


const getAllQuestionsByQuizId = async (quizId) => {
  return await prisma.quiz_questions.findMany({
    where: {
      quiz_id: quizId,
    },
    include: {
      question_options: true, 
    },
    orderBy: {
      created_at: 'asc',
    },
  });
};


const getCompletedAttempts = async (quizId) => {
  return await prisma.user_quiz_attempts.findMany({
    where: {
      quiz_id: quizId,
      status: 'COMPLETED',
    },
    select: {
      score: true,
      passed: true,
    },
  });
};


const getTotalQuestionsCount = async (quizId) => {
  return await prisma.quiz_questions.count({
    where: { quiz_id: quizId },
  });
};


const getQuizMeta = async (quizId) => {
  return await prisma.quizzes.findUnique({
    where: { id: quizId },
    select: {
      title: true,
      max_score: true,
      min_score: true,
      time_estimate: true,
    },
  });
};


const getLatestAttempt = async (quizId, userId) => {
  return await prisma.user_quiz_attempts.findFirst({
    where: {
      quiz_id: quizId,
      user_id: userId,
    },
    orderBy: {
      attempt_date: 'desc',
    },
    select: {
      id: true,
      score: true,
      passed: true,
      status: true,
      attempt_date: true,
      remarks: true,
    },
  });
};


const getAnsweredQuestionCount = async (attemptId) => {
  return await prisma.quiz_question_responses.count({
    where: {
      attemptId: attemptId,
    },
  });
};


const getLatestAttemptId = async (quizId, userId) => {
  const latestAttempt = await prisma.user_quiz_attempts.findFirst({
    where: {
      quiz_id: quizId,
      user_id: userId,
    },
    orderBy: {
      attempt_date: 'desc',
    },
    select: {
      id: true,
    },
  });
  return latestAttempt?.id || null;
};


const getQuestionResponsesByAttemptId = async (attemptId) => {
  return await prisma.quiz_question_responses.findMany({
    where: {
      attemptId: attemptId,
    },
    include: {
      question: {
        include: {
          quiz: true,
        },
      },
    },
  });
};


const getRawSubmissionsByQuizId = async (quizId) => {
  return await prisma.user_quiz_attempts.findMany({
    where: { quiz_id: quizId },
    select: {
      id: true,
      user_id: true,
      score: true,
      status: true,
      attempt_date: true,
      remarks: true,
      user: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
        },
      },
    },
    orderBy: {
      attempt_date: 'desc',
    },
  });
};


const getQuizScores = async (quizId) => {
  return await prisma.user_quiz_attempts.findMany({
    where: {
      quiz_id: quizId,
      status: 'COMPLETED'
    },
    select: {
      id: true, 
      user_id: true,
      score: true,
      passed: true,
      attempt_date: true,
      user: {
        select: {
          first_name: true,
          last_name: true,
          email: true
        }
      }
    },
    orderBy: {
      attempt_date: 'asc'
    }
  });
};



// All for users side:

const startOrResumeAttempt = async (userId, quizId) => {
  const quiz = await prisma.quizzes.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: {
          question_options: true,
        }
      }
    }
  });

  if (!quiz) return null;

  // Check max attempts
  const maxAttempts = quiz.maxAttempts;
  if (maxAttempts !== null && maxAttempts !== undefined) {
    const completedAttemptsCount = await prisma.user_quiz_attempts.count({
      where: {
        user_id: userId,
        quiz_id: quizId,
        status: "COMPLETED"
      }
    });

    if (completedAttemptsCount >= maxAttempts) {
      return null;
    }
  }

  // Resume existing pending attempt if found
  let attempt = await prisma.user_quiz_attempts.findFirst({
    where: {
      user_id: userId,
      quiz_id: quizId,
      status: "PENDING"
    }
  });

  if (!attempt) {
    // Create new attempt
    attempt = await prisma.user_quiz_attempts.create({
      data: {
        user_id: userId,
        quiz_id: quizId,
        score: 0,
        passed: false,
        status: "PENDING"
      }
    });
  }

  // Prepare the response format
  return {
    attempt: {
      id: attempt.id,
      quiz_id: attempt.quiz_id,
      status: attempt.status,
      started_at: attempt.attempt_date
    },
    quiz: {
      title: quiz.title,
      max_score: quiz.max_score,
      min_score: quiz.min_score,
      time_limit: quiz.time_estimate,
      maxAttempts: quiz.maxAttempts
    },
    questions: quiz.questions.map(q => ({
      id: q.id,
      text: q.question,
      question_type: q.question_type, 
      options: q.question_options.map(opt => ({
        id: opt.id,
        text: opt.text,
        orderIndex: opt.orderIndex,
        isCategory: opt.isCategory,
        category: opt.category  
      }))
    }))
  };
};


const getQuizQuestionsWithOptions = async (quizId) => {
  return await prisma.quizzes.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { question_options: true }
      }
    }
  });
};

const saveUserQuizAttempt = async (data) => {
  // Find the existing pending attempt
  const existingAttempt = await prisma.user_quiz_attempts.findFirst({
    where: {
      quiz_id: data.quiz_id,
      user_id: data.user_id,
      status: "PENDING"
    }
  });

  if (existingAttempt) {
    // Update that pending attempt
    return await prisma.user_quiz_attempts.update({
      where: { id: existingAttempt.id },
      data: {
        score: data.score,
        submitted_at: data.submitted_at,
        status: data.status,
        passed: data.passed
      }
    });
  }

  // If no pending attempt found
  return await prisma.user_quiz_attempts.create({
    data
  });
};

const saveQuizQuestionResponses = async (attemptId, evaluatedAnswers) => {
  const responses = evaluatedAnswers.map(ans => ({
    attemptId,
    questionId: ans.questionId,
    selected: ans.selected
      ? typeof ans.selected === "object"
        ? JSON.stringify(ans.selected) // handles array or object
        : String(ans.selected)
      : null,
    isCorrect: ans.isCorrect
  }));

  await prisma.quiz_question_responses.createMany({ data: responses });
};



const getLatestQuizAttempt = async (userId, quizId) => {
  let LatestQuizAttempts = await prisma.user_quiz_attempts.findFirst({
    where: {
      user_id: userId,
      quiz_id: quizId
    },
    include: {
      quiz: {
        select: {
          title: true,
          type: true,
        },
      },
    },
    orderBy: {
      attempt_date: 'desc'  
    }
  });

  let quizQuestions = await prisma.quiz_questions.findMany({
    where: {
      quiz_id: quizId
    }
  })

  let questionCount = quizQuestions.length;
  let questionscores = quizQuestions.map(q => q.question_score);
  
  let quizScore = questionscores.reduce((accumulator, score ) => {
    return accumulator + score;
  }, 0);
  
  let percentage = (LatestQuizAttempts.score / quizScore) * 100;


  let totalCorrectAnswers = await prisma.quiz_question_responses.count({
    where: {
      attemptId: LatestQuizAttempts.id,
      isCorrect: true
    }
  });
  
  return {LatestQuizAttempts, percentage,  quizScore, questionCount, totalCorrectAnswers};
};



const getQuizMaxAttempts = async (quizId) => {
  return await prisma.quizzes.findUnique({
    where: { id: quizId },
    select: { maxAttempts: true },
  });
};


const getUserAttemptCount = async (userId, quizId) => {
  return await prisma.user_quiz_attempts.count({
    where: {
      user_id: userId,
      quiz_id: quizId,
      status: "COMPLETED"
    },
  });
};



const getQuizzesByModule = async (moduleId) => {
  return await prisma.quizzes.findMany({
    where: { module_id: moduleId },
    select: {
      id: true,
      title: true,
      time_estimate : true,
    }
  });
};


module.exports = {
  createQuiz,
  getQuizById,
  updateQuizById,
  deleteQuiz,
  bulkUploadQuestions,
  updateQuestionWithOptions,
  deleteQuestionById,
  getAllQuestionsByQuizId,
  getCompletedAttempts,
  getTotalQuestionsCount,
  getLatestAttempt,
  getAnsweredQuestionCount,
  getLatestAttemptId,
  getQuestionResponsesByAttemptId,
  getRawSubmissionsByQuizId,
  getQuizMeta,
  startOrResumeAttempt,
  getQuizQuestionsWithOptions,
  saveUserQuizAttempt,
  saveQuizQuestionResponses,
  getQuizScores,
  getLatestQuizAttempt,
  getQuizMaxAttempts,
  getUserAttemptCount,
  getQuizzesByModule
};

