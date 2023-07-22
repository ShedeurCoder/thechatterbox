var express = require('express');
var router = express.Router();
const controller = require("../controllers/mainController");
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const postController = require('../controllers/postController');

router.get('*', controller.isLoggedIn, controller.getNotifs);
router.get('/admin/*', controller.isAdmin);
router.get('/owner/*', controller.isOwner);


/*
----------
   Main
----------
*/

// Home
router.get('/', controller.indexPage);
router.get('/home', controller.homePage);
router.get('/home/:pageNum', controller.homePage);
router.get('/search', controller.searchPage);
router.get('/search/results', controller.searchResults);
router.get('/explore', controller.explore);

// Profile
router.get('/user/:username', (req, res) => {res.redirect(`/user/${req.params.username}/posts`)})
router.get('/user/:username/posts', controller.profilePage);
router.get('/user/:username/replies', controller.profileComments);
router.get('/user/:username/likes', controller.profileLikes);
router.get('/user/:username/posts/:pageNumber', controller.profilePage);
router.get('/user/:username/likes/:pageNumber', controller.profileLikes);
router.get('/user/:username/replies/:pageNumber', controller.profileComments);
router.get('/user/:username/following', controller.userFollowing)
router.get('/user/:username/followers', controller.userFollowers)
router.get('/saves', controller.getSaves)

// About
router.get('/about', controller.about);
router.get('/tos', controller.termsOfService)

// Notifications
router.post('/notification', controller.deleteNotif)
router.post('/read-notif', controller.readNotif)
router.post('/notification/delete-all', controller.deleteAllNotif)
router.post('/notification/mark-all-read', controller.markAllRead)
router.post('/notification/delete-all-read', controller.deleteRead)


/*
----------
  Posts
----------
*/

// Posts
router.post('/post', postController.addPost);
router.post('/:postID/delete', postController.deletePost);
router.get('/user/:username/post/:postId', postController.postPage);
router.get('/user/:username/post/:postId/likes', postController.showLikes)
router.get('/user/:username/post/:postId/:pageNum', postController.postPage);
router.post('/:postId/like', postController.likeUnlike)
router.post('/save/:postId', postController.savePost)
router.post('/pin', postController.pinPost)
router.post('/rt', postController.rt)

// Comments
router.post('/:postId/comment', postController.postComment);
router.post('/:postId/comment/delete', postController.deleteComment);
router.get('/user/:username/post/:postId/:commentId/likes', postController.showCommentLikes)
router.post('/:postId/:commentId/like', postController.likeUnlikeComment)
router.post('/pin/comment', postController.pinComment)

// Replies
router.post('/:commentId/reply', postController.postReply)
router.post('/reply/delete', postController.deleteReply)


/*
----------
   User
----------
*/

// Sign up and log in
router.get('/signup', userController.preventLogInPageFromLoggedInUsers, userController.signUpGet);
router.post('/signup', userController.upload, userController.pushToCloudinary, userController.signUpPost, userController.addDefaultFollowers, userController.logInPost);
router.get('/login', userController.preventLogInPageFromLoggedInUsers, userController.logInGet);
router.post('/login', userController.logInPost);
router.get('/logout', userController.logout);

// Profile edit
router.get('/profile/edit', userController.editProfileGet);
router.post('/profile/edit', userController.upload, userController.pushToCloudinary, userController.editProfilePost);

// Follow and unfollow
router.post('/follow', userController.followUnfollow)

// Settings
router.get('/settings', userController.settings);
router.get('/settings/email', userController.editEmailGet);
router.get('/settings/password', userController.editPasswordGet);
router.get('/settings/name', userController.editNameGet);
router.get('/settings/username', userController.editUsernameGet);
router.post('/settings/email', userController.editEmailPost);
router.post('/settings/password', userController.editPasswordPost);
router.post('/settings/name', userController.editNamePost);
router.post('/settings/username', userController.editUsernamePost);
router.get('/settings/delete', userController.deleteAccountPasswordGet);
router.post('/settings/delete', userController.signInBeforeDeletion, userController.deleteUser);


/*
----------
 Support
----------
*/

// Tickets
router.get('/help/tickets/:ticketId', controller.ticketPage);
router.post('/help/tickets/:ticketId/comment', controller.ticketComment);
router.post('/help/tickets/:ticketId', controller.closeTicket);

// Main Help
router.get('/help', controller.supportMain);
router.get('/help/verification', controller.verificationGet);
router.post('/help/verification', controller.verificationPost);
router.get('/help/ticket', controller.ticketGet);
router.post('/help/ticket', controller.ticketPost);
router.get('/help/your-tickets', controller.yourTickets);


/*
----------
  Admin
----------
*/

router.get('/admin/help/ticket', adminController.adminTicket);
router.get('/admin/help/verification', adminController.adminVerificationGet);
router.post('/admin/help/verification', adminController.adminVerificationPost);
router.get('/admin/delete_account', adminController.adminDeleteGet);
router.post('/admin/delete_account', adminController.adminDeletePost);
router.get('/admin/delete/:username', adminController.confirmationDelete);
router.post('/admin/delete/:username', adminController.deleteAdmin);
router.get('/admin/verify_unverify_user', adminController.addRemoveVerificationGet)
router.post('/admin/verify_unverify_user', adminController.addRemoveVerificationPost)
router.get('/admin/help/ticket/closed', adminController.closedTickets)

// Owner
router.get('/owner/add_remove_admin', adminController.addRemoveAdminGet)
router.post('/owner/add_remove_admin', adminController.addRemoveAdminPost)

module.exports = router;