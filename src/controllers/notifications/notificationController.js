
 const prisma = require('../../config/prismaClient');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await prisma.notifications.findMany({
      where: { user_id: userId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return errorResponse(req, res, 500, messages.ERROR_FETCH_NOTIFICATIONS)  ;
  }
};


const markAsRead = async (req, res) => {
  try {
    // Add this check:
    if (!req.user || !req.user.id) {
      return errorResponse(req, res, 401, messages.UNAUTHORIZED);
    }
    
    const userId = req.user.id;

    await prisma.notifications.updateMany({
      where: { user_id: userId, read: false },
      data: { read: true },
    });

    return successResponse(req, res, null, 200, messages.NOTIFICATIONS_MARKED_READ);
  } catch (error) {
    console.error("Error marking notifications:", error);
    return errorResponse(req, res, 500, messages.ERROR_MARK_READ);
  }
};
const createPaymentNotification = async (req, res) => {
  try {
    const userId = req.user.id;  

    if (!userId) {
      return errorResponse(req, res, 400, messages.ERROR_USER_ID_REQUIRED);
    }

    const notification = await prisma.notifications.create({
      data: {
        user_id: userId,
        type: "PAYMENT",
        title: "Payment Successful",
        message: "Payment of ₹200 received successfully!",
        related_id: null,
        related_type: "PAYMENT",
      },
    });

    res.json({ success: true, notification });
  } catch (error) {
    console.error("Error creating payment notification:", error);
    res.status(500).json({ error: error.message });
  }
};
const createCourseAddedNotificationInternal = async (courseId) => {
  try {
    // 1. Get all users from users table
    const users = await prisma.users.findMany({
      select: { id: true }
    });

    if (users.length > 0) {
      // 2. Get course info
      const course = await prisma.courses.findUnique({
        where: { id: courseId },
        select: { title: true }
      });

      // 3. Prepare notifications
      const notificationsData = users.map((user) => ({
        user_id: user.id,
        title: "New Course Added",
        message: `A new course "${course.title}" has been created.`,
        type: "course",
        related_id: courseId,
        related_type: "course"
      }));

      // 4. Bulk insert notifications
      await prisma.notifications.createMany({
        data: notificationsData,
        skipDuplicates: true
      });

      console.log(`Notifications sent to ${users.length} users`);
    }
  } catch (error) {
    console.error(" Error creating course added notifications:", error);
  }
};
const createModulePublishedNotificationInternal = async (courseId, moduleId) => {
  try {
    // 1. Get enrolled users for this course
    const enrollments = await prisma.user_course_access.findMany({
      where: { course_id: courseId },
      select: { user_id: true },
    });

    if (!enrollments || enrollments.length === 0) {
      console.log(" No enrolled users found, no notifications sent.");
      return;
    }

    // 2. Get module details
    const module = await prisma.modules.findUnique({
      where: { id: moduleId },
      select: { title: true, module_status: true },
    });

    if (!module) {
      console.log(" Module not found, skipping notifications.");
      return;
    }

    if (module.module_status.toLowerCase() !== "published") {
      console.log(" Module is not published, skipping notifications.");
      return;
    }

    // 3. Build notifications for all enrolled users
    const notificationsData = enrollments.map((enroll) => ({
      user_id: enroll.user_id,
      title: "New Module Published",
      message: `A new module "${module.title}" has been published in your course.`,
      type: "MODULE",
      related_id: moduleId,
      related_type: "MODULE",
      created_at: new Date(),   
      updated_at: new Date(),
    }));

    
    const result = await prisma.notifications.createMany({
      data: notificationsData,
      skipDuplicates: true,
    });

    console.log(` ${result.count} notifications created for ${enrollments.length} enrolled users (Module: ${moduleId})`);
  } catch (error) {
    console.error(" Error creating module published notifications:", error);
  }
};
const createQuizAddedNotificationInternal = async (userId, quizId) => {
  try {
    if (!userId || !quizId) {
      throw new Error("User ID and Quiz ID are required");
    }

    const notification = await prisma.notifications.create({
      data: {
        user_id: userId,
        type: "QUIZ",
        title: "New Quiz Added",
        message: `A new quiz with ID ${quizId} has been added to your dashboard.`,
        related_id: quizId,
        related_type: "QUIZ",
      },
    });

    return notification;
  } catch (error) {
    console.error("Error creating quiz notification:", error);
    throw error;
  }
};
const createSystemNotification = async (req, res) => {
  try {
    const userId = req.user.id; 

    const notification = await prisma.notifications.create({
      data: {
        title: "System Alert",
        message: "System update: New features are now live!",
        type: "system",
        user: {
          connect: { id: userId }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: "System notification created successfully",
      data: notification
    });
  } catch (error) {
    console.error("Error creating system notification:", error);
    return errorResponse(req, res, 500, messages.ERROR_CREATE_SYSTEM_NOTIFICATION);
  }
};

const createTicketReplyNotificationInternal = async (ticketId, userId) => {
  try {
    const notification = await prisma.notifications.create({
      data: {
        user_id: userId,
        type: "TICKET",
        title: "New Ticket Reply",
        message: `Our support team has replied to your ticket. Check it out and let us know if you need more help.`,
        related_id: ticketId,
        related_type: "TICKET",
      },
    });

    console.log(" Ticket reply notification created:", notification);
    
    console.log(`Notification added for user ${userId}, Ticket ID: ${ticketId}`); 

    return notification;
  } catch (error) {
    console.error(" Error creating ticket reply notification:", error);
    throw error;
  }
};
// Add these functions to your existing notificationController.js

const createWelcomeNotificationInternal = async (userId, userDetails) => {
  try {
    if (!userId || !userDetails) {
      throw new Error("User ID and user details are required");
    }

    const notification = await prisma.notifications.create({
      data: {
        user_id: userId,
        type: "WELCOME",
        title: "Welcome to Athena LMS! 🎉",
        message: `Welcome ${userDetails.first_name}! We're excited to have you join our learning community. Start exploring courses and begin your learning journey!`,
        related_id: userId,
        related_type: "USER",
        email_sent: false,
      },
    });

    console.log(`Welcome notification created for user ${userId}`);
    return notification;
  } catch (error) {
    console.error("Error creating welcome notification:", error);
    throw error;
  }
};

const sendWelcomeEmailInternal = async (userDetails) => {
  try {
    const { sendMail } = require('../../utils/mail.js');
    
    const emailSubject = 'Welcome to Athena LMS - Your Learning Journey Starts Here! 🎉';
    const emailBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Athena LMS</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .features { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Athena LMS! 🎉</h1>
                <p>Your Learning Journey Starts Here</p>
            </div>
            <div class="content">
                <h2>Hello ${userDetails.first_name}! 👋</h2>
                <p>We're absolutely thrilled to welcome you to Athena LMS, your gateway to endless learning opportunities!</p>
                
                <div class="features">
                    <h3>🚀 What's Next?</h3>
                    <ul>
                        <li><strong>Explore Courses:</strong> Browse our extensive library of courses</li>
                        <li><strong>Track Progress:</strong> Monitor your learning journey</li>
                        <li><strong>Join Community:</strong> Connect with fellow learners</li>
                        <li><strong>Get Certified:</strong> Earn certificates upon completion</li>
                    </ul>
                </div>

                <div class="features">
                    <h3>🎯 Quick Start Guide:</h3>
                    <ol>
                        <li>Complete your profile setup</li>
                        <li>Browse available courses</li>
                        <li>Enroll in your first course</li>
                        <li>Start learning and track your progress</li>
                    </ol>
                </div>

                <p style="text-align: center;">
                    <a href="https://lmsathena.com/dashboard" class="button">Start Learning Now</a>
                </p>

                <p>If you have any questions or need assistance, our support team is here to help!</p>
                
                <div class="footer">
                    <p>Best regards,<br>The Athena LMS Team</p>
                    <p>📧 support@lmsathena.com | 🌐 <a href="https://lmsathena.com">lmsathena.com</a></p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    await sendMail(userDetails.email, emailSubject, emailBody);
    console.log(`Welcome email sent to ${userDetails.email}`);
    return true;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
};

const checkAndCreateWelcomeNotification = async (userId) => {
  try {
    // Check if this is user's first login by looking at activity logs
    const loginActivities = await prisma.activity_log.findMany({
      where: {
        userId: userId,
        action: 'USER_LOGIN'
      },
      orderBy: { createdAt: 'asc' }
    });

    // If this is the first login (only 1 login activity)
    if (loginActivities.length === 1) {
      // Get user details
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          created_at: true
        }
      });

      if (user) {
        // Check if welcome notification already exists
        const existingWelcomeNotification = await prisma.notifications.findFirst({
          where: {
            user_id: userId,
            type: 'WELCOME'
          }
        });

        if (!existingWelcomeNotification) {
          // Create welcome notification
          const notification = await createWelcomeNotificationInternal(userId, user);
          
          // Send welcome email
          try {
            await sendWelcomeEmailInternal(user);
            
            // Update notification to mark email as sent
            await prisma.notifications.update({
              where: { id: notification.id },
              data: { email_sent: true }
            });
            
            console.log(`Welcome notification and email sent to user ${userId} (${user.email})`);
          } catch (emailError) {
            console.error(`Failed to send welcome email to ${user.email}:`, emailError);
            // Notification is still created, just email failed
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in checkAndCreateWelcomeNotification:", error);
    // Don't throw error to avoid breaking login flow
  }
};

// Update your module.exports to include the new functions
module.exports = {
  getNotifications,
  markAsRead,
  createPaymentNotification,
  createSystemNotification,
  createCourseAddedNotificationInternal,
  createQuizAddedNotificationInternal,
  createModulePublishedNotificationInternal,
  createTicketReplyNotificationInternal,
  // Add these new functions
  createWelcomeNotificationInternal,
  sendWelcomeEmailInternal,
  checkAndCreateWelcomeNotification
};
