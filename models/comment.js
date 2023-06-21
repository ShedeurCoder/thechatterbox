const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    user: {
        type: String,
        required: true
    },
    userPFP: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
        max: 200
    },
    date: {
        type: Number,
        default: () => new Date().getTime()
    },
    verified: {
        type: Boolean,
        required: true
    }
})

const commentSchema = new mongoose.Schema({
    mainBox: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    userPFP: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
        max: 200
    },
    date: {
        type: Number,
        default: () => new Date().getTime()
    },
    likes: {
        type: [String]
    },
    replies: {
        type: [replySchema]
    },
    verified: {
        type: Boolean,
        required: true
    }
});
module.exports = mongoose.model('comment', commentSchema);