const nock = require('nock');
const Lex = require('../lib/lex');

function testEvent(intentName, invocationSource, sessionAttributes, slots) {
  intentName = intentName || 'TestIntent'
  invocationSource = invocationSource || 'FulfillmentCodeHook'
  sessionAttributes = sessionAttributes || {}
  slots = slots || {}
  return {
    sessionAttributes: sessionAttributes,
    invocationSource: invocationSource,
    currentIntent: {
      name: intentName,
      slots: slots
    }
  }
}

describe('Lex', () => {

  describe('#lexRequestHandler', () => {
    var event = {
      sessionAttributes: {},
      currentIntent: {
        name: "TestIntent"
      }
    };

    it('should store the event as read only _event', () => {
      var lex = Lex.lexRequestHandler(event, null, null);
      expect(lex._event).toBe(event);
      lex._event = "invalid write";
      expect(lex._event).toBe(event);
    });

    it('should add sessionAttributes to the event if not provided', () => {
      var lex = Lex.lexRequestHandler({}, null, null);
      expect(lex._event.sessionAttributes).toEqual({});
    });

    it('should store the context as read only _context', () => {
      var context = {};
      var lex = Lex.lexRequestHandler(event, context, null);
      expect(lex._context).toBe(context);
      lex._context = "invalid write";
      expect(lex._context).toBe(context);
    });

    it('should store the callback as read only _callback', () => {
      var callback = function() {};
      var lex = Lex.lexRequestHandler({}, {}, callback);
      expect(lex._callback).toBe(callback);
      lex._callback = "invalid write";
      expect(lex._callback).toBe(callback);
    });

    it('should have a default writable response property', () => {
      var lex = Lex.lexRequestHandler({}, {}, null);
      expect(lex.response).toEqual({});
      lex.response = { test: 123 };
      expect(lex.response).toEqual({ test: 123 });
    });

    it('should include a registerHandlers function', () => {
      var lex = Lex.lexRequestHandler({}, {}, null);
      expect(typeof(lex.registerHandlers)).toEqual("function");
    });

  });

  describe('#registerHandlers', () => {
    var event = testEvent();
    var context = {};
    var callback = function() {};
    var lex = null;

    beforeEach(() => {
      lex = Lex.lexRequestHandler(event, context, callback);
    });

    it("should register an event listener for each Intent", (done) => {
      lex.registerHandlers({
        'TestIntent': function() {
          done();
        }
      });

      lex.emit('TestIntent');
    });

    it("should bind a context containing the Intent name, Lex event, Lex context, attributes and slots", (done) => {
      lex.registerHandlers({
        'TestIntent': function() {
          expect(this.name).toBe(event.currentIntent.name);
          expect(this.event).toBe(event);
          expect(this.context).toBe(context);
          expect(this.attributes).toBe(event.sessionAttributes);
          expect(this.slots).toBe(event.currentIntent.slots);
          done();
        }
      });
      lex.emit('TestIntent');
    });

    it("should bind a context containing the reference to the Lex handler", (done) => {
      lex.registerHandlers({
        'TestIntent': function() {
          expect(this.handler).toBe(lex);
          done();
        }
      });
      lex.emit('TestIntent');
    });

  });

  describe(':delegate', () => {
    var event = testEvent("TestEvent", "DialogCodeHook", {}, {
      slotA: "value",
      slotB: null
    });
    var expectedResponse = {
        sessionAttributes: {},
        dialogAction: {
            type: "Delegate",
            slots: {
              slotA: "value",
              slotB: null
            }
        }
    };

    it("should produce the expected response", (done) => {
      var lex = Lex.lexRequestHandler(event, {
        succeed: function(response) {
          expect(JSON.stringify(response)).toEqual(JSON.stringify(expectedResponse));
          done();
        }
      }, null);
      lex.registerHandlers({
        'TestIntent': function() {
            this.emit(':delegate');
        }
      });
      lex.emit('TestIntent');
    });

  });

  describe(':elicit', () => {
    var event = testEvent("TestIntent", "DialogCodeHook", {}, {
      slotA: "value",
      slotB: "invalid value"
    });

    it("should produce the expected response", (done) => {
      var expectedResponse = {
          sessionAttributes: {},
          dialogAction: {
              type: "ElicitSlot",
              slotToElicit: "slotB",
              intentName: "TestIntent",
              slots: {
                slotA: "value",
                slotB: null
              },
              message: {
                  contentType: "PlainText",
                  content: "Invalid value is not supported. Please provide slotB again."
              }
          }
      };

      var lex = Lex.lexRequestHandler(event, {
        succeed: function(response) {
          expect(JSON.stringify(response)).toEqual(JSON.stringify(expectedResponse));
          done();
        }
      }, null);
      lex.registerHandlers({
        'TestIntent': function() {
            this.slots.slotB = null;
            this.emit(':elicit', 'slotB', "Invalid value is not supported. Please provide slotB again.");
        }
      });
      lex.emit('TestIntent');
    });

    it("should not include the message if none is provided", (done) => {
      var expectedResponse = {
          sessionAttributes: {},
          dialogAction: {
              type: "ElicitSlot",
              slotToElicit: "slotB",
              intentName: "TestIntent",
              slots: {
                slotA: "value",
                slotB: null
              }
          }
      };

      var lex = Lex.lexRequestHandler(event, {
        succeed: function(response) {
          expect(JSON.stringify(response)).toEqual(JSON.stringify(expectedResponse));
          done();
        }
      }, null);
      lex.registerHandlers({
        'TestIntent': function() {
            this.slots.slotB = null;
            this.emit(':elicit', 'slotB');
        }
      });
      lex.emit('TestIntent');
    });

  });

  describe(':confirm', () => {
    var event = testEvent("TestIntent", "DialogCodeHook", {}, {
      slotA: "value"
    });
    var expectedResponse = {
        sessionAttributes: {},
        dialogAction: {
            type: "ConfirmIntent",
            intentName: "TestIntent",
            slots: {
              slotA: "value"
            },
            message: {
                contentType: "PlainText",
                content: "Are you sure?"
            }
        }
    };

    it("should produce the expected response", (done) => {
      var lex = Lex.lexRequestHandler(event, {
        succeed: function(response) {
          expect(JSON.stringify(response)).toEqual(JSON.stringify(expectedResponse));
          done();
        }
      }, null);
      lex.registerHandlers({
        'TestIntent': function() {
            this.emit(':confirm', "TestIntent", "Are you sure?");
        }
      });
      lex.emit('TestIntent');
    });

  });

  describe(':tell', () => {

    it("should produce the expected response", (done) => {
      var event = testEvent();
      var expectedResponse = {
          sessionAttributes: {},
          dialogAction: {
              type: "Close",
              fulfillmentState: "Fulfilled",
              message: {
                  contentType: "PlainText",
                  content: "Hello world!"
              }
          }
      };

      var lex = Lex.lexRequestHandler(event, {
        succeed: function(response) {
          expect(JSON.stringify(response)).toEqual(JSON.stringify(expectedResponse));
          done();
        }
      }, null);
      lex.registerHandlers({
        'TestIntent': function() {
            this.emit(':tell', "Hello world!");
        }
      });
      lex.emit('TestIntent');
    });

    it("should be able to delete sessionAttributes", (done) => {
      var event = testEvent('TestIntent', 'FulfillmentCodeHook', { ValueA: 'Blah' }, {});
      var expectedResponse = {
          sessionAttributes: {},
          dialogAction: {
              type: "Close",
              fulfillmentState: "Fulfilled",
              message: {
                  contentType: "PlainText",
                  content: "Hello world!"
              }
          }
      };

      var lex = Lex.lexRequestHandler(event, {
        succeed: function(response) {
          expect(JSON.stringify(response)).toEqual(JSON.stringify(expectedResponse));
          done();
        }
      }, null);
      lex.registerHandlers({
        'TestIntent': function() {
            // Note: You cannot just set `this.attributes = {}` as this only
            // modifies the 'attributes' bound to this context.
            // You need to actually mutate the attributes object.
            Object.keys(this.attributes).forEach( (key) => { delete this.attributes[key]; });
            this.emit(':tell', "Hello world!");
        }
      });
      lex.emit('TestIntent');
    });

  });

  describe(':tell with SSML', () => {
    var event = testEvent();
    var expectedResponse = {
        sessionAttributes: {},
        dialogAction: {
            type: "Close",
            fulfillmentState: "Fulfilled",
            message: {
                contentType: "SSML",
                content: "<speak>Hello world!</speak>"
            }
        }
    };

    it("should produce the expected response", (done) => {
      var lex = Lex.lexRequestHandler(event, {
        succeed: function(response) {
          expect(JSON.stringify(response)).toEqual(JSON.stringify(expectedResponse));
          done();
        }
      }, null);
      lex.registerHandlers({
        'TestIntent': function() {
            this.emit(':tell', {type: "SSML", speech: "Hello world!"});
        }
      });
      lex.emit('TestIntent');
    });

  });

  describe('#execute', () => {

    describe('General Intent Handler', () => {

      it("should emit an event with the IntentName from the request", (done) => {
        var event = testEvent("TestIntent");
        var lex = Lex.lexRequestHandler(event, {}, null);
        lex.registerHandlers({
          'TestIntent': function() {
            done();
          }
        });

        lex.execute();
      });

    });

    describe('FulfillmentCodeHook', () => {

      it("should emit an event with the IntentName.InvocationType from the request", (done) => {
        var event = testEvent("TestIntent", "FulfillmentCodeHook");
        var lex = Lex.lexRequestHandler(event, {}, null);
        lex.registerHandlers({
          'TestIntent.Fulfillment': function() {
            done();
          }
        });

        lex.execute();
      });

    });

    describe('DialogCodeHook', () => {

      it("should emit an event with the IntentName.InvocationType from the request", (done) => {
        var event = testEvent("TestIntent", "DialogCodeHook");
        var lex = Lex.lexRequestHandler(event, {}, null);
        lex.registerHandlers({
          'TestIntent.Dialog': function() {
            done();
          }
        });

        lex.execute();
      });

    });

  });

});
