const prisma = require('../../config/prismaClient');
const { sendMail } = require('../../utils/mail');

const WINDOW_MINUTES = parseInt(process.env.EVENT_ABSENCE_WINDOW_MINUTES || '60', 10); 
const GRACE_MINUTES = parseInt(process.env.EVENT_ABSENCE_GRACE_MINUTES || '10', 10);   

async function findExpectedUsersForEvent(event) {
  const participants = await prisma.event_participant.findMany({
    where: { eventId: event.id },
    select: { userId: true },
  });
  if (participants.length > 0) return participants.map(p => p.userId);

  if (event.course_id) {
    const enrollments = await prisma.user_course_access.findMany({
      where: { course_id: event.course_id },
      select: { user_id: true },
    });
    return enrollments.map(e => e.user_id);
  }

  return [];
}

async function findPresentUsersForEvent(eventId) {
  const attendance = await prisma.attendance.findMany({
    where: { event_id: eventId, isPresent: true },
    select: { user_id: true },
  });
  return new Set(attendance.map(a => a.user_id));
}

async function notifyAbsentUserByEmail(userId, event) {
  const relatedId = `${event.id}:${userId}`;

  const existing = await prisma.notifications.findFirst({
    where: {
      user_id: userId,
      type: 'event_absent',
      related_id: relatedId,
      email_sent: true,
    },
    select: { id: true },
  });
  if (existing) return;

  const formattedEnd = new Date(event.endTime).toLocaleString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });

  const title = 'Event Attendance Alert';
  const message = `You were marked absent for event "${event.title}" (ended at ${formattedEnd}).`;

  let notification = await prisma.notifications.findFirst({
    where: { user_id: userId, type: 'event_absent', related_id: relatedId },
    select: { id: true, email_sent: true },
  });

  if (!notification) {
    notification = await prisma.notifications.create({
      data: {
        user_id: userId,
        type: 'event_absent',
        title,
        message,
        related_id: relatedId,
        related_type: 'event',
      },
      select: { id: true, email_sent: true },
    });
  }

  if (notification.email_sent) return;

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { email: true, first_name: true },
  });
  if (!user?.email) return;

  const emailBody = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e6e6;border-radius:8px;">
    <div style="background:#1f6feb;color:#fff;padding:14px 18px;border-top-left-radius:8px;border-top-right-radius:8px;">
      <h2 style="margin:0;font-size:18px;">${title}</h2>
    </div>
    <div style="padding:18px;color:#222;">
      <p style="margin:0 0 10px;">Hi ${user.first_name || 'there'},</p>
      <p style="margin:0 0 12px;">
        You were marked <strong>absent</strong> for the event:
      </p>
      <div style="background:#f6f8fa;border:1px solid #e6e6e6;border-radius:6px;padding:12px;margin:0 0 12px;">
        <p style="margin:0;"><strong>Title:</strong> ${event.title}</p>
        <p style="margin:6px 0 0;"><strong>Ended:</strong> ${formattedEnd}</p>
      </div>
      <p style="margin:0 0 12px;color:#444;">
      </p>
    </div>
    <div style="padding:14px 18px;color:#6b7280;font-size:12px;border-top:1px solid #e6e6e6;">
      <p style="margin:0;">This is an automated message from Athena LMS.</p>
    </div>
  </div>
`;

  try {
    await sendMail(user.email, title, emailBody);
    await prisma.notifications.update({
      where: { id: notification.id },
      data: { email_sent: true },
    });
  } catch (e) {
    console.error('Failed to send absence email:', e?.message || e);
  }
}

async function processRecentlyEndedEvents() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);
  const graceCutoff = new Date(now.getTime() - GRACE_MINUTES * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      endTime: { gt: windowStart, lte: graceCutoff },
    },
    select: { id: true, title: true, endTime: true, course_id: true },
  });

  for (const event of events) {
    const expected = await findExpectedUsersForEvent(event);
    if (expected.length === 0) continue;

    const present = await findPresentUsersForEvent(event.id);
    const absentees = expected.filter(uid => !present.has(uid));
    if (absentees.length === 0) continue;

    for (const userId of absentees) {
      await notifyAbsentUserByEmail(userId, event);
    }
    console.log(`Absent email alerts processed for event ${event.id}: ${absentees.length}`);
  }
}

module.exports = processRecentlyEndedEvents;
