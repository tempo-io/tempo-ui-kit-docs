/*!
  * TUIK (http://ui-kit.tempo.io)
  * Copyright 2018 Tempo ehf.
  */
 
var tuik = (function (exports) {
'use strict';

/**!
 * @fileOverview Kickass library to create and place poppers near their reference elements.
 * @version 1.14.3
 * @license
 * Copyright (c) 2016 Federico Zivolo and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

var longerTimeoutBrowsers = ['Edge', 'Trident', 'Firefox'];
var timeoutDuration = 0;
for (var i = 0; i < longerTimeoutBrowsers.length; i += 1) {
  if (isBrowser && navigator.userAgent.indexOf(longerTimeoutBrowsers[i]) >= 0) {
    timeoutDuration = 1;
    break;
  }
}

function microtaskDebounce(fn) {
  var called = false;
  return function () {
    if (called) {
      return;
    }
    called = true;
    window.Promise.resolve().then(function () {
      called = false;
      fn();
    });
  };
}

function taskDebounce(fn) {
  var scheduled = false;
  return function () {
    if (!scheduled) {
      scheduled = true;
      setTimeout(function () {
        scheduled = false;
        fn();
      }, timeoutDuration);
    }
  };
}

var supportsMicroTasks = isBrowser && window.Promise;

/**
* Create a debounced version of a method, that's asynchronously deferred
* but called in the minimum time possible.
*
* @method
* @memberof Popper.Utils
* @argument {Function} fn
* @returns {Function}
*/
var debounce = supportsMicroTasks ? microtaskDebounce : taskDebounce;

/**
 * Check if the given variable is a function
 * @method
 * @memberof Popper.Utils
 * @argument {Any} functionToCheck - variable to check
 * @returns {Boolean} answer to: is a function?
 */
function isFunction(functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

/**
 * Get CSS computed property of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Eement} element
 * @argument {String} property
 */
function getStyleComputedProperty(element, property) {
  if (element.nodeType !== 1) {
    return [];
  }
  // NOTE: 1 DOM access here
  var css = getComputedStyle(element, null);
  return property ? css[property] : css;
}

/**
 * Returns the parentNode or the host of the element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} parent
 */
function getParentNode(element) {
  if (element.nodeName === 'HTML') {
    return element;
  }
  return element.parentNode || element.host;
}

/**
 * Returns the scrolling parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} scroll parent
 */
function getScrollParent(element) {
  // Return body, `getScroll` will take care to get the correct `scrollTop` from it
  if (!element) {
    return document.body;
  }

  switch (element.nodeName) {
    case 'HTML':
    case 'BODY':
      return element.ownerDocument.body;
    case '#document':
      return element.body;
  }

  // Firefox want us to check `-x` and `-y` variations as well

  var _getStyleComputedProp = getStyleComputedProperty(element),
      overflow = _getStyleComputedProp.overflow,
      overflowX = _getStyleComputedProp.overflowX,
      overflowY = _getStyleComputedProp.overflowY;

  if (/(auto|scroll|overlay)/.test(overflow + overflowY + overflowX)) {
    return element;
  }

  return getScrollParent(getParentNode(element));
}

var isIE11 = isBrowser && !!(window.MSInputMethodContext && document.documentMode);
var isIE10 = isBrowser && /MSIE 10/.test(navigator.userAgent);

/**
 * Determines if the browser is Internet Explorer
 * @method
 * @memberof Popper.Utils
 * @param {Number} version to check
 * @returns {Boolean} isIE
 */
function isIE(version) {
  if (version === 11) {
    return isIE11;
  }
  if (version === 10) {
    return isIE10;
  }
  return isIE11 || isIE10;
}

/**
 * Returns the offset parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} offset parent
 */
function getOffsetParent(element) {
  if (!element) {
    return document.documentElement;
  }

  var noOffsetParent = isIE(10) ? document.body : null;

  // NOTE: 1 DOM access here
  var offsetParent = element.offsetParent;
  // Skip hidden elements which don't have an offsetParent
  while (offsetParent === noOffsetParent && element.nextElementSibling) {
    offsetParent = (element = element.nextElementSibling).offsetParent;
  }

  var nodeName = offsetParent && offsetParent.nodeName;

  if (!nodeName || nodeName === 'BODY' || nodeName === 'HTML') {
    return element ? element.ownerDocument.documentElement : document.documentElement;
  }

  // .offsetParent will return the closest TD or TABLE in case
  // no offsetParent is present, I hate this job...
  if (['TD', 'TABLE'].indexOf(offsetParent.nodeName) !== -1 && getStyleComputedProperty(offsetParent, 'position') === 'static') {
    return getOffsetParent(offsetParent);
  }

  return offsetParent;
}

function isOffsetContainer(element) {
  var nodeName = element.nodeName;

  if (nodeName === 'BODY') {
    return false;
  }
  return nodeName === 'HTML' || getOffsetParent(element.firstElementChild) === element;
}

/**
 * Finds the root node (document, shadowDOM root) of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} node
 * @returns {Element} root node
 */
function getRoot(node) {
  if (node.parentNode !== null) {
    return getRoot(node.parentNode);
  }

  return node;
}

/**
 * Finds the offset parent common to the two provided nodes
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element1
 * @argument {Element} element2
 * @returns {Element} common offset parent
 */
function findCommonOffsetParent(element1, element2) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element1 || !element1.nodeType || !element2 || !element2.nodeType) {
    return document.documentElement;
  }

  // Here we make sure to give as "start" the element that comes first in the DOM
  var order = element1.compareDocumentPosition(element2) & Node.DOCUMENT_POSITION_FOLLOWING;
  var start = order ? element1 : element2;
  var end = order ? element2 : element1;

  // Get common ancestor container
  var range = document.createRange();
  range.setStart(start, 0);
  range.setEnd(end, 0);
  var commonAncestorContainer = range.commonAncestorContainer;

  // Both nodes are inside #document

  if (element1 !== commonAncestorContainer && element2 !== commonAncestorContainer || start.contains(end)) {
    if (isOffsetContainer(commonAncestorContainer)) {
      return commonAncestorContainer;
    }

    return getOffsetParent(commonAncestorContainer);
  }

  // one of the nodes is inside shadowDOM, find which one
  var element1root = getRoot(element1);
  if (element1root.host) {
    return findCommonOffsetParent(element1root.host, element2);
  } else {
    return findCommonOffsetParent(element1, getRoot(element2).host);
  }
}

/**
 * Gets the scroll value of the given element in the given side (top and left)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {String} side `top` or `left`
 * @returns {number} amount of scrolled pixels
 */
function getScroll(element) {
  var side = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'top';

  var upperSide = side === 'top' ? 'scrollTop' : 'scrollLeft';
  var nodeName = element.nodeName;

  if (nodeName === 'BODY' || nodeName === 'HTML') {
    var html = element.ownerDocument.documentElement;
    var scrollingElement = element.ownerDocument.scrollingElement || html;
    return scrollingElement[upperSide];
  }

  return element[upperSide];
}

/*
 * Sum or subtract the element scroll values (left and top) from a given rect object
 * @method
 * @memberof Popper.Utils
 * @param {Object} rect - Rect object you want to change
 * @param {HTMLElement} element - The element from the function reads the scroll values
 * @param {Boolean} subtract - set to true if you want to subtract the scroll values
 * @return {Object} rect - The modifier rect object
 */
function includeScroll(rect, element) {
  var subtract = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var scrollTop = getScroll(element, 'top');
  var scrollLeft = getScroll(element, 'left');
  var modifier = subtract ? -1 : 1;
  rect.top += scrollTop * modifier;
  rect.bottom += scrollTop * modifier;
  rect.left += scrollLeft * modifier;
  rect.right += scrollLeft * modifier;
  return rect;
}

/*
 * Helper to detect borders of a given element
 * @method
 * @memberof Popper.Utils
 * @param {CSSStyleDeclaration} styles
 * Result of `getStyleComputedProperty` on the given element
 * @param {String} axis - `x` or `y`
 * @return {number} borders - The borders size of the given axis
 */

function getBordersSize(styles, axis) {
  var sideA = axis === 'x' ? 'Left' : 'Top';
  var sideB = sideA === 'Left' ? 'Right' : 'Bottom';

  return parseFloat(styles['border' + sideA + 'Width'], 10) + parseFloat(styles['border' + sideB + 'Width'], 10);
}

function getSize(axis, body, html, computedStyle) {
  return Math.max(body['offset' + axis], body['scroll' + axis], html['client' + axis], html['offset' + axis], html['scroll' + axis], isIE(10) ? html['offset' + axis] + computedStyle['margin' + (axis === 'Height' ? 'Top' : 'Left')] + computedStyle['margin' + (axis === 'Height' ? 'Bottom' : 'Right')] : 0);
}

function getWindowSizes() {
  var body = document.body;
  var html = document.documentElement;
  var computedStyle = isIE(10) && getComputedStyle(html);

  return {
    height: getSize('Height', body, html, computedStyle),
    width: getSize('Width', body, html, computedStyle)
  };
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();





var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

var _extends$1 = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

/**
 * Given element offsets, generate an output similar to getBoundingClientRect
 * @method
 * @memberof Popper.Utils
 * @argument {Object} offsets
 * @returns {Object} ClientRect like output
 */
function getClientRect(offsets) {
  return _extends$1({}, offsets, {
    right: offsets.left + offsets.width,
    bottom: offsets.top + offsets.height
  });
}

/**
 * Get bounding client rect of given element
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} element
 * @return {Object} client rect
 */
function getBoundingClientRect(element) {
  var rect = {};

  // IE10 10 FIX: Please, don't ask, the element isn't
  // considered in DOM in some circumstances...
  // This isn't reproducible in IE10 compatibility mode of IE11
  try {
    if (isIE(10)) {
      rect = element.getBoundingClientRect();
      var scrollTop = getScroll(element, 'top');
      var scrollLeft = getScroll(element, 'left');
      rect.top += scrollTop;
      rect.left += scrollLeft;
      rect.bottom += scrollTop;
      rect.right += scrollLeft;
    } else {
      rect = element.getBoundingClientRect();
    }
  } catch (e) {}

  var result = {
    left: rect.left,
    top: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top
  };

  // subtract scrollbar size from sizes
  var sizes = element.nodeName === 'HTML' ? getWindowSizes() : {};
  var width = sizes.width || element.clientWidth || result.right - result.left;
  var height = sizes.height || element.clientHeight || result.bottom - result.top;

  var horizScrollbar = element.offsetWidth - width;
  var vertScrollbar = element.offsetHeight - height;

  // if an hypothetical scrollbar is detected, we must be sure it's not a `border`
  // we make this check conditional for performance reasons
  if (horizScrollbar || vertScrollbar) {
    var styles = getStyleComputedProperty(element);
    horizScrollbar -= getBordersSize(styles, 'x');
    vertScrollbar -= getBordersSize(styles, 'y');

    result.width -= horizScrollbar;
    result.height -= vertScrollbar;
  }

  return getClientRect(result);
}

function getOffsetRectRelativeToArbitraryNode(children, parent) {
  var fixedPosition = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var isIE10 = isIE(10);
  var isHTML = parent.nodeName === 'HTML';
  var childrenRect = getBoundingClientRect(children);
  var parentRect = getBoundingClientRect(parent);
  var scrollParent = getScrollParent(children);

  var styles = getStyleComputedProperty(parent);
  var borderTopWidth = parseFloat(styles.borderTopWidth, 10);
  var borderLeftWidth = parseFloat(styles.borderLeftWidth, 10);

  // In cases where the parent is fixed, we must ignore negative scroll in offset calc
  if (fixedPosition && parent.nodeName === 'HTML') {
    parentRect.top = Math.max(parentRect.top, 0);
    parentRect.left = Math.max(parentRect.left, 0);
  }
  var offsets = getClientRect({
    top: childrenRect.top - parentRect.top - borderTopWidth,
    left: childrenRect.left - parentRect.left - borderLeftWidth,
    width: childrenRect.width,
    height: childrenRect.height
  });
  offsets.marginTop = 0;
  offsets.marginLeft = 0;

  // Subtract margins of documentElement in case it's being used as parent
  // we do this only on HTML because it's the only element that behaves
  // differently when margins are applied to it. The margins are included in
  // the box of the documentElement, in the other cases not.
  if (!isIE10 && isHTML) {
    var marginTop = parseFloat(styles.marginTop, 10);
    var marginLeft = parseFloat(styles.marginLeft, 10);

    offsets.top -= borderTopWidth - marginTop;
    offsets.bottom -= borderTopWidth - marginTop;
    offsets.left -= borderLeftWidth - marginLeft;
    offsets.right -= borderLeftWidth - marginLeft;

    // Attach marginTop and marginLeft because in some circumstances we may need them
    offsets.marginTop = marginTop;
    offsets.marginLeft = marginLeft;
  }

  if (isIE10 && !fixedPosition ? parent.contains(scrollParent) : parent === scrollParent && scrollParent.nodeName !== 'BODY') {
    offsets = includeScroll(offsets, parent);
  }

  return offsets;
}

function getViewportOffsetRectRelativeToArtbitraryNode(element) {
  var excludeScroll = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var html = element.ownerDocument.documentElement;
  var relativeOffset = getOffsetRectRelativeToArbitraryNode(element, html);
  var width = Math.max(html.clientWidth, window.innerWidth || 0);
  var height = Math.max(html.clientHeight, window.innerHeight || 0);

  var scrollTop = !excludeScroll ? getScroll(html) : 0;
  var scrollLeft = !excludeScroll ? getScroll(html, 'left') : 0;

  var offset = {
    top: scrollTop - relativeOffset.top + relativeOffset.marginTop,
    left: scrollLeft - relativeOffset.left + relativeOffset.marginLeft,
    width: width,
    height: height
  };

  return getClientRect(offset);
}

/**
 * Check if the given element is fixed or is inside a fixed parent
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {Element} customContainer
 * @returns {Boolean} answer to "isFixed?"
 */
function isFixed(element) {
  var nodeName = element.nodeName;
  if (nodeName === 'BODY' || nodeName === 'HTML') {
    return false;
  }
  if (getStyleComputedProperty(element, 'position') === 'fixed') {
    return true;
  }
  return isFixed(getParentNode(element));
}

/**
 * Finds the first parent of an element that has a transformed property defined
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} first transformed parent or documentElement
 */

function getFixedPositionOffsetParent(element) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element || !element.parentElement || isIE()) {
    return document.documentElement;
  }
  var el = element.parentElement;
  while (el && getStyleComputedProperty(el, 'transform') === 'none') {
    el = el.parentElement;
  }
  return el || document.documentElement;
}

/**
 * Computed the boundaries limits and return them
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} popper
 * @param {HTMLElement} reference
 * @param {number} padding
 * @param {HTMLElement} boundariesElement - Element used to define the boundaries
 * @param {Boolean} fixedPosition - Is in fixed position mode
 * @returns {Object} Coordinates of the boundaries
 */
function getBoundaries(popper, reference, padding, boundariesElement) {
  var fixedPosition = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

  // NOTE: 1 DOM access here

  var boundaries = { top: 0, left: 0 };
  var offsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);

  // Handle viewport case
  if (boundariesElement === 'viewport') {
    boundaries = getViewportOffsetRectRelativeToArtbitraryNode(offsetParent, fixedPosition);
  } else {
    // Handle other cases based on DOM element used as boundaries
    var boundariesNode = void 0;
    if (boundariesElement === 'scrollParent') {
      boundariesNode = getScrollParent(getParentNode(reference));
      if (boundariesNode.nodeName === 'BODY') {
        boundariesNode = popper.ownerDocument.documentElement;
      }
    } else if (boundariesElement === 'window') {
      boundariesNode = popper.ownerDocument.documentElement;
    } else {
      boundariesNode = boundariesElement;
    }

    var offsets = getOffsetRectRelativeToArbitraryNode(boundariesNode, offsetParent, fixedPosition);

    // In case of HTML, we need a different computation
    if (boundariesNode.nodeName === 'HTML' && !isFixed(offsetParent)) {
      var _getWindowSizes = getWindowSizes(),
          height = _getWindowSizes.height,
          width = _getWindowSizes.width;

      boundaries.top += offsets.top - offsets.marginTop;
      boundaries.bottom = height + offsets.top;
      boundaries.left += offsets.left - offsets.marginLeft;
      boundaries.right = width + offsets.left;
    } else {
      // for all the other DOM elements, this one is good
      boundaries = offsets;
    }
  }

  // Add paddings
  boundaries.left += padding;
  boundaries.top += padding;
  boundaries.right -= padding;
  boundaries.bottom -= padding;

  return boundaries;
}

function getArea(_ref) {
  var width = _ref.width,
      height = _ref.height;

  return width * height;
}

/**
 * Utility used to transform the `auto` placement to the placement with more
 * available space.
 * @method
 * @memberof Popper.Utils
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeAutoPlacement(placement, refRect, popper, reference, boundariesElement) {
  var padding = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;

  if (placement.indexOf('auto') === -1) {
    return placement;
  }

  var boundaries = getBoundaries(popper, reference, padding, boundariesElement);

  var rects = {
    top: {
      width: boundaries.width,
      height: refRect.top - boundaries.top
    },
    right: {
      width: boundaries.right - refRect.right,
      height: boundaries.height
    },
    bottom: {
      width: boundaries.width,
      height: boundaries.bottom - refRect.bottom
    },
    left: {
      width: refRect.left - boundaries.left,
      height: boundaries.height
    }
  };

  var sortedAreas = Object.keys(rects).map(function (key) {
    return _extends$1({
      key: key
    }, rects[key], {
      area: getArea(rects[key])
    });
  }).sort(function (a, b) {
    return b.area - a.area;
  });

  var filteredAreas = sortedAreas.filter(function (_ref2) {
    var width = _ref2.width,
        height = _ref2.height;
    return width >= popper.clientWidth && height >= popper.clientHeight;
  });

  var computedPlacement = filteredAreas.length > 0 ? filteredAreas[0].key : sortedAreas[0].key;

  var variation = placement.split('-')[1];

  return computedPlacement + (variation ? '-' + variation : '');
}

/**
 * Get offsets to the reference element
 * @method
 * @memberof Popper.Utils
 * @param {Object} state
 * @param {Element} popper - the popper element
 * @param {Element} reference - the reference element (the popper will be relative to this)
 * @param {Element} fixedPosition - is in fixed position mode
 * @returns {Object} An object containing the offsets which will be applied to the popper
 */
function getReferenceOffsets(state, popper, reference) {
  var fixedPosition = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  var commonOffsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);
  return getOffsetRectRelativeToArbitraryNode(reference, commonOffsetParent, fixedPosition);
}

/**
 * Get the outer sizes of the given element (offset size + margins)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Object} object containing width and height properties
 */
function getOuterSizes(element) {
  var styles = getComputedStyle(element);
  var x = parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);
  var y = parseFloat(styles.marginLeft) + parseFloat(styles.marginRight);
  var result = {
    width: element.offsetWidth + y,
    height: element.offsetHeight + x
  };
  return result;
}

/**
 * Get the opposite placement of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement
 * @returns {String} flipped placement
 */
function getOppositePlacement(placement) {
  var hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' };
  return placement.replace(/left|right|bottom|top/g, function (matched) {
    return hash[matched];
  });
}

/**
 * Get offsets to the popper
 * @method
 * @memberof Popper.Utils
 * @param {Object} position - CSS position the Popper will get applied
 * @param {HTMLElement} popper - the popper element
 * @param {Object} referenceOffsets - the reference offsets (the popper will be relative to this)
 * @param {String} placement - one of the valid placement options
 * @returns {Object} popperOffsets - An object containing the offsets which will be applied to the popper
 */
function getPopperOffsets(popper, referenceOffsets, placement) {
  placement = placement.split('-')[0];

  // Get popper node sizes
  var popperRect = getOuterSizes(popper);

  // Add position, width and height to our offsets object
  var popperOffsets = {
    width: popperRect.width,
    height: popperRect.height
  };

  // depending by the popper placement we have to compute its offsets slightly differently
  var isHoriz = ['right', 'left'].indexOf(placement) !== -1;
  var mainSide = isHoriz ? 'top' : 'left';
  var secondarySide = isHoriz ? 'left' : 'top';
  var measurement = isHoriz ? 'height' : 'width';
  var secondaryMeasurement = !isHoriz ? 'height' : 'width';

  popperOffsets[mainSide] = referenceOffsets[mainSide] + referenceOffsets[measurement] / 2 - popperRect[measurement] / 2;
  if (placement === secondarySide) {
    popperOffsets[secondarySide] = referenceOffsets[secondarySide] - popperRect[secondaryMeasurement];
  } else {
    popperOffsets[secondarySide] = referenceOffsets[getOppositePlacement(secondarySide)];
  }

  return popperOffsets;
}

/**
 * Mimics the `find` method of Array
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function find(arr, check) {
  // use native find if supported
  if (Array.prototype.find) {
    return arr.find(check);
  }

  // use `filter` to obtain the same behavior of `find`
  return arr.filter(check)[0];
}

/**
 * Return the index of the matching object
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function findIndex(arr, prop, value) {
  // use native findIndex if supported
  if (Array.prototype.findIndex) {
    return arr.findIndex(function (cur) {
      return cur[prop] === value;
    });
  }

  // use `find` + `indexOf` if `findIndex` isn't supported
  var match = find(arr, function (obj) {
    return obj[prop] === value;
  });
  return arr.indexOf(match);
}

/**
 * Loop trough the list of modifiers and run them in order,
 * each of them will then edit the data object.
 * @method
 * @memberof Popper.Utils
 * @param {dataObject} data
 * @param {Array} modifiers
 * @param {String} ends - Optional modifier name used as stopper
 * @returns {dataObject}
 */
function runModifiers(modifiers, data, ends) {
  var modifiersToRun = ends === undefined ? modifiers : modifiers.slice(0, findIndex(modifiers, 'name', ends));

  modifiersToRun.forEach(function (modifier) {
    if (modifier['function']) {
      // eslint-disable-line dot-notation
      console.warn('`modifier.function` is deprecated, use `modifier.fn`!');
    }
    var fn = modifier['function'] || modifier.fn; // eslint-disable-line dot-notation
    if (modifier.enabled && isFunction(fn)) {
      // Add properties to offsets to make them a complete clientRect object
      // we do this before each modifier to make sure the previous one doesn't
      // mess with these values
      data.offsets.popper = getClientRect(data.offsets.popper);
      data.offsets.reference = getClientRect(data.offsets.reference);

      data = fn(data, modifier);
    }
  });

  return data;
}

/**
 * Updates the position of the popper, computing the new offsets and applying
 * the new style.<br />
 * Prefer `scheduleUpdate` over `update` because of performance reasons.
 * @method
 * @memberof Popper
 */
function update() {
  // if popper is destroyed, don't perform any further update
  if (this.state.isDestroyed) {
    return;
  }

  var data = {
    instance: this,
    styles: {},
    arrowStyles: {},
    attributes: {},
    flipped: false,
    offsets: {}
  };

  // compute reference element offsets
  data.offsets.reference = getReferenceOffsets(this.state, this.popper, this.reference, this.options.positionFixed);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  data.placement = computeAutoPlacement(this.options.placement, data.offsets.reference, this.popper, this.reference, this.options.modifiers.flip.boundariesElement, this.options.modifiers.flip.padding);

  // store the computed placement inside `originalPlacement`
  data.originalPlacement = data.placement;

  data.positionFixed = this.options.positionFixed;

  // compute the popper offsets
  data.offsets.popper = getPopperOffsets(this.popper, data.offsets.reference, data.placement);

  data.offsets.popper.position = this.options.positionFixed ? 'fixed' : 'absolute';

  // run the modifiers
  data = runModifiers(this.modifiers, data);

  // the first `update` will call `onCreate` callback
  // the other ones will call `onUpdate` callback
  if (!this.state.isCreated) {
    this.state.isCreated = true;
    this.options.onCreate(data);
  } else {
    this.options.onUpdate(data);
  }
}

/**
 * Helper used to know if the given modifier is enabled.
 * @method
 * @memberof Popper.Utils
 * @returns {Boolean}
 */
function isModifierEnabled(modifiers, modifierName) {
  return modifiers.some(function (_ref) {
    var name = _ref.name,
        enabled = _ref.enabled;
    return enabled && name === modifierName;
  });
}

/**
 * Get the prefixed supported property name
 * @method
 * @memberof Popper.Utils
 * @argument {String} property (camelCase)
 * @returns {String} prefixed property (camelCase or PascalCase, depending on the vendor prefix)
 */
function getSupportedPropertyName(property) {
  var prefixes = [false, 'ms', 'Webkit', 'Moz', 'O'];
  var upperProp = property.charAt(0).toUpperCase() + property.slice(1);

  for (var i = 0; i < prefixes.length; i++) {
    var prefix = prefixes[i];
    var toCheck = prefix ? '' + prefix + upperProp : property;
    if (typeof document.body.style[toCheck] !== 'undefined') {
      return toCheck;
    }
  }
  return null;
}

/**
 * Destroy the popper
 * @method
 * @memberof Popper
 */
function destroy() {
  this.state.isDestroyed = true;

  // touch DOM only if `applyStyle` modifier is enabled
  if (isModifierEnabled(this.modifiers, 'applyStyle')) {
    this.popper.removeAttribute('x-placement');
    this.popper.style.position = '';
    this.popper.style.top = '';
    this.popper.style.left = '';
    this.popper.style.right = '';
    this.popper.style.bottom = '';
    this.popper.style.willChange = '';
    this.popper.style[getSupportedPropertyName('transform')] = '';
  }

  this.disableEventListeners();

  // remove the popper if user explicity asked for the deletion on destroy
  // do not use `remove` because IE11 doesn't support it
  if (this.options.removeOnDestroy) {
    this.popper.parentNode.removeChild(this.popper);
  }
  return this;
}

/**
 * Get the window associated with the element
 * @argument {Element} element
 * @returns {Window}
 */
function getWindow(element) {
  var ownerDocument = element.ownerDocument;
  return ownerDocument ? ownerDocument.defaultView : window;
}

function attachToScrollParents(scrollParent, event, callback, scrollParents) {
  var isBody = scrollParent.nodeName === 'BODY';
  var target = isBody ? scrollParent.ownerDocument.defaultView : scrollParent;
  target.addEventListener(event, callback, { passive: true });

  if (!isBody) {
    attachToScrollParents(getScrollParent(target.parentNode), event, callback, scrollParents);
  }
  scrollParents.push(target);
}

/**
 * Setup needed event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function setupEventListeners(reference, options, state, updateBound) {
  // Resize event listener on window
  state.updateBound = updateBound;
  getWindow(reference).addEventListener('resize', state.updateBound, { passive: true });

  // Scroll event listener on scroll parents
  var scrollElement = getScrollParent(reference);
  attachToScrollParents(scrollElement, 'scroll', state.updateBound, state.scrollParents);
  state.scrollElement = scrollElement;
  state.eventsEnabled = true;

  return state;
}

/**
 * It will add resize/scroll events and start recalculating
 * position of the popper element when they are triggered.
 * @method
 * @memberof Popper
 */
function enableEventListeners() {
  if (!this.state.eventsEnabled) {
    this.state = setupEventListeners(this.reference, this.options, this.state, this.scheduleUpdate);
  }
}

/**
 * Remove event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function removeEventListeners(reference, state) {
  // Remove resize event listener on window
  getWindow(reference).removeEventListener('resize', state.updateBound);

  // Remove scroll event listener on scroll parents
  state.scrollParents.forEach(function (target) {
    target.removeEventListener('scroll', state.updateBound);
  });

  // Reset state
  state.updateBound = null;
  state.scrollParents = [];
  state.scrollElement = null;
  state.eventsEnabled = false;
  return state;
}

/**
 * It will remove resize/scroll events and won't recalculate popper position
 * when they are triggered. It also won't trigger onUpdate callback anymore,
 * unless you call `update` method manually.
 * @method
 * @memberof Popper
 */
function disableEventListeners() {
  if (this.state.eventsEnabled) {
    cancelAnimationFrame(this.scheduleUpdate);
    this.state = removeEventListeners(this.reference, this.state);
  }
}

/**
 * Tells if a given input is a number
 * @method
 * @memberof Popper.Utils
 * @param {*} input to check
 * @return {Boolean}
 */
function isNumeric(n) {
  return n !== '' && !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Set the style to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the style to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setStyles(element, styles) {
  Object.keys(styles).forEach(function (prop) {
    var unit = '';
    // add unit if the value is numeric and is one of the following
    if (['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !== -1 && isNumeric(styles[prop])) {
      unit = 'px';
    }
    element.style[prop] = styles[prop] + unit;
  });
}

/**
 * Set the attributes to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the attributes to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setAttributes(element, attributes) {
  Object.keys(attributes).forEach(function (prop) {
    var value = attributes[prop];
    if (value !== false) {
      element.setAttribute(prop, attributes[prop]);
    } else {
      element.removeAttribute(prop);
    }
  });
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} data.styles - List of style properties - values to apply to popper element
 * @argument {Object} data.attributes - List of attribute properties - values to apply to popper element
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The same data object
 */
function applyStyle(data) {
  // any property present in `data.styles` will be applied to the popper,
  // in this way we can make the 3rd party modifiers add custom styles to it
  // Be aware, modifiers could override the properties defined in the previous
  // lines of this modifier!
  setStyles(data.instance.popper, data.styles);

  // any property present in `data.attributes` will be applied to the popper,
  // they will be set as HTML attributes of the element
  setAttributes(data.instance.popper, data.attributes);

  // if arrowElement is defined and arrowStyles has some properties
  if (data.arrowElement && Object.keys(data.arrowStyles).length) {
    setStyles(data.arrowElement, data.arrowStyles);
  }

  return data;
}

/**
 * Set the x-placement attribute before everything else because it could be used
 * to add margins to the popper margins needs to be calculated to get the
 * correct popper offsets.
 * @method
 * @memberof Popper.modifiers
 * @param {HTMLElement} reference - The reference element used to position the popper
 * @param {HTMLElement} popper - The HTML element used as popper
 * @param {Object} options - Popper.js options
 */
function applyStyleOnLoad(reference, popper, options, modifierOptions, state) {
  // compute reference element offsets
  var referenceOffsets = getReferenceOffsets(state, popper, reference, options.positionFixed);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  var placement = computeAutoPlacement(options.placement, referenceOffsets, popper, reference, options.modifiers.flip.boundariesElement, options.modifiers.flip.padding);

  popper.setAttribute('x-placement', placement);

  // Apply `position` to popper before anything else because
  // without the position applied we can't guarantee correct computations
  setStyles(popper, { position: options.positionFixed ? 'fixed' : 'absolute' });

  return options;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeStyle(data, options) {
  var x = options.x,
      y = options.y;
  var popper = data.offsets.popper;

  // Remove this legacy support in Popper.js v2

  var legacyGpuAccelerationOption = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'applyStyle';
  }).gpuAcceleration;
  if (legacyGpuAccelerationOption !== undefined) {
    console.warn('WARNING: `gpuAcceleration` option moved to `computeStyle` modifier and will not be supported in future versions of Popper.js!');
  }
  var gpuAcceleration = legacyGpuAccelerationOption !== undefined ? legacyGpuAccelerationOption : options.gpuAcceleration;

  var offsetParent = getOffsetParent(data.instance.popper);
  var offsetParentRect = getBoundingClientRect(offsetParent);

  // Styles
  var styles = {
    position: popper.position
  };

  // Avoid blurry text by using full pixel integers.
  // For pixel-perfect positioning, top/bottom prefers rounded
  // values, while left/right prefers floored values.
  var offsets = {
    left: Math.floor(popper.left),
    top: Math.round(popper.top),
    bottom: Math.round(popper.bottom),
    right: Math.floor(popper.right)
  };

  var sideA = x === 'bottom' ? 'top' : 'bottom';
  var sideB = y === 'right' ? 'left' : 'right';

  // if gpuAcceleration is set to `true` and transform is supported,
  //  we use `translate3d` to apply the position to the popper we
  // automatically use the supported prefixed version if needed
  var prefixedProperty = getSupportedPropertyName('transform');

  // now, let's make a step back and look at this code closely (wtf?)
  // If the content of the popper grows once it's been positioned, it
  // may happen that the popper gets misplaced because of the new content
  // overflowing its reference element
  // To avoid this problem, we provide two options (x and y), which allow
  // the consumer to define the offset origin.
  // If we position a popper on top of a reference element, we can set
  // `x` to `top` to make the popper grow towards its top instead of
  // its bottom.
  var left = void 0,
      top = void 0;
  if (sideA === 'bottom') {
    top = -offsetParentRect.height + offsets.bottom;
  } else {
    top = offsets.top;
  }
  if (sideB === 'right') {
    left = -offsetParentRect.width + offsets.right;
  } else {
    left = offsets.left;
  }
  if (gpuAcceleration && prefixedProperty) {
    styles[prefixedProperty] = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
    styles[sideA] = 0;
    styles[sideB] = 0;
    styles.willChange = 'transform';
  } else {
    // othwerise, we use the standard `top`, `left`, `bottom` and `right` properties
    var invertTop = sideA === 'bottom' ? -1 : 1;
    var invertLeft = sideB === 'right' ? -1 : 1;
    styles[sideA] = top * invertTop;
    styles[sideB] = left * invertLeft;
    styles.willChange = sideA + ', ' + sideB;
  }

  // Attributes
  var attributes = {
    'x-placement': data.placement
  };

  // Update `data` attributes, styles and arrowStyles
  data.attributes = _extends$1({}, attributes, data.attributes);
  data.styles = _extends$1({}, styles, data.styles);
  data.arrowStyles = _extends$1({}, data.offsets.arrow, data.arrowStyles);

  return data;
}

/**
 * Helper used to know if the given modifier depends from another one.<br />
 * It checks if the needed modifier is listed and enabled.
 * @method
 * @memberof Popper.Utils
 * @param {Array} modifiers - list of modifiers
 * @param {String} requestingName - name of requesting modifier
 * @param {String} requestedName - name of requested modifier
 * @returns {Boolean}
 */
function isModifierRequired(modifiers, requestingName, requestedName) {
  var requesting = find(modifiers, function (_ref) {
    var name = _ref.name;
    return name === requestingName;
  });

  var isRequired = !!requesting && modifiers.some(function (modifier) {
    return modifier.name === requestedName && modifier.enabled && modifier.order < requesting.order;
  });

  if (!isRequired) {
    var _requesting = '`' + requestingName + '`';
    var requested = '`' + requestedName + '`';
    console.warn(requested + ' modifier is required by ' + _requesting + ' modifier in order to work, be sure to include it before ' + _requesting + '!');
  }
  return isRequired;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function arrow(data, options) {
  var _data$offsets$arrow;

  // arrow depends on keepTogether in order to work
  if (!isModifierRequired(data.instance.modifiers, 'arrow', 'keepTogether')) {
    return data;
  }

  var arrowElement = options.element;

  // if arrowElement is a string, suppose it's a CSS selector
  if (typeof arrowElement === 'string') {
    arrowElement = data.instance.popper.querySelector(arrowElement);

    // if arrowElement is not found, don't run the modifier
    if (!arrowElement) {
      return data;
    }
  } else {
    // if the arrowElement isn't a query selector we must check that the
    // provided DOM node is child of its popper node
    if (!data.instance.popper.contains(arrowElement)) {
      console.warn('WARNING: `arrow.element` must be child of its popper element!');
      return data;
    }
  }

  var placement = data.placement.split('-')[0];
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var isVertical = ['left', 'right'].indexOf(placement) !== -1;

  var len = isVertical ? 'height' : 'width';
  var sideCapitalized = isVertical ? 'Top' : 'Left';
  var side = sideCapitalized.toLowerCase();
  var altSide = isVertical ? 'left' : 'top';
  var opSide = isVertical ? 'bottom' : 'right';
  var arrowElementSize = getOuterSizes(arrowElement)[len];

  //
  // extends keepTogether behavior making sure the popper and its
  // reference have enough pixels in conjuction
  //

  // top/left side
  if (reference[opSide] - arrowElementSize < popper[side]) {
    data.offsets.popper[side] -= popper[side] - (reference[opSide] - arrowElementSize);
  }
  // bottom/right side
  if (reference[side] + arrowElementSize > popper[opSide]) {
    data.offsets.popper[side] += reference[side] + arrowElementSize - popper[opSide];
  }
  data.offsets.popper = getClientRect(data.offsets.popper);

  // compute center of the popper
  var center = reference[side] + reference[len] / 2 - arrowElementSize / 2;

  // Compute the sideValue using the updated popper offsets
  // take popper margin in account because we don't have this info available
  var css = getStyleComputedProperty(data.instance.popper);
  var popperMarginSide = parseFloat(css['margin' + sideCapitalized], 10);
  var popperBorderSide = parseFloat(css['border' + sideCapitalized + 'Width'], 10);
  var sideValue = center - data.offsets.popper[side] - popperMarginSide - popperBorderSide;

  // prevent arrowElement from being placed not contiguously to its popper
  sideValue = Math.max(Math.min(popper[len] - arrowElementSize, sideValue), 0);

  data.arrowElement = arrowElement;
  data.offsets.arrow = (_data$offsets$arrow = {}, defineProperty(_data$offsets$arrow, side, Math.round(sideValue)), defineProperty(_data$offsets$arrow, altSide, ''), _data$offsets$arrow);

  return data;
}

/**
 * Get the opposite placement variation of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement variation
 * @returns {String} flipped placement variation
 */
function getOppositeVariation(variation) {
  if (variation === 'end') {
    return 'start';
  } else if (variation === 'start') {
    return 'end';
  }
  return variation;
}

/**
 * List of accepted placements to use as values of the `placement` option.<br />
 * Valid placements are:
 * - `auto`
 * - `top`
 * - `right`
 * - `bottom`
 * - `left`
 *
 * Each placement can have a variation from this list:
 * - `-start`
 * - `-end`
 *
 * Variations are interpreted easily if you think of them as the left to right
 * written languages. Horizontally (`top` and `bottom`), `start` is left and `end`
 * is right.<br />
 * Vertically (`left` and `right`), `start` is top and `end` is bottom.
 *
 * Some valid examples are:
 * - `top-end` (on top of reference, right aligned)
 * - `right-start` (on right of reference, top aligned)
 * - `bottom` (on bottom, centered)
 * - `auto-right` (on the side with more space available, alignment depends by placement)
 *
 * @static
 * @type {Array}
 * @enum {String}
 * @readonly
 * @method placements
 * @memberof Popper
 */
var placements = ['auto-start', 'auto', 'auto-end', 'top-start', 'top', 'top-end', 'right-start', 'right', 'right-end', 'bottom-end', 'bottom', 'bottom-start', 'left-end', 'left', 'left-start'];

// Get rid of `auto` `auto-start` and `auto-end`
var validPlacements = placements.slice(3);

/**
 * Given an initial placement, returns all the subsequent placements
 * clockwise (or counter-clockwise).
 *
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement - A valid placement (it accepts variations)
 * @argument {Boolean} counter - Set to true to walk the placements counterclockwise
 * @returns {Array} placements including their variations
 */
function clockwise(placement) {
  var counter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var index = validPlacements.indexOf(placement);
  var arr = validPlacements.slice(index + 1).concat(validPlacements.slice(0, index));
  return counter ? arr.reverse() : arr;
}

var BEHAVIORS = {
  FLIP: 'flip',
  CLOCKWISE: 'clockwise',
  COUNTERCLOCKWISE: 'counterclockwise'
};

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function flip(data, options) {
  // if `inner` modifier is enabled, we can't use the `flip` modifier
  if (isModifierEnabled(data.instance.modifiers, 'inner')) {
    return data;
  }

  if (data.flipped && data.placement === data.originalPlacement) {
    // seems like flip is trying to loop, probably there's not enough space on any of the flippable sides
    return data;
  }

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, options.boundariesElement, data.positionFixed);

  var placement = data.placement.split('-')[0];
  var placementOpposite = getOppositePlacement(placement);
  var variation = data.placement.split('-')[1] || '';

  var flipOrder = [];

  switch (options.behavior) {
    case BEHAVIORS.FLIP:
      flipOrder = [placement, placementOpposite];
      break;
    case BEHAVIORS.CLOCKWISE:
      flipOrder = clockwise(placement);
      break;
    case BEHAVIORS.COUNTERCLOCKWISE:
      flipOrder = clockwise(placement, true);
      break;
    default:
      flipOrder = options.behavior;
  }

  flipOrder.forEach(function (step, index) {
    if (placement !== step || flipOrder.length === index + 1) {
      return data;
    }

    placement = data.placement.split('-')[0];
    placementOpposite = getOppositePlacement(placement);

    var popperOffsets = data.offsets.popper;
    var refOffsets = data.offsets.reference;

    // using floor because the reference offsets may contain decimals we are not going to consider here
    var floor = Math.floor;
    var overlapsRef = placement === 'left' && floor(popperOffsets.right) > floor(refOffsets.left) || placement === 'right' && floor(popperOffsets.left) < floor(refOffsets.right) || placement === 'top' && floor(popperOffsets.bottom) > floor(refOffsets.top) || placement === 'bottom' && floor(popperOffsets.top) < floor(refOffsets.bottom);

    var overflowsLeft = floor(popperOffsets.left) < floor(boundaries.left);
    var overflowsRight = floor(popperOffsets.right) > floor(boundaries.right);
    var overflowsTop = floor(popperOffsets.top) < floor(boundaries.top);
    var overflowsBottom = floor(popperOffsets.bottom) > floor(boundaries.bottom);

    var overflowsBoundaries = placement === 'left' && overflowsLeft || placement === 'right' && overflowsRight || placement === 'top' && overflowsTop || placement === 'bottom' && overflowsBottom;

    // flip the variation if required
    var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
    var flippedVariation = !!options.flipVariations && (isVertical && variation === 'start' && overflowsLeft || isVertical && variation === 'end' && overflowsRight || !isVertical && variation === 'start' && overflowsTop || !isVertical && variation === 'end' && overflowsBottom);

    if (overlapsRef || overflowsBoundaries || flippedVariation) {
      // this boolean to detect any flip loop
      data.flipped = true;

      if (overlapsRef || overflowsBoundaries) {
        placement = flipOrder[index + 1];
      }

      if (flippedVariation) {
        variation = getOppositeVariation(variation);
      }

      data.placement = placement + (variation ? '-' + variation : '');

      // this object contains `position`, we want to preserve it along with
      // any additional property we may add in the future
      data.offsets.popper = _extends$1({}, data.offsets.popper, getPopperOffsets(data.instance.popper, data.offsets.reference, data.placement));

      data = runModifiers(data.instance.modifiers, data, 'flip');
    }
  });
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function keepTogether(data) {
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var placement = data.placement.split('-')[0];
  var floor = Math.floor;
  var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
  var side = isVertical ? 'right' : 'bottom';
  var opSide = isVertical ? 'left' : 'top';
  var measurement = isVertical ? 'width' : 'height';

  if (popper[side] < floor(reference[opSide])) {
    data.offsets.popper[opSide] = floor(reference[opSide]) - popper[measurement];
  }
  if (popper[opSide] > floor(reference[side])) {
    data.offsets.popper[opSide] = floor(reference[side]);
  }

  return data;
}

/**
 * Converts a string containing value + unit into a px value number
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} str - Value + unit string
 * @argument {String} measurement - `height` or `width`
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @returns {Number|String}
 * Value in pixels, or original string if no values were extracted
 */
function toValue(str, measurement, popperOffsets, referenceOffsets) {
  // separate value from unit
  var split = str.match(/((?:\-|\+)?\d*\.?\d*)(.*)/);
  var value = +split[1];
  var unit = split[2];

  // If it's not a number it's an operator, I guess
  if (!value) {
    return str;
  }

  if (unit.indexOf('%') === 0) {
    var element = void 0;
    switch (unit) {
      case '%p':
        element = popperOffsets;
        break;
      case '%':
      case '%r':
      default:
        element = referenceOffsets;
    }

    var rect = getClientRect(element);
    return rect[measurement] / 100 * value;
  } else if (unit === 'vh' || unit === 'vw') {
    // if is a vh or vw, we calculate the size based on the viewport
    var size = void 0;
    if (unit === 'vh') {
      size = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    } else {
      size = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    }
    return size / 100 * value;
  } else {
    // if is an explicit pixel unit, we get rid of the unit and keep the value
    // if is an implicit unit, it's px, and we return just the value
    return value;
  }
}

/**
 * Parse an `offset` string to extrapolate `x` and `y` numeric offsets.
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} offset
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @argument {String} basePlacement
 * @returns {Array} a two cells array with x and y offsets in numbers
 */
function parseOffset(offset, popperOffsets, referenceOffsets, basePlacement) {
  var offsets = [0, 0];

  // Use height if placement is left or right and index is 0 otherwise use width
  // in this way the first offset will use an axis and the second one
  // will use the other one
  var useHeight = ['right', 'left'].indexOf(basePlacement) !== -1;

  // Split the offset string to obtain a list of values and operands
  // The regex addresses values with the plus or minus sign in front (+10, -20, etc)
  var fragments = offset.split(/(\+|\-)/).map(function (frag) {
    return frag.trim();
  });

  // Detect if the offset string contains a pair of values or a single one
  // they could be separated by comma or space
  var divider = fragments.indexOf(find(fragments, function (frag) {
    return frag.search(/,|\s/) !== -1;
  }));

  if (fragments[divider] && fragments[divider].indexOf(',') === -1) {
    console.warn('Offsets separated by white space(s) are deprecated, use a comma (,) instead.');
  }

  // If divider is found, we divide the list of values and operands to divide
  // them by ofset X and Y.
  var splitRegex = /\s*,\s*|\s+/;
  var ops = divider !== -1 ? [fragments.slice(0, divider).concat([fragments[divider].split(splitRegex)[0]]), [fragments[divider].split(splitRegex)[1]].concat(fragments.slice(divider + 1))] : [fragments];

  // Convert the values with units to absolute pixels to allow our computations
  ops = ops.map(function (op, index) {
    // Most of the units rely on the orientation of the popper
    var measurement = (index === 1 ? !useHeight : useHeight) ? 'height' : 'width';
    var mergeWithPrevious = false;
    return op
    // This aggregates any `+` or `-` sign that aren't considered operators
    // e.g.: 10 + +5 => [10, +, +5]
    .reduce(function (a, b) {
      if (a[a.length - 1] === '' && ['+', '-'].indexOf(b) !== -1) {
        a[a.length - 1] = b;
        mergeWithPrevious = true;
        return a;
      } else if (mergeWithPrevious) {
        a[a.length - 1] += b;
        mergeWithPrevious = false;
        return a;
      } else {
        return a.concat(b);
      }
    }, [])
    // Here we convert the string values into number values (in px)
    .map(function (str) {
      return toValue(str, measurement, popperOffsets, referenceOffsets);
    });
  });

  // Loop trough the offsets arrays and execute the operations
  ops.forEach(function (op, index) {
    op.forEach(function (frag, index2) {
      if (isNumeric(frag)) {
        offsets[index] += frag * (op[index2 - 1] === '-' ? -1 : 1);
      }
    });
  });
  return offsets;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @argument {Number|String} options.offset=0
 * The offset value as described in the modifier description
 * @returns {Object} The data object, properly modified
 */
function offset(data, _ref) {
  var offset = _ref.offset;
  var placement = data.placement,
      _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var basePlacement = placement.split('-')[0];

  var offsets = void 0;
  if (isNumeric(+offset)) {
    offsets = [+offset, 0];
  } else {
    offsets = parseOffset(offset, popper, reference, basePlacement);
  }

  if (basePlacement === 'left') {
    popper.top += offsets[0];
    popper.left -= offsets[1];
  } else if (basePlacement === 'right') {
    popper.top += offsets[0];
    popper.left += offsets[1];
  } else if (basePlacement === 'top') {
    popper.left += offsets[0];
    popper.top -= offsets[1];
  } else if (basePlacement === 'bottom') {
    popper.left += offsets[0];
    popper.top += offsets[1];
  }

  data.popper = popper;
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function preventOverflow(data, options) {
  var boundariesElement = options.boundariesElement || getOffsetParent(data.instance.popper);

  // If offsetParent is the reference element, we really want to
  // go one step up and use the next offsetParent as reference to
  // avoid to make this modifier completely useless and look like broken
  if (data.instance.reference === boundariesElement) {
    boundariesElement = getOffsetParent(boundariesElement);
  }

  // NOTE: DOM access here
  // resets the popper's position so that the document size can be calculated excluding
  // the size of the popper element itself
  var transformProp = getSupportedPropertyName('transform');
  var popperStyles = data.instance.popper.style; // assignment to help minification
  var top = popperStyles.top,
      left = popperStyles.left,
      transform = popperStyles[transformProp];

  popperStyles.top = '';
  popperStyles.left = '';
  popperStyles[transformProp] = '';

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, boundariesElement, data.positionFixed);

  // NOTE: DOM access here
  // restores the original style properties after the offsets have been computed
  popperStyles.top = top;
  popperStyles.left = left;
  popperStyles[transformProp] = transform;

  options.boundaries = boundaries;

  var order = options.priority;
  var popper = data.offsets.popper;

  var check = {
    primary: function primary(placement) {
      var value = popper[placement];
      if (popper[placement] < boundaries[placement] && !options.escapeWithReference) {
        value = Math.max(popper[placement], boundaries[placement]);
      }
      return defineProperty({}, placement, value);
    },
    secondary: function secondary(placement) {
      var mainSide = placement === 'right' ? 'left' : 'top';
      var value = popper[mainSide];
      if (popper[placement] > boundaries[placement] && !options.escapeWithReference) {
        value = Math.min(popper[mainSide], boundaries[placement] - (placement === 'right' ? popper.width : popper.height));
      }
      return defineProperty({}, mainSide, value);
    }
  };

  order.forEach(function (placement) {
    var side = ['left', 'top'].indexOf(placement) !== -1 ? 'primary' : 'secondary';
    popper = _extends$1({}, popper, check[side](placement));
  });

  data.offsets.popper = popper;

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function shift(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var shiftvariation = placement.split('-')[1];

  // if shift shiftvariation is specified, run the modifier
  if (shiftvariation) {
    var _data$offsets = data.offsets,
        reference = _data$offsets.reference,
        popper = _data$offsets.popper;

    var isVertical = ['bottom', 'top'].indexOf(basePlacement) !== -1;
    var side = isVertical ? 'left' : 'top';
    var measurement = isVertical ? 'width' : 'height';

    var shiftOffsets = {
      start: defineProperty({}, side, reference[side]),
      end: defineProperty({}, side, reference[side] + reference[measurement] - popper[measurement])
    };

    data.offsets.popper = _extends$1({}, popper, shiftOffsets[shiftvariation]);
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function hide(data) {
  if (!isModifierRequired(data.instance.modifiers, 'hide', 'preventOverflow')) {
    return data;
  }

  var refRect = data.offsets.reference;
  var bound = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'preventOverflow';
  }).boundaries;

  if (refRect.bottom < bound.top || refRect.left > bound.right || refRect.top > bound.bottom || refRect.right < bound.left) {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === true) {
      return data;
    }

    data.hide = true;
    data.attributes['x-out-of-boundaries'] = '';
  } else {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === false) {
      return data;
    }

    data.hide = false;
    data.attributes['x-out-of-boundaries'] = false;
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function inner(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var isHoriz = ['left', 'right'].indexOf(basePlacement) !== -1;

  var subtractLength = ['top', 'left'].indexOf(basePlacement) === -1;

  popper[isHoriz ? 'left' : 'top'] = reference[basePlacement] - (subtractLength ? popper[isHoriz ? 'width' : 'height'] : 0);

  data.placement = getOppositePlacement(placement);
  data.offsets.popper = getClientRect(popper);

  return data;
}

/**
 * Modifier function, each modifier can have a function of this type assigned
 * to its `fn` property.<br />
 * These functions will be called on each update, this means that you must
 * make sure they are performant enough to avoid performance bottlenecks.
 *
 * @function ModifierFn
 * @argument {dataObject} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {dataObject} The data object, properly modified
 */

/**
 * Modifiers are plugins used to alter the behavior of your poppers.<br />
 * Popper.js uses a set of 9 modifiers to provide all the basic functionalities
 * needed by the library.
 *
 * Usually you don't want to override the `order`, `fn` and `onLoad` props.
 * All the other properties are configurations that could be tweaked.
 * @namespace modifiers
 */
var modifiers = {
  /**
   * Modifier used to shift the popper on the start or end of its reference
   * element.<br />
   * It will read the variation of the `placement` property.<br />
   * It can be one either `-end` or `-start`.
   * @memberof modifiers
   * @inner
   */
  shift: {
    /** @prop {number} order=100 - Index used to define the order of execution */
    order: 100,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: shift
  },

  /**
   * The `offset` modifier can shift your popper on both its axis.
   *
   * It accepts the following units:
   * - `px` or unitless, interpreted as pixels
   * - `%` or `%r`, percentage relative to the length of the reference element
   * - `%p`, percentage relative to the length of the popper element
   * - `vw`, CSS viewport width unit
   * - `vh`, CSS viewport height unit
   *
   * For length is intended the main axis relative to the placement of the popper.<br />
   * This means that if the placement is `top` or `bottom`, the length will be the
   * `width`. In case of `left` or `right`, it will be the height.
   *
   * You can provide a single value (as `Number` or `String`), or a pair of values
   * as `String` divided by a comma or one (or more) white spaces.<br />
   * The latter is a deprecated method because it leads to confusion and will be
   * removed in v2.<br />
   * Additionally, it accepts additions and subtractions between different units.
   * Note that multiplications and divisions aren't supported.
   *
   * Valid examples are:
   * ```
   * 10
   * '10%'
   * '10, 10'
   * '10%, 10'
   * '10 + 10%'
   * '10 - 5vh + 3%'
   * '-10px + 5vh, 5px - 6%'
   * ```
   * > **NB**: If you desire to apply offsets to your poppers in a way that may make them overlap
   * > with their reference element, unfortunately, you will have to disable the `flip` modifier.
   * > More on this [reading this issue](https://github.com/FezVrasta/popper.js/issues/373)
   *
   * @memberof modifiers
   * @inner
   */
  offset: {
    /** @prop {number} order=200 - Index used to define the order of execution */
    order: 200,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: offset,
    /** @prop {Number|String} offset=0
     * The offset value as described in the modifier description
     */
    offset: 0
  },

  /**
   * Modifier used to prevent the popper from being positioned outside the boundary.
   *
   * An scenario exists where the reference itself is not within the boundaries.<br />
   * We can say it has "escaped the boundaries" — or just "escaped".<br />
   * In this case we need to decide whether the popper should either:
   *
   * - detach from the reference and remain "trapped" in the boundaries, or
   * - if it should ignore the boundary and "escape with its reference"
   *
   * When `escapeWithReference` is set to`true` and reference is completely
   * outside its boundaries, the popper will overflow (or completely leave)
   * the boundaries in order to remain attached to the edge of the reference.
   *
   * @memberof modifiers
   * @inner
   */
  preventOverflow: {
    /** @prop {number} order=300 - Index used to define the order of execution */
    order: 300,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: preventOverflow,
    /**
     * @prop {Array} [priority=['left','right','top','bottom']]
     * Popper will try to prevent overflow following these priorities by default,
     * then, it could overflow on the left and on top of the `boundariesElement`
     */
    priority: ['left', 'right', 'top', 'bottom'],
    /**
     * @prop {number} padding=5
     * Amount of pixel used to define a minimum distance between the boundaries
     * and the popper this makes sure the popper has always a little padding
     * between the edges of its container
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='scrollParent'
     * Boundaries used by the modifier, can be `scrollParent`, `window`,
     * `viewport` or any DOM element.
     */
    boundariesElement: 'scrollParent'
  },

  /**
   * Modifier used to make sure the reference and its popper stay near eachothers
   * without leaving any gap between the two. Expecially useful when the arrow is
   * enabled and you want to assure it to point to its reference element.
   * It cares only about the first axis, you can still have poppers with margin
   * between the popper and its reference element.
   * @memberof modifiers
   * @inner
   */
  keepTogether: {
    /** @prop {number} order=400 - Index used to define the order of execution */
    order: 400,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: keepTogether
  },

  /**
   * This modifier is used to move the `arrowElement` of the popper to make
   * sure it is positioned between the reference element and its popper element.
   * It will read the outer size of the `arrowElement` node to detect how many
   * pixels of conjuction are needed.
   *
   * It has no effect if no `arrowElement` is provided.
   * @memberof modifiers
   * @inner
   */
  arrow: {
    /** @prop {number} order=500 - Index used to define the order of execution */
    order: 500,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: arrow,
    /** @prop {String|HTMLElement} element='[x-arrow]' - Selector or node used as arrow */
    element: '[x-arrow]'
  },

  /**
   * Modifier used to flip the popper's placement when it starts to overlap its
   * reference element.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   *
   * **NOTE:** this modifier will interrupt the current update cycle and will
   * restart it if it detects the need to flip the placement.
   * @memberof modifiers
   * @inner
   */
  flip: {
    /** @prop {number} order=600 - Index used to define the order of execution */
    order: 600,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: flip,
    /**
     * @prop {String|Array} behavior='flip'
     * The behavior used to change the popper's placement. It can be one of
     * `flip`, `clockwise`, `counterclockwise` or an array with a list of valid
     * placements (with optional variations).
     */
    behavior: 'flip',
    /**
     * @prop {number} padding=5
     * The popper will flip if it hits the edges of the `boundariesElement`
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='viewport'
     * The element which will define the boundaries of the popper position,
     * the popper will never be placed outside of the defined boundaries
     * (except if keepTogether is enabled)
     */
    boundariesElement: 'viewport'
  },

  /**
   * Modifier used to make the popper flow toward the inner of the reference element.
   * By default, when this modifier is disabled, the popper will be placed outside
   * the reference element.
   * @memberof modifiers
   * @inner
   */
  inner: {
    /** @prop {number} order=700 - Index used to define the order of execution */
    order: 700,
    /** @prop {Boolean} enabled=false - Whether the modifier is enabled or not */
    enabled: false,
    /** @prop {ModifierFn} */
    fn: inner
  },

  /**
   * Modifier used to hide the popper when its reference element is outside of the
   * popper boundaries. It will set a `x-out-of-boundaries` attribute which can
   * be used to hide with a CSS selector the popper when its reference is
   * out of boundaries.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   * @memberof modifiers
   * @inner
   */
  hide: {
    /** @prop {number} order=800 - Index used to define the order of execution */
    order: 800,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: hide
  },

  /**
   * Computes the style that will be applied to the popper element to gets
   * properly positioned.
   *
   * Note that this modifier will not touch the DOM, it just prepares the styles
   * so that `applyStyle` modifier can apply it. This separation is useful
   * in case you need to replace `applyStyle` with a custom implementation.
   *
   * This modifier has `850` as `order` value to maintain backward compatibility
   * with previous versions of Popper.js. Expect the modifiers ordering method
   * to change in future major versions of the library.
   *
   * @memberof modifiers
   * @inner
   */
  computeStyle: {
    /** @prop {number} order=850 - Index used to define the order of execution */
    order: 850,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: computeStyle,
    /**
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3d transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties.
     */
    gpuAcceleration: true,
    /**
     * @prop {string} [x='bottom']
     * Where to anchor the X axis (`bottom` or `top`). AKA X offset origin.
     * Change this if your popper should grow in a direction different from `bottom`
     */
    x: 'bottom',
    /**
     * @prop {string} [x='left']
     * Where to anchor the Y axis (`left` or `right`). AKA Y offset origin.
     * Change this if your popper should grow in a direction different from `right`
     */
    y: 'right'
  },

  /**
   * Applies the computed styles to the popper element.
   *
   * All the DOM manipulations are limited to this modifier. This is useful in case
   * you want to integrate Popper.js inside a framework or view library and you
   * want to delegate all the DOM manipulations to it.
   *
   * Note that if you disable this modifier, you must make sure the popper element
   * has its position set to `absolute` before Popper.js can do its work!
   *
   * Just disable this modifier and define you own to achieve the desired effect.
   *
   * @memberof modifiers
   * @inner
   */
  applyStyle: {
    /** @prop {number} order=900 - Index used to define the order of execution */
    order: 900,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: applyStyle,
    /** @prop {Function} */
    onLoad: applyStyleOnLoad,
    /**
     * @deprecated since version 1.10.0, the property moved to `computeStyle` modifier
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3d transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties.
     */
    gpuAcceleration: undefined
  }
};

/**
 * The `dataObject` is an object containing all the informations used by Popper.js
 * this object get passed to modifiers and to the `onCreate` and `onUpdate` callbacks.
 * @name dataObject
 * @property {Object} data.instance The Popper.js instance
 * @property {String} data.placement Placement applied to popper
 * @property {String} data.originalPlacement Placement originally defined on init
 * @property {Boolean} data.flipped True if popper has been flipped by flip modifier
 * @property {Boolean} data.hide True if the reference element is out of boundaries, useful to know when to hide the popper.
 * @property {HTMLElement} data.arrowElement Node used as arrow by arrow modifier
 * @property {Object} data.styles Any CSS property defined here will be applied to the popper, it expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.arrowStyles Any CSS property defined here will be applied to the popper arrow, it expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.boundaries Offsets of the popper boundaries
 * @property {Object} data.offsets The measurements of popper, reference and arrow elements.
 * @property {Object} data.offsets.popper `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.reference `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.arrow] `top` and `left` offsets, only one of them will be different from 0
 */

/**
 * Default options provided to Popper.js constructor.<br />
 * These can be overriden using the `options` argument of Popper.js.<br />
 * To override an option, simply pass as 3rd argument an object with the same
 * structure of this object, example:
 * ```
 * new Popper(ref, pop, {
 *   modifiers: {
 *     preventOverflow: { enabled: false }
 *   }
 * })
 * ```
 * @type {Object}
 * @static
 * @memberof Popper
 */
var Defaults = {
  /**
   * Popper's placement
   * @prop {Popper.placements} placement='bottom'
   */
  placement: 'bottom',

  /**
   * Set this to true if you want popper to position it self in 'fixed' mode
   * @prop {Boolean} positionFixed=false
   */
  positionFixed: false,

  /**
   * Whether events (resize, scroll) are initially enabled
   * @prop {Boolean} eventsEnabled=true
   */
  eventsEnabled: true,

  /**
   * Set to true if you want to automatically remove the popper when
   * you call the `destroy` method.
   * @prop {Boolean} removeOnDestroy=false
   */
  removeOnDestroy: false,

  /**
   * Callback called when the popper is created.<br />
   * By default, is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onCreate}
   */
  onCreate: function onCreate() {},

  /**
   * Callback called when the popper is updated, this callback is not called
   * on the initialization/creation of the popper, but only on subsequent
   * updates.<br />
   * By default, is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onUpdate}
   */
  onUpdate: function onUpdate() {},

  /**
   * List of modifiers used to modify the offsets before they are applied to the popper.
   * They provide most of the functionalities of Popper.js
   * @prop {modifiers}
   */
  modifiers: modifiers
};

/**
 * @callback onCreate
 * @param {dataObject} data
 */

/**
 * @callback onUpdate
 * @param {dataObject} data
 */

// Utils
// Methods
var Popper = function () {
  /**
   * Create a new Popper.js instance
   * @class Popper
   * @param {HTMLElement|referenceObject} reference - The reference element used to position the popper
   * @param {HTMLElement} popper - The HTML element used as popper.
   * @param {Object} options - Your custom options to override the ones defined in [Defaults](#defaults)
   * @return {Object} instance - The generated Popper.js instance
   */
  function Popper(reference, popper) {
    var _this = this;

    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    classCallCheck(this, Popper);

    this.scheduleUpdate = function () {
      return requestAnimationFrame(_this.update);
    };

    // make update() debounced, so that it only runs at most once-per-tick
    this.update = debounce(this.update.bind(this));

    // with {} we create a new object with the options inside it
    this.options = _extends$1({}, Popper.Defaults, options);

    // init state
    this.state = {
      isDestroyed: false,
      isCreated: false,
      scrollParents: []
    };

    // get reference and popper elements (allow jQuery wrappers)
    this.reference = reference && reference.jquery ? reference[0] : reference;
    this.popper = popper && popper.jquery ? popper[0] : popper;

    // Deep merge modifiers options
    this.options.modifiers = {};
    Object.keys(_extends$1({}, Popper.Defaults.modifiers, options.modifiers)).forEach(function (name) {
      _this.options.modifiers[name] = _extends$1({}, Popper.Defaults.modifiers[name] || {}, options.modifiers ? options.modifiers[name] : {});
    });

    // Refactoring modifiers' list (Object => Array)
    this.modifiers = Object.keys(this.options.modifiers).map(function (name) {
      return _extends$1({
        name: name
      }, _this.options.modifiers[name]);
    })
    // sort the modifiers by order
    .sort(function (a, b) {
      return a.order - b.order;
    });

    // modifiers have the ability to execute arbitrary code when Popper.js get inited
    // such code is executed in the same order of its modifier
    // they could add new properties to their options configuration
    // BE AWARE: don't add options to `options.modifiers.name` but to `modifierOptions`!
    this.modifiers.forEach(function (modifierOptions) {
      if (modifierOptions.enabled && isFunction(modifierOptions.onLoad)) {
        modifierOptions.onLoad(_this.reference, _this.popper, _this.options, modifierOptions, _this.state);
      }
    });

    // fire the first update to position the popper in the right place
    this.update();

    var eventsEnabled = this.options.eventsEnabled;
    if (eventsEnabled) {
      // setup event listeners, they will take care of update the position in specific situations
      this.enableEventListeners();
    }

    this.state.eventsEnabled = eventsEnabled;
  }

  // We can't use class properties because they don't get listed in the
  // class prototype and break stuff like Sinon stubs


  createClass(Popper, [{
    key: 'update',
    value: function update$$1() {
      return update.call(this);
    }
  }, {
    key: 'destroy',
    value: function destroy$$1() {
      return destroy.call(this);
    }
  }, {
    key: 'enableEventListeners',
    value: function enableEventListeners$$1() {
      return enableEventListeners.call(this);
    }
  }, {
    key: 'disableEventListeners',
    value: function disableEventListeners$$1() {
      return disableEventListeners.call(this);
    }

    /**
     * Schedule an update, it will run on the next UI update available
     * @method scheduleUpdate
     * @memberof Popper
     */


    /**
     * Collection of utilities useful when writing custom modifiers.
     * Starting from version 1.7, this method is available only if you
     * include `popper-utils.js` before `popper.js`.
     *
     * **DEPRECATION**: This way to access PopperUtils is deprecated
     * and will be removed in v2! Use the PopperUtils module directly instead.
     * Due to the high instability of the methods contained in Utils, we can't
     * guarantee them to follow semver. Use them at your own risk!
     * @static
     * @private
     * @type {Object}
     * @deprecated since version 1.8
     * @member Utils
     * @memberof Popper
     */

  }]);
  return Popper;
}();

/**
 * The `referenceObject` is an object that provides an interface compatible with Popper.js
 * and lets you use it as replacement of a real DOM node.<br />
 * You can use this method to position a popper relatively to a set of coordinates
 * in case you don't have a DOM node to use as reference.
 *
 * ```
 * new Popper(referenceObject, popperNode);
 * ```
 *
 * NB: This feature isn't supported in Internet Explorer 10
 * @name referenceObject
 * @property {Function} data.getBoundingClientRect
 * A function that returns a set of coordinates compatible with the native `getBoundingClientRect` method.
 * @property {number} data.clientWidth
 * An ES6 getter that will return the width of the virtual reference element.
 * @property {number} data.clientHeight
 * An ES6 getter that will return the height of the virtual reference element.
 */


Popper.Utils = (typeof window !== 'undefined' ? window : global).PopperUtils;
Popper.placements = placements;
Popper.Defaults = Defaults;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

var classCallCheck$1 = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass$1 = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var Utils = function () {
    var Utils = {
        DOM: {
            hasParentWithClass: function hasParentWithClass(childNode, parentClasses) {
                if (!parentClasses || !childNode) {
                    return false;
                }

                if (typeof parentClasses === 'string') {
                    parentClasses = [parentClasses];
                } else if (!Array.isArray(parentClasses)) {
                    return false;
                }

                var node = childNode;
                var maxSearch = 50;

                var containsClasses = function containsClasses(node, cssClasses) {
                    var hasOneClass = false;

                    for (var i = 0, len = cssClasses.length; i < len; i++) {
                        if (node.classList && node.classList.contains(cssClasses[i])) {
                            hasOneClass = true;
                            break;
                        }
                    }

                    return hasOneClass;
                };

                while (node !== null && maxSearch) {
                    if (containsClasses(node, parentClasses)) {
                        return true;
                    }
                    node = node.parentNode;
                    maxSearch--;
                }

                return false;
            },

            createElement: function createElement(html) {
                var div = document.createElement('div');
                div.innerHTML = html;
                return div.firstElementChild;
            },

            refToElement: function refToElement(ref) {
                if (typeof ref === 'string') {
                    return document.querySelector(ref);
                }

                return ref;
            },

            refToElements: function refToElements(ref) {
                if (typeof ref === 'string') {
                    return document.querySelectorAll(ref);
                }

                return ref;
            },

            // eslint-disable-next-line
            isNode: function isNode(object) {
                return (typeof Node === 'undefined' ? 'undefined' : _typeof(Node)) === 'object' ? object instanceof Node : object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' && typeof object.nodeType === 'number' && typeof object.nodeName === 'string';
            },

            // eslint-disable-next-line
            isElement: function isElement(object) {
                return (typeof HTMLElement === 'undefined' ? 'undefined' : _typeof(HTMLElement)) === 'object' ? object instanceof HTMLElement : // DOM2
                object && (typeof o === 'undefined' ? 'undefined' : _typeof(o)) === 'object' && object !== null && object.nodeType === 1 && typeof object.nodeName === 'string';
            },

            escape: function escape(html) {
                var el = document.createElement('textarea');
                el.textContent = html;
                return el.innerHTML;
            }
        },

        EventHandlers: function () {
            function EventHandlers(namespace) {
                classCallCheck$1(this, EventHandlers);

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
            classCallCheck$1(this, Dropdown);

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

            var element = e.target;
            var elementIsInput = element.getAttribute && (element.getAttribute('type') === 'radio' || element.getAttribute('type') === 'checkbox');

            var handleKeyRegExp = new RegExp(Utils.KEYCODES.ARROW_UP + '|' + Utils.KEYCODES.ARROW_DOWN + '|' + Utils.KEYCODES.ESCAPE + '|' + Utils.KEYCODES.SPACE);

            if (!handleKeyRegExp.test(e.which)) {
                return;
            }

            if (e.which !== Utils.KEYCODES.SPACE || e.which === Utils.KEYCODES.SPACE && !elementIsInput) {
                e.preventDefault();
            }

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

var Popover = function () {
    var eventHandlers = new Utils.EventHandlers('tuiPopover');

    var ClassNames = {
        POPOVER: 'tuiPopover',
        ISOPEN: 'tuiPopover-is-visible',
        PLACEMENTLEFT: 'tuiPopover--left',
        PLACEMENTRIGHT: 'tuiPopover--right',
        PLACEMENTTOP: 'tuiPopover--top',
        PLACEMENTBOTTOM: 'tuiPopover--bottom',
        PLACEMENTPOINTERLESS: 'tuiPopover--pointerless',
        TOIGNORE: null
    };

    var defaultOptions = {
        placement: 'bottom',
        closeOnRoot: true,
        trigger: 'click',
        onOpened: null,
        onClosed: null,
        pointerless: false,
        eventless: false,
        ignoreElementEventsCssClasses: null,
        popper: {
            modifiers: {
                arrow: {
                    element: '.tuiPopover__pointer'
                },
                flip: {
                    enabled: true
                }
            }
        }
    };

    var Popover = function () {
        // TODO: NICE TO HAVE -> allow selectors by testing on element type.
        function Popover(targetElement, popoverElement, options) {
            classCallCheck$1(this, Popover);

            // validating dependencies
            if (typeof Popper === 'undefined') {
                throw new Error('TUIK requires Popper.js (https://popper.js.org)');
            }

            this._popper = null;
            this._targetElement = targetElement;
            this._popoverElement = popoverElement;
            this._options = Object.assign({}, defaultOptions, options);

            var pointerElement = this._popoverElement.querySelector(this._options.popper.modifiers.arrow.element);
            pointerElement.classList.add('tuiPopover__pointer--managed');

            // keeping refs
            this._targetElement.tuiRefPopoverElement = popoverElement;
            this._popoverElement.tuiRefTargetElement = targetElement;
            this._targetElement.onClosed = this._options.onClosed;
            this._targetElement.onOpened = this._options.onOpened;

            // to allow keydown listener to be added on the popover element
            this._popoverElement.setAttribute('tabindex', '1');

            this._addEventListeners();

            return this;
        }

        /* public */

        Popover.prototype.toggle = function toggle() {
            if (this._targetElement.getAttribute('disabled') || this._targetElement.getAttribute('disabled') === '') {
                return;
            }

            var isOpen = this._popoverElement.classList.contains(ClassNames.ISOPEN);

            if (isOpen) {
                if (this._popoverElement.tuiRefTargetElement === this._targetElement) {
                    Popover.close(this._popoverElement);
                } else {
                    this.show(true);
                }
            } else {
                this.show();
            }
        };

        Popover.prototype.show = function show(useSamePopover) {
            var _this = this;

            ClassNames.TOIGNORE = this._options.ignoreElementEventsCssClasses;

            var onPopperUpdate = function onPopperUpdate(data) {
                Popover.place(data.instance.popper, data.placement, _this._options.pointerless);
            };

            var initializePopper = function initializePopper() {
                var placement = _this._options.pointerless ? 'bottom-start' : _this._options.placement;

                Popover.place(_this._popoverElement, placement, _this._options.pointerless);

                _this._popper = new Popper(_this._targetElement, _this._popoverElement, {
                    placement: placement,
                    modifiers: _this._options.popper.modifiers,
                    onUpdate: onPopperUpdate,
                    onCreate: onPopperUpdate
                });

                _this._targetElement.tuiRefPopoverElement = _this._popoverElement;
                _this._popoverElement.tuiRefTargetElement = _this._targetElement;
            };

            if (!useSamePopover) {
                Popover.closeAllOpenPopovers();
            }

            initializePopper();

            if (!useSamePopover) {
                this._bindHandlers();
                this._popoverElement.classList.add(ClassNames.ISOPEN);
            }

            if (this._targetElement.onOpened) {
                this._targetElement.onOpened.call();
            }
        };

        Popover.prototype.close = function close() {
            if (!this._options.eventless) {
                this._popoverElement.tuiRefTargetElement.focus();
            }
            Popover.close(this._popoverElement);
        };

        /* static */


        Popover.close = function close(popoverElement) {
            popoverElement.classList.remove(ClassNames.ISOPEN);

            if (eventHandlers.isBound(popoverElement, 'tuikPopoverClose', 'handlers')) {
                eventHandlers.triggerCustom(popoverElement, 'tuikPopoverClose');
            }

            if (popoverElement.tuiRefTargetElement.onClosed) {
                popoverElement.tuiRefTargetElement.onClosed.call();
            }
        };

        // DUPE - SEE DROPDOWN


        Popover.handleDocumentAction = function handleDocumentAction(e) {
            if (!e) {
                return;
            }

            if (e.type === 'keydown' && e.which === Utils.KEYCODES.ESCAPE) {
                Popover.closeAllOpenPopovers();
            }

            // do not close if Right mouse click or Tab
            if (e && (e.which === Utils.KEYCODES.RIGHT_MOUSE_BUTTON_WHICH || e.type === 'keydown' && e.which === Utils.KEYCODES.TAB)) {
                return;
            }

            // do not close if event occured from within the dropdown
            if (Utils.DOM.hasParentWithClass(e.target, ClassNames.POPOVER)) {
                return;
            }

            // do not close if event occured from within an ignored item
            if (ClassNames.TOIGNORE) {
                if (Utils.DOM.hasParentWithClass(e.target, ClassNames.TOIGNORE)) {
                    return;
                }
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

        Popover.place = function place(popoverElement, placement, isPointerless) {
            popoverElement.classList.remove(ClassNames.PLACEMENTLEFT);
            popoverElement.classList.remove(ClassNames.PLACEMENTRIGHT);
            popoverElement.classList.remove(ClassNames.PLACEMENTTOP);
            popoverElement.classList.remove(ClassNames.PLACEMENTBOTTOM);
            popoverElement.classList.remove(ClassNames.PLACEMENTPOINTERLESS);

            if (isPointerless) {
                popoverElement.classList.add(ClassNames.PLACEMENTPOINTERLESS);
            } else {
                switch (placement) {
                    case 'left':
                    case 'left-start':
                    case 'left-end':
                        popoverElement.classList.add(ClassNames.PLACEMENTLEFT);
                        break;
                    case 'right':
                    case 'right-start':
                    case 'right-end':
                        popoverElement.classList.add(ClassNames.PLACEMENTRIGHT);
                        break;
                    case 'top':
                    case 'top-start':
                    case 'top-end':
                        popoverElement.classList.add(ClassNames.PLACEMENTTOP);
                        break;
                    default:
                        popoverElement.classList.add(ClassNames.PLACEMENTBOTTOM);
                }
            }
        };

        /* private */

        Popover.prototype._bindHandlers = function _bindHandlers() {
            eventHandlers.add(this._popoverElement, 'tuikPopoverClose', Popover.handleClose, 'handlers');

            if (this._options.eventless) {
                eventHandlers.remove(this._popoverElement, 'keydown', Popover.handleKeydown, 'handlers');
                eventHandlers.remove(this._targetElement, 'keydown', Popover.handleKeydown, 'handlers');
            } else {
                eventHandlers.add(this._popoverElement, 'keydown', Popover.handleKeydown, 'handlers');
                eventHandlers.add(this._targetElement, 'keydown', Popover.handleKeydown, 'handlers');
            }

            if (this._options.closeOnRoot) {
                // && !this._options.eventless
                eventHandlers.add(document, 'click', Popover.handleDocumentAction, 'handlers');
                eventHandlers.add(document, 'keydown', Popover.handleDocumentAction, 'handlers');
            } else {
                eventHandlers.remove(document, 'click', Popover.handleDocumentAction, 'handlers');
                eventHandlers.remove(document, 'keydown', Popover.handleDocumentAction, 'handlers');
            }
        };

        Popover.prototype._addEventListeners = function _addEventListeners() {
            if (!this._targetElement || !this._popoverElement || this._options.eventless) {
                return;
            }
            var self = this;

            eventHandlers.add(this._targetElement, 'click', function (e) {
                if (!Utils.DOM.hasParentWithClass(e.target, ClassNames.POPOVER)) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.toggle();
                }
            });
        };

        return Popover;
    }(); // class

    return Popover;
}(Popper);

var Playbook = function () {

  var HIGHLIGHTOFFSET = 5;
  var TWO = 2;
  var ONE_SECOND_IN_MS = 1000;
  var currentStoryKey = void 0;
  var _stories = [];
  var _playedStoryKeys = void 0;
  var blanketElement = void 0;
  var highlightElement = void 0;
  var popover = void 0;
  var elementToHighlight = void 0;
  var _currentPageIndex = void 0;
  var currentPage = void 0;
  var pages = void 0;
  var _options = {};

  var eventHandlers = new Utils.EventHandlers('tuiPlaybook');

  var Playbook = function () {
    function Playbook() {
      classCallCheck$1(this, Playbook);
    }

    Playbook.play = function play(key, playbookOptions) {

      currentStoryKey = key;
      _currentPageIndex = 0;
      _options = playbookOptions || {};

      // -----
      _playedStoryKeys = []; // since phantomjs will return null instead of "null"
      if (Playbook.storageGet('_playedStoryKeys')) {
        _playedStoryKeys = JSON.parse(Playbook.storageGet('_playedStoryKeys')) || [];
      }

      if (!_options.forcePlay && Playbook.storyHasAlreadyBeenPlayed()) {
        return;
      }
      // ---

      if (Playbook.onBeforePlay) {
        Playbook.onBeforePlay(key);
      }

      Playbook.storageSet('_isPlaying', 'yes');
      Playbook.storageSet('_storyKey', key);
      Playbook.storageSet('_playbookOptions', JSON.stringify(playbookOptions));
      Playbook.storageSet('_currentPageIndex', _currentPageIndex);

      pages = Playbook.getStoryByKey(key).pages;

      Playbook.createBlanketElement();
      Playbook.displayCurrentPage();
      Playbook.bindEventHandlerToEscape();
    };

    Playbook.displayCurrentPage = function displayCurrentPage() {
      currentPage = pages[_currentPageIndex];
      this.renderPage(currentPage);
    };

    Playbook.storyHasAlreadyBeenPlayed = function storyHasAlreadyBeenPlayed() {
      for (var i = 0, len = _playedStoryKeys.length; i < len; i++) {
        if (_playedStoryKeys[i] === currentStoryKey) {
          return true;
        }
      }
      return false;
    };

    Playbook.renderPage = function renderPage(currentPage) {
      var counter = 5;

      var validate = function validate(element) {
        if (element === null) {
          return false;
        }
        Playbook.positionHighlightElement(element);
        popover = new Popover(element, Playbook.createPopoverElement(), {
          eventless: true,
          closeOnRoot: false,
          placement: currentPage.popoverPlacement,
          pointerless: currentPage.popoverIsPointerless
        });
        Playbook.setupPopoverContent();
        popover.show();
        return true;
      };

      elementToHighlight = document.querySelector(currentPage.selector);

      if (!validate(elementToHighlight)) {
        var timer = setInterval(function () {
          counter--;
          elementToHighlight = document.querySelector(currentPage.selector);

          if (counter === 0 || elementToHighlight) {
            clearInterval(timer);

            if (!validate(elementToHighlight)) {
              Playbook.stop();
              throw new Error('Element does not exist');
            }
          }
        }, ONE_SECOND_IN_MS);
      }
    };

    Playbook.resume = function resume() {
      if (Playbook.storageGet('_isPlaying') !== 'yes') {
        return;
      }

      _options = JSON.parse(Playbook.storageGet('_playbookOptions'));
      _currentPageIndex = parseInt(Playbook.storageGet('_currentPageIndex'), 10);
      _currentPageIndex = isNaN(_currentPageIndex) ? null : _currentPageIndex;

      _playedStoryKeys = JSON.parse(Playbook.storageGet('_playedStoryKeys')) || [];
      currentStoryKey = Playbook.storageGet('_storyKey');

      pages = Playbook.getStoryByKey(Playbook.storageGet('_storyKey')).pages;
      Playbook.createBlanketElement();
      Playbook.bindEventHandlerToEscape();
      Playbook.displayCurrentPage();
    };

    Playbook.saveStoryKeyToPlayedStoryKeys = function saveStoryKeyToPlayedStoryKeys() {
      if (!Playbook.storyHasAlreadyBeenPlayed(currentStoryKey)) {
        _playedStoryKeys.push(currentStoryKey);
        Playbook.storageSet('_playedStoryKeys', JSON.stringify(_playedStoryKeys));
      }
    };

    Playbook.stop = function stop() {
      if (_currentPageIndex + 1 === pages.length) {

        Playbook.saveStoryKeyToPlayedStoryKeys();
        if (Playbook.onBeforeCompleted) {
          Playbook.onBeforeCompleted(currentStoryKey);
        }
      } else {
        // eslint-disable-next-line
        if (Playbook.onBeforeCancel) {
          Playbook.onBeforeCancel(currentStoryKey, _currentPageIndex + 1);
        }
      }

      Playbook.storageSet('_isPlaying', null);
      Playbook.storageSet('_storyKey', null);
      Playbook.storageSet('_playbookOptions', null);
      Playbook.storageSet('_currentPageIndex', -1);
      Playbook.removeBlanket();
      Playbook.onPopoverClose();

      eventHandlers.remove(document, 'keydown', Playbook.onDocumentKeyDown, 'escape');
    };

    Playbook.createPopoverElement = function createPopoverElement() {
      var popoverElem = Playbook.popoverElement();

      if (popoverElem === null) {
        var popoverElement = Utils.DOM.createElement('<div class=\'tuiPopover js-playbook-popover tuiPopover--playbook\'>' + '   <header class="tuiPopover__header">' + '     <h1 class="tuiPopover__header__title js-playbook-popover-title"></h1>' + '   </header>' + '   <div class=\'tuiPopover__content\'>' + '     <div class=\'tuiPopover__contentText\'></div>' + '   </div>' + '   <div class=\'tuiPopover__pointer\'></div>' + '   <div class=\'tuiPopover__footer\'>' + '     <a href="#" class=\'js-popover-got-it-button\'>Don\'t show me again</a>' + '     <button class=\'tuiButton js-popover-ok-button\'>Next</button>' + '   </div>' + '</div>');

        document.body.appendChild(popoverElement);
        Playbook.bindEventListenersToFooterButtons();

        return popoverElement;
      }
      return popoverElem;
    };

    Playbook.optOutClick = function optOutClick(e) {
      e.preventDefault();

      Playbook.saveStoryKeyToPlayedStoryKeys();
      Playbook.stop();
    };

    Playbook.setupPopoverContent = function setupPopoverContent() {
      var title = Playbook.storyTitle || 'Step {0} of {1}';

      document.querySelector('.tuiPopover__contentText').innerHTML = currentPage.content;
      document.querySelector('.js-playbook-popover-title').innerHTML = title.replace('{0}', JSON.parse(Playbook.storageGet('_currentPageIndex')) + 1).replace('{1}', pages.length);

      if (currentPage.optOutLabel) {
        Playbook.renameElement('.js-popover-got-it-button', currentPage.optOutLabel);
      }

      if (currentPage.actionLabel) {
        Playbook.renameElement('.js-popover-ok-button', currentPage.actionLabel);
      } else if (_currentPageIndex + 1 === pages.length) {
        Playbook.renameElement('.js-popover-ok-button', 'Done');
      } else {
        Playbook.renameElement('.js-popover-ok-button', 'Next');
      }
    };

    Playbook.bindEventListenersToFooterButtons = function bindEventListenersToFooterButtons() {
      var _this = this;

      var footerOkButton = document.querySelector('.js-popover-ok-button');
      var footerGotItButton = document.querySelector('.js-popover-got-it-button');

      footerOkButton.addEventListener('click', function () {
        _this.onNextClick();
      });

      footerGotItButton.addEventListener('click', function (e) {
        _this.optOutClick(e);
      });
    };

    Playbook.onDocumentKeyDown = function onDocumentKeyDown(e) {
      if (e.which === Utils.KEYCODES.ESCAPE) {
        Playbook.stop();
      }
    };

    Playbook.bindEventHandlerToEscape = function bindEventHandlerToEscape() {
      eventHandlers.add(document, 'keydown', Playbook.onDocumentKeyDown, 'escape');
    };

    Playbook.createBlanketElement = function createBlanketElement() {
      if (document.querySelectorAll('.tuiBlanket--playbook').length !== 0) {
        return;
      }

      blanketElement = Utils.DOM.createElement('<div class=\'tuiBlanket tuiBlanket--playbook tuiBlanket--subtle\'></div>');
      highlightElement = Utils.DOM.createElement('<div class=\'tuiBlanket__playbook-highlight\'></div>');

      blanketElement.appendChild(highlightElement);
      document.body.appendChild(blanketElement);

      document.body.classList.add('tuiBlanket-is-displayed');
    };

    Playbook.positionHighlightElement = function positionHighlightElement(elementToHighlight) {

      var elementPosition = elementToHighlight.getBoundingClientRect();

      highlightElement.style.top = elementPosition.top - HIGHLIGHTOFFSET + 'px';
      highlightElement.style.left = elementPosition.left - HIGHLIGHTOFFSET + 'px';
      highlightElement.style.width = elementPosition.width + HIGHLIGHTOFFSET * TWO + 'px';
      highlightElement.style.height = elementPosition.height + HIGHLIGHTOFFSET * TWO + 'px';
      highlightElement.classList.add('tuiBlanket--playbook-highlight--transition');
    };

    Playbook.getStoryByKey = function getStoryByKey(key) {
      var stories = this.stories();
      var storyToPlay = void 0;

      for (var i = 0, len = stories.length; i < len; i++) {
        if (stories[i].key === key) {
          storyToPlay = stories[i];
        }
      }

      if (storyToPlay) {
        return storyToPlay;
      }

      throw new Error('Unknown story key');
    };

    Playbook.addStory = function addStory(story) {
      var isDuplicate = false;
      for (var i = 0, len = _stories.length; i < len; i++) {
        if (story.key === _stories[i].key) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) {
        throw new Error('duplicate stories');
      } else {
        _stories.push(story);
      }
    };

    Playbook.onNextClick = function onNextClick() {

      if (currentPage.onNextClick) {
        _currentPageIndex++;
        Playbook.storageSet('_currentPageIndex', _currentPageIndex);

        currentPage.onNextClick();
      } else {
        if (!pages[_currentPageIndex + 1]) {
          Playbook.stop();
          return;
        }

        _currentPageIndex++;
        Playbook.storageSet('_currentPageIndex', _currentPageIndex);
        Playbook.displayCurrentPage();
      }
    };

    Playbook.storageGet = function storageGet(key) {
      return localStorage.getItem(key);
    };

    Playbook.storageSet = function storageSet(key, value) {
      localStorage.setItem(key, value);
    };

    Playbook.stories = function stories() {
      return _stories;
    };

    Playbook.options = function options() {
      return _options;
    };

    Playbook.currentPageIndex = function currentPageIndex() {
      return _currentPageIndex;
    };

    Playbook.playedStoryKeys = function playedStoryKeys() {
      return _playedStoryKeys;
    };

    Playbook.clearStories = function clearStories() {
      _stories = [];
    };

    Playbook.onPopoverClose = function onPopoverClose() {
      var popoverElem = Playbook.popoverElement();
      if (popoverElem !== null) {
        popover.close();
      }
    };

    Playbook.popoverElement = function popoverElement() {
      return document.querySelector('.js-playbook-popover');
    };

    Playbook.renameElement = function renameElement(className, text) {
      document.querySelector(className).innerHTML = text;
    };

    Playbook.removeBlanket = function removeBlanket() {
      blanketElement.parentElement.removeChild(blanketElement);
      document.body.classList.remove('tuiBlanket-is-displayed');
    };

    return Playbook;
  }();

  return Playbook;
}();

var PlaybookPage = function () {
    var PlaybookPage = function () {
        function PlaybookPage(page) {
            classCallCheck$1(this, PlaybookPage);

            if (!page.selector) {
                throw new Error('Page does not have selector');
            } else if (!page.content) {
                throw new Error('Page does not have content');
            } else {
                this._selector = page.selector;
                this._content = page.content;
                this._actionLabel = page.actionLabel;
                this._optOutLabel = page.optOutLabel;
                this._onNextClick = page.onNextClick;
                this._onBeforeCancelClick = page.onBeforeCancelClick;
                this._popoverPlacement = page.popoverPlacement;
                this._popoverIsPointerless = page.popoverIsPointerless;
            }
        }

        createClass$1(PlaybookPage, [{
            key: 'selector',
            get: function get() {
                if (typeof this._selector === 'function') {
                    return this._selector();
                }
                return this._selector;
            }
        }, {
            key: 'content',
            get: function get() {
                return this._content;
            }
        }, {
            key: 'actionLabel',
            get: function get() {
                return this._actionLabel;
            }
        }, {
            key: 'optOutLabel',
            get: function get() {
                return this._optOutLabel;
            }
        }, {
            key: 'onNextClick',
            get: function get() {
                return this._onNextClick;
            }
        }, {
            key: 'onBeforeCancelClick',
            get: function get() {
                return this._onBeforeCancelClick;
            }
        }, {
            key: 'popoverPlacement',
            get: function get() {
                return this._popoverPlacement || '';
            }
        }, {
            key: 'popoverIsPointerless',
            get: function get() {
                return this._popoverIsPointerless || false;
            }
        }]);
        return PlaybookPage;
    }();

    return PlaybookPage;
}();

var PlaybookStory = function () {
    var PlaybookStory = function () {
        function PlaybookStory(story) {
            classCallCheck$1(this, PlaybookStory);

            if (!story.key) {
                throw new Error('The story has no key');
            } else {
                this._key = story.key;
                this._pages = story.pages || [];
            }
        }

        PlaybookStory.prototype.addPage = function addPage(page) {
            var playbookPage = new PlaybookPage(page);
            this._pages.push(playbookPage);
        };

        createClass$1(PlaybookStory, [{
            key: 'key',
            get: function get() {
                return this._key;
            }
        }, {
            key: 'pages',
            get: function get() {
                return this._pages;
            }
        }]);
        return PlaybookStory;
    }();

    return PlaybookStory;
}();

var Polyfills = function () {
  // OBJECT ASSIGN
  if (typeof Object.assign != 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
      value: function assign(target, varArgs) {
        // .length of function is 2
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
            classCallCheck$1(this, Tab);

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

var Tooltip = function () {
    var eventHandlers = new Utils.EventHandlers('tuiTooltip');
    var FADE_CSS_ANIMATION_DELAY_MS = 300; // refs to the .tuiTooltip.tuiFade.in and .tuiTooltip.tuiFade.out classes

    var ClassNames = {
        TOOLTIP: 'js-tuiTooltip-injected',
        TOOLTIP_CONTENT: 'js-tuiTooltip-content',
        TOOLTIP_MANAGED_POINTER: 'tuiTooltip__pointer--managed',
        ISOPEN: 'tuiTooltip-is-visible',
        ANIMATE: 'tuiFade',
        ANIMATE_OPEN: 'in',
        ANIMATE_CLOSE: 'out',
        PLACEMENTLEFT: 'tuiTooltip--left',
        PLACEMENTRIGHT: 'tuiTooltip--right',
        PLACEMENTTOP: 'tuiTooltip--top',
        PLACEMENTBOTTOM: 'tuiTooltip--bottom',
        DATA_TITLE: 'data-tuiTooltip-title',
        DATA_POSITION: 'data-tuiTooltip-placement'
    };

    var defaultOptions = {
        animate: false,
        placement: 'bottom',
        triggerCouldBeRemoved: false,
        popper: {
            modifiers: {
                arrow: {
                    element: '.tuiTooltip__pointer'
                },
                flip: {
                    enabled: true
                }
            }
        }
    };

    var Tooltip = function () {
        // constructor(triggerRef) managed
        // constructor(triggerRef, options) managed
        // constructor(triggerRef, tooltipRef) unmanaged
        // constructor(triggerRef, tooltipRef, options) unmanaged
        function Tooltip(triggersRef, tooltipRef, options) {
            classCallCheck$1(this, Tooltip);

            // validating dependencies
            if (typeof Popper === 'undefined') {
                throw new Error('TUIK requires Popper.js (https://popper.js.org)');
            }

            var isManaged = this.isManaged(arguments); // eslint-disable-line
            var triggerElements = Utils.DOM.refToElements(triggersRef);
            var tooltipElement = Utils.DOM.refToElement(tooltipRef);

            defaultOptions.managedTooltip = isManaged;
            if (isManaged) {
                options = tooltipRef;
            }

            this._options = Object.assign({}, defaultOptions, options);
            this.triggerElements = triggerElements;
            this.tooltipElement = tooltipElement;

            this._initialize();

            return this;
        }

        Tooltip.prototype.isManaged = function isManaged(args) {
            var isManaged = true;

            // eslint-disable-next-line
            if (args.length === 3) {
                isManaged = false;
            }

            // if the second arg is a DOM element or a CSS selector (string)
            if (Utils.DOM.isNode(args[1]) || Utils.DOM.isElement(args[1]) || typeof args[1] === 'string') {
                isManaged = false;
            }

            return isManaged;
        };

        // static


        Tooltip.handleTipMouseOver = function handleTipMouseOver(e) {
            if (!e) {
                return;
            }

            e.currentTarget.showTooltip();
        };

        Tooltip.handleTipMouseOut = function handleTipMouseOut(e) {
            if (!e) {
                return;
            }

            e.currentTarget.hideTooltip();
        };

        Tooltip.create = function create(options) {
            var tooltipElement = document.querySelector('.' + ClassNames.TOOLTIP);

            // <fix> popper where the positioning is off when we reuse the same element
            if (tooltipElement) {
                // <fix> IE
                // tooltipElement.remove();
                tooltipElement.parentElement.removeChild(tooltipElement);
                // </fix>
            }

            // if (!tooltipElement) {
            tooltipElement = Utils.DOM.createElement('<div class="tuiTooltip ' + ClassNames.TOOLTIP + '">' + ('   <div class="tuiTooltip__content ' + ClassNames.TOOLTIP_CONTENT + '">') + '   </div>' + ('   <div class="tuiTooltip__pointer ' + ClassNames.TOOLTIP_MANAGED_POINTER + '"></div>') + '</div>');

            document.querySelector('body').appendChild(tooltipElement);
            // }
            // </fix>

            if (options.animate) {
                tooltipElement.classList.add(ClassNames.ANIMATE);
            }

            return tooltipElement;
        };

        Tooltip.populate = function populate(targetElement, tooltipElement) {
            var title = Utils.DOM.escape(targetElement.getAttribute(ClassNames.DATA_TITLE) || tooltipElement.querySelector('.' + ClassNames.TOOLTIP_CONTENT).innerHTML.trim());

            if (title) {
                tooltipElement.querySelector('.' + ClassNames.TOOLTIP_CONTENT).innerHTML = title;
            }

            return title;
        };

        Tooltip.place = function place(toolTipElement, placement) {
            toolTipElement.classList.remove(ClassNames.PLACEMENTLEFT);
            toolTipElement.classList.remove(ClassNames.PLACEMENTRIGHT);
            toolTipElement.classList.remove(ClassNames.PLACEMENTTOP);
            toolTipElement.classList.remove(ClassNames.PLACEMENTBOTTOM);

            switch (placement) {
                case 'left':
                    toolTipElement.classList.add(ClassNames.PLACEMENTLEFT);
                    break;
                case 'right':
                    toolTipElement.classList.add(ClassNames.PLACEMENTRIGHT);
                    break;
                case 'top':
                    toolTipElement.classList.add(ClassNames.PLACEMENTTOP);
                    break;
                default:
                    toolTipElement.classList.add(ClassNames.PLACEMENTBOTTOM);
            }
        };

        Tooltip.getInitialPosition = function getInitialPosition(targetElement, options) {
            var placement = targetElement.getAttribute(ClassNames.DATA_POSITION);

            if (!placement) {
                placement = options.placement;
            }

            return placement;
        };

        // private

        Tooltip.prototype._initialize = function _initialize() {
            for (var i = 0, len = this.triggerElements.length; i < len; i++) {
                this._bindTooltip(this.triggerElements[i]);
            }
        };

        Tooltip.prototype._bindTooltip = function _bindTooltip(triggerElement) {
            this._manageTitle(triggerElement);
            this._injectHandlers(triggerElement);
            this._addEventListeners(triggerElement);
            this._bindObserver(triggerElement);
        };

        Tooltip.prototype._manageTitle = function _manageTitle(triggerElement) {
            var title = triggerElement.getAttribute('title');

            if (title) {
                triggerElement.setAttribute('title', '');
                triggerElement.setAttribute(ClassNames.DATA_TITLE, title);
            }
        };

        Tooltip.prototype._injectHandlers = function _injectHandlers(triggerElement) {
            var _this = this;

            var show = function show() {
                _this.isClosingWithAnimation = false;
                var tooltipElement = void 0;

                var onPopperUpdate = function onPopperUpdate(data) {
                    Tooltip.place(data.instance.popper, data.placement);
                };

                if (_this._options.managedTooltip) {
                    tooltipElement = Tooltip.create(_this._options);
                    if (!Tooltip.populate(triggerElement, tooltipElement)) {
                        return;
                    }
                } else {
                    tooltipElement = _this.tooltipElement;
                }

                if (!tooltipElement) {
                    return;
                }

                if (_this._options.animate) {
                    tooltipElement.classList.add(ClassNames.ANIMATE_OPEN);
                } else {
                    tooltipElement.classList.add(ClassNames.ISOPEN);
                }

                _this._popper = new Popper(triggerElement, tooltipElement, {
                    placement: Tooltip.getInitialPosition(triggerElement, _this._options),
                    modifiers: _this._options.popper.modifiers,
                    onUpdate: onPopperUpdate,
                    onCreate: onPopperUpdate
                });

                _this._popper.update();
            };

            var hide = function hide() {
                _this.isClosingWithAnimation = _this._options.animate;
                var tooltipElement = document.querySelector('.' + ClassNames.TOOLTIP);

                if (_this._options.managedTooltip) {
                    tooltipElement = document.querySelector('.' + ClassNames.TOOLTIP);
                } else {
                    tooltipElement = _this.tooltipElement;
                }

                if (!tooltipElement) {
                    return;
                }

                if (_this._options.animate) {
                    tooltipElement.classList.remove(ClassNames.ANIMATE_OPEN);
                    tooltipElement.classList.add(ClassNames.ANIMATE_CLOSE);

                    setTimeout(function () {
                        if (_this.isClosingWithAnimation) {
                            tooltipElement.classList.remove(ClassNames.ANIMATE);
                            tooltipElement.classList.remove(ClassNames.ANIMATE_CLOSE);
                        }
                    }, FADE_CSS_ANIMATION_DELAY_MS);
                } else {
                    tooltipElement.classList.remove(ClassNames.ISOPEN);
                }
            };

            triggerElement.showTooltip = show;
            triggerElement.hideTooltip = hide;
        };

        Tooltip.prototype._addEventListeners = function _addEventListeners(triggerElement) {
            eventHandlers.add(triggerElement, 'mouseover', Tooltip.handleTipMouseOver);
            eventHandlers.add(triggerElement, 'mouseout', Tooltip.handleTipMouseOut);
        };

        Tooltip.prototype._bindObserver = function _bindObserver(triggerElement) {
            if (!this._options.triggerCouldBeRemoved) {
                return;
            }

            if (triggerElement.observer) {
                triggerElement.observer.disconnect();
            }

            var onDOMMutated = function onDOMMutated(mutationRecords) {
                mutationRecords.forEach(function (mutationRecord) {
                    for (var i = 0, len = mutationRecord.removedNodes.length; i < len; i++) {
                        if (mutationRecord.removedNodes[i] === triggerElement) {
                            triggerElement.hideTooltip();
                            triggerElement.observer.disconnect();
                            break;
                        }
                    }
                });
            };

            var observer = new MutationObserver(onDOMMutated);
            triggerElement.observer = observer;
            triggerElement.observer.observe(triggerElement.parentElement, {
                childList: true
            });
        };

        return Tooltip;
    }(); // class

    return Tooltip;
}(Popper);

exports.Polyfills = Polyfills;
exports.Utils = Utils;
exports.Dropdown = Dropdown;
exports.Tab = Tab;
exports.Tooltip = Tooltip;
exports.Popover = Popover;
exports.Playbook = Playbook;
exports.PlaybookPage = PlaybookPage;
exports.PlaybookStory = PlaybookStory;

return exports;

}({}));
