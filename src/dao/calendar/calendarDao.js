const prisma = require('../../config/prismaClient');
const { generateOccurrencesForEvent } = require('../../routes/cron/scheduler'); 

async function getAllEvents(filters = {}, startDate = null, endDate = null) {
  const { groupId , course_id } = filters;

  //  default range if no filters are provided
const from = startDate || new Date('2025-07-01T00:00:00Z');  // July 1, 2025 start
const to = endDate || new Date('2026-07-31T23:59:59Z');  //july 31, 2026 end

const nonRecurringEvents = await prisma.event.findMany({
    where: {
      isRecurring: false,
      ...(groupId && { groupId }),
      ...(course_id && { course_id }),
      startTime: { gte: from },
      endTime: { lte: to },
    },
  });


  const recurringEvents = await prisma.event.findMany({
    where: {
      isRecurring: true,
      ...(groupId && { groupId }),
      ...(course_id && { course_id }),
    },
    include: {
      recurrenceRule: true,
    },
  });

  //  Fetch all exceptions
  const exceptions = await prisma.recurrence_exception.findMany();

  const exceptionsMap = {};
  for (const ex of exceptions) {
    const dateStr = new Date(ex.occurrence_date).toISOString().split('T')[0];
    if (!exceptionsMap[ex.eventId]) {
      exceptionsMap[ex.eventId] = new Set();
    }
    exceptionsMap[ex.eventId].add(dateStr);
  }

  // Expand recurring events to instances
  const expandedRecurringEvents = [];

  for (const event of recurringEvents) {
    const occurrences = generateOccurrencesForEvent(event, from, to);

    // Filter out occurrences falling on exceptions
    const filteredOccurrences = occurrences.filter((occ) => {
      const occDateStr = occ.startTime.toISOString().split('T')[0];
      return !(
        exceptionsMap[event.id] &&
        exceptionsMap[event.id].has(occDateStr)
      );
    });

    expandedRecurringEvents.push({
      ...event,
      occurrences: filteredOccurrences,
    });
  }

  return {
    nonRecurringEvents,
    recurringEvents: expandedRecurringEvents,
  };
  }

// Standalone function listEvents
async function listEvents() {
  const events = await prisma.event.findMany({
    include: {
      recurrenceRule: true,
    },
  });

  return events.map(event => {
    if (event.recurrenceRule) {
      const occurrences = generateOccurrencesForEvent(
        event,
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)//it is only calculating recurrences till next month
      );
      return { ...event, occurrences };
    }
    return event;
  });
}

module.exports = {
  createEvent: async (data) => {
    return prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        groupId: data.groupId,
        calendarType: data.calendarType,
        visibility: data.visibility,
        course_id: data.course_id,
        creatorId: data.creatorId,
        recurrenceRule: data.recurrenceRule
          ? {
              create: {
                frequency: data.recurrenceRule.frequency,
                interval: data.recurrenceRule.interval,
                endDate: data.recurrenceRule.endDate,
              },
            }
          : undefined,
      },
      include: {
        recurrenceRule: true,
      },
    });
  },

  getUserRoles: async(user_id) => {
    return await prisma.user_roles.findMany({
      where: { user_id },
    });
  },

  getEventById: async (eventId) => {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        recurrenceRule: true,
      },
    });

    if (event && event.recurrenceRule) {
      const occurrences = generateOccurrencesForEvent(
        event,
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );
      return { ...event, occurrences };
    }

    return event;
  },

  updateEvent: async (eventId, data) => {
    return prisma.event.update({
      where: { id: eventId },
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        groupId: data.groupId,
        recurrenceRule: data.recurrenceRule
          ? {
              upsert: {
                create: {
                  frequency: data.recurrenceRule.frequency,
                  interval: data.recurrenceRule.interval,
                  endTime: data.recurrenceRule.endTime,
                },
                update: {
                  frequency: data.recurrenceRule.frequency,
                  interval: data.recurrenceRule.interval,
                  endTime: data.recurrenceRule.endTime,
                },
              },
            }
          : undefined,
      },
      include: {
        recurrenceRule: true,
      },
    });
  },

  deleteEvent: async (eventId) => {
    const exists = await prisma.event.findUnique({ where: { id: eventId } });
    if (!exists) {
      throw new Error(`Event with ID ${eventId} not found.`);
    }
    return prisma.event.delete({
      where: { id: eventId },
    });
  },

  createRecurringEvent: async (data) => {
    return prisma.event.create({
      data: {
        ...data,
        recurrenceRule: {
          create: data.recurrenceRule,
        },
      },
      include: { recurrenceRule: true },
    });
  },

  deleteRecurringEvent: async (eventId) => {
    const exists = await prisma.event.findUnique({ where: { id: eventId } });
    if (!exists) {
      throw new Error(`Event with ID ${eventId} not found.`);
    }
    return prisma.event.delete({ where: { id: eventId } });
  },

  getRecurrenceExceptionsByEventId: async (eventId) => {
  return prisma.recurrence_exception.findMany({
    where: { eventId },
    include: {
      event: true, 
    },
  });
  },

  getAllRecurringEvents: async () => {
    return prisma.event.findMany({
      where: {
        recurrenceRule: { isNot: null },
      },
      include: { recurrenceRule: true },
    });
  },

  getRecurrenceRule: async (eventId) => {
    return prisma.recurrence_rule.findUnique({
      where: { eventId: eventId },
    });
  },

  updateRecurringEvent: async (eventId, data) => {
    const { recurrenceRule, ...eventData } = data;

    // Update the event
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: eventData,
      include: { recurrenceRule: true },
    });

    if (recurrenceRule) {
      await prisma.recurrence_rule.update({
        where: { eventId: eventId },
        data: recurrenceRule,
      });
    }

    // Return the updated event
    return prisma.event.findUnique({
      where: { id: eventId },
      include: { recurrenceRule: true },
    });
  },

  getUserById: async (userId) => {
    return prisma.users.findUnique({
      where: { id: userId },
    });
  },

  addParticipants: async (eventId, participants) => {
    return prisma.event_participant.createMany({
      data: participants.map((p) => ({
        eventId: eventId,
        userId: p.userId,
        role: p.role || "VIEWER",
      })),
      skipDuplicates: true,
    });
  },

  removeParticipant: async (eventId, userId) => {
    return prisma.event_participant.delete({
      where: {
        eventId_userId: {
          eventId: eventId,
          userId: userId,
        },
      },
    });
  },

  getParticipants: async (eventId) => {
    return prisma.event_participant.findMany({
      where: { eventId },
      include: {
        user: true,
      },
    });
  },

  createReminder: async (data) => {
    return prisma.reminder.create({
      data: {
        eventId: data.eventId,
        userId: data.userId,
        triggerTime: data.triggerTime,
        method: data.method,
      },
    });
  },

  deleteReminder: async (reminderId) => {
    return prisma.reminder.delete({
      where: { id: reminderId },
    });
  },

  getAllReminders: async (eventId) => {
    return prisma.reminder.findMany({
      where: { eventId },
      orderBy: { triggerTime: 'asc' },
    });
  },

  updateReminder: async (reminderId, data) => {
    return prisma.reminder.update({
      where: { id: reminderId },
      data,
    });
  },

  getRemindersByEvent: async (eventId) => {
    return prisma.reminder.findMany({
      where: {
        eventId: eventId,
      },
    });
  },

  getUserCourseAccess: async (userId) => {
    return prisma.user_course_access.findMany({
      where: { user_id: userId },
      select: { course_id: true },
    });
  },

  getCourseIdByName: async (courseName) => {
    const course = await prisma.courses.findFirst({
      where: {
        title: {
          equals: courseName,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });
    return course ? course.id : null;
  },

 findByEventAndDate: async (eventId, occurrenceDate) => {
  return prisma.recurrence_exception.findUnique({
    where: {
      eventId_occurrence_date: {
        eventId,
        occurrence_date: new Date(occurrenceDate),
      },
    },
  });
  },

  create: async ({ eventId, occurrenceDate, updated_by }) => {
    return prisma.recurrence_exception.create({
      data: {
        eventId,
        occurrence_date: occurrenceDate,
        UpdatedBy: updated_by,
      },
    });
  },
  
 deleteByEventAndDate: async (eventId, occurrenceDate) => {
  return prisma.recurrence_exception.delete({
    where: {
      eventId_occurrence_date: {
        eventId,
        occurrence_date: new Date(occurrenceDate),
      }
    }
  });
  },

  getRecurrenceExceptionsForEvents: async (eventIds) => {
    return prisma.recurrence_exception.findMany({
      where: { eventId: { in: eventIds } },
      select: { eventId: true, occurrence_date: true },
    });
  },

  getEventsByGroupId: async (groupId) => {
    return await prisma.event.findMany({
      where: {
        groupId: groupId,
      },
    });
  },

  getEventsByCourseId: async (courseId) => {
    return await prisma.event.findMany({
      where: {
        course_id: courseId,
      },
    });
  },
  getCancelledEventsForUser: async (userId, startTime, endTime) => {
  return prisma.recurrence_exception.findMany({
    
    where: {
      occurrence_date: {
     gte: startTime,   
     lte: endTime,
      },
      event: {
        course_id: { not: null },
        course: {
          user_course_access: {
            some: {
              user_id: userId,
            },
          },
        },
      },
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          startTime: true,
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });
  },

  getEventsByDate: async (date, userId, userRoles) => {
    // Convert date to start and end of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get user's course access
    const courseAccessList = await prisma.user_course_access.findMany({
      where: { user_id: userId },
      select: { course_id: true }
    });
    const accessibleCourseIds = courseAccessList.map(ca => ca.course_id);

    // Get non-recurring events for the specific date
    const nonRecurringEvents = await prisma.event.findMany({
      where: {
        isRecurring: false,
        startTime: { gte: startOfDay, lte: endOfDay },
        OR: [
          { creatorId: userId },
          { course_id: { in: accessibleCourseIds } }
        ]
      },
      include: {
        course: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // Get recurring events
    const recurringEvents = await prisma.event.findMany({
      where: {
        isRecurring: true,
        OR: [
          { creatorId: userId },
          { course_id: { in: accessibleCourseIds } }
        ]
      },
      include: {
        recurrenceRule: true,
        course: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // Get exceptions for recurring events
    const recurringEventIds = recurringEvents.map(ev => ev.id);
    const exceptions = await prisma.recurrence_exception.findMany({
      where: { eventId: { in: recurringEventIds } }
    });

    const exceptionsMap = {};
    for (const exc of exceptions) {
      if (!exceptionsMap[exc.eventId]) exceptionsMap[exc.eventId] = new Set();
      exceptionsMap[exc.eventId].add(exc.occurrence_date.toISOString().split('T')[0]);
    }

    // Generate occurrences for recurring events and filter for the specific date
    const dateStr = date.toISOString().split('T')[0];
    const eventsForDate = [];

    // Add non-recurring events
    eventsForDate.push(...nonRecurringEvents);

    // Process recurring events
    for (const event of recurringEvents) {
      const occurrences = generateOccurrencesForEvent(event, startOfDay, endOfDay);
      
      // Filter occurrences for the specific date and exclude exceptions
      const dateOccurrences = occurrences.filter(occ => {
        const occDateStr = occ.startTime.toISOString().split('T')[0];
        return occDateStr === dateStr && 
               !(exceptionsMap[event.id] && exceptionsMap[event.id].has(occDateStr));
      });

      // Add each occurrence as a separate event
      dateOccurrences.forEach(occurrence => {
        eventsForDate.push({
          ...event,
          id: `${event.id}_${occurrence.startTime.getTime()}`, // Unique ID for occurrence
          startTime: occurrence.startTime,
          endTime: occurrence.endTime,
          isOccurrence: true,
          originalEventId: event.id
        });
      });
    }

    return eventsForDate;
  },

 
  listEvents,
  getAllEvents,



  async fetchEvents(count){
    return await prisma.event.findMany({
      orderBy : {
        startTime : 'desc'
      },
      take : count
    })
  }

 };
