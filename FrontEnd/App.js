/**
 * MAIN APP FUNCTION
 * This function is executed as a script of the index.html.
 * -it creates the cesium viewer
 * -it loads the terrain
 * -it listens to the websocket and does the following depending on the request
 *  --> display a test popup when a connection test is triggered
 *  --> load the constellation  and the zone when there is a start request
 *  --> update the constellation position when there is a position request
 *  --> unload the constellation at the end
 *
 * @author: PIE CONSTELLATION
 */

(function () {
    "use strict";
    //////////////////////////////////////////////////////////////////////////
    //    Global Variables
    //////////////////////////////////////////////////////////////////////////


    /* Main Object with all information and entities of the constellation
    * It has the following structure:
    * constellation{
    *   sat_id:{
    *
    *        currentAlt: //  current altitude of the sat in meters
    *        currentLat: // current latitude of the sat in radians
    *        currentLon: // current longitude of the sat in radians
    *        currentSatPos: Cartesian3 {x: , y: , z: } // current cartesian position of the sat
    *
    *        posStorage: [cartesian3] // storage of the old cartesian positions of the sat for the trajectory
    *
    *        FOVConeEntity: // The entity of the visibility cone
    *        FOVEntity: // The entity of the visibility circle on the ground
    *        satEntity: // entity of the satellite (a cube)
    *        trajEntity: // entity of the trajectory (a polyline)
    *        footprints: [entities] // list of circle entities on the ground representing the ground track
    *
    *        inclination: inclination of the sat in radian
    *        anomaly: // anomaly of the sat in radians
    *        ra: // apogee distance in meters
    *        raan: // right ascending node in radians
    *        rp: // perigee distance in meters
    *        eccentricity: // eccentricity of the sat
    *        semiMajorAxis: //semi major axis in meters
    *        w: // perigee argument in radians
    *        FOV: {halfFOV: } // The  half FOV angle in radians
    * }
    * */
    var constellation = null;

    /* list of the meshes of the zone*/
    var meshes = [];
    /* initial visibility of the footprints*/
    var footprintVisibility = false;
    /* updagted colors of each mesh*/
    var colorMeshes = [];
    /* global variable to know if a constellation has already been initialized with the start case */
    var initialized = false;
    /* counter of the number of position received*/
    var posCounter = 0;



    //////////////////////////////////////////////////////////////////////////
    //WEBSOCKET COMMUNICATION
    //////////////////////////////////////////////////////////////////////////

    var ws = new WebSocket('ws://' + location.host);
    ws.onmessage = function (message) {
        try {
            var obj = JSON.parse(message.data);
            console.log('JSON RECEIVED')
            console.log(obj)
            switch (obj.request) {
                /**
                 * print hello world each time the app is connected to the server
                 */
                case 'firstConnection':
                    console.log('hello world');
                    break;
                /**
                 * used for a connection test from the java app. It displays a popup if the test
                 * is received and send back a success message.
                 */
                case 'testConnection':
                    console.log('test Connection');
                    toggle_visibility_test_popup();
                    ws.send(JSON.stringify({"request": "testResult", "result": "success"}));
                    break;

                /**
                 * Load all dropdown menu from the parsed files in the json sent by the server
                 */
                case 'loadDropdown':
                    console.log('load Dropdown');
                    loadUseCase(obj.content, ws)
                    break;
                case'loadSubmission':
                    console.log('load Submission')
                    viewer.entities.add({
                        name: 'circle',

                        position: position,

                        model: {
                            uri: '../../ressources/Target.glb',
                            scale:10000,
                            scene:viewer.scene,
                            heightReference:Cesium.HeightReference.NONE,
                            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(30.0, 5000.0)

                        },
                        orientation: orientation
                    });


                /**
                 * Initialize  and load all entities on the reception of the start command form the Java App
                 */
                case 'start':
                    //intitialize again all variables in case we load a new constellation
                    viewer.entities.removeAll();
                    constellation = {};
                    meshes = [];
                    footprintVisibility = false;
                    colorMeshes = [];
                    posCounter = 0;
                    initialized = true;

                    //empties the HTML dropdown
                    document.getElementById("sats").innerHTML = ''
                    document.getElementById("footprints").innerHTML = ''
                    document.getElementById("FOV").innerHTML = ''

                    //display the side panel
                    openNav();

                    //list of the first sat positions
                    var listGeodeticPointsSatellites = obj.listGeodeticPointsSatellites;

                    // list of the sat FOVS
                    var halfFOVList = null;

                    // List FOV init
                    if ("listFOVSatellites" in obj) {
                        halfFOVList = obj.listFOVSatellites;
                    }
                    // for old log without the FOV list, we initialize by default to 0.18
                    else {
                        halfFOVList = Array(listGeodeticPointsSatellites.length).fill({"halfFOV": 0.18});
                    }

                    /*** store each satellite in the constellation ****/
                    for (let currentSat = 0; currentSat < listGeodeticPointsSatellites.length; currentSat++) {

                        // first position of the satellite
                        var currentSatPos = Cesium.Cartesian3.fromRadians(listGeodeticPointsSatellites[currentSat].lon,
                            listGeodeticPointsSatellites[currentSat].lat, listGeodeticPointsSatellites[currentSat].alt);
                        // stores the current position in the constellation map
                        constellation[currentSat] = {currentSatPos: currentSatPos};
                        constellation[currentSat].currentLat = listGeodeticPointsSatellites[currentSat].lat;
                        constellation[currentSat].currentLon = listGeodeticPointsSatellites[currentSat].lon;
                        constellation[currentSat].currentAlt = listGeodeticPointsSatellites[currentSat].alt;


                        // create the satellite entity
                        var satEntity = viewer.entities.add({
                            name: "sat" + currentSat,
                            id: "sat" + currentSat,
                            // positions are updated from the current sat pos with a callback property
                            position: new Cesium.CallbackProperty(function () {
                                return constellation[currentSat].currentSatPos;
                            }, false),
                            box: {
                                dimensions: new Cesium.Cartesian3(300000.0, 300000.0, 300000.0),
                                material: colors[currentSat % 5],
                            },
                        })
                        // add the sat entity in the constellation
                        constellation[currentSat].satEntity = satEntity;

                        // add  the Keplerian parameters of the satellite in the constellation
                        constellation[currentSat].semiMajorAxis = obj.constellation[currentSat].a;
                        constellation[currentSat].eccentricity = obj.constellation[currentSat].e;
                        constellation[currentSat].ra = obj.constellation[currentSat].ra;
                        constellation[currentSat].rp = obj.constellation[currentSat].rp;
                        constellation[currentSat].inclination = obj.constellation[currentSat].i;
                        constellation[currentSat].raan = obj.constellation[currentSat].raan;
                        constellation[currentSat].w = obj.constellation[currentSat].w;
                        constellation[currentSat].anomaly = obj.constellation[currentSat].M;
                        constellation[currentSat].FOV = halfFOVList[currentSat];

                        // store the first sat position in the storage list for the trajectory
                        var posStorage = new Array();
                        posStorage.push(currentSatPos);
                        constellation[currentSat].posStorage = posStorage;

                        // Polylines for the trajectory entities
                        var trajEntity = viewer.entities.add({
                            polyline: {
                                name: "line" + currentSat,
                                id: currentSat,
                                // positions are updated from the posStorage with a callback property
                                positions: new Cesium.CallbackProperty(function () {
                                    return constellation[currentSat].posStorage;
                                }, false),
                                width: 2.0,
                                material: colors[currentSat % 5],
                            },
                        });
                        constellation[currentSat].trajEntity = trajEntity;

                        // Footprint entities
                        let currentHalfFOV = constellation[currentSat].FOV.halfFOV;
                        var footprintEntity = viewer.entities.add({
                            position: Cesium.Cartesian3.fromRadians(constellation[currentSat].currentLon, constellation[currentSat].currentLat, 0),
                            name: "footprint" + currentSat,
                            ellipse: {
                                semiMinorAxis: Math.tan(currentHalfFOV) * constellation[currentSat].currentAlt,
                                semiMajorAxis: Math.tan(currentHalfFOV) * constellation[currentSat].currentAlt,
                                height: 0,
                                material: Cesium.Color.GREEN.withAlpha(0.2),
                            },
                        })
                        footprintEntity.show = footprintVisibility;
                        var footprints = new Array();
                        footprints.push(footprintEntity);
                        constellation[currentSat].footprints = footprints;

                        // elliptic FOV + line between earth and satellite
                        var FOVEntity = viewer.entities.add({
                            position: new Cesium.CallbackProperty(function () {
                                return Cesium.Cartesian3.fromRadians(constellation[currentSat].currentLon, constellation[currentSat].currentLat, 0.0);
                            }, false),
                            name: "FOV" + currentSat,
                            ellipse: {
                                semiMinorAxis: new Cesium.CallbackProperty(function () {
                                    return Math.tan(currentHalfFOV) * constellation[currentSat].currentAlt;
                                }, false),
                                semiMajorAxis: new Cesium.CallbackProperty(function () {
                                    return Math.tan(currentHalfFOV) * constellation[currentSat].currentAlt;
                                }, false),
                                height: 0,
                                material: Cesium.Color.WHITE.withAlpha(0.5),
                            },
                            polyline: {
                                positions: new Cesium.CallbackProperty(function () {
                                    return [Cesium.Cartesian3.fromRadians(constellation[currentSat].currentLon, constellation[currentSat].currentLat, 0.0),
                                        Cesium.Cartesian3.fromRadians(constellation[currentSat].currentLon, constellation[currentSat].currentLat, constellation[currentSat].currentAlt)];
                                }, false),
                                width: 1.0,
                                material: colors[currentSat % 5].withAlpha(0.2),
                                followSurface: false,
                            },
                        });

                        // create FOV Cone (a cylinder with the top radius equals to O and the bottom radius representing the FOV)
                        var FOVConeEntity = viewer.entities.add({
                            position: new Cesium.CallbackProperty(function () {
                                return Cesium.Cartesian3.fromRadians(constellation[currentSat].currentLon, constellation[currentSat].currentLat, constellation[currentSat].currentAlt / 2);
                            }, false),
                            clampToGround: true,
                            name: "FOVCone" + currentSat,

                            cylinder: {
                                length: new Cesium.CallbackProperty(function () {
                                    return constellation[currentSat].currentAlt ;
                                }, false),
                                topRadius: 0.0,
                                bottomRadius: new Cesium.CallbackProperty(function () {
                                    return Math.tan(currentHalfFOV) * constellation[currentSat].currentAlt;
                                }, false),
                                material: colors[currentSat % 5].withAlpha(0.1),
                                outline: true,
                                outlineColor: Cesium.Color.WHITE.withAlpha(0.1),
                            }
                        });
                        constellation[currentSat].FOVEntity = FOVEntity;
                        constellation[currentSat].FOVConeEntity = FOVConeEntity;


                        // add satellite to the html dropdown options
                        document.getElementById("sats").innerHTML += "<option value=" + currentSat + ">" + currentSat + "</option>"
                        document.getElementById("footprints").innerHTML += "<option value=" + currentSat + ">" + currentSat + "</option>"
                        document.getElementById("FOV").innerHTML += "<option value=" + currentSat + ">" + currentSat + "</option>"

                    }

                    /*** Load the zone ****/
                    var listGeodeticPointsZone = obj.listGeodeticPointsZone;
                    for (var m = 0; m < listGeodeticPointsZone.length; m++) {
                        let meshId = m;

                        // we instanciate the list of visibility
                        colorMeshes.push(giveStatusPointColor(listGeodeticPointsZone[meshId].status));

                        // we will use a callback property to be able to modify the color
                        // of the entity dynamically
                        var initMesh = viewer.entities.add({
                            name: "mesh" + meshId,
                            id: "mesh" + meshId,
                            position: Cesium.Cartesian3.fromRadians(listGeodeticPointsZone[meshId].lon, listGeodeticPointsZone[meshId].lat, listGeodeticPointsZone[meshId].alt),
                            box: {
                                dimensions: new Cesium.Cartesian3(60000.0, 60000.0, 60000.0),
                                material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(function () {
                                    return colorMeshes[meshId];
                                }, false)), //colorMeshes[meshId][colorMeshes[meshId].length - 1];
                            },
                        })
                        meshes.push(initMesh);
                    }

                    /*** Side Panel Information HTML handling ****/
                    var meshingStyle = "standard";
                    if (obj.meshingStyle.includes("adapted")) {
                        meshingStyle = "adapted"
                    }

                    var fitness = format(obj.fitness);


                    // display information panel
                    document.getElementById('constellationInfo').style.display = 'block';
                    if (obj)
                        document.getElementById('displayInfo').innerHTML = '<p><span>Number of sats </span>' + obj.listGeodeticPointsSatellites.length + '</p>' +
                            '<p> <span>Number of meshes</span> ' + obj.listGeodeticPointsZone.length + '</p>' +
                            '<p> <span>Meshing style</span> </p>' + meshingStyle +
                            '<p> <span>Fitness</span> ' + fitness + '</p>';

                    // display setting panel
                    document.getElementById('displaySettings').style.display = 'block';

                    break;

                /**
                 * update the sat positions on updatePosition message received from the java App
                 */
                case 'updatePosition':

                    // store position only if there was a start before
                    if (constellation) {

                        //increment pos number of 1
                        posCounter += 1;
                        //update position only if the entities have already  been loaded
                        var updatedListGeodeticPointsSatellites = obj.listGeodeticPointsSatellites;

                        /** update position for each sat j **/
                        for (var j = 0; j < updatedListGeodeticPointsSatellites.length; j++) {

                            var updatedPosition = Cesium.Cartesian3.fromRadians(updatedListGeodeticPointsSatellites[j].lon, updatedListGeodeticPointsSatellites[j].lat, updatedListGeodeticPointsSatellites[j].alt);
                            constellation[j].currentSatPos = updatedPosition;


                            // store the current lon lat alt
                            constellation[j].currentLat = updatedListGeodeticPointsSatellites[j].lat;
                            constellation[j].currentLon = updatedListGeodeticPointsSatellites[j].lon;
                            constellation[j].currentAlt = updatedListGeodeticPointsSatellites[j].alt;

                            //store the current pos in the storage every storage period
                            if (posCounter % storagePeriod == 0) {
                                constellation[j].posStorage.push(updatedPosition);
                            }

                            // create a new footprint every footprint period
                            if (posCounter % footprintsPeriod == 0) {

                                var newFootprintEntity = viewer.entities.add({
                                    position: Cesium.Cartesian3.fromRadians(constellation[j].currentLon, constellation[j].currentLat, 0),
                                    name: "footprint" + j + "step" + posCounter,
                                    ellipse: {
                                        semiMinorAxis: Math.tan(constellation[j].FOV.halfFOV) * constellation[j].currentAlt,
                                        semiMajorAxis: Math.tan(constellation[j].FOV.halfFOV) * constellation[j].currentAlt,
                                        height: 0,
                                        material: Cesium.Color.GREEN.withAlpha(0.2),
                                    },
                                })
                                newFootprintEntity.show = footprintVisibility;
                                constellation[j].footprints.push(newFootprintEntity);
                            }

                        }

                        /** update zone colors **/
                        // we need to change the value of the colors of the points of the mesh

                        var updatedListGeodeticPointsZone = obj.listGeodeticPointsZone;
                        for (var updatedM = 0; updatedM < updatedListGeodeticPointsZone.length; updatedM++) {

                            var updatedStatusPointColor = giveStatusPointColor(updatedListGeodeticPointsZone[updatedM].status);

                            if (colorMeshes.length > 0) {
                                colorMeshes[updatedM] = updatedStatusPointColor;
                            }
                        }

                    }


                    break;


            }
        } catch (err) {
            console.error(err);
        }
    }


    /**
     * Function to give the color of a point according to its status.
     * To be used for the geodetic points.
     *
     * @param status the status of the point (an integer between 0 and 2)
     * @returns {*} the color of the point (chosen in the list colorsStatusPoints)
     */
    function giveStatusPointColor(status) {
        var updatedColorStatusPoint;
        switch (status) {
            case 0:
                updatedColorStatusPoint = colorsStatusPoints[0];
                break;
            case 1:
                updatedColorStatusPoint = colorsStatusPoints[1];
                break;
            case 2:
                updatedColorStatusPoint = colorsStatusPoints[2];
                break;
            default:
                updatedColorStatusPoint = colorsStatusPoints[2];
        }
        return updatedColorStatusPoint;
    }

    //////////////////////////////////////////////////////////////////////////
    // Display settings
    //////////////////////////////////////////////////////////////////////////

    /********** Toogle trajectory visibility on user command **********/

    var satSelect = document.getElementById('sats');
    satSelect.addEventListener("change", displayOneSatTraj);
    var oneTrajToogled = false;// to know if only one traj is displayed

    /**
     * Function to toogle the visibility of one sat trajectory only.
     */
    function displayOneSatTraj() {

        console.log("----DISPLAY SAT NB " + satSelect.value);
        oneTrajToogled = true;
        // loop through all satellite to hide them
        for (var i = 0; i < Object.keys(constellation).length; i++) {
            if (i != satSelect.value) {
                constellation[i].trajEntity.show = false;
            } else {
                constellation[i].trajEntity.show = true;
            }
        }

        // display sat parameters
        document.getElementById('satInfo').style.display = 'block';
        var satParam = "<p><span>a</span>" + Math.round(constellation[satSelect.value].semiMajorAxis) / 1000 + " km</p>";
        satParam += "<p><span>e</span>" + Math.round(constellation[satSelect.value].eccentricity * 100) / 100 + "</p>";
        satParam += "<p><span>ra</span>" + Math.round(constellation[satSelect.value].ra) / 1000 + " km</p>";
        satParam += "<p><span>rp</span>" + Math.round(constellation[satSelect.value].rp) / 1000 + " km</p>";
        satParam += "<p><span>i</span>" + Math.round(constellation[satSelect.value].inclination * 180 / Math.PI * 100) / 100 + "°</p>";
        satParam += "<p><span>raan</span>" + Math.round(constellation[satSelect.value].raan * 180 / Math.PI * 100) / 100 + "°</p>";
        satParam += "<p><span>w</span>" + Math.round(constellation[satSelect.value].w * 180 / Math.PI * 100) / 100 + "°</p>";
        satParam += "<p><span>M0</span>" + Math.round(constellation[satSelect.value].anomaly * 180 / Math.PI * 100) / 100 + "°</p>";
        satParam += "<p><span>FOV</span>" + Math.round(constellation[satSelect.value].FOV * 180 / Math.PI * 100) / 100 + "°</p>";

        document.getElementById("displaySatInfo").innerHTML = satParam;


    }

    /*Toogle satellite visibility of all satellite */

    var displaySatTraj = document.getElementById('displaySatTraj');
    displaySatTraj.addEventListener("change", displayAllSatTraj);

    /**
     * Function to display/hide all satellite trajectory
     */
    function displayAllSatTraj() {

        console.log("----DISPLAY SAT NB " + satSelect.value);

        // loop through all satellite to hide them
        for (var i = 0; i < Object.keys(constellation).length; i++) {
            // if not in one traj mode, display or hide depending on the previous state
            if (!oneTrajToogled) {
                constellation[i].trajEntity.show = !constellation[i].trajEntity.show;
            }
            // if in one mode, toogle everything to true
            else {
                constellation[i].trajEntity.show= true;

            }

        }
        oneTrajToogled = false;

    }

    /**********Toogle footprints visibility on user command**********/

    var footprintSelect = document.getElementById('footprints');
    footprintSelect.addEventListener("change", displayFootprint);
    var oneFootprintToogled = false;// to know if only one footprint is displayed

    /**
     * Function to toogle the visibility of the footprint of one sat only
     */
    function displayFootprint() {

        console.log("----DISPLAY SAT NB " + footprintSelect.value);
        oneFootprintToogled = true;
        // loop through all satellite to hide them
        for (var i = 0; i <  Object.keys(constellation).length; i++) {
            if (i != footprintSelect.value) {
                for (var j = 0; j < constellation[i].footprints.length; j++) {
                    constellation[i].footprints[j].show = false;
                }
            } else {
                for (var j = 0; j < constellation[i].footprints.length; j++) {
                    constellation[i].footprints[j].show = true;
                }
            }
        }

    }


    var displayFootprints = document.getElementById('displayFootprints');
    displayFootprints.addEventListener("change", displayAllFootprints);

    /**
     * Function to toogle the visibility of all footprints
     */
    function displayAllFootprints() {
        console.log("----DISPLAY SAT NB " + footprintSelect.value);
        // loop through all satellites to hide footprints
        for (var i = 0; i < Object.keys(constellation).length; i++) {
            // if not in one footprint mode, display or hide depending on the previous state
            if (!oneFootprintToogled) {
                for (var j = 0; j < constellation[i].footprints.length; j++) {
                    constellation[i].footprints[j].show = !constellation[i].footprints[j].show;
                }
                footprintVisibility = !footprintVisibility;
            }
            // if in one mode, toogle everything to true
            else {
                for (var j = 0; j < constellation[i].footprints.length; j++) {
                    constellation[i].footprints[j].show = true;
                }
            }

        }
        oneFootprintToogled = false;

    }

    /********** Toogle FOV visibility on user command **********/

    var fovSelect = document.getElementById('FOV');
    fovSelect.addEventListener("change", displayFOV);
    var oneFovToogled = false;// to know if only one FOV is displayed

    /**
     * Function to toogle the visibility of one FOV Cone only
     **/
    function displayFOV() {

        console.log("----DISPLAY SAT NB " + fovSelect.value);
        oneFovToogled = true;
        // loop through all FOV to hide them
        for (var i = 0; i < Object.keys(constellation).length; i++) {
            if (i != fovSelect.value) {
                constellation[i].FOVConeEntity.show = false;
                constellation[i].FOVEntity.show=false;
            } else {
                constellation[i].FOVConeEntity.show = true;
                constellation[i].FOVEntity.show=true;
            }
        }
    }

    /* Toogle the visibility of all FOV */
    var displayFov = document.getElementById('displayFOV');
    displayFov.addEventListener("change", displayAllFOV);

    /**
     * Function to toogle the visibility of all FOV Cone
     */
    function displayAllFOV() {
        console.log("----DISPLAY SAT NB " + fovSelect.value);
        // loop through all satellites to hide FOV
        for (var i = 0; i < Object.keys(constellation).length; i++) {
            // if not in one FOV mode, display or hide depending on the previous state
            if (!oneFovToogled) {
                constellation[i].FOVConeEntity.show = !constellation[i].FOVConeEntity.show;
                constellation[i].FOVEntity.show=!constellation[i].FOVEntity.show;
            }
            // if in one mode, toogle everything to true
            else {
                constellation[i].FOVConeEntity.show = true;
                constellation[i].FOVEntity.show=true;
            }

        }
        oneFovToogled = false;
    }


    //////////////////////////////////////////////////////////////////////////
    // Creating the Viewer
    //////////////////////////////////////////////////////////////////////////


    var viewer = new Cesium.Viewer('cesiumContainer', {
        scene3DOnly: true,
        selectionIndicator: false,
        baseLayerPicker: false,
        timeline: false,
        animation: false
    });

    viewer._cesiumWidget._creditContainer.style.display = "none";

    //////////////////////////////////////////////////////////////////////////
    // Loading Imagery
    //////////////////////////////////////////////////////////////////////////

    // Remove default base layer
    viewer.imageryLayers.remove(viewer.imageryLayers.get(0));

    // Add Sentinel-2 imagery
    viewer.imageryLayers.addImageryProvider(new Cesium.IonImageryProvider({assetId: 3954}));
    //viewer.imageryLayers.addImageryProvider(new Cesium.IonImageryProvider({ assetId: 2 }));

    //////////////////////////////////////////////////////////////////////////
    // Loading Terrain
    //////////////////////////////////////////////////////////////////////////

    // Load Cesium World Terrain
    viewer.terrainProvider = Cesium.createWorldTerrain({
        requestWaterMask: true, // required for water effects
        requestVertexNormals: true // required for terrain lighting
    });
    // Enable depth testing so things behind the terrain disappear.
    viewer.scene.globe.depthTestAgainstTerrain = true;

    //////////////////////////////////////////////////////////////////////////
    // Configuring the Scene
    //////////////////////////////////////////////////////////////////////////

    // Enable lighting based on sun/moon positions
    viewer.scene.globe.enableLighting = false;

    // Create an initial camera view
    var initialPosition = new Cesium.Cartesian3.fromDegrees(-73.998114468289017509, 40.674512895646692812, 12000000);
    var initialOrientation = new Cesium.HeadingPitchRoll.fromDegrees(180, 270, 180);
    var homeCameraView = {
        destination: initialPosition,
        orientation: {
            heading: initialOrientation.heading,
            pitch: initialOrientation.pitch,
            roll: initialOrientation.roll
        }
    };
    // Set the initial view
    viewer.scene.camera.setView(homeCameraView);

    // Add some camera flight animation options
    homeCameraView.duration = 2.0;
    homeCameraView.maximumHeight = 2000;
    homeCameraView.pitchAdjustHeight = 2000;
    homeCameraView.endTransform = Cesium.Matrix4.IDENTITY;
    // Override the default home button
    viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function (e) {
        e.cancel = true;
        viewer.scene.camera.flyTo(homeCameraView);
    });


}());
