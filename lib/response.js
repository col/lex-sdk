'use strict';

module.exports = (function () {
  return {
    ':tell': function (message) {
      if(this.isOverridden()) {
        return;
      }
      this.handler.response = buildResponse({
        sessionAttributes: this.attributes,
        message: message
      });
      this.emit(':responseReady');
    },
    ':confirm': function (intentName, message) {
      if(this.isOverridden()) {
        return;
      }

      this.handler.response = buildConfirmResponse({
        name: intentName,
        sessionAttributes: this.attributes,
        slots: this.slots,
        message: message
      });
      this.emit(':responseReady');
    },
    ':elicit': function (slot, message) {
      if(this.isOverridden()) {
        return;
      }

      this.handler.response = buildElicitResponse(slot, {
        name: this.name,
        sessionAttributes: this.attributes,
        slots: this.slots,
        message: message
      });
      this.emit(':responseReady');
    },
    ':delegate': function (options) {
      if(this.isOverridden()) {
        return;
      }

      this.handler.response = buildDelegateResponse({
        sessionAttributes: this.attributes,
        slots: this.slots
      });
      this.emit(':responseReady');
    },
    ':responseReady': function () {
      if (this.isOverridden()) {
        return;
      }
      this.context.succeed(this.handler.response);
    }
  };
})();

function buildDelegateResponse(options) {
    var lexResponse = {
      sessionAttributes: options.sessionAttributes || {},
      dialogAction: {
          type: "Delegate",
          slots: options.slots || {}
      }
    };
    return lexResponse;
}

function buildElicitResponse(slot, options) {
    var lexResponse = {
      sessionAttributes: options.sessionAttributes || {},
      dialogAction: {
          type: "ElicitSlot",
          slotToElicit: slot,
          intentName: options.name,
          slots: options.slots || {}
      }
    }
    var message = createSpeechObject(options.message)
    if (message) {
      lexResponse.dialogAction.message = message
    }
    return lexResponse;
}

function buildConfirmResponse(options) {
  var lexResponse = {
    sessionAttributes: options.sessionAttributes || {},
    dialogAction: {
        type: "ConfirmIntent",
        intentName: options.name,
        slots: options.slots || {}
    }
  }
  var message = createSpeechObject(options.message)
  if (message) {
    lexResponse.dialogAction.message = message
  }
  return lexResponse;
}

function buildResponse(options) {
    var lexResponse = {
      sessionAttributes: options.sessionAttributes || {},
      dialogAction: {
          type: "Close",
          fulfillmentState: "Fulfilled"
      }
    }
    var message = createSpeechObject(options.message)
    if (message) {
      lexResponse.dialogAction.message = message
    }
    return lexResponse;
}

function createSpeechObject(options) {
    if (options && options.type === 'SSML') {
        return {
            contentType: options.type,
            content: `<speak>${options.speech}</speak>`
        };
    } else if (options) {
        return {
            contentType: options.type || 'PlainText',
            content: options['text'] || options
        };
    } else {
      return null
    }
}
