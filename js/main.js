// Global Variables
let csrfToken;
let currentUser;
let settings;
let loadUsersTimeoutObject;
let processUsersTimeoutObject;
let lastChecked;
let searchBarTimeout;
let visibleUsersCount = 0;

// Constants
let defaultSettings = {
    "loadFollowersQueryHash": "c76146de99bb02f6415203be841dd25a",
    "loadFollowingQueryHash": "d04b0a864b4b54837c0d870b0e77e076",
    "loadStoryListQueryHash": "90709b530ea0969f002c86a89b4f2b8d",
    "loadStoryViewersQueryHash": "42c6ec100f5e57a1fe09be16cd3a7021",
    "followUnfollowTimeout": 60,
    "loadingUsersBatchSize": 48,
    "loadingUsersTimeout": 3,
    "timeoutRandomization": 50,
    "likePhotosCount": 1
};

let extractUsernameRegex = /.*instagram\.com\/[^\/]+/;

let selectedClass = "selected";
let followedClass = "followed";
let unfollowedClass = "unfollowed";
let disabledClass = "disabled";
let storyElementClass = "storyElement";
let greenDotClass = "greenDot";
let redDotClass = "redDot";

const PROCESS_TYPE = {
    FOLLOWING: {
        ENDPOINT: "/follow/",
        PROCESSED_CLASS: followedClass
    },
    UNFOLLOWING: {
        ENDPOINT: "/unfollow/",
        PROCESSED_CLASS: unfollowedClass
    },
};

const USERS_TYPE = {
    FOLLOWERS: {
        HEADING: "Select Followers Range To Load"
    },
    FOLLOWING: {
        HEADING: "Select Following Range To Load"
    },
};

// In-Memory Collections
let followersMap = new Map();
let followingMap = new Map();
let usersQueue = new Map();

chrome.runtime.sendMessage({csrfToken: true}, function (response) {
    csrfToken = response;
});

$(function () {
    // Buttons
    let settingsBtn = $("#settingsBtn");
    let cancelSettingsBtn = $("#cancelSettingsBtn");
    let saveSettingsBtn = $("#saveSettingsBtn");
    let resetSettingsBtn = $("#resetSettingsBtn");
    let selectAllBtn = $("#selectAllBtn");
    let selectNoneBtn = $("#selectNoneBtn");
    let revertSelectionBtn = $("#revertSelectionBtn");
    let removeSelectedBtn = $("#removeSelectedBtn");
    let loadUsersDropdown = $("#loadUsersDropdown");
    let queueActionsDropdown = $("#queueActionsDropdown");
    let selectionDropdown = $("#selectionDropdown");
    let loadFollowersBtn = $("#loadFollowersBtn");
    let loadFollowingBtn = $("#loadFollowingBtn");
    let loadNotFollowingBackBtn = $("#loadNotFollowingBackBtn");
    let loadUnfollowedBtn = $("#loadUnfollowedBtn");
    let loadStoryViewersBtn = $("#loadStoryViewersBtn");
    let loadQueueBtn = $("#loadQueueBtn");
    let saveQueueBtn = $("#saveQueueBtn");
    let startFollowingBtn = $("#startFollowingBtn");
    let startUnfollowingBtn = $("#startUnfollowingBtn");
    let stopFollowingBtn = $("#stopFollowingBtn");
    let stopUnfollowingBtn = $("#stopUnfollowingBtn");
    let stopLoadingBtn = $("#stopLoadingBtn");

    // Settings Page
    let overlay = $(".overlay");
    let settingsPage = $(".settingsPage");
    let settingsHeading = $("#settingsHeading");
    let settingsToggle = $("#settingsToggle");
    let basicSettings = $("#basicSettings");
    let advancedSettings = $("#advancedSettings");
    let loadFollowersQueryHashInput = $("#loadFollowersQueryHash");
    let loadFollowingQueryHashInput = $("#loadFollowingQueryHash");
    let loadStoryListQueryHashInput = $("#loadStoryListQueryHash");
    let loadStoryViewersQueryHashInput = $("#loadStoryViewersQueryHash");
    let followUnfollowTimeout = $("#followUnfollowTimeout");
    let loadingUsersBatchSize = $("#loadingUsersBatchSize");
    let loadingUsersTimeout = $("#loadingUsersTimeout");
    let timeoutRandomization = $("#timeoutRandomization");
    let likePhotosCount = $("#likePhotosCount");

    //Users Range
    let usersRange = $("#usersRange");
    let usersRangeHeading = $("#usersRangeHeading");
    let usersRangeSlider = $("#usersRangeSlider");
    let usersRangeConfirmBtn = $("#usersRangeConfirmBtn");
    let usersRangeCancelBtn = $("#usersRangeCancelBtn");

    //Popup
    let popup = $("#popup");
    let popupMessage = $("#popupMessage");
    let popupConfirmBtn = $("#popupConfirmBtn");
    let popupCancelBtn = $("#popupCancelBtn");

    //Story List
    let storyList = $("#storyList");
    let storyListHeading = $("#storyListHeading");
    let storyListContent = $("#storyListContent");
    let storyListCancelBtn = $("#storyListCancelBtn");

    // Other Elements
    let currentUserProfilePicture = $("#currentUserProfilePicture");
    let usernameField = $("#username");
    let scrollableArea = $(".scrollable-area");
    let userElement = $("div.userElement");
    let loadQueueFileInput = $("#loadQueueFileSelector");
    let queueTotalUsersCount = $("#queueTotalUsersCount");
    let queueSelectedUsersCount = $("#queueSelectedUsersCount");
    let loadingBarElement = $("#loadingBar");
    let loadingMessageField = $("#loadingMessage");
    let searchBarInput = $("#searchBarInput");
    let emptyQueueMessage = $("#emptyQueueMessage");
    let dots = $("#dots");
    let topDot = $("#topDot");
    let bottomDot = $("#bottomDot");
    let simpleBarContent;

    initializeCustomScrollBar();
    initializeSettings();
    initializeEventListeners();

    function onStoryListContentScroll(event) {
        let elementToScroll = event.currentTarget;

        clearTimeout(elementToScroll.timer);
        elementToScroll.timer = setTimeout(() => {
            elementToScroll.scrollTo({
                left: event.deltaY > 0 ? elementToScroll.scrollLeft + 100 : elementToScroll.scrollLeft - 100
            });
        }, 10);

        event.preventDefault();
    }

    chrome.runtime.onMessage.addListener(
        function (request) {
            if (request.extractUserInfo) {
                extractUserInfo();
            }
        });

    function extractUserInfo() {
        chrome.runtime.sendMessage({currentUrl: true}, function (response) {
            $(currentUserProfilePicture).attr("src", "../images/blank.png");
            $(usernameField).text("Loading...");

            disableLoadUsersDropdown();

            let currentUrl = response;
            let matches = extractUsernameRegex.exec(currentUrl);

            if (!matches) {
                $(usernameField).text("Not On Profile Page");
                return;
            }

            $.ajax(matches[0] + "/?__a=1").done(function (data) {
                if (Object.keys(data).length === 0 || !data.graphql) {
                    $(usernameField).text("Not On Profile Page");
                    return;
                }

                currentUser = {
                    id: data.graphql.user.id,
                    followersCount: data.graphql.user.edge_followed_by.count,
                    followingCount: data.graphql.user.edge_follow.count
                };

                let currentUserProfilePictureUrl = data.graphql.user.profile_pic_url;
                let currentUsername = currentUrl.split("/")[3];

                $(currentUserProfilePicture).attr("src", currentUserProfilePictureUrl);
                $(usernameField).text(currentUsername);

                initializeLastCheckedField();
                enableLoadUsersDropdown();
            });
        });
    }

    function initializeLastCheckedField() {
        chrome.storage.local.get(currentUser.id, function (item) {
            lastChecked = item[currentUser.id];
        });
    }

    function enableLoadUsersDropdown() {
        $(loadUsersDropdown).removeClass(disabledClass);
    }

    function disableLoadUsersDropdown() {
        $(loadUsersDropdown).addClass(disabledClass);
    }

    function initializeCustomScrollBar() {
        simpleBarContent = new SimpleBar($(scrollableArea)[0]).getContentElement();
        appendEmptyQueueMessage();

        let storyListContentScrollElement = new SimpleBar($(storyListContent)[0]).getScrollElement();
        storyListContentScrollElement.onwheel = onStoryListContentScroll;
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

        noUiSlider.create($(settingsToggle)[0], getSliderConfiguration(0, 0, 1, null));

        noUiSlider.create($(followUnfollowTimeout)[0], getSliderConfiguration(0, 0, 240, " Sec"));
        noUiSlider.create($(loadingUsersBatchSize)[0], getSliderConfiguration(0, 12, 96, " Users"));
        noUiSlider.create($(loadingUsersTimeout)[0], getSliderConfiguration(0, 0, 60, " Sec"));
        noUiSlider.create($(timeoutRandomization)[0], getSliderConfiguration(0, 0, 100, "%"));
        noUiSlider.create($(likePhotosCount)[0], getSliderConfiguration(0, 0, 10, " Photos"));
    }

    function getSliderConfiguration(start, min, max, suffix) {
        return {
            start: start,
            connect: Array.isArray(start) ? true : "lower",
            behaviour: Array.isArray(start) ? "drag" : "tap",
            range: {
                'min': min,
                'max': max
            },
            step: 1,
            format: wNumb({
                suffix: suffix ? suffix : "",
                decimals: 0,
                thousand: " "
            }),
            tooltips: !!suffix
        }
    }

    function initializeEventListeners() {
        $(overlay).on("mousedown", onOverlayClicked);
        $(settingsBtn).on("click", onSettingsBtnClicked);
        $(settingsToggle)[0].noUiSlider.on('update', onSettingsToggle);
        $(cancelSettingsBtn).on("click", hideSettingsPage);
        $(saveSettingsBtn).on("click", onSaveSettingsBtnClicked);
        $(resetSettingsBtn).on("click", onResetSettingsBtnClicked);
        $(selectAllBtn).on("click", onSelectAllBtnClicked);
        $(selectNoneBtn).on("click", onSelectNoneBtnClicked);
        $(revertSelectionBtn).on("click", onRevertSelectionBtnClicked);
        $(removeSelectedBtn).on("click", onRemoveSelectedBtnClicked);
        $(loadFollowersBtn).on("click", onLoadFollowersBtnClicked);
        $(loadFollowingBtn).on("click", onLoadFollowingBtnClicked);
        $(loadNotFollowingBackBtn).on("click", onLoadNotFollowingBackBtnClicked);
        $(loadUnfollowedBtn).on("click", onLoadUnfollowedBtnClicked);
        $(loadStoryViewersBtn).on("click", onLoadStoryViewersBtnClicked);
        $(storyListCancelBtn).on("click", hideStoryList);
        $(usersRangeCancelBtn).on("click", hideUsersRange);
        $(popupConfirmBtn).on("click", onPopupConfirmBtnClicked);
        $(popupCancelBtn).on("click", hidePopup);
        $(loadQueueBtn).on("click", onLoadQueueBtnClicked);
        $(loadQueueFileInput).on("change", onLoadQueueFileInputChange);
        $(saveQueueBtn).on("click", onSaveQueueBtnClicked);
        $(startFollowingBtn).on("click", onStartFollowingBtnClicked);
        $(startUnfollowingBtn).on("click", onStartUnfollowingBtnClicked);
        $(stopFollowingBtn).on("click", onStopFollowingBtnClicked);
        $(stopUnfollowingBtn).on("click", onStopUnfollowingBtnClicked);
        $(stopLoadingBtn).on("click", onStopLoadingBtnClicked);
        $(searchBarInput).on("keyup", onSearchBarInputKeyUp);
        $(topDot).on("click", onTopDotClicked);
        $(bottomDot).on("click", onBottomDotClicked);
    }

    function onOverlayClicked(e) {
        if (!$(e.target).is($(overlay))) {
            return;
        }

        hideSettingsPage();
        hideUsersRange();
        hidePopup();
        hideStoryList();
    }

    function onSettingsBtnClicked() {
        populateSettings();

        $(overlay).css("display", "flex");
        $(settingsPage).show();
    }

    function onSettingsToggle(values, handle) {
        if (values[handle] === '1') {
            $(settingsHeading).text("Advanced Settings");
            $(basicSettings).hide();
            $(advancedSettings).show();
        } else {
            $(settingsHeading).text("Settings");
            $(advancedSettings).hide();
            $(basicSettings).show();
        }
    }

    function onSaveSettingsBtnClicked() {
        settings = {
            "loadFollowersQueryHash": $(loadFollowersQueryHashInput).val(),
            "loadFollowingQueryHash": $(loadFollowingQueryHashInput).val(),
            "loadStoryListQueryHash": $(loadStoryListQueryHashInput).val(),
            "loadStoryViewersQueryHash": $(loadStoryViewersQueryHashInput).val(),
            "followUnfollowTimeout": parseInt($(followUnfollowTimeout)[0].noUiSlider.get()),
            "loadingUsersBatchSize": parseInt($(loadingUsersBatchSize)[0].noUiSlider.get()),
            "loadingUsersTimeout": parseInt($(loadingUsersTimeout)[0].noUiSlider.get()),
            "timeoutRandomization": parseInt($(timeoutRandomization)[0].noUiSlider.get()),
            "likePhotosCount": parseInt($(likePhotosCount)[0].noUiSlider.get())
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
        $(followUnfollowTimeout)[0].noUiSlider.set(settings.followUnfollowTimeout);
        $(loadingUsersBatchSize)[0].noUiSlider.set(settings.loadingUsersBatchSize);
        $(loadingUsersTimeout)[0].noUiSlider.set(settings.loadingUsersTimeout);
        $(timeoutRandomization)[0].noUiSlider.set(settings.timeoutRandomization);
        $(likePhotosCount)[0].noUiSlider.set(settings.likePhotosCount);
    }

    function hideSettingsPage() {
        $(overlay).hide();
        $(settingsPage).hide();
    }

    function onSelectAllBtnClicked() {
        $(".scrollable-area .selection").addClass(selectedClass);
        updateQueueSelectedUsersCounter();
    }

    function onSelectNoneBtnClicked() {
        $(".scrollable-area .selection").removeClass(selectedClass);
        updateQueueSelectedUsersCounter();
    }

    function onRevertSelectionBtnClicked() {
        $(".scrollable-area .selection").toggleClass(selectedClass);
        updateQueueSelectedUsersCounter();
    }

    function onRemoveSelectedBtnClicked() {
        let selectedUsers = $(".selected").parent().parent();

        for (let selectedUser of selectedUsers) {
            $(selectedUser).remove();
            usersQueue.delete($(selectedUser).attr("id"));
            visibleUsersCount--;
        }

        updateQueueTotalUsersCounter(visibleUsersCount);
        updateQueueSelectedUsersCounter();
    }

    function onLoadFollowersBtnClicked() {
        loadUsersRange(USERS_TYPE.FOLLOWERS);
    }

    function onLoadFollowingBtnClicked() {
        loadUsersRange(USERS_TYPE.FOLLOWING);
    }

    function loadUsersRange(usersType) {
        $(usersRangeHeading).text(usersType.HEADING);

        let start;
        let end;

        if (usersType === USERS_TYPE.FOLLOWERS) {
            end = currentUser.followersCount;
        } else {
            end = currentUser.followingCount;
        }

        start = end - 2048;

        if (start < 0) {
            start = 0;
        }

        if ($(usersRangeSlider)[0].noUiSlider) {
            $(usersRangeSlider)[0].noUiSlider.destroy();
        }

        noUiSlider.create($(usersRangeSlider)[0], getSliderConfiguration([start, end], 0, end, " "));
        mergeTooltips($(usersRangeSlider)[0], 20, " - ");

        $(overlay).css("display", "flex");
        $(usersRange).show();
    }

    function onLoadNotFollowingBackBtnClicked() {
        loadFollowers(loadFollowing, 0, "");
    }

    function onLoadUnfollowedBtnClicked() {
        if (lastChecked) {
            $(popupMessage).text("Clicking confirm will load all users who have unfollowed since " + lastChecked.timestamp + ".");
        } else {
            $(popupMessage).text("There is no data for this account's followers. Click confirm to load them for the first time.");
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
                currentUser.id
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
                let stories = data.data.reels_media[0] ? data.data.reels_media[0].items : [];
                drawStoryList(stories);
            });
    }

    function drawStoryList(stories) {
        if (stories.length === 0) {
            $(storyListHeading).text("No Stories");
        } else {
            $(storyListHeading).text("Select Story");
        }

        let simpleBarContent = $("#storyListContent .simplebar-content");
        $(simpleBarContent).empty();

        for (let story of stories) {
            let storyElement = $("<img>");
            $(storyElement).attr("id", story.id);
            $(storyElement).attr("src", story.display_url);
            $(storyElement).addClass(storyElementClass);

            $(storyElement).on("click", onStoryElementClicked);
            $(simpleBarContent).append($(storyElement));
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

    function hideUsersRange() {
        $(overlay).hide();
        $(usersRange).hide();
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
        usersQueue.clear();

        for (let previousFollower of previousFollowers) {
            if (followersMap.has(previousFollower.id)) {
                continue;
            }

            previousFollower.visible = true;
            usersQueue.set(previousFollower.id, previousFollower);
        }

        drawUsers();
    }

    function updateLastChecked() {
        let lastCheckedUpdated = {
            "followers": Array.from(followersMap.values()),
            "timestamp": getCurrentTimestamp()
        };

        chrome.storage.local.set({[currentUser.id]: lastCheckedUpdated}, function () {
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
                usersQueue.clear();

                for (let user of users) {
                    user.visible = true;
                    usersQueue.set(user.id, user);
                }

                drawUsers();
            };
        }
    }

    function onSaveQueueBtnClicked() {
        let queue = Array.from(usersQueue.values());

        let blob = new Blob([JSON.stringify(queue)], {type: "text/plain"});
        let url = URL.createObjectURL(blob);

        chrome.runtime.sendMessage({download: {url: url, filename: "queue.txt"}})
    }

    function loadFollowers(callback, loadedFollowersCount, after) {
        let jsonVars = {
            id: currentUser.id,
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
            id: currentUser.id,
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
        usersQueue.clear();

        for (let userFollowing of followingMap.values()) {
            if (followersMap.has(userFollowing.id)) {
                continue;
            }

            userFollowing.visible = true;
            usersQueue.set(userFollowing.id, userFollowing);
        }

        drawUsers();
    }

    function drawUsers() {
        $(simpleBarContent).empty();
        visibleUsersCount = 0;

        for (let user of usersQueue.values()) {
            if (!user.visible) {
                continue;
            }

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
            visibleUsersCount++;
        }

        updateQueueTotalUsersCounter(visibleUsersCount);
        updateQueueSelectedUsersCounter();

        $(".selection").on("click", onProfilePictureClicked);
    }

    function updateQueueTotalUsersCounter(count) {
        if (count === 0) {
            appendEmptyQueueMessage();
        }

        $(queueTotalUsersCount).text(count + " Users");
    }

    function appendEmptyQueueMessage() {
        let emptyQueueMessageClone = $(emptyQueueMessage).clone().show();
        $(simpleBarContent).append($(emptyQueueMessageClone));
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

    function onStartFollowingBtnClicked() {
        startProcessingQueue(PROCESS_TYPE.FOLLOWING);
    }

    function onStartUnfollowingBtnClicked() {
        startProcessingQueue(PROCESS_TYPE.UNFOLLOWING);
    }

    function startProcessingQueue(processType) {
        if (usersQueue.size === 0) {
            return;
        }

        disableElements(processType);
        onSelectNoneBtnClicked();

        let usersToProcess = [];

        for (let user of usersQueue.values()) {
            if (!user.visible) {
                continue;
            }

            usersToProcess.push(user);
        }

        processUsers(usersToProcess, processType);
    }

    function processUsers(users, processType) {
        let user = users.shift();

        $.ajax({
            url: "https://www.instagram.com/web/friendships/" + user.id + processType.ENDPOINT,
            method: "POST",
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-csrftoken', csrfToken);
            }
        })
            .done(function () {
                let userElement = $("div#" + user.id);
                let profilePictureContainer = $(userElement).find(".profilePictureContainer");

                $(profilePictureContainer).find(".countdown").hide();
                $(profilePictureContainer).find(".selection").addClass(processType.PROCESSED_CLASS);

                usersQueue.delete(user.id);

                if (users.length === 0) {
                    $(stopFollowingBtn).hide();
                    $(stopUnfollowingBtn).hide();

                    if (processType === PROCESS_TYPE.FOLLOWING) {
                        $(startFollowingBtn).show();
                    } else {
                        $(startUnfollowingBtn).show();
                    }

                    enableElements();
                    return;
                }

                let nextUser = users[0];
                let nextElementCountdownElement = $("div#" + nextUser.id).find(".countdown");
                $(nextElementCountdownElement).show();

                let secondsRemaining = randomizeTimeout(settings.followUnfollowTimeout, settings.timeoutRandomization);
                processUsersTimeout(secondsRemaining, secondsRemaining, nextElementCountdownElement, users);
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

    function processUsersTimeout(totalSeconds, secondsRemaining, countdownElement, users, processType) {
        if (secondsRemaining > 0) {
            updateCountdownElement(totalSeconds, secondsRemaining, countdownElement);

            processUsersTimeoutObject = setTimeout(function () {
                processUsersTimeout(totalSeconds, secondsRemaining - 1, countdownElement, users, processType);
            }, 1000);
        } else {
            processUsers(users, processType);
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

    function onStopFollowingBtnClicked() {
        clearTimeout(processUsersTimeoutObject);
        $(".countdown").hide();

        enableElements();
        $(stopFollowingBtn).hide();
        $(startFollowingBtn).show();
    }

    function onStopUnfollowingBtnClicked() {
        clearTimeout(processUsersTimeoutObject);
        $(".countdown").hide();

        enableElements();
        $(stopUnfollowingBtn).hide();
        $(startUnfollowingBtn).show();
    }

    function onStopLoadingBtnClicked() {
        clearTimeout(loadUsersTimeoutObject);
        $(loadingBarElement).hide();
    }

    function onSearchBarInputKeyUp(event) {
        clearTimeout(searchBarTimeout);

        searchBarTimeout = setTimeout(function () {
            searchUsers($(event.currentTarget).val())
        }, 500);
    }

    function searchUsers(value) {
        for (let user of usersQueue.values()) {
            user.visible = user.username.toLowerCase().startsWith(value.toLowerCase()) ||
                user.full_name.toLowerCase().startsWith(value.toLowerCase());
        }

        drawUsers();
    }

    function onTopDotClicked() {
        $(bottomDot).removeClass(redDotClass);
        $(topDot).addClass(greenDotClass);

        $(startUnfollowingBtn).hide();
        $(startFollowingBtn).css("display", "inline-flex");
    }

    function onBottomDotClicked() {
        $(topDot).removeClass(greenDotClass);
        $(bottomDot).addClass(redDotClass);

        $(startFollowingBtn).hide();
        $(startUnfollowingBtn).css("display", "inline-flex");
    }

    function disableElements(processType) {
        $(startFollowingBtn).hide();
        $(startUnfollowingBtn).hide();

        if (processType === PROCESS_TYPE.FOLLOWING) {
            $(stopFollowingBtn).css("display", "inline-flex");
        } else {
            $(stopUnfollowingBtn).css("display", "inline-flex");
        }

        $(searchBarInput).addClass(disabledClass);
        $(loadUsersDropdown).addClass(disabledClass);
        $(queueActionsDropdown).addClass(disabledClass);
        $(selectionDropdown).addClass(disabledClass);
        $(dots).addClass(disabledClass);
        $(".selection").addClass(disabledClass);
    }

    function enableElements() {
        if (currentUser) {
            $(loadUsersDropdown).removeClass(disabledClass);
        }

        $(searchBarInput).removeClass(disabledClass);
        $(queueActionsDropdown).removeClass(disabledClass);
        $(selectionDropdown).removeClass(disabledClass);
        $(dots).removeClass(disabledClass);
        $(".selection").removeClass(disabledClass);
    }

    function mergeTooltips(slider, threshold, separator) {
        let textIsRtl = getComputedStyle(slider).direction === 'rtl';
        let isRtl = slider.noUiSlider.options.direction === 'rtl';
        let isVertical = slider.noUiSlider.options.orientation === 'vertical';
        let tooltips = slider.noUiSlider.getTooltips();
        let origins = slider.noUiSlider.getOrigins();

        tooltips.forEach(function (tooltip, index) {
            if (tooltip) {
                origins[index].appendChild(tooltip);
            }
        });

        slider.noUiSlider.on('update', function (values, handle, unencoded, tap, positions) {
            let pools = [[]];
            let poolPositions = [[]];
            let poolValues = [[]];
            let atPool = 0;

            if (tooltips[0]) {
                pools[0][0] = 0;
                poolPositions[0][0] = positions[0];
                poolValues[0][0] = values[0];
            }

            for (let i = 1; i < positions.length; i++) {
                if (!tooltips[i] || (positions[i] - positions[i - 1]) > threshold) {
                    atPool++;
                    pools[atPool] = [];
                    poolValues[atPool] = [];
                    poolPositions[atPool] = [];
                }

                if (tooltips[i]) {
                    pools[atPool].push(i);
                    poolValues[atPool].push(values[i]);
                    poolPositions[atPool].push(positions[i]);
                }
            }

            pools.forEach(function (pool, poolIndex) {
                let handlesInPool = pool.length;

                for (let j = 0; j < handlesInPool; j++) {
                    let handleNumber = pool[j];

                    if (j === handlesInPool - 1) {
                        let offset = 0;

                        poolPositions[poolIndex].forEach(function (value) {
                            offset += 1000 - 10 * value;
                        });

                        let direction = isVertical ? 'bottom' : 'right';
                        let last = isRtl ? 0 : handlesInPool - 1;
                        let lastOffset = 1000 - 10 * poolPositions[poolIndex][last];
                        offset = (textIsRtl && !isVertical ? 100 : 0) + (offset / handlesInPool) - lastOffset;

                        tooltips[handleNumber].innerHTML = poolValues[poolIndex].join(separator);
                        tooltips[handleNumber].style.display = 'block';
                        tooltips[handleNumber].style[direction] = offset + '%';
                    } else {
                        tooltips[handleNumber].style.display = 'none';
                    }
                }
            });
        });
    }
});