"user strict";

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var responseHandlers = require('./response');

function LexRequestEmitter() {
  EventEmitter.call(this);
}
util.inherits(LexRequestEmitter, EventEmitter);

function lexRequestHandler(event, context, callback) {
  if (!event.sessionAttributes) {
    event.sessionAttributes = {};
  }

  var handler = new LexRequestEmitter();
  handler.setMaxListeners(Infinity);

  Object.defineProperty(handler, '_event', {
    value: event,
    writable: false
  });

  Object.defineProperty(handler, '_context', {
    value: context,
    writable: false
  });

  Object.defineProperty(handler, '_callback', {
    value: callback,
    writable: false
  });

  Object.defineProperty(handler, 'response', {
    value: {},
    writable: true
  });

  Object.defineProperty(handler, 'registerHandlers', {
    value: function() {
      RegisterHandlers.apply(handler, arguments);
    },
    writable: false
  });

  Object.defineProperty(handler, 'execute', {
    value: function() {
      EmitEvent.call(this);
    },
    writable: false
  });

  handler.registerHandlers(responseHandlers);

  return handler;
}

function RegisterHandlers() {
  for(var arg = 0; arg < arguments.length; arg++) {
    var handlerObject = arguments[arg];

    if(!isObject(handlerObject)) {
      throw new Error(`Argument #${arg} was not an Object`);
    }

    var eventNames = Object.keys(handlerObject);

    for(var i = 0; i < eventNames.length; i++) {
      if(typeof(handlerObject[eventNames[i]]) !== 'function') {
          throw new Error(`Event handler for '${eventNames[i]}' was not a function`);
      }

      var eventName = eventNames[i];

      var handlerContext = {
        // on: this.on.bind(this),
        emit: this.emit.bind(this),
        handler: this,
        event: this._event,
        attributes: this._event.sessionAttributes,
        context: this._context,
        name: eventName,
        isOverridden:  IsOverridden.bind(this, eventName)
        // response: ResponseBuilder(this)
      };

      this.on(eventName, handlerObject[eventNames[i]].bind(handlerContext));
    }
  }
}

function EmitEvent() {
  var eventString = '';

  if (this._event.invocationSource === 'FulfillmentCodeHook') {
    eventString = this._event.currentIntent.name;
  }
  else if (this._event.invocationSource === 'DialogCodeHook') {
    eventString = this._event.currentIntent.name;
  }

  if (this.listenerCount(eventString) < 1) {
    throw new Error(`No handler function registered for event: ${eventString}`);
  }

  this.emit(eventString);
}

function isObject(obj) {
  return (!!obj) && (obj.constructor === Object);
}

function IsOverridden(name) {
  return this.listenerCount(name) > 1;
}

module.exports.lexRequestHandler = lexRequestHandler;
