const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const mongooseBcrypt = require('mongoose-bcrypt');

const userSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: 'First name is required',
        trim: true,
        max: 30
    },
    surname: {
        type: String,
        required: "Surname is required",
        trim: true,
        max: 30
    },
    profile_picture: {
        type: String,
        default: 'defaultProfile_u6mqts'
    },
    displayName: {
        type: String
    },
    email: {
        type: String,
        required: "Email address is required",
        trim: true,
        unique: true,
        lowercase: true
    },
    username: {
        type: String,
        required: "Username is required",
        trim: true,
        unique: true,
        lowercase: true,
        max: 20
    },
    password: {
        type: String,
        required: "Password is required",
        bcrypt: true
    },
    following: {
        type: [String],
        default: ['shad', 'thechatterbox']
    },
    followersList: {
        type: [String]
    },
    description: {
        type: String,
        max: 150
    },
    link: {
        type: String
    },
    pinned: {
        type: String
    },
    saves: {
        type: [String]
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isOwner: {
        type: Boolean,
        default: false
    }
});
userSchema.index({
    username: 'text',
    displayName: 'text'
});

userSchema.plugin(mongooseBcrypt);
userSchema.plugin(passportLocalMongoose, {usernameField: 'username'});
module.exports = mongoose.model('User', userSchema);
