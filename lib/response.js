'use strict';

module.exports = (function () {
  return {
    ':tell': function (options) {
      if(this.isOverridden()) {
        return;
      }

      this.handler.response = buildResponse({
        sessionAttributes: this.attributes,
        message: options
      });
      this.emit(':responseReady');
    },
    ':elicit': function (slot, options) {
      if(this.isOverridden()) {
        return;
      }

      this.handler.response = buildElicitResponse(slot, {
        sessionAttributes: this.attributes,
        slots: this.slots,
        message: options
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

function buildElicitResponse(slot, options) {
    var lexResponse = {
      sessionAttributes: options.sessionAttributes || {},
      dialogAction: {
          type: "ElicitSlot",
          slotToElicit: slot,
          slots: options.slots || {},
          message: createSpeechObject(options.message)
      }
    };
    return lexResponse;
}

function buildResponse(options) {
    var lexResponse = {
      sessionAttributes: options.sessionAttributes || {},
      dialogAction: {
          type: "Close",
          fulfillmentState: "Fulfilled",
          message: createSpeechObject(options.message)
      }
    };
    return lexResponse;
}

function createSpeechObject(options) {
    if (options && options.type === 'SSML') {
        return {
            contentType: options.type,
            content: `<speak>${options.speech}</speak>`
        };
    } else {
        return {
            contentType: options.type || 'PlainText',
            content: options['text'] || options
        };
    }
}
