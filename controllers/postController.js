const Post = require('../models/post');
const User = require('../models/user');
const Comment = require('../models/comment');
const Notif = require('../models/notifications');
const postPageLimit = 50;


/* 
----------
  Posts
----------
*/

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
        await Post.updateMany(
            {"rt.post_id": req.params.postId},
            {"$set": {"rt.message": 'post was deleted'}},
            {"arrayFilters": [{'elem.user': req.user.username}], 'multi': true}
        )
        if (req.body.home == 1) {
            res.redirect('/');
        } else {
            res.redirect('back')
        }
    } catch(error) {
        next(error);
    }
}

exports.postPage = async (req, res, next) => {
    try {
        if (req.params.postId.match(/^[0-9a-f]{24}$/i)) {
            const postId = req.params.postId;
            const currentPage = req.params.pageNum ? req.params.pageNum : 1;
            const skipAmount = (parseInt(currentPage) - 1) * postPageLimit;
            const unPost = Post.findOne({_id: postId});
            const unComments = Comment.find({mainBox: postId}).sort({date: -1}).skip(skipAmount).limit(postPageLimit);
            const unNextPost = Comment.findOne({mainBox: postId}).sort({date: -1}).skip(skipAmount + postPageLimit);
            const [post, comments, nextPost] = await Promise.all([unPost, unComments, unNextPost]);
            const pinnedComment = post && post.pinned ? (await Comment.findById(post.pinned)) : ('')
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
        } else {
            res.render('post', {title: 'Post does not exist'})
        }
    } catch(error) {
        next(error);
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
        res.redirect('back')
    } catch(error) {
        next(error)
    }
}

exports.rt = async (req, res, next) => {
    try {
        const post = new Post({
            user: req.user.username,
            userPFP: req.user.profile_picture,
            message: req.body.rt_message,
            verified: req.body.verified,
            rt: {
                user: req.body.user,
                userPFP: req.body.userPFP,
                message: req.body.message,
                post_id: req.body.post_id
            }
        })
        const atPattern = /(@)+([A-Za-z0-9_]{1,23})/gim
        const matches = req.body.rt_message.match(atPattern)
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
        if (req.body.notif == 1) {
            req.body.link = `${req.body.link}${post._id}`
            const notif = new Notif(req.body)
            await notif.save()
        }
        await post.save()
        res.redirect('back')
    } catch(e) {
        next(e)
    }
}


/*
----------
 Comments
----------
*/

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
        res.redirect('back');
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
            res.redirect('back')
    } catch(error) {
        next(error);
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
        res.redirect('back')
    } catch(error) {
        next(error)
    }
}


/*
----------
 Replies
----------
*/

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
                        link: `/user/${req.body.postOwnerUser}/post/${req.body.postOwnerId}?c=${req.params.commentId}&r=open`
                    })
                    await notif.save()
                }
            }
        }
        if (req.body.notif == 1) {
            const notif = new Notif(req.body)
            await notif.save()
        }
        res.redirect('back')
    } catch(error) {
        next(error)
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
        res.redirect('back')
    } catch(error) {
        next(error);
    }
}