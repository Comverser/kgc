/* -------------------------------------------------------------------------- */
/*                               KETI endpoints                               */
/* -------------------------------------------------------------------------- */
const pathTalk = "talk"
const pathOffer = "offer"
const pathSettings = "settings"
const port = "8080" // 0000
const host = "192.168.219.102" // 000.000.000.000
const protocol = "https"

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