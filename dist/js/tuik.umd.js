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
        DOM: {
            hasParentWithClass: function hasParentWithClass(childNode, parentClass) {
                if (!parentClass || !childNode) {
                    return false;
                }

                var node = childNode;
                var maxSearch = 50;

                while (node !== null && maxSearch) {
                    if (node.classList && node.classList.contains(parentClass)) {
                        return true;
                    }
                    node = node.parentNode;
                    maxSearch--;
                }

                return false;
            }
        },

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
            CTRL: 17,
            CMD_LEFT: 91,
            CMD_RIGHT: 93,
            CMD_FIREFOX: 224,
            CMD_OPERA: 17,
            SPACE: 32,
            RIGHT_MOUSE_BUTTON_WHICH: 3
        }
    };

    return Utils;
}();

var Dropdown = function () {
    var eventHandlers = new Utils.EventHandlers('tuiDropdown');

    var ClassNames = {
        DROPDOWN: 'tuiDropdown',
        ISOPEN: 'tuiDropdown-is-open',
        TOGGLE: 'tuiButton--dropdown',
        MENU: 'tuiDropdown__list',
        MENUITEM: 'tuiDropdown__list__item',
        MENUITEMSILENT: 'tuiDropdown__list__item--silent',
        MENUITEMHEADER: 'tuiDropdown__list__header',
        MENUITEMDIVIDER: 'tuiDropdown__list__divider'
    };

    var defaultOptions = {
        placement: 'bottom-start',
        onOpened: null,
        onClosed: null,
        popper: {
            modifiers: {
                flip: {
                    enabled: true
                }
            }
        }
    };

    var Dropdown = function () {
        // TODO: NICE TO HAVE -> allow selectors by testing on element type.
        function Dropdown(element, options) {
            classCallCheck(this, Dropdown);

            // validating dependencies
            if (typeof Popper === 'undefined') {
                throw new Error('TUIK requires Popper.js (https://popper.js.org)');
            }

            this._element = element;
            this._menuElement = element.querySelector('.' + ClassNames.MENU);
            this._toggleElement = element.querySelector('.' + ClassNames.TOGGLE);
            this._popper = null;
            this._options = Object.assign({}, defaultOptions, options);

            // keeping refs
            this._element.onOpened = this._options.onOpened;
            this._element.onClosed = this._options.onClosed;

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
                    placement: this._options.placement,
                    modifiers: this._options.popper.modifiers
                });

                this._element.classList.add(ClassNames.ISOPEN);
                this._toggleElement.focus();

                if (this._element.onOpened) {
                    this._element.onOpened.call();
                }
            } else {
                Dropdown.close(this._element);
            }
        };

        /* static */

        Dropdown.close = function close(dropdownElement) {
            dropdownElement.classList.remove(ClassNames.ISOPEN);

            if (eventHandlers.isBound(dropdownElement, 'tuikDropdownClose', 'handlers')) {
                eventHandlers.triggerCustom(dropdownElement, 'tuikDropdownClose');
            }

            if (dropdownElement.onClosed) {
                dropdownElement.onClosed.call();
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
            eventHandlers.remove(document, 'click', Dropdown.handleDocumentAction, 'handlers');
            eventHandlers.remove(document, 'keydown', Dropdown.handleDocumentAction, 'handlers');
        };

        Dropdown.handleDocumentAction = function handleDocumentAction(e) {
            if (!e) {
                return;
            }

            // do not close if Right mouse click, Tab, Apple Command or CTRL
            var handleKeyRegExp = new RegExp(Utils.KEYCODES.TAB + '|' + Utils.KEYCODES.CMD_LEFT + '|' + Utils.KEYCODES.CMD_RIGHT + '|' + Utils.KEYCODES.CMD_FIREFOX + '|' + Utils.KEYCODES.CMD_OPERA + '|' + Utils.KEYCODES.CTRL);

            if (e.which === Utils.KEYCODES.RIGHT_MOUSE_BUTTON_WHICH || e.type === 'keydown' && handleKeyRegExp.test(e.which)) {
                return;
            }

            var element = e.target;
            if (element.getAttribute && (element.getAttribute('type') === 'radio' || element.getAttribute('type') === 'checkbox')) {
                element = element.parentElement;
            }

            if (e.type !== 'keydown' && Utils.DOM.hasParentWithClass(element, ClassNames.DROPDOWN)) {
                var calledFromKnownUnselectableMenuItem = element.classList.contains(ClassNames.MENUITEMHEADER) || element.classList.contains(ClassNames.MENUITEMDIVIDER) || element.classList.contains(ClassNames.MENUITEMSILENT);
                var calledFromDisabledMenuItem = element.getAttribute('disabled');

                if (calledFromKnownUnselectableMenuItem || calledFromDisabledMenuItem) {
                    return;
                }
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

var Polyfills = function () {
  // OBJECT ASSIGN
  if (typeof Object.assign != 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
      value: function assign(target, varArgs) {
        // .length of function is 2
        'use strict';

        if (target == null) {
          // TypeError if undefined or null
          throw new TypeError('Cannot convert undefined or null to object');
        }

        var to = Object(target);

        for (var index = 1; index < arguments.length; index++) {
          var nextSource = arguments[index];

          if (nextSource != null) {
            // Skip over if undefined or null
            for (var nextKey in nextSource) {
              // Avoid bugs when hasOwnProperty is shadowed
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }
        return to;
      },
      writable: true,
      configurable: true
    });
  }
}();

var Popover = function () {
    var eventHandlers = new Utils.EventHandlers('tuiPopover');

    var ClassNames = {
        POPOVER: 'tuiPopover',
        ISOPEN: 'tuiPopover-is-visible',
        PLACEMENTLEFT: 'tuiPopover--left',
        PLACEMENTRIGHT: 'tuiPopover--right',
        PLACEMENTTOP: 'tuiPopover--top',
        PLACEMENTBOTTOM: 'tuiPopover--bottom'
    };

    var defaultOptions = {
        placement: 'bottom',
        closeOnRoot: true,
        trigger: 'click',
        onClosed: null,
        popper: {
            modifiers: {
                flip: {
                    enabled: true
                }
            }
        }
    };

    var Popover = function () {
        // TODO: NICE TO HAVE -> allow selectors by testing on element type.
        function Popover(targetElement, popoverElement, options) {
            classCallCheck(this, Popover);

            // validating dependencies
            if (typeof Popper === 'undefined') {
                throw new Error('TUIK requires Popper.js (https://popper.js.org)');
            }

            this._popper = null;
            this._targetElement = targetElement;
            this._popoverElement = popoverElement;
            this._options = Object.assign({}, defaultOptions, options);

            // keeping refs
            this._targetElement.tuiRefPopoverElement = popoverElement;
            this._popoverElement.tuiRefTargetElement = targetElement;
            this._popoverElement.onClosed = this._options.onClosed;

            // to allow keydown listener to be added on the popover element
            this._popoverElement.setAttribute('tabindex', '1');

            this._addEventListeners();

            return this;
        }

        /* public */

        Popover.prototype.toggle = function toggle() {
            var _this = this;

            if (this._targetElement.getAttribute('disabled') || this._targetElement.getAttribute('disabled') === '') {
                return;
            }

            var onPopperUpdate = function onPopperUpdate(data) {
                Popover.place(data.instance.popper, data.placement);
            };

            var initializePopper = function initializePopper() {
                Popover.place(_this._popoverElement, _this._options.placement);

                _this._popper = new Popper(_this._targetElement, _this._popoverElement, {
                    placement: _this._options.placement,
                    modifiers: _this._options.popper.modifiers,
                    onUpdate: onPopperUpdate,
                    onCreate: onPopperUpdate
                });

                _this._targetElement.tuiRefPopoverElement = _this._popoverElement;
                _this._popoverElement.tuiRefTargetElement = _this._targetElement;
            };

            var isOpen = this._popoverElement.classList.contains(ClassNames.ISOPEN);

            if (isOpen) {
                if (this._popoverElement.tuiRefTargetElement === this._targetElement) {
                    Popover.close(this._popoverElement);
                } else {
                    initializePopper();
                }
            } else {
                Popover.closeAllOpenPopovers();
                initializePopper();

                this._bindHandlers();
                this._popoverElement.classList.add(ClassNames.ISOPEN);
            }
        };

        Popover.prototype.close = function close() {
            this._popoverElement.tuiRefTargetElement.focus();
            Popover.close(this._popoverElement);
        };

        /* static */


        Popover.close = function close(popoverElement) {
            popoverElement.classList.remove(ClassNames.ISOPEN);

            if (eventHandlers.isBound(popoverElement, 'tuikPopoverClose', 'handlers')) {
                eventHandlers.triggerCustom(popoverElement, 'tuikPopoverClose');
            }

            if (popoverElement.onClosed) {
                popoverElement.onClosed.call();
            }
        };

        // DUPE - SEE DROPDOWN


        Popover.handleDocumentAction = function handleDocumentAction(e) {
            if (!e) {
                return;
            }

            // do not close if Right mouse click or Tab
            if (e && (e.which === Utils.KEYCODES.RIGHT_MOUSE_BUTTON_WHICH || e.type === 'keydown' && e.which === Utils.KEYCODES.TAB)) {
                return;
            }

            if (e.type !== 'keydown' && Utils.DOM.hasParentWithClass(e.target, ClassNames.POPOVER)) {
                return;
            }

            Popover.closeAllOpenPopovers();
        };

        Popover.handleClose = function handleClose(e) {
            if (!e) {
                return;
            }

            var popoverElement = e.currentTarget;

            eventHandlers.remove(popoverElement, 'tuikPopoverClose', Popover.handleClose, 'handlers');

            eventHandlers.remove(popoverElement, 'keydown', Popover.handleKeydown, 'handlers');
            eventHandlers.remove(popoverElement.tuiRefTargetElement, 'keydown', Popover.handleKeydown, 'handlers');
            eventHandlers.remove(document, 'click', Popover.handleDocumentAction, 'handlers');
            eventHandlers.remove(document, 'keydown', Popover.handleDocumentAction, 'handlers');
        };

        Popover.handleKeydown = function handleKeydown(e) {
            if (!e) {
                return;
            }

            if (e.which === Utils.KEYCODES.ESCAPE) {
                var element = e.currentTarget;

                if (element.classList.contains('tuiPopover')) {
                    element.tuiRefTargetElement.focus();
                } else {
                    element.focus();
                }

                Popover.closeAllOpenPopovers();
                return;
            }

            e.stopPropagation();
        };

        Popover.closeAllOpenPopovers = function closeAllOpenPopovers() {
            var popoverElements = document.querySelectorAll('.' + ClassNames.ISOPEN);

            for (var i = 0, len = popoverElements.length; i < len; i++) {
                Popover.close(popoverElements[i]);
            }
        };

        Popover.place = function place(popoverElement, placement) {
            popoverElement.classList.remove(ClassNames.PLACEMENTLEFT);
            popoverElement.classList.remove(ClassNames.PLACEMENTRIGHT);
            popoverElement.classList.remove(ClassNames.PLACEMENTTOP);
            popoverElement.classList.remove(ClassNames.PLACEMENTBOTTOM);

            switch (placement) {
                case 'left':
                    popoverElement.classList.add(ClassNames.PLACEMENTLEFT);
                    break;
                case 'right':
                    popoverElement.classList.add(ClassNames.PLACEMENTRIGHT);
                    break;
                case 'top':
                    popoverElement.classList.add(ClassNames.PLACEMENTTOP);
                    break;
                default:
                    popoverElement.classList.add(ClassNames.PLACEMENTBOTTOM);
            }
        };

        /* private */

        Popover.prototype._bindHandlers = function _bindHandlers() {
            eventHandlers.add(this._popoverElement, 'tuikPopoverClose', Popover.handleClose, 'handlers');
            eventHandlers.add(this._popoverElement, 'keydown', Popover.handleKeydown, 'handlers');
            eventHandlers.add(this._targetElement, 'keydown', Popover.handleKeydown, 'handlers');

            if (this._options.closeOnRoot) {
                eventHandlers.add(document, 'click', Popover.handleDocumentAction, 'handlers');
                eventHandlers.add(document, 'keydown', Popover.handleDocumentAction, 'handlers');
            }
        };

        Popover.prototype._addEventListeners = function _addEventListeners() {
            if (!this._targetElement || !this._popoverElement) {
                return;
            }
            var self = this;

            eventHandlers.add(this._targetElement, 'click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                self.toggle();
            });
        };

        return Popover;
    }(); // class

    return Popover;
}(Popper);

var Tab = function () {
    var eventHandlers = new Utils.EventHandlers('tuiTab');
    var DATA_ATTR_TARGET = 'data-tui-tab-target';
    var classNames = {
        ACTIVE_TAB_LINK: 'tuiTabs__item__link-is-active',
        TAB_CONTENT_PANEL: 'tuiTabsContent__panel',
        HIDDEN_TAB_CONTENT_PANEL: 'tuiTabsContent__panel--hidden'
    };

    var Tab = function () {
        // TODO: NICE TO HAVE -> allow selectors by testing on element type.
        function Tab(tabsElement, tabsContentElement) {
            classCallCheck(this, Tab);

            this._tabsElement = tabsElement;
            this._tabsContentElement = tabsContentElement;
            this._tabs = this._getTabs();

            this._initialize();

            return this;
        }

        /* public */
        /* static */

        Tab.handleTabClick = function handleTabClick(e) {
            if (!e) {
                return;
            }

            e.preventDefault();
            e.currentTarget.showTabContent();
        };

        /* private */

        Tab.prototype._getTabs = function _getTabs() {
            var tabs = [];
            var linkElements = this._tabsElement.querySelectorAll('.tuiTabs__item__link');

            var tabContentId = void 0;
            var contentElement = void 0;
            var linkElement = void 0;

            // <ie11>
            // linkElements.forEach(linkElement => {
            //     tabContentId = this._getTabContentId(linkElement);
            //     if (!tabContentId) {
            //         return;
            //     }
            //
            //     contentElement = this._tabsContentElement.querySelector(`#${tabContentId}`);
            //     if (!contentElement) {
            //         return;
            //     }
            //
            //     tabs.push({
            //         contentId: tabContentId,
            //         linkElement,
            //         contentElement,
            //     });
            // });

            for (var i = 0, len = linkElements.length; i < len; i += 1) {
                linkElement = linkElements[i];

                tabContentId = this._getTabContentId(linkElement);
                if (!tabContentId) {
                    continue;
                }

                contentElement = this._tabsContentElement.querySelector('#' + tabContentId);
                if (!contentElement) {
                    continue;
                }

                tabs.push({
                    contentId: tabContentId,
                    linkElement: linkElement,
                    contentElement: contentElement
                });
            }
            // </ie11>

            return tabs;
        };

        Tab.prototype._getTabContentId = function _getTabContentId(tabElement) {
            var id = null;

            if (tabElement.getAttribute('href')) {
                id = tabElement.getAttribute('href');
            } else if (tabElement.getAttribute(DATA_ATTR_TARGET)) {
                id = tabElement.getAttribute(DATA_ATTR_TARGET);
            }

            if (id && id[0] === '#') {
                id = id.substring(1);
            }

            return id;
        };

        Tab.prototype._updateTabState = function _updateTabState(tab, clicked) {
            var isActive = tab.linkElement.classList.contains(classNames.ACTIVE_TAB_LINK);

            if (isActive || clicked) {
                tab.linkElement.classList.add(classNames.ACTIVE_TAB_LINK);
                tab.contentElement.classList.remove(classNames.HIDDEN_TAB_CONTENT_PANEL);
            } else {
                tab.linkElement.classList.remove(classNames.ACTIVE_TAB_LINK);
                tab.contentElement.classList.add(classNames.HIDDEN_TAB_CONTENT_PANEL);
            }

            return isActive;
        };

        Tab.prototype._initialize = function _initialize() {
            var _this = this;

            var oneActive = false;

            this._tabs.forEach(function (tab) {
                if (_this._updateTabState(tab)) {
                    oneActive = true;
                }
                _this._injectTabHandler(tab);
                _this._addEventListener(tab);
            });

            if (!oneActive) {
                this._tabs[0].showTabContent();
            }
        };

        Tab.prototype._injectTabHandler = function _injectTabHandler(tab) {
            var self = this;

            var showTabContent = function showTabContent() {
                var activeTab = self._tabsElement.querySelector('.' + classNames.ACTIVE_TAB_LINK);
                if (activeTab) {
                    activeTab.classList.remove(classNames.ACTIVE_TAB_LINK);
                }

                var visibleContent = self._tabsContentElement.querySelector('.' + classNames.TAB_CONTENT_PANEL + ':not(.' + classNames.HIDDEN_TAB_CONTENT_PANEL + ')');
                if (visibleContent) {
                    visibleContent.classList.add(classNames.HIDDEN_TAB_CONTENT_PANEL);
                }

                self._updateTabState(tab, true);
            };

            tab.showTabContent = showTabContent;
            tab.linkElement.showTabContent = showTabContent;
        };

        Tab.prototype._addEventListener = function _addEventListener(tab) {
            eventHandlers.add(tab.linkElement, 'click', Tab.handleTabClick, 'handlers');
        };

        return Tab;
    }();

    return Tab;
}();

exports.Polyfills = Polyfills;
exports.Utils = Utils;
exports.Dropdown = Dropdown;
exports.Tab = Tab;
exports.Popover = Popover;

Object.defineProperty(exports, '__esModule', { value: true });

})));
