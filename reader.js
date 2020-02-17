//Javascript File
"use strict";
const UTTERS = require("./intentUtterances");

function getIntentsArr(scene) {
	let result = [];
	scene.options.forEach(element => {
		result.push(element[0]);
	});
	return result;
}

function getText(scene) {
	return scene["text"];
}

function reprompt(scene) {
	var result = "";
	var intentsArr = getIntentsArr(scene);
	var numOfOptions = intentsArr.length;
	if (numOfOptions > 0) {
		result += " Say";
		for (var i = 0; i < numOfOptions; i++) {
        	if (numOfOptions > 1 && i == numOfOptions - 1) {
            	result += " or";
        	}
        	let phrase = UTTERS[intentsArr[i]];
        	result += " " + phrase;
    	}
	}
    return result;
}

function chosenScene(oldScene, intent) {
	for (var i = 0; i < oldScene.length; i++) {
		if (oldScene[i][0] == intent) {
			return oldScene[i][1];
		}
	}
	return null;
}

module.exports = {
	getIntentsArr: getIntentsArr,
	getText: getText,
	reprompt: reprompt,
	chosenScene: chosenScene
};