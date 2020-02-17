'use strict';

const SCENES = require("./scenes");
const READ = require("./reader");

//Handler essentially parses the Lambda request
exports.handler = function (event, context) {
    try {
    if (event.session.application.applicationId !== "amzn1.ask.skill.f1a91714-8d30-4c7a-bb92-2446cc84a85a") {
        context.fail("Invalid Application ID");
    }

        if (event.session.new) { 
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};


/**
 * Called when the session starts.
 */

function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
        + ", sessionId=" + session.sessionId);

    getWelcomeResponse(session, callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */

function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // dispatch custom intents to handlers here
    if ("AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(session, callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
        handleRepeatRequest(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        handleGetHelpRequest(intent, session, callback);
    } else if ("AMAZON.StopIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else if ("AMAZON.CancelIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else if ("GoBackIntent" === intentName) {
        handleGoBackRequest(intent, session, callback);
    } else {
        handleAnswerRequest(intent, session, callback);
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
        + ", sessionId=" + session.sessionId);
}


//My own game logic below
//Welcome will run once, then handleAnswerRequest will run from then on.

function getWelcomeResponse(session, callback) {
    var cardTitle = "Welcome",
        scene = SCENES[cardTitle],
        speechOutput = READ.getText(scene),
        repromptOutput = READ.reprompt(scene),
        shouldEndSession = false;
    
    speechOutput += repromptOutput;
    callback(
        {"scene": cardTitle,
        "path": [cardTitle]
        },
        buildSpeechletResponse(cardTitle, speechOutput, repromptOutput, shouldEndSession));
}


function handleAnswerRequest(intent, session, callback) {
    var cardTitle = session.attributes.scene,
        scene = SCENES[cardTitle],
        nextCardTitle = READ.chosenScene(scene.options, intent.name);

    if ( nextCardTitle == null) {
        return handleInvalidAnswerRequest(intent, session, callback);
    }
    var newScene = SCENES[nextCardTitle],
        speechOutput = READ.getText(newScene),
        repromptOutput = READ.reprompt(newScene),
        shouldEndSession = false;

    speechOutput += repromptOutput;
    if (session.attributes.path[session.attributes.path.length - 1] !== nextCardTitle) {
        session.attributes.path[session.attributes.path.length] = nextCardTitle;
    }
    callback({"scene": nextCardTitle, "path": session.attributes.path},
        buildSpeechletResponse(nextCardTitle, speechOutput, repromptOutput, shouldEndSession));
}

function handleRepeatRequest(intent, session, callback) {
    // Repeat the previous speechOutput and repromptText
    var scene = SCENES[session.attributes.scene],
        speechOutput = READ.getText(scene),
        repromptOutput = READ.reprompt(scene),
        shouldEndSession = false;

    speechOutput += repromptOutput;
    callback({"scene": session.attributes.scene, "path": session.attributes.path},
            buildSpeechletResponseWithoutCard(speechOutput, repromptOutput, shouldEndSession));
} 

function handleGetHelpRequest(intent, session, callback) {
    // Provide a help prompt for the user, explaining how the game is played. Then, continue the game
    
    var scene = SCENES["Help"];

    var speechOutput = READ.getText(scene),
        repromptOutput = "To give an answer to a question, respond with a provided response. Say, go back, to keep playing.",
        shouldEndSession = false;

    if (session.attributes.path[session.attributes.path.length - 1] !== "Help") {
        session.attributes.path[session.attributes.path.length] = "Help";
    }
    speechOutput += repromptOutput;
    callback({"scene": "Help", "path": session.attributes.path},
        buildSpeechletResponseWithoutCard(speechOutput, repromptOutput, shouldEndSession));
}

function handleFinishSessionRequest(intent, session, callback) {
    // End the session with a "Good bye!" if the user wants to quit the game
    var scene = SCENES[session.attributes.scene];
    callback({"scene": scene, "path": session.attributes.path},
        buildSpeechletResponseWithoutCard("Thank you for playing.", "", true));
}

function handleGoBackRequest(intent, session, callback) {
    var lastSceneTitle = session.attributes.path[session.attributes.path.length - 2],
        prevScene = SCENES[lastSceneTitle],
        speechOutput = READ.getText(prevScene),
        repromptOutput = READ.reprompt(prevScene),
        shouldEndSession = false;


    speechOutput += repromptOutput;
    session.attributes.path.splice(-1, 2);
    callback({"scene": lastSceneTitle, "path": session.attributes.path},
        buildSpeechletResponse(lastSceneTitle, speechOutput, repromptOutput, shouldEndSession));
}

function handleInvalidAnswerRequest(intent, session, callback) {
    var cardTitle = session.attributes.scene,
        scene = SCENES[cardTitle],
        speechOutput = "Sorry, I couldn't catch that. ",
        repromptOutput = READ.reprompt(scene) + " or repeat",
        shouldEndSession = false;

    speechOutput += repromptOutput;

    callback({"scene": session.attributes.scene, "path": session.attributes.path},
        buildSpeechletResponse(cardTitle, speechOutput, repromptOutput, shouldEndSession));
}

// ------- Helper functions to build responses -------


function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}