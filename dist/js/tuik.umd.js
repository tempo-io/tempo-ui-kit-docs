/*!
  * TUIK (http://ui-kit.tempo.io)
  * Copyright 2017 Tempo ehf.
  */
 
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('popper.js')) :
	typeof define === 'function' && define.amd ? define(['exports', 'popper.js'], factory) :
	(factory((global.tuik = {}),global.Popper));
}(this, (function (exports,Popper) { 'use strict';

Popper = Popper && Popper.hasOwnProperty('default') ? Popper['default'] : Popper;

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var Utils = function () {
  var Utils = {
    EventHandlers: function () {
      function EventHandlers(namespace) {
        classCallCheck(this, EventHandlers);

        this._namespace = this._slugify(namespace || '');
      }

      /* private */

      EventHandlers.prototype._slugify = function _slugify(str) {
        return str.toString().toLowerCase().trim().replace(/[^\w\s-]/g, '') // remove non-word [a-z0-9_], non-whitespace, non-hyphen characters
        .replace(/[\s_-]+/g, '-') // swap any length of whitespace, underscore, hyphen characters with a single -
        .replace(/^-+|-+$/g, ''); // remove leading, trailing -
      };

      EventHandlers.prototype._getAttributeName = function _getAttributeName(eventName, key) {
        var fullKey = key ? this._namespace + '_' + eventName + '_' + this._slugify(key) : this._namespace + '_' + eventName;

        return 'data-tui-evnt-' + fullKey;
      };

      /* public */

      EventHandlers.prototype.isBound = function isBound(element, eventName, key) {
        var attributeName = this._getAttributeName(eventName, key);
        var isBound = false;

        if (element === document) {
          isBound = element.tuik && element.tuik[attributeName];
        } else {
          isBound = element.getAttribute(attributeName);
        }

        return isBound;
      };

      EventHandlers.prototype.add = function add(element, eventName, handler, key) {
        var attributeName = this._getAttributeName(eventName, key);
        if (this.isBound(element, eventName, key)) {
          return;
        }

        element.addEventListener(eventName, handler);

        if (element === document) {
          element.tuik = element.tuik || {};
          element.tuik[attributeName] = 1;
        } else {
          element.setAttribute(attributeName, '1');
        }
      };

      EventHandlers.prototype.remove = function remove(element, eventName, handler, key) {
        var attributeName = this._getAttributeName(eventName, key);

        if (!this.isBound(element, eventName, key)) {
          return;
        }

        element.removeEventListener(eventName, handler);

        if (element === document) {
          if (element.tuik && element.tuik[attributeName]) {
            element.tuik[attributeName] = null;
          }
        } else {
          element.removeAttribute(attributeName);
        }
      };

      EventHandlers.prototype.triggerCustom = function triggerCustom(element, eventName, params) {
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent(eventName, false, false, params);
        element.dispatchEvent(event);
      };

      return EventHandlers;
    }(),

    KEYCODES: {
      ESCAPE: 27,
      ARROW_UP: 38,
      ARROW_DOWN: 40,
      TAB: 9,
      SPACE: 32,
      RIGHT_MOUSE_BUTTON_WHICH: 3
    }
  };

  return Utils;
}();

var Dropdown = function () {
  var eventHandlers = new Utils.EventHandlers('tuikDropdown');

  var ClassNames = {
    DROPDOWN: 'tuiDropdown',
    ISOPEN: 'tuiDropdown-is-open',
    TOGGLE: 'tuiButton--dropdown',
    MENU: 'tuiDropdown__list',
    MENUITEM: 'tuiDropdown__list__item'
  };

  var Dropdown = function () {
    // TODO: NICE TO HAVE -> allow selectors by testing on element type.
    function Dropdown(element) {
      classCallCheck(this, Dropdown);

      // validating dependencies
      if (typeof Popper === 'undefined') {
        throw new Error('TUIK requires Popper.js (https://popper.js.org)');
      }

      this._element = element;
      this._menuElement = element.querySelector('.' + ClassNames.MENU);
      this._toggleElement = element.querySelector('.' + ClassNames.TOGGLE);
      this._popper = null;

      this._addEventListeners();
      return this;
    }

    /* public */

    Dropdown.prototype.toggle = function toggle() {
      if (this._toggleElement.getAttribute('disabled') || this._toggleElement.getAttribute('disabled') === '') {
        return;
      }

      var isOpening = !this._element.classList.contains(ClassNames.ISOPEN);

      if (isOpening) {
        Dropdown.closeAllOpenDropdowns();

        this._bindHandlers();
        this._popper = new Popper(this._element, this._menuElement, {
          placement: 'bottom-start',
          modifiers: {
            flip: {
              enabled: true
            }
          }
        });
        this._element.classList.add(ClassNames.ISOPEN);
        this._toggleElement.focus();
      } else {
        Dropdown.close(this._element);
      }
    };

    /* static */

    Dropdown.close = function close(dropdownElement) {
      dropdownElement.classList.remove(ClassNames.ISOPEN);

      if (eventHandlers.isBound(dropdownElement, 'tuikDropdownClose', 'handlers')) {
        // console.log('bound');
        eventHandlers.triggerCustom(dropdownElement, 'tuikDropdownClose');
      }
    };

    Dropdown.closeAllOpenDropdowns = function closeAllOpenDropdowns() {
      var dropdownElements = document.querySelectorAll('.' + ClassNames.ISOPEN);

      // <ie11>
      // dropdownElements.forEach(function(dropdownElement) {
      //     Dropdown.close(dropdownElement);
      // });
      for (var i = 0, len = dropdownElements.length; i < len; i += 1) {
        Dropdown.close(dropdownElements[i]);
      }
      // </ie11>
    };

    Dropdown.handleClose = function handleClose(e) {
      if (!e) {
        return;
      }

      var dropdownElement = e.currentTarget;
      var dropdownToggleElement = e.currentTarget.querySelector('.' + ClassNames.TOGGLE);
      var dropdownMenuElement = e.currentTarget.querySelector('.' + ClassNames.MENU);

      eventHandlers.remove(dropdownElement, 'tuikDropdownClose', Dropdown.handleClose, 'handlers');
      eventHandlers.remove(dropdownToggleElement, 'keydown', Dropdown.handleKeydown, 'handlers');
      eventHandlers.remove(dropdownMenuElement, 'keydown', Dropdown.handleKeydown, 'handlers');
      eventHandlers.remove(dropdownMenuElement, 'click', Dropdown.handleClick, 'handlers');
      eventHandlers.remove(document, 'click', Dropdown.handleDocumentAction, 'handlers');
      eventHandlers.remove(document, 'keydown', Dropdown.handleDocumentAction, 'handlers');
    };

    Dropdown.handleDocumentAction = function handleDocumentAction(e) {
      if (!e) {
        return;
      }

      // do not close if Right mouse click or Tab
      if (e && (e.which === Utils.KEYCODES.RIGHT_MOUSE_BUTTON_WHICH || e.type === 'keydown' && e.which === Utils.KEYCODES.TAB)) {
        return;
      }

      Dropdown.closeAllOpenDropdowns();
    };

    Dropdown.handleClick = function handleClick(e) {
      var calledFromMenuItem = e.target.classList.contains(ClassNames.MENUITEM);
      var calledFromDisabledMenuItem = e.target.getAttribute('disabled');

      if (!calledFromMenuItem || calledFromDisabledMenuItem) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    Dropdown.handleKeydown = function handleKeydown(e) {
      if (!e) {
        return;
      }

      var handleKeyRegExp = new RegExp(Utils.KEYCODES.ARROW_UP + '|' + Utils.KEYCODES.ARROW_DOWN + '|' + Utils.KEYCODES.ESCAPE);

      if (!handleKeyRegExp.test(e.which)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      var dropdownElement = e.currentTarget.parentNode;

      if (e.which === Utils.KEYCODES.ESCAPE) {
        Dropdown.close(dropdownElement);
        dropdownElement.querySelector('.' + ClassNames.TOGGLE).focus();
        return;
      }

      if (e.which === Utils.KEYCODES.ARROW_DOWN || e.which === Utils.KEYCODES.ARROW_UP) {
        var currentlyFocusedElement = document.activeElement;

        // underlying elements might get focus (e.g.: checkboxes)
        if (!currentlyFocusedElement.classList.contains(ClassNames.MENUITEM)) {
          currentlyFocusedElement = currentlyFocusedElement.parentNode;
        }

        var selectables = dropdownElement.querySelectorAll('.' + ClassNames.MENUITEM + ':not([disabled])');
        if (!selectables.length) {
          return;
        }

        var selectableElements = Object.keys(selectables).map(function (key) {
          return selectables[key];
        });

        var index = selectableElements.indexOf(currentlyFocusedElement);
        if (e.which === Utils.KEYCODES.ARROW_UP && index > 0) {
          // up
          index--;
        }

        if (e.which === Utils.KEYCODES.ARROW_DOWN && index < selectableElements.length - 1) {
          // down
          index++;
        }

        if (index < 0) {
          index = 0;
        }

        selectableElements[index].focus();
      }
    };

    /* private */

    Dropdown.prototype._bindHandlers = function _bindHandlers() {
      eventHandlers.add(this._element, 'tuikDropdownClose', Dropdown.handleClose, 'handlers');
      eventHandlers.add(this._toggleElement, 'keydown', Dropdown.handleKeydown, 'handlers');
      eventHandlers.add(this._menuElement, 'keydown', Dropdown.handleKeydown, 'handlers');
      eventHandlers.add(this._menuElement, 'click', Dropdown.handleClick, 'handlers');
      eventHandlers.add(document, 'click', Dropdown.handleDocumentAction, 'handlers');
      eventHandlers.add(document, 'keydown', Dropdown.handleDocumentAction, 'handlers');
    };

    Dropdown.prototype._addEventListeners = function _addEventListeners() {
      if (!this._toggleElement) {
        return;
      }

      var self = this;

      eventHandlers.add(this._toggleElement, 'click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        self.toggle();
      });

      eventHandlers.add(this._toggleElement, 'keydown', function (e) {
        if (e && e.which === Utils.KEYCODES.ARROW_DOWN) {
          if (!e.currentTarget.parentNode.classList.contains(ClassNames.ISOPEN)) {
            e.preventDefault();
            e.stopPropagation();

            self.toggle();
          }
        }
      });
    };

    return Dropdown;
  }();

  return Dropdown;
}(Popper);

exports.Dropdown = Dropdown;
exports.Utils = Utils;

Object.defineProperty(exports, '__esModule', { value: true });

})));
