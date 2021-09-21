/* -------------------------------------------------------------------------- */
/*                                API endpoints                               */
/* -------------------------------------------------------------------------- */
const ketiPort = "20080";
const ketiHost = "localhost";

const gnictPort = "20443";
const gnictHost = "localhost";

/* -------------------------------------------------------------------------- */
/*                                Debug setting                               */
/* -------------------------------------------------------------------------- */
export const debugMode = false;

/* -------------------------------------------------------------------------- */
/*                                Don't change                                */
/* -------------------------------------------------------------------------- */
const protocol = "https";
const pathTalk = "talk";
const pathOffer = "offer";
const pathSettings = "settings";

export const settingsEndpoint = `${protocol}://${gnictHost}:${gnictPort}/${pathSettings}`;

export const offerEndpoint = `${protocol}://${ketiHost}:${ketiPort}/${pathOffer}`;
export const talkEndpoint = `${protocol}://${ketiHost}:${ketiPort}/${pathTalk}`;
