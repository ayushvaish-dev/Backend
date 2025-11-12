const calendarDao = require('../../../dao/calendar/calendarDao');
const messages = require('../../../utils/messages');
const {successResponse , errorResponse} = require('../../../utils/apiResponse');
 module.exports = {
  async createEvent(req, res) {
    try {
      let data = { ...req.body };
      data.creatorId = req.user.id;
      if (data.courseName) {
      const courseId = await calendarDao.getCourseIdByName(data.courseName);
      if (!courseId) return errorResponse(req, res, 400, messages.COURSE_NOT_FOUND);
      data.course_id = courseId;
      delete data.courseName;
    }
     const isRecurring = data.isRecurring || data.recurrenceRule;

    let event;
    if (isRecurring) {
      event = await calendarDao.createRecurringEvent(data);
    } else {
      event = await calendarDao.createEvent(data);
    }
      successResponse(req, res, event, 201, messages.RESOURCE_CREATED);

    } catch (err) {
      console.error(err);
      errorResponse(req, res, 500, messages.SERVER_ERROR);

    }
  },

  async getAllEvents(req, res) {
    try {
      const roles = await calendarDao.getUserRoles(req.user.id);
      const roleNames = roles.map(r => r.role);

      const userId = req.user.id;
      let filters = {};
    
      const courseAccessList = await calendarDao.getUserCourseAccess(userId);
      const accessibleCourseIds = courseAccessList.map(ca => ca.course_id);

      if (roleNames.includes('user')) {
      filters = {
        creatorId: userId,
        course_id: { in: accessibleCourseIds },
      };     
     } else if (roleNames.includes('admin') || roleNames.includes('instructor')) {

     filters = {
     course_id: { not: null }, // ensures only course assigned events
      };    
        if (req.query.groupId) {
          filters.groupId = req.query.groupId; 
        }
        if (req.query.userId) {
        
          return errorResponse(req,res,403,messages.ADMIN_INSTRUCTOR_CANNOT_ACCESS);
        }
      } else {
        return errorResponse(req, res, 403, messages.UNAUTHORIZED_ROLE_NOT_FOUND);

      }

      if (req.query.title) {
        filters.title = {
          contains: req.query.title,
          mode: "insensitive",
        };
      }
      if (req.query.startTimeAfter) {
        filters.startTime = { ...filters.startTime, gte: new Date(req.query.startTimeAfter) };
      }
      if (req.query.startTimeBefore) {
        filters.startTime = { ...filters.startTime, lte: new Date(req.query.startTimeBefore) };
      }
      const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
      const events = await calendarDao.getAllEvents(filters, startDate, endDate);
 
      const recurringEvents = events.recurringEvents; // already filtered for recurring in the DAO
      const nonRecurringEvents = events.nonRecurringEvents;

      // Fetch recurrence exceptions for all recurring events in bulk
      const recurringEventIds = recurringEvents.map(ev => ev.id);
      const exceptions = await calendarDao.getRecurrenceExceptionsForEvents(recurringEventIds);

      const exceptionsMap = {};
     for (const exc of exceptions) {
     if (!exceptionsMap[exc.eventId]) exceptionsMap[exc.eventId] = new Set();
     // Store only date part if matching on day level and also include time as needed
     exceptionsMap[exc.eventId].add(exc.occurrence_date.toISOString().split('T')[0]);
   }

     const expandedRecurringEvents = [];

    for (const event of recurringEvents) {
    const occurrences = event.occurrences || [];

    // Filter out occurrences that fall on exception dates
    const filteredOccurrences = occurrences.filter(occ => {
    const occDateStr = occ.startTime.toISOString().split('T')[0]; // Compare date-only part
    return !(exceptionsMap[event.id] && exceptionsMap[event.id].has(occDateStr));
  });

  //  the event with filtered occurrences
  expandedRecurringEvents.push({
    ...event,
    occurrences: filteredOccurrences,
  });
  }

  // Combining non-recurring events with the recurring events 
   const result = [...nonRecurringEvents, ...expandedRecurringEvents];
   successResponse(req, res, result, 200, messages.EVENTS_FETCHED);

    } catch (err) {
      console.error(err);
      errorResponse(req, res, 500, messages.SERVER_ERROR);    }
 },

  async getEventById(req, res) {
    try {
      const event = await calendarDao.getEventById(req.params.id);
      if (!event) return errorResponse(req, res, 404, messages.EVENT_NOT_FOUND);
      successResponse(req, res, event, 200, messages.EVENTS_FETCHED);

    } catch (err) {
      console.error(err);
      errorResponse(req, res, 500, messages.SERVER_ERROR);

  }
  },

  async deleteEvent(req, res) {
    try {
      await calendarDao.deleteEvent(req.params.id);
      res.status(204).end();
    } catch (err) {
      console.error(err);
      errorResponse(req, res, 500, messages.SERVER_ERROR);

    }
  },

  async getEventsByGroup(req, res) {
    try {
      const { groupId } = req.params;
      const events = await calendarDao.getEventsByGroupId(groupId);
      successResponse(req, res, events, 200, messages.EVENTS_FETCHED);

    } catch (err) {
      console.error('Error in getEventsByGroup:', err);
      errorResponse(req, res, 500, messages.SERVER_ERROR);

    }
  },
  async getEventsByCourse (req, res) {
  try {
    const { courseId } = req.params;
    const events = await calendarDao.getEventsByCourseId(courseId);

    successResponse(req, res, events, 200, messages.EVENTS_FETCHED);
  } catch (err) {
    console.error('Error in getEventsByCourse:', err);
    errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
  },

  async createRecurringEvent(req, res) {
    try {
    let data = { ...req.body };
    data.creatorId = req.user.id;
    if (data.courseName) {
      const course_id = await calendarDao.getCourseIdByName(data.courseName);
      if (!course_id) return errorResponse(req, res, 400, messages.COURSE_NOT_FOUND);
      data.course_id = course_id;
      delete data.courseName;
    }
      const event = await calendarDao.createRecurringEvent(data);
      successResponse(req, res, event, 201, messages.RESOURCE_CREATED);

    } catch (err) {
      console.error('Error in createRecurringEvent:', err);
      errorResponse(req, res, 500, messages.SERVER_ERROR);

    }
  },

  async deleteRecurringEvent(req, res) {
    try {
      await calendarDao.deleteRecurringEvent(req.params.id);
      res.status(204).end();
    } catch (err) {
      console.error('Error in deleteRecurringEvent:', err);
      errorResponse(req, res, 500, messages.SERVER_ERROR);

    }
  },

  async getAllRecurringEvents(req, res) {
    try {
      const events = await calendarDao.getAllRecurringEvents();
      successResponse(req, res, events, 200, messages.EVENTS_FETCHED);

    } catch (err) {
      console.error('Error in getAllRecurringEvents:', err);
      errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
  },



  async updateRecurringEvent(req, res) {
    try {
       let data = { ...req.body };
    if (data.courseName) {
      const courseId = await calendarDao.getCourseIdByName(data.courseName);
      if (!courseId) return errorResponse(req, res, 400, messages.COURSE_NOT_FOUND);
      data.courseId = courseId;
      delete data.courseName;
    }
      const updated = await calendarDao.updateRecurringEvent(req.params.id, data);
       successResponse(req, res, updated, 200, messages.RESOURCE_UPDATED);

    } catch (err) {
      console.error('Error in updateRecurringEvent:', err);
      errorResponse(req, res, 500, messages.SERVER_ERROR);

    }
  },
    
  
  async  deleteRecurrenceException(req, res) {
  try {

    const {eventId} = req.params;
    const {occurrenceDate} = req.body;

    if (!occurrenceDate) {
      return errorResponse(req,res,400,messages.OCCURENCE_DATE_REQUIRED);
    }

    const existing = await calendarDao.findByEventAndDate(eventId, occurrenceDate);
    if (!existing) {
      return errorResponse(req,res,404,messages.EXCEPTION_NOT_FOUND);
    }

    await calendarDao.deleteByEventAndDate(eventId, occurrenceDate);   
    return successResponse(req, res, {}, 200, messages.EXCEPTION_DELETED_SUCCESSFULLY);

  } 
  catch (err) {
     return errorResponse(req,res,500, messages.SERVER_ERROR);
  }
 },

  async updateEvent(req, res) {
    try {
    let data = { ...req.body };
    if (data.courseName) {
      const courseId = await calendarDao.getCourseIdByName(data.courseName);
      if (!courseId) return errorResponse(req, res, 400, messages.COURSE_NOT_FOUND);
      data.courseId = courseId;
      delete data.courseName;
    }
      const updatedEvent = await calendarDao.updateEvent(req.params.id,data);
      successResponse(req, res, updatedEvent, 200, messages.RESOURCE_UPDATED);

    } catch (err) {
      console.error(err);
      errorResponse(req, res, 500, messages.SERVER_ERROR);

    }
  },


  async getRecurrenceRule(req, res) {
    try {
      const rule = await calendarDao.getRecurrenceRule(req.params.id);
      if (!rule) return errorResponse(req, res, 404, messages.RECURRENCE_NOT_FOUND);
      successResponse(req, res, rule, 200, messages.EVENTS_FETCHED);

    } catch (err) {
      console.error('Error in getRecurrenceRule:', err);
      errorResponse(req, res, 500, messages.SERVER_ERROR);

    }
  },
  
  async getRecurrenceExceptionsByEventId(req, res) {
  try {
    const { eventId } = req.params;

    const exceptions = await calendarDao.getRecurrenceExceptionsByEventId(eventId);
    if (!exceptions || exceptions.length === 0) {
      return errorResponse(req, res, 404, messages.EXCEPTION_NOT_FOUND);
    }

    successResponse(req, res, exceptions, 200, messages.EXCEPTION_FETCHED_SUCCESSFULLY);
  } catch (err) {
    console.error('Error fetching recurrence exceptions:', err);
    errorResponse(req, res, 500, messages.SERVER_ERROR);
  }
  },
    
  async addRecurrenceException(req, res) {
  try {
    const { eventId } = req.params;
    const { occurrenceDate } = req.body;
    const userId = req.user.id;

    if (!occurrenceDate) {
      return errorResponse(req,res,400,messages.OCCURENCE_DATE_REQUIRED);
    }
    
    const existing = await calendarDao.findByEventAndDate(eventId, occurrenceDate);
    if (existing) {
      return errorResponse(req,res,409,messages.EXCEPTION_ALREADY_EXISTS);
    }

    const exception = await calendarDao.create({
      eventId,
      occurrenceDate: new Date(occurrenceDate),
      updated_by: userId,
    });

    return res.status(201).json({ data: exception });
  } catch (err) {
    console.error('Error in addRecurrenceException:', err);
    return errorResponse(req,res,500,messages.SERVER_ERROR);
  }
  },
 
  async getCancelledEventsForUser(req, res){
  const userId = req.user?.id;
  const { startTime, endTime } = req.query;
  if (!startTime || !endTime) {
    return errorResponse(req,res, 400, messages.START_AND_END_TIME_REQUIRED);
  }

  try {
    const cancelledEvents = await calendarDao.getCancelledEventsForUser(
      userId,
      new Date(startTime),
      new Date(endTime)
    );

   return successResponse(req,res, cancelledEvents ,200, messages.CANCELLED_EVENT_FETCHED);

  } catch (err) {
    console.error(' Error fetching cancelled events:', err);
    return errorResponse(req,res, 500, messages.SERVER_ERROR);

  }
},

  async getEventsByDate(req, res) {
    try {
      const { date } = req.params;
      const userId = req.user.id;
      
      // Validate date parameter
      if (!date) {
        return errorResponse(req, res, 400, 'Date parameter is required');
      }

      // Parse the date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return errorResponse(req, res, 400, 'Invalid date format. Please use YYYY-MM-DD format');
      }

      // Get user roles for access control
      const roles = await calendarDao.getUserRoles(userId);
      const roleNames = roles.map(r => r.role);

      // Get events for the specific date
      const events = await calendarDao.getEventsByDate(parsedDate, userId, roleNames);
      
      successResponse(req, res, events, 200, 'Events fetched successfully for the specified date');

    } catch (err) {
      console.error('Error in getEventsByDate:', err);
      errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
  },

  async getAllevents(req, res){
    try{
      const { count } = req.body;
      
      if(!count){
        return errorResponse(req, res, 500, "please provide a number of records to be fetched");
      }

      const Events = await calendarDao.fetchEvents(count);

      return successResponse(req, res, Events, 200, messages.EVENTS_FETCHED)
    }catch(err){
      console.log("error in fetching all events", err);
      return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
    }
  }


  };
