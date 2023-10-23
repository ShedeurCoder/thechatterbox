const mongoose = require('mongoose');
const notifSchema = new mongoose.Schema({
    to: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    from: {
        type: String,
        required: true
    },
    link: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    date: {
        type: Number,
        default: () => new Date().getTime()
    }
})
module.exports = mongoose.model('Notif', notifSchema);