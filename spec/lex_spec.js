const nock = require('nock');
const Lex = require('../lib/lex');

describe('Lex', () => {

  describe('#lexRequestHandler', () => {

    it('should store the event as read only _event', () => {
      var event = { sessionAttributes: {} };
      var lex = Lex.lexRequestHandler(event, null, null);
      expect(lex._event).toBe(event);
      lex._event = "invalid write";
      expect(lex._event).toBe(event);
    });

    it('should add sessionAttributes to the event if not provided', () => {
      var event = { test: 123 };
      var lex = Lex.lexRequestHandler(event, null, null);
      expect(lex._event).toEqual({ test: 123, sessionAttributes: {} });
    });

    it('should store the context as read only _context', () => {
      var context = {};
      var lex = Lex.lexRequestHandler({}, context, null);
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
    var event = { sessionAttributes: { "test": "123" }};
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

    it("should bind a context containing the Intent name, Lex event, Lex context and attributes", (done) => {
      lex.registerHandlers({
        'TestIntent': function() {
          expect(this.name).toBe('TestIntent');
          expect(this.event).toBe(event);
          expect(this.context).toBe(context);
          expect(this.attributes).toBe(event.sessionAttributes);
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

  describe('response handler - :tell', () => {
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

    it("should produce the expected response", (done) => {
      var lex = Lex.lexRequestHandler({}, {
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

  });

  describe('response handler - :tell with SSML', () => {
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
      var lex = Lex.lexRequestHandler({}, {
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
    var event = {
      sessionAttributes: {},
      invocationSource: "FulfillmentCodeHook",
      currentIntent: {
        name: "TestIntent"
      }
    };

    it("should emit an event with the IntentName from the request", (done) => {
      var lex = Lex.lexRequestHandler(event, {}, null);
      lex.registerHandlers({
        'TestIntent': function() {
          done();
        }
      });

      lex.execute();
    });
  });

});
