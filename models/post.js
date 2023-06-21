const mongoose = require('mongoose');
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
        max: 300
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
    }
})
postSchema.index({
    message: 'text'
});
module.exports = mongoose.model('Post', postSchema);