let currentUrl;
let csrfToken;

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

$(document).ready(function () {
    let currentUserId;

    let loadPeopleBtn = $("#loadPeopleBtn");
    let removeSelectedBtn = $("#removeSelectedBtn");
    let startUnfollowingBtn = $("#startUnfollowingBtn");

    let usernameField = $("#username");
    let container = $("div.container");
    let person = $("div.person");
    let log = $("#log");

    let selectedClass = "selected";
    let processedClass = "processed";

    let followersIds = new Array();
    let following = new Map()
        let notFollowingBack = new Map();

    extractUsernameAndId();

    function onLoadPeopleBtnClicked() {
        loadFollowers(loadFollowing);

        $(loadPeopleBtn).hide();

        $(removeSelectedBtn).show();
        $(removeSelectedBtn).click(onRemoveSelectedBtnClicked);

        $(startUnfollowingBtn).show();
        $(startUnfollowingBtn).click(onStartUnfollowingBtnClicked);
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
        for (let notFollowingBackUser of notFollowingBack.values()) {
            unfollowUser(notFollowingBackUser);
        }
    }

    function onProfilePictureClicked(event) {
        let target = $(event.target);

        if ($(target).hasClass(selectedClass)) {
            $(target).removeClass(selectedClass);
        } else {
            $(target).addClass(selectedClass);
        }
    }

    function extractUsernameAndId() {
        $.ajax(currentUrl + "?__a=1").done(function (data) {
            currentUserId = data.graphql.user.id;

            let currentUsername = currentUrl.split("/")[3];
            $(usernameField).text(currentUsername);

            $(loadPeopleBtn).click(onLoadPeopleBtnClicked);
            $(loadPeopleBtn).show();
        });
    }

    function loadFollowers(callback) {
        let jsonVars = {
            id: currentUserId,
            first: 2
        }

        let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));
        let loadedUsersCount = 0;

        $.ajax("https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=" + encodedJsonVars)
        .done(function (data) {
            let followers = data.data.user.edge_followed_by.edges;
            let totalUsersCount = data.data.user.edge_followed_by.count;

            for (let follower of followers) {
                followersIds.push(follower.node.id);
                loadedUsersCount++;
            }

            $(log).text("Loaded " + loadedUsersCount + "/" + totalUsersCount + " followers.");
            callback(loadNotFollowingBack);
        });
    }

    function loadFollowing(callback) {
        let jsonVars = {
            id: currentUserId,
            first: 2
        }

        let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));
        let loadedUsersCount = 0;

        $.ajax("https://www.instagram.com/graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=" + encodedJsonVars)
        .done(function (data) {
            let usersFollowing = data.data.user.edge_follow.edges;
            let totalUsersCount = data.data.user.edge_follow.count;

            for (let userFollowing of usersFollowing) {
                let user = {
                    id: userFollowing.node.id,
                    username: userFollowing.node.username,
                    full_name: userFollowing.node.full_name,
                    profile_pic_url: userFollowing.node.profile_pic_url
                }

                following.set(userFollowing.node.id, user);
                loadedUsersCount++;
            }

            $(log).text("Loaded " + loadedUsersCount + "/" + totalUsersCount + " followers.");
            callback();
        });
    }

    function loadNotFollowingBack() {
        for (let userFollowing of following.values()) {
            if (followersIds.includes(userFollowing.id)) {
                continue;
            }

            notFollowingBack.set(userFollowing.id, userFollowing);
            drawPerson(userFollowing);
        }

        $(log).text("There are " + notFollowingBack.size + " users not following you back.");
    }

    function unfollowUser(user) {
        $.ajax({
            url: "https://www.instagram.com/web/friendships/" + user.id + "/unfollow/",
            method: "POST",
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-csrftoken', csrfToken);
            }
        })
        .done(function (data) {
            $("div#" + user.id + " img").addClass(processedClass);
            $(log).text("Unfollowed " + user.username + ".");
        });
    }

    function drawPerson(user) {
        let newPerson = $(person).clone().show();
        let profilePicture = $(newPerson).find("img.profilePicture");

        $(newPerson).attr("id", user.id);

        $(profilePicture).attr("src", user.profile_pic_url);
        $(profilePicture).click(onProfilePictureClicked);

        $(newPerson).find("p.name").text(user.username);
        $(container).append($(newPerson));
    }
});
