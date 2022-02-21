
/**
 * Functions to parse the a directory recursively, get all files and subfolders. Then it creates a JSON and send it
 * to the frontEnd to display the list.
 * code adapted from 'https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search'
 * @author: Theo Nguyen
 */

const path = require('path');
const fs = require('fs');

/**
 * Parse a folder and create a JSON with the following syntax:
 * ['key': 'path/to/the/file',
 *  'label': 'name_of_the_file',
 *  'child':[list of subfile if folder]
 * ]
 * @param dir:String directory to parse
 * @param done:function Function to execute once all the folders have been scanned.
 */
var parseOutputFolder = function(dir, done) {
    //list with all the files and folders of dir
    var results = [];

    //read the files
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var i = 0;

        (function next() {
            var fileName = list[i++];
            //stop if there is no file anymore
            if (!fileName) return done(null, results);

            //get the path of the file
            file = path.resolve(dir, fileName);

            //check the type of the file (file or folder?)
            fs.stat(file, function(err, stat) {

                //if it is a folder, parse again the subfolder
                if (stat && stat.isDirectory()) {
                    parseOutputFolder(file, function(err, res) {
                        results.push({'key':file,'label':fileName,'child':res});
                        next();
                    });
                    //if it is a file, add it to the json
                } else {
                    let splitExtensionFile=file.split(".");
                    if(splitExtensionFile[splitExtensionFile.length-1]=="json"){ // add only file with json extension
                        let useCaseNb=file.split('useCase')[1][0];//get the use case number for the frontend
                            results.push({'key':file,'label':fileName,'useCaseNb':useCaseNb});
                    }
                    else if (fileName=="memo.txt"){
                        let useCaseNb=file.split('useCase')[1][0];//get the use case number for the frontend
                        fs.readFile(file, (err, data) => {
                            if (err) throw err;
                            results.push({'key':file,'label':fileName,'useCaseNb':useCaseNb,'content':data.toString()});
                        });
                    }

                    //console.log('file')
                    next();
                }
            });
        })();
    });
};

/**
 * call the function to parse the directory and send the json trough the websocket.
 * @param directoryPath:String the path of the directory to parse.
 * @param ws:WebSocket the websocket to send the json to the frontEnd.
 */
module.exports.createJsonFromOutputFiles=function(directoryPath,ws) {

    parseOutputFolder(directoryPath,function(err, results) {
        //add request type
        var message={'request':'loadDropdown'}
        message.content=results;

        //send the resulting json
        ws.send(JSON.stringify(message));
        return(message);

    });


}