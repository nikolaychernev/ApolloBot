let DEFAULT_SETTINGS = {
    "loadFollowersQueryHash": "c76146de99bb02f6415203be841dd25a",
    "loadFollowingQueryHash": "d04b0a864b4b54837c0d870b0e77e076",
    "loadStoryListQueryHash": "90709b530ea0969f002c86a89b4f2b8d",
    "loadStoryViewersQueryHash": "42c6ec100f5e57a1fe09be16cd3a7021",
    "followUnfollowTimeout": 60,
    "loadingUsersBatchSize": 48,
    "loadingUsersTimeout": 3,
    "likingPhotosTimeout": 5,
    "timeoutRandomization": 50,
    "likePhotosCount": 1,
    "skipFollowedUnfollowedUsers": 30,
    "skipPrivateAccounts": 1
};

let EXTRACT_USERNAME_REGEX = /.*instagram\.com\/([^\/]+)/;

let SELECTED_CLASS = "selected";
let FOLLOWED_CLASS = "followed";
let UNFOLLOWED_CLASS = "unfollowed";
let SKIPPED_CLASS = "skipped";
let DISABLED_CLASS = "disabled";
let STORY_ELEMENT_CLASS = "storyElement";
let GREEN_DOT_CLASS = "greenDot";
let RED_DOT_CLASS = "redDot";

const PROCESS_TYPE = {
    FOLLOWING: {
        ENDPOINT: "/follow/",
        PROCESSED_CLASS: FOLLOWED_CLASS
    },
    UNFOLLOWING: {
        ENDPOINT: "/unfollow/",
        PROCESSED_CLASS: UNFOLLOWED_CLASS
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