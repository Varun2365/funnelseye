// D:\PRJ_YCT_Final\controllers\coachAvailabilityController.js

// We no longer need the `uuid` package.
const CoachAvailability = require('../schema/CoachAvailability');
const Appointment = require('../schema/Appointment'); // <-- New model import

// Utility to wrap async functions for error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @desc    Get coach availability settings
 * @route   GET /api/coach/:coachId/availability
 * @access  Public
 */
const getCoachAvailability = asyncHandler(async (req, res) => {
  const { coachId } = req.params;
  const availability = await CoachAvailability.findOne({ coachId });

  if (!availability) {
    return res.status(200).json({
      success: true,
      data: {
        timeZone: 'UTC',
        workingHours: [],
        unavailableDates: [],
        slotDuration: 30,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: availability,
  });
});

/**
 * @desc    Set or update the authenticated coach's availability
 * @route   POST /api/coach/availability
 * @access  Private (Coach)
 */
const setCoachAvailability = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { timeZone, workingHours, unavailableDates, slotDuration } = req.body;

  if (!workingHours || !Array.isArray(workingHours)) {
    return res.status(400).json({
      success: false,
      message: 'Working hours are required and must be an array.',
    });
  }

  const availability = await CoachAvailability.findOneAndUpdate(
    { coachId: _id },
    {
      timeZone,
      workingHours,
      unavailableDates,
      slotDuration,
    },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: availability,
  });
});

/**
 * @desc    Get available booking slots for a coach on a specific day
 * @route   GET /api/coach/:coachId/available-slots?date=YYYY-MM-DD
 * @access  Public
 */
const getAvailableSlots = asyncHandler(async (req, res) => {
  const { coachId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({
      success: false,
      message: 'Date is required to find available slots.',
    });
  }

  const coachSettings = await CoachAvailability.findOne({ coachId });

  if (!coachSettings) {
    return res.status(404).json({
      success: false,
      message: 'Coach availability not found.',
    });
  }

  // Get existing appointments from the database
  const existingAppointments = await Appointment.find({
    coachId: coachId,
    startTime: {
      $gte: new Date(date),
      $lt: new Date(date + 'T23:59:59.999Z'),
    },
  });

  const availableSlots = getAvailableSlotsFromSettings(
    coachSettings,
    existingAppointments,
    date
  );

  res.status(200).json({
    success: true,
    date,
    slots: availableSlots,
  });
});

const getAvailableSlotsFromSettings = (coachSettings, existingAppointments, date) => {
  // Your actual logic to calculate available slots goes here.
  // This is a placeholder for demonstration.
  if (existingAppointments && existingAppointments.length > 0) {
    return [];
  }
  return [
    { startTime: `${date}T09:00:00.000Z`, duration: 60 },
    { startTime: `${date}T10:00:00:000Z`, duration: 60 },
  ];
};

/**
 * @desc    Book an appointment with a coach
 * @route   POST /api/coach/:coachId/book
 * @access  Public
 */
const bookAppointment = asyncHandler(async (req, res) => {
  const { coachId } = req.params;
  const { leadId, startTime, duration, notes, timeZone } = req.body;

  if (!leadId || !startTime || !duration) {
    return res.status(400).json({
      success: false,
      message: 'Lead ID, start time, and duration are required.',
    });
  }

  const newAppointmentStartTime = new Date(startTime);
  const newAppointmentEndTime = new Date(newAppointmentStartTime.getTime() + duration * 60000);

  // 1. Fetch all appointments for the day from the database
  const bookingDate = newAppointmentStartTime.toISOString().split('T')[0];
  const existingAppointments = await Appointment.find({
    coachId: coachId,
    startTime: {
      $gte: new Date(bookingDate),
      $lt: new Date(new Date(bookingDate).getTime() + 86400000), // Check all appointments for the day
    },
  });

  // 2. Safely check for time conflicts
  const isConflicting = existingAppointments.some(appt => {
    const existingEndTime = new Date(appt.startTime.getTime() + appt.duration * 60000);
    
    return (
      (newAppointmentStartTime >= appt.startTime && newAppointmentStartTime < existingEndTime) ||
      (appt.startTime >= newAppointmentStartTime && appt.startTime < newAppointmentEndTime)
    );
  });

  // 3. If a conflict is found, return an error
  if (isConflicting) {
    return res.status(409).json({
      success: false,
      message: 'The requested time slot is already booked.',
    });
  }

  // 4. If there are no conflicts, create a new appointment in the database
  const newAppointment = await Appointment.create({
    coachId,
    leadId,
    startTime: newAppointmentStartTime,
    duration,
    summary: notes || `New Appointment with Coach ${coachId}`,
    notes,
    timeZone,
  });

  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully.',
    appointmentDetails: newAppointment,
  });
});

/**
 * @desc    Get a full calendar view for a coach, including available and booked slots
 * @route   GET /api/coach/:coachId/calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * @access  Public
 */
const getCoachCalendar = asyncHandler(async (req, res) => {
  const { coachId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Both startDate and endDate are required to view the calendar.',
    });
  }

  const coachSettings = await CoachAvailability.findOne({ coachId });
  if (!coachSettings) {
    return res.status(404).json({
      success: false,
      message: 'Coach availability not found.',
    });
  }

  // Get all existing appointments for the date range from the database
  const existingAppointments = await Appointment.find({
    coachId: coachId,
    startTime: {
      $gte: new Date(startDate),
      $lt: new Date(new Date(endDate).getTime() + 86400000), // Adds one day to the end date
    },
  });

  const calendar = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    const dateString = currentDate.toISOString().split('T')[0];

    const appointmentsForDay = existingAppointments.filter(
      (appt) => appt.startTime.toISOString().startsWith(dateString)
    );

    const availableSlots = getAvailableSlotsFromSettings(
      coachSettings,
      appointmentsForDay,
      dateString
    );
    
    const daySchedule = {
      date: dateString,
      appointments: appointmentsForDay,
      availableSlots: availableSlots,
    };

    calendar.push(daySchedule);

    currentDate.setDate(currentDate.getDate() + 1);
  }

  res.status(200).json({
    success: true,
    data: calendar,
  });
});

module.exports = {
  getCoachAvailability,
  setCoachAvailability,
  getAvailableSlots,
  bookAppointment,
  getCoachCalendar,
};