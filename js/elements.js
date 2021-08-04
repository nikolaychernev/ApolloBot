// Main
let shadowRoot = document.querySelector(".injectedWrapper").shadowRoot;
let settingsBtn = $("#settingsBtn", shadowRoot);
let cancelSettingsBtn = $("#cancelSettingsBtn", shadowRoot);
let saveSettingsBtn = $("#saveSettingsBtn", shadowRoot);
let resetSettingsBtn = $("#resetSettingsBtn", shadowRoot);
let selectAllBtn = $("#selectAllBtn", shadowRoot);
let selectNoneBtn = $("#selectNoneBtn", shadowRoot);
let revertSelectionBtn = $("#revertSelectionBtn", shadowRoot);
let removeSelectedBtn = $("#removeSelectedBtn", shadowRoot);
let loadUsersDropdown = $("#loadUsersDropdown", shadowRoot);
let queueActionsDropdown = $("#queueActionsDropdown", shadowRoot);
let selectionDropdown = $("#selectionDropdown", shadowRoot);
let loadFollowersBtn = $("#loadFollowersBtn", shadowRoot);
let loadFollowingBtn = $("#loadFollowingBtn", shadowRoot);
let loadNotFollowingBackBtn = $("#loadNotFollowingBackBtn", shadowRoot);
let loadUnfollowedBtn = $("#loadUnfollowedBtn", shadowRoot);
let loadStoryViewersBtn = $("#loadStoryViewersBtn", shadowRoot);
let loadPostLikesBtn = $("#loadPostLikesBtn", shadowRoot);
let loadQueueBtn = $("#loadQueueBtn", shadowRoot);
let saveQueueBtn = $("#saveQueueBtn", shadowRoot);
let startFollowingBtn = $("#startFollowingBtn", shadowRoot);
let startUnfollowingBtn = $("#startUnfollowingBtn", shadowRoot);
let stopFollowingBtn = $("#stopFollowingBtn", shadowRoot);
let stopUnfollowingBtn = $("#stopUnfollowingBtn", shadowRoot);
let stopLoadingBtn = $("#stopLoadingBtn", shadowRoot);
let overlay = $(".overlay", shadowRoot);

// Settings Page
let settingsOverlay = $("#settingsPageOverlay", shadowRoot);
let settingsHeading = $("#settingsHeading", shadowRoot);
let settingsToggle = $("#settingsToggle", shadowRoot);
let basicSettings = $("#basicSettings", shadowRoot);
let advancedSettings = $("#advancedSettings", shadowRoot);
let loadFollowersQueryHashInput = $("#loadFollowersQueryHash", shadowRoot);
let loadFollowingQueryHashInput = $("#loadFollowingQueryHash", shadowRoot);
let loadPostListQueryHashInput = $("#loadPostListQueryHash", shadowRoot);
let loadPostLikesQueryHashInput = $("#loadPostLikesQueryHash", shadowRoot);
let applicationIdInput = $("#applicationId", shadowRoot);
let followUnfollowTimeout = $("#followUnfollowTimeout", shadowRoot);
let loadingUsersTimeout = $("#loadingUsersTimeout", shadowRoot);
let likingPhotosTimeout = $("#likingPhotosTimeout", shadowRoot);
let timeoutRandomization = $("#timeoutRandomization", shadowRoot);

//Users Range
let usersRangeOverlay = $("#usersRangeOverlay", shadowRoot);
let usersRangeHeading = $("#usersRangeHeading", shadowRoot);
let usersRangeSlider = $("#usersRangeSlider", shadowRoot);
let usersRangeConfirmBtn = $("#usersRangeConfirmBtn", shadowRoot);
let usersRangeCancelBtn = $("#usersRangeCancelBtn", shadowRoot);

//Following Options
let followingOptionsOverlay = $("#followingOptionsOverlay", shadowRoot);
let skipPrivateAccounts = $("#skipPrivateAccounts", shadowRoot);
let likePhotosCount = $("#likePhotosCount", shadowRoot);
let skipFollowedUnfollowedUsers = $("#skipFollowedUnfollowedUsers", shadowRoot);
let followingOptionsConfirmBtn = $("#followingOptionsConfirmBtn", shadowRoot);
let followingOptionsCancelBtn = $("#followingOptionsCancelBtn", shadowRoot);

//Popup
let popupOverlay = $("#popupOverlay", shadowRoot);
let popupMessage = $("#popupMessage", shadowRoot);
let popupConfirmBtn = $("#popupConfirmBtn", shadowRoot);
let popupCancelBtn = $("#popupCancelBtn", shadowRoot);

//Story List
let storyListOverlay = $("#storyListOverlay", shadowRoot);
let storyListHeading = $("#storyListHeading", shadowRoot);
let storyListContent = $("#storyListContent", shadowRoot);
let storyListCancelBtn = $("#storyListCancelBtn", shadowRoot);

//Post List
let postListOverlay = $("#postListOverlay", shadowRoot);
let postListHeading = $("#postListHeading", shadowRoot);
let postListContent = $("#postListContent", shadowRoot);
let postListCancelBtn = $("#postListCancelBtn", shadowRoot);
let postListLoadMoreBtn = $("#postListLoadMoreBtn", shadowRoot);

// Other Elements
let currentUserProfilePicture = $("#currentUserProfilePicture", shadowRoot);
let usernameField = $("#username", shadowRoot);
let scrollableArea = $(".scrollable-area", shadowRoot);
let userElement = $("div.userElement", shadowRoot);
let loadQueueFileInput = $("#loadQueueFileSelector", shadowRoot);
let queueTotalUsersCount = $("#queueTotalUsersCount", shadowRoot);
let queueSelectedUsersCount = $("#queueSelectedUsersCount", shadowRoot);
let loadingBarElement = $("#loadingBar", shadowRoot);
let loadingMessageField = $("#loadingMessage", shadowRoot);
let searchBarInput = $("#searchBarInput", shadowRoot);
let emptyQueueMessage = $("#emptyQueueMessage", shadowRoot);
let dots = $("#dots", shadowRoot);
let topDot = $("#topDot", shadowRoot);
let bottomDot = $("#bottomDot", shadowRoot);