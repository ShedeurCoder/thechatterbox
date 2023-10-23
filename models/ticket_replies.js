const mongoose = require('mongoose');
const ticketReplySchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    mainTicket: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        default: () => new Date().getTime()
    },
    message: {
        type: String,
        required: true
    }
});
module.exports = mongoose.model('TicketReply', ticketReplySchema);