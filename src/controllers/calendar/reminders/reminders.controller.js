const calendarDao = require('../../../dao/calendar/calendarDao');
const messages = require('../../../utils/messages');

module.exports = {
 async createReminder(req, res) {
  try {
    const { eventId, userId, triggerTime, method } = req.body;

    // Validate required fields
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required." });
    }
    if (!triggerTime) {
      return res.status(400).json({ error: "triggerTime is required." });
    }
    if (!method) {
      return res.status(400).json({ error: "method is required." });
    }

    // Create reminder
    const reminder = await calendarDao.createReminder({
      eventId,
      userId,       // can be null
      triggerTime,
      method,
    });

    res.status(201).json({ message: messages.RESOURCE_CREATED, data: reminder });
  } catch (err) {
    console.error("Error creating reminder:", err);
    res.status(500).json({ error: messages.SERVER_ERROR });
  }
},

  async getRemindersByEvent(req, res) {
    try {
      const reminders = await calendarDao.getRemindersByEvent(req.params.eventId);
      res.status(200).json({ message: messages.REMINDERS_FETCHED, data: reminders });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: messages.SERVER_ERROR });
    }
  },

  async getRemindersByUser(req, res) {
    try {
      const reminders = await calendarDao.getRemindersByUser(req.params.userId);
      res.status(200).json({ message: messages.REMINDERS_FETCHED, data: reminders });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: messages.SERVER_ERROR });
    }
  },

  async getAllReminders(req, res) {
    try {
      const reminders = await calendarDao.getAllReminders();
      res.status(200).json({ message: messages.REMINDERS_FETCHED, data: reminders });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: messages.SERVER_ERROR });
    }
  },

  async deleteReminder(req, res) {
    try {
      await calendarDao.deleteReminder(req.params.reminderId);
      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: messages.SERVER_ERROR });
    }
  },
   async updateReminder(req, res) {
  try {
    const reminderId = req.params.reminderId;
    const data = req.body;

    const updated = await calendarDao.updateReminder(reminderId, data);

    res.status(200).json({ message: messages.RESOURCE_UPDATED, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: messages.SERVER_ERROR });
  }
}
};
