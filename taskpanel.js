const mongoose = require('mongoose');

const TaskSchema =  mongoose.Schema({
    title: {
        type: String,
        required:true,
    },
    description: {
        type: String,
        required:true
    },
    dueDate: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        required:true
    },
    status: {
        type: String,
        required:true
    },
    assignedUsers:{
        type: String,
        required: true,
    }
});



const taskpanel = mongoose.model("task", TaskSchema);
module.exports = taskpanel