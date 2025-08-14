// D:\PRJ_YCT_Final\schema\Task.js

const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Task name is required.']
    },
    description: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed', 'Overdue'],
        default: 'Pending'
    },
    dueDate: {
        type: Date,
        required: [true, 'Task due date is required.']
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach',
        required: [true, 'A task must be assigned to a coach.']
    },
    relatedLead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: [true, 'A task must be related to a lead.']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Task', TaskSchema);