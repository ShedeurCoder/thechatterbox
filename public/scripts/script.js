function getId(id) {
    return document.getElementById(id)
}

if (localStorage.comicsans) {
    checkComicSans()
}

if (localStorage.oldLogo) {
    checkOldLogo()
}

function checkComicSans() {
    if (JSON.parse(localStorage.comicsans)) {
        document.body.style.fontFamily = 'Comic Sans MS'
    } else {
        document.body.style.fontFamily = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Liberation Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji'
    }
}

function checkOldLogo() {
    if (JSON.parse(localStorage.oldLogo)) {
        getId('logoImg').src = '/images/logo-old.png'
    } else {
        getId('logoImg').src = '/images/logo.png'
    }
}

function toggleComicSans() {
    const comicSans = localStorage.comicsans
    localStorage.comicsans = comicSans ? !JSON.parse(comicSans) : true
    checkComicSans()
}

function toggleOldLogo() {
    const oldLogo = localStorage.oldLogo
    localStorage.oldLogo = oldLogo ? !JSON.parse(oldLogo) : true
    checkOldLogo()
}

function showRtModal() {
    const rtModal = getId('rtModal')
    rtModal.showModal()
}

function closeRtModal() {
    const rtModal = getId('rtModal')
    rtModal.close()
}

function showHideReplyForm(id) {
    getId(id).classList.toggle("displayNone");
}

function showHideReplies(id, showId) {
    getId(id).classList.toggle("displayNone");
    if (getId(showId).innerText.includes('Show')) {
        getId(showId).innerHTML = "Hide replies <i class='fas fa-caret-up'></i>"
    } else {
        getId(showId).innerHTML = "Show replies <i class='fas fa-caret-down'></i>"
    }
}

function showMore() {
    getId('moreOptions').classList.toggle("displayNone");
}

function createAt(id) {
    atPattern = /(@)+[A-Za-z0-9_]{1,}/gim
    replacedText = getId(id).innerHTML.replace(atPattern, (c) => {
        return `<a href="/user/${c.replace('@', '').toLowerCase()}" class='at-link'>${c}</a>`
    });
    getId(id).innerHTML = replacedText
}

if (document.getElementsByClassName('main-post-message')[0]) {
    createAt(document.getElementsByClassName('main-post-message')[0].id)
}

if (document.getElementById('profileDescription')) {
    createAt('profileDescription')
}

if (document.getElementsByClassName('comment-message')) {
    for (var i = 0; i < document.getElementsByClassName('comment-message').length; i++) {
        createAt(document.getElementsByClassName('comment-message')[i].id)
    }
    if (document.getElementsByClassName('reply-message')) {
        for (var i = 0; i < document.getElementsByClassName('reply-message').length; i++) {
            createAt(document.getElementsByClassName('reply-message')[i].id)
        }
    }
}