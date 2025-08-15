// D:\PRJ_YCT_Final\services\calendarService.js

const CoachAvailability = require('../schema/CoachAvailability');
const Appointment = require('../schema/Appointment');
const { publishEvent } = require('./rabbitmqProducer');
const { scheduleFutureEvent } = require('./automationSchedulerService');

// Helper function to get the day of the week (0 for Sunday, 6 for Saturday)
const getDayOfWeek = (date) => new Date(date).getUTCDay();

// Helper function to convert "HH:MM" string to minutes from midnight
const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Calculates all possible available slots based on a coach's settings for a given day.
 */
const getAvailableSlots = async (coachId, date) => {
    const coachSettings = await CoachAvailability.findOne({ coachId });
    if (!coachSettings) {
        return [];
    }

    const { workingHours, unavailableSlots, defaultAppointmentDuration, bufferTime, timeZone } = coachSettings;
    const requestedDate = new Date(date);
    const dayOfWeek = getDayOfWeek(date);
    const availableSlots = [];
    const appointmentDuration = defaultAppointmentDuration || 30; // Default to 30 mins

    const todayWorkingHours = workingHours.find(wh => wh.dayOfWeek === dayOfWeek);

    if (!todayWorkingHours) {
        return [];
    }

    const existingAppointments = await Appointment.find({
        coachId: coachId,
        startTime: {
            $gte: requestedDate,
            $lt: new Date(requestedDate.getTime() + 86400000), // Adds one day
        },
    }).sort('startTime');

    const startOfDay = timeToMinutes(todayWorkingHours.startTime);
    const endOfDay = timeToMinutes(todayWorkingHours.endTime);
    let currentTime = startOfDay;

    while (currentTime + appointmentDuration <= endOfDay) {
        const slotStartHour = Math.floor(currentTime / 60);
        const slotStartMinute = currentTime % 60;
        const slotStartTime = new Date(date);
        slotStartTime.setUTCHours(slotStartHour, slotStartMinute, 0, 0);

        const slotEndTime = new Date(slotStartTime.getTime() + appointmentDuration * 60000);

        const isConflicting = existingAppointments.some(appt => {
            const apptEndTime = new Date(appt.startTime.getTime() + appt.duration * 60000);
            return (slotStartTime < apptEndTime && slotEndTime > appt.startTime);
        }) || (unavailableSlots && unavailableSlots.some(slot => {
            const unavailableEnd = new Date(slot.end);
            return (slotStartTime < unavailableEnd && slotEndTime > slot.start);
        }));

        if (!isConflicting) {
            availableSlots.push({
                startTime: slotStartTime.toISOString(),
                duration: appointmentDuration,
                timeZone,
            });
        }
        
        currentTime += appointmentDuration + (bufferTime || 0);
    }

    return availableSlots;
};

/**
 * Handles the full appointment booking process, including conflict checks and event publishing.
 */
const bookAppointment = async (coachId, leadId, startTime, duration, notes, timeZone) => {
    const newAppointmentStartTime = new Date(startTime);
    const newAppointmentEndTime = new Date(newAppointmentStartTime.getTime() + duration * 60000);

    const bookingDate = newAppointmentStartTime.toISOString().split('T')[0];
    const availableSlots = await getAvailableSlots(coachId, bookingDate);

    // Check if the requested slot is actually available
    const isSlotAvailable = availableSlots.some(slot => {
        return new Date(slot.startTime).getTime() === newAppointmentStartTime.getTime();
    });

    if (!isSlotAvailable) {
        throw new Error('The requested time slot is not available.');
    }

    // Create a new appointment in the database
    const newAppointment = await Appointment.create({
        coachId,
        leadId,
        startTime: newAppointmentStartTime,
        duration,
        summary: notes || `New Appointment with Coach ${coachId}`,
        notes,
        timeZone,
    });

    // 1. Publish 'appointment_booked' event to RabbitMQ
    const eventPayload = {
        eventName: 'appointment_booked',
        payload: { appointmentId: newAppointment._id, leadId, coachId },
        relatedDoc: { appointmentId: newAppointment._id, leadId, coachId },
        timestamp: new Date().toISOString()
    };
    await publishEvent('funnelseye_events', 'appointment_booked', eventPayload);

    // 2. Schedule automated reminder events
    const reminderTime24h = new Date(newAppointmentStartTime.getTime() - 24 * 60 * 60 * 1000);
    const reminderTime1h = new Date(newAppointmentStartTime.getTime() - 60 * 60 * 1000);

    const reminderPayload = {
        eventName: 'appointment_reminder_time',
        payload: { appointmentId: newAppointment._id, leadId, coachId },
        relatedDoc: { appointmentId: newAppointment._id, leadId, coachId },
        timestamp: new Date().toISOString()
    };
    
    // Schedule the 24-hour reminder
    await scheduleFutureEvent(reminderTime24h, 'funnelseye_events', 'appointment_reminder_time', reminderPayload);
    
    // Schedule the 1-hour reminder
    await scheduleFutureEvent(reminderTime1h, 'funnelseye_events', 'appointment_reminder_time', reminderPayload);

    return newAppointment;
};

/**
 * Reschedules an existing appointment to a new start time/duration (conflict safe)
 */
const rescheduleAppointment = async (appointmentId, coachId, newStartTime, newDuration) => {
    const appt = await Appointment.findOne({ _id: appointmentId, coachId });
    if (!appt) throw new Error('Appointment not found');
    const targetDate = new Date(newStartTime).toISOString().split('T')[0];
    const available = await getAvailableSlots(coachId, targetDate);
    const isFree = available.some(s => new Date(s.startTime).getTime() === new Date(newStartTime).getTime());
    if (!isFree) throw new Error('Requested new time is not available');
    appt.startTime = new Date(newStartTime);
    appt.duration = newDuration || appt.duration;
    await appt.save();
    return appt;
};

/**
 * Cancels an appointment
 */
const cancelAppointment = async (appointmentId, coachId) => {
    const appt = await Appointment.findOne({ _id: appointmentId, coachId });
    if (!appt) throw new Error('Appointment not found');
    await appt.deleteOne();
    return true;
};

module.exports = {
    getAvailableSlots,
    bookAppointment,
    rescheduleAppointment,
    cancelAppointment
};