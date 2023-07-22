const Post = require('../models/post');
const User = require('../models/user');
const Comment = require('../models/comment');
const Notif = require('../models/notifications');
const Ticket = require('../models/ticket');
const TicketReply = require('../models/ticket_replies');
const postPageLimit = 50;
const homePageLimit = 50;


/*
----------
  Checks
----------
*/

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


/*
----------
Main pages
----------
*/

exports.homePage = async (req, res, next) => {
    try {
        const page = req.params.pageNum ? req.params.pageNum : 1;
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

exports.about = (req, res) => {
    res.render('about', {title: 'About us'})
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

exports.termsOfService = (req, res) => {
    res.render('terms_of_service', {title: 'Terms of Service'});   
}

exports.deleteNotif = async (req, res, next) => {
    try {
        await Notif.findOneAndDelete({_id: req.body.id})
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
        res.redirect('back')
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
        res.redirect('back')
    } catch(error) {
        next(error)
    }
}


/*
----------
 Profiles
----------
*/

exports.profilePage = async (req, res, next) => {
    try {
        const username = req.params.username;
        const page = req.params.pageNumber ? req.params.pageNumber : 1;
        const skipAmount = (parseInt(page) - 1) * postPageLimit;
        const profileOwner = await User.findOne({username: username});
        const unposts = Post.find({user: username}).sort({date: -1}).skip(skipAmount).limit(postPageLimit);
        const unnextPost = Post.findOne({user: username}).sort({date: -1}).skip(skipAmount + postPageLimit);
        const [posts, nextPost] = await Promise.all([unposts, unnextPost]);
        const pinnedPost = profileOwner && profileOwner.pinned ? (await Post.findById(profileOwner.pinned)) : (console.log())
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

exports.profileComments = async (req, res, next) => {
    try {
        const username = req.params.username;
        const page = req.params.pageNumber ? req.params.pageNumber : 1;
        const skipAmount = (parseInt(page) - 1) * postPageLimit;
        const profileOwner = await User.findOne({username: username});
        const unposts = Comment.find({user: username}).sort({date: -1}).skip(skipAmount).limit(postPageLimit);
        const unnextPost = Comment.findOne({user: username}).sort({date: -1}).skip(skipAmount + postPageLimit);
        const [posts, nextPost] = await Promise.all([unposts, unnextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        if (profileOwner) {
            res.render('user_page', {title:`${profileOwner.displayName}'s comments`, profileOwner, posts, page, nextPage});
        } else {
            res.render('user_page', {title: "User not found", profileOwner, posts, page})
        }
    } catch(error) {
        next(error);
    }
}

exports.profileLikes = async (req, res, next) => {
    try {
        const username = req.params.username;
        const page = req.params.pageNumber ? req.params.pageNumber : 1;
        const skipAmount = (parseInt(page) - 1) * postPageLimit;
        const profileOwner = await User.findOne({username: username});
        const unposts = Post.find({likes: username}).sort({date: -1}).skip(skipAmount).limit(postPageLimit);
        const unnextPost = Post.findOne({likes: username}).sort({date: -1}).skip(skipAmount + postPageLimit);
        const [posts, nextPost] = await Promise.all([unposts, unnextPost]);
        let nextPage;
        if (nextPost != null) {
            nextPage = true;
        } else {
            nextPage = false;
        }
        if (profileOwner) {
            res.render('user_page', {title:`${profileOwner.displayName}'s profile`, profileOwner, posts, page, nextPage});
        } else {
            res.render('user_page', {title: "User not found", profileOwner, posts, page})
        }
    } catch(error) {
        next(error);
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


/*
----------
 Support
----------
*/

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