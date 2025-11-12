const QuizDao = require('../../dao/Quiz/QuizDao');
const messages = require('../../utils/messages');
const {successResponse, errorResponse} = require('../../utils/apiResponse');
const {
  quizSchema,quizUpdateSchema,bulkUploadQuestionSchema,updateQuestionSchema} = require('../../validator/quizValidate');


// All for Admin side:
const createQuiz = async (req, res) => {
  try {
    const { error, value } = quizSchema.validate(req.body);
    if (error) {
      return errorResponse(req, res, 400, error.details[0].message);
    }
    const newQuiz = await QuizDao.createQuiz(value);
    
    return successResponse(req, res, newQuiz, 201, messages.QUIZ_CREATED);
  } catch (err) {
    console.error('Error creating quiz:', err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const getQuizById = async (req, res) => {
  try {
    const quizId = req.params.id;
    const quiz = await QuizDao.getQuizById(quizId);

    if (!quiz) {
      return errorResponse(req, res, 404, messages.QUIZ_NOT_FOUND);
    }

    return successResponse(req, res, quiz, 200, messages.QUIZ_FETCHED);
  } catch (error) {
    console.error('Error fetching quiz by ID:', error);
    return errorResponse(req, res, 500, messages.FAILED_TO_FETCH_QUIZ);
  }
};



const updateQuizById = async (req, res) => {
  try {
    const quizId = req.params.id;

    const { error, value } = quizUpdateSchema.validate(req.body);
    if (error) {
      return errorResponse(req, res, 400, error.details[0].message);
    }
    const updatedQuiz = await QuizDao.updateQuizById(quizId, value);
    return successResponse(req, res, updatedQuiz, 200, messages.QUIZ_UPDATED);
  } catch (error) {
    console.error('Error updating quiz:', error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};



const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await QuizDao.deleteQuiz(id);
    return successResponse(req, res, result, 200, messages.QUIZ_AND_RELATED_DATA_DELETED);
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return errorResponse(req, res, 500, messages.FAILED_TO_DELETE_QUIZ);
  }
};

const bulkUploadQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { error, value } = bulkUploadQuestionSchema.validate(req.body);
    if (error) {
      return errorResponse(req, res, 400, error.details[0].message);
    }
    const { texts, correctAnswers, question_types, question_options } = value;

    const formattedQuestions = texts.map((text, index) => ({
      text: text.trim(),
      correctAnswer: correctAnswers[index] || '',
      question_type: question_types[index] || 'MCQ',
      question_options: (question_options && question_options[index])
        ? question_options[index].map((opt, optIndex) => ({
            text: opt.text.trim(),
            isCorrect: opt.isCorrect ?? null,
            matchWith: opt.matchWith || null,
            orderIndex: question_types[index] === 'SEQUENCE' ? optIndex : null,
            category: question_types[index] === 'CATEGORIZATION' ? opt.category || null : null,
            isCategory: question_types[index] === 'CATEGORIZATION' ? (opt.isCategory ?? false) : null
          }))
        : []
    }));
    const addedQuestions = await QuizDao.bulkUploadQuestions(quizId, formattedQuestions);
    return successResponse(req, res, addedQuestions, 201, messages.QUESTIONS_ADDED);
  } catch (error) {
    console.error('Error in bulkUploadQuestions:', error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};



const updateQuestion = async (req, res) => {
  const { quizId, questionId } = req.params;
  const { error, value } = updateQuestionSchema.validate(req.body);
  if (error) {
    return errorResponse(req, res, 400, error.details[0].message);
  }
  const { text, correct_answer, question_type, question_options } = value;
  try {
    const updatedQuestion = await QuizDao.updateQuestionWithOptions(quizId, questionId, {
      question: text,
      correct_answer,
      question_type,
      question_options,
    });
    return successResponse(req, res, updatedQuestion, 200, messages.QUESTION_UPDATED);
  } catch (error) {
    console.error('Error updating question:', error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const deleteQuestion = async (req, res) => {
  const { quizId, questionId } = req.params;
  try {
    const result = await QuizDao.deleteQuestionById(quizId, questionId);
    return successResponse(req, res, result, 200, messages.QUESTION_DELETED);
  } catch (error) {
    console.error('Error deleting question:', error);
    return errorResponse(req, res, 500, error.message || messages.INTERNAL_SERVER_ERROR);

  }
};


const getAllQuestionsByQuizId = async (req, res) => {
  try {
    const { quizId } = req.params;
    const questions = await QuizDao.getAllQuestionsByQuizId(quizId);
    return successResponse(req, res, questions, 200, messages.QUESTIONS_FETCHED);
  } catch (error) {
    console.error('Error in getAllQuestionsByQuizId:', error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};



const getOverallQuizAnalytics = async (req, res) => {
  try {
    const { quizId } = req.params;
    const attempts = await QuizDao.getCompletedAttempts(quizId);
    const totalQuestions = await QuizDao.getTotalQuestionsCount(quizId);
    const quizDetails = await QuizDao.getQuizMeta(quizId);
    const totalAttempts = attempts.length;
    const passedCount = attempts.filter((a) => a.passed).length;
    const failedCount = totalAttempts - passedCount;
    const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
    const averageScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;
    const passPercentage = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;
    const scores = attempts.map((a) => a.score);
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const analytics = {
      quizTitle: quizDetails?.title || "Untitled Quiz",
      totalAttempts,
      totalQuestions,
      passedCount,
      failedCount,
      averageScore,
      passPercentage,
      highestScore,
      lowestScore,
      maxScore: quizDetails?.max_score || 100,
      minScore: quizDetails?.min_score || 30,
      timeEstimate: quizDetails?.time_estimate || null,
    };
    return successResponse(req, res, analytics, 200, messages.ANALYTICS_FETCHED);
  } catch (error) {
    console.error('Error fetching quiz analytics:', error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const getSpecificUserQuizAnalytics = async (req, res) => {
  try {
    const { quizId, userId } = req.params;
    const latestAttempt = await QuizDao.getLatestAttempt(quizId, userId);
    if (!latestAttempt) {
      return successResponse(req,res,{message: 'No attempt found for this user',status: 'NOT_ATTEMPTED'},200,messages.USER_ANALYTICS_FETCHED);
    }
    const totalQuestions = await QuizDao.getTotalQuestionsCount(quizId);
    const answeredCount = await QuizDao.getAnsweredQuestionCount(latestAttempt.id);
    let status = 'NOT_ATTEMPTED';
    if (answeredCount === totalQuestions) status = 'COMPLETED';
    else if (answeredCount > 0) status = 'PENDING';

    const analytics = {
      score: latestAttempt.score,
      passed: latestAttempt.passed,
      status,
      attemptDate: latestAttempt.attempt_date,
      remarks: latestAttempt.remarks || '',
      answeredCount,
      totalQuestions,
    };
    return successResponse(req, res, analytics, 200, messages.USER_ANALYTICS_FETCHED);
  } catch (error) {
    console.error('Error fetching user quiz performance:', error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const getUserQuestionPerformance = async (req, res) => {
  try {
    const { quizId, userId } = req.params;
    const latestAttempt = await QuizDao.getLatestAttemptId(quizId, userId);
    if (!latestAttempt) {
      return successResponse(req, res, { quizId, userId, questionPerformance: [] }, 200, messages.QUESTION_PERFORMANCE_FETCHED);
    }
    const responses = await QuizDao.getQuestionResponsesByAttemptId(latestAttempt);
    const questionPerformance = responses.map(response => {
      const question = response.question;
      return {
        quizTitle: question.quiz.title,
        questionId: response.questionId,
        questionText: question.question,
        userAnswer: response.selected,
        correctAnswer: question.correct_answer,
        isCorrect: response.isCorrect,
        marksObtained: response.isCorrect ? 1 : 0,
      };
    });
    return successResponse(req, res, { quizId, userId, questionPerformance }, 200, messages.QUESTION_PERFORMANCE_FETCHED);
  } catch (error) {
    console.error('Error fetching user question performance:', error);
    return errorResponse(req, res, 500, error.message || messages.INTERNAL_SERVER_ERROR);
  }
};


const getSubmissionStatusByQuizId = async (req, res) => {
  try {
    const { quizId } = req.params;
    const rawSubmissions = await QuizDao.getRawSubmissionsByQuizId(quizId);
    const submissions = rawSubmissions.map(sub => ({
      attemptId: sub.id,
      userId: sub.user_id,
      userName: `${sub.user.first_name} ${sub.user.last_name}`,
      email: sub.user.email,
      status: sub.status,
      score: sub.score,
      attemptDate: sub.attempt_date,
      remarks: sub.remarks || '',
    }));
    const totalEnrolled = submissions.length;
    const completed = submissions.filter(s => s.status === 'COMPLETED').length;
    const pending = submissions.filter(s => s.status === 'PENDING').length;
    const notAttempted = submissions.filter(s => s.status === 'NOT_ATTEMPTED').length;

    const summary = {
      totalEnrolled,
      completed,
      pending,
      notAttempted,
    };
    return successResponse(req,res,{ quizId, summary, submissions },200,messages.SUBMISSION_STATUS_FETCHED);
  } catch (error) {
    console.error('Error fetching quiz submissions:', error);
    return errorResponse(req, res, 500, error.message || messages.INTERNAL_SERVER_ERROR);
  }
};

const getQuizScores = async (req, res) => {
  try {
    const { quizId } = req.params;

    //  Get all attempts with user info
    const results = await QuizDao.getQuizScores(quizId);

    // Get total questions for this quiz
    const quizQuestions = await prisma.quiz_questions.findMany({
      where: { quiz_id: quizId }
    });

    const totalQuestions = quizQuestions.length;
    const marksPerQuestion = 3;
    const maxScore = totalQuestions * marksPerQuestion;

    const grouped = {};
    results.forEach((r) => {
      if (!grouped[r.user_id]) {
        grouped[r.user_id] = {
          userId: r.user_id,
          name: `${r.user.first_name} ${r.user.last_name}`,
          email: r.user.email,
          totalAttempts: 0,
          attempts: []
        };
      }

      grouped[r.user_id].totalAttempts += 1;

      const totalScore = Math.min(r.score, maxScore);
      const percentage = (totalScore / maxScore) * 100;

      grouped[r.user_id].attempts.push({
        attemptId: r.id,
        score: totalScore,                 
        percentage: percentage.toFixed(2), 
        passed: r.passed,
        attemptNumber: grouped[r.user_id].totalAttempts,
        attemptDate: r.attempt_date
      });
    });

    return successResponse(req, res, Object.values(grouped), 200, messages.QUIZ_SCORES_FETCHED);
  } catch (error) {
    console.error('Error fetching quiz scores:', error);
    return errorResponse(req, res, 500, error.message || messages.INTERNAL_SERVER_ERROR);
  }
};


// All for User side:
const startQuizAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;

    const data = await QuizDao.startOrResumeAttempt(userId, quizId);

    if (!data) {
      return errorResponse(
        req,
        res,
        403,
        messages.MAX_ATTEMPTS_REACHED_OR_QUIZ_NOT_FOUND
      );
    }

    return successResponse(req, res, data, 200, messages.QUIZ_ATTEMPT_STARTED);
  } catch (error) {
    console.error("Error starting/resuming quiz:", error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return errorResponse(req, res, 400, "Answers are required");
    }
    const quizData = await QuizDao.getQuizQuestionsWithOptions(quizId);
    if (!quizData || quizData.questions.length === 0) {
      return errorResponse(req, res, 404, messages.QUIZ_NOT_FOUND);
    }
    let totalScore = 0;
    const evaluatedAnswers = answers.map(userAns => {
      const question = quizData.questions.find(q => q.id === userAns.questionId);
      if (!question) return { ...userAns, isCorrect: false };
      let isCorrect = false;

      switch (question.question_type) {
        case "SCQ":
        case "TRUE_FALSE":
        case "ONE_WORD":
          isCorrect =
            question.correct_answer.toLowerCase().trim() ===
            String(userAns.answer).toLowerCase().trim();
          break;

        case "MCQ":
          if (Array.isArray(userAns.answer)) {
            const correctAnswers = question.correct_answer.split(',').map(s => s.trim().toLowerCase());
            const userAnswers = userAns.answer.map(a => String(a).trim().toLowerCase());
            isCorrect =
              userAnswers.length === correctAnswers.length &&
              correctAnswers.every(ans => userAnswers.includes(ans));
          }
          break;

        case "FILL_UPS":
          if (Array.isArray(userAns.answer)) {
            const correctAnswers = question.correct_answer.split(',').map(s => s.trim().toLowerCase());
            const userAnswers = userAns.answer.map(a => String(a).trim().toLowerCase());
            isCorrect =
              userAnswers.length === correctAnswers.length &&
              correctAnswers.every((ans, idx) => userAnswers[idx] === ans);
          }
          break;

        case "SEQUENCE":
          if (Array.isArray(userAns.selectedOptionId)) {
            const userOrder = userAns.selectedOptionId
              .sort((a, b) => a.order - b.order)
              .map(a => a.optionId);
            const correctOrder = question.question_options
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map(opt => opt.id);
            isCorrect =
              correctOrder.length === userOrder.length &&
              correctOrder.every((id, idx) => id === userOrder[idx]);
          }
          break;

       case "CATEGORIZATION":
        if (Array.isArray(userAns.selectedOptionId)) {
        // Map optionId → correctCategory
        const optionMap = Object.fromEntries(
        question.question_options
        .filter(opt => !opt.isCategory) // only draggable items
        .map(opt => [opt.id, opt.category])
         );

        // Check if all draggable items are present in user answer
        const allDraggables = Object.keys(optionMap);
        const placedIds = userAns.selectedOptionId.map(sel => sel.optionId);

        const allPlaced = allDraggables.length === placedIds.length; // ensures nothing left unplaced
        const selected = userAns.selectedOptionId.map(sel => ({
        optionId: sel.optionId,
        category: sel.category,
        correctCategory: optionMap[sel.optionId],
        isPlacedCorrectly: optionMap[sel.optionId] === sel.category
        }));

        // Question is correct only if:
        // 1. All items are placed, AND
        // 2. Every item is placed in the correct category
        isCorrect = allPlaced && selected.every(s => s.isPlacedCorrectly);
        userAns.selected = selected;
        }
        break;
      }
      if (isCorrect) totalScore += question.question_score || 3;
      return {
        questionId: userAns.questionId,
        selected: userAns.selectedOptionId || userAns.answer,
        isCorrect
      };
    });

    const totalQuestions = quizData.questions.length;
    const marksPerQuestion = 3;
    const maxScore = totalQuestions * marksPerQuestion;
    totalScore = evaluatedAnswers.filter(ans => ans.isCorrect).length * marksPerQuestion;

    const percentage = (totalScore / maxScore) * 100;
    const isPassed = percentage >= quizData.min_score;

    const savedAttempt = await QuizDao.saveUserQuizAttempt({
      quiz_id: quizId,
      user_id: userId,
      score: totalScore,
      submitted_at: new Date(),
      status: "COMPLETED",
      passed: isPassed
    });

    await QuizDao.saveQuizQuestionResponses(savedAttempt.id, evaluatedAnswers);
    return successResponse(
      req,
      res,
      {
        attempt_id: savedAttempt.id,
        score: totalScore,
        total_questions: quizData.questions.length,
        answers: evaluatedAnswers
      },
      200,
      "Quiz submitted successfully"
    );
  } catch (error) {
    console.error("Submit Quiz Error:", error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const getUserAttemptedQuizzes = async (req, res) => {
  try {
    const { userId } = req.params;
    const quizzes = await QuizDao.getAttemptedQuizzesByUser(userId);
    return successResponse(req, res, quizzes, 200, messages.ATTEMPTED_QUIZZES_FETCHED);
  } catch (error) {
    console.error('Error fetching attempted quizzes:', error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};

const getLatestAttemptScore = async (req, res) => {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;

    let {LatestQuizAttempts, percentage,  quizScore, questionCount, totalCorrectAnswers} = await QuizDao.getLatestQuizAttempt(userId, quizId);

    if (!LatestQuizAttempts) {
      return errorResponse(req, res, 404, messages.ATTEMPT_NOT_FOUND);
    }

    return res.status(200).json({
      quizId,
      attemptId: LatestQuizAttempts.id,
      quizTitle: LatestQuizAttempts.quiz.title,
      quizType: LatestQuizAttempts.quiz.type,
      userScored: LatestQuizAttempts.score,
      attempt_date: LatestQuizAttempts.attempt_date,
      percentage: percentage,
      quizScore: quizScore,
      questionCount: questionCount,
      totalCorrectAnswers: totalCorrectAnswers,
    });
  } catch (error) {
    console.error('Error fetching latest attempt:', error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};



const getRemainingAttempts = async (req, res) => {
  try {
    const userId = req.user.id;  
    const { quizId } = req.params;

    const quiz = await QuizDao.getQuizMaxAttempts(quizId);
    if (!quiz) {
      return errorResponse(req, res, 404, messages.QUIZ_NOT_FOUND);
    }
    const attempted = await QuizDao.getUserAttemptCount(userId, quizId);
    const maxAttempts = quiz.maxAttempts || 1;
    const remaining = Math.max(0, maxAttempts - attempted);

    return successResponse(
      req,
      res,
      { quizId, maxAttempts, attempted, remainingAttempts: remaining },
      200,
      messages.REMAINING_ATTEMPTS_FETCHED
    );
  } catch (error) {
    console.error('Error fetching remaining attempts:', error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};

const getUserQuizzesForModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const quizzes = await QuizDao.getQuizzesByModule(moduleId);
    const data = quizzes.map(quiz => ({
      quizId: quiz.id,
      title: quiz.title,
      time_estimate : quiz.time_estimate,
    }));

    return successResponse(req, res, data, 200, messages.QUIZZES_FOR_MODULE_FETCHED);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return errorResponse(req, res, 500, error.message || messages.INTERNAL_SERVER_ERROR);
  }
};

module.exports = {
  createQuiz,
  getQuizById,
  updateQuizById,
  deleteQuiz,
  bulkUploadQuestions,
  updateQuestion ,
  deleteQuestion,
  getAllQuestionsByQuizId,
  getOverallQuizAnalytics,
  getSpecificUserQuizAnalytics,
  getUserQuestionPerformance,
  getSubmissionStatusByQuizId,
  getQuizScores,
  startQuizAttempt,
  submitQuiz,
  getUserAttemptedQuizzes,
  getLatestAttemptScore,
  getRemainingAttempts,
  getUserQuizzesForModule
};
