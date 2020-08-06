// Main
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
let loadingUsersTimeout = $("#loadingUsersTimeout");
let likingPhotosTimeout = $("#likingPhotosTimeout");
let timeoutRandomization = $("#timeoutRandomization");

//Users Range
let usersRange = $("#usersRange");
let usersRangeHeading = $("#usersRangeHeading");
let usersRangeSlider = $("#usersRangeSlider");
let usersRangeConfirmBtn = $("#usersRangeConfirmBtn");
let usersRangeCancelBtn = $("#usersRangeCancelBtn");

//Following Options
let followingOptions = $("#followingOptions");
let skipPrivateAccounts = $("#skipPrivateAccounts");
let likePhotosCount = $("#likePhotosCount");
let followingOptionsConfirmBtn = $("#followingOptionsConfirmBtn");
let followingOptionsCancelBtn = $("#followingOptionsCancelBtn");

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