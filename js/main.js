// Global Variables
let currentUrl;
let csrfToken;
let currentUserId;
let settings;
let loadUsersTimeoutObject;
let unfollowUsersTimeoutObject;
let lastChecked;

// Constants
let defaultSettings = {
    "loadFollowersQueryHash": "c76146de99bb02f6415203be841dd25a",
    "loadFollowingQueryHash": "d04b0a864b4b54837c0d870b0e77e076",
    "loadStoryListQueryHash": "90709b530ea0969f002c86a89b4f2b8d",
    "loadStoryViewersQueryHash": "42c6ec100f5e57a1fe09be16cd3a7021",
    "loadingUsersBatchSize": 48,
    "loadingUsersTimeout": 3,
    "unfollowTimeout": 60,
    "timeoutRandomization": 50
};

let selectedClass = "selected";
let processedClass = "processed";

// In-Memory Collections
let followersMap = new Map();
let followingMap = new Map();
let usersQueue = new Map();

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
    let cancelSettingsBtn = $("#cancelSettingsBtn");
    let saveSettingsBtn = $("#saveSettingsBtn");
    let resetSettingsBtn = $("#resetSettingsBtn");

    let selectAllBtn = $("#selectAllBtn");
    let selectNoneBtn = $("#selectNoneBtn");
    let removeSelectedBtn = $("#removeSelectedBtn");

    let loadNotFollowingBackBtn = $("#loadNotFollowingBackBtn");
    let loadUnfollowedBtn = $("#loadUnfollowedBtn");
    let loadStoryViewersBtn = $("#loadStoryViewersBtn");

    let loadQueueBtn = $("#loadQueueBtn");
    let saveQueueBtn = $("#saveQueueBtn");

    let startUnfollowingBtn = $("#startUnfollowingBtn");
    let stopUnfollowingBtn = $("#stopUnfollowingBtn");

    // Settings Page
    let overlay = $(".overlay");
    let settingsPage = $(".settingsPage");
    let loadFollowersQueryHashInput = $("#loadFollowersQueryHash");
    let loadFollowingQueryHashInput = $("#loadFollowingQueryHash");
    let loadStoryListQueryHashInput = $("#loadStoryListQueryHash");
    let loadStoryViewersQueryHashInput = $("#loadStoryViewersQueryHash");
    let loadingUsersBatchSizeInput = $("#loadingUsersBatchSize");
    let loadingUsersTimeoutInput = $("#loadingUsersTimeout");
    let unfollowTimeoutInput = $("#unfollowTimeout");
    let timeoutRandomizationInput = $("#timeoutRandomization");

    //Popup
    let popup = $("#popup");
    let popupConfirmBtn = $("#popupConfirmBtn");
    let popupCancelBtn = $("#popupCancelBtn");

    //Story List
    let storyList = $("#storyList");
    let storyListContent = $("#storyListContent");
    let storyListCancelBtn = $("#storyListCancelBtn");

    // Other Elements
    let currentUserProfilePicture = $("#currentUserProfilePicture");
    let usernameField = $("#username");
    let scrollableArea = $(".scrollable-area");
    let userElement = $("div.userElement");
    let loadQueueFileInput = $("#loadQueueFileSelector");
    let messageField = $("#message");
    let queueTotalUsersCount = $("#queueTotalUsersCount");
    let queueSelectedUsersCount = $("#queueSelectedUsersCount");
    let loadingBarElement = $("#loadingBar");
    let loadingMessageField = $("#loadingMessage");

    initializeCustomScrollBar();
    extractUserInfo();
    initializeSettings();
    initializeEventListeners();

    function initializeCustomScrollBar() {
        new SimpleBar($(scrollableArea)[0]);
    }

    function extractUserInfo() {
        $.ajax(currentUrl + "?__a=1").done(function (data) {
            currentUserId = data.graphql.user.id;

            let currentUserProfilePictureUrl = data.graphql.user.profile_pic_url;
            $(currentUserProfilePicture).attr("src", currentUserProfilePictureUrl);

            let currentUsername = currentUrl.split("/")[3];
            $(usernameField).text(currentUsername);

            initializeLastCheckedField();
        });
    }

    function initializeLastCheckedField() {
        chrome.storage.local.get(currentUserId, function (item) {
            let lastCheckedItem = item[currentUserId];

            if (lastCheckedItem) {
                lastChecked = lastCheckedItem;
            }
        });
    }

    function initializeSettings() {
        chrome.storage.local.get("settings", function (item) {
            let loadedSettings = item["settings"];

            if (loadedSettings) {
                settings = loadedSettings;
            } else {
                settings = defaultSettings;
            }
        });
    }

    function initializeEventListeners() {
        $(overlay).on("click", onOverlayClicked);
        $(settingsBtn).on("click", onSettingsBtnClicked);
        $(cancelSettingsBtn).on("click", hideSettingsPage);
        $(saveSettingsBtn).on("click", onSaveSettingsBtnClicked);
        $(resetSettingsBtn).on("click", onResetSettingsBtnClicked);

        $(selectAllBtn).on("click", onSelectAllBtnClicked);
        $(selectNoneBtn).on("click", onSelectNoneBtnClicked);
        $(removeSelectedBtn).on("click", onRemoveSelectedBtnClicked);

        $(loadNotFollowingBackBtn).on("click", onLoadNotFollowingBackBtnClicked);
        $(loadUnfollowedBtn).on("click", onLoadUnfollowedBtnClicked);

        $(loadStoryViewersBtn).on("click", onLoadStoryViewersBtnClicked);
        $(storyListCancelBtn).on("click", hideStoryList);

        $(popupConfirmBtn).on("click", onPopupConfirmBtnClicked);
        $(popupCancelBtn).on("click", hidePopup);

        $(loadQueueBtn).on("click", onLoadQueueBtnClicked);
        $(loadQueueFileInput).on("change", onLoadQueueFileInputChange);
        $(saveQueueBtn).on("click", onSaveQueueBtnClicked);

        $(startUnfollowingBtn).on("click", onStartUnfollowingBtnClicked);
        $(stopUnfollowingBtn).on("click", onStopUnfollowingBtnClicked);
    }

    function onOverlayClicked(e) {
        if (!$(e.target).is($(overlay))) {
            return;
        }

        hideSettingsPage();
        hidePopup();
        hideStoryList();
    }

    function onSettingsBtnClicked() {
        populateSettings();

        $(overlay).css("display", "flex");
        $(settingsPage).show();
    }

    function onSaveSettingsBtnClicked() {
        settings = {
            "loadFollowersQueryHash": $(loadFollowersQueryHashInput).val(),
            "loadFollowingQueryHash": $(loadFollowingQueryHashInput).val(),
            "loadStoryListQueryHash": $(loadStoryListQueryHashInput).val(),
            "loadStoryViewersQueryHash": $(loadStoryViewersQueryHashInput).val(),
            "loadingUsersBatchSize": parseInt($(loadingUsersBatchSizeInput).val()),
            "loadingUsersTimeout": parseInt($(loadingUsersTimeoutInput).val()),
            "unfollowTimeout": parseInt($(unfollowTimeoutInput).val()),
            "timeoutRandomization": parseInt($(timeoutRandomizationInput).val())
        };

        chrome.storage.local.set({"settings": settings}, function () {
            hideSettingsPage();
        });
    }

    function onResetSettingsBtnClicked() {
        settings = defaultSettings;

        chrome.storage.local.set({"settings": settings}, function () {
            populateSettings();
        });
    }

    function populateSettings() {
        $(loadFollowersQueryHashInput).val(settings.loadFollowersQueryHash);
        $(loadFollowingQueryHashInput).val(settings.loadFollowingQueryHash);
        $(loadStoryListQueryHashInput).val(settings.loadStoryListQueryHash);
        $(loadStoryViewersQueryHashInput).val(settings.loadStoryViewersQueryHash);
        $(loadingUsersBatchSizeInput).val(settings.loadingUsersBatchSize);
        $(loadingUsersTimeoutInput).val(settings.loadingUsersTimeout);
        $(unfollowTimeoutInput).val(settings.unfollowTimeout);
        $(timeoutRandomizationInput).val(settings.timeoutRandomization);
    }

    function hideSettingsPage() {
        $(overlay).hide();
        $(settingsPage).hide();
    }

    function onSelectAllBtnClicked() {
        $(".selection").addClass(selectedClass);
        updateQueueSelectedUsersCounter();
    }

    function onSelectNoneBtnClicked() {
        $(".selection").removeClass(selectedClass);
        updateQueueSelectedUsersCounter();
    }

    function onRemoveSelectedBtnClicked() {
        let selectedUsers = $(".selected").parent().parent();

        for (let selectedUser of selectedUsers) {
            $(selectedUser).remove();
            usersQueue.delete($(selectedUser).attr("id"));
        }

        updateQueueTotalUsersCounter(usersQueue.size);
        updateQueueSelectedUsersCounter();
    }

    function onLoadNotFollowingBackBtnClicked() {
        loadFollowers(loadFollowing, 0, "");
    }

    function onLoadUnfollowedBtnClicked() {
        if (lastChecked) {
            $(popup).find("h2").text(
                "Clicking confirm will load all users who have unfollowed since " + lastChecked.timestamp + ".");
        }

        $(overlay).css("display", "flex");
        $(popup).show();
    }

    function onLoadStoryViewersBtnClicked() {
        loadStoryList();

        $(overlay).css("display", "flex");
        $(storyList).show();
    }

    function loadStoryList() {
        let jsonVars = {
            "reel_ids": [
                currentUserId
            ],
            "tag_names": [],
            "location_ids": [],
            "highlight_reel_ids": [],
            "precomposed_overlay": false,
            "stories_video_dash_manifest": false
        };

        let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));

        $.ajax("https://www.instagram.com/graphql/query/?query_hash=" + settings.loadStoryListQueryHash + "&variables=" + encodedJsonVars)
            .done(function (data) {
                let stories = data.data.reels_media[0].items;
                drawStoryList(stories);
            });
    }

    function drawStoryList(stories) {
        $(storyListContent).empty();

        for (let story of stories) {
            let storyElement = $("<img>");
            $(storyElement).attr("id", story.id);
            $(storyElement).attr("src", story.display_url);
            $(storyElement).addClass("storyElement");

            $(storyElement).on("click", onStoryElementClicked);
            $(storyListContent).append($(storyElement));
        }
    }

    function onStoryElementClicked(event) {
        let target = $(event.target);
        let storyId = target.attr("id");

        loadStoryViewers(storyId);
    }

    function loadStoryViewers(storyId) {
        let jsonVars = {
            "item_id": storyId,
            "story_viewer_fetch_count": settings.loadingUsersBatchSize,
            "story_viewer_cursor": "0"
        };

        let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));

        $.ajax("https://www.instagram.com/graphql/query/?query_hash=" + settings.loadStoryViewersQueryHash + "&variables=" + encodedJsonVars)
            .done(function (data) {
                hideStoryList();
                console.log(data);
            });
    }

    function hideStoryList() {
        $(overlay).hide();
        $(storyList).hide();
    }

    function onPopupConfirmBtnClicked() {
        hidePopup();
        loadFollowers(loadUnfollowed, 0, "");
    }

    function hidePopup() {
        $(overlay).hide();
        $(popup).hide();
    }

    function loadUnfollowed() {
        updateLastChecked();

        let previousFollowers = lastChecked.followers;
        let unfollowed = [];

        for (let previousFollower of previousFollowers) {
            if (followersMap.has(previousFollower.id)) {
                continue;
            }

            unfollowed.push(previousFollower);
        }

        drawUsers(unfollowed, "Users Unfollowed Since " + lastChecked.timestamp);
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
                drawUsers(users, "Users Queue");
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
            first: settings.loadingUsersBatchSize,
            after: after
        };

        let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));

        $.ajax("https://www.instagram.com/graphql/query/?query_hash=" + settings.loadFollowersQueryHash + "&variables=" + encodedJsonVars)
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

                $(loadingBarElement).css("display", "flex");
                updateLoadingBarElement(totalFollowersCount, loadedFollowersCount, "Loading Followers");

                let pageInfo = data.data.user.edge_followed_by.page_info;

                if (pageInfo.has_next_page) {
                    let secondsRemaining = randomizeTimeout(settings.loadingUsersTimeout, settings.timeoutRandomization);

                    loadUsersTimeout(secondsRemaining, function () {
                        loadFollowers(callback, loadedFollowersCount, pageInfo.end_cursor);
                    });
                } else {
                    if (!lastChecked) {
                        updateLastChecked();
                    }

                    $(loadingBarElement).hide();
                    callback(loadNotFollowingBack, 0, "");
                }
            });
    }

    function loadFollowing(callback, loadedFollowingCount, after) {
        let jsonVars = {
            id: currentUserId,
            first: settings.loadingUsersBatchSize,
            after: after
        };

        let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));

        $.ajax("https://www.instagram.com/graphql/query/?query_hash=" + settings.loadFollowingQueryHash + "&variables=" + encodedJsonVars)
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

                $(loadingBarElement).css("display", "flex");
                updateLoadingBarElement(totalFollowingCount, loadedFollowingCount, "Loading Following");

                let pageInfo = data.data.user.edge_follow.page_info;

                if (pageInfo.has_next_page) {
                    let secondsRemaining = randomizeTimeout(settings.loadingUsersTimeout, settings.timeoutRandomization);

                    loadUsersTimeout(secondsRemaining, function () {
                        loadFollowing(callback, loadedFollowingCount, pageInfo.end_cursor);
                    });
                } else {
                    $(loadingBarElement).hide();
                    callback();
                }
            });
    }

    function loadUsersTimeout(secondsRemaining, callback) {
        if (secondsRemaining > 0) {
            loadUsersTimeoutObject = setTimeout(function () {
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

        drawUsers(notFollowingBack, "Users Not Following Back");
    }

    function drawUsers(users, message) {
        let simpleBarContent = $(".simplebar-content");
        $(simpleBarContent).empty();
        usersQueue.clear();

        for (let user of users) {
            let userElementClone = $(userElement).clone().show();
            let profilePicture = $(userElementClone).find("img.profilePicture");

            $(userElementClone).attr("id", user.id);
            $(profilePicture).attr("src", user.profile_pic_url);

            if (user.full_name) {
                $(userElementClone).find("p.name").text(user.full_name);
            }

            $(userElementClone).find("a.username")
                .attr("href", "https://www.instagram.com/" + user.username + "/")
                .text(user.username);

            $(simpleBarContent).append($(userElementClone));
            usersQueue.set(user.id, user);
        }

        $(messageField).text(message);
        updateQueueTotalUsersCounter(users.length);
        updateQueueSelectedUsersCounter();

        $(".selection").on("click", onProfilePictureClicked);
    }

    function updateQueueTotalUsersCounter(count) {
        $(queueTotalUsersCount).text(count + " Users");
    }

    function updateQueueSelectedUsersCounter() {
        $(queueSelectedUsersCount).text($(".selected").length + " Selected");
    }


    function onProfilePictureClicked(event) {
        let target = $(event.target);

        if ($(target).hasClass(selectedClass)) {
            $(target).removeClass(selectedClass);
        } else {
            $(target).addClass(selectedClass);
        }

        updateQueueSelectedUsersCounter();
    }

    function onStartUnfollowingBtnClicked() {
        if (usersQueue.size === 0) {
            return;
        }

        let usersToUnfollowIterator = usersQueue.values();
        unfollowUsers(usersToUnfollowIterator);
    }

    function unfollowUsers(usersIterator) {
        $(startUnfollowingBtn).hide();
        $(stopUnfollowingBtn).css("display", "inline-flex");

        let user = usersIterator.next().value;

        $.ajax({
            url: "https://www.instagram.com/web/friendships/" + user.id + "/unfollow/",
            method: "POST",
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-csrftoken', csrfToken);
            }
        })
            .done(function () {
                let userElement = $("div#" + user.id);
                let profilePictureContainer = $(userElement).find(".profilePictureContainer");

                $(profilePictureContainer).find(".selection").addClass(processedClass);
                $(profilePictureContainer).find(".countdown").hide();

                usersQueue.delete(user.id);

                if (usersQueue.size === 0) {
                    $(stopUnfollowingBtn).hide();
                    $(startUnfollowingBtn).show();

                    return;
                }

                let nextElementProfilePictureContainer = $(userElement).next().find(".profilePictureContainer");
                let nextElementCountdownElement = $(nextElementProfilePictureContainer).find(".countdown");
                $(nextElementCountdownElement).show();

                let secondsRemaining = randomizeTimeout(settings.unfollowTimeout, settings.timeoutRandomization);
                unfollowUsersTimeout(secondsRemaining, secondsRemaining, nextElementCountdownElement, usersIterator);
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

    function unfollowUsersTimeout(totalSeconds, secondsRemaining, countdownElement, usersIterator) {
        if (secondsRemaining > 0) {
            updateCountdownElement(totalSeconds, secondsRemaining, countdownElement);

            unfollowUsersTimeoutObject = setTimeout(function () {
                unfollowUsersTimeout(totalSeconds, secondsRemaining - 1, countdownElement, usersIterator);
            }, 1000);
        } else {
            unfollowUsers(usersIterator);
        }
    }

    function updateLoadingBarElement(total, loaded, loadingMessage) {
        $(loadingBarElement).circleProgress({
            value: loaded / total,
            size: "500",
            startAngle: -Math.PI / 2,
            thickness: "4px",
            fill: {
                color: "#4ac5f8"
            },
            animation: false
        });

        $(loadingMessageField).text(loadingMessage);
        $(loadingBarElement).find("strong").text(loaded + "/" + total);
    }

    function updateCountdownElement(totalSeconds, secondsRemaining, countdownElement) {
        $(countdownElement).circleProgress({
            value: (totalSeconds - secondsRemaining) / totalSeconds,
            startAngle: -Math.PI / 2,
            reverse: true,
            thickness: "4px",
            fill: {
                color: "#4ac5f8"
            },
            animation: false
        });

        $(countdownElement).find("strong").text(secondsRemaining);
    }

    function onStopUnfollowingBtnClicked() {
        clearTimeout(unfollowUsersTimeoutObject);
        $(".countdown").hide();

        $(stopUnfollowingBtn).hide();
        $(startUnfollowingBtn).show();
    }
});