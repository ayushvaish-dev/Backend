const calendarDao = require('../../../dao/calendar/calendarDao');
const messages = require('../../../utils/messages');

exports.addParticipants = async (req, res) => {
  const { id } = req.params;
  const participants = req.body;

  try {
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'Invalid input', message: messages.INVALID_PARTICIPANT_ARRAY });
    }

    const event = await calendarDao.getEventById(id);
    if (!event) {
      return res.status(404).json({ error: messages.EVENT_NOT_FOUND });
    }

    for (const p of participants) {
      if (!p.userId || !p.role) {
        return res.status(400).json({ error: messages.MISSING_PARTICIPANT_FIELDS });
      }

      const user = await calendarDao.getUserById(p.userId);
      if (!user) {
        return res.status(404).json({ error: messages.USER_NOT_FOUND, message: `User ${p.userId} not found` });
      }
    }

    const results = await calendarDao.addParticipants(id, participants);
    res.status(201).json({ message: messages.PARTICIPANT_ADDED, data: results });

  } catch (error) {
    console.error('Error adding participants:', error);
    res.status(500).json({ error: messages.ADD_PARTICIPANTS_FAILED, message: error.message });
  }
};

exports.addSingleParticipant = async (req, res) => {
  const { eventId } = req.params;
  const { userId, role } = req.body;

  try {
    if (!userId || !role) {
      return res.status(400).json({ error: messages.MISSING_USER_ID_OR_ROLE });
    }

    const event = await calendarDao.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: messages.EVENT_NOT_FOUND });
    }

    const user = await calendarDao.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: messages.USER_NOT_FOUND });
    }

    const participant = await calendarDao.addSingleParticipant(eventId, userId, role);
    res.status(201).json({ message: messages.PARTICIPANT_ADDED, data: participant });

  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({ error: messages.ADD_PARTICIPANT_FAILED, message: error.message });
  }
};

exports.getParticipants = async (req, res) => {
  const { eventId } = req.params;

  try {
    const event = await calendarDao.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: messages.EVENT_NOT_FOUND });
    }

    const participants = await calendarDao.getParticipants(eventId);
    res.status(200).json({ message: messages.PARTICIPANTS_FETCHED, data: participants });

  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: messages.FETCH_PARTICIPANTS_FAILED, message: error.message });
  }
};

exports.removeParticipant = async (req, res) => {
  const { eventId, userId } = req.params;

  try {
    const event = await calendarDao.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: messages.EVENT_NOT_FOUND });
    }

    const user = await calendarDao.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: messages.USER_NOT_FOUND });
    }

    await calendarDao.removeParticipant(eventId, userId);
    res.status(200).json({ message: messages.PARTICIPANT_REMOVED });

  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({ error: messages.REMOVE_PARTICIPANT_FAILED, message: error.message });
  }
};
