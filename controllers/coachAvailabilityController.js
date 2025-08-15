// D:\PRJ_YCT_Final\controllers\coachAvailabilityController.js

// --- Imports ---
const CoachAvailability = require('../schema/CoachAvailability');
const Appointment = require('../schema/Appointment');
const { getAvailableSlots, bookAppointment: bookAppointmentService, rescheduleAppointment, cancelAppointment } = require('../services/calendarService'); // <-- NEW: Import from the new service

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
  const availability = await CoachAvailability.findOne({ coachId : coachId });
  if (!availability) {
    return res.status(200).json({
      success: true,
      data: {
        timeZone: 'UTC',
        workingHours: [],
        unavailableSlots: [], // <-- CORRECTED: Changed 'unavailableDates' to 'unavailableSlots'
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
 * @route   POST /api/coach/availability
 * @access  Private (Coach)
 */
const setCoachAvailability = asyncHandler(async (req, res) => {
    // Check if the user is authenticated
    if (!req.user || !req.user._id) {
        console.error('Authentication Error: req.user is undefined or missing _id');
        return res.status(401).json({
            success: false,
            message: 'Not authorized. Please log in.'
        });
    }

    const { _id } = req.user;
    // FIX: Use 'unavailableSlots' to match the schema
    const { timeZone, workingHours, unavailableSlots, slotDuration, bufferTime } = req.body;

    if (!workingHours || !Array.isArray(workingHours)) {
        return res.status(400).json({
            success: false,
            message: 'Working hours are required and must be an array.',
        });
    }

    try {
        const availability = await CoachAvailability.findOneAndUpdate(
            { coachId: _id },
            {
                timeZone,
                workingHours,
                // FIX: Use 'unavailableSlots' to match the schema
                unavailableSlots,
                defaultAppointmentDuration: slotDuration, // <-- This was a bug, the schema field is different
                bufferTime,
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: availability,
        });
    } catch (error) {
        console.error('Error saving availability settings:', error.message);
        res.status(500).json({
            success: false,
            message: 'An error occurred while saving availability settings.',
            error: error.message
        });
    }
});
/**
 * @desc    Get available booking slots for a coach on a specific day
 * @route   GET /api/coach/:coachId/available-slots?date=YYYY-MM-DD
 * @access  Public
 */
const getAvailableSlotsController = asyncHandler(async (req, res) => {
  const { coachId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({
      success: false,
      message: 'Date is required to find available slots.',
    });
  }
  
  // <-- CHANGED: Now calls the service function
  const availableSlots = await getAvailableSlots(coachId, date);

  res.status(200).json({
    success: true,
    date,
    slots: availableSlots,
  });
});

/**
 * @desc    Book an appointment with a coach
 * @route   POST /api/coach/:coachId/book
 * @access  Public
 */
const bookAppointmentController = asyncHandler(async (req, res) => {
  const { coachId } = req.params;
  const { leadId, startTime, duration, notes, timeZone } = req.body;

  // <-- CHANGED: Now calls the service function for booking logic
  const newAppointment = await bookAppointmentService(coachId, leadId, startTime, duration, notes, timeZone);

  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully.',
    appointmentDetails: newAppointment,
  });
});

/**
 * @desc    Reschedule an existing appointment (protected)
 * @route   PUT /api/coach/appointments/:id/reschedule
 * @access  Private (Coach/Admin/Staff)
 */
const rescheduleAppointmentController = asyncHandler(async (req, res) => {
  const appointmentId = req.params.id;
  const { newStartTime, newDuration } = req.body;

  if (!newStartTime) {
    return res.status(400).json({ success: false, message: 'newStartTime is required.' });
  }

  const updated = await rescheduleAppointment(appointmentId, req.coachId, newStartTime, newDuration);

  res.status(200).json({
    success: true,
    message: 'Appointment rescheduled successfully.',
    appointmentDetails: updated,
  });
});

/**
 * @desc    Cancel an appointment (protected)
 * @route   DELETE /api/coach/appointments/:id
 * @access  Private (Coach/Admin/Staff)
 */
const cancelAppointmentController = asyncHandler(async (req, res) => {
  const appointmentId = req.params.id;
  await cancelAppointment(appointmentId, req.coachId);
  res.status(200).json({ success: true, message: 'Appointment cancelled.' });
});

/**
 * @desc    Get a full calendar view for a coach, including available and booked slots
 * @route   GET /api/coach/:coachId/calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * @access  Public
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
  
  const calendar = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    const dateString = currentDate.toISOString().split('T')[0];

    // <-- CHANGED: Now calls the service function to get slots for the day
    const availableSlots = await getAvailableSlots(coachId, dateString);

    // Get all existing appointments for the day from the database
    // This part can also be moved into the service later if we need to centralize it.
    const existingAppointments = await Appointment.find({
      coachId: coachId,
      startTime: {
        $gte: new Date(dateString),
        $lt: new Date(new Date(dateString).getTime() + 86400000),
      },
    });
    
    const daySchedule = {
      date: dateString,
      appointments: existingAppointments,
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
  getAvailableSlots: getAvailableSlotsController, // <-- CHANGED: Export the new controller function
  bookAppointment: bookAppointmentController, // <-- CHANGED: Export the new controller function
  getCoachCalendar,
  rescheduleAppointment: rescheduleAppointmentController,
  cancelAppointment: cancelAppointmentController,
};