/** Parameters of the frontEnd **/

/**
 * Cesium parameters
 * IMPORTANT: Before using the HMI , please change the token of Cesium Ion with your account
 */
// CESIUM TOKEN FROM THEO ACCOUNT
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwZDBjNTU0NS1kMTgwLTRmMDktYjJkOC00M2Q5MzRkNWEzNTciLCJpZCI6NDI5MDcsImlhdCI6MTYxMTkzOTMxNH0.JZPC-gowFnl1t848IqMr5D6h9Te3L_WHfOgFgkH1z6o';


/**
 * Sampling (to change for better performances)
 */
/* To sample the trajectory: The position will be stored every storagePeriod */
var storagePeriod = 2;
/* To sample the footprints: A ground track will be displayed every footprintsPeriod position */
var footprintsPeriod = 10;


/**
 *  Description of the use case
 */
// Description of the use case for the first menu
var useCaseDescription = {
    '-2': {
        description: 'Sentinel2',
    },
    '-1': {
        description: 'Galileo',
    },
    '0': {
        description: 'one plane, anomalies fixed',
    },
    '1': {
        description: 'one plane, free anomalies',
    },
    '2': {
        description: 'General case (6xN variable)',
    },
    '3': {
        description: 'one plane, global coverage',
    },
    '4': {
        description: 'phased with variable right ascending node',
    },
    '5': {
        description: 'phased with variable anomaly and ascending node',
    },
    '6': {
        description: 'phased with ascending node equirepartition and various anomaly',
    },
    '7': {
        description: 'rapport',
    }
}

/**
 * Display parameters
 */
/* colors of the satellites */
var colors = [Cesium.Color.BLUE, Cesium.Color.ORANGERED, Cesium.Color.ORANGE, Cesium.Color.MEDIUMSPRINGGREEN, Cesium.Color.LIGHTSKYBLUE]
/*
 * The colors of the var colorsStatusPoints are used for the geodetic points to be observed
 * by the satellites. The first one is used if the point is not seen by a satellite,
 * the second one if the point is seen, the third one if we don't know.
 */
var colorsStatusPoints = [Cesium.Color.FIREBRICK, Cesium.Color.FORESTGREEN, Cesium.Color.DODGERBLUE]
/* color for the not available menus */
var hiddenColor = 'rgb(214,212,212)';
/* color for the available menus */
var visibleColor = 'rgb(72,71,71)';
/* color for the best constellation and first random */
var visibleColor2 = 'rgb(122,128,252)';
/* color for the side panel when we display graphs */
var sidePanelColorGraph = 'rgba(255,255,255,1)';
/* color for the side panel when we display constellation */
var sidePanelColorConstellation = 'rgba(16,20,64,0.6)';
