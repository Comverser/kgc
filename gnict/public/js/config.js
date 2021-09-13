/* -------------------------------------------------------------------------- */
/*                                API endpoints                               */
/* -------------------------------------------------------------------------- */
const pathTalk = "talk";
const pathOffer = "offer";
const pathSettings = "settings";

const port = "20080";
const protocol = "https";

const host = "localhost";

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
