const Post = require('../models/post');
const User = require('../models/user');
const Comment = require('../models/comment');
const Ticket = require('../models/ticket');
const Notif = require('../models/notifications');
const TicketReply = require('../models/ticket_replies');
const cloudinary = require('cloudinary');
const multer = require('multer');
const Passport = require('passport');
const postPageLimit = 20;
const homePageLimit = 25;

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

exports.indexPage = (req, res) => {
    res.redirect('/home');
}
exports.isLoggedIn = (req, res, next) => {
    if(req.isAuthenticated() || req.url.startsWith('/login') || req.url.startsWith("/signup") || req.url.startsWith("/about") || req.url.startsWith('/terms-of-service')) return next();
    if (!req.session.firstPage) {
        req.session.firstPage = req.url
    }
    res.redirect('/login')
}
exports.isAdmin = (req, res, next) => {
    if(req.user.isAdmin) return next();
    res.redirect('/help');
}
exports.isOwner = (req, res, next) => {
    if (req.user.isOwner) return next();
    res.redirect('/help')
}
exports.getNotifs = async (req,res,next) => {
    if (req.user) {
        var notifs = await Notif.find({to: req.user.username, read: false})
        var readNotifs = await Notif.find({to: req.user.username, read: true})
    } else {
        var notifs = {}
    }
    res.locals.notifs = notifs
    res.locals.read = readNotifs
    next()
}
exports.preventLogInPageFromLoggedInUsers = (req, res, next) => {
    if (!req.isAuthenticated()) return next();
    res.redirect('/');
}
exports.signUpGet = (req, res) => {
    if (!req.session.firstPage)
        req.session.firstPage = '/'
    res.render('sign_up', {title: 'User sign up', errors: ''});
}
exports.signUpPost = [
    // validate data
    check('first_name').isLength({min: 1}).withMessage('First name must be specified').isAlphanumeric().withMessage("First name must be alphanumeric"),

    check('surname').isLength({min: 1}).withMessage('Surname must be specified').isAlphanumeric().withMessage("Surname must be alphanumeric"),

    check('username').isLength({min: 1}).withMessage('Username must be specified'),

    check('email').isEmail().withMessage('Invalid email address'),

    check('confirm_email').custom((value, {req}) => value === req.body.email).withMessage("Emails must match"),

    check('password').isLength({min: 8}).withMessage('Invalid password. Password must be at least 8 characters'),

    check('confirm_password').custom((value, {req}) => value === req.body.password).withMessage("Passwords must match"),

    sanitize('first_name').trim().escape(),
    sanitize('surname').trim().escape(),
    sanitize('username').trim(),
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
    if (!req.session.firstPage)
        req.session.firstPage = '/'
    res.render('login', {title: "Login"})
}
exports.logInPost = (req, res, next) => {
    Passport.authenticate('local', {
        successRedirect: req.session.firstPage,
        failureRedirect: '/login'
    })(req,res,next)
};
exports.logout = (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/login');
    });
}
exports.profile = async (req, res, next) => {
    try {
        const profileOwner = req.user;
        const unposts = Post.find({user: profileOwner.username}).sort({date: -1}).limit(postPageLimit);
        const page = 1;
        const unnextPost = Post.findOne({user: profileOwner.username}).sort({date: -1}).skip(postPageLimit);
        const pinnedPost = req.user.pinned ? (await Post.findById(req.user.pinned)) : (console.log())
        const [posts, nextPost] = await Promise.all([unposts, unnextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        res.render('user_page', {title: "Your profile", profileOwner, posts, page, nextPage, pinnedPost});
    } catch (error) {
        next(error);
    }
}
exports.profilePage = async (req, res, next) => {
    try {
        const username = req.params.username;
        const profileOwner = await User.findOne({username: username});
        const unposts = Post.find({user: username}).sort({date: -1}).limit(postPageLimit);
        const page = 1;
        const unnextPost = Post.findOne({user: username}).sort({date: -1}).skip(postPageLimit);
        const pinnedPost = profileOwner ? (await Post.findById(profileOwner.pinned)) : (console.log('e'))
        const [posts, nextPost] = await Promise.all([unposts, unnextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        if (profileOwner != null) {
            res.render('user_page', {title:`${profileOwner.displayName}'s profile`, profileOwner, posts, page, nextPage, pinnedPost});
        } else {
            res.render('user_page', {title: "User not found", profileOwner, posts, page, pinnedPost})
        }
    } catch(error) {
        next(error);
    }
}
exports.editProfileGet = (req, res) => {
    res.render('edit_profile', {title: "Edit profile"});
}
exports.editProfilePost = async (req, res, next) => {
    try {
        const username = req.user.username;
        const user = await User.findOneAndUpdate({username: username}, req.body, {new:true});
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
        }
        res.redirect('/profile');
    } catch(error) {
        next(error);
    }
}
exports.followUnfollow = async (req, res, next) => {
    try {
        const username = req.user.username;
        const followingUsername = req.params.username;
        // what
        let e = await User.findOne({username: username})
        if (username == followingUsername) {
            res.redirect(`/user/${followingUsername}`)
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
        res.redirect(`/user/${followingUsername}`);
    } catch(error) {
        next(error);
    }
}
exports.following = async (req, res, next) => {
    try {
        const following = await User.find({username: {$in: req.user.following}})
        res.render('following', {title: 'Following', following})
    } catch(error) {
        next(error)
    }
}
exports.userFollowing = async (req, res, next) => {
    try {
        const username = req.params.username
        const user = await User.findOne({username: username})
        const following = await User.find({username: {$in: user.following}})
        res.render('following', {title: 'Following', following})
    } catch(error) {
        next(error)
    }
}
exports.userFollowers = async (req, res, next) => {
    try {
        const username = req.params.username
        const user = await User.findOne({username: username})
        const following = await User.find({username: {$in: user.followersList}})
        res.render('following', {title: 'Followers', following})
    } catch(error) {
        next(error)
    }
}
exports.showLikes = async (req, res, next) => {
    try {
        const post = await Post.findOne({_id: req.params.postId})
        let following = []
        for (const c of post.likes) {
            const user = await User.findOne({username: c})
            following.push(user)
        }
        res.render('following', {title: 'Likes', following})
    } catch(error) {
        next(error)
    }
}
exports.showCommentLikes = async (req, res, next) => {
    try {
        const post = await Comment.findOne({_id: req.params.commentId})
        let following = []
        for (const c of post.likes) {
            const user = await User.findOne({username: c})
            following.push(user)
        }
        res.render('following', {title: 'Likes', following})
    } catch(error) {
        next(error)
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
exports.editEmailPost = async (req, res, next) => {
    try {
        await User.findOneAndUpdate({username: req.user.username}, {
            email: req.body.email
        }, {
            new: true
        });
        res.redirect('/');
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
                res.redirect('/')
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
        res.redirect('/');
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
        

        res.redirect('/')
    } catch(error) {
        next(error);
    }
}
exports.addPost = async (req, res, next) => {
    try {
        const post = new Post(req.body);
        const atPattern = /(@)+([A-Za-z0-9_]{1,23})/gim
        const matches = req.body.message.match(atPattern)
        if (matches) {
            for (var i = 0; i < matches.length; i++) {
                const user = await User.findOne({username: matches[i].replace('@', '')})
                if (user && !user._id.equals(req.user._id)) {
                    const notif = new Notif({
                        to: user.username,
                        from: req.user.username,
                        type: 'mention',
                        link: `/user/${req.user.username}/post/${post._id}`
                    })
                    await notif.save()
                }
            }
        }
        await post.save();
        res.redirect(`/user/${req.body.user}/post/${post._id}`);
    } catch(error) {
        next(error);
    }
}
exports.deletePost = async (req, res, next) => {
    try {
        const unPost = await Post.findByIdAndRemove({_id: req.params.postID});
        const unComments = Comment.find({mainBox: req.params.postID});
        const [post, comments] = await Promise.all([unPost, unComments]);
        comments.forEach(async (item) => {
            await Comment.findByIdAndRemove({_id: item._id});
        })
        if (req.body.home == 1) {
            res.redirect('/');
        } else {
            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
            res.redirect('back')
        }
    } catch(error) {
        next(error);
    }
}
exports.profilePageNumber = async (req, res, next) => {
    try {
        const username = req.params.username;
        const page = req.params.pageNumber;
        const skipAmount = (parseInt(page) - 1) * postPageLimit;
        const profileOwner = await User.findOne({username: username});
        const unposts = Post.find({user: username}).sort({date: -1}).skip(skipAmount).limit(postPageLimit);
        const unnextPost = Post.findOne({user: username}).sort({date: -1}).skip(skipAmount + postPageLimit);
        const [posts, nextPost] = await Promise.all([unposts, unnextPost]);
        const pinnedPost = profileOwner ? (await Post.findById(profileOwner.pinned)) : (console.log())
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        if (profileOwner != null) {
            res.render('user_page', {title:`${profileOwner.displayName}'s profile`, profileOwner, posts, page, nextPage, pinnedPost});
        } else {
            res.render('user_page', {title: "User not found", profileOwner, posts, page, pinnedPost})
        }
    } catch(error) {
        next(error);
    }
}
exports.profileNumber = async (req, res, next) => {
    try {
        const username = req.user.username;
        const page = req.params.pageNumber;
        const skipAmount = (parseInt(page) - 1) * postPageLimit;
        const profileOwner = req.user;
        const unposts = Post.find({user: username}).sort({date: -1}).skip(skipAmount).limit(postPageLimit);
        const unnextPost = Post.findOne({user: username}).sort({date: -1}).skip(skipAmount + postPageLimit);
        const [posts, nextPost] = await Promise.all([unposts, unnextPost]);
        const pinnedPost = req.user.pinned ? (await Post.findById(req.user.pinned)) : ('')
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        res.render('user_page', {title:`Your profile`, profileOwner, posts, page, nextPage, pinnedPost});
    } catch(error) {
        next(error);
    }
}
exports.postPage = async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const unPost = Post.findOne({_id: postId});
        const unComments = Comment.find({mainBox: postId}).limit(postPageLimit).sort({date: -1});
        const unNextPost = Comment.findOne({mainBox: postId}).sort({date: -1}).skip(postPageLimit);
        const unHComment = Comment.findOne({_id: req.query.c});
        const [post, comments, nextPost, hComment] = await Promise.all([unPost, unComments, unNextPost, unHComment]);
        const pinnedComment = post.pinned ? (await Comment.findById(post.pinned)) : ('')
        let highlight = false
        // for highlighted comment
        if (hComment) {
            let index = -1
            for(let i = 0; i < comments.length; i++) {
                if(comments[i]._id.equals(hComment._id)) {
                    index = i;
                    break;
                }
            }
            if (index > -1) {
                comments.splice(index, 1)
            }
            comments.unshift(hComment)
            highlight = true
        }

        // for pinned comment
        if (pinnedComment) {
            let index = -1
            for(let i = 0; i < comments.length; i++) {
                if(comments[i]._id.equals(pinnedComment._id)) {
                    index = i;
                    break;
                }
            }
            if (index > -1) {
                comments.splice(index, 1)
            }
        }

        let pinnedEqualsHComment = false
        if (pinnedComment._id.equals(hComment._id)) {
            pinnedEqualsHComment = true
        }

        if (req.query.r == 'open') {
            var open = 1
        } else {
            var open = -1
        }

        const currentPage = 1;
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        res.render('post', {title: `Post by ${req.params.username}`, post, comments, currentPage, nextPage, highlight, open, pinnedComment, pinnedEqualsHComment});
    } catch(error) {
        next(error);
    }
}
exports.about = (req, res) => {
    res.render('about', {title: 'About us'})
}
exports.postComment = async (req, res, next) => {
    try {
        const comment = new Comment(req.body);
        const saveComment = comment.save();
        const post = await Post.findOne({_id: req.params.postId});
        const numOfComms = post.comments;
        const updateCommentNumber = Post.findOneAndUpdate({_id: req.params.postId}, {
            comments: numOfComms + 1
        }, {new: true})
        await Promise.all([saveComment, updateCommentNumber]);

        const atPattern = /(@)+([A-Za-z0-9_]{1,23})/gim
        const matches = req.body.message.match(atPattern)
        if (matches) {
            for (var i = 0; i < matches.length; i++) {
                const user = await User.findOne({username: matches[i].replace('@', '')})
                if (user && !user._id.equals(req.user._id)) {
                    const notif = new Notif({
                        to: user.username,
                        from: req.user.username,
                        type: 'commentMention',
                        link: `/user/${post.user}/post/${post._id}?c=${comment._id}`
                    })
                    await notif.save()
                }
            }
        }
        if (req.body.notif == 1) {
            req.body.link = `${req.body.link}?c=${comment._id}`
            const notif = new Notif(req.body)
            await notif.save();
        }
        res.redirect(`/user/${req.params.username}/post/${req.params.postId}`);
    } catch(error) {
        next(error);
    }
}
exports.deleteComment = async (req, res, next) => {
    try {
            const post1 = await Post.findOne({_id: req.params.postId});
            const post = Post.findByIdAndUpdate(req.params.postId, {
                comments: parseInt(post1.comments) - 1
            }, {new:true})
            const comment = Comment.findByIdAndRemove(req.body.postId);
            Promise.all([post, comment]);
            const notifs = await Notif.find({ 'link': { $regex: req.body.postId, $options: 'i' }});
            notifs.forEach(async (c) => {
                await Notif.findOneAndDelete({_id: c._id})
            })
            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
            res.redirect('back')
    } catch(error) {
        next(error);
    }
}
exports.deleteReply = async (req, res, next) => {
    try {
        await Comment.findByIdAndUpdate(req.body.comment, {
            $pull: {
                replies: {
                    _id: req.body.replyId
                }
            }
        }, {new: true})
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.redirect('back')
    } catch(error) {
        next(error);
    }
}
exports.postPageNum = async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const currentPage = req.params.pageNum;
        const skipAmount = (parseInt(currentPage) - 1) * postPageLimit;
        const unPost = Post.findOne({_id: postId});
        const unComments = Comment.find({mainBox: postId}).sort({date: -1}).skip(skipAmount).limit(postPageLimit);
        const unNextPost = Comment.findOne({mainBox: postId}).sort({date: -1}).skip(skipAmount + postPageLimit);
        const [post, comments, nextPost] = await Promise.all([unPost, unComments, unNextPost]);
        const pinnedComment = post.pinned ? (await Comment.findById(post.pinned)) : ('')
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        if (pinnedComment) {
            let index = -1
            for(let i = 0; i < comments.length; i++) {
                if(comments[i]._id.equals(pinnedComment._id)) {
                    index = i;
                    break;
                }
            }
            if (index > -1) {
                comments.splice(index, 1)
            }
        }
        res.render('post', {title: `Post by ${req.params.username}`, post, comments, currentPage, nextPage, pinnedComment});
    } catch(error) {
        next(error);
    }
}
exports.searchPage = (req, res) => {
    res.render('search', {title: 'Search'});
}
exports.searchResults = async (req, res, next) => {
    try {
        let results;
        const searchType = req.query.searchType;
        const searchTerm = req.query.searchTerm;
        const sizeNumber = req.query.sizeNumber;
        if (searchType == "people") {
            results = await User.aggregate([
                {$match: {$text: {$search: `\"${searchTerm}\"`}}},
                {$limit: parseInt(sizeNumber)},
                {$addFields: { followers_count: {$size: { "$ifNull": [ "$followerList", [] ] }}}},
                {$sort: {follower_count: -1}}
            ])
        } else if (searchType == "posts") {
            results = await Post.aggregate([
                {$match: {$text: {$search: `\"${searchTerm}\"`}}},
                {$limit: parseInt(sizeNumber)},
                {$addFields: { likes_count: {$size: { "$ifNull": [ "$likes", [] ] }}}},
                {$sort: {likes_count: -1}}
            ])
        }
        res.render('search', {title: "Search results", results, searchType, searchTerm, sizeNumber});
    } catch(error) {
        next(error);
    }
}
exports.homePage = async (req, res, next) => {
    try {
        const unPosts = Post.find({user: {$in: req.user.following}}).sort({date: -1}).limit(homePageLimit);
        const page = 1;
        const unNextPost = Post.findOne({user: {$in: req.user.following}}).sort({date: -1}).skip(homePageLimit);
        const [posts, nextPost] = await Promise.all([unPosts, unNextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        res.render('index', {title: 'The Chatterbox', posts, page, nextPage})
    } catch(error) {
        next(error);
    }
}
exports.homePageNum = async (req, res, next) => {
    try {
        const page = req.params.pageNum;
        const skipAmount = (parseInt(page) - 1) * homePageLimit;
        const unPosts = Post.find({user: {$in: req.user.following}}).sort({date: -1}).skip(skipAmount).limit(homePageLimit);
        const unNextPost = Post.findOne({user: {$in: req.user.following}}).sort({date: -1}).skip(skipAmount + homePageLimit);
        const [posts, nextPost] = await Promise.all([unPosts, unNextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        res.render('index', {title: 'The Chatterbox', posts, page, nextPage})
    } catch(error) {
        next(error);
    }
}
exports.explore = async (req, res, next) => {
    try {
        const randomPosts = await Post.aggregate([
            {$sample: {size: 50}}
        ]);
        res.render('explore', {title: "Explore", randomPosts});
    } catch(error) {
        next(error);
    }
}
exports.supportMain = (req, res) => {
    res.render('support', {title: 'The Chatterbox Support'});
}
exports.verificationGet = (req, res) => {
    res.render('verification', {title: 'Request a verification'});
}
exports.verificationPost = async (req, res, next) => {
    try {
        const ticket = new Ticket(req.body);
        await ticket.save();
        res.redirect('/help')
    } catch(error) {
        next(error);
    }
}
exports.ticketGet = (req, res) => {
    res.render('ticket', {title: 'Make a ticket'});
}
exports.ticketPost = async (req, res, next) => {
    try {
        const ticket = new Ticket(req.body);
        await ticket.save();
        res.redirect(`/help/tickets/${ticket._id}`);
    } catch(error) {
        next(error);
    }
}
exports.yourTickets = async (req, res, next) => {
    try {
        const tickets = await Ticket.find({username: req.user.username, ticket_type: 'ticket'}).sort({date: -1});
        res.render('your_tickets', {title: 'Your tickets', tickets});
    } catch(error) {
        next(error);
    }
}
exports.adminTicket = async (req, res, next) => {
    try {
        const tickets = await Ticket.find({open: true, ticket_type: 'ticket'});
        res.render('your_tickets', {title: 'Open tickets', tickets});
    } catch(error) {
        next(error);
    }
}
exports.closedTickets = async (req, res, next) => {
    try {
        const tickets = await Ticket.find({open: false, ticket_type: 'ticket'});
        res.render('your_tickets', {title: 'Closed tickets', tickets});
    } catch(error) {
        next(error);
    }
}
exports.ticketPage = async (req, res, next) => {
    try {
        const ticket = await Ticket.findOne({_id: req.params.ticketId});
        if ((req.user.username == ticket.username || req.user.isAdmin) && ticket.ticket_type == "ticket") {
            const comments = await TicketReply.find({mainTicket: ticket._id});
            res.render('ticket_page', {title: 'Ticket', ticket, comments});
        } else {
            res.redirect('/help');
        }
    } catch(error) {
        next(error);
    }
}
exports.ticketComment = async (req, res, next) => {
    try {
        const ticketReply = new TicketReply(req.body);
        await ticketReply.save();
        res.redirect(`/help/tickets/${req.params.ticketId}`)
    } catch(error) {
        next(error);
    }
}
exports.closeTicket = async (req, res, next) => {
    try {
        await Ticket.findByIdAndUpdate(req.params.ticketId, {
            open: false
        }, {new: true});
        res.redirect('/help')
    } catch(error) {
        next(error);
    }
}
exports.adminVerificationGet = async (req, res, next) => {
    try {
        const tickets = await Ticket.find({open: true, ticket_type: 'verification'});
        res.render('verification_tickets', {title: 'Verification requests', tickets});
    } catch(error) {
        next(error);
    }
}
exports.adminVerificationPost = async (req, res, next) => {
    try {
        const body = req.body;
        if (body.accept) {
            await User.findOneAndUpdate({username: body.username}, {
                isVerified: true
            }, {new: true});
            const posts = await Post.find({user: body.username});
            posts.forEach(async (c) => {
                await Post.findByIdAndUpdate(c._id, {
                    verified: true
                });
            })
            const comments = await Comment.find({user: body.username});
            comments.forEach(async (c) => {
                await Comment.findByIdAndUpdate(c._id, {
                    verified: true
                });
            })
            await Comment.updateMany(
                { "replies.user": body.username },
                { "$set": {"replies.$[elem].verified": true}},
                { "arrayFilters": [{ "elem.user": body.username }], "multi": true }
            )
        } 
        await Ticket.findByIdAndRemove(body.ticketId);
        res.redirect('/admin/help/verification');
    } catch(error) {
        next(error);
    }
}
exports.termsOfService = (req, res) => {
    res.render('terms_of_service', {title: 'Terms of Service'});   
}
exports.deleteAccountPasswordGet = (req, res) => {
    res.render('delete_account', {title: 'Sign in to delete your account'})
}
exports.signInBeforeDeletion = Passport.authenticate('local', {
    failureRedirect: '/settings/delete'
});
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
        Comment.updateMany(
            {"replies":{$elemMatch:{user: req.user.username}}},
            {
              $pull: {
                    replies: {
                        user: req.user.username
                    }
                }
            }
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
        res.redirect('/');
    } catch(error) {
        next(error);
    }
}
exports.adminDeleteGet = (req, res) => {
    res.render('admin_search', {title: 'Search user to delete'})
}
exports.adminDeletePost = async (req, res, next) => {
    try {
        const deletingUser = await User.findOne({username: req.body.user}).collation({
            locale: 'en',
            strength: 2
        });
        if (deletingUser != null) {
            res.render('admin_search_result', {title: 'Delete user?', deletingUser, notifs: [], read: []})
        } else {
            res.redirect('/admin/delete_account');
        }
    } catch(error) {
        next(error);
    }
}
exports.confirmationDelete = async (req, res, next) => {
    try {
        const deletingUser = await User.findOne({username: req.params.username})
        res.render('confirm_deletion', {title: 'Are you sure you want to delete this user?', deletingUser});
    } catch(error) {
        next(error);
    }
}
exports.deleteAdmin = async (req, res, next) => {
    try {
        const user = await User.findOne({username: req.params.username});
        // remove user from people's followings
        const followers = await User.find({following: user.username});
        if (followers.length > 0) {
            followers.forEach(async (c) => {
                await User.findOneAndUpdate({username: c.username}, {
                    $pull: {following: user.username}
                }, {new: true})
            })
        }
        const following = await User.find({followersList: user.username});
        if (following.length > 0) {
            following.forEach(async (c) => {
                await User.findOneAndUpdate({username: c.username}, {
                    $pull: {followersList: user.username}
                }, {new: true})
            })
        }
        // delete the users posts
        const posts = await Post.find({user: user.username});
        if (posts.length > 0) {
            posts.forEach(async (c) => {
                await Post.findByIdAndRemove(c._id);
            })
        }
        // delete the users comments
        const comments = await Comment.find({user: user.username});
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
        const likes = await Post.find({likes: user.username})
        if (likes.length > 0) {
            likes.forEach(async (c) => {
                await Post.findOneAndUpdate({_id: c._id}, {
                    $pull: {likes: user.username}
                }, {new: true})
            })
        }
        const clikes = await Comment.find({likes: user.username})
        if (clikes.length > 0) {
            clikes.forEach(async (c) => {
                await Comment.findOneAndUpdate({_id: c._id}, {
                    $pull: {likes: user.username}
                }, {new: true})
            })
        }
        Comment.updateMany(
            {"replies":{$elemMatch:{user: user.username}}},
            {
              $pull: {
                    replies: {
                        user: user.username
                    }
                }
            }
        )
        // change tickets
        const tickets = await Ticket.find({username: user.username});
        if (tickets.length > 0) {
            tickets.forEach(async (c) => {
                await Ticket.findByIdAndUpdate(c._id, {
                    username: 'Deleted user'
                });
            })
        }
        const ticketsR = await TicketReply.find({username: user.username});
        if (ticketsR.length > 0) {
            ticketsR.forEach(async (c) => {
                await TicketReply.findByIdAndUpdate(c._id, {
                    username: 'Deleted user'
                });
            })
        }

        // CHANGE NOTIFICATIONS
        const toNotifs = await Notif.find({to: user.username})
        if (toNotifs.length > 0) {
            toNotifs.forEach(async (c) => {
                await Notif.findOneAndDelete({_id: c._id})
            })
        }
        const fromNotifs = await Notif.find({from: user.username})
        if (fromNotifs.length > 0) {
            fromNotifs.forEach(async (c) => {
                await Notif.findOneAndDelete({_id: c._id})
            })
        }

        // DELETE THE USER
        await User.findByIdAndRemove(user._id);
        res.redirect('/');
    } catch(error) {
        next(error);
    }
}
exports.editUsernameGet = (req, res) => {
    res.render('edit_user', {title: 'Edit Username'});
}
exports.addRemoveVerificationGet = (req, res) => {
    res.render('add_remove_verification', {title: 'Verify or unverify a user'})
}
exports.addRemoveVerificationPost = async (req, res, next) => {
    try {
        const body = req.body;
        if (body.verifyType == "verify") {
            await User.findOneAndUpdate({username: body.username}, {
                isVerified: true
            }, {new: true});
            const posts = await Post.find({user: body.username});
            posts.forEach(async (c) => {
                await Post.findByIdAndUpdate(c._id, {
                    verified: true
                });
            })
            const comments = await Comment.find({user: body.username});
            comments.forEach(async (c) => {
                await Comment.findByIdAndUpdate(c._id, {
                    verified: true
                });
            })
            await  Comment.updateMany(
                { "replies.user": body.username },
                { "$set": {"replies.$[elem].verified": true}},
                { "arrayFilters": [{ "elem.user": body.username }], "multi": true }
            )
        } else if (body.verifyType == "unverify") {
            await User.findOneAndUpdate({username: body.username}, {
                isVerified: false
            }, {new: true});
            const posts = await Post.find({user: body.username});
            posts.forEach(async (c) => {
                await Post.findByIdAndUpdate(c._id, {
                    verified: false
                });
            })
            const comments = await Comment.find({user: body.username});
            comments.forEach(async (c) => {
                await Comment.findByIdAndUpdate(c._id, {
                    verified: false
                });
            })
            await  Comment.updateMany(
                { "replies.user": body.username },
                { "$set": {"replies.$[elem].verified": false}},
                { "arrayFilters": [{ "elem.user": body.username }], "multi": false }
            )
        }
        res.redirect('/admin/verify_unverify_user');
    } catch(error) {
        next(error);
    }
}
exports.addRemoveAdminGet = (req, res) => {
    res.render('add_remove_admin', {title: 'Add or remove admin'})
}
exports.addRemoveAdminPost = async (req, res, next) => {
    try {
        const body = req.body;
        if (body.addRemove == "add") {
            await User.findOneAndUpdate({username: body.username}, {
                isVerified: true,
                isAdmin: true
            }, {new: true});
            const posts = await Post.find({user: body.username});
            posts.forEach(async (c) => {
                await Post.findByIdAndUpdate(c._id, {
                    verified: true
                });
            })
            const comments = await Comment.find({user: body.username});
            comments.forEach(async (c) => {
                await Comment.findByIdAndUpdate(c._id, {
                    verified: true
                });
            })
            await  Comment.updateMany(
                { "replies.user": body.username },
                { "$set": {"replies.$[elem].verified": true}},
                { "arrayFilters": [{ "elem.user": body.username }], "multi": true }
            )
        } else if (body.addRemove == "remove") {
            await User.findOneAndUpdate({username: body.username}, {
                isAdmin: false
            }, {new: true})
        }
        res.redirect('/owner/add_remove_admin');
    } catch(error) {
        next(error);
    }
}
exports.deleteNotif = async (req, res, next) => {
    try {
        await Notif.findOneAndDelete({_id: req.body.id})
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.redirect('back')
    } catch(error) {
        next(error)
    }
}
exports.likeUnlike = async (req, res, next) => {
    try {
        const username = req.user.username;
        const likePost = req.params.postId;
        // what
        let e = await Post.findOne({_id: likePost})
        if (!e.likes.includes(username)) {
            await Post.findOneAndUpdate({_id: likePost}, {
                $push: {
                    likes: username
                }
            }, {new:true});
            if (req.body.notif == 1) {
                const notif = new Notif(req.body)
                await notif.save()
            }
        } else {
            await Post.findOneAndUpdate({_id: likePost}, {
                $pull: {
                    likes: username
                }
            }, {new:true});
        }
        res.redirect(`/user/${req.params.username}/post/${req.params.postId}`);
    } catch(error) {
        next(error)
    }
}
exports.likeUnlikeComment = async (req, res, next) => {
    try {
        const username = req.user.username;
        const likePost = req.params.commentId;
        // what
        let e = await Comment.findOne({_id: likePost})
        if (!e.likes.includes(username)) {
            await Comment.findOneAndUpdate({_id: likePost}, {
                $push: {
                    likes: username
                }
            }, {new:true});
            if (req.body.notif == 1) {
                const notif = new Notif(req.body)
                await notif.save()
            }
        } else {
            await Comment.findOneAndUpdate({_id: likePost}, {
                $pull: {
                    likes: username
                }
            }, {new:true});
        }
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.redirect('back')
    } catch(error) {
        next(error)
    }
}
exports.deleteAllNotif = async (req, res, next) => {
    try {
        const notifs = await Notif.find({to: req.user.username})
        notifs.forEach(async (c) => {
            await Notif.findOneAndDelete({_id: c._id})
        })
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.redirect('back')
    } catch(error) {
        next(error)
    }
}
exports.postReply = async (req, res, next) => {
    try {
        await Comment.findOneAndUpdate({_id: req.params.commentId}, {
            $push: {
                replies: req.body
            }
        }, {new: true})
        const atPattern = /(@)+([A-Za-z0-9_]{1,23})/gim
        const matches = req.body.message.match(atPattern)
        if (matches) {
            for (var i = 0; i < matches.length; i++) {
                const user = await User.findOne({username: matches[i].replace('@', '')})
                if (user && !user._id.equals(req.user._id)) {
                    const notif = new Notif({
                        to: user.username,
                        from: req.user.username,
                        type: 'replyMention',
                        link: `/user/${req.params.username}/post/${req.params.postId}?c=${req.params.commentId}&r=open`
                    })
                    await notif.save()
                }
            }
        }
        if (req.body.notif == 1) {
            const notif = new Notif(req.body)
            await notif.save()
        }
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.redirect('back')
    } catch(error) {
        next(error)
    }
}
exports.savePost = async (req, res, next) => {
    try {
        if (!req.user.saves.includes(req.params.postId)) {
            await User.findOneAndUpdate({_id: req.user._id}, {
                $push: {saves: req.params.postId}
            })
        } else {
            await User.findOneAndUpdate({_id: req.user._id}, {
                $pull: {saves: req.params.postId}
            })
        }
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.redirect('back')
    } catch(error) {
        next(error)
    }
}
exports.getSaves = async (req, res, next) => {
    try {
        const saveId = req.user.saves
        let saves = []
        for (var i = 0; i < saveId.length; i++) {
            console.log(saveId[i])
            const save = await Post.findById(saveId[i])
            saves.push(save)
        }
        res.render('saves', {title: 'Saved posts', saves})
    } catch(error) {
        next(error)
    }
}
exports.readNotif = async (req, res, next) => {
    try {
        await Notif.findOneAndUpdate({_id: req.body.id}, {
            read: true
        })
        res.redirect(req.body.link)
    } catch(error) {
        next(error)
    }
}
exports.markAllRead = async (req, res, next) => {
    try {
        const notifs = await Notif.find({to: req.user.username, read: false})
        notifs.forEach(async (c) => {
            await Notif.findOneAndUpdate({_id: c._id}, {
                read: true
            })
        })
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.redirect('back')
    } catch(error) {
        next(error)
    }
}
exports.deleteRead = async (req, res, next) => {
    try {
        const notifs = await Notif.find({to: req.user.username, read: true})
        notifs.forEach(async (c) => {
            await Notif.findOneAndDelete({_id: c._id})
        })
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.redirect('back')
    } catch(error) {
        next(error)
    }
}
exports.pinPost = async (req, res, next) => {
    try {
        const pinned = req.body.postId
        if (pinned != req.user.pinned) {
            await User.findByIdAndUpdate(req.user._id, {
                pinned: pinned
            })
        } else {
            await User.findByIdAndUpdate(req.user._id, {
                pinned: ''
            })
        }
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.redirect('back')
    } catch(error) {
        next(error)
    }
}
exports.pinComment = async (req, res, next) => {
    try {
        const post = await Post.findOne({_id: req.body.postId})
        if (post.pinned != req.body.commentId) {
            await Post.findByIdAndUpdate(req.body.postId, {
                pinned: req.body.commentId
            })
        } else {
            await Post.findByIdAndUpdate(req.body.postId, {
                pinned: ''
            })
        }
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.redirect('back')
    } catch(error) {
        next(error)
    }
}