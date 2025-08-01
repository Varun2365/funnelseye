// D:\PRJ_YCT_Final\controllers\coachAvailabilityController.js

const CoachAvailability = require('../schema/CoachAvailability');
const generic_calendar = require('../services/generic_calendar_service');
const async = require('../middleware/async');
const moment = require('moment-timezone');

// @desc    Get coach's availability settings
// @route   GET /api/coach/:coachId/availability
// @access  Public
const getCoachAvailability = async(async (req, res, next) => {
    const coachId = req.params.coachId;
    const availability = await CoachAvailability.findOne({ coachId });
    if (!availability) {
        return res.status(404).json({ success: false, message: 'Coach availability settings not found.' });
    }
    res.status(200).json({ success: true, data: availability });
});

// @desc    Set or update coach's availability settings
// @route   POST /api/coach/availability
// @access  Private (Coach)
const setCoachAvailability = async(async (req, res, next) => {
    const coachId = req.coachId;
    const { workingHours, unavailableSlots, defaultAppointmentDuration, bufferTime, timeZone, funnelSpecificSettings } = req.body;
    let availability = await CoachAvailability.findOneAndUpdate(
        { coachId },
        { workingHours, unavailableSlots, defaultAppointmentDuration, bufferTime, timeZone, funnelSpecificSettings },
        { new: true, upsert: true, runValidators: true }
    );
    res.status(200).json({ success: true, data: availability });
});

// @desc    Calculate and return available booking slots for a coach
// @route   GET /api/coach/:coachId/available-slots
// @access  Public
const getAvailableSlots = async(async (req, res, next) => {
    const coachId = req.params.coachId;
    const funnelId = req.query.funnelId; // <-- NEW: Get funnelId from query params
    const todayInCoachTZ = moment().tz('Asia/Kolkata');
    const startDate = moment.tz(req.query.startDate || todayInCoachTZ.format('YYYY-MM-DD'), 'YYYY-MM-DD', 'Asia/Kolkata');
    const endDate = moment.tz(req.query.endDate || todayInCoachTZ.clone().add(7, 'days').format('YYYY-MM-DD'), 'YYYY-MM-DD', 'Asia/Kolkata');

    if (!startDate.isValid() || !endDate.isValid() || startDate.isAfter(endDate)) {
        return res.status(400).json({ success: false, message: 'Invalid date range provided.' });
    }

    const availabilitySettings = await CoachAvailability.findOne({ coachId });
    if (!availabilitySettings) {
        return res.status(404).json({ success: false, message: 'Coach availability settings not found.' });
    }

    // --- NEW LOGIC: Determine which settings to use ---
    let { workingHours, unavailableSlots, defaultAppointmentDuration, bufferTime, timeZone } = availabilitySettings;

    if (funnelId && availabilitySettings.funnelSpecificSettings) {
        const funnelSpecific = availabilitySettings.funnelSpecificSettings.find(s => s.funnelId.toString() === funnelId);
        if (funnelSpecific) {
            // Override with funnel-specific values if they exist
            if (funnelSpecific.defaultAppointmentDuration) {
                defaultAppointmentDuration = funnelSpecific.defaultAppointmentDuration;
            }
            if (funnelSpecific.bufferTime) {
                bufferTime = funnelSpecific.bufferTime;
            }
        }
    }
    // --- END OF NEW LOGIC ---

    const searchResult = await generic_calendar.search({
        start_datetime: startDate.format('YYYYMMDDTHHMM'),
        end_datetime: endDate.format('YYYYMMDDTHHMM')
    });
    const existingEvents = searchResult.events || [];
    const bookedSlots = existingEvents.map(event => ({
        start: moment.tz(event.start_time, timeZone),
        end: moment.tz(event.start_time, timeZone).add(moment.duration(event.duration).asMinutes(), 'minutes')
    }));
    const allBlockedSlots = [...bookedSlots, ...unavailableSlots.map(slot => ({ start: moment.tz(slot.start, timeZone), end: moment.tz(slot.end, timeZone) }))];

    const availableSlots = [];
    let currentDay = startDate.clone();
    while (currentDay.isSameOrBefore(endDate, 'day')) {
        const dayOfWeek = currentDay.day();
        const dayWorkingHours = workingHours.filter(wh => wh.dayOfWeek === dayOfWeek);
        if (dayWorkingHours.length > 0) {
            dayWorkingHours.forEach(workingHour => {
                let slotStart = currentDay.clone().hour(parseInt(workingHour.startTime.split(':')[0])).minute(parseInt(workingHour.startTime.split(':')[1]));
                let slotEnd = currentDay.clone().hour(parseInt(workingHour.endTime.split(':')[0])).minute(parseInt(workingHour.endTime.split(':')[1]));
                if (currentDay.isSame(todayInCoachTZ, 'day')) {
                    const nowPlusBuffer = todayInCoachTZ.clone().add(defaultAppointmentDuration + bufferTime, 'minutes');
                    if (slotStart.isBefore(nowPlusBuffer)) {
                        slotStart = nowPlusBuffer;
                    }
                    if (slotStart.isAfter(slotEnd)) return;
                }
                while (slotStart.clone().add(defaultAppointmentDuration, 'minutes').isSameOrBefore(slotEnd)) {
                    const proposedSlotEnd = slotStart.clone().add(defaultAppointmentDuration, 'minutes');
                    const proposedSlotWithBufferEnd = proposedSlotEnd.clone().add(bufferTime, 'minutes');
                    const isOverlap = allBlockedSlots.some(blocked => (slotStart.isBefore(blocked.end) && proposedSlotWithBufferEnd.isAfter(blocked.start)));
                    if (!isOverlap) {
                        availableSlots.push({ start: slotStart.toISOString(), end: proposedSlotEnd.toISOString(), coachTimeZone: timeZone });
                    }
                    slotStart = proposedSlotEnd.clone().add(bufferTime, 'minutes');
                }
            });
        }
        currentDay.add(1, 'day');
    }
    res.status(200).json({ success: true, count: availableSlots.length, data: availableSlots });
});

module.exports = {
    getCoachAvailability,
    setCoachAvailability,
    getAvailableSlots
};