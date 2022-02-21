/**
 * Functions to create the main  menu from a JSON with the following form:
 *['key': 'path/to/the/file',
 *  'label': 'name_of_the_file',
 *  'child':[list of subfile if folder]
 * ]
 *  This file contains all the functions to handle the user interaction with the HMI.
 * @author: Theo Nguyen
 */

/**
 * Global variables.
 */

var WS; //Websocket
var DATA; // The json received from the backend


var useCaseChosen; // The use case chosen by the user after a click on the corresponding menu
var firstLevelIdx; // The index of the first directory chosen in the JSON (useCase folder)
var runIdx; // The index of the second directory chosen in the JSON (run folder)
var chart = null // chart of the fitness across generation

/**
 * create the first menu from the JSON DATA. It loads all the useCase available
 * depending on the subdirectories in the main output folder
 * @param data:JSON the JSON with the parsed output directory
 * @param ws:WebWocket the websocket between the front and the backend
 */

function loadUseCase(data, ws) {

    //Store the websocket and the datas in global variables in order to
    //be able to access it when the function sendLoadOrder is triggered in the HTML

    WS = ws;
    DATA = data;

    // get and hide the previous menu displayed

    document.getElementById('logLi').style.color = hiddenColor;
    document.getElementById('bestConstellationLi').style.color = hiddenColor;
    document.getElementById('randomLi').style.color = hiddenColor;
    document.getElementById('displaySettings').style.display = 'none';
    document.getElementById('constellationInfo').style.display = 'none';

    // change the memo font size
    document.getElementById("runMemo").style.color='black';

    // empty the previous log
    document.getElementById('logsBox').innerHTML = '';

    // html code of the  useCase dropdown menu
    var useCaseMenu = '';
    useCaseMenu += '<ul id="useCaseUl">';

    //iterate through the files in the first level of the directory
    for (var a = 0; a < data.length; a++) {

        //if the folder has the correct syntax
        if (data[a].label.substring(0, 7) == ('useCase')) {
            var useCaseNb = data[a].label.split("useCase")[1];
            useCaseMenu += '<li' + ' ' + 'useCaseNb="' + useCaseNb + '"' + ' ' + 'idx="' + a + '"';
            useCaseMenu += 'onclick="loadRun(this)"' + '>';
            useCaseMenu += '<span>' + useCaseNb + '</span>'
            useCaseMenu += '<a>' + useCaseDescription[useCaseNb].description + '</a>';
            useCaseMenu += '</li>'

        }
    }
    document.getElementById('useCaseBox').innerHTML = useCaseMenu;
}

/**
 * create the second menu from the JSON DATA. It loads all the run available
 * depending on the subdirectories in the useCase folder
 * @param divSelected:the html code of the useCase selected
 */
function loadRun(divSelected) {

    // hide and  get the previous menu displayed
    document.getElementById('logLi').style.color = hiddenColor;
    document.getElementById('bestConstellationLi').style.color = hiddenColor;
    document.getElementById('randomLi').style.color = hiddenColor;
    document.getElementById('displaySettings').style.display = 'none';
    document.getElementById('constellationInfo').style.display = 'none';
    // empty the previous log
    document.getElementById('logsBox').innerHTML = '';
    // empty run info
    document.getElementById("runMemo").innerHTML=''
    //hide sat information
    document.getElementById('satInfo').style.display='none';
    //hide constellation info
    document.getElementById('constellationInfo').style.display='none';
    //hide settings
    document.getElementById('displaySettings').style.display='none';
    // hide side panel
    closeNav();
    // display run info
    document.getElementById('runInformation').style.display = 'block';
    // change the chart font size
    Chart.defaults.global.defaultFontColor = "#000000";
    // change the Run font size
    document.getElementById("runInformation").style.color='black !important';
    // change the memo font size
    document.getElementById("runMemo").style.color='black';

    let runInfoList = [];// Information on the different run (and fitness for the graph)


    var runMenu = ''; // html code of the  useCase dropdown menu

    //get the useCase number stored previously in the attributes of the html div
    useCaseChosen = divSelected.getAttribute("useCaseNb");
    //get the index of the use case in the list
    firstLevelIdx = divSelected.getAttribute("idx")

    // display the run menu if there are childs
    var runLi = document.getElementById('runLi');
    runLi.style.color = visibleColor;

    //display legend
    runMenu += '<ul id="runUl">';
    runMenu += '<li>'
    runMenu += '<div class="generation">' + 'generation' + '</div>'
    runMenu += '<div class="individuals">' + 'individuals' + '</div>'
    runMenu += '<a>' + 'date' + '</a>';
    runMenu += '</li>'

    // get the potential runs
    var useCaseChild = DATA[firstLevelIdx].child


    // max number of generation
    var maxGen = 0;


    // if there are files in the corresponding folder
    if (useCaseChild && Array.isArray(useCaseChild)) {
        //iterate through the files in the folder
        for (var run = 0; run < useCaseChild.length; run++) {

            //if  log subfolder correctly formated
            if ((useCaseChild[run].label.substring(0, 3) == 'log') && ((useCaseChild[run].label.split("_").length == 6))) {
                var runName = useCaseChild[run].label.split('log')[1];
                var rawDate = runName.split("_")[1]
                //format the date
                rawDate = rawDate.split("T")[0] + 'T' + rawDate.split("T")[1].replace("-", ":").substring(0, 5);
                var dateOptions = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric'
                };
                var fullDate = new Date(rawDate).toLocaleDateString("en-US", dateOptions);

                var generation = runName.split("_gen_")[1]
                var individuals = runName.split("_pop_")[1].split("_gen_")[0]

                runMenu += '<li' + ' ' + 'idx="' + run + '"';
                runMenu += 'onmouseover="graphHover(this)" '
                runMenu += 'onmouseleave="graphHoverOut(this)" '
                runMenu += 'onclick="loadLog(this)"' + '>';
                runMenu += '<div class="generation">' + generation + '</div>'
                runMenu += '<div class="individuals">' + individuals + '</div>'
                runMenu += '<a>' + fullDate + '</a>';
                runMenu += '</li>'

                //save  info on the run list
                var runInfo = {label: "gen: " + generation + " , ind: " + individuals + " , " + fullDate};
                //add general info
                runInfo.generation = generation;
                runInfo.individuals = individuals;
                runInfo.date = fullDate;
                runInfo.data = loadRunFitness(run);
                runInfo.borderColor = getRandomColor();
                runInfo.lineTension=0;
                runInfo.pointBorderColor='rgba(1,1,1,0)';
                runInfo.fill=false;

                runInfoList.push(runInfo);

                // store the information of the run in the DATA dictionary
                DATA[firstLevelIdx].child[run].runInfo = clone(runInfo);

                if (parseInt(generation) > maxGen) {
                    maxGen = parseInt(generation);
                }

            }

        }
    }
    openNav(0.6, sidePanelColorGraph);

    // create chart
    // create the chart
    if (chart != null) {
        chart.destroy()
    }
    chart = createChart(runInfoList, maxGen);

    // add the options to the dropdown
    document.getElementById('runBox').innerHTML = runMenu;

}

/**
 *  load all fitness values of a run
 * @param run chosen
 */
function loadRunFitness(runIdx) {

    // dict of the logs (to be sorted after)
    var logDict = {};


    // get the potential runs
    var logChild = DATA[firstLevelIdx].child[runIdx].child
    // if there are logs or best constellation

    if (logChild && Array.isArray(logChild)) {

        //iterate through the files in the folder
        for (var log = 0; log < logChild.length; log++) {

            // if it is a log and there is a fitness number
            if ((logChild[log].label.substring(0, 10) == 'generation') && (logChild[log].label.split('_').length > 2)) {

                var thisLog = {};// to store the fitness of this log

                var generationNb = logChild[log].label.split('_')[1].split('.json')[0];

                // stores the fitness for the graph if it is not generation 0
                if (generationNb != 0) {
                    thisLog['fitness'] = logChild[log].label.split('_')[2].split('.json')[0];
                    logDict[generationNb] = thisLog;
                }


            }

            //if it is a memo, stores it in the run
            if (logChild[log].label=="memo.txt"){
                DATA[firstLevelIdx].child[runIdx].runMemo=logChild[log].content;
            }

        }

    }

    var runValues = []
    // sort the generations and add it to the html
    for (var i = 1; i < Object.keys(logDict).length + 1; i++) {
        // add the fitness values for the chart
        if (logDict[i.toString()].fitness) {
            runValues.push(logDict[i.toString()].fitness)
        }
    }
    return (runValues)
}

/**
 *  create the third menu from the JSON DATA. It loads all the generations available
 * depending on the subdirectories in the log folder.
 * @param divSelected:the html code of the run selected
 */
function loadLog(divSelected) {
    // html code of the  log dropdown menu
    var logMenu = '<ul id="logUl"><li><div class="generationNbLeft">generation</div> fitness</li>';
    // change the memo font size
    document.getElementById("runMemo").style.color='black';

    // dict of the logs (to be sorted after)
    var logDict = {}

    //get the index of the use case in the list
    runIdx = divSelected.getAttribute("idx")

    // get  the different menu available
    var logLi = document.getElementById('logLi');
    var bestConstellationLi = document.getElementById('bestConstellationLi');
    var randomLi = document.getElementById('randomLi');
    // hide the best constellation menu in case it is not in the subfolder
    bestConstellationLi.style.color = hiddenColor;
    logLi.style.color = hiddenColor;
    randomLi.style.color = hiddenColor;
    //change the chart font style
    Chart.defaults.global.defaultFontColor = "#000000";
    // empty the run info
    document.getElementById("runMemo").innerHTML=''
    //hide sat information
    document.getElementById('satInfo').style.display='none';
    //hide constellation info
    document.getElementById('constellationInfo').style.display='none';
    //hide settings
    document.getElementById('displaySettings').style.display='none';
    // change the Run font size
    document.getElementById("runInformation").style.color='black !important';


    // get the potential runs
    var logChild = DATA[firstLevelIdx].child[runIdx].child
    // if there are logs or best constellation

    if (logChild && Array.isArray(logChild)) {

        //iterate through the files in the folder
        for (var log = 0; log < logChild.length; log++) {
            //if  there is a best constellation file
            if (logChild[log].label.substring(0, 4) == 'best') {
                var bestConstellationMenu = '<div' + ' ' + 'idx="' + log + '"';
                bestConstellationMenu += 'onclick="selectConstellation(this)"' + '>';

                bestConstellationMenu += 'Best Constellation';
                bestConstellationMenu += '</div>'
                //display the best constellation button
                bestConstellationLi.innerHTML = bestConstellationMenu
                bestConstellationLi.style.color = visibleColor2;
            }
            //if  there is a the first individual
            if (logChild[log].label.substring(0, 12) == 'generation_0') {
                var randomMenu = '<div' + ' ' + 'idx="' + log + '"';
                randomMenu += 'onclick="selectConstellation(this)"' + '>';
                randomMenu += ' First random individual ';
                randomMenu += '</div>'
                //display the random button
                randomLi.innerHTML = randomMenu;
                randomLi.style.color = visibleColor2;
            }

            // if it is a log
            else if (logChild[log].label.substring(0, 10) == 'generation') {

                var thisLog = {};// to store html and fitness of this log
                logLi.style.color = visibleColor;
                var generationNb = logChild[log].label.split('_')[1].split('.json')[0];
                var generationHTML = ''
                generationHTML += '<li' + ' ' + 'idx="' + log + '"';
                generationHTML += 'onclick="selectConstellation(this)"' + '>';

                // if there is fitness number
                if (logChild[log].label.split('_').length > 2) {

                    fitness = format(logChild[log].label.split('_')[2].split('.json')[0]);
                    generationHTML += '<div class="generationNbLeft">' + generationNb + '</div>';
                    generationHTML += '<span2>' + fitness + '</span2>'
                    // stores the fitness for the graph
                    thisLog['fitness'] = logChild[log].label.split('_')[2].split('.json')[0];

                } else {
                    generationHTML += '<a>' + 'generation ' + '</a>';
                    generationHTML += '<div class="generationNbRight">' + generationNb + '</div>';
                }

                generationHTML += '</li>'
                //stores everything in the dictionary
                thisLog['htmlCode'] = generationHTML;
                logDict[generationNb] = thisLog;

            }
            // if it is a memo
            if (logChild[log].label=="memo.txt"){
                console.log(logChild[log].content);
                document.getElementById("runMemo").innerHTML=logChild[log].content;
            }
        }

    }

    // sort the generations and add it to the html
    for (var i = 1; i < Object.keys(logDict).length + 1; i++) {
        logMenu += logDict[i.toString()].htmlCode

    }

    // create the chart
    if (chart != null) {
        chart.destroy()
    }
    var chartValues = [DATA[firstLevelIdx].child[runIdx].runInfo];
    var generationNb = parseInt(DATA[firstLevelIdx].child[runIdx].runInfo.generation);
    chart = createChart(chartValues, generationNb);
    //display the side panel
    openNav(0.6, sidePanelColorGraph);


    // add the options to the log dropdown if not empty
    if (Object.keys(logDict).length != 0) {
        document.getElementById('logsBox').innerHTML = logMenu;
    }
}


/**
 * Function triggered by a click on the chosen file in HMI. It gets the path of the chosen file in the
 * Json and send it to the backend.
 * @param chosenDiv the html div of the file chose
 */
function selectConstellation(chosenDiv) {

    //hide sat information
    document.getElementById('satInfo').style.display='none';
    // change the Run font size
    document.getElementById("runInformation").style.color='white !important';
    // change the memo font size
    document.getElementById("runMemo").style.color='white';

    //get the child list stored previously in the attributes of the html div
    let thirdLevelIdx = chosenDiv.getAttribute("idx");
    //get the file path if there is 3 levels of subfolder
    let filePath = DATA[firstLevelIdx].child[runIdx].child[thirdLevelIdx]

    //send a request to the backend
    if (useCaseChosen != "undefined") {
        WS.send(JSON.stringify({'request': 'loadConstellation', 'useCaseNb': useCaseChosen, 'path': filePath.key}));
    }

    // Display side panel
    openNav(0.2, sidePanelColorConstellation);
    Chart.defaults.global.defaultFontColor = "#ffffff";

}

/**
 *  convert seconds in a formated string  hour min second
 * @param  the time in second
 * @return a string "HHh MMm SSs"
 */
function format(time) {
    // Hours, minutes and seconds
    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = ~~time % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";
    if (hrs > 0) {
        ret += "" + hrs + "h" + (mins < 10 ? "0" : "");
    }
    ret += "" + mins + "m " + (secs < 10 ? "0" : "");
    ret += "" + secs + "s";
    return ret;
}


//Side Panel functions


/**
 * Set the width of the sidebar to percentWidth of the screen (show it)
 */
function openNav(percentWidth, color) {
    let width = screen.width * percentWidth;
    document.getElementById("mySidepanel").style.backgroundColor = color;
    document.getElementById("mySidepanel").style.width = width + "px";
}

/**
 *  Set the width of the sidebar to 0 (hide it)
 */
function closeNav() {
    if (chart) {
        chart.destroy();
    }
    //document.getElementById("runInformation").style.display = 'none'
    document.getElementById("mySidepanel").style.width = "0";
}

/**
 * create a simple line chart
 * @param chartValues:Array data of the chart
 * @returns the new charts
 */
function createChart(chartValues, maxGen) {


    var ctx = document.getElementById('myChart').getContext('2d');
    var chart = new Chart(ctx, {
        // The type of chart we want to create
        type: 'line',


        // The data for our dataset
        data: {
            labels: Array.from(Array(maxGen).keys()),
            datasets: chartValues,
            responsive: true
        }
    });
    Chart.defaults.global.defaultFontColor = "#000000";
    return chart;
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function graphHover(divSelected) {

    var runHovered = divSelected.getAttribute("idx");
    //chart.data.datasets[runHovered].order=10;
    for(var run=0;run<DATA[firstLevelIdx].child.length;run++){
        if(run==runHovered){
            try {
                chart.data.datasets[run].borderColor = 'rgb(255,0,90)';
            }catch(e){}
            // display run memo if any
            if ("runMemo" in DATA[firstLevelIdx].child[run]){
                document.getElementById('runMemo').innerHTML= DATA[firstLevelIdx].child[run].runMemo;
            }
            else{
                document.getElementById('runMemo').innerHTML='';
            }
        }

        else{
            try{
            chart.data.datasets[run].borderColor = 'rgba(71,71,71,0.2)';
            }
            catch(e){}
        }

    }

    try{chart.update();}catch(e){};
}

function graphHoverOut(divSelected) {


    /**chart.data.datasets=[]
    for (var run=0;run<DATA[firstLevelIdx].child.length;run++){
        chart.data.datasets.push(clone(DATA[firstLevelIdx].child[run].runInfo))
    }*/
    for(var run=0;run<DATA[firstLevelIdx].child.length;run++) {
        try{
            chart.data.datasets[run].borderColor = DATA[firstLevelIdx].child[run].runInfo.borderColor;
        }
        catch(e){}


    }
    try{chart.update();}catch(e){};
    // empty run memo
    //document.getElementById('runMemo').innerHTML='';
}


function clone(obj) {
    var copy = JSON.parse(JSON.stringify(obj));

    return copy;
}