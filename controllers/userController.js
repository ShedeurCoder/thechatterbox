const Post = require('../models/post');
const User = require('../models/user');
const Comment = require('../models/comment');
const Notif = require('../models/notifications');
const Ticket = require('../models/ticket');
const TicketReply = require('../models/ticket_replies');
const cloudinary = require('cloudinary');
const multer = require('multer');
const Passport = require('passport');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
  
const storage = multer.diskStorage({});

const upload = multer({storage});

exports.upload = upload.single('profile_picture');

exports.pushToCloudinary = (req, res, next) => {
    if (req.file) {
        cloudinary.uploader.upload(req.file.path)
        .then((result) => {
        req.body.profile_picture = result.public_id;
        next();
    })
        .catch(() => {
        res.redirect('/signup');
    })
    } else {
        next();
    }
}

// Express validator
const {check, validationResult} = require('express-validator/check');
const {sanitize} = require('express-validator/filter');

exports.preventLogInPageFromLoggedInUsers = (req, res, next) => {
    if (!req.isAuthenticated()) return next();
    res.redirect('/');
}

exports.signUpGet = (req, res) => {
    if (!req.session.firstPage) {
        req.session.firstPage = '/'
    }
    res.render('sign_up', {title: 'User sign up', errors: ''});
}

exports.signUpPost = [
    // validate data
    check('first_name').isLength({min: 1}).withMessage('First name must be specified'),

    check('surname').isLength({min: 1}).withMessage('Surname must be specified'),

    check('username').isLength({min: 1}).withMessage('Username must be specified'),

    check('email').isEmail().withMessage('Invalid email address'),

    check('confirm_email').custom((value, {req}) => value === req.body.email).withMessage("Emails must match"),

    check('password').isLength({min: 8}).withMessage('Invalid password. Password must be at least 8 characters'),

    check('confirm_password').custom((value, {req}) => value === req.body.password).withMessage("Passwords must match"),

    sanitize('first_name').trim().escape(),
    sanitize('surname').trim().escape(),
    sanitize('username').trim().escape(),
    sanitize('email').trim().escape(),
    sanitize('confirm_email').trim().escape(),
    sanitize('password').trim(),
    sanitize('confirm_password').trim(),
    sanitize('profile_picture').trim().escape(),
    sanitize('displayName').trim(),
    sanitize('description').trim(),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // handle errors
            res.render('sign_up', {title: 'User sign up', errorMessage: "Please fix the following errors:", errors: errors.array()});
            return;
        } else {
            if (req.body.profile_picture == "") {
                req.body.profile_picture = "defaultProfile_u6mqts";
            }
            const newUser = new User(req.body);
            User.register(newUser, req.body.password, function(err) {
                if(err) {
                    console.log('error while registering', err);
                    return next(err);
                }
                next()
            })
        }
    }
]

exports.addDefaultFollowers = async (req, res, next) => {
    try {
        let shadFollowers = await User.findOne({username: "shad"});
        let tcbFollowers = await User.findOne({username: "thechatterbox"});
        shadFollowers = parseInt(shadFollowers.followers);
        tcbFollowers = parseInt(tcbFollowers.followers);
        await User.findOneAndUpdate({username: "shad"}, {
            followers: shadFollowers + 1,
            $push: {
                followersList: req.body.username.toLowerCase()
            }
        }, {new: true})
        await User.findOneAndUpdate({username: "thechatterbox"}, {
            followers: tcbFollowers + 1,
            $push: {
                followersList: req.body.username.toLowerCase()
            }
        }, {new: true})
        next()
    } catch(error) {
        next(error);
    }
}

exports.logInGet = (req, res) => {
    if (!req.session.firstPage) {
        req.session.firstPage = '/'
    }
    res.render('login', {title: "Login"})
}

exports.logInPost = (req, res, next) => {
    Passport.authenticate('local', {
        successRedirect: req.session.firstPage,
        failureRedirect: '/login'
    })(req,res,next)
}

exports.logout = (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/login');
    })
}

exports.editProfileGet = (req, res) => {
    res.render('edit_profile', {title: "Edit profile"});
}

exports.editProfilePost = async (req, res, next) => {
    try {
        const username = req.user.username;
        await User.findOneAndUpdate({username: username}, req.body, {new:true});
        if (req.body.profile_picture) {
            const unPosts = Post.find({user: username});
            const unComments = Comment.find({user: username});
            const [posts, comments] = await Promise.all([unPosts, unComments]);
            posts.forEach(async curr => {
                await Post.findOneAndUpdate({_id: curr.id}, {
                    userPFP: req.body.profile_picture
                }, {new: true}); 
            });
            comments.forEach(async curr => {
                await Comment.findOneAndUpdate({_id: curr.id}, {
                    userPFP: req.body.profile_picture
                }, {new: true});
            });

            await Comment.updateMany(
                { "replies.user": req.user.username },
                { "$set": { "replies.$[elem].userPFP":  req.body.profile_picture} },
                { "arrayFilters": [{ "elem.user": req.user.username }], "multi": true }
            )

            await Post.updateMany(
                {"rt.user": req.user.username},
                {"$set": {"rt.$[elem].userPFP": req.body.profile_picture}},
                {"arrayFilters": [{'elem.user': req.user.username}], 'multi': true}
            )
        }
        res.redirect('back');
    } catch(error) {
        next(error);
    }
}

exports.followUnfollow = async (req, res, next) => {
    try {
        const username = req.user.username;
        const followingUsername = req.body.user;
        const e = await User.findOne({username: username})
        if (username === followingUsername) {
            res.redirect('back')
        } else if (!e.following.includes(followingUsername)) {
            await User.findOneAndUpdate({username: username}, {
                $push: {
                    following: followingUsername
                }
            }, {new:true});
            await User.findOneAndUpdate({username: followingUsername}, {
                $push: {
                    followersList: username
                }
            }, {new: true});
            const notif = new Notif(req.body)
            await notif.save()
        } else {
            await User.findOneAndUpdate({username: username}, {
                $pull: {
                    following: followingUsername
                }
            }, {new:true});
            await User.findOneAndUpdate({username: followingUsername}, {
                $pull: {
                    followersList: username
                }
            }, {new:true});
        }
        res.redirect('back');
    } catch(error) {
        next(error);
    }
}

exports.settings = (req, res) => {
    res.render('settings', {title: 'Settings'});
}

exports.editEmailGet = (req, res) => {
    res.render('edit_user', {title: 'Edit Email'});
}

exports.editPasswordGet = (req, res) => {
    res.render('edit_user', {title: 'Edit Password'});
}

exports.editNameGet = (req, res) => {
    res.render('edit_user', {title: 'Edit Name'});
}

exports.editUsernameGet = (req, res) => {
    res.render('edit_user', {title: 'Edit Username'});
}

exports.editEmailPost = async (req, res, next) => {
    try {
        await User.findOneAndUpdate({username: req.user.username}, {
            email: req.body.email
        }, {
            new: true
        });
        res.redirect('back');
    } catch(error) {
        next(error);
    }
}

exports.editPasswordPost = async (req, res, next) => {
    try {
        if (req.body.confirm_password === req.body.password) {
            req.user.changePassword(req.body.oldPassword, req.body.password, function(err) {
                if(err) {
                    console.log('error while registering', err);
                    return next(err);
                }
                res.redirect('back')
            })
        } else {
            res.render('edit_user', {title: "Edit Password: Passwords do not match"})
        }
    } catch(error) {
        next(error);
    }
} 

exports.editNamePost = async (req, res, next) => {
    try {
        await User.findOneAndUpdate({username: req.user.username}, {
            first_name: req.body.first_name,
            surname: req.body.surname
        }, {
            new: true
        });
        res.redirect('back');
    } catch(error) {
        next(error);
    }
}

exports.editUsernamePost = async (req, res, next) => {
    try {
        let username = req.body.username.toLowerCase()
        username = username.replaceAll(" ", "")
        const followers = await User.find({following: req.user.username});
        if (followers.length > 0) {
            followers.forEach(async (c) => {
                await User.findOneAndUpdate({username: c.username}, {
                    $push: {following: username}
                }, {new: true})
                await User.findOneAndUpdate({username: c.username}, {
                    $pull: {following: req.user.username}
                }, {new: true})
            })
        }
        const following = await User.find({followersList: req.user.username});
        if (following.length > 0) {
        following.forEach(async (c) => {
                await User.findOneAndUpdate({username: c.username}, {
                    $push: {followersList: username}
                }, {new: true})
                await User.findOneAndUpdate({username: c.username}, {
                    $pull: {followersList: req.user.username}
                }, {new: true})
            })
        }
        // change posts name
        const posts = await Post.find({user: req.user.username});
        if (posts.length > 0) {
            posts.forEach(async (c) => {
                await Post.findByIdAndUpdate(c._id, {
                    user: username,
                    verified: false
                });
            })
        }
        // change comments name
        const comments = await Comment.find({user: req.user.username});
        if (comments.length > 0) {
            comments.forEach(async (c) => {
                await Comment.findByIdAndUpdate(c._id, {
                    user: username,
                    verified: false
                });
            })
        }
        const likes = await Post.find({likes: req.user.username})
        if (likes.length > 0) {
            likes.forEach(async (c) => {
                await Post.findOneAndUpdate({_id: c._id}, {
                    $push: {likes: username}
                })
                await Post.findOneAndUpdate({_id: c._id}, {
                    $pull: {likes: req.user.username}
                })
            })
        }
        const cLikes = await Comment.find({likes: req.user.username})
        if (cLikes.length > 0) {
            cLikes.forEach(async (c) => {
                await Comment.findOneAndUpdate({_id: c._id}, {
                    $push: {likes: username}
                })
                await Comment.findOneAndUpdate({_id: c._id}, {
                    $pull: {likes: req.user.username}
                })
            })
        }
        await  Comment.updateMany(
            { "replies.user": req.user.username },
            { "$set": { "replies.$[elem].user": username, "replies.$[elem].verified": false}},
            { "arrayFilters": [{ "elem.user": req.user.username }], "multi": true }
        )

        await Post.updateMany(
            {"rt.user": req.user.username},
            {"$set": {"rt.$[elem].userPFP": req.body.username}},
            {"arrayFilters": [{'elem.user': req.user.username}], 'multi': true}
        )

        // change tickets
        const tickets = await Ticket.find({username: req.user.username});
        if (tickets.length > 0) {
            tickets.forEach(async (c) => {
                await Ticket.findByIdAndUpdate(c._id, {
                    username: username,
                    link: `/user/${username}`
                });
            })
        }
        const ticketsR = await TicketReply.find({username: req.user.username});
        if (ticketsR.length > 0) {
            ticketsR.forEach(async (c) => {
                await TicketReply.findByIdAndUpdate(c._id, {
                    username: username
                });
            })
        }

        // CHANGE NOTIFICATIONS
        const toNotifs = await Notif.find({to: req.user.username})
        if (toNotifs.length > 0) {
            toNotifs.forEach(async (c) => {
                await Notif.findOneAndUpdate({_id: c._id}, {
                    to: username
                })
            })
        }
        const fromNotifs = await Notif.find({from: req.user.username})
        if (fromNotifs.length > 0) {
            fromNotifs.forEach(async (c) => {
                await Notif.findOneAndUpdate({_id: c._id}, {
                    from: username
                })
            })
        }
        
        await User.findOneAndUpdate({username: req.user.username}, {
            username: username.replaceAll(" ", ""),
            isVerified: false
        }, {
            new: true
        });
        

        res.redirect('back')
    } catch(error) {
        next(error);
    }
}

exports.deleteAccountPasswordGet = (req, res) => {
    res.render('delete_account', {title: 'Sign in to delete your account'})
}

exports.signInBeforeDeletion = Passport.authenticate('local', {
    failureRedirect: '/settings/delete'
})

exports.deleteUser = async (req, res, next) => {
    try {
        // remove user from people's followings
        const followers = await User.find({following: req.user.username});
        if (followers.length > 0) {
            followers.forEach(async (c) => {
                await User.findOneAndUpdate({username: c.username}, {
                    $pull: {following: req.user.username}
                }, {new: true})
            })
        }
        // remove user from people's followers
        const following = await User.find({followersList: req.user.username});
        if (following.length > 0) {
            following.forEach(async (c) => {
                await User.findOneAndUpdate({username: c.username}, {
                    $pull: {followersList: req.user.username}
                }, {new: true})
            })
        }
        // delete the users posts
        const posts = await Post.find({user: req.user.username});
        if (posts.length > 0) {
            posts.forEach(async (c) => {
                await Post.findByIdAndRemove(c._id);
            })
        }
        // delete the users comments
        const comments = await Comment.find({user: req.user.username});
        if (comments.length > 0) {
            comments.forEach(async (c) => {
                await Comment.findByIdAndRemove(c._id);
                let post1 = await Post.findOne({_id: c.mainBox});
                post1 = post1.comments
                await Post.findByIdAndUpdate(c.mainBox, {
                    comments: parseInt(post1) - 1
                })
            })
        }
        const likes = await Post.find({likes: req.user.username})
        if (likes.length > 0) {
            likes.forEach(async (c) => {
                await Post.findOneAndUpdate({_id: c._id}, {
                    $pull: {likes: req.user.username}
                }, {new: true})
            })
        }
        const clikes = await Comment.find({likes: req.user.username})
        if (clikes.length > 0) {
            clikes.forEach(async (c) => {
                await Comment.findOneAndUpdate({_id: c._id}, {
                    $pull: {likes: req.user.username}
                }, {new: true})
            })
        }
        await Comment.updateMany(
            {"replies":{$elemMatch:{user: req.user.username}}},
            {
              $pull: {
                    replies: {
                        user: req.user.username
                    }
                }
            }
        )
        
        await Post.updateMany(
            {"rt.user": req.user.username},
            {"$set": {
                "rt.$[elem].userPFP": 'defaultProfile_u6mqts', 
                "rt.$[elem].user": 'User deleted',
                'rt.$[elem].message': 'Post unavailable'
            }},
            {"arrayFilters": [{'elem.user': req.user.username}], 'multi': true}
        )
        // change tickets
        const tickets = await Ticket.find({username: req.user.username});
        if (tickets.length > 0) {
            tickets.forEach(async (c) => {
                await Ticket.findByIdAndUpdate(c._id, {
                    username: 'Deleted user'
                });
            })
        }
        const ticketsR = await TicketReply.find({username: req.user.username});
        if (ticketsR.length > 0) {
            ticketsR.forEach(async (c) => {
                await TicketReply.findByIdAndUpdate(c._id, {
                    username: 'Deleted user'
                });
            })
        }

        // CHANGE NOTIFICATIONS
        const toNotifs = await Notif.find({to: req.user.username})
        if (toNotifs.length > 0) {
            toNotifs.forEach(async (c) => {
                await Notif.findOneAndDelete({_id: c._id})
            })
        }
        const fromNotifs = await Notif.find({from: req.user.username})
        if (fromNotifs.length > 0) {
            fromNotifs.forEach(async (c) => {
                await Notif.findOneAndDelete({_id: c._id})
            })
        }
        // DELETE THE USER
        await User.findByIdAndRemove(req.user._id);
        res.redirect('back');
    } catch(error) {
        next(error);
    }
}