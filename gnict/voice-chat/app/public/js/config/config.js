/* -------------------------------------------------------------------------- */
/*                                API endpoints                               */
/* -------------------------------------------------------------------------- */
const gnictProcPort = "20080";
const gnictChatPort = "20443";
//const gnictHost = "10.0.0.107";
const gnictHost = "gnlabs.iptime.org";

const ketiPort = "28443";
const ketiHost = "ketiair.com";

/* -------------------------------------------------------------------------- */
/*                                User ID                                     */
/* -------------------------------------------------------------------------- */
// create user id using uuid
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
export const user_id = uuidv4();
console.log("user id: " + user_id);



/* -------------------------------------------------------------------------- */
/*                                Debug setting                               */
/* -------------------------------------------------------------------------- */
export const debugMode = true;

/* -------------------------------------------------------------------------- */
/*                                Don't change                                */
/* -------------------------------------------------------------------------- */
const protocol = "https";
const pathTalk = "talk";
const pathOffer = "offer";
const pathSettings = "settings";

export const settingsEndpoint = `${protocol}://${gnictHost}:${gnictChatPort}/${pathSettings}`;
export const offerLocalEndpoint = `${protocol}://${gnictHost}:${gnictProcPort}/${pathOffer}`;
export const talkEndpoint = `${protocol}://${gnictHost}:${gnictProcPort}/${pathTalk}`;

export const offerRemoteEndpoint = `${protocol}://${ketiHost}:${ketiPort}/${pathOffer}`;
