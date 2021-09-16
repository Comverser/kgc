/* -------------------------------------------------------------------------- */
/*                                API endpoints                               */
/* -------------------------------------------------------------------------- */
const pathTalk = "talk";
const pathOffer = "offer";
const pathSettings = "get-settings";

const protocol = "https";

const ketiPort = "20080";
const ketiHost = "localhost";

const gnictPort = "20443";
const gnictHost = "localhost";

/* -------------------------------------------------------------------------- */
/*                                Debug setting                               */
/* -------------------------------------------------------------------------- */
export const debugMode = true;

/* -------------------------------------------------------------------------- */
/*                                Don't change                                */
/* -------------------------------------------------------------------------- */
export const settingsEndpoint = `${protocol}://${gnictHost}:${gnictPort}/${pathSettings}`;

export const offerEndpoint = `${protocol}://${ketiHost}:${ketiPort}/${pathOffer}`;
export const talkEndpoint = `${protocol}://${ketiHost}:${ketiPort}/${pathTalk}`;
