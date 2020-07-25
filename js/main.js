// Global Variables
let currentUrl;
let csrfToken;
let currentUserId;

// Constants
let selectedClass = "selected";
let processedClass = "processed";

// In-Memory Collections
let followersIds = [];
let following = new Map();
let notFollowingBack = new Map();

// Settings
let loadingUsersBatchSize = 48;
let loadingUsersTimeout = 1;

let unfollowTimeout = 60;
let timeoutRandomization = 50;

let loadFollowersQueryHash = "c76146de99bb02f6415203be841dd25a";
let loadFollowingQueryHash = "d04b0a864b4b54837c0d870b0e77e076";

chrome.tabs.query({
    'active': true,
    'lastFocusedWindow': true,
    'currentWindow': true
}, function (tabs) {
    currentUrl = tabs[0].url;

    chrome.cookies.get({
        url: currentUrl,
        name: 'csrftoken'
    }, function (cookie) {
        if (cookie) {
            csrfToken = cookie.value;
        }
    });
});

$(function () {
    let loadNotFollowingBackBtn = $("#loadNotFollowingBackBtn");
    let removeSelectedBtn = $("#removeSelectedBtn");
    let startUnfollowingBtn = $("#startUnfollowingBtn");

    let usernameField = $("#username");
    let container = $("div.container");
    let userElement = $("div.userElement");
    let log = $("#log");

    extractUsernameAndId();

    function extractUsernameAndId() {
        $.ajax(currentUrl + "?__a=1").done(function (data) {
            currentUserId = data.graphql.user.id;

            let currentUsername = currentUrl.split("/")[3];
            $(usernameField).text(currentUsername);

            $(loadNotFollowingBackBtn).on("click", onLoadNotFollowingBackBtnClicked);
            $(loadNotFollowingBackBtn).show();
        });
    }

    function onLoadNotFollowingBackBtnClicked() {
        loadFollowers(loadFollowing, 0, "");

        $(loadNotFollowingBackBtn).hide();

        $(removeSelectedBtn).show();
        $(removeSelectedBtn).on("click", onRemoveSelectedBtnClicked);

        $(startUnfollowingBtn).show();
        $(startUnfollowingBtn).on("click", onStartUnfollowingBtnClicked);
    }

    function loadFollowers(callback, loadedFollowersCount, after) {
        let jsonVars = {
            id: currentUserId,
            first: loadingUsersBatchSize,
            after: after
        };

        let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));

        $.ajax("https://www.instagram.com/graphql/query/?query_hash=" + loadFollowersQueryHash + "&variables=" + encodedJsonVars)
            .done(function (data) {
                let followers = data.data.user.edge_followed_by.edges;
                let totalFollowersCount = data.data.user.edge_followed_by.count;

                for (let follower of followers) {
                    followersIds.push(follower.node.id);
                    loadedFollowersCount++;
                }

                $(log).text("Loaded " + loadedFollowersCount + "/" + totalFollowersCount + " followers.");
                let pageInfo = data.data.user.edge_followed_by.page_info;

                if (pageInfo.has_next_page) {
                    loadFollowers(callback, loadedFollowersCount, pageInfo.end_cursor);
                }

                callback(loadNotFollowingBack, 0, "");
            });
    }

    function loadFollowing(callback, loadedFollowingCount, after) {
        let jsonVars = {
            id: currentUserId,
            first: loadingUsersBatchSize,
            after: after
        };

        let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));

        $.ajax("https://www.instagram.com/graphql/query/?query_hash=" + loadFollowingQueryHash + "&variables=" + encodedJsonVars)
            .done(function (data) {
                let usersFollowing = data.data.user.edge_follow.edges;
                let totalFollowingCount = data.data.user.edge_follow.count;

                for (let userFollowing of usersFollowing) {
                    let user = {
                        id: userFollowing.node.id,
                        username: userFollowing.node.username,
                        full_name: userFollowing.node.full_name,
                        profile_pic_url: userFollowing.node.profile_pic_url
                    };

                    following.set(userFollowing.node.id, user);
                    loadedFollowingCount++;
                }

                $(log).text("Loaded " + loadedFollowingCount + "/" + totalFollowingCount + " following.");
                let pageInfo = data.data.user.edge_follow.page_info;

                if (pageInfo.has_next_page) {
                    loadFollowing(callback, loadedFollowingCount, pageInfo.end_cursor);
                }

                callback();
            });
    }

    function loadNotFollowingBack() {
        for (let userFollowing of following.values()) {
            if (followersIds.includes(userFollowing.id)) {
                continue;
            }

            notFollowingBack.set(userFollowing.id, userFollowing);
            drawUser(userFollowing);
        }

        $(log).text("There are " + notFollowingBack.size + " users not following you back.");
    }

    function drawUser(user) {
        let userElementClone = $(userElement).clone().show();
        let profilePicture = $(userElementClone).find("img.profilePicture");

        $(userElementClone).attr("id", user.id);

        $(profilePicture).attr("src", user.profile_pic_url);
        $(profilePicture).on("click", onProfilePictureClicked);

        $(userElementClone).find("a.name")
            .attr("href", "https://www.instagram.com/" + user.username + "/")
            .text(user.username);

        $(container).append($(userElementClone));
    }

    function onProfilePictureClicked(event) {
        let target = $(event.target);

        if ($(target).hasClass(selectedClass)) {
            $(target).removeClass(selectedClass);
        } else {
            $(target).addClass(selectedClass);
        }
    }

    function onRemoveSelectedBtnClicked() {
        let selectedUsers = $("img.selected").parent();

        for (let selectedUser of selectedUsers) {
            $(selectedUser).remove();
            notFollowingBack.delete($(selectedUser).attr("id"));
        }

        $(log).text("There are " + notFollowingBack.size + " users in the queue.");
    }

    function onStartUnfollowingBtnClicked() {
        if (notFollowingBack.size === 0) {
            return;
        }

        let usersToUnfollowIterator = notFollowingBack.values();
        unfollowUsers(usersToUnfollowIterator);
    }

    function unfollowUsers(usersIterator) {
        let user = usersIterator.next().value;

        $.ajax({
            url: "https://www.instagram.com/web/friendships/" + user.id + "/unfollow/",
            method: "POST",
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-csrftoken', csrfToken);
            }
        })
            .done(function () {
                $("div#" + user.id + " img").addClass(processedClass);
                $(log).text("Unfollowed " + user.username + ".");

                notFollowingBack.delete(user.id);

                if (notFollowingBack.size === 0) {
                    return;
                }

                let secondsRemaining = randomizeTimeout(unfollowTimeout, timeoutRandomization);
                countDown(secondsRemaining, usersIterator);
            });
    }

    function randomizeTimeout(unfollowTimeout, timeoutRandomization) {
        let lowerBound = unfollowTimeout + (unfollowTimeout * (timeoutRandomization / 100));
        let upperBound = unfollowTimeout - (unfollowTimeout * (timeoutRandomization / 100));

        return randomIntFromInterval(lowerBound, upperBound);
    }

    function randomIntFromInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function countDown(secondsRemaining, usersIterator) {
        if (secondsRemaining > 0) {
            $(log).text("Waiting " + secondsRemaining + " seconds to unfollow the next user.");

            setTimeout(function () {
                countDown(secondsRemaining - 1, usersIterator);
            }, 1000);
        } else {
            unfollowUsers(usersIterator);
        }
    }
});