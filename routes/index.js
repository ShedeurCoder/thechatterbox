var express = require('express');
var router = express.Router();
const controller = require("../controllers/controller");

router.get('*', controller.isLoggedIn, controller.getNotifs);
router.get('/admin/*', controller.isAdmin);
router.get('/owner/*', controller.isOwner);

/* REGULAR PAGES */
router.get('/', controller.indexPage);
router.get('/profile', controller.profile);
router.get('/user/:username', controller.profilePage);
router.get('/following', controller.following);
router.get('/user/:username/following', controller.userFollowing)
router.get('/user/:username/followers', controller.userFollowers)
router.post('/post', controller.addPost);
router.post('/user/:username/post/:postID/delete', controller.deletePost);
router.get('/user/:username/post/:postId', controller.postPage);
router.post('/user/:username/post/:postId/comment', controller.postComment);
router.post('/user/:username/post/:postId/comment/delete', controller.deleteComment);
router.get('/user/:username/post/:postId/likes', controller.showLikes)
router.get('/user/:username/post/:postId/:pageNum', controller.postPageNum);
router.post('/user/:username/post/:postId/:commentId/like', controller.likeUnlikeComment)
router.get('/user/:username/post/:postId/:commentId/likes', controller.showCommentLikes)
router.post('/user/:username/post/:postId/comment/:commentId/reply', controller.postReply)
router.post('/user/:username/post/:postId/reply/delete', controller.deleteReply)
router.get('/about', controller.about);
router.get('/search', controller.searchPage);
router.get('/search/results', controller.searchResults);
router.get('/home', controller.homePage);
router.get('/home/:pageNum', controller.homePageNum);
router.get('/explore', controller.explore);
router.get('/terms-of-service', controller.termsOfService);
router.post('/notification', controller.deleteNotif)
router.post('/notification/delete-all', controller.deleteAllNotif)
router.post('/save/:postId', controller.savePost)
router.get('/saves', controller.getSaves)
router.post('/read-notif', controller.readNotif)
router.post('/notification/mark-all-read', controller.markAllRead)
router.post('/notification/delete-all-read', controller.deleteRead)
router.post('/pin', controller.pinPost)
router.post('/pin/comment', controller.pinComment)

/* USER ROUTES */

// Sign up and log in
router.get('/signup', controller.preventLogInPageFromLoggedInUsers, controller.signUpGet);
router.post('/signup', controller.upload, controller.pushToCloudinary, controller.signUpPost, controller.addDefaultFollowers, controller.logInPost);
router.get('/login', controller.preventLogInPageFromLoggedInUsers, controller.logInGet);
router.post('/login', controller.logInPost);
router.get('/logout', controller.logout);
// Profile edit
router.get('/profile/edit', controller.editProfileGet);
router.post('/profile/edit', controller.upload, controller.pushToCloudinary, controller.editProfilePost);
// Follow and unfollow
router.post('/user/:username', controller.followUnfollow)
router.post('/user/:username/post/:postId/like', controller.likeUnlike)
// Settings
router.get('/settings', controller.settings);
router.get('/settings/email', controller.editEmailGet);
router.get('/settings/password', controller.editPasswordGet);
router.get('/settings/name', controller.editNameGet);
router.get('/settings/username', controller.editUsernameGet);
router.post('/settings/email', controller.editEmailPost);
router.post('/settings/password', controller.editPasswordPost);
router.post('/settings/name', controller.editNamePost);
router.post('/settings/username', controller.editUsernamePost);
router.get('/settings/delete', controller.deleteAccountPasswordGet);
router.post('/settings/delete', controller.signInBeforeDeletion, controller.deleteUser);

/* TICKETS */
router.get('/help/tickets/:ticketId', controller.ticketPage);
router.post('/help/tickets/:ticketId/comment', controller.ticketComment);
router.post('/help/tickets/:ticketId', controller.closeTicket);

/* HELP */
router.get('/help', controller.supportMain);
router.get('/help/verification', controller.verificationGet);
router.post('/help/verification', controller.verificationPost);
router.get('/help/ticket', controller.ticketGet);
router.post('/help/ticket', controller.ticketPost);
router.get('/help/your-tickets', controller.yourTickets);

/* ADMIN ROUTES */
router.get('/admin/help/ticket', controller.adminTicket);
router.get('/admin/help/verification', controller.adminVerificationGet);
router.post('/admin/help/verification', controller.adminVerificationPost);
router.get('/admin/delete_account', controller.adminDeleteGet);
router.post('/admin/delete_account', controller.adminDeletePost);
router.get('/admin/delete/:username', controller.confirmationDelete);
router.post('/admin/delete/:username', controller.deleteAdmin);
router.get('/admin/verify_unverify_user', controller.addRemoveVerificationGet)
router.post('/admin/verify_unverify_user', controller.addRemoveVerificationPost)
router.get('/admin/help/ticket/closed', controller.closedTickets)

/* OWNER ROUTES */
router.get('/owner/add_remove_admin', controller.addRemoveAdminGet)
router.post('/owner/add_remove_admin', controller.addRemoveAdminPost)

/* FOR THE DIFFERENT PAGES */
router.get('/user/:username/:pageNumber', controller.profilePageNumber);
router.get('/profile/:pageNumber', controller.profileNumber);

/* DEBUG */

module.exports = router;