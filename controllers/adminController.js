const Post = require('../models/post');
const User = require('../models/user');
const Comment = require('../models/comment');
const Ticket = require('../models/ticket');
const Notif = require('../models/notifications');
const TicketReply = require('../models/ticket_replies');

exports.adminTicket = async (req, res, next) => {
    try {
        const tickets = await Ticket.find({open: true, ticket_type: 'ticket'});
        res.render('your_tickets', {title: 'Open tickets', tickets});
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
exports.closedTickets = async (req, res, next) => {
    try {
        const tickets = await Ticket.find({open: false, ticket_type: 'ticket'});
        res.render('your_tickets', {title: 'Closed tickets', tickets});
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