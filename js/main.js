appendEmptyQueueMessage();
initializeCsrfToken();
initializeUserId();
initializeSettings();
initializeEventListeners();

function initializeCsrfToken() {
    chrome.runtime.sendMessage({csrfToken: true}, function (response) {
        csrfToken = response;
    });
}

function initializeUserId() {
    chrome.runtime.sendMessage({userId: true}, function (response) {
        userId = response;
    });
}

function appendEmptyQueueMessage() {
    let emptyQueueMessageClone = $(emptyQueueMessage).clone().css("display", "inline");
    $(scrollableArea).append($(emptyQueueMessageClone));
}

function initializeSettings() {
    chrome.runtime.sendMessage({getFromLocalStorage: true, key: "settings"}, function (response) {
        let loadedSettings = response["settings"];

        if (loadedSettings) {
            settings = loadedSettings;
        } else {
            settings = Object.assign({}, DEFAULT_SETTINGS);
        }
    });

    noUiSlider.create($(settingsToggle)[0], getSliderConfiguration(0, 0, 1, null));
    noUiSlider.create($(usersRangeToggle)[0], getSliderConfiguration(0, 0, 1, null));
    noUiSlider.create($(followUnfollowTimeout)[0], getSliderConfiguration(1, 1, 240, " Sec"));
    noUiSlider.create($(loadingUsersTimeout)[0], getSliderConfiguration(1, 1, 30, " Sec"));
    noUiSlider.create($(likingPhotosTimeout)[0], getSliderConfiguration(1, 1, 30, " Sec"));
    noUiSlider.create($(rateLimitTimeout)[0], getSliderConfiguration(1, 1, 60, " Min"));
    noUiSlider.create($(timeoutRandomization)[0], getSliderConfiguration(0, 0, 100, "%"));
    noUiSlider.create($(skipPrivateAccounts)[0], getSliderConfiguration(0, 0, 1, null));
    noUiSlider.create($(likePhotosCount)[0], getSliderConfiguration(0, 0, 5, " Photos"));
    noUiSlider.create($(skipAlreadyProcessedUsers)[0], getSliderConfiguration(0, 0, 365, " Days"));
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
    $(loadPostLikesBtn).on("click", onLoadPostLikesBtnClicked);
    $(storyListContent).on("wheel", onStoryListContentScroll);
    $(storyListCancelBtn).on("click", hideStoryList);
    $(postListCancelBtn).on("click", hidePostList);
    $(usersRangeToggle)[0].noUiSlider.on('update', onUsersRangeToggle);
    $(usersRangeStartInput).on("change", onUsersRangeStartInputChange);
    $(usersRangeEndInput).on("change", onUsersRangeEndInputChange);
    $(usersRangeCancelBtn).on("click", hideUsersRange);
    $(followingOptionsConfirmBtn).on("click", onFollowingOptionsConfirmBtnClicked);
    $(followingOptionsCancelBtn).on("click", hideFollowingOptions);
    $(loadUnfollowedConfirmBtn).on("click", onloadUnfollowedConfirmBtnClicked);
    $(loadUnfollowedCancelBtn).on("click", hideLoadUnfollowed);
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
    $(rateLimitOverlay).on("mousedown", onRateLimitOverlayClicked);
    $(rateLimitCancelBtn).on("click", hideRateLimitOverlay);
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

        chrome.runtime.sendMessage({getUrl: true, url: "images/blank.png"}, function (response) {
            $(currentUserProfilePicture).attr("src", response);
            $(usernameField).text("Loading...");
        });

        makeRequest({
            url: currentUrl + "/?__a=1",
            xhrFields: {
                withCredentials: true
            }
        }, function (data) {
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
            enableLoadUsersDropdown();
        });
    });
}

function notOnProfilePage() {
    chrome.runtime.sendMessage({getUrl: true, url: "images/blank.png"}, function (response) {
        $(currentUserProfilePicture).attr("src", response);
        $(usernameField).text("Not On Profile Page");
    });

    currentUser = undefined;
    disableLoadUsersDropdown();
}

function initializeLastCheckedField() {
    chrome.runtime.sendMessage({getFromLocalStorage: true, key: currentUser.id}, function (response) {
        lastChecked = response[currentUser.id];
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

    $(e.target).css("display", "none");
}

function onSettingsBtnClicked() {
    populateSettings();
    $(settingsOverlay).css("display", "flex");
}

function onSettingsToggle(values, handle) {
    if (values[handle] === '1') {
        $(settingsHeading).text("Advanced Settings");
        $(basicSettings).css("display", "none");
        $(advancedSettings).css("display", "block");
    } else {
        $(settingsHeading).text("Settings");
        $(advancedSettings).css("display", "none");
        $(basicSettings).css("display", "block");
    }
}

function onSaveSettingsBtnClicked() {
    settings.loadFollowersQueryHash = $(loadFollowersQueryHashInput).val();
    settings.loadFollowingQueryHash = $(loadFollowingQueryHashInput).val();
    settings.loadPostListQueryHash = $(loadPostListQueryHashInput).val();
    settings.loadPostLikesQueryHash = $(loadPostLikesQueryHashInput).val();
    settings.applicationId = $(applicationIdInput).val();
    settings.followUnfollowTimeout = parseInt($(followUnfollowTimeout)[0].noUiSlider.get());
    settings.loadingUsersTimeout = parseInt($(loadingUsersTimeout)[0].noUiSlider.get());
    settings.likingPhotosTimeout = parseInt($(likingPhotosTimeout)[0].noUiSlider.get());
    settings.rateLimitTimeout = parseInt($(rateLimitTimeout)[0].noUiSlider.get());
    settings.timeoutRandomization = parseInt($(timeoutRandomization)[0].noUiSlider.get());

    chrome.runtime.sendMessage({setToLocalStorage: true, key: "settings", value: settings}, function () {
        hideSettingsPage();
    });
}

function onResetSettingsBtnClicked() {
    settings = Object.assign({}, DEFAULT_SETTINGS);

    chrome.runtime.sendMessage({
        setToLocalStorage: true,
        key: "settings",
        value: settings
    }, function () {
        populateSettings();
    });
}

function populateSettings() {
    $(loadFollowersQueryHashInput).val(settings.loadFollowersQueryHash);
    $(loadFollowingQueryHashInput).val(settings.loadFollowingQueryHash);
    $(loadPostListQueryHashInput).val(settings.loadPostListQueryHash);
    $(loadPostLikesQueryHashInput).val(settings.loadPostLikesQueryHash);
    $(applicationIdInput).val(settings.applicationId);
    $(followUnfollowTimeout)[0].noUiSlider.set(settings.followUnfollowTimeout);
    $(loadingUsersTimeout)[0].noUiSlider.set(settings.loadingUsersTimeout);
    $(likingPhotosTimeout)[0].noUiSlider.set(settings.likingPhotosTimeout);
    $(rateLimitTimeout)[0].noUiSlider.set(settings.rateLimitTimeout);
    $(timeoutRandomization)[0].noUiSlider.set(settings.timeoutRandomization);
}

function hideSettingsPage() {
    $(settingsOverlay).css("display", "none");
}

function onSelectAllBtnClicked() {
    $(".scrollable-area .selection", shadowRoot).addClass(SELECTED_CLASS);
    updateQueueSelectedUsersCounter();
}

function onSelectNoneBtnClicked() {
    $(".scrollable-area .selection", shadowRoot).removeClass(SELECTED_CLASS);
    updateQueueSelectedUsersCounter();
}

function onRevertSelectionBtnClicked() {
    $(".scrollable-area .selection", shadowRoot).toggleClass(SELECTED_CLASS);
    updateQueueSelectedUsersCounter();
}

function onRemoveSelectedBtnClicked() {
    let selectedUsers = $(".selected", shadowRoot).parent().parent();

    for (let selectedUser of selectedUsers) {
        $(selectedUser).remove();
        usersQueue.delete($(selectedUser).attr("id"));
        visibleUsersCount--;
    }

    updateQueueTotalUsersCounter(visibleUsersCount);
    updateQueueSelectedUsersCounter();
}

function onLoadFollowersBtnClicked() {
    loadUsersRange(USERS_TYPE.FOLLOWERS, currentUser.followersCount);
}

function onLoadFollowingBtnClicked() {
    loadUsersRange(USERS_TYPE.FOLLOWING, currentUser.followingCount);
}

function loadUsersRange(usersType, count, data) {
    if (count === 0) {
        let message;

        switch (usersType) {
            case USERS_TYPE.FOLLOWERS:
                message = "Currently this account doesn't have any followers."
                break;
            case USERS_TYPE.FOLLOWING:
                message = "Currently this account doesn't have any following."
                break;
            case USERS_TYPE.POST_LIKES:
                message = "Currently this post doesn't have any likes."
                break;
        }

        showPopup("Warning", message)
        return;
    }

    $(usersRangeHeading).text(usersType.HEADING);
    let start = count - 2048;

    if (start < 0) {
        start = 0;
    }

    if ($(usersRangeSlider)[0].noUiSlider) {
        $(usersRangeSlider)[0].noUiSlider.destroy();
    }

    let sliderConfiguration = getSliderConfiguration([start, count], 0, count, " ");
    sliderConfiguration.behaviour = "drag";

    noUiSlider.create($(usersRangeSlider)[0], sliderConfiguration);
    mergeTooltips($(usersRangeSlider)[0], 20, " - ");

    $(usersRangeSlider)[0].noUiSlider.on('update', onUsersRangeSliderUpdate);

    $(usersRangeConfirmBtn).off("click");
    $(usersRangeConfirmBtn).on("click", () => onUsersRangeConfirmBtnClicked(data));

    $(usersRangeOverlay).css("display", "flex");
}

function onLoadNotFollowingBackBtnClicked() {
    loadFollowers(loadFollowing, 0, "", null);
}

function onLoadUnfollowedBtnClicked() {
    if (lastChecked) {
        $(loadUnfollowedMessage).text("Clicking confirm will load all users who have unfollowed since " + lastChecked.timestamp + ".");
    } else {
        $(loadUnfollowedMessage).text("There is no data for this account's followers. Click confirm to load them for the first time.");
    }

    $(loadUnfollowedOverlay).css("display", "flex");
}

function onLoadStoryViewersBtnClicked() {
    if (userId !== currentUser.id) {
        showPopup("Warning", "You can only load the viewers of your own stories.")
        return;
    }

    loadStoryList();
}

function loadStoryList() {
    makeRequest({
        url: "https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=" + currentUser.id,
        beforeSend: function (request) {
            request.setRequestHeader("x-ig-app-id", settings.applicationId);
        },
        xhrFields: {
            withCredentials: true
        }
    }, function (data) {
        let stories = data.reels_media[0] ? data.reels_media[0].items : [];
        drawStoryList(stories);
    });
}

function drawStoryList(stories) {
    if (stories.length === 0) {
        showPopup("Warning", "Currently this account doesn't have any stories.")
        return;
    } else {
        $(storyListOverlay).css("display", "flex");
    }

    $(storyListContent).empty();

    for (let story of stories) {
        let storyElement = $("<img>");
        $(storyElement).attr("id", story.pk);
        $(storyElement).attr("src", story.image_versions2.candidates[0].url);
        $(storyElement).addClass(STORY_ELEMENT_CLASS);

        $(storyElement).on("click", onStoryElementClicked);
        $(storyListContent).append($(storyElement));
    }
}

function onStoryElementClicked(event) {
    let target = $(event.target);
    let storyId = target.attr("id");

    hideStoryList();

    usersQueue.clear();
    loadStoryViewers(storyId, 0);
}

function loadStoryViewers(storyId, maxId) {
    makeRequest({
        url: "https://i.instagram.com/api/v1/media/" + storyId + "/list_reel_media_viewer/?max_id=" + maxId,
        beforeSend: function (request) {
            request.setRequestHeader("x-ig-app-id", settings.applicationId);
        },
        xhrFields: {
            withCredentials: true
        }
    }, function (data) {
        let storyViewers = data.users;
        let nextMaxId = data.next_max_id;

        for (let storyViewer of storyViewers) {
            let user = {
                id: storyViewer.pk,
                username: storyViewer.username,
                full_name: storyViewer.full_name,
                profile_pic_url: storyViewer.profile_pic_url,
                is_private: storyViewer.is_private,
                visible: true
            };

            usersQueue.set(user.id, user);
        }

        $(loadingBarElement).css("display", "flex");
        updateLoadingBarElement(data.total_viewer_count, nextMaxId, "Loading Story Viewers");

        if (!nextMaxId) {
            $(loadingBarElement).css("display", "none");
            drawUsers();
        } else {
            let secondsRemaining = randomizeTimeout(settings.loadingUsersTimeout, settings.timeoutRandomization);

            loadUsersTimeout(secondsRemaining, function () {
                loadStoryViewers(storyId, nextMaxId);
            });
        }
    });
}

function onStoryListContentScroll(event) {
    let elementToScroll = event.currentTarget;

    clearTimeout(elementToScroll.timer);
    elementToScroll.timer = setTimeout(() => {
        elementToScroll.scrollTo({
            left: event.originalEvent.deltaY > 0 ? elementToScroll.scrollLeft + 100 : elementToScroll.scrollLeft - 100
        });
    }, 10);

    event.preventDefault();
}

function onLoadPostLikesBtnClicked() {
    $(postListContent).empty();
    $(postListLoadMoreBtn).removeClass(DISABLED_CLASS);

    loadPostList("");
}

function loadPostList(endCursor) {
    let jsonVars = {
        id: currentUser.id,
        first: 12,
        after: endCursor
    };

    let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));

    makeRequest({
        url: "https://www.instagram.com/graphql/query/?query_hash=" + settings.loadPostListQueryHash + "&variables=" + encodedJsonVars,
        xhrFields: {
            withCredentials: true
        }
    }, function (data) {
        let posts = data.data.user.edge_owner_to_timeline_media.edges;
        let endCursor = data.data.user.edge_owner_to_timeline_media.page_info.end_cursor;
        let hasNextPage = data.data.user.edge_owner_to_timeline_media.page_info.has_next_page;

        drawPostList(posts, endCursor);

        if (!hasNextPage) {
            $(postListLoadMoreBtn).addClass(DISABLED_CLASS);
        }
    });
}

function drawPostList(posts, endCursor) {
    if (posts.length === 0) {
        showPopup("Warning", "Currently this account doesn't have any posts.")
        return;
    } else {
        $(postListOverlay).css("display", "flex");
    }

    for (let post of posts) {
        let postElement = $("<img>");
        $(postElement).attr("data-shortcode", post.node.shortcode);
        $(postElement).attr("data-likes", post.node.edge_media_preview_like.count);
        $(postElement).attr("src", post.node.display_url);
        $(postElement).addClass(POST_ELEMENT_CLASS);

        $(postElement).on("click", onPostElementClicked);
        $(postListContent).append($(postElement));
    }

    $(postListLoadMoreBtn).off("click");
    $(postListLoadMoreBtn).on("click", () => loadPostList(endCursor));
}

function onPostElementClicked(event) {
    let target = $(event.target);

    let shortcode = target.attr("data-shortcode");
    let likes = Number(target.attr("data-likes"));

    loadUsersRange(USERS_TYPE.POST_LIKES, likes, {shortcode});
}

function loadPostLikes(callback, shortcode, loaded, endCursor, limit) {
    let jsonVars = {
        shortcode: shortcode,
        include_reel: true,
        first: 12,
        after: endCursor
    };

    let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));

    makeRequest({
        url: "https://www.instagram.com/graphql/query/?query_hash=" + settings.loadPostLikesQueryHash + "&variables=" + encodedJsonVars,
        xhrFields: {
            withCredentials: true
        }
    }, function (data) {
        let likes = data.data.shortcode_media.edge_liked_by.edges;
        let totalLikesCount = data.data.shortcode_media.edge_liked_by.count;
        let limitReached = false;

        for (let like of likes) {
            if (limit && loaded >= limit) {
                limitReached = true;
                break;
            }

            let user = {
                id: like.node.id,
                username: like.node.username,
                full_name: like.node.full_name,
                profile_pic_url: like.node.profile_pic_url,
                is_private: like.node.is_private
            };

            postLikesMap.set(like.node.id, user);
            loaded++;
        }

        $(loadingBarElement).css("display", "flex");
        updateLoadingBarElement(limit ? limit : totalLikesCount, loaded, "Loading Post Likes");

        let pageInfo = data.data.shortcode_media.edge_liked_by.page_info;

        if (!pageInfo.has_next_page || limitReached) {
            $(loadingBarElement).css("display", "none");
            callback();
        } else {
            let secondsRemaining = randomizeTimeout(settings.loadingUsersTimeout, settings.timeoutRandomization);

            loadUsersTimeout(secondsRemaining, function () {
                loadPostLikes(callback, shortcode, loaded, pageInfo.end_cursor, limit);
            });
        }
    });
}

function hidePostList() {
    $(postListOverlay).css("display", "none");
}

function hideStoryList() {
    $(storyListOverlay).css("display", "none");
}

function hideUsersRange() {
    $(usersRangeOverlay).css("display", "none");
}

function hideFollowingOptions() {
    $(followingOptionsOverlay).css("display", "none");
}

function onloadUnfollowedConfirmBtnClicked() {
    hideLoadUnfollowed();
    loadFollowers(loadUnfollowed, 0, "", null);
}

function hideLoadUnfollowed() {
    $(loadUnfollowedOverlay).css("display", "none");
}

function hidePopup() {
    $(popupOverlay).css("display", "none");
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

    chrome.runtime.sendMessage({
        setToLocalStorage: true,
        key: [currentUser.id],
        value: lastCheckedUpdated
    }, function () {
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

function loadFollowers(callback, loaded, endCursor, limit) {
    let jsonVars = {
        id: currentUser.id,
        first: 48,
        after: endCursor
    };

    let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));

    makeRequest({
        url: "https://www.instagram.com/graphql/query/?query_hash=" + settings.loadFollowersQueryHash + "&variables=" + encodedJsonVars,
        xhrFields: {
            withCredentials: true
        }
    }, function (data) {
        let followers = data.data.user.edge_followed_by.edges;
        let totalFollowersCount = data.data.user.edge_followed_by.count;
        let limitReached = false;

        for (let follower of followers) {
            if (limit && loaded >= limit) {
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
            loaded++;
        }

        $(loadingBarElement).css("display", "flex");
        updateLoadingBarElement(limit ? limit : totalFollowersCount, loaded, "Loading Followers");

        let pageInfo = data.data.user.edge_followed_by.page_info;

        if (!pageInfo.has_next_page || limitReached) {
            if (!limitReached && !lastChecked) {
                updateLastChecked();
            }

            $(loadingBarElement).css("display", "none");
            callback(loadNotFollowingBack, 0, "", limit);
        } else {
            let secondsRemaining = randomizeTimeout(settings.loadingUsersTimeout, settings.timeoutRandomization);

            loadUsersTimeout(secondsRemaining, function () {
                loadFollowers(callback, loaded, pageInfo.end_cursor, limit);
            });
        }
    });
}

function loadFollowing(callback, loaded, endCursor, limit) {
    let jsonVars = {
        id: currentUser.id,
        first: 48,
        after: endCursor
    };

    let encodedJsonVars = encodeURIComponent(JSON.stringify(jsonVars));

    makeRequest({
        url: "https://www.instagram.com/graphql/query/?query_hash=" + settings.loadFollowingQueryHash + "&variables=" + encodedJsonVars,
        xhrFields: {
            withCredentials: true
        }
    }, function (data) {
        let usersFollowing = data.data.user.edge_follow.edges;
        let totalFollowingCount = data.data.user.edge_follow.count;
        let limitReached = false;

        for (let userFollowing of usersFollowing) {
            if (limit && loaded >= limit) {
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
            loaded++;
        }

        $(loadingBarElement).css("display", "flex");
        updateLoadingBarElement(limit ? limit : totalFollowingCount, loaded, "Loading Following");

        let pageInfo = data.data.user.edge_follow.page_info;

        if (!pageInfo.has_next_page || limitReached) {
            $(loadingBarElement).css("display", "none");
            callback();
        } else {
            let secondsRemaining = randomizeTimeout(settings.loadingUsersTimeout, settings.timeoutRandomization);

            loadUsersTimeout(secondsRemaining, function () {
                loadFollowing(callback, loaded, pageInfo.end_cursor, limit);
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
    postLikesMap.clear();

    $(scrollableArea).empty();
    visibleUsersCount = 0;

    for (let user of usersQueue.values()) {
        if (!user.visible) {
            continue;
        }

        let userElementClone = $(userElement).clone().css("display", "block");
        let profilePicture = $(userElementClone).find("img.profilePicture");

        $(userElementClone).attr("id", user.id);
        $(profilePicture).attr("src", user.profile_pic_url);

        if (user.full_name) {
            $(userElementClone).find("span.name").text(user.full_name);
        }

        $(userElementClone).find("a.username")
            .attr("href", "https://www.instagram.com/" + user.username + "/")
            .text(user.username);

        $(scrollableArea).append($(userElementClone));
        visibleUsersCount++;
    }

    updateQueueTotalUsersCounter(visibleUsersCount);
    updateQueueSelectedUsersCounter();

    $(".selection", shadowRoot).on("click", onProfilePictureClicked);
}

function updateQueueTotalUsersCounter(count) {
    if (count === 0) {
        appendEmptyQueueMessage();
    }

    $(queueTotalUsersCount).text(count + " Users");
}

function updateQueueSelectedUsersCounter() {
    $(queueSelectedUsersCount).text($(".selected", shadowRoot).length + " Selected");
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
    $(skipAlreadyProcessedUsers)[0].noUiSlider.set(settings.skipAlreadyProcessedUsers);
    $(skipPrivateAccounts)[0].noUiSlider.set(settings.skipPrivateAccounts);

    $(followingOptionsOverlay).css("display", "flex");
}

function onUsersRangeConfirmBtnClicked(data) {
    let values = $(usersRangeSlider)[0].noUiSlider.get();

    let start = parseInt(values[0].replace(/\s+/g, ""));
    let limit = parseInt(values[1].replace(/\s+/g, "")) - start;

    hideUsersRange();

    switch ($(usersRangeHeading).text()) {
        case USERS_TYPE.FOLLOWERS.HEADING:
            loadFollowers(() => clearQueueAndDrawUsers(followersMap), 0, "", limit);
            break;
        case USERS_TYPE.FOLLOWING.HEADING:
            loadFollowing(() => clearQueueAndDrawUsers(followingMap), 0, "", limit);
            break;
        case USERS_TYPE.POST_LIKES.HEADING:
            loadPostLikes(() => {
                clearQueueAndDrawUsers(postLikesMap);
                hidePostList();
            }, data.shortcode, 0, "", limit);
            break;
    }
}

function clearQueueAndDrawUsers(usersMap) {
    usersQueue.clear();

    for (let user of usersMap.values()) {
        user.visible = true;
        usersQueue.set(user.id, user);
    }

    drawUsers();
}

function onFollowingOptionsConfirmBtnClicked() {
    settings.skipPrivateAccounts = parseInt($(skipPrivateAccounts)[0].noUiSlider.get());
    settings.likePhotosCount = parseInt($(likePhotosCount)[0].noUiSlider.get());
    settings.skipAlreadyProcessedUsers = parseInt($(skipAlreadyProcessedUsers)[0].noUiSlider.get());

    chrome.runtime.sendMessage({setToLocalStorage: true, key: "settings", value: settings});

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

    chrome.runtime.sendMessage({
        getFromLocalStorage: true,
        key: "followedUnfollowedUsersMap"
    }, function (response) {
        if (response["followedUnfollowedUsersMap"]) {
            followedUnfollowedUsersMap = new Map(JSON.parse(response["followedUnfollowedUsersMap"]));
        }

        if (followedUnfollowedUsersMap.has(user.id)) {
            let millisecondsPassedSinceFollowUnfollow = Date.now() - followedUnfollowedUsersMap.get(user.id);
            let daysPassedSinceFollowUnfollow = (((((millisecondsPassedSinceFollowUnfollow) / 1000) / 60) / 60) / 24);

            if (daysPassedSinceFollowUnfollow < settings.skipAlreadyProcessedUsers) {
                shouldSkipFollowedUnfollowedUser = true;
            }
        }

        if (processType === PROCESS_TYPE.FOLLOWING && (shouldSkipPrivateUser || shouldSkipFollowedUnfollowedUser)) {
            onUserProcessed(user, users, processType, true);
            return;
        }

        makeRequest({
            url: "https://www.instagram.com/web/friendships/" + user.id + processType.ENDPOINT,
            method: "POST",
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-csrftoken', csrfToken);
            },
            xhrFields: {
                withCredentials: true
            }
        }, function () {
            if (processType === PROCESS_TYPE.FOLLOWING && settings.likePhotosCount > 0) {
                let countdownElement = $("div#" + user.id, shadowRoot).find(".countdown").css("display", "block");
                getLatestPhotosIds(user, users, countdownElement, settings.likePhotosCount);
            } else {
                onUserProcessed(user, users, processType, false);
            }
        });
    });
}

function onUserProcessed(user, users, processType, skipped) {
    let userElement = $("div#" + user.id, shadowRoot);
    let profilePictureContainer = $(userElement).find(".profilePictureContainer");
    $(profilePictureContainer).find(".countdown").css("display", "none");

    if (skipped) {
        $(profilePictureContainer).find(".selection").addClass(SKIPPED_CLASS);
    } else {
        $(profilePictureContainer).find(".selection").addClass(processType.PROCESSED_CLASS);
        followedUnfollowedUsersMap.set(user.id, Date.now());

        let mapAsJson = JSON.stringify(Array.from(followedUnfollowedUsersMap.entries()));

        chrome.runtime.sendMessage({
            setToLocalStorage: true,
            key: "followedUnfollowedUsersMap",
            value: mapAsJson
        });
    }

    usersQueue.delete(user.id);

    if (users.length === 0) {
        enableElements(processType);
        return;
    }

    let nextUser = users[0];
    let nextElementCountdownElement = $("div#" + nextUser.id, shadowRoot).find(".countdown").css("display", "block");

    let secondsRemaining;

    if (skipped) {
        secondsRemaining = 0;
    } else {
        secondsRemaining = randomizeTimeout(settings.followUnfollowTimeout, settings.timeoutRandomization);
    }

    processUsersTimeout(secondsRemaining, secondsRemaining, nextElementCountdownElement, users, processType);
}

function getLatestPhotosIds(user, users, countdownElement, count) {
    let photosIds = [];

    makeRequest({
        url: "https://www.instagram.com/" + user.username + "/?__a=1",
        xhrFields: {
            withCredentials: true
        }
    }, function (data) {
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

    makeRequest({
        url: "https://www.instagram.com/web/likes/" + photoId + "/like/",
        method: "POST",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('x-csrftoken', csrfToken);
        },
        xhrFields: {
            withCredentials: true
        }
    }, function () {
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
    $(".countdown", shadowRoot).css("display", "none");

    enableElements(PROCESS_TYPE.FOLLOWING);
}

function onStopUnfollowingBtnClicked() {
    clearTimeout(timeoutObject);
    $(".countdown", shadowRoot).css("display", "none");

    enableElements(PROCESS_TYPE.UNFOLLOWING);
}

function onStopLoadingBtnClicked() {
    clearTimeout(timeoutObject);
    $(loadingBarElement).css("display", "none");
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

    $(startUnfollowingBtn).css("display", "none");
    $(startFollowingBtn).css("display", "inline-flex");
}

function onBottomDotClicked() {
    $(topDot).removeClass(GREEN_DOT_CLASS);
    $(bottomDot).addClass(RED_DOT_CLASS);

    $(startFollowingBtn).css("display", "none");
    $(startUnfollowingBtn).css("display", "inline-flex");
}

function disableElements(processType) {
    $(startFollowingBtn).css("display", "none");
    $(startUnfollowingBtn).css("display", "none");

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
    $(".selection", shadowRoot).addClass(DISABLED_CLASS);
}

function enableElements(processType) {
    $(stopFollowingBtn).css("display", "none");
    $(stopUnfollowingBtn).css("display", "none");

    if (processType === PROCESS_TYPE.FOLLOWING) {
        $(startFollowingBtn).css("display", "inline-flex");
        $(topDot).removeClass(RED_DOT_CLASS);
    } else {
        $(startUnfollowingBtn).css("display", "inline-flex");
    }

    if (currentUser) {
        $(loadUsersDropdown).removeClass(DISABLED_CLASS);
    }

    $(searchBarInput).removeClass(DISABLED_CLASS);
    $(queueActionsDropdown).removeClass(DISABLED_CLASS);
    $(selectionDropdown).removeClass(DISABLED_CLASS);
    $(dots).removeClass(DISABLED_CLASS);
    $(".selection", shadowRoot).removeClass(DISABLED_CLASS);
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

function makeRequest(requestSettings, callback) {
    $.ajax(requestSettings).done(callback).fail(function () {
        $(rateLimitRetryBtn).off("click");

        $(rateLimitRetryBtn).on("click", () => {
            hideRateLimitOverlay();
            makeRequest(requestSettings, callback);
        });

        $(rateLimitOverlay).css("display", "flex");
        let secondsRemaining = settings.rateLimitTimeout * 60;

        makeRequestTimeout(secondsRemaining, secondsRemaining, function () {
            hideRateLimitOverlay();
            makeRequest(requestSettings, callback);
        });
    });
}

function makeRequestTimeout(totalSeconds, secondsRemaining, callback) {
    if (secondsRemaining > 0) {
        updateRateLimitCountdownElement(secondsRemaining);

        rateLimitTimeoutObject = setTimeout(function () {
            makeRequestTimeout(totalSeconds, secondsRemaining - 1, callback);
        }, 1000);
    } else {
        callback();
    }
}

function updateRateLimitCountdownElement(secondsRemaining) {
    $(rateLimitMessage).text("Possible rate limit detected. Waiting " + secondsRemaining + " seconds before auto retry.");
}

function onRateLimitOverlayClicked(e) {
    if (!$(e.target).is($(rateLimitOverlay))) {
        return;
    }

    hideRateLimitOverlay();
}

function hideRateLimitOverlay() {
    $(rateLimitOverlay).css("display", "none");
    clearTimeout(rateLimitTimeoutObject);
}

function showPopup(heading, message) {
    $(popupHeading).text(heading);
    $(popupMessage).text(message);
    $(popupOverlay).css("display", "flex");
}

function onUsersRangeToggle(values, handle) {
    if (values[handle] === '1') {
        $(usersRangeSlider).css("display", "none");
        $(usersRangeInputs).css("display", "flex");
    } else {
        $(usersRangeInputs).css("display", "none");
        $(usersRangeSlider).css("display", "flex");
    }
}

function onUsersRangeSliderUpdate(values) {
    let start = parseInt(values[0].replace(/\s+/g, ""));
    let end = parseInt(values[1].replace(/\s+/g, ""));

    $(usersRangeStartInput).val(start);
    $(usersRangeEndInput).val(end);
}

function onUsersRangeStartInputChange() {
    let start = $(usersRangeStartInput).val();
    $(usersRangeSlider)[0].noUiSlider.set([start, null]);
}

function onUsersRangeEndInputChange() {
    let end = $(usersRangeEndInput).val();
    $(usersRangeSlider)[0].noUiSlider.set([null, end]);
}