/*!
 * TUIK v0.11.0 (http://ui-kit.tempo.io)
 * Copyright 2017 Tempo ehf.
 */
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Utils = function () {
  var Utils = {
    Events: {
      triggerCustom: function triggerCustom(element, eventName, params) {
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent(eventName, false, false, params);
        element.dispatchEvent(event);
      }
    },

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

/* global Popper */

var Dropdown = function () {
  var ClassNames = {
    DROPDOWN: 'tuiDropdown',
    ISOPEN: 'tuiDropdown-is-open',
    TOGGLE: 'tuiButton--dropdown',
    MENU: 'tuiDropdown__list',
    MENUITEM: 'tuiDropdown__list__item',
    DISABLEDMENUITEM: 'tuiDropdown__list__item-is-disabled'
  };

  var Dropdown = function () {
    // TODO: NICE TO HAVE -> allow selectors by testing on element type.
    function Dropdown(element) {
      _classCallCheck(this, Dropdown);

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

      if (dropdownElement.tuikDropdownCloseBinded) {
        Utils.Events.triggerCustom(dropdownElement, 'tuikDropdownClose');
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

      dropdownElement.tuikDropdownCloseBinded = false;
      dropdownElement.removeEventListener('tuikDropdownClose', Dropdown.handleClose);
      dropdownToggleElement.removeEventListener('keydown', Dropdown.handleKeydown);
      dropdownMenuElement.removeEventListener('keydown', Dropdown.handleKeydown);
      document.removeEventListener('click', Dropdown.handleDocumentAction);
      document.removeEventListener('keyup', Dropdown.handleDocumentAction);
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
        return;
      }

      if (e.which === Utils.KEYCODES.ARROW_DOWN || e.which === Utils.KEYCODES.ARROW_UP) {
        var currentlyFocusedElement = document.activeElement;

        // underlying elements might get focus (e.g.: checkboxes)
        if (!currentlyFocusedElement.classList.contains(ClassNames.MENUITEM)) {
          currentlyFocusedElement = currentlyFocusedElement.parentNode;
        }

        var selectables = dropdownElement.querySelectorAll('.' + ClassNames.MENUITEM + ':not(.' + ClassNames.DISABLEDMENUITEM + '):not([disabled])');
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
      this._element.tuikDropdownCloseBinded = true;
      this._element.addEventListener('tuikDropdownClose', Dropdown.handleClose);

      this._toggleElement.addEventListener('keydown', Dropdown.handleKeydown);
      this._menuElement.addEventListener('keydown', Dropdown.handleKeydown);
      document.addEventListener('click', Dropdown.handleDocumentAction);
      document.addEventListener('keydown', Dropdown.handleDocumentAction);
    };

    Dropdown.prototype._addEventListeners = function _addEventListeners() {
      if (!this._toggleElement) {
        return;
      }
      var self = this;

      this._toggleElement.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        self.toggle();
      });

      this._toggleElement.addEventListener('keydown', function (e) {
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
}();

