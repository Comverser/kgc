/* -------------------------------------------------------------------------- */
/*                                API endpoints                               */
/* -------------------------------------------------------------------------- */
const pathTalk = "talk";
const pathOffer = "offer";
const pathSettings = "settings";

const port = "8080";
const protocol = "https";

const host = "127.0.0.1";

/* -------------------------------------------------------------------------- */
/*                                Debug setting                               */
/* -------------------------------------------------------------------------- */
export const debugMode = false;

/* -------------------------------------------------------------------------- */
/*                                Don't change                                */
/* -------------------------------------------------------------------------- */
export const settingsEndpoint = `${protocol}://${host}:${port}/${pathSettings}`;
export const offerEndpoint = `${protocol}://${host}:${port}/${pathOffer}`;
export const talkEndpoint = `${protocol}://${host}:${port}/${pathTalk}`;
