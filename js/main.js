$($.when(
    $.getScript(chrome.runtime.getURL("js/elements.js")),
).done(function () {
    initializeCsrfToken();
    initializeCustomScrollBar();
    initializeSettings();
    initializeEventListeners();

    function initializeCsrfToken() {
        chrome.runtime.sendMessage({csrfToken: true}, function (response) {
            csrfToken = response;
        });
    }

    function initializeCustomScrollBar() {
        simpleBarContent = new SimpleBar($(scrollableArea)[0]).getContentElement();
        appendEmptyQueueMessage();

        let storyListContentScrollElement = new SimpleBar($(storyListContent)[0]).getScrollElement();
        storyListContentScrollElement.onwheel = onStoryListContentScroll;
    }

    function appendEmptyQueueMessage() {
        let emptyQueueMessageClone = $(emptyQueueMessage).clone().show();
        $(simpleBarContent).append($(emptyQueueMessageClone));
    }

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

    function initializeSettings() {
        chrome.storage.local.get("settings", function (item) {
            let loadedSettings = item["settings"];

            if (loadedSettings) {
                settings = loadedSettings;
            } else {
                settings = Object.assign({}, DEFAULT_SETTINGS);
            }
        });

        noUiSlider.create($(settingsToggle)[0], getSliderConfiguration(0, 0, 1, null));
        noUiSlider.create($(followUnfollowTimeout)[0], getSliderConfiguration(0, 0, 240, " Sec"));
        noUiSlider.create($(loadingUsersTimeout)[0], getSliderConfiguration(0, 0, 30, " Sec"));
        noUiSlider.create($(likingPhotosTimeout)[0], getSliderConfiguration(0, 0, 30, " Sec"));
        noUiSlider.create($(timeoutRandomization)[0], getSliderConfiguration(0, 0, 100, "%"));
        noUiSlider.create($(skipPrivateAccounts)[0], getSliderConfiguration(0, 0, 1, null));
        noUiSlider.create($(likePhotosCount)[0], getSliderConfiguration(0, 0, 5, " Photos"));
        noUiSlider.create($(skipFollowedUnfollowedUsers)[0], getSliderConfiguration(0, 0, 365, " Days"));
    }

    function getSliderConfiguration(start, min, max, suffix) {
        return {
            start: start,
            connect: Array.isArray(start) ? true : "lower",
            behaviour: "tap",
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
        window.addEventListener("message", function (event) {
            if (event.data.extractUserInfo) {
                extractUserInfo();
            }
        }, false);

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
        $(usersRangeConfirmBtn).on("click", onUsersRangeConfirmBtnClicked);
        $(usersRangeCancelBtn).on("click", hideUsersRange);
        $(followingOptionsConfirmBtn).on("click", onFollowingOptionsConfirmBtnClicked);
        $(followingOptionsCancelBtn).on("click", hideFollowingOptions);
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

    function extractUserInfo() {
        chrome.runtime.sendMessage({currentUrl: true}, function (response) {
            let matches = EXTRACT_USERNAME_REGEX.exec(response);

            if (!matches) {
                notOnProfilePage();
                return;
            }

            let currentUrl = matches[0];
            let username = matches[1];

            if (currentUser && currentUser.username === username) {
                return;
            }

            $(currentUserProfilePicture).attr("src", "../images/blank.png");
            $(usernameField).text("Loading...");

            $.ajax(currentUrl + "/?__a=1").done(function (data) {
                if (Object.keys(data).length === 0 || !data.graphql) {
                    notOnProfilePage();
                    return;
                }

                currentUser = {
                    id: data.graphql.user.id,
                    username: username,
                    followersCount: data.graphql.user.edge_followed_by.count,
                    followingCount: data.graphql.user.edge_follow.count
                };

                let currentUserProfilePictureUrl = data.graphql.user.profile_pic_url;
                $(currentUserProfilePicture).attr("src", currentUserProfilePictureUrl);
                $(usernameField).text(username);

                initializeLastCheckedField();
                initializeFollowedUnfollowedUsersMap();
                enableLoadUsersDropdown();
            });
        });
    }

    function notOnProfilePage() {
        $(currentUserProfilePicture).attr("src", "../images/blank.png");
        $(usernameField).text("Not On Profile Page");

        currentUser = undefined;
        disableLoadUsersDropdown();
    }

    function initializeLastCheckedField() {
        chrome.storage.local.get(currentUser.id, function (item) {
            lastChecked = item[currentUser.id];
        });
    }

    function initializeFollowedUnfollowedUsersMap() {
        chrome.storage.local.get({"followedUnfollowedUsersMap": new Map()}, function (item) {
            followedUnfollowedUsersMap = item["followedUnfollowedUsersMap"];
        });
    }

    function enableLoadUsersDropdown() {
        $(loadUsersDropdown).removeClass(DISABLED_CLASS);
    }

    function disableLoadUsersDropdown() {
        $(loadUsersDropdown).addClass(DISABLED_CLASS);
    }

    function onOverlayClicked(e) {
        if (!$(e.target).is($(overlay))) {
            return;
        }

        hideSettingsPage();
        hideUsersRange();
        hideFollowingOptions();
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
        settings.loadFollowersQueryHash = $(loadFollowersQueryHashInput).val();
        settings.loadFollowingQueryHash = $(loadFollowingQueryHashInput).val();
        settings.loadStoryListQueryHash = $(loadStoryListQueryHashInput).val();
        settings.loadStoryViewersQueryHash = $(loadStoryViewersQueryHashInput).val();
        settings.followUnfollowTimeout = parseInt($(followUnfollowTimeout)[0].noUiSlider.get());
        settings.loadingUsersTimeout = parseInt($(loadingUsersTimeout)[0].noUiSlider.get());
        settings.likingPhotosTimeout = parseInt($(likingPhotosTimeout)[0].noUiSlider.get());
        settings.timeoutRandomization = parseInt($(timeoutRandomization)[0].noUiSlider.get());

        chrome.storage.local.set({"settings": settings}, function () {
            hideSettingsPage();
        });
    }

    function onResetSettingsBtnClicked() {
        settings = Object.assign({}, DEFAULT_SETTINGS);

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
        $(loadingUsersTimeout)[0].noUiSlider.set(settings.loadingUsersTimeout);
        $(likingPhotosTimeout)[0].noUiSlider.set(settings.likingPhotosTimeout);
        $(timeoutRandomization)[0].noUiSlider.set(settings.timeoutRandomization);
    }

    function hideSettingsPage() {
        $(overlay).hide();
        $(settingsPage).hide();
    }

    function onSelectAllBtnClicked() {
        $(".scrollable-area .selection").addClass(SELECTED_CLASS);
        updateQueueSelectedUsersCounter();
    }

    function onSelectNoneBtnClicked() {
        $(".scrollable-area .selection").removeClass(SELECTED_CLASS);
        updateQueueSelectedUsersCounter();
    }

    function onRevertSelectionBtnClicked() {
        $(".scrollable-area .selection").toggleClass(SELECTED_CLASS);
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

        let endHandleOrigin = $($(usersRangeSlider)[0]).find('.noUi-origin')[1];
        $(endHandleOrigin).attr("disabled", "true");

        let endHandle = $(endHandleOrigin).find('.noUi-handle');
        $(endHandle).addClass(DISABLED_CLASS);

        $(overlay).css("display", "flex");
        $(usersRange).show();
    }

    function onLoadNotFollowingBackBtnClicked() {
        loadFollowers(loadFollowing, 0, "", null);
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
            $(storyElement).addClass(STORY_ELEMENT_CLASS);

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

    function hideFollowingOptions() {
        $(overlay).hide();
        $(followingOptions).hide();
    }

    function onPopupConfirmBtnClicked() {
        hidePopup();
        loadFollowers(loadUnfollowed, 0, "", null);
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

    function loadFollowers(callback, loadedFollowersCount, endCursor, limit) {
        let jsonVars = {
            id: currentUser.id,
            first: settings.loadingUsersBatchSize,
            after: endCursor
        };

        let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));

        $.ajax("https://www.instagram.com/graphql/query/?query_hash=" + settings.loadFollowersQueryHash + "&variables=" + encodedJsonVars)
            .done(function (data) {
                let followers = data.data.user.edge_followed_by.edges;
                let totalFollowersCount = data.data.user.edge_followed_by.count;
                let limitReached = false;

                for (let follower of followers) {
                    if (limit && loadedFollowersCount >= limit) {
                        limitReached = true;
                        break;
                    }

                    let user = {
                        id: follower.node.id,
                        username: follower.node.username,
                        full_name: follower.node.full_name,
                        profile_pic_url: follower.node.profile_pic_url,
                        is_private: follower.node.is_private
                    };

                    followersMap.set(follower.node.id, user);
                    loadedFollowersCount++;
                }

                $(loadingBarElement).css("display", "flex");
                updateLoadingBarElement(limit ? limit : totalFollowersCount, loadedFollowersCount, "Loading Followers");

                let pageInfo = data.data.user.edge_followed_by.page_info;

                if (!pageInfo.has_next_page || limitReached) {
                    if (!limitReached && !lastChecked) {
                        updateLastChecked();
                    }

                    $(loadingBarElement).hide();
                    callback(loadNotFollowingBack, 0, "", limit);
                } else {
                    let secondsRemaining = randomizeTimeout(settings.loadingUsersTimeout, settings.timeoutRandomization);

                    loadUsersTimeout(secondsRemaining, function () {
                        loadFollowers(callback, loadedFollowersCount, pageInfo.end_cursor, limit);
                    });
                }
            });
    }

    function loadFollowing(callback, loadedFollowingCount, endCursor, limit) {
        let jsonVars = {
            id: currentUser.id,
            first: settings.loadingUsersBatchSize,
            after: endCursor
        };

        let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));

        $.ajax("https://www.instagram.com/graphql/query/?query_hash=" + settings.loadFollowingQueryHash + "&variables=" + encodedJsonVars)
            .done(function (data) {
                let usersFollowing = data.data.user.edge_follow.edges;
                let totalFollowingCount = data.data.user.edge_follow.count;
                let limitReached = false;

                for (let userFollowing of usersFollowing) {
                    if (limit && loadedFollowingCount >= limit) {
                        limitReached = true;
                        break;
                    }

                    let user = {
                        id: userFollowing.node.id,
                        username: userFollowing.node.username,
                        full_name: userFollowing.node.full_name,
                        profile_pic_url: userFollowing.node.profile_pic_url,
                        is_private: userFollowing.node.is_private
                    };

                    followingMap.set(userFollowing.node.id, user);
                    loadedFollowingCount++;
                }

                $(loadingBarElement).css("display", "flex");
                updateLoadingBarElement(limit ? limit : totalFollowingCount, loadedFollowingCount, "Loading Following");

                let pageInfo = data.data.user.edge_follow.page_info;

                if (!pageInfo.has_next_page || limitReached) {
                    $(loadingBarElement).hide();
                    callback();
                } else {
                    let secondsRemaining = randomizeTimeout(settings.loadingUsersTimeout, settings.timeoutRandomization);

                    loadUsersTimeout(secondsRemaining, function () {
                        loadFollowing(callback, loadedFollowingCount, pageInfo.end_cursor, limit);
                    });
                }
            });
    }

    function loadUsersTimeout(secondsRemaining, callback) {
        if (secondsRemaining > 0) {
            timeoutObject = setTimeout(function () {
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
        followersMap.clear();
        followingMap.clear();

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

    function updateQueueSelectedUsersCounter() {
        $(queueSelectedUsersCount).text($(".selected").length + " Selected");
    }


    function onProfilePictureClicked(event) {
        let target = $(event.target);

        if ($(target).hasClass(SELECTED_CLASS)) {
            $(target).removeClass(SELECTED_CLASS);
        } else {
            $(target).addClass(SELECTED_CLASS);
        }

        updateQueueSelectedUsersCounter();
    }

    function onStartFollowingBtnClicked() {
        $(likePhotosCount)[0].noUiSlider.set(settings.likePhotosCount);
        $(skipFollowedUnfollowedUsers)[0].noUiSlider.set(settings.skipFollowedUnfollowedUsers);
        $(skipPrivateAccounts)[0].noUiSlider.set(settings.skipPrivateAccounts);

        $(overlay).css("display", "flex");
        $(followingOptions).show();
    }

    function onUsersRangeConfirmBtnClicked() {
        let values = $(usersRangeSlider)[0].noUiSlider.get();

        let start = parseInt(values[0].replace(/\s+/g, ""));
        let limit = parseInt(values[1].replace(/\s+/g, "")) - start;

        hideUsersRange();

        if ($(usersRangeHeading).text() === USERS_TYPE.FOLLOWERS.HEADING) {
            loadFollowers(drawFollowers, 0, "", limit);
        } else {
            loadFollowing(drawFollowing, 0, "", limit);
        }
    }

    function drawFollowers() {
        usersQueue.clear();

        for (let follower of followersMap.values()) {
            follower.visible = true;
            usersQueue.set(follower.id, follower);
        }

        drawUsers();
    }

    function drawFollowing() {
        usersQueue.clear();

        for (let userFollowing of followingMap.values()) {
            userFollowing.visible = true;
            usersQueue.set(userFollowing.id, userFollowing);
        }

        drawUsers();
    }

    function onFollowingOptionsConfirmBtnClicked() {
        settings.skipPrivateAccounts = parseInt($(skipPrivateAccounts)[0].noUiSlider.get());
        settings.likePhotosCount = parseInt($(likePhotosCount)[0].noUiSlider.get());
        settings.skipFollowedUnfollowedUsers = parseInt($(skipFollowedUnfollowedUsers)[0].noUiSlider.get());

        chrome.storage.local.set({"settings": settings});

        hideFollowingOptions();
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

        let shouldSkipPrivateUser = settings.skipPrivateAccounts === 1 && user.is_private;
        let shouldSkipFollowedUnfollowedUser = false;

        if (followedUnfollowedUsersMap.has(user.id)) {
            let millisecondsPassedSinceFollowUnfollow = Date.now() - followedUnfollowedUsersMap[user.id];
            let daysPassedSinceFollowUnfollow = (((((millisecondsPassedSinceFollowUnfollow) / 1000) / 60) / 60) / 24);

            if (daysPassedSinceFollowUnfollow < settings.skipFollowedUnfollowedUsers) {
                shouldSkipFollowedUnfollowedUser = true;
            }
        }

        if (processType === PROCESS_TYPE.FOLLOWING && (shouldSkipPrivateUser || shouldSkipFollowedUnfollowedUser)) {
            onUserProcessed(user, users, processType, true);
            return;
        }

        $.ajax({
            url: "https://www.instagram.com/web/friendships/" + user.id + processType.ENDPOINT,
            method: "POST",
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-csrftoken', csrfToken);
            }
        })
            .done(function () {
                if (processType === PROCESS_TYPE.FOLLOWING && settings.likePhotosCount > 0) {
                    let countdownElement = $("div#" + user.id).find(".countdown").show();
                    getLatestPhotosIds(user, users, countdownElement, settings.likePhotosCount);
                } else {
                    onUserProcessed(user, users, processType, false);
                }
            });
    }

    function onUserProcessed(user, users, processType, skipped) {
        let userElement = $("div#" + user.id);
        let profilePictureContainer = $(userElement).find(".profilePictureContainer");
        $(profilePictureContainer).find(".countdown").hide();

        if (skipped) {
            $(profilePictureContainer).find(".selection").addClass(SKIPPED_CLASS);
        } else {
            $(profilePictureContainer).find(".selection").addClass(processType.PROCESSED_CLASS);

            followedUnfollowedUsersMap[user.id] = Date.now();
            chrome.storage.local.set({"followedUnfollowedUsersMap": followedUnfollowedUsersMap});
        }

        usersQueue.delete(user.id);

        if (users.length === 0) {
            enableElements(processType);
            return;
        }

        let nextUser = users[0];
        let nextElementCountdownElement = $("div#" + nextUser.id).find(".countdown").show();

        let secondsRemaining;

        if (processType === PROCESS_TYPE.FOLLOWING && settings.skipPrivateAccounts === 1 && nextUser.is_private) {
            secondsRemaining = 0;
        } else {
            secondsRemaining = randomizeTimeout(settings.followUnfollowTimeout, settings.timeoutRandomization);
        }

        processUsersTimeout(secondsRemaining, secondsRemaining, nextElementCountdownElement, users, processType);
    }

    function getLatestPhotosIds(user, users, countdownElement, count) {
        let photosIds = [];

        $.ajax("https://www.instagram.com/" + user.username + "/?__a=1").done(function (data) {
            let photos = data.graphql.user.edge_owner_to_timeline_media.edges;
            let loadedCount = 0;

            for (let photo of photos) {
                if (loadedCount >= count) {
                    break;
                }

                photosIds.push(photo.node.id);
                loadedCount++;
            }

            if (photosIds.length === 0) {
                onUserProcessed(user, users, PROCESS_TYPE.FOLLOWING, false);
            } else {
                let text = "0/" + photosIds.length;
                updateCountdownElement(photosIds.length, photosIds.length, text, countdownElement);

                likePhotos(user, users, countdownElement, photosIds, photosIds.length);
            }
        });
    }

    function likePhotos(user, users, countdownElement, photosIds, totalPhotosCount) {
        let photoId = photosIds.shift();

        $.ajax({
            url: "https://www.instagram.com/web/likes/" + photoId + "/like/",
            method: "POST",
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-csrftoken', csrfToken);
            }
        })
            .done(function () {
                if (photosIds.length === 0) {
                    onUserProcessed(user, users, PROCESS_TYPE.FOLLOWING, false);
                    return;
                }

                let text = (totalPhotosCount - photosIds.length) + "/" + totalPhotosCount;
                updateCountdownElement(totalPhotosCount, photosIds.length, text, countdownElement);

                let secondsRemaining = randomizeTimeout(settings.likingPhotosTimeout, settings.timeoutRandomization);
                likePhotosTimeout(secondsRemaining, secondsRemaining, user, users, countdownElement, photosIds, totalPhotosCount);
            });
    }

    function likePhotosTimeout(totalSeconds, secondsRemaining, user, users, countdownElement, photosIds, totalPhotosCount) {
        if (secondsRemaining > 0) {
            timeoutObject = setTimeout(function () {
                likePhotosTimeout(totalSeconds, secondsRemaining - 1, user, users, countdownElement, photosIds, totalPhotosCount);
            }, 1000);
        } else {
            likePhotos(user, users, countdownElement, photosIds, totalPhotosCount);
        }
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
            updateCountdownElement(totalSeconds, secondsRemaining, secondsRemaining, countdownElement);

            timeoutObject = setTimeout(function () {
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

    function updateCountdownElement(total, remaining, text, countdownElement) {
        $(countdownElement).circleProgress({
            value: (total - remaining) / total,
            startAngle: -Math.PI / 2,
            reverse: true,
            thickness: "4px",
            fill: {
                color: "#4ac5f8"
            },
            animation: false
        });

        $(countdownElement).find("strong").text(text);
    }

    function onStopFollowingBtnClicked() {
        clearTimeout(timeoutObject);
        $(".countdown").hide();

        enableElements(PROCESS_TYPE.FOLLOWING);
    }

    function onStopUnfollowingBtnClicked() {
        clearTimeout(timeoutObject);
        $(".countdown").hide();

        enableElements(PROCESS_TYPE.UNFOLLOWING);
    }

    function onStopLoadingBtnClicked() {
        clearTimeout(timeoutObject);
        $(loadingBarElement).hide();
    }

    function onSearchBarInputKeyUp(event) {
        clearTimeout(timeoutObject);

        timeoutObject = setTimeout(function () {
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
        $(bottomDot).removeClass(RED_DOT_CLASS);
        $(topDot).addClass(GREEN_DOT_CLASS);

        $(startUnfollowingBtn).hide();
        $(startFollowingBtn).css("display", "inline-flex");
    }

    function onBottomDotClicked() {
        $(topDot).removeClass(GREEN_DOT_CLASS);
        $(bottomDot).addClass(RED_DOT_CLASS);

        $(startFollowingBtn).hide();
        $(startUnfollowingBtn).css("display", "inline-flex");
    }

    function disableElements(processType) {
        $(startFollowingBtn).hide();
        $(startUnfollowingBtn).hide();

        if (processType === PROCESS_TYPE.FOLLOWING) {
            $(stopFollowingBtn).css("display", "inline-flex");
            $(topDot).addClass(RED_DOT_CLASS);
        } else {
            $(stopUnfollowingBtn).css("display", "inline-flex");
        }

        $(searchBarInput).addClass(DISABLED_CLASS);
        $(loadUsersDropdown).addClass(DISABLED_CLASS);
        $(queueActionsDropdown).addClass(DISABLED_CLASS);
        $(selectionDropdown).addClass(DISABLED_CLASS);
        $(dots).addClass(DISABLED_CLASS);
        $(".selection").addClass(DISABLED_CLASS);
    }

    function enableElements(processType) {
        $(stopFollowingBtn).hide();
        $(stopUnfollowingBtn).hide();

        if (processType === PROCESS_TYPE.FOLLOWING) {
            $(startFollowingBtn).show();
            $(topDot).removeClass(RED_DOT_CLASS);
        } else {
            $(startUnfollowingBtn).show();
        }

        if (currentUser) {
            $(loadUsersDropdown).removeClass(DISABLED_CLASS);
        }

        $(searchBarInput).removeClass(DISABLED_CLASS);
        $(queueActionsDropdown).removeClass(DISABLED_CLASS);
        $(selectionDropdown).removeClass(DISABLED_CLASS);
        $(dots).removeClass(DISABLED_CLASS);
        $(".selection").removeClass(DISABLED_CLASS);
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
}));