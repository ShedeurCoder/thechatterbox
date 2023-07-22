const mongoose = require('mongoose');
const rtSchema = new mongoose.Schema({
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
        max: 1000
    },
    post_id: {
        type: String,
        required: true
    }
})
const postSchema = new mongoose.Schema({
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
        max: 1000
    },
    comments: {
        type: Number,
        default: 0
    },
    date: {
        type: Number,
        default: () => new Date().getTime()
    },
    likes: {
        type: [String]
    },
    pinned: {
        type: String
    },
    verified: {
        type: Boolean,
        required: true
    },
    rt: {
        type: rtSchema
    }
})
postSchema.index({
    message: 'text'
});
module.exports = mongoose.model('Post', postSchema);