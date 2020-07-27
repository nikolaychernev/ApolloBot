// Global Variables
let currentUrl;
let csrfToken;
let currentUserId;

// Constants
let selectedClass = "selected";
let processedClass = "processed";

// In-Memory Collections
let followersMap = new Map();
let followingMap = new Map();
let usersQueue = new Map();

// Settings
let loadFollowersQueryHash = "c76146de99bb02f6415203be841dd25a";
let loadFollowingQueryHash = "d04b0a864b4b54837c0d870b0e77e076";

let loadingUsersBatchSize = 48;
let loadingUsersTimeout = 3;

let unfollowTimeout = 60;
let timeoutRandomization = 50;

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
    // Buttons
    let settingsBtn = $("#settingsBtn");
    let saveSettingsBtn = $("#saveSettingsBtn");

    let selectAllBtn = $("#selectAllBtn");
    let selectNoneBtn = $("#selectNoneBtn");
    let removeSelectedBtn = $("#removeSelectedBtn");

    let loadNotFollowingBackBtn = $("#loadNotFollowingBackBtn");
    let loadUnfollowedBtn = $("#loadUnfollowedBtn");

    let loadQueueBtn = $("#loadQueueBtn");
    let saveQueueBtn = $("#saveQueueBtn");

    let startUnfollowingBtn = $("#startUnfollowingBtn");

    // Settings Page
    let overlay = $(".overlay");
    let settingsPage = $(".settingsPage");
    let loadFollowersQueryHashInput = $("#loadFollowersQueryHash");
    let loadFollowingQueryHashInput = $("#loadFollowingQueryHash");
    let loadingUsersBatchSizeInput = $("#loadingUsersBatchSize");
    let loadingUsersTimeoutInput = $("#loadingUsersTimeout");
    let unfollowTimeoutInput = $("#unfollowTimeout");
    let timeoutRandomizationInput = $("#timeoutRandomization");

    // Other Elements
    let usernameField = $("#username");
    let container = $("div.container");
    let userElement = $("div.userElement");
    let loadQueueFileInput = $("#loadQueueFileSelector");
    let lastCheckedField = $(".lastChecked");
    let log = $("#log");

    extractUsernameAndId();
    initializeEventListeners();

    function extractUsernameAndId() {
        $.ajax(currentUrl + "?__a=1").done(function (data) {
            currentUserId = data.graphql.user.id;

            let currentUsername = currentUrl.split("/")[3];
            $(usernameField).text(currentUsername);

            initializeLastCheckedField();
        });
    }

    function initializeLastCheckedField() {
        chrome.storage.local.get(currentUserId, function (item) {
            let lastChecked = item[currentUserId];

            if (lastChecked) {
                $(lastCheckedField).text(lastChecked.timestamp).css("color", "green");
            }
        });
    }

    function initializeEventListeners() {
        $(overlay).on("click", onOverlayClicked);
        $(settingsBtn).on("click", onSettingsBtnClicked);
        $(saveSettingsBtn).on("click", onSaveSettingsBtnClicked);

        $(selectAllBtn).on("click", onSelectAllBtnClicked);
        $(selectNoneBtn).on("click", onSelectNoneBtnClicked);
        $(removeSelectedBtn).on("click", onRemoveSelectedBtnClicked);

        $(loadNotFollowingBackBtn).on("click", onLoadNotFollowingBackBtnClicked);
        $(loadUnfollowedBtn).on("click", onLoadUnfollowedBtnClicked);

        $(loadQueueBtn).on("click", onLoadQueueBtnClicked);
        $(loadQueueFileInput).on("change", onLoadQueueFileInputChange);
        $(saveQueueBtn).on("click", onSaveQueueBtnClicked);

        $(startUnfollowingBtn).on("click", onStartUnfollowingBtnClicked);
    }

    function onOverlayClicked(e) {
        if (!$(e.target).is($(overlay))) {
            return;
        }

        hideSettingsPage();
    }

    function onSettingsBtnClicked() {
        initializeSettings();

        $(overlay).css("display", "flex");
        $(settingsPage).css("display", "flex");
    }

    function initializeSettings() {
        $(loadFollowersQueryHashInput).val(loadFollowersQueryHash);
        $(loadFollowingQueryHashInput).val(loadFollowingQueryHash);
        $(loadingUsersBatchSizeInput).val(loadingUsersBatchSize);
        $(loadingUsersTimeoutInput).val(loadingUsersTimeout);
        $(unfollowTimeoutInput).val(unfollowTimeout);
        $(timeoutRandomizationInput).val(timeoutRandomization);
    }

    function onSaveSettingsBtnClicked() {
        loadFollowersQueryHash = $(loadFollowersQueryHashInput).val();
        loadFollowingQueryHash = $(loadFollowingQueryHashInput).val();
        loadingUsersBatchSize = parseInt($(loadingUsersBatchSizeInput).val());
        loadingUsersTimeout = parseInt($(loadingUsersTimeoutInput).val());
        unfollowTimeout = parseInt($(unfollowTimeoutInput).val());
        timeoutRandomization = parseInt($(timeoutRandomizationInput).val());

        hideSettingsPage();
    }

    function hideSettingsPage() {
        $(overlay).hide();
        $(settingsPage).hide();
    }

    function onSelectAllBtnClicked() {
        $(".userElement").find($(".profilePictureContainer")).addClass(selectedClass);
    }

    function onSelectNoneBtnClicked() {
        $(".userElement").find($(".profilePictureContainer")).removeClass(selectedClass);
    }

    function onRemoveSelectedBtnClicked() {
        let selectedUsers = $(".selected").parent();

        for (let selectedUser of selectedUsers) {
            $(selectedUser).remove();
            usersQueue.delete($(selectedUser).attr("id"));
        }

        $(log).text("There are " + usersQueue.size + " users in the queue.");
    }

    function onLoadNotFollowingBackBtnClicked() {
        loadFollowers(loadFollowing, 0, "");
    }

    function onLoadUnfollowedBtnClicked() {
        loadFollowers(loadUnfollowed, 0, "");
    }

    function loadUnfollowed() {
        chrome.storage.local.get(currentUserId, function (item) {
            updateLastChecked();

            let lastChecked = item[currentUserId];
            let previousFollowers = lastChecked.followers;
            let unfollowed = [];

            for (let previousFollower of previousFollowers) {
                if (followersMap.has(previousFollower.id)) {
                    continue;
                }

                unfollowed.push(previousFollower);
            }

            drawUsers(unfollowed);
        });
    }

    function updateLastChecked() {
        let lastCheckedUpdated = {
            "followers": Array.from(followersMap.values()),
            "timestamp": getCurrentTimestamp()
        };

        chrome.storage.local.set({[currentUserId]: lastCheckedUpdated}, function () {
            initializeLastCheckedField();
        });
    }

    function getCurrentTimestamp() {
        let date = new Date();

        return date.getFullYear() + "/"
            + ('0' + (date.getMonth() + 1)).slice(-2) + "/"
            + ('0' + date.getDate()).slice(-2) + " "
            + ('0' + date.getHours()).slice(-2) + ":"
            + ('0' + date.getMinutes()).slice(-2);
    }

    function onLoadQueueBtnClicked() {
        $(loadQueueFileInput).trigger("click");
    }

    function onLoadQueueFileInputChange() {
        let file = $(loadQueueFileInput).prop('files')[0];
        $(loadQueueFileInput).val("");

        if (file) {
            let reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function (e) {
                let users = JSON.parse(e.target.result);
                drawUsers(users);
            };
        }
    }

    function onSaveQueueBtnClicked() {
        let queue = Array.from(usersQueue.values());

        let blob = new Blob([JSON.stringify(queue)], {type: "text/plain"});
        let url = URL.createObjectURL(blob);

        chrome.downloads.download({
            url: url,
            filename: "queue.txt"
        });
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
                    let user = {
                        id: follower.node.id,
                        username: follower.node.username,
                        full_name: follower.node.full_name,
                        profile_pic_url: follower.node.profile_pic_url
                    };

                    followersMap.set(follower.node.id, user);
                    loadedFollowersCount++;
                }

                $(log).text("Loaded " + loadedFollowersCount + "/" + totalFollowersCount + " followers.");
                let pageInfo = data.data.user.edge_followed_by.page_info;

                if (pageInfo.has_next_page) {
                    let secondsRemaining = randomizeTimeout(loadingUsersTimeout, timeoutRandomization);

                    loadUsersTimeout(secondsRemaining, function () {
                        loadFollowers(callback, loadedFollowersCount, pageInfo.end_cursor);
                    });
                } else {
                    callback(loadNotFollowingBack, 0, "");
                }
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

                    followingMap.set(userFollowing.node.id, user);
                    loadedFollowingCount++;
                }

                $(log).text("Loaded " + loadedFollowingCount + "/" + totalFollowingCount + " following.");
                let pageInfo = data.data.user.edge_follow.page_info;

                if (pageInfo.has_next_page) {
                    let secondsRemaining = randomizeTimeout(loadingUsersTimeout, timeoutRandomization);

                    loadUsersTimeout(secondsRemaining, function () {
                        loadFollowing(callback, loadedFollowingCount, pageInfo.end_cursor);
                    });
                } else {
                    callback();
                }
            });
    }

    function loadUsersTimeout(secondsRemaining, callback) {
        if (secondsRemaining > 0) {
            setTimeout(function () {
                loadUsersTimeout(secondsRemaining - 1, callback);
            }, 1000);
        } else {
            callback();
        }
    }

    function loadNotFollowingBack() {
        let notFollowingBack = [];

        for (let userFollowing of followingMap.values()) {
            if (followersMap.has(userFollowing.id)) {
                continue;
            }

            notFollowingBack.push(userFollowing);
        }

        drawUsers(notFollowingBack);
    }

    function drawUsers(users) {
        $(container).empty();
        usersQueue.clear();

        for (let user of users) {
            let userElementClone = $(userElement).clone().show();
            let profilePicture = $(userElementClone).find("img.profilePicture");
            let profilePictureContainer = $(userElementClone).find(".profilePictureContainer");

            $(userElementClone).attr("id", user.id);

            $(profilePicture).attr("src", user.profile_pic_url);
            $(profilePictureContainer).on("click", onProfilePictureClicked);

            if (user.full_name) {
                $(userElementClone).find("p.name").text(user.full_name);
            }

            $(userElementClone).find("a.username")
                .attr("href", "https://www.instagram.com/" + user.username + "/")
                .text(user.username);

            $(container).append($(userElementClone));
            usersQueue.set(user.id, user);
        }

        $(log).text("There are " + users.length + " users in the queue.");
    }

    function onProfilePictureClicked(event) {
        let target = $(event.target);

        if ($(target).hasClass(selectedClass)) {
            $(target).removeClass(selectedClass);
        } else {
            $(target).addClass(selectedClass);
        }
    }

    function onStartUnfollowingBtnClicked() {
        if (usersQueue.size === 0) {
            return;
        }

        let usersToUnfollowIterator = usersQueue.values();
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
                $("div#" + user.id).find(".profilePictureContainer").addClass(processedClass);
                $(log).text("Unfollowed " + user.username + ".");

                usersQueue.delete(user.id);

                if (usersQueue.size === 0) {
                    return;
                }

                let secondsRemaining = randomizeTimeout(unfollowTimeout, timeoutRandomization);
                countDown(secondsRemaining, usersIterator);
            });
    }

    function randomizeTimeout(timeout, timeoutRandomization) {
        let lowerBound = timeout + (timeout * (timeoutRandomization / 100));
        let upperBound = timeout - (timeout * (timeoutRandomization / 100));

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