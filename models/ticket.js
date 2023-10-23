const mongoose = require('mongoose');
const ticketSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: String,
    full_name: String,
    ticket_type: {
        type: String,
        required: true
    },
    open: {
        type: Boolean,
        default: true
    },
    message: String,
    date: {
        type: Number,
        default: () => new Date().getTime()
    }
});
module.exports = mongoose.model('Ticket', ticketSchema);