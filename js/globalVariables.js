let csrfToken;
let userId;
let currentUser;
let settings;
let timeoutObject;
let rateLimitTimeoutObject;
let lastChecked;
let followedUnfollowedUsersMap = new Map();
let visibleUsersCount = 0;
let followersMap = new Map();
let followingMap = new Map();
let postLikesMap = new Map();
let usersQueue = new Map();
let activeLicense = false;
let activeTrial = false;