const dao = require('../../dao/support/supportTicketDao.js');
const { successResponse, errorResponse } = require('../../utils/apiResponse.js');
const { sendMail } = require('../../utils/mail.js');
const messages = require('../../utils/messages.js');
const { createTicketReplyNotificationInternal } = require('../notifications/notificationController.js');
const {
  createTicketSchema,
  addReplySchema,
} = require('../../validator/supportTicketValidation.js');
exports.createTicket = async (req, res) => {
  try {
    const student_id = req.user.id;
    const { error, value } = createTicketSchema.validate(req.body);
    if (error) {
      return errorResponse(req, res, 400, error.details[0].message);
    }

    const attachmentUrls = req.files?.map(file => file.path) || [];

    const ticket = await dao.createTicket({
      student_id,
      ...value,
      attachments: JSON.stringify(attachmentUrls),
    });
    const ticketWithStudent = await dao.getTicketById(ticket.id);

if (ticketWithStudent?.student?.email) {
  const emailSubject = `Ticket Registered – ID: ${ticketWithStudent.id}`;
  const emailBody = `
Hello ${ticketWithStudent.student.first_name || 'Customer'},

Your support ticket has been successfully registered.
Ticket ID: ${ticketWithStudent.id}
Our support team will review your request and get back to you shortly.

Thank you for reaching out to us.

Best regards,
Creditor Academy Support Team
`;
  await sendMail(ticketWithStudent.student.email, emailSubject, emailBody);
}
    return successResponse(req, res, ticket, 201, messages.TICKET_CREATED_SUCCESS);
  } catch (error) {
    console.error('Ticket Creation Error:', error);
    return errorResponse(req, res, 500, messages.TICKET_CREATION_FAILED);
  }
};

exports.getTicketsByStudent = async (req, res) => {
  try {
    const student_id = req.user.id;
    const tickets = await dao.getTicketsByStudent(student_id);
    return successResponse(req, res, tickets, 200, messages.TICKET_FETCHED_SUCCESS);
  } catch (err) {
    console.error('Get Tickets Error:', err);
    return errorResponse(req, res, 500, messages.TICKET_FETCH_FAILED);
  }
};


exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await dao.getAllTickets();
    return successResponse(req, res, tickets, 200, messages.ALL_TICKETS_FETCHED);
  } catch (err) {
    console.error('Get All Tickets Error:', err);
    return errorResponse(req, res, 500, messages.ALL_TICKETS_FAILED);
  }
};


exports.addReply = async (req, res) => {
  try {
    const { ticket_id } = req.params;

   
    const { error, value } = addReplySchema.validate(req.body);
    if (error) {
      return errorResponse(req, res, 400, error.details[0].message);
    }

    const sender_id = req.user.id;

    const reply = await dao.addReply({
      ticket_id,
      sender_id,
      ...value,
    });
      
    
    const ticket = await dao.getTicketById(ticket_id);
if (ticket?.student?.email) {
  const emailSubject = `Ticket Resolved – ID: ${ticket_id}`;
  const emailBody = `
Hello ${ticket.student.first_name || 'Customer'},

We’re pleased to inform you that your ticket has been resolved.
Ticket ID: ${ticket_id}

You can view the resolution details here: https://lmsathena.com

If you have any further concerns, please feel free to reply to this message.

Best regards,
Creditor Academy Support Team
`;
  await sendMail(ticket.student.email, emailSubject, emailBody);
}
try {
      await createTicketReplyNotificationInternal(ticket.id, ticket.student_id);
      console.log(" Ticket reply notification created for student:", ticket.student_id);
    } catch (notifError) {
      console.error("Failed to create ticket reply notification:", notifError);
    }


    return successResponse(req, res, reply, 200, messages.REPLY_ADDED_SUCCESS);
  } catch (err) {
    console.error('Add Reply Error:', err);
    return errorResponse(req, res, 500, messages.REPLY_ADD_FAILED);
  }
};
exports.updateTicketStatus = async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!allowedStatuses.includes(status)) {
      return errorResponse(req, res, 400, messages.INVALID_TICKET_STATUS);
    }

    const updatedTicket = await dao.updateTicketStatus(ticket_id, status);
    return successResponse(req, res, updatedTicket, 200, messages.TICKET_STATUS_UPDATED);
  } catch (err) {
    console.error('Update Ticket Status Error:', err);
    return errorResponse(req, res, 500, messages.TICKET_STATUS_UPDATE_FAILED);
  }
};
