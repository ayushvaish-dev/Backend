const prisma = require('../../config/prismaClient');
exports.createTicket = (data) => {
  return prisma.support_ticket.create({ data }); 
};

exports.getTicketsByStudent = (student_id) => {
  return prisma.support_ticket.findMany({
    where: { student_id },
    include: { replies: true },
  });
};

exports.getAllTickets = () => {
  return prisma.support_ticket.findMany({
    include: {
      student: true,
      replies: {
        include: { sender: true },
      },
    },
  });
};

exports.addReply = (data) => {
  return prisma.ticket_reply.create({ data });
};
exports.updateTicketStatus = (ticketId, status) => {
  return prisma.support_ticket.update({
    where: { id: ticketId },
    data: { status }
  });
};
exports.getTicketById = (ticketId) => {
  return prisma.support_ticket.findUnique({
    where: { id: ticketId },
    include: {
      student: true
    }
  });
};