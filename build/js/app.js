!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),(f.app||(f.app={})).js=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
//     ramda.js 0.0.1
//     https://github.com/CrossEye/ramda
//     (c) 2013-2014 Scott Sauyet and Michael Hurley
//     Ramda may be freely distributed under the MIT license.

// Ramda
// -----
// A practical functional library for Javascript programmers.  This is a collection of tools to make it easier to
// use Javascript as a functional programming language.  (The name is just a silly play on `lambda`, even though we're
// not actually involved in the manipulation of lambda expressions.)

// Basic Setup
// -----------
// Uses a technique from the [Universal Module Definition][umd] to wrap this up for use in Node.js or in the browser,
// with or without an AMD-style loader.
//
//  [umd]: https://github.com/umdjs/umd/blob/master/returnExports.js

(function (root, factory) {if (typeof exports === 'object') {module.exports = factory(root);} else if (typeof define === 'function' && define.amd) {define(factory);} else {root.ramda = factory(root);}}(this, function (global) {

    return  (function() {

        // This object is what is actually returned, with all the exposed functions attached as properties.

        var R = {};

        // Internal Functions and Properties
        // ---------------------------------

        var undef = (function(){})(), EMPTY;

        // Makes a public alias for one of the public functions:
        var aliasFor = function(oldName) {
            var fn = function(newName) {R[newName] = R[oldName]; return fn;};
            fn.is = fn.are = fn.and = fn;
            return fn;
        };

        // `slice` implemented iteratively for performance
        var slice = function (args, from, to) {
            var i, arr = [];
            from = from || 0;
            to = to || args.length;
            for (i = from; i < to; i++) {
                arr[arr.length] = args[i];
            }
            return arr;
        };

        var isArray = function(val) {return Object.prototype.toString.call(val) === "[object Array]";};

        // Returns a curried version of the supplied function.  For example:
        //
        //      var discriminant = function(a, b, c) {
        //          return b * b - 4 * a * c;
        //      };
        //      var f = curry(discriminant);
        //      var g = f(3), h = f(3, 7) i = g(7);
        //      i(4) ≅ h(4) == g(7, 4) == f(3, 7, 4) == 1
        //
        //  Almost all exposed functions of more than one parameter already have curry applied to them.
        var _ = R.curry = function(fn) {
            var fnArity = fn.length;
            var f = function(args) {
                return arity(Math.max(fnArity - (args && args.length || 0), 0), function () {
                    var newArgs = (args || []).concat(slice(arguments, 0));
                    if (newArgs.length >= fnArity) {
                        return fn.apply(this, newArgs);
                    }
                    else {return f(newArgs);}
                });
            };

            return f([]);
        };

        var mkArgStr = function(n) {
            var arr = [], idx = -1;
            while(++idx < n) {
                arr[idx] = "arg" + idx;
            }
            return arr.join(", ");
        };

        // Wraps a function that may be nullary, or may take fewer than or more than `n` parameters, in a function that
        // specifically takes exactly `n` parameters.  Any extraneous parameters will not be passed on to the function
        // supplied
        var nAry = R.nAry = (function() {
            var cache = {};


            //     For example:
            //     cache[3] = function(func) {
            //         return function(arg0, arg1, arg2) {
            //             return func.call(this, arg0, arg1, arg2);
            //         }
            //     };

            var makeN = function(n) {
                var fnArgs = mkArgStr(n);
                var body = [
                    "    return function(" + fnArgs + ") {",
                    "        return func.call(this" + (fnArgs ? ", " + fnArgs : "") + ");",
                    "    }"
                ].join("\n");
                return new Function("func", body);
            };

            return function(n, fn) {
                return (cache[n] || (cache[n] = makeN(n)))(fn);
            };
        }());

        // Wraps a function that may be nullary, or may take fewer than or more than `n` parameters, in a function that
        // specifically takes exactly `n` parameters.  Note, though, that all parameters supplied will in fact be
        // passed along, in contrast with `nAry`, which only passes along the exact number specified.
        var arity = R.arity = (function() {
            var cache = {};

            //     For example:
            //     cache[3] = function(func) {
            //         return function(arg0, arg1, arg2) {
            //             return func.apply(this, arguments);
            //         }
            //     };

            var makeN = function(n) {
                var fnArgs = mkArgStr(n);
                var body = [
                    "    return function(" + fnArgs + ") {",
                    "        return func.apply(this, arguments);",
                    "    }"
                ].join("\n");
                return new Function("func", body);
            };

            return function(n, fn) {
                return (cache[n] || (cache[n] = makeN(n)))(fn);
            };
        }());

        // Turns a named method of an object (or object prototype) into a function that can be called directly.
        // The object becomes the last parameter to the function, and the function is automatically curried.
        // Passing the optional `len` parameter restricts the function to the initial `len` parameters of the method.
        var invoker = R.invoker = function(name, obj, len) {
            var method = obj[name];
            var length = len === undef ? method.length : len;
            return method && _(nAry(length + 1, function() {
                if(arguments.length) {
                    var target = Array.prototype.pop.call(arguments);
                    var targetMethod = target[name];
                    if (targetMethod == method) {
                        return targetMethod.apply(target, arguments);
                    }
                }
                return undef;
            }));
        };

        // Creates a new function that calls the function `fn` with parameters consisting of  the result of the
        // calling each supplied handler on successive arguments, followed by all unmatched arguments.
        //
        // If there are extra _expected_ arguments that don't need to be transformed, although you can ignore
        // them, it might be best to pass in and identity function so that the new function correctly reports arity.
        // See for example, the definition of `project`, below.
        var useWith = R.useWith = function(fn /*, transformers */) {
            var transformers = slice(arguments, 1);
            var tlen = transformers.length;
            return _(arity(tlen, function() {
                var args = [], idx = -1;
                while (++idx < tlen) {
                    args.push(transformers[idx](arguments[idx]));
                }
                return fn.apply(this, args.concat(slice(arguments, tlen)));
            }));
        };

        // A two-step version of the `useWith` function.  This would allow us to write `project`, currently written
        // as `useWith(map, pickAll, identity)`, as, instead, `use(map).over(pickAll, identity)`, which is a bit
        // more explicit.
        // TODO: One of these versions should be eliminated eventually.  So not worrying about the duplication for now.
        R.use = function(fn) {
            return {
                over: function(/*transformers*/) {
                    var transformers = slice(arguments, 0);
                    var tlen = transformers.length;
                    return _(arity(tlen, function() {
                        var args = [], idx = -1;
                        while (++idx < tlen) {
                            args.push(transformers[idx](arguments[idx]));
                        }
                        return fn.apply(this, args.concat(slice(arguments, tlen)));
                    }));
                }
            };
        };


        // Fills out an array to the specified length. Internal private function.
        var expand = function(a, len) {
            var arr = a ? isArray(a) ? a : slice(a) : [];
            while(arr.length < len) {arr[arr.length] = undef;}
            return arr;
        };

        // Internal version of `forEach`.  Possibly to be exposed later.
        var each = _(function(fn, arr) {
            for (var i = 0, len = arr.length; i < len; i++) {
                fn(arr[i]);
            }
        });

        // Shallow copy of an array.
        var clone = R.clone = function(list) {
            return list.concat();
        };


        // Core Functions
        // --------------
        //

        //   Prototypical (or only) empty list
        EMPTY = [];

        // Boolean function which reports whether a list is empty.
        var isEmpty = R.isEmpty = function(arr) {return !arr || !arr.length;};

        // Returns a new list with the new element at the front and the existing elements following
        var prepend = R.prepend = function(el, arr) {return [el].concat(arr);};
        aliasFor("prepend").is("cons");

        //  Returns the first element of a list
        var head = R.head = function(arr) {
            arr = arr || EMPTY;
            return (arr.length) ? arr[0] : null; 
        };
        aliasFor("head").is("car"); 

        // Returns the rest of the list after the first element.
        // If the passed-in list is a Generator, it will return the 
        // next iteration of the Generator.
        var tail = R.tail = function(arr) {
            arr = arr || EMPTY;
            if (arr.length === Infinity) {
                return arr.tail();
            }
            return (arr.length > 1) ? slice(arr, 1) : null;
        };
        aliasFor("tail").is("cdr");

        //   Boolean function which is `true` for non-list, `false` for a list.
        R.isAtom = function(x) {
            return (x !== null) && (x !== undef) && Object.prototype.toString.call(x) !== "[object Array]";
        };

        // Returns a new list with the new element at the end of a list following all the existing ones.
        R.append = function(el, list) {
            var newList = clone(list);
            newList.push(el);
            return newList;
        };
        aliasFor("append").is("push");

        // Returns a new list consisting of the elements of the first list followed by the elements of the second.
        var merge = R.merge = _(function(list1, list2) {
            if (isEmpty(list1)) {
                return clone(list2);
            } else {
                return list1.concat(list2);
            }
        });
        aliasFor("merge").is("concat");

        // A surprisingly useful function that does nothing but return the parameter supplied to it.
        var identity = R.identity = function(x) {return x;};
        aliasFor("identity").is("I");



        // Generators
        // ----------
        //

        // Support for infinite lists, using an initial seed, a function that calculates the head from the seed and
        // a function that creates a new seed from the current seed.  Generator objects have this structure:
        //
        //     {
        //        "0": someValue,
        //        tail: someFunction() {},
        //        length: Infinity
        //     }
        //
        // Generator objects also have such functions as `take`, `skip`, `map`, and `filter`, but the equivalent
        // functions from Ramda will work with them as well.
        //
        // ### Example ###
        //
        //     var fibonacci = generator(
        //         [0, 1],
        //         function(pair) {return pair[0];},
        //         function(pair) {return [pair[1], pair[0] + pair[1]];}
        //     );
        //     var even = function(n) {return (n % 2) === 0;};
        //
        //     take(5, filter(even, fibonacci)) //=> [0, 2, 8, 34, 144]
        //
        // Note that the `take(5)` call is necessary to get a finite list out of this.  Otherwise, this would still
        // be an infinite list.

        R.generator = (function() {
            // partial shim for Object.create
            var create = (function() {
                var F = function() {};
                return function(src) {
                    F.prototype = src;
                    return new F();
                };
            }());

            // Trampolining to support recursion in Generators
            var trampoline = function(fn) {
                var result = fn.apply(this, tail(arguments));
                while (typeof result === "function") {
                    result = result();
                }
                return result;
            };
            // Internal Generator constructor
            var  G = function(seed, current, step) {
                this["0"] = current(seed);
                this.tail = function() {
                    return new G(step(seed), current, step);
                };
            };
            // Generators can be used with OO techniques as well as our standard functional calls.  These are the
            // implementations of those methods and other properties.
            G.prototype = {
                 constructor: G,
                 // All generators are infinite.
                 length: Infinity,
                 // `take` implementation for generators.
                 take: function(n) {
                     var take = function(ctr, g, ret) {
                         return (ctr === 0) ? ret : take(ctr - 1, g.tail(), ret.concat([g[0]]));
                     };
                     return trampoline(take, n, this, []);
                 },
                 // `skip` implementation for generators.
                 skip: function(n) {
                     var skip = function(ctr, g) {
                         return (ctr <= 0) ? g : skip(ctr - 1, g.tail());
                     };
                     return trampoline(skip, n, this);
                 },
                 // `map` implementation for generators.
                 map: function(fn, gen) {
                     var g = create(G.prototype);
                     g[0] = fn(gen[0]);
                     g.tail = function() { return this.map(fn, gen.tail()); };
                     return g;
                 },
                 // `filter` implementation for generators.
                 filter: function(fn) {
                     var gen = this, head = gen[0];
                     while (!fn(head)) {
                         gen = gen.tail();
                         head = gen[0];
                     }
                     var g = create(G.prototype);
                     g[0] = head;
                     g.tail = function() {return filter(fn, gen.tail());};
                     return g;
                 }
            };

            // The actual public `generator` function.
            return function(seed, current, step) {
                return new G(seed, current, step);
            };
        }());


        // Function functions :-)
        // ----------------------
        //
        // These functions make new functions out of old ones.

        // --------

        // Creates a new function that runs each of the functions supplied as parameters in turn, passing the output
        // of each one to the next one, starting with whatever arguments were passed to the initial invocation.
        // Note that if `var h = compose(f, g)`, `h(x)` calls `g(x)` first, passing the result of that to `f()`.
        var compose = R.compose = function() {  // TODO: type check of arguments?
            var fns = slice(arguments);
            return function() {
                return foldr(function(args, fn) { return [fn.apply(this, args)]; }, slice(arguments), fns)[0];
            };
        };

        // Similar to `compose`, but processes the functions in the reverse order so that if if `var h = pipe(f, g)`,
        // `h(x)` calls `f(x)` first, passing the result of that to `g()`.
        R.pipe = function() { // TODO: type check of arguments?
            return compose.apply(this, slice(arguments).reverse());
        };
        aliasFor("pipe").is("sequence");

        // Returns a new function much like the supplied one except that the first two arguments are inverted.
        var flip = R.flip = function(fn) {
            return _(function(a, b) {
                return fn.apply(this, [b, a].concat(slice(arguments, 2)));
            });
        };

//        // Returns a new function much like the supplied one except that the first argument is cycled to the end.
//        R.cycle = function(fn) {
//            return nAry(fn.length, function() {
//                return fn.apply(this, slice(arguments, 1, fn.length).concat(arguments[0]));
//            });
//        };

        // Creates a new function that acts like the supplied function except that the left-most parameters are
        // pre-filled.
        R.lPartial = function (fn) {
            var args = slice(arguments, 1);
            return arity(Math.max(fn.length - args.length, 0), function() {
                return fn.apply(this, args.concat(slice(arguments)));
            });
        };
        aliasFor("lPartial").is("applyLeft");

        // Creates a new function that acts like the supplied function except that the right-most parameters are
        // pre-filled.
        R.rPartial =function (fn) {
            var args = slice(arguments, 1);
            return arity(Math.max(fn.length - args.length, 0), function() {
                return fn.apply(this, slice(arguments).concat(args));
            });
        };
        aliasFor("rPartial").is("applyRight");

        // Creates a new function that stores the results of running the supplied function and returns those
        // stored value when the same request is made.  **Note**: this really only handles string and number parameters.
        R.memoize = function(fn) {
            var cache = {};
            return function() {
                var position = foldl(function(cache, arg) {return cache[arg] || (cache[arg] = {});}, cache,
                        slice(arguments, 0, arguments.length - 1));
                var arg = arguments[arguments.length - 1];
                return (position[arg] || (position[arg] = fn.apply(this, arguments)));
            };
        };

        // Wraps a function up in one that will only call the internal one once, no matter how many times the outer one
        // is called.  ** Note**: this is not really pure; it's mostly meant to keep side-effects from repeating.
        R.once = function(fn) {
            var called = false, result;
            return function() {
                if (called) {return result;}
                called = true;
                result = fn.apply(this, arguments);
                return result;
            };
        };

        // Wrap a function inside another to allow you to make adjustments to the parameters or do other processing
        // either before the internal function is called or with its results.
        R.wrap = function(fn, wrapper) {
            return function() {
                return wrapper.apply(this, [fn].concat(slice(arguments)));
            };
        };

        // Wraps a constructor function inside a (curried) plain function that can be called with the same arguments
        // and returns the same type.  Allows, for instance,
        //
        //     var Widget = function(config) { /* ... */ }; // Constructor
        //     Widget.prototype = { /* ... */ }
        //     map(construct(Widget), allConfigs); //=> list of Widgets
        R.construct = function(fn) {
            var f = function() {
                var obj = new fn();
                fn.apply(obj, arguments);
                return obj;
            };
            return fn.length > 1 ? _(nAry(fn.length, f)) : f;
        };



        // List Functions
        // --------------
        //
        // These functions operate on logical lists, here plain arrays.  Almost all of these are curried, and the list
        // parameter comes last, so you can create a new function by supplying the preceding arguments, leaving the
        // list parameter off.  For instance:
        //
        //     // skip third parameter
        //     var checkAllPredicates = reduce(andFn, alwaysTrue);
        //     // ... given suitable definitions of odd, lt20, gt5
        //     var test = checkAllPredicates([odd, lt20, gt5]);
        //     // test(7) => true, test(9) => true, test(10) => false,
        //     // test(3) => false, test(21) => false,

        // --------

        // Returns a single item, by successively calling the function with the current element and the the next
        // element of the list, passing the result to the next call.  We start with the `acc` parameter to get
        // things going.  The function supplied should accept this running value and the latest element of the list,
        // and return an updated value.
        var foldl = R.foldl = _(function(fn, acc, list) {
            var idx = -1, len = list.length;
            while(++idx < len) {
                acc = fn(acc, list[idx]);
            }
            return acc;
        });
        aliasFor("foldl").is("reduce");

        // Much like `foldl`/`reduce`, except that this takes as its starting value the first element in the list.
        R.foldl1 = _(function (fn, list) {
            if (isEmpty(list)) {
                throw new Error("foldl1 does not work on empty lists");
            }
            return foldl(fn, head(list), tail(list));
        });

        // Similar to `foldl`/`reduce` except that it moves from right to left on the list.
        var foldr = R.foldr =_(function(fn, acc, list) {
            var idx = list.length;
            while(idx--) {
                acc = fn(acc, list[idx]);
            }
            return acc;

        });
        aliasFor("foldr").is("reduceRight");


        // Much like `foldr`/`reduceRight`, except that this takes as its starting value the last element in the list.
        R.foldr1 = _(function (fn, list) {
            if (isEmpty(list)) {
                throw new Error("foldr1 does not work on empty lists");
            }
            var newList = clone(list), acc = newList.pop();
            return foldr(fn, acc, newList);
        });

        // Builds a list from a seed value, using a function that returns falsy to quit and a pair otherwise,
        // consisting of the current value and the seed to be used for the next value.

        R.unfoldr = _(function(fn, seed) {
            var pair = fn(seed), result = [];
            while (pair && pair.length) {
                result.push(pair[0]);
                pair = fn(pair[1]);
            }
            return result;
        });


        // Returns a new list constructed by applying the function to every element of the list supplied.
        var map = R.map = _(function(fn, list) {
            if (list && list.length === Infinity) {
                return list.map(fn, list);
            }
            var idx = -1, len = list.length, result = new Array(len);
            while (++idx < len) {
                result[idx] = fn(list[idx]);
            }
            return result;
        });

        // Reports the number of elements in the list
        R.size = function(arr) {return arr.length;};

        // (Internal use only) The basic implementation of filter.
        var internalFilter = _(function(useIdx, fn, list) {
            if (list && list.length === Infinity) {
                return list.filter(fn); // TODO: figure out useIdx
            }
            var idx = -1, len = list.length, result = [];
            while (++idx < len) {
                if (!useIdx && fn(list[idx]) || fn(list[idx], idx, list)) {
                    result.push(list[idx]);
                }
            }
            return result;
        });

        // Returns a new list containing only those items that match a given predicate function.
        var filter = R.filter = internalFilter(false);

        // Like `filter`, but passes additional parameters to the predicate function.  Parameters are
        // `list item`, `index of item in list`, `entire list`.
        //
        // Example:
        //
        //     var lastTwo = function(val, idx, list) {
        //         return list.length - idx <= 2;
        //     };
        //     filter.idx(lastTwo, [8, 6, 7, 5, 3, 0 ,9]); //=> [0, 9]
        filter.idx = internalFilter(true);

        // Similar to `filter`, except that it keeps only those that **don't** match the given predicate functions.
        var reject = R.reject = _(function(fn, list) {
            return filter(notFn(fn), list);
        });

        // Like `reject`, but passes additional parameters to the predicate function.  Parameters are
        // `list item`, `index of item in list`, `entire list`.
        //
        // Example:
        //
        //     var lastTwo = function(val, idx, list) {
        //         return list.length - idx <= 2;
        //     };
        //     reject.idx(lastTwo, [8, 6, 7, 5, 3, 0 ,9]);
        //     //=> [8, 6, 7, 5, 3]
        reject.idx = _(function(fn, list) {
            return filter.idx(notFn(fn), list);
        });

        // Returns a new list containing the elements of the given list up until the first one where the function
        // supplied returns `false` when passed the element.
        R.takeWhile = _(function(fn, list) {
            var idx = -1, len = list.length, taking = true, result = [];
            while (taking) {
                ++idx;
                if (idx < len && fn(list[idx])) {
                    result.push(list[idx]);
                } else {
                    taking = false;
                }
            }
            return result;
        });

        // Returns a new list containing the first `n` elements of the given list.
        R.take = _(function(n, list) {
            if (list && list.length === Infinity) {
                return list.take(n);
            }
            var ls = clone(list);
            ls.length = n;
            return ls;
        });

        // Returns a new list containing the elements of the given list starting with the first one where the function
        // supplied returns `false` when passed the element.
        R.skipUntil = _(function(fn, list) {
            var idx = -1, len = list.length, taking = false, result = [];
            while (!taking) {
                ++idx;
                if (idx >= len || fn(list[idx])) {
                    taking = true;
                }
            }
            while (idx < len) {
                result.push(list[idx++]);
            }
            return result;
        });

        // Returns a new list containing all **but** the first `n` elements of the given list.
        R.skip = _(function(n, list) {
            if (list && list.length === Infinity) {
                return list.skip(n);
            }
            return slice(list, n);
        });
        aliasFor('skip').is('drop');

        // Returns the first element of the list which matches the predicate, or `false` if no element matches.
        R.find = _(function(fn, list) {
            var idx = -1, len = list.length;
            while (++idx < len) {
                if (fn(list[idx])) {
                    return list[idx];
                }
            }
            return false;
        });

        // Returns the index of first element of the list which matches the predicate, or `false` if no element matches.
        R.findIndex = _(function(fn, list) {
            var idx = -1, len = list.length;
            while (++idx < len) {
                if (fn(list[idx])) {
                    return idx;
                }
            }
            return false;
        });

        // Returns the last element of the list which matches the predicate, or `false` if no element matches.
        R.findLast = _(function(fn, list) {
            var idx = list.length;
            while (--idx) {
                if (fn(list[idx])) {
                    return list[idx];
                }
            }
            return false;
        });

        // Returns the index of last element of the list which matches the predicate, or `false` if no element matches.
        R.findLastIndex = _(function(fn, list) {
            var idx = list.length;
            while (--idx) {
                if (fn(list[idx])) {
                    return idx;
                }
            }
            return false;
        });

        // Returns `true` if all elements of the list match the predicate, `false` if there are any that don't.
        var all = R.all = _(function (fn, list) {
            var i = -1;
            while (++i < list.length) {
                if (!fn(list[i])) {
                    return false;
                }
            }
            return true;
        });
        aliasFor("all").is("every");


        // Returns `true` if any elements of the list match the predicate, `false` if none do.
        var any = R.any = _(function(fn, list) {
            var i = -1;
            while (++i < list.length) {
                if (fn(list[i])) {
                    return true;
                }
            }
            return false;
        });
        aliasFor("any").is("some");

        // Returns `true` if the list contains the sought element, `false` if it does not.  Equality is strict here,
        // meaning reference equality for objects and non-coercing equality for primitives.
        var contains = R.contains = _(function(a, list) {
            return list.indexOf(a) > -1;
        });

        // Returns `true` if the list contains the sought element, `false` if it does not, based upon the value
        // returned by applying the supplied predicated to two list elements.  Equality is strict here, meaning
        // reference equality for objects and non-coercing equality for primitives.  Probably inefficient.
        var containsWith = _(function(pred, x, list) {
            var idx = -1, len = list.length;
            while (++idx < len) {
                if (pred(x, list[idx])) {return true;}
            }
            return false;
        });

        // Returns a new list containing only one copy of each element in the original list.  Equality is strict here,
        // meaning reference equality for objects and non-coercing equality for primitives.
        var uniq = R.uniq = function(list) {
            return foldr(function(acc, x) { return (contains(x, acc)) ? acc : prepend(x, acc); }, EMPTY, list);
        };

        // Returns a new list containing only one copy of each element in the original list, based upon the value
        // returned by applying the supplied predicate to two list elements.   Equality is strict here,  meaning
        // reference equality for objects and non-coercing equality for primitives.
        var uniqWith = _(function(pred, list) {
            return foldr(function(acc, x) {return (containsWith(pred, x, acc)) ? acc : prepend(x, acc); }, EMPTY, list);
        });


        // Returns a new list by plucking the same named property off all objects in the list supplied.
        var pluck = R.pluck = _(function(p, list) {return map(prop(p), list);});

        // Returns a list that contains a flattened version of the supplied list.  For example:
        //
        //     flatten([1, 2, [3, 4], 5, [6, [7, 8, [9, [10, 11], 12]]]]);
        //     // => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        var flatten = R.flatten = function(list) {
            var idx = -1, len = list ? list.length : 0, result = [], push = result.push, val;
            while (++idx < len) {
                val = list[idx];
                push.apply(result, isArray(val) ? flatten(val) : [val]);
            }
            return result;
        };


        // Creates a new list out of the two supplied by applying the function to each equally-positioned pair in the
        // lists.  For example,
        //
        //     zipWith(f, [1, 2, 3], ['a', 'b', 'c'])
        //     //    => [f(1, 'a'), f(2, 'b'), f(3, 'c')];
        //
        // Note that the output list will only be as long as the length os the first list passed in.
        R.zipWith = _(function(fn, a, b) {
            var rv = [], i = -1, len = a.length;
            while(++i < len) {
                rv[i] = fn(a[i], b[i]);
            }
            return rv;
        });

        // Creates a new list out of the two supplied by yielding the pair of each equally-positioned pair in the
        // lists.  For example,
        //
        //     zip([1, 2, 3], ['a', 'b', 'c'])
        //     //    => [[1, 'a'], [2, 'b'], [3, 'c']];
        R.zip =  _(function(a, b) { // = zipWith(prepend);
            var rv = [], i = -1, len = a.length;
            while (++i < len) {
                rv[i] = [a[i], b[i]];
            }
            return rv;
        });

        // Creates a new list out of the two supplied by applying the function to each possible pair in the lists.
        //  For example,
        //
        //     xProdWith(f, [1, 2], ['a', 'b'])
        //     //    => [f(1, 'a'), f(1, 'b'), f(2, 'a'), f(2, 'b')];
        R.xprodWith = _(function(fn, a, b) {
            if (isEmpty(a) || isEmpty(b)) {return EMPTY;}
            var i = -1, ilen = a.length, j, jlen = b.length, result = []; // better to push them all or to do `new Array(ilen * jlen)` and calculate indices?
            while (++i < ilen) {
                j = -1;
                while (++j < jlen) {
                    result.push(fn(a[i], b[j]));
                }
            }
            return result;
        });

        // Creates a new list out of the two supplied by yielding the pair of each possible pair in the lists.
        // For example,
        //
        //     xProd([1, 2], ['a', 'b'])
        //     //    => [[1, 'a'], [1, 'b')], [2, 'a'], [2, 'b']];
        R.xprod = _(function(a, b) { // = xprodWith(prepend); (takes about 3 times as long...)
            if (isEmpty(a) || isEmpty(b)) {return EMPTY;}
            var i = -1, ilen = a.length, j, jlen = b.length, result = []; // better to push them all or to do `new Array(ilen * jlen)` and calculate indices?
            while (++i < ilen) {
                j = -1;
                while (++j < jlen) {
                    result.push([a[i], b[j]]);
                }
            }
            return result;
        });

        // Returns a new list with the same elements as the original list, just in the reverse order.
        R.reverse = function(list) {
            return clone(list || []).reverse();
        };

        // // Returns a list of numbers from `from` (inclusive) to `to` (exclusive).
        // For example, 
        //
        //     range(1, 5) // => [1, 2, 3, 4]
        //     range(50, 53) // => [50, 51, 52]
        R.range = _(function(from, to) {
            if (from >= to) {return EMPTY;}
            var idx, result = new Array(to - from);
            for (idx = 0; from < to; idx++, from++) {
                result[idx] = from;
            }
            return result;
        });


        // Returns the first zero-indexed position of an object in a flat list
        R.indexOf = _(function(obj, list) {
            return list.indexOf(obj);
        });

        // Returns the last zero-indexed position of an object in a flat list
        R.lastIndexOf = _(function(obj, list) {
            return list.lastIndexOf(obj);
        });

        // Returns the elements of the list as a string joined by a separator.
        R.join = _(function(sep, list) {
            return list.join(sep);
        });

        // ramda.splice has a different contract than Array.splice. Array.splice mutates its array
        // and returns the removed elements. ramda.splice does not mutate the passed in list (well,
        // it makes a shallow copy), and returns a new list with the specified elements removed. 
        R.splice = _(function(start, len, list) {
            var ls = slice(list, 0);
            ls.splice(start, len);
            return ls;
        });

        // Returns the nth element of a list (zero-indexed)
        R.nth = _(function(n, list) {
          return (list[n] === undef) ? null : list[n];
        });

        // Makes a comparator function out of a function that reports whether the first element is less than the second.
        //
        //     var cmp = comparator(function(a, b) {
        //         return a.age < b.age;
        //     };
        //     sort(cmp, people);
        var comparator = R.comparator = function(pred) {
            return function(a, b) {
                return pred(a, b) ? -1 : pred(b, a) ? 1 : 0;
            };
        };

        // Returns a copy of the list, sorted according to the comparator function, which should accept two values at a
        // time and return a negative number if the first value is smaller, a positive number if it's larger, and zero
        // if they are equal.  Please note that this is a **copy** of the list.  It does not modify the original.
        var sort = R.sort = _(function(comparator, list) {
            return clone(list).sort(comparator);
        });


        // Object Functions
        // ----------------
        //
        // These functions operate on plain Javascript object, adding simple functions to test properties on these
        // objects.  Many of these are of most use in conjunction with the list functions, operating on lists of
        // objects.

        // --------

        // Runs the given function with the supplied object, then returns the object.
        R.tap = _(function(x, fn) {
            if (typeof fn === "function") {
                fn(x);
            }
            return x;
        });
        aliasFor("tap").is("K"); // TODO: are we sure? Not necessary, but convenient, IMHO.

        // Tests if two items are equal.  Equality is strict here, meaning reference equality for objects and
        // non-coercing equality for primitives.
        R.eq = _(function(a, b) {
            return a === b;
        });

        // Returns a function that when supplied an object returns the indicated property of that object, if it exists.
        var prop = R.prop = _(function(p, obj) {return obj[p];});
        aliasFor("prop").is("get"); // TODO: are we sure?  Matches some other libs, but might want to reserve for other use.

        // Returns a function that when supplied an object returns the result of running the indicated function on
        // that object, if it has such a function.
        R.func = _(function(fn, obj) {return obj[fn].apply(obj, slice(arguments, 2));});


        // Returns a function that when supplied a property name returns that property on the indicated object, if it
        // exists.
        R.props = _(function(obj, prop) {return obj && obj[prop];});


        // Returns a function that always returns the given value.
        var always = R.always = function(val) {
            return function() {return val;};
        };

        var anyBlanks = any(function(val) {return val === null || val === undef;});

        // Returns a function that will only call the indicated function if the correct number of (defined, non-null)
        // arguments are supplied, returning `undefined` otherwise.
        R.maybe = function (fn) {
            return function () {
                return (arguments.length === 0 || anyBlanks(expand(arguments, fn.length))) ? undef : fn.apply(this, arguments);
            };
        };

        // Returns a list containing the names of all the enumerable own
        // properties of the supplied object.
        var keys = R.keys = function (obj) {
            var prop, ks = [];
            for (prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    ks.push(prop);
                }
            }
            return ks;
        };

        // Returns a list of all the enumerable own properties of the supplied object.
        R.values = function (obj) {
            var prop, vs = [];
            for (prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    vs.push(obj[prop]);
                }
            }
            return vs;
        };

        var partialCopy = function(test, obj) {
            var copy = {};
            each(function(key) {if (test(key, obj)) {copy[key] = obj[key];}}, keys(obj));
            return copy;
        };

        // Returns a partial copy of an object containing only the keys specified.  If the key does not exist, the
        // property is ignored
        R.pick = _(function(names, obj) {
            return partialCopy(function(key) {return contains(key, names);}, obj);
        });

        // Similar to `pick` except that this one includes a `key: undefined` pair for properties that don't exist.
        var pickAll = R.pickAll = _(function(names, obj) {
            var copy = {};
            each(function(name) { copy[name] = obj[name]; }, names);
            return copy;
        });

        // Returns a partial copy of an object omitting the keys specified.
        R.omit = _(function(names, obj) {
            return partialCopy(function(key) {return !contains(key, names);}, obj);
        });


        // Reports whether two functions have the same value for the specified property.  Useful as a curried predicate.
        R.eqProps = _(function(prop, obj1, obj2) {return obj1[prop] === obj2[prop];});

        // `where` takes a spec object and a test object and returns true iof the test satisfies the spec, 
        // else false. Any property on the spec that is not a function is interpreted as an equality 
        // relation. For example:
        //
        //     var spec = {x: 2};
        //     where(spec, {w: 10, x: 2, y: 300}); // => true, x === 2
        //     where(spec, {x: 1, y: 'moo', z: true}); // => false, x !== 2
        //
        // If the spec has a property mapped to a function, then `where` evaluates the function, passing in 
        // the test object's value for the property in question, as well as the whole test object. For example:
        //
        //     var spec = {x: function(val, obj) { return  val + obj.y > 10; };
        //     where(spec, {x: 2, y: 7}); // => false
        //     where(spec, {x: 3, y: 8}); // => true
        //
        // `where` is well suited to declarativley expressing constraints for other functions, e.g., `filter`:
        //
        //     var xs = [{x: 2, y: 1}, {x: 10, y: 2}, 
        //               {x: 8, y: 3}, {x: 10, y: 4}];
        //     var fxs = filter(where({x: 10}), xs); 
        //     // fxs ==> [{x: 10, y: 2}, {x: 10, y: 4}]
        //
        R.where = _(function(spec, test) {
            return all(function(key) {
                var val = spec[key];
                return (typeof val === 'function') ? val(test[key], test) : (test[key] === val);
            }, keys(spec));
        });


        // Miscellaneous Functions
        // -----------------------
        //
        // A few functions in need of a good home.

        // --------

        // Expose the functions from ramda as properties on another object.  If this object is the global object, then
        // it will be as though the eweda functions are global functions.
        R.installTo = function(obj) {
            each(function(key) {
                (obj || global)[key] = R[key];
            })(keys(R));
        };

        // A function that always returns `0`.
        R.alwaysZero = always(0);

        // A function that always returns `false`.
        R.alwaysFalse = always(false);

        // A function that always returns `true`.
        R.alwaysTrue = always(true);



        // Logic Functions
        // ---------------
        //
        // These functions are very simple wrappers around the built-in logical operators, useful in building up
        // more complex functional forms.

        // --------

        // A function wrapping the boolean `&&` operator.  Note that unlike the underlying operator, though, it
        // aways returns `true` or `false`.
        R.and = _(function (a, b) {
            return !!(a && b);
        });

        // A function wrapping the boolean `||` operator.  Note that unlike the underlying operator, though, it
        // aways returns `true` or `false`.
        R.or = _(function (a, b) {
            return !!(a || b);
        });

        // A function wrapping the boolean `!` operator.  It returns `true` if the parameter is false-y and `false` if
        // the parameter is truth-y
        R.not = function (a) {
            return !a;
        };

        // A function wrapping calls to the two functions in an `&&` operation, returning `true` or `false`.  Note that
        // this is short-circuited, meaning that the second function will not be invoked if the first returns a false-y
        // value.
        R.andFn = _(function(f, g) { // TODO: arity?
           return function() {return !!(f.apply(this, arguments) && g.apply(this, arguments));};
        });

        // A function wrapping calls to the two functions in an `||` operation, returning `true` or `false`.  Note that
        // this is short-circuited, meaning that the second function will not be invoked if the first returns a truth-y
        // value. (Note also that at least Oliver Twist can pronounce this one...)
        R.orFn = _(function(f, g) { // TODO: arity?
           return function() {return !!(f.apply(this, arguments) || g.apply(this, arguments));};
        });

        // A function wrapping a call to the given function in a `!` operation.  It will return `true` when the
        // underlying function would return a false-y value, and `false` when it would return a truth-y one.
        var notFn = R.notFn = function (f) {
            return function() {return !f.apply(this, arguments);};
        };


        // TODO: is there a way to unify allPredicates and anyPredicates? they are sooooo similar
        // Given a list of predicates returns a new predicate that will be true exactly when all of them are.
        R.allPredicates = function(preds /*, val1, val12, ... */) {
            var args = slice(arguments, 1);
            var maxArity = max(map(function(f) { return f.length; }, preds));

            var andPreds = arity(maxArity, function() {
                var idx = -1;
                while (++idx < preds.length) {
                    if (!preds[idx].apply(null, arguments)) { return false; }
                }
                return true;
            });
            return (isEmpty(args)) ? andPreds : andPreds.apply(null, args);
        };


      // Given a list of predicates returns a new predicate that will be true exactly when any one of them is.
        R.anyPredicates = function(preds /*, val1, val12, ... */) {
            var args = slice(arguments, 1);
            var maxArity = max(map(function(f) { return f.length; }, preds));

            var orPreds = arity(maxArity, function() {
                var idx = -1;
                while (++idx < preds.length) {
                    if (preds[idx].apply(null, arguments)) { return true; }
                }
                return false;
            });
            return (isEmpty(args)) ? orPreds : orPreds.apply(null, args);
        };



        // Arithmetic Functions
        // --------------------
        //
        // These functions wrap up the certain core arithmetic operators

        // --------

        // Adds two numbers.  Automatic curried:
        //
        //     var add7 = add(7);
        //     add7(10); // => 17
        var add = R.add = _(function(a, b) {return a + b;});

        // Multiplies two numbers.  Automatically curried:
        //
        //     var mult3 = multiply(3);
        //     mult3(7); // => 21
        var multiply = R.multiply = _(function(a, b) {return a * b;});

        // Subtracts the second parameter from the first.  This is automatically curried, and while at times the curried
        // version might be useful, often the curried version of `subtractN` might be what's wanted.
        //
        //     var hundredMinus = subtract(100);
        //     hundredMinus(20) ; // => 80
        var subtract = R.subtract = _(function(a, b) {return a - b;});

        // Reversed version of `subtract`, where first parameter is subtracted from the second.  The curried version of
        // this one might me more useful than that of `subtract`.  For instance:
        //
        //     var decrement = subtractN(1);
        //     decrement(10); // => 9;
        R.subtractN = flip(subtract);

        // Divides the first parameter by the second.  This is automatically curried, and while at times the curried
        // version might be useful, often the curried version of `divideBy` might be what's wanted.
        var divide = R.divide = _(function(a, b) {return a / b;});

        // Reversed version of `divide`, where the second parameter is divided by the first.  The curried version of
        // this one might be more useful than that of `divide`.  For instance:
        //
        //     var half = divideBy(2);
        //     half(42); // => 21
        R.divideBy = flip(divide);

        // Adds together all the elements of a list.
        R.sum = foldl(add, 0);

        // Multiplies together all the elements of a list.
        R.product = foldl(multiply, 1);

        // Returns true if the first parameter is less than the second.
        R.lt = _(function(a, b) {return a < b;});

        // Returns true if the first parameter is less than or equal to the second.
        R.lte = _(function(a, b) {return a <= b;});

        // Returns true if the first parameter is greater than the second.
        R.gt = _(function(a, b) {return a > b;});

        // Returns true if the first parameter is greater than or equal to the second.
        R.gte = _(function(a, b) {return a >= b;});

        // Determines the largest of a list of numbers (or elements that can be cast to numbers)
        var max = R.max = function(list) {return Math.max.apply(null, list);};

        // Determines the largest of a list of numbers (or elements that can be cast to numbers) using the supplied comparator
        R.maxWith = _(function(comparator, list) {
            if (!isArray(list) || !list.length) {
                return undef;
            }
            var idx = 0, max = list[idx];
            while (++idx < list.length) {
                if (comparator(max, list[idx]) < 0) {
                    max = list[idx];
                }
            }
            return max;
        });

        // TODO: combine this with maxWith?
        // Determines the smallest of a list of numbers (or elements that can be cast to numbers) using the supplied comparator
        R.minWith = _(function(comparator, list) {
            if (!isArray(list) || !list.length) {
                return undef;
            }
            var idx = 0, max = list[idx];
            while (++idx < list.length) {
                if (comparator(max, list[idx]) > 0) {
                    max = list[idx];
                }
            }
            return max;
        });


        // Determines the smallest of a list of numbers (or elements that can be cast to numbers)
        R.min = function(list) {return Math.min.apply(null, list);};


        // String Functions
        // ----------------
        //
        // Much of the String.prototype API exposed as simple functions.

        // --------

        // A substring of a String:
        //
        //     substring(2, 5, "abcdefghijklm"); //=> "cde"
        var substring = R.substring = invoker("substring", String.prototype);

        // The trailing substring of a String starting with the nth character:
        //
        //     substringFrom(8, "abcdefghijklm"); //=> "ijklm"
        R.substringFrom = flip(substring)(undef);

        // The leading substring of a String ending before the nth character:
        //
        //     substringTo(8, "abcdefghijklm"); //=> "abcdefgh"
        R.substringTo = substring(0);

        // The character at the nth position in a String:
        //
        //     charAt(8, "abcdefghijklm"); //=> "i"
        R.charAt = invoker("charAt", String.prototype);

        // The ascii code of the character at the nth position in a String:
        //
        //     charCodeAt(8, "abcdefghijklm"); //=> 105
        //     // (... 'a' ~ 97, 'b' ~ 98, ... 'i' ~ 105)
        R.charCodeAt = invoker("charCodeAt", String.prototype);

        // Tests a regular expression agains a String
        //
        //     match(/([a-z]a)/g, "bananas"); //=> ["ba", "na", "na"]
        R.match = invoker("match", String.prototype);

        // Finds the index of a substring in a string, returning -1 if it's not present
        //
        //     strIndexOf('c', 'abcdefg) //=> 2
        R.strIndexOf = invoker("indexOf", String.prototype);

        // Finds the last index of a substring in a string, returning -1 if it's not present
        //
        //     strIndexOf('a', 'banana split') //=> 2
        R.strLastIndexOf = invoker("lastIndexOf", String.prototype);

        // The uppercase version of a string.
        //
        //     toUpperCase('abc') //=> 'ABC'
        R.toUpperCase = invoker("toUpperCase", String.prototype);

        // The lowercase version of a string.
        //
        //     toLowerCase('XYZ') //=> 'xyz'
        R.toLowerCase = invoker("toLowerCase", String.prototype);


        // The string split into substring at the specified token
        //
        //     split('.', 'a.b.c.xyz.d') //=>
        //         ['a', 'b', 'c', 'xyz', 'd']
        R.split = invoker("split", String.prototype, 1);


        // Data Analysis and Grouping Functions
        // ------------------------------------
        //
        // Functions performing SQL-like actions on lists of objects.  These do not have any SQL-like optimizations
        // performed on them, however.

        // --------

        // Reasonable analog to SQL `select` statement.
        //
        //     var kids = [
        //         {name: 'Abby', age: 7, hair: 'blond', grade: 2},
        //         {name: 'Fred', age: 12, hair: 'brown', grade: 7}
        //     ];
        //     project(['name', 'grade'], kids);
        //     //=> [{name: 'Abby', grade: 2}, {name: 'Fred', grade: 7}]
        R.project = useWith(map, pickAll, identity); // passing `identity` gives correct arity

        // Determines whether the given property of an object has a specific value
        // Most likely used to filter a list:
        //
        //     var kids = [
        //       {name: 'Abby', age: 7, hair: 'blond'},
        //       {name: 'Fred', age: 12, hair: 'brown'},
        //       {name: 'Rusty', age: 10, hair: 'brown'},
        //       {name: 'Alois', age: 15, disposition: 'surly'}
        //     ];
        //     filter(propEq("hair", "brown"), kids);
        //     //=> Fred and Rusty
        R.propEq = _(function(name, val, obj) {
            return obj[name] === val;
        });

        // Combines two lists into a set (i.e. no duplicates) composed of the elements of each list.
        R.union = compose(uniq, merge);

        // Combines two lists into a set (i.e. no duplicates) composed of the elements of each list.  Duplication is
        // determined according to the value returned by applying the supplied predicate to two list elements.
        R.unionWith = function(pred, list1, list2) {
            return uniqWith(pred, merge(list1, list2));
        };

        // Finds the set (i.e. no duplicates) of all elements in the first list not contained in the second list.
        R.difference = function(first, second) {return uniq(reject(flip(contains)(second))(first));};

        // Finds the set (i.e. no duplicates) of all elements in the first list not contained in the second list.
        // Duplication is determined according to the value returned by applying the supplied predicate to two list
        // elements.
        R.differenceWith = function(pred, first, second) {
            return uniqWith(pred)(reject(flip(containsWith(pred))(second), first));
        };

        // Combines two lists into a set (i.e. no duplicates) composed of those elements common to both lists.
        R.intersection = function(list1, list2) {
            return uniq(filter(flip(contains)(list1), list2));
        };

        // Combines two lists into a set (i.e. no duplicates) composed of those elements common to both lists.
        // Duplication is determined according to the value returned by applying the supplied predicate to two list
        // elements.
        R.intersectionWith = function(pred, list1, list2) {
            var results = [], idx = -1;
            while (++idx < list1.length) {
                if (containsWith(pred, list1[idx], list2)) {
                    results[results.length] = list1[idx];
                }
            }
            return uniqWith(pred, results);
        };

        // Creates a new list whose elements each have two properties: `val` is the value of the corresponding
        // item in the list supplied, and `key` is the result of applying the supplied function to that item.
        var keyValue = _(function(fn, list) { // TODO: Should this be made public?
            return map(function(item) {return {key: fn(item), val: item};}, list);
        });

        // Sorts the list according to a key generated by the supplied function.
        R.sortBy = _(function(fn, list) {
            /*
              return sort(comparator(function(a, b) {return fn(a) < fn(b);}), list); // clean, but too time-inefficient
              return pluck("val", sort(comparator(function(a, b) {return a.key < b.key;}), keyValue(fn, list))); // nice, but no need to clone result of keyValue call, so...
            */
            return pluck("val", keyValue(fn, list).sort(comparator(function(a, b) {return a.key < b.key;})));
        });

        // Counts the elements of a list according to how many match each value of a key generated by the supplied function.
        R.countBy = _(function(fn, list) {
            return foldl(function(counts, obj) {
                counts[obj.key] = (counts[obj.key] || 0) + 1;
                return counts;
            }, {}, keyValue(fn, list));
        });

        // Groups the elements of a list by a key generated by the supplied function.
        R.groupBy = _(function(fn, list) {
            return foldl(function(groups, obj) {
                (groups[obj.key] || (groups[obj.key] = [])).push(obj.val);
                return groups;
            }, {}, keyValue(fn, list));
        });



        // All the functional goodness, wrapped in a nice little package, just for you!
        return R;
    }());
}));

},{}],2:[function(_dereq_,module,exports){
var R = _dereq_('ramda');
var EMPTY = 0;

function Grid(m) {
  if (!(this instanceof Grid)) {
    return new Grid(m);
  }
  this.matrix = m;
};

Grid.prototype = {
  constructor: Grid,

  findEmptyCell: function() {
    var cell = {};
    cell.y = R.findIndex(function(r) { return R.contains(EMPTY, r); }, this.matrix);
    if (cell.y !== false) {
      cell.x = R.findIndex(function(c) { return c === EMPTY; }, this.matrix[cell.y]);
    }
    return (cell.y !== false && cell.x !== false) ? cell : false;
  },

  constrain: function(cell) {
    var rowWise = R.difference(R.range(1,10), this.matrix[cell.y]);
    var colWise = R.difference(rowWise, this.colToArray(cell.x));
    return R.difference(colWise, this.boxToArray(cell));
  },

  update: function(cell, value) {
    this.matrix[cell.y][cell.x] = value;
  },

  colToArray: function(x) {
    return R.pluck(x, this.matrix);
  },

  getBox: function(cell) {
    return {
      x: Math.floor(cell.x/3) * 3,
      y: Math.floor(cell.y/3) * 3
    };
  },

  boxToArray: function(cell) {
    var box = this.getBox(cell); 
    return R.reduce(function(acc, row) {  
      return acc.concat(R.map(R.I, row.slice(box.x, box.x + 3)));
    }, [], this.matrix.slice(box.y, box.y + 3));
  }

};

module.exports = Grid;



},{"ramda":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9taWtlL2Rldi9zdWRva3Vzb2x2ZXIvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvbWlrZS9kZXYvc3Vkb2t1c29sdmVyL25vZGVfbW9kdWxlcy9yYW1kYS9yYW1kYS5qcyIsIi9ob21lL21pa2UvZGV2L3N1ZG9rdXNvbHZlci9zcmMvanMvZmFrZV84YTAyMmJlZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzE1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gICAgIHJhbWRhLmpzIDAuMC4xXG4vLyAgICAgaHR0cHM6Ly9naXRodWIuY29tL0Nyb3NzRXllL3JhbWRhXG4vLyAgICAgKGMpIDIwMTMtMjAxNCBTY290dCBTYXV5ZXQgYW5kIE1pY2hhZWwgSHVybGV5XG4vLyAgICAgUmFtZGEgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbi8vIFJhbWRhXG4vLyAtLS0tLVxuLy8gQSBwcmFjdGljYWwgZnVuY3Rpb25hbCBsaWJyYXJ5IGZvciBKYXZhc2NyaXB0IHByb2dyYW1tZXJzLiAgVGhpcyBpcyBhIGNvbGxlY3Rpb24gb2YgdG9vbHMgdG8gbWFrZSBpdCBlYXNpZXIgdG9cbi8vIHVzZSBKYXZhc2NyaXB0IGFzIGEgZnVuY3Rpb25hbCBwcm9ncmFtbWluZyBsYW5ndWFnZS4gIChUaGUgbmFtZSBpcyBqdXN0IGEgc2lsbHkgcGxheSBvbiBgbGFtYmRhYCwgZXZlbiB0aG91Z2ggd2UncmVcbi8vIG5vdCBhY3R1YWxseSBpbnZvbHZlZCBpbiB0aGUgbWFuaXB1bGF0aW9uIG9mIGxhbWJkYSBleHByZXNzaW9ucy4pXG5cbi8vIEJhc2ljIFNldHVwXG4vLyAtLS0tLS0tLS0tLVxuLy8gVXNlcyBhIHRlY2huaXF1ZSBmcm9tIHRoZSBbVW5pdmVyc2FsIE1vZHVsZSBEZWZpbml0aW9uXVt1bWRdIHRvIHdyYXAgdGhpcyB1cCBmb3IgdXNlIGluIE5vZGUuanMgb3IgaW4gdGhlIGJyb3dzZXIsXG4vLyB3aXRoIG9yIHdpdGhvdXQgYW4gQU1ELXN0eWxlIGxvYWRlci5cbi8vXG4vLyAgW3VtZF06IGh0dHBzOi8vZ2l0aHViLmNvbS91bWRqcy91bWQvYmxvYi9tYXN0ZXIvcmV0dXJuRXhwb3J0cy5qc1xuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJvb3QpO30gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7ZGVmaW5lKGZhY3RvcnkpO30gZWxzZSB7cm9vdC5yYW1kYSA9IGZhY3Rvcnkocm9vdCk7fX0odGhpcywgZnVuY3Rpb24gKGdsb2JhbCkge1xuXG4gICAgcmV0dXJuICAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgLy8gVGhpcyBvYmplY3QgaXMgd2hhdCBpcyBhY3R1YWxseSByZXR1cm5lZCwgd2l0aCBhbGwgdGhlIGV4cG9zZWQgZnVuY3Rpb25zIGF0dGFjaGVkIGFzIHByb3BlcnRpZXMuXG5cbiAgICAgICAgdmFyIFIgPSB7fTtcblxuICAgICAgICAvLyBJbnRlcm5hbCBGdW5jdGlvbnMgYW5kIFByb3BlcnRpZXNcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgICAgdmFyIHVuZGVmID0gKGZ1bmN0aW9uKCl7fSkoKSwgRU1QVFk7XG5cbiAgICAgICAgLy8gTWFrZXMgYSBwdWJsaWMgYWxpYXMgZm9yIG9uZSBvZiB0aGUgcHVibGljIGZ1bmN0aW9uczpcbiAgICAgICAgdmFyIGFsaWFzRm9yID0gZnVuY3Rpb24ob2xkTmFtZSkge1xuICAgICAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24obmV3TmFtZSkge1JbbmV3TmFtZV0gPSBSW29sZE5hbWVdOyByZXR1cm4gZm47fTtcbiAgICAgICAgICAgIGZuLmlzID0gZm4uYXJlID0gZm4uYW5kID0gZm47XG4gICAgICAgICAgICByZXR1cm4gZm47XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYHNsaWNlYCBpbXBsZW1lbnRlZCBpdGVyYXRpdmVseSBmb3IgcGVyZm9ybWFuY2VcbiAgICAgICAgdmFyIHNsaWNlID0gZnVuY3Rpb24gKGFyZ3MsIGZyb20sIHRvKSB7XG4gICAgICAgICAgICB2YXIgaSwgYXJyID0gW107XG4gICAgICAgICAgICBmcm9tID0gZnJvbSB8fCAwO1xuICAgICAgICAgICAgdG8gPSB0byB8fCBhcmdzLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAoaSA9IGZyb207IGkgPCB0bzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYXJyW2Fyci5sZW5ndGhdID0gYXJnc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGlzQXJyYXkgPSBmdW5jdGlvbih2YWwpIHtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbCkgPT09IFwiW29iamVjdCBBcnJheV1cIjt9O1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBjdXJyaWVkIHZlcnNpb24gb2YgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uLiAgRm9yIGV4YW1wbGU6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICAgdmFyIGRpc2NyaW1pbmFudCA9IGZ1bmN0aW9uKGEsIGIsIGMpIHtcbiAgICAgICAgLy8gICAgICAgICAgcmV0dXJuIGIgKiBiIC0gNCAqIGEgKiBjO1xuICAgICAgICAvLyAgICAgIH07XG4gICAgICAgIC8vICAgICAgdmFyIGYgPSBjdXJyeShkaXNjcmltaW5hbnQpO1xuICAgICAgICAvLyAgICAgIHZhciBnID0gZigzKSwgaCA9IGYoMywgNykgaSA9IGcoNyk7XG4gICAgICAgIC8vICAgICAgaSg0KSDiiYUgaCg0KSA9PSBnKDcsIDQpID09IGYoMywgNywgNCkgPT0gMVxuICAgICAgICAvL1xuICAgICAgICAvLyAgQWxtb3N0IGFsbCBleHBvc2VkIGZ1bmN0aW9ucyBvZiBtb3JlIHRoYW4gb25lIHBhcmFtZXRlciBhbHJlYWR5IGhhdmUgY3VycnkgYXBwbGllZCB0byB0aGVtLlxuICAgICAgICB2YXIgXyA9IFIuY3VycnkgPSBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgdmFyIGZuQXJpdHkgPSBmbi5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgZiA9IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJpdHkoTWF0aC5tYXgoZm5Bcml0eSAtIChhcmdzICYmIGFyZ3MubGVuZ3RoIHx8IDApLCAwKSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3QXJncyA9IChhcmdzIHx8IFtdKS5jb25jYXQoc2xpY2UoYXJndW1lbnRzLCAwKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXdBcmdzLmxlbmd0aCA+PSBmbkFyaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgbmV3QXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7cmV0dXJuIGYobmV3QXJncyk7fVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIGYoW10pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBta0FyZ1N0ciA9IGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIHZhciBhcnIgPSBbXSwgaWR4ID0gLTE7XG4gICAgICAgICAgICB3aGlsZSgrK2lkeCA8IG4pIHtcbiAgICAgICAgICAgICAgICBhcnJbaWR4XSA9IFwiYXJnXCIgKyBpZHg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXJyLmpvaW4oXCIsIFwiKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBXcmFwcyBhIGZ1bmN0aW9uIHRoYXQgbWF5IGJlIG51bGxhcnksIG9yIG1heSB0YWtlIGZld2VyIHRoYW4gb3IgbW9yZSB0aGFuIGBuYCBwYXJhbWV0ZXJzLCBpbiBhIGZ1bmN0aW9uIHRoYXRcbiAgICAgICAgLy8gc3BlY2lmaWNhbGx5IHRha2VzIGV4YWN0bHkgYG5gIHBhcmFtZXRlcnMuICBBbnkgZXh0cmFuZW91cyBwYXJhbWV0ZXJzIHdpbGwgbm90IGJlIHBhc3NlZCBvbiB0byB0aGUgZnVuY3Rpb25cbiAgICAgICAgLy8gc3VwcGxpZWRcbiAgICAgICAgdmFyIG5BcnkgPSBSLm5BcnkgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY2FjaGUgPSB7fTtcblxuXG4gICAgICAgICAgICAvLyAgICAgRm9yIGV4YW1wbGU6XG4gICAgICAgICAgICAvLyAgICAgY2FjaGVbM10gPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHJldHVybiBmdW5jdGlvbihhcmcwLCBhcmcxLCBhcmcyKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXMsIGFyZzAsIGFyZzEsIGFyZzIpO1xuICAgICAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgICAgICAvLyAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG1ha2VOID0gZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICAgIHZhciBmbkFyZ3MgPSBta0FyZ1N0cihuKTtcbiAgICAgICAgICAgICAgICB2YXIgYm9keSA9IFtcbiAgICAgICAgICAgICAgICAgICAgXCIgICAgcmV0dXJuIGZ1bmN0aW9uKFwiICsgZm5BcmdzICsgXCIpIHtcIixcbiAgICAgICAgICAgICAgICAgICAgXCIgICAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc1wiICsgKGZuQXJncyA/IFwiLCBcIiArIGZuQXJncyA6IFwiXCIpICsgXCIpO1wiLFxuICAgICAgICAgICAgICAgICAgICBcIiAgICB9XCJcbiAgICAgICAgICAgICAgICBdLmpvaW4oXCJcXG5cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcImZ1bmNcIiwgYm9keSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24obiwgZm4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGNhY2hlW25dIHx8IChjYWNoZVtuXSA9IG1ha2VOKG4pKSkoZm4pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSgpKTtcblxuICAgICAgICAvLyBXcmFwcyBhIGZ1bmN0aW9uIHRoYXQgbWF5IGJlIG51bGxhcnksIG9yIG1heSB0YWtlIGZld2VyIHRoYW4gb3IgbW9yZSB0aGFuIGBuYCBwYXJhbWV0ZXJzLCBpbiBhIGZ1bmN0aW9uIHRoYXRcbiAgICAgICAgLy8gc3BlY2lmaWNhbGx5IHRha2VzIGV4YWN0bHkgYG5gIHBhcmFtZXRlcnMuICBOb3RlLCB0aG91Z2gsIHRoYXQgYWxsIHBhcmFtZXRlcnMgc3VwcGxpZWQgd2lsbCBpbiBmYWN0IGJlXG4gICAgICAgIC8vIHBhc3NlZCBhbG9uZywgaW4gY29udHJhc3Qgd2l0aCBgbkFyeWAsIHdoaWNoIG9ubHkgcGFzc2VzIGFsb25nIHRoZSBleGFjdCBudW1iZXIgc3BlY2lmaWVkLlxuICAgICAgICB2YXIgYXJpdHkgPSBSLmFyaXR5ID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGNhY2hlID0ge307XG5cbiAgICAgICAgICAgIC8vICAgICBGb3IgZXhhbXBsZTpcbiAgICAgICAgICAgIC8vICAgICBjYWNoZVszXSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGFyZzAsIGFyZzEsIGFyZzIpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgbWFrZU4gPSBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuQXJncyA9IG1rQXJnU3RyKG4pO1xuICAgICAgICAgICAgICAgIHZhciBib2R5ID0gW1xuICAgICAgICAgICAgICAgICAgICBcIiAgICByZXR1cm4gZnVuY3Rpb24oXCIgKyBmbkFyZ3MgKyBcIikge1wiLFxuICAgICAgICAgICAgICAgICAgICBcIiAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcIixcbiAgICAgICAgICAgICAgICAgICAgXCIgICAgfVwiXG4gICAgICAgICAgICAgICAgXS5qb2luKFwiXFxuXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJmdW5jXCIsIGJvZHkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG4sIGZuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChjYWNoZVtuXSB8fCAoY2FjaGVbbl0gPSBtYWtlTihuKSkpKGZuKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0oKSk7XG5cbiAgICAgICAgLy8gVHVybnMgYSBuYW1lZCBtZXRob2Qgb2YgYW4gb2JqZWN0IChvciBvYmplY3QgcHJvdG90eXBlKSBpbnRvIGEgZnVuY3Rpb24gdGhhdCBjYW4gYmUgY2FsbGVkIGRpcmVjdGx5LlxuICAgICAgICAvLyBUaGUgb2JqZWN0IGJlY29tZXMgdGhlIGxhc3QgcGFyYW1ldGVyIHRvIHRoZSBmdW5jdGlvbiwgYW5kIHRoZSBmdW5jdGlvbiBpcyBhdXRvbWF0aWNhbGx5IGN1cnJpZWQuXG4gICAgICAgIC8vIFBhc3NpbmcgdGhlIG9wdGlvbmFsIGBsZW5gIHBhcmFtZXRlciByZXN0cmljdHMgdGhlIGZ1bmN0aW9uIHRvIHRoZSBpbml0aWFsIGBsZW5gIHBhcmFtZXRlcnMgb2YgdGhlIG1ldGhvZC5cbiAgICAgICAgdmFyIGludm9rZXIgPSBSLmludm9rZXIgPSBmdW5jdGlvbihuYW1lLCBvYmosIGxlbikge1xuICAgICAgICAgICAgdmFyIG1ldGhvZCA9IG9ialtuYW1lXTtcbiAgICAgICAgICAgIHZhciBsZW5ndGggPSBsZW4gPT09IHVuZGVmID8gbWV0aG9kLmxlbmd0aCA6IGxlbjtcbiAgICAgICAgICAgIHJldHVybiBtZXRob2QgJiYgXyhuQXJ5KGxlbmd0aCArIDEsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IEFycmF5LnByb3RvdHlwZS5wb3AuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0TWV0aG9kID0gdGFyZ2V0W25hbWVdO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0TWV0aG9kID09IG1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldE1ldGhvZC5hcHBseSh0YXJnZXQsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgZnVuY3Rpb24gdGhhdCBjYWxscyB0aGUgZnVuY3Rpb24gYGZuYCB3aXRoIHBhcmFtZXRlcnMgY29uc2lzdGluZyBvZiAgdGhlIHJlc3VsdCBvZiB0aGVcbiAgICAgICAgLy8gY2FsbGluZyBlYWNoIHN1cHBsaWVkIGhhbmRsZXIgb24gc3VjY2Vzc2l2ZSBhcmd1bWVudHMsIGZvbGxvd2VkIGJ5IGFsbCB1bm1hdGNoZWQgYXJndW1lbnRzLlxuICAgICAgICAvL1xuICAgICAgICAvLyBJZiB0aGVyZSBhcmUgZXh0cmEgX2V4cGVjdGVkXyBhcmd1bWVudHMgdGhhdCBkb24ndCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkLCBhbHRob3VnaCB5b3UgY2FuIGlnbm9yZVxuICAgICAgICAvLyB0aGVtLCBpdCBtaWdodCBiZSBiZXN0IHRvIHBhc3MgaW4gYW5kIGlkZW50aXR5IGZ1bmN0aW9uIHNvIHRoYXQgdGhlIG5ldyBmdW5jdGlvbiBjb3JyZWN0bHkgcmVwb3J0cyBhcml0eS5cbiAgICAgICAgLy8gU2VlIGZvciBleGFtcGxlLCB0aGUgZGVmaW5pdGlvbiBvZiBgcHJvamVjdGAsIGJlbG93LlxuICAgICAgICB2YXIgdXNlV2l0aCA9IFIudXNlV2l0aCA9IGZ1bmN0aW9uKGZuIC8qLCB0cmFuc2Zvcm1lcnMgKi8pIHtcbiAgICAgICAgICAgIHZhciB0cmFuc2Zvcm1lcnMgPSBzbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgdmFyIHRsZW4gPSB0cmFuc2Zvcm1lcnMubGVuZ3RoO1xuICAgICAgICAgICAgcmV0dXJuIF8oYXJpdHkodGxlbiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBbXSwgaWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgdGxlbikge1xuICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2godHJhbnNmb3JtZXJzW2lkeF0oYXJndW1lbnRzW2lkeF0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MuY29uY2F0KHNsaWNlKGFyZ3VtZW50cywgdGxlbikpKTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBIHR3by1zdGVwIHZlcnNpb24gb2YgdGhlIGB1c2VXaXRoYCBmdW5jdGlvbi4gIFRoaXMgd291bGQgYWxsb3cgdXMgdG8gd3JpdGUgYHByb2plY3RgLCBjdXJyZW50bHkgd3JpdHRlblxuICAgICAgICAvLyBhcyBgdXNlV2l0aChtYXAsIHBpY2tBbGwsIGlkZW50aXR5KWAsIGFzLCBpbnN0ZWFkLCBgdXNlKG1hcCkub3ZlcihwaWNrQWxsLCBpZGVudGl0eSlgLCB3aGljaCBpcyBhIGJpdFxuICAgICAgICAvLyBtb3JlIGV4cGxpY2l0LlxuICAgICAgICAvLyBUT0RPOiBPbmUgb2YgdGhlc2UgdmVyc2lvbnMgc2hvdWxkIGJlIGVsaW1pbmF0ZWQgZXZlbnR1YWxseS4gIFNvIG5vdCB3b3JyeWluZyBhYm91dCB0aGUgZHVwbGljYXRpb24gZm9yIG5vdy5cbiAgICAgICAgUi51c2UgPSBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvdmVyOiBmdW5jdGlvbigvKnRyYW5zZm9ybWVycyovKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0cmFuc2Zvcm1lcnMgPSBzbGljZShhcmd1bWVudHMsIDApO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGxlbiA9IHRyYW5zZm9ybWVycy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfKGFyaXR5KHRsZW4sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBbXSwgaWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoKytpZHggPCB0bGVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKHRyYW5zZm9ybWVyc1tpZHhdKGFyZ3VtZW50c1tpZHhdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJncy5jb25jYXQoc2xpY2UoYXJndW1lbnRzLCB0bGVuKSkpO1xuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuXG4gICAgICAgIC8vIEZpbGxzIG91dCBhbiBhcnJheSB0byB0aGUgc3BlY2lmaWVkIGxlbmd0aC4gSW50ZXJuYWwgcHJpdmF0ZSBmdW5jdGlvbi5cbiAgICAgICAgdmFyIGV4cGFuZCA9IGZ1bmN0aW9uKGEsIGxlbikge1xuICAgICAgICAgICAgdmFyIGFyciA9IGEgPyBpc0FycmF5KGEpID8gYSA6IHNsaWNlKGEpIDogW107XG4gICAgICAgICAgICB3aGlsZShhcnIubGVuZ3RoIDwgbGVuKSB7YXJyW2Fyci5sZW5ndGhdID0gdW5kZWY7fVxuICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbCB2ZXJzaW9uIG9mIGBmb3JFYWNoYC4gIFBvc3NpYmx5IHRvIGJlIGV4cG9zZWQgbGF0ZXIuXG4gICAgICAgIHZhciBlYWNoID0gXyhmdW5jdGlvbihmbiwgYXJyKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZm4oYXJyW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2hhbGxvdyBjb3B5IG9mIGFuIGFycmF5LlxuICAgICAgICB2YXIgY2xvbmUgPSBSLmNsb25lID0gZnVuY3Rpb24obGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuIGxpc3QuY29uY2F0KCk7XG4gICAgICAgIH07XG5cblxuICAgICAgICAvLyBDb3JlIEZ1bmN0aW9uc1xuICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLVxuICAgICAgICAvL1xuXG4gICAgICAgIC8vICAgUHJvdG90eXBpY2FsIChvciBvbmx5KSBlbXB0eSBsaXN0XG4gICAgICAgIEVNUFRZID0gW107XG5cbiAgICAgICAgLy8gQm9vbGVhbiBmdW5jdGlvbiB3aGljaCByZXBvcnRzIHdoZXRoZXIgYSBsaXN0IGlzIGVtcHR5LlxuICAgICAgICB2YXIgaXNFbXB0eSA9IFIuaXNFbXB0eSA9IGZ1bmN0aW9uKGFycikge3JldHVybiAhYXJyIHx8ICFhcnIubGVuZ3RoO307XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IHdpdGggdGhlIG5ldyBlbGVtZW50IGF0IHRoZSBmcm9udCBhbmQgdGhlIGV4aXN0aW5nIGVsZW1lbnRzIGZvbGxvd2luZ1xuICAgICAgICB2YXIgcHJlcGVuZCA9IFIucHJlcGVuZCA9IGZ1bmN0aW9uKGVsLCBhcnIpIHtyZXR1cm4gW2VsXS5jb25jYXQoYXJyKTt9O1xuICAgICAgICBhbGlhc0ZvcihcInByZXBlbmRcIikuaXMoXCJjb25zXCIpO1xuXG4gICAgICAgIC8vICBSZXR1cm5zIHRoZSBmaXJzdCBlbGVtZW50IG9mIGEgbGlzdFxuICAgICAgICB2YXIgaGVhZCA9IFIuaGVhZCA9IGZ1bmN0aW9uKGFycikge1xuICAgICAgICAgICAgYXJyID0gYXJyIHx8IEVNUFRZO1xuICAgICAgICAgICAgcmV0dXJuIChhcnIubGVuZ3RoKSA/IGFyclswXSA6IG51bGw7IFxuICAgICAgICB9O1xuICAgICAgICBhbGlhc0ZvcihcImhlYWRcIikuaXMoXCJjYXJcIik7IFxuXG4gICAgICAgIC8vIFJldHVybnMgdGhlIHJlc3Qgb2YgdGhlIGxpc3QgYWZ0ZXIgdGhlIGZpcnN0IGVsZW1lbnQuXG4gICAgICAgIC8vIElmIHRoZSBwYXNzZWQtaW4gbGlzdCBpcyBhIEdlbmVyYXRvciwgaXQgd2lsbCByZXR1cm4gdGhlIFxuICAgICAgICAvLyBuZXh0IGl0ZXJhdGlvbiBvZiB0aGUgR2VuZXJhdG9yLlxuICAgICAgICB2YXIgdGFpbCA9IFIudGFpbCA9IGZ1bmN0aW9uKGFycikge1xuICAgICAgICAgICAgYXJyID0gYXJyIHx8IEVNUFRZO1xuICAgICAgICAgICAgaWYgKGFyci5sZW5ndGggPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyci50YWlsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gKGFyci5sZW5ndGggPiAxKSA/IHNsaWNlKGFyciwgMSkgOiBudWxsO1xuICAgICAgICB9O1xuICAgICAgICBhbGlhc0ZvcihcInRhaWxcIikuaXMoXCJjZHJcIik7XG5cbiAgICAgICAgLy8gICBCb29sZWFuIGZ1bmN0aW9uIHdoaWNoIGlzIGB0cnVlYCBmb3Igbm9uLWxpc3QsIGBmYWxzZWAgZm9yIGEgbGlzdC5cbiAgICAgICAgUi5pc0F0b20gPSBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHggIT09IG51bGwpICYmICh4ICE9PSB1bmRlZikgJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpICE9PSBcIltvYmplY3QgQXJyYXldXCI7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IHdpdGggdGhlIG5ldyBlbGVtZW50IGF0IHRoZSBlbmQgb2YgYSBsaXN0IGZvbGxvd2luZyBhbGwgdGhlIGV4aXN0aW5nIG9uZXMuXG4gICAgICAgIFIuYXBwZW5kID0gZnVuY3Rpb24oZWwsIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBuZXdMaXN0ID0gY2xvbmUobGlzdCk7XG4gICAgICAgICAgICBuZXdMaXN0LnB1c2goZWwpO1xuICAgICAgICAgICAgcmV0dXJuIG5ld0xpc3Q7XG4gICAgICAgIH07XG4gICAgICAgIGFsaWFzRm9yKFwiYXBwZW5kXCIpLmlzKFwicHVzaFwiKTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGxpc3QgY29uc2lzdGluZyBvZiB0aGUgZWxlbWVudHMgb2YgdGhlIGZpcnN0IGxpc3QgZm9sbG93ZWQgYnkgdGhlIGVsZW1lbnRzIG9mIHRoZSBzZWNvbmQuXG4gICAgICAgIHZhciBtZXJnZSA9IFIubWVyZ2UgPSBfKGZ1bmN0aW9uKGxpc3QxLCBsaXN0Mikge1xuICAgICAgICAgICAgaWYgKGlzRW1wdHkobGlzdDEpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNsb25lKGxpc3QyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpc3QxLmNvbmNhdChsaXN0Mik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBhbGlhc0ZvcihcIm1lcmdlXCIpLmlzKFwiY29uY2F0XCIpO1xuXG4gICAgICAgIC8vIEEgc3VycHJpc2luZ2x5IHVzZWZ1bCBmdW5jdGlvbiB0aGF0IGRvZXMgbm90aGluZyBidXQgcmV0dXJuIHRoZSBwYXJhbWV0ZXIgc3VwcGxpZWQgdG8gaXQuXG4gICAgICAgIHZhciBpZGVudGl0eSA9IFIuaWRlbnRpdHkgPSBmdW5jdGlvbih4KSB7cmV0dXJuIHg7fTtcbiAgICAgICAgYWxpYXNGb3IoXCJpZGVudGl0eVwiKS5pcyhcIklcIik7XG5cblxuXG4gICAgICAgIC8vIEdlbmVyYXRvcnNcbiAgICAgICAgLy8gLS0tLS0tLS0tLVxuICAgICAgICAvL1xuXG4gICAgICAgIC8vIFN1cHBvcnQgZm9yIGluZmluaXRlIGxpc3RzLCB1c2luZyBhbiBpbml0aWFsIHNlZWQsIGEgZnVuY3Rpb24gdGhhdCBjYWxjdWxhdGVzIHRoZSBoZWFkIGZyb20gdGhlIHNlZWQgYW5kXG4gICAgICAgIC8vIGEgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIGEgbmV3IHNlZWQgZnJvbSB0aGUgY3VycmVudCBzZWVkLiAgR2VuZXJhdG9yIG9iamVjdHMgaGF2ZSB0aGlzIHN0cnVjdHVyZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHtcbiAgICAgICAgLy8gICAgICAgIFwiMFwiOiBzb21lVmFsdWUsXG4gICAgICAgIC8vICAgICAgICB0YWlsOiBzb21lRnVuY3Rpb24oKSB7fSxcbiAgICAgICAgLy8gICAgICAgIGxlbmd0aDogSW5maW5pdHlcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy9cbiAgICAgICAgLy8gR2VuZXJhdG9yIG9iamVjdHMgYWxzbyBoYXZlIHN1Y2ggZnVuY3Rpb25zIGFzIGB0YWtlYCwgYHNraXBgLCBgbWFwYCwgYW5kIGBmaWx0ZXJgLCBidXQgdGhlIGVxdWl2YWxlbnRcbiAgICAgICAgLy8gZnVuY3Rpb25zIGZyb20gUmFtZGEgd2lsbCB3b3JrIHdpdGggdGhlbSBhcyB3ZWxsLlxuICAgICAgICAvL1xuICAgICAgICAvLyAjIyMgRXhhbXBsZSAjIyNcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBmaWJvbmFjY2kgPSBnZW5lcmF0b3IoXG4gICAgICAgIC8vICAgICAgICAgWzAsIDFdLFxuICAgICAgICAvLyAgICAgICAgIGZ1bmN0aW9uKHBhaXIpIHtyZXR1cm4gcGFpclswXTt9LFxuICAgICAgICAvLyAgICAgICAgIGZ1bmN0aW9uKHBhaXIpIHtyZXR1cm4gW3BhaXJbMV0sIHBhaXJbMF0gKyBwYWlyWzFdXTt9XG4gICAgICAgIC8vICAgICApO1xuICAgICAgICAvLyAgICAgdmFyIGV2ZW4gPSBmdW5jdGlvbihuKSB7cmV0dXJuIChuICUgMikgPT09IDA7fTtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHRha2UoNSwgZmlsdGVyKGV2ZW4sIGZpYm9uYWNjaSkpIC8vPT4gWzAsIDIsIDgsIDM0LCAxNDRdXG4gICAgICAgIC8vXG4gICAgICAgIC8vIE5vdGUgdGhhdCB0aGUgYHRha2UoNSlgIGNhbGwgaXMgbmVjZXNzYXJ5IHRvIGdldCBhIGZpbml0ZSBsaXN0IG91dCBvZiB0aGlzLiAgT3RoZXJ3aXNlLCB0aGlzIHdvdWxkIHN0aWxsXG4gICAgICAgIC8vIGJlIGFuIGluZmluaXRlIGxpc3QuXG5cbiAgICAgICAgUi5nZW5lcmF0b3IgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBwYXJ0aWFsIHNoaW0gZm9yIE9iamVjdC5jcmVhdGVcbiAgICAgICAgICAgIHZhciBjcmVhdGUgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIEYgPSBmdW5jdGlvbigpIHt9O1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgRi5wcm90b3R5cGUgPSBzcmM7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRigpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KCkpO1xuXG4gICAgICAgICAgICAvLyBUcmFtcG9saW5pbmcgdG8gc3VwcG9ydCByZWN1cnNpb24gaW4gR2VuZXJhdG9yc1xuICAgICAgICAgICAgdmFyIHRyYW1wb2xpbmUgPSBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBmbi5hcHBseSh0aGlzLCB0YWlsKGFyZ3VtZW50cykpO1xuICAgICAgICAgICAgICAgIHdoaWxlICh0eXBlb2YgcmVzdWx0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gSW50ZXJuYWwgR2VuZXJhdG9yIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICB2YXIgIEcgPSBmdW5jdGlvbihzZWVkLCBjdXJyZW50LCBzdGVwKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tcIjBcIl0gPSBjdXJyZW50KHNlZWQpO1xuICAgICAgICAgICAgICAgIHRoaXMudGFpbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEcoc3RlcChzZWVkKSwgY3VycmVudCwgc3RlcCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBHZW5lcmF0b3JzIGNhbiBiZSB1c2VkIHdpdGggT08gdGVjaG5pcXVlcyBhcyB3ZWxsIGFzIG91ciBzdGFuZGFyZCBmdW5jdGlvbmFsIGNhbGxzLiAgVGhlc2UgYXJlIHRoZVxuICAgICAgICAgICAgLy8gaW1wbGVtZW50YXRpb25zIG9mIHRob3NlIG1ldGhvZHMgYW5kIG90aGVyIHByb3BlcnRpZXMuXG4gICAgICAgICAgICBHLnByb3RvdHlwZSA9IHtcbiAgICAgICAgICAgICAgICAgY29uc3RydWN0b3I6IEcsXG4gICAgICAgICAgICAgICAgIC8vIEFsbCBnZW5lcmF0b3JzIGFyZSBpbmZpbml0ZS5cbiAgICAgICAgICAgICAgICAgbGVuZ3RoOiBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgLy8gYHRha2VgIGltcGxlbWVudGF0aW9uIGZvciBnZW5lcmF0b3JzLlxuICAgICAgICAgICAgICAgICB0YWtlOiBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgICAgICAgICB2YXIgdGFrZSA9IGZ1bmN0aW9uKGN0ciwgZywgcmV0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChjdHIgPT09IDApID8gcmV0IDogdGFrZShjdHIgLSAxLCBnLnRhaWwoKSwgcmV0LmNvbmNhdChbZ1swXV0pKTtcbiAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJhbXBvbGluZSh0YWtlLCBuLCB0aGlzLCBbXSk7XG4gICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgIC8vIGBza2lwYCBpbXBsZW1lbnRhdGlvbiBmb3IgZ2VuZXJhdG9ycy5cbiAgICAgICAgICAgICAgICAgc2tpcDogZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICAgICAgICAgdmFyIHNraXAgPSBmdW5jdGlvbihjdHIsIGcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGN0ciA8PSAwKSA/IGcgOiBza2lwKGN0ciAtIDEsIGcudGFpbCgpKTtcbiAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJhbXBvbGluZShza2lwLCBuLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgLy8gYG1hcGAgaW1wbGVtZW50YXRpb24gZm9yIGdlbmVyYXRvcnMuXG4gICAgICAgICAgICAgICAgIG1hcDogZnVuY3Rpb24oZm4sIGdlbikge1xuICAgICAgICAgICAgICAgICAgICAgdmFyIGcgPSBjcmVhdGUoRy5wcm90b3R5cGUpO1xuICAgICAgICAgICAgICAgICAgICAgZ1swXSA9IGZuKGdlblswXSk7XG4gICAgICAgICAgICAgICAgICAgICBnLnRhaWwgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMubWFwKGZuLCBnZW4udGFpbCgpKTsgfTtcbiAgICAgICAgICAgICAgICAgICAgIHJldHVybiBnO1xuICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAvLyBgZmlsdGVyYCBpbXBsZW1lbnRhdGlvbiBmb3IgZ2VuZXJhdG9ycy5cbiAgICAgICAgICAgICAgICAgZmlsdGVyOiBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgICAgICAgICAgdmFyIGdlbiA9IHRoaXMsIGhlYWQgPSBnZW5bMF07XG4gICAgICAgICAgICAgICAgICAgICB3aGlsZSAoIWZuKGhlYWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZ2VuID0gZ2VuLnRhaWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkID0gZ2VuWzBdO1xuICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgdmFyIGcgPSBjcmVhdGUoRy5wcm90b3R5cGUpO1xuICAgICAgICAgICAgICAgICAgICAgZ1swXSA9IGhlYWQ7XG4gICAgICAgICAgICAgICAgICAgICBnLnRhaWwgPSBmdW5jdGlvbigpIHtyZXR1cm4gZmlsdGVyKGZuLCBnZW4udGFpbCgpKTt9O1xuICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGc7XG4gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFRoZSBhY3R1YWwgcHVibGljIGBnZW5lcmF0b3JgIGZ1bmN0aW9uLlxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNlZWQsIGN1cnJlbnQsIHN0ZXApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEcoc2VlZCwgY3VycmVudCwgc3RlcCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KCkpO1xuXG5cbiAgICAgICAgLy8gRnVuY3Rpb24gZnVuY3Rpb25zIDotKVxuICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZXNlIGZ1bmN0aW9ucyBtYWtlIG5ldyBmdW5jdGlvbnMgb3V0IG9mIG9sZCBvbmVzLlxuXG4gICAgICAgIC8vIC0tLS0tLS0tXG5cbiAgICAgICAgLy8gQ3JlYXRlcyBhIG5ldyBmdW5jdGlvbiB0aGF0IHJ1bnMgZWFjaCBvZiB0aGUgZnVuY3Rpb25zIHN1cHBsaWVkIGFzIHBhcmFtZXRlcnMgaW4gdHVybiwgcGFzc2luZyB0aGUgb3V0cHV0XG4gICAgICAgIC8vIG9mIGVhY2ggb25lIHRvIHRoZSBuZXh0IG9uZSwgc3RhcnRpbmcgd2l0aCB3aGF0ZXZlciBhcmd1bWVudHMgd2VyZSBwYXNzZWQgdG8gdGhlIGluaXRpYWwgaW52b2NhdGlvbi5cbiAgICAgICAgLy8gTm90ZSB0aGF0IGlmIGB2YXIgaCA9IGNvbXBvc2UoZiwgZylgLCBgaCh4KWAgY2FsbHMgYGcoeClgIGZpcnN0LCBwYXNzaW5nIHRoZSByZXN1bHQgb2YgdGhhdCB0byBgZigpYC5cbiAgICAgICAgdmFyIGNvbXBvc2UgPSBSLmNvbXBvc2UgPSBmdW5jdGlvbigpIHsgIC8vIFRPRE86IHR5cGUgY2hlY2sgb2YgYXJndW1lbnRzP1xuICAgICAgICAgICAgdmFyIGZucyA9IHNsaWNlKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvbGRyKGZ1bmN0aW9uKGFyZ3MsIGZuKSB7IHJldHVybiBbZm4uYXBwbHkodGhpcywgYXJncyldOyB9LCBzbGljZShhcmd1bWVudHMpLCBmbnMpWzBdO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTaW1pbGFyIHRvIGBjb21wb3NlYCwgYnV0IHByb2Nlc3NlcyB0aGUgZnVuY3Rpb25zIGluIHRoZSByZXZlcnNlIG9yZGVyIHNvIHRoYXQgaWYgaWYgYHZhciBoID0gcGlwZShmLCBnKWAsXG4gICAgICAgIC8vIGBoKHgpYCBjYWxscyBgZih4KWAgZmlyc3QsIHBhc3NpbmcgdGhlIHJlc3VsdCBvZiB0aGF0IHRvIGBnKClgLlxuICAgICAgICBSLnBpcGUgPSBmdW5jdGlvbigpIHsgLy8gVE9ETzogdHlwZSBjaGVjayBvZiBhcmd1bWVudHM/XG4gICAgICAgICAgICByZXR1cm4gY29tcG9zZS5hcHBseSh0aGlzLCBzbGljZShhcmd1bWVudHMpLnJldmVyc2UoKSk7XG4gICAgICAgIH07XG4gICAgICAgIGFsaWFzRm9yKFwicGlwZVwiKS5pcyhcInNlcXVlbmNlXCIpO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgZnVuY3Rpb24gbXVjaCBsaWtlIHRoZSBzdXBwbGllZCBvbmUgZXhjZXB0IHRoYXQgdGhlIGZpcnN0IHR3byBhcmd1bWVudHMgYXJlIGludmVydGVkLlxuICAgICAgICB2YXIgZmxpcCA9IFIuZmxpcCA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgICAgICByZXR1cm4gXyhmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIFtiLCBhXS5jb25jYXQoc2xpY2UoYXJndW1lbnRzLCAyKSkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbi8vICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGZ1bmN0aW9uIG11Y2ggbGlrZSB0aGUgc3VwcGxpZWQgb25lIGV4Y2VwdCB0aGF0IHRoZSBmaXJzdCBhcmd1bWVudCBpcyBjeWNsZWQgdG8gdGhlIGVuZC5cbi8vICAgICAgICBSLmN5Y2xlID0gZnVuY3Rpb24oZm4pIHtcbi8vICAgICAgICAgICAgcmV0dXJuIG5BcnkoZm4ubGVuZ3RoLCBmdW5jdGlvbigpIHtcbi8vICAgICAgICAgICAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBzbGljZShhcmd1bWVudHMsIDEsIGZuLmxlbmd0aCkuY29uY2F0KGFyZ3VtZW50c1swXSkpO1xuLy8gICAgICAgICAgICB9KTtcbi8vICAgICAgICB9O1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgZnVuY3Rpb24gdGhhdCBhY3RzIGxpa2UgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uIGV4Y2VwdCB0aGF0IHRoZSBsZWZ0LW1vc3QgcGFyYW1ldGVycyBhcmVcbiAgICAgICAgLy8gcHJlLWZpbGxlZC5cbiAgICAgICAgUi5sUGFydGlhbCA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIGFyaXR5KE1hdGgubWF4KGZuLmxlbmd0aCAtIGFyZ3MubGVuZ3RoLCAwKSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MuY29uY2F0KHNsaWNlKGFyZ3VtZW50cykpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBhbGlhc0ZvcihcImxQYXJ0aWFsXCIpLmlzKFwiYXBwbHlMZWZ0XCIpO1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgZnVuY3Rpb24gdGhhdCBhY3RzIGxpa2UgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uIGV4Y2VwdCB0aGF0IHRoZSByaWdodC1tb3N0IHBhcmFtZXRlcnMgYXJlXG4gICAgICAgIC8vIHByZS1maWxsZWQuXG4gICAgICAgIFIuclBhcnRpYWwgPWZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIGFyaXR5KE1hdGgubWF4KGZuLmxlbmd0aCAtIGFyZ3MubGVuZ3RoLCAwKSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIHNsaWNlKGFyZ3VtZW50cykuY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBhbGlhc0ZvcihcInJQYXJ0aWFsXCIpLmlzKFwiYXBwbHlSaWdodFwiKTtcblxuICAgICAgICAvLyBDcmVhdGVzIGEgbmV3IGZ1bmN0aW9uIHRoYXQgc3RvcmVzIHRoZSByZXN1bHRzIG9mIHJ1bm5pbmcgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uIGFuZCByZXR1cm5zIHRob3NlXG4gICAgICAgIC8vIHN0b3JlZCB2YWx1ZSB3aGVuIHRoZSBzYW1lIHJlcXVlc3QgaXMgbWFkZS4gICoqTm90ZSoqOiB0aGlzIHJlYWxseSBvbmx5IGhhbmRsZXMgc3RyaW5nIGFuZCBudW1iZXIgcGFyYW1ldGVycy5cbiAgICAgICAgUi5tZW1vaXplID0gZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgICAgIHZhciBjYWNoZSA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBwb3NpdGlvbiA9IGZvbGRsKGZ1bmN0aW9uKGNhY2hlLCBhcmcpIHtyZXR1cm4gY2FjaGVbYXJnXSB8fCAoY2FjaGVbYXJnXSA9IHt9KTt9LCBjYWNoZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNsaWNlKGFyZ3VtZW50cywgMCwgYXJndW1lbnRzLmxlbmd0aCAtIDEpKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHBvc2l0aW9uW2FyZ10gfHwgKHBvc2l0aW9uW2FyZ10gPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpKSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFdyYXBzIGEgZnVuY3Rpb24gdXAgaW4gb25lIHRoYXQgd2lsbCBvbmx5IGNhbGwgdGhlIGludGVybmFsIG9uZSBvbmNlLCBubyBtYXR0ZXIgaG93IG1hbnkgdGltZXMgdGhlIG91dGVyIG9uZVxuICAgICAgICAvLyBpcyBjYWxsZWQuICAqKiBOb3RlKio6IHRoaXMgaXMgbm90IHJlYWxseSBwdXJlOyBpdCdzIG1vc3RseSBtZWFudCB0byBrZWVwIHNpZGUtZWZmZWN0cyBmcm9tIHJlcGVhdGluZy5cbiAgICAgICAgUi5vbmNlID0gZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgICAgIHZhciBjYWxsZWQgPSBmYWxzZSwgcmVzdWx0O1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsZWQpIHtyZXR1cm4gcmVzdWx0O31cbiAgICAgICAgICAgICAgICBjYWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gV3JhcCBhIGZ1bmN0aW9uIGluc2lkZSBhbm90aGVyIHRvIGFsbG93IHlvdSB0byBtYWtlIGFkanVzdG1lbnRzIHRvIHRoZSBwYXJhbWV0ZXJzIG9yIGRvIG90aGVyIHByb2Nlc3NpbmdcbiAgICAgICAgLy8gZWl0aGVyIGJlZm9yZSB0aGUgaW50ZXJuYWwgZnVuY3Rpb24gaXMgY2FsbGVkIG9yIHdpdGggaXRzIHJlc3VsdHMuXG4gICAgICAgIFIud3JhcCA9IGZ1bmN0aW9uKGZuLCB3cmFwcGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyYXBwZXIuYXBwbHkodGhpcywgW2ZuXS5jb25jYXQoc2xpY2UoYXJndW1lbnRzKSkpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBXcmFwcyBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGluc2lkZSBhIChjdXJyaWVkKSBwbGFpbiBmdW5jdGlvbiB0aGF0IGNhbiBiZSBjYWxsZWQgd2l0aCB0aGUgc2FtZSBhcmd1bWVudHNcbiAgICAgICAgLy8gYW5kIHJldHVybnMgdGhlIHNhbWUgdHlwZS4gIEFsbG93cywgZm9yIGluc3RhbmNlLFxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIFdpZGdldCA9IGZ1bmN0aW9uKGNvbmZpZykgeyAvKiAuLi4gKi8gfTsgLy8gQ29uc3RydWN0b3JcbiAgICAgICAgLy8gICAgIFdpZGdldC5wcm90b3R5cGUgPSB7IC8qIC4uLiAqLyB9XG4gICAgICAgIC8vICAgICBtYXAoY29uc3RydWN0KFdpZGdldCksIGFsbENvbmZpZ3MpOyAvLz0+IGxpc3Qgb2YgV2lkZ2V0c1xuICAgICAgICBSLmNvbnN0cnVjdCA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgICAgICB2YXIgZiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBvYmogPSBuZXcgZm4oKTtcbiAgICAgICAgICAgICAgICBmbi5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZm4ubGVuZ3RoID4gMSA/IF8obkFyeShmbi5sZW5ndGgsIGYpKSA6IGY7XG4gICAgICAgIH07XG5cblxuXG4gICAgICAgIC8vIExpc3QgRnVuY3Rpb25zXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZXNlIGZ1bmN0aW9ucyBvcGVyYXRlIG9uIGxvZ2ljYWwgbGlzdHMsIGhlcmUgcGxhaW4gYXJyYXlzLiAgQWxtb3N0IGFsbCBvZiB0aGVzZSBhcmUgY3VycmllZCwgYW5kIHRoZSBsaXN0XG4gICAgICAgIC8vIHBhcmFtZXRlciBjb21lcyBsYXN0LCBzbyB5b3UgY2FuIGNyZWF0ZSBhIG5ldyBmdW5jdGlvbiBieSBzdXBwbHlpbmcgdGhlIHByZWNlZGluZyBhcmd1bWVudHMsIGxlYXZpbmcgdGhlXG4gICAgICAgIC8vIGxpc3QgcGFyYW1ldGVyIG9mZi4gIEZvciBpbnN0YW5jZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIC8vIHNraXAgdGhpcmQgcGFyYW1ldGVyXG4gICAgICAgIC8vICAgICB2YXIgY2hlY2tBbGxQcmVkaWNhdGVzID0gcmVkdWNlKGFuZEZuLCBhbHdheXNUcnVlKTtcbiAgICAgICAgLy8gICAgIC8vIC4uLiBnaXZlbiBzdWl0YWJsZSBkZWZpbml0aW9ucyBvZiBvZGQsIGx0MjAsIGd0NVxuICAgICAgICAvLyAgICAgdmFyIHRlc3QgPSBjaGVja0FsbFByZWRpY2F0ZXMoW29kZCwgbHQyMCwgZ3Q1XSk7XG4gICAgICAgIC8vICAgICAvLyB0ZXN0KDcpID0+IHRydWUsIHRlc3QoOSkgPT4gdHJ1ZSwgdGVzdCgxMCkgPT4gZmFsc2UsXG4gICAgICAgIC8vICAgICAvLyB0ZXN0KDMpID0+IGZhbHNlLCB0ZXN0KDIxKSA9PiBmYWxzZSxcblxuICAgICAgICAvLyAtLS0tLS0tLVxuXG4gICAgICAgIC8vIFJldHVybnMgYSBzaW5nbGUgaXRlbSwgYnkgc3VjY2Vzc2l2ZWx5IGNhbGxpbmcgdGhlIGZ1bmN0aW9uIHdpdGggdGhlIGN1cnJlbnQgZWxlbWVudCBhbmQgdGhlIHRoZSBuZXh0XG4gICAgICAgIC8vIGVsZW1lbnQgb2YgdGhlIGxpc3QsIHBhc3NpbmcgdGhlIHJlc3VsdCB0byB0aGUgbmV4dCBjYWxsLiAgV2Ugc3RhcnQgd2l0aCB0aGUgYGFjY2AgcGFyYW1ldGVyIHRvIGdldFxuICAgICAgICAvLyB0aGluZ3MgZ29pbmcuICBUaGUgZnVuY3Rpb24gc3VwcGxpZWQgc2hvdWxkIGFjY2VwdCB0aGlzIHJ1bm5pbmcgdmFsdWUgYW5kIHRoZSBsYXRlc3QgZWxlbWVudCBvZiB0aGUgbGlzdCxcbiAgICAgICAgLy8gYW5kIHJldHVybiBhbiB1cGRhdGVkIHZhbHVlLlxuICAgICAgICB2YXIgZm9sZGwgPSBSLmZvbGRsID0gXyhmdW5jdGlvbihmbiwgYWNjLCBsaXN0KSB7XG4gICAgICAgICAgICB2YXIgaWR4ID0gLTEsIGxlbiA9IGxpc3QubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUoKytpZHggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICBhY2MgPSBmbihhY2MsIGxpc3RbaWR4XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9KTtcbiAgICAgICAgYWxpYXNGb3IoXCJmb2xkbFwiKS5pcyhcInJlZHVjZVwiKTtcblxuICAgICAgICAvLyBNdWNoIGxpa2UgYGZvbGRsYC9gcmVkdWNlYCwgZXhjZXB0IHRoYXQgdGhpcyB0YWtlcyBhcyBpdHMgc3RhcnRpbmcgdmFsdWUgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGxpc3QuXG4gICAgICAgIFIuZm9sZGwxID0gXyhmdW5jdGlvbiAoZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIGlmIChpc0VtcHR5KGxpc3QpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZm9sZGwxIGRvZXMgbm90IHdvcmsgb24gZW1wdHkgbGlzdHNcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZm9sZGwoZm4sIGhlYWQobGlzdCksIHRhaWwobGlzdCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTaW1pbGFyIHRvIGBmb2xkbGAvYHJlZHVjZWAgZXhjZXB0IHRoYXQgaXQgbW92ZXMgZnJvbSByaWdodCB0byBsZWZ0IG9uIHRoZSBsaXN0LlxuICAgICAgICB2YXIgZm9sZHIgPSBSLmZvbGRyID1fKGZ1bmN0aW9uKGZuLCBhY2MsIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpZHggPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlKGlkeC0tKSB7XG4gICAgICAgICAgICAgICAgYWNjID0gZm4oYWNjLCBsaXN0W2lkeF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFjYztcblxuICAgICAgICB9KTtcbiAgICAgICAgYWxpYXNGb3IoXCJmb2xkclwiKS5pcyhcInJlZHVjZVJpZ2h0XCIpO1xuXG5cbiAgICAgICAgLy8gTXVjaCBsaWtlIGBmb2xkcmAvYHJlZHVjZVJpZ2h0YCwgZXhjZXB0IHRoYXQgdGhpcyB0YWtlcyBhcyBpdHMgc3RhcnRpbmcgdmFsdWUgdGhlIGxhc3QgZWxlbWVudCBpbiB0aGUgbGlzdC5cbiAgICAgICAgUi5mb2xkcjEgPSBfKGZ1bmN0aW9uIChmbiwgbGlzdCkge1xuICAgICAgICAgICAgaWYgKGlzRW1wdHkobGlzdCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmb2xkcjEgZG9lcyBub3Qgd29yayBvbiBlbXB0eSBsaXN0c1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBuZXdMaXN0ID0gY2xvbmUobGlzdCksIGFjYyA9IG5ld0xpc3QucG9wKCk7XG4gICAgICAgICAgICByZXR1cm4gZm9sZHIoZm4sIGFjYywgbmV3TGlzdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJ1aWxkcyBhIGxpc3QgZnJvbSBhIHNlZWQgdmFsdWUsIHVzaW5nIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGZhbHN5IHRvIHF1aXQgYW5kIGEgcGFpciBvdGhlcndpc2UsXG4gICAgICAgIC8vIGNvbnNpc3Rpbmcgb2YgdGhlIGN1cnJlbnQgdmFsdWUgYW5kIHRoZSBzZWVkIHRvIGJlIHVzZWQgZm9yIHRoZSBuZXh0IHZhbHVlLlxuXG4gICAgICAgIFIudW5mb2xkciA9IF8oZnVuY3Rpb24oZm4sIHNlZWQpIHtcbiAgICAgICAgICAgIHZhciBwYWlyID0gZm4oc2VlZCksIHJlc3VsdCA9IFtdO1xuICAgICAgICAgICAgd2hpbGUgKHBhaXIgJiYgcGFpci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChwYWlyWzBdKTtcbiAgICAgICAgICAgICAgICBwYWlyID0gZm4ocGFpclsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCBjb25zdHJ1Y3RlZCBieSBhcHBseWluZyB0aGUgZnVuY3Rpb24gdG8gZXZlcnkgZWxlbWVudCBvZiB0aGUgbGlzdCBzdXBwbGllZC5cbiAgICAgICAgdmFyIG1hcCA9IFIubWFwID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgaWYgKGxpc3QgJiYgbGlzdC5sZW5ndGggPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpc3QubWFwKGZuLCBsaXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpZHggPSAtMSwgbGVuID0gbGlzdC5sZW5ndGgsIHJlc3VsdCA9IG5ldyBBcnJheShsZW4pO1xuICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0W2lkeF0gPSBmbihsaXN0W2lkeF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVwb3J0cyB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIHRoZSBsaXN0XG4gICAgICAgIFIuc2l6ZSA9IGZ1bmN0aW9uKGFycikge3JldHVybiBhcnIubGVuZ3RoO307XG5cbiAgICAgICAgLy8gKEludGVybmFsIHVzZSBvbmx5KSBUaGUgYmFzaWMgaW1wbGVtZW50YXRpb24gb2YgZmlsdGVyLlxuICAgICAgICB2YXIgaW50ZXJuYWxGaWx0ZXIgPSBfKGZ1bmN0aW9uKHVzZUlkeCwgZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIGlmIChsaXN0ICYmIGxpc3QubGVuZ3RoID09PSBJbmZpbml0eSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaXN0LmZpbHRlcihmbik7IC8vIFRPRE86IGZpZ3VyZSBvdXQgdXNlSWR4XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaWR4ID0gLTEsIGxlbiA9IGxpc3QubGVuZ3RoLCByZXN1bHQgPSBbXTtcbiAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IGxlbikge1xuICAgICAgICAgICAgICAgIGlmICghdXNlSWR4ICYmIGZuKGxpc3RbaWR4XSkgfHwgZm4obGlzdFtpZHhdLCBpZHgsIGxpc3QpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGxpc3RbaWR4XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IGNvbnRhaW5pbmcgb25seSB0aG9zZSBpdGVtcyB0aGF0IG1hdGNoIGEgZ2l2ZW4gcHJlZGljYXRlIGZ1bmN0aW9uLlxuICAgICAgICB2YXIgZmlsdGVyID0gUi5maWx0ZXIgPSBpbnRlcm5hbEZpbHRlcihmYWxzZSk7XG5cbiAgICAgICAgLy8gTGlrZSBgZmlsdGVyYCwgYnV0IHBhc3NlcyBhZGRpdGlvbmFsIHBhcmFtZXRlcnMgdG8gdGhlIHByZWRpY2F0ZSBmdW5jdGlvbi4gIFBhcmFtZXRlcnMgYXJlXG4gICAgICAgIC8vIGBsaXN0IGl0ZW1gLCBgaW5kZXggb2YgaXRlbSBpbiBsaXN0YCwgYGVudGlyZSBsaXN0YC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gRXhhbXBsZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBsYXN0VHdvID0gZnVuY3Rpb24odmFsLCBpZHgsIGxpc3QpIHtcbiAgICAgICAgLy8gICAgICAgICByZXR1cm4gbGlzdC5sZW5ndGggLSBpZHggPD0gMjtcbiAgICAgICAgLy8gICAgIH07XG4gICAgICAgIC8vICAgICBmaWx0ZXIuaWR4KGxhc3RUd28sIFs4LCA2LCA3LCA1LCAzLCAwICw5XSk7IC8vPT4gWzAsIDldXG4gICAgICAgIGZpbHRlci5pZHggPSBpbnRlcm5hbEZpbHRlcih0cnVlKTtcblxuICAgICAgICAvLyBTaW1pbGFyIHRvIGBmaWx0ZXJgLCBleGNlcHQgdGhhdCBpdCBrZWVwcyBvbmx5IHRob3NlIHRoYXQgKipkb24ndCoqIG1hdGNoIHRoZSBnaXZlbiBwcmVkaWNhdGUgZnVuY3Rpb25zLlxuICAgICAgICB2YXIgcmVqZWN0ID0gUi5yZWplY3QgPSBfKGZ1bmN0aW9uKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyKG5vdEZuKGZuKSwgbGlzdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIExpa2UgYHJlamVjdGAsIGJ1dCBwYXNzZXMgYWRkaXRpb25hbCBwYXJhbWV0ZXJzIHRvIHRoZSBwcmVkaWNhdGUgZnVuY3Rpb24uICBQYXJhbWV0ZXJzIGFyZVxuICAgICAgICAvLyBgbGlzdCBpdGVtYCwgYGluZGV4IG9mIGl0ZW0gaW4gbGlzdGAsIGBlbnRpcmUgbGlzdGAuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIEV4YW1wbGU6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgbGFzdFR3byA9IGZ1bmN0aW9uKHZhbCwgaWR4LCBsaXN0KSB7XG4gICAgICAgIC8vICAgICAgICAgcmV0dXJuIGxpc3QubGVuZ3RoIC0gaWR4IDw9IDI7XG4gICAgICAgIC8vICAgICB9O1xuICAgICAgICAvLyAgICAgcmVqZWN0LmlkeChsYXN0VHdvLCBbOCwgNiwgNywgNSwgMywgMCAsOV0pO1xuICAgICAgICAvLyAgICAgLy89PiBbOCwgNiwgNywgNSwgM11cbiAgICAgICAgcmVqZWN0LmlkeCA9IF8oZnVuY3Rpb24oZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXIuaWR4KG5vdEZuKGZuKSwgbGlzdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCBjb250YWluaW5nIHRoZSBlbGVtZW50cyBvZiB0aGUgZ2l2ZW4gbGlzdCB1cCB1bnRpbCB0aGUgZmlyc3Qgb25lIHdoZXJlIHRoZSBmdW5jdGlvblxuICAgICAgICAvLyBzdXBwbGllZCByZXR1cm5zIGBmYWxzZWAgd2hlbiBwYXNzZWQgdGhlIGVsZW1lbnQuXG4gICAgICAgIFIudGFrZVdoaWxlID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgdmFyIGlkeCA9IC0xLCBsZW4gPSBsaXN0Lmxlbmd0aCwgdGFraW5nID0gdHJ1ZSwgcmVzdWx0ID0gW107XG4gICAgICAgICAgICB3aGlsZSAodGFraW5nKSB7XG4gICAgICAgICAgICAgICAgKytpZHg7XG4gICAgICAgICAgICAgICAgaWYgKGlkeCA8IGxlbiAmJiBmbihsaXN0W2lkeF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGxpc3RbaWR4XSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFraW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IGNvbnRhaW5pbmcgdGhlIGZpcnN0IGBuYCBlbGVtZW50cyBvZiB0aGUgZ2l2ZW4gbGlzdC5cbiAgICAgICAgUi50YWtlID0gXyhmdW5jdGlvbihuLCBsaXN0KSB7XG4gICAgICAgICAgICBpZiAobGlzdCAmJiBsaXN0Lmxlbmd0aCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlzdC50YWtlKG4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGxzID0gY2xvbmUobGlzdCk7XG4gICAgICAgICAgICBscy5sZW5ndGggPSBuO1xuICAgICAgICAgICAgcmV0dXJuIGxzO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGxpc3QgY29udGFpbmluZyB0aGUgZWxlbWVudHMgb2YgdGhlIGdpdmVuIGxpc3Qgc3RhcnRpbmcgd2l0aCB0aGUgZmlyc3Qgb25lIHdoZXJlIHRoZSBmdW5jdGlvblxuICAgICAgICAvLyBzdXBwbGllZCByZXR1cm5zIGBmYWxzZWAgd2hlbiBwYXNzZWQgdGhlIGVsZW1lbnQuXG4gICAgICAgIFIuc2tpcFVudGlsID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgdmFyIGlkeCA9IC0xLCBsZW4gPSBsaXN0Lmxlbmd0aCwgdGFraW5nID0gZmFsc2UsIHJlc3VsdCA9IFtdO1xuICAgICAgICAgICAgd2hpbGUgKCF0YWtpbmcpIHtcbiAgICAgICAgICAgICAgICArK2lkeDtcbiAgICAgICAgICAgICAgICBpZiAoaWR4ID49IGxlbiB8fCBmbihsaXN0W2lkeF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHRha2luZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKGlkeCA8IGxlbikge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGxpc3RbaWR4KytdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCBjb250YWluaW5nIGFsbCAqKmJ1dCoqIHRoZSBmaXJzdCBgbmAgZWxlbWVudHMgb2YgdGhlIGdpdmVuIGxpc3QuXG4gICAgICAgIFIuc2tpcCA9IF8oZnVuY3Rpb24obiwgbGlzdCkge1xuICAgICAgICAgICAgaWYgKGxpc3QgJiYgbGlzdC5sZW5ndGggPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpc3Quc2tpcChuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzbGljZShsaXN0LCBuKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGFsaWFzRm9yKCdza2lwJykuaXMoJ2Ryb3AnKTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBlbGVtZW50IG9mIHRoZSBsaXN0IHdoaWNoIG1hdGNoZXMgdGhlIHByZWRpY2F0ZSwgb3IgYGZhbHNlYCBpZiBubyBlbGVtZW50IG1hdGNoZXMuXG4gICAgICAgIFIuZmluZCA9IF8oZnVuY3Rpb24oZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpZHggPSAtMSwgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICBpZiAoZm4obGlzdFtpZHhdKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlzdFtpZHhdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyB0aGUgaW5kZXggb2YgZmlyc3QgZWxlbWVudCBvZiB0aGUgbGlzdCB3aGljaCBtYXRjaGVzIHRoZSBwcmVkaWNhdGUsIG9yIGBmYWxzZWAgaWYgbm8gZWxlbWVudCBtYXRjaGVzLlxuICAgICAgICBSLmZpbmRJbmRleCA9IF8oZnVuY3Rpb24oZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpZHggPSAtMSwgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICBpZiAoZm4obGlzdFtpZHhdKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaWR4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyB0aGUgbGFzdCBlbGVtZW50IG9mIHRoZSBsaXN0IHdoaWNoIG1hdGNoZXMgdGhlIHByZWRpY2F0ZSwgb3IgYGZhbHNlYCBpZiBubyBlbGVtZW50IG1hdGNoZXMuXG4gICAgICAgIFIuZmluZExhc3QgPSBfKGZ1bmN0aW9uKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICB2YXIgaWR4ID0gbGlzdC5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoLS1pZHgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZm4obGlzdFtpZHhdKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlzdFtpZHhdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyB0aGUgaW5kZXggb2YgbGFzdCBlbGVtZW50IG9mIHRoZSBsaXN0IHdoaWNoIG1hdGNoZXMgdGhlIHByZWRpY2F0ZSwgb3IgYGZhbHNlYCBpZiBubyBlbGVtZW50IG1hdGNoZXMuXG4gICAgICAgIFIuZmluZExhc3RJbmRleCA9IF8oZnVuY3Rpb24oZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpZHggPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgtLWlkeCkge1xuICAgICAgICAgICAgICAgIGlmIChmbihsaXN0W2lkeF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpZHg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIGB0cnVlYCBpZiBhbGwgZWxlbWVudHMgb2YgdGhlIGxpc3QgbWF0Y2ggdGhlIHByZWRpY2F0ZSwgYGZhbHNlYCBpZiB0aGVyZSBhcmUgYW55IHRoYXQgZG9uJ3QuXG4gICAgICAgIHZhciBhbGwgPSBSLmFsbCA9IF8oZnVuY3Rpb24gKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICAgICAgd2hpbGUgKCsraSA8IGxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFmbihsaXN0W2ldKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICBhbGlhc0ZvcihcImFsbFwiKS5pcyhcImV2ZXJ5XCIpO1xuXG5cbiAgICAgICAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgYW55IGVsZW1lbnRzIG9mIHRoZSBsaXN0IG1hdGNoIHRoZSBwcmVkaWNhdGUsIGBmYWxzZWAgaWYgbm9uZSBkby5cbiAgICAgICAgdmFyIGFueSA9IFIuYW55ID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBsaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChmbihsaXN0W2ldKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBhbGlhc0ZvcihcImFueVwiKS5pcyhcInNvbWVcIik7XG5cbiAgICAgICAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGxpc3QgY29udGFpbnMgdGhlIHNvdWdodCBlbGVtZW50LCBgZmFsc2VgIGlmIGl0IGRvZXMgbm90LiAgRXF1YWxpdHkgaXMgc3RyaWN0IGhlcmUsXG4gICAgICAgIC8vIG1lYW5pbmcgcmVmZXJlbmNlIGVxdWFsaXR5IGZvciBvYmplY3RzIGFuZCBub24tY29lcmNpbmcgZXF1YWxpdHkgZm9yIHByaW1pdGl2ZXMuXG4gICAgICAgIHZhciBjb250YWlucyA9IFIuY29udGFpbnMgPSBfKGZ1bmN0aW9uKGEsIGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBsaXN0LmluZGV4T2YoYSkgPiAtMTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGxpc3QgY29udGFpbnMgdGhlIHNvdWdodCBlbGVtZW50LCBgZmFsc2VgIGlmIGl0IGRvZXMgbm90LCBiYXNlZCB1cG9uIHRoZSB2YWx1ZVxuICAgICAgICAvLyByZXR1cm5lZCBieSBhcHBseWluZyB0aGUgc3VwcGxpZWQgcHJlZGljYXRlZCB0byB0d28gbGlzdCBlbGVtZW50cy4gIEVxdWFsaXR5IGlzIHN0cmljdCBoZXJlLCBtZWFuaW5nXG4gICAgICAgIC8vIHJlZmVyZW5jZSBlcXVhbGl0eSBmb3Igb2JqZWN0cyBhbmQgbm9uLWNvZXJjaW5nIGVxdWFsaXR5IGZvciBwcmltaXRpdmVzLiAgUHJvYmFibHkgaW5lZmZpY2llbnQuXG4gICAgICAgIHZhciBjb250YWluc1dpdGggPSBfKGZ1bmN0aW9uKHByZWQsIHgsIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpZHggPSAtMSwgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICBpZiAocHJlZCh4LCBsaXN0W2lkeF0pKSB7cmV0dXJuIHRydWU7fVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGxpc3QgY29udGFpbmluZyBvbmx5IG9uZSBjb3B5IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgb3JpZ2luYWwgbGlzdC4gIEVxdWFsaXR5IGlzIHN0cmljdCBoZXJlLFxuICAgICAgICAvLyBtZWFuaW5nIHJlZmVyZW5jZSBlcXVhbGl0eSBmb3Igb2JqZWN0cyBhbmQgbm9uLWNvZXJjaW5nIGVxdWFsaXR5IGZvciBwcmltaXRpdmVzLlxuICAgICAgICB2YXIgdW5pcSA9IFIudW5pcSA9IGZ1bmN0aW9uKGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBmb2xkcihmdW5jdGlvbihhY2MsIHgpIHsgcmV0dXJuIChjb250YWlucyh4LCBhY2MpKSA/IGFjYyA6IHByZXBlbmQoeCwgYWNjKTsgfSwgRU1QVFksIGxpc3QpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCBjb250YWluaW5nIG9ubHkgb25lIGNvcHkgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBvcmlnaW5hbCBsaXN0LCBiYXNlZCB1cG9uIHRoZSB2YWx1ZVxuICAgICAgICAvLyByZXR1cm5lZCBieSBhcHBseWluZyB0aGUgc3VwcGxpZWQgcHJlZGljYXRlIHRvIHR3byBsaXN0IGVsZW1lbnRzLiAgIEVxdWFsaXR5IGlzIHN0cmljdCBoZXJlLCAgbWVhbmluZ1xuICAgICAgICAvLyByZWZlcmVuY2UgZXF1YWxpdHkgZm9yIG9iamVjdHMgYW5kIG5vbi1jb2VyY2luZyBlcXVhbGl0eSBmb3IgcHJpbWl0aXZlcy5cbiAgICAgICAgdmFyIHVuaXFXaXRoID0gXyhmdW5jdGlvbihwcmVkLCBsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gZm9sZHIoZnVuY3Rpb24oYWNjLCB4KSB7cmV0dXJuIChjb250YWluc1dpdGgocHJlZCwgeCwgYWNjKSkgPyBhY2MgOiBwcmVwZW5kKHgsIGFjYyk7IH0sIEVNUFRZLCBsaXN0KTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGxpc3QgYnkgcGx1Y2tpbmcgdGhlIHNhbWUgbmFtZWQgcHJvcGVydHkgb2ZmIGFsbCBvYmplY3RzIGluIHRoZSBsaXN0IHN1cHBsaWVkLlxuICAgICAgICB2YXIgcGx1Y2sgPSBSLnBsdWNrID0gXyhmdW5jdGlvbihwLCBsaXN0KSB7cmV0dXJuIG1hcChwcm9wKHApLCBsaXN0KTt9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbGlzdCB0aGF0IGNvbnRhaW5zIGEgZmxhdHRlbmVkIHZlcnNpb24gb2YgdGhlIHN1cHBsaWVkIGxpc3QuICBGb3IgZXhhbXBsZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIGZsYXR0ZW4oWzEsIDIsIFszLCA0XSwgNSwgWzYsIFs3LCA4LCBbOSwgWzEwLCAxMV0sIDEyXV1dXSk7XG4gICAgICAgIC8vICAgICAvLyA9PiBbMSwgMiwgMywgNCwgNSwgNiwgNywgOCwgOSwgMTAsIDExLCAxMl07XG4gICAgICAgIHZhciBmbGF0dGVuID0gUi5mbGF0dGVuID0gZnVuY3Rpb24obGlzdCkge1xuICAgICAgICAgICAgdmFyIGlkeCA9IC0xLCBsZW4gPSBsaXN0ID8gbGlzdC5sZW5ndGggOiAwLCByZXN1bHQgPSBbXSwgcHVzaCA9IHJlc3VsdC5wdXNoLCB2YWw7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICB2YWwgPSBsaXN0W2lkeF07XG4gICAgICAgICAgICAgICAgcHVzaC5hcHBseShyZXN1bHQsIGlzQXJyYXkodmFsKSA/IGZsYXR0ZW4odmFsKSA6IFt2YWxdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH07XG5cblxuICAgICAgICAvLyBDcmVhdGVzIGEgbmV3IGxpc3Qgb3V0IG9mIHRoZSB0d28gc3VwcGxpZWQgYnkgYXBwbHlpbmcgdGhlIGZ1bmN0aW9uIHRvIGVhY2ggZXF1YWxseS1wb3NpdGlvbmVkIHBhaXIgaW4gdGhlXG4gICAgICAgIC8vIGxpc3RzLiAgRm9yIGV4YW1wbGUsXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB6aXBXaXRoKGYsIFsxLCAyLCAzXSwgWydhJywgJ2InLCAnYyddKVxuICAgICAgICAvLyAgICAgLy8gICAgPT4gW2YoMSwgJ2EnKSwgZigyLCAnYicpLCBmKDMsICdjJyldO1xuICAgICAgICAvL1xuICAgICAgICAvLyBOb3RlIHRoYXQgdGhlIG91dHB1dCBsaXN0IHdpbGwgb25seSBiZSBhcyBsb25nIGFzIHRoZSBsZW5ndGggb3MgdGhlIGZpcnN0IGxpc3QgcGFzc2VkIGluLlxuICAgICAgICBSLnppcFdpdGggPSBfKGZ1bmN0aW9uKGZuLCBhLCBiKSB7XG4gICAgICAgICAgICB2YXIgcnYgPSBbXSwgaSA9IC0xLCBsZW4gPSBhLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlKCsraSA8IGxlbikge1xuICAgICAgICAgICAgICAgIHJ2W2ldID0gZm4oYVtpXSwgYltpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcnY7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgbGlzdCBvdXQgb2YgdGhlIHR3byBzdXBwbGllZCBieSB5aWVsZGluZyB0aGUgcGFpciBvZiBlYWNoIGVxdWFsbHktcG9zaXRpb25lZCBwYWlyIGluIHRoZVxuICAgICAgICAvLyBsaXN0cy4gIEZvciBleGFtcGxlLFxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgemlwKFsxLCAyLCAzXSwgWydhJywgJ2InLCAnYyddKVxuICAgICAgICAvLyAgICAgLy8gICAgPT4gW1sxLCAnYSddLCBbMiwgJ2InXSwgWzMsICdjJ11dO1xuICAgICAgICBSLnppcCA9ICBfKGZ1bmN0aW9uKGEsIGIpIHsgLy8gPSB6aXBXaXRoKHByZXBlbmQpO1xuICAgICAgICAgICAgdmFyIHJ2ID0gW10sIGkgPSAtMSwgbGVuID0gYS5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgcnZbaV0gPSBbYVtpXSwgYltpXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcnY7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgbGlzdCBvdXQgb2YgdGhlIHR3byBzdXBwbGllZCBieSBhcHBseWluZyB0aGUgZnVuY3Rpb24gdG8gZWFjaCBwb3NzaWJsZSBwYWlyIGluIHRoZSBsaXN0cy5cbiAgICAgICAgLy8gIEZvciBleGFtcGxlLFxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgeFByb2RXaXRoKGYsIFsxLCAyXSwgWydhJywgJ2InXSlcbiAgICAgICAgLy8gICAgIC8vICAgID0+IFtmKDEsICdhJyksIGYoMSwgJ2InKSwgZigyLCAnYScpLCBmKDIsICdiJyldO1xuICAgICAgICBSLnhwcm9kV2l0aCA9IF8oZnVuY3Rpb24oZm4sIGEsIGIpIHtcbiAgICAgICAgICAgIGlmIChpc0VtcHR5KGEpIHx8IGlzRW1wdHkoYikpIHtyZXR1cm4gRU1QVFk7fVxuICAgICAgICAgICAgdmFyIGkgPSAtMSwgaWxlbiA9IGEubGVuZ3RoLCBqLCBqbGVuID0gYi5sZW5ndGgsIHJlc3VsdCA9IFtdOyAvLyBiZXR0ZXIgdG8gcHVzaCB0aGVtIGFsbCBvciB0byBkbyBgbmV3IEFycmF5KGlsZW4gKiBqbGVuKWAgYW5kIGNhbGN1bGF0ZSBpbmRpY2VzP1xuICAgICAgICAgICAgd2hpbGUgKCsraSA8IGlsZW4pIHtcbiAgICAgICAgICAgICAgICBqID0gLTE7XG4gICAgICAgICAgICAgICAgd2hpbGUgKCsraiA8IGpsZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goZm4oYVtpXSwgYltqXSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgbGlzdCBvdXQgb2YgdGhlIHR3byBzdXBwbGllZCBieSB5aWVsZGluZyB0aGUgcGFpciBvZiBlYWNoIHBvc3NpYmxlIHBhaXIgaW4gdGhlIGxpc3RzLlxuICAgICAgICAvLyBGb3IgZXhhbXBsZSxcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHhQcm9kKFsxLCAyXSwgWydhJywgJ2InXSlcbiAgICAgICAgLy8gICAgIC8vICAgID0+IFtbMSwgJ2EnXSwgWzEsICdiJyldLCBbMiwgJ2EnXSwgWzIsICdiJ11dO1xuICAgICAgICBSLnhwcm9kID0gXyhmdW5jdGlvbihhLCBiKSB7IC8vID0geHByb2RXaXRoKHByZXBlbmQpOyAodGFrZXMgYWJvdXQgMyB0aW1lcyBhcyBsb25nLi4uKVxuICAgICAgICAgICAgaWYgKGlzRW1wdHkoYSkgfHwgaXNFbXB0eShiKSkge3JldHVybiBFTVBUWTt9XG4gICAgICAgICAgICB2YXIgaSA9IC0xLCBpbGVuID0gYS5sZW5ndGgsIGosIGpsZW4gPSBiLmxlbmd0aCwgcmVzdWx0ID0gW107IC8vIGJldHRlciB0byBwdXNoIHRoZW0gYWxsIG9yIHRvIGRvIGBuZXcgQXJyYXkoaWxlbiAqIGpsZW4pYCBhbmQgY2FsY3VsYXRlIGluZGljZXM/XG4gICAgICAgICAgICB3aGlsZSAoKytpIDwgaWxlbikge1xuICAgICAgICAgICAgICAgIGogPSAtMTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoKytqIDwgamxlbikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChbYVtpXSwgYltqXV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCB3aXRoIHRoZSBzYW1lIGVsZW1lbnRzIGFzIHRoZSBvcmlnaW5hbCBsaXN0LCBqdXN0IGluIHRoZSByZXZlcnNlIG9yZGVyLlxuICAgICAgICBSLnJldmVyc2UgPSBmdW5jdGlvbihsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gY2xvbmUobGlzdCB8fCBbXSkucmV2ZXJzZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIC8vIFJldHVybnMgYSBsaXN0IG9mIG51bWJlcnMgZnJvbSBgZnJvbWAgKGluY2x1c2l2ZSkgdG8gYHRvYCAoZXhjbHVzaXZlKS5cbiAgICAgICAgLy8gRm9yIGV4YW1wbGUsIFxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgcmFuZ2UoMSwgNSkgLy8gPT4gWzEsIDIsIDMsIDRdXG4gICAgICAgIC8vICAgICByYW5nZSg1MCwgNTMpIC8vID0+IFs1MCwgNTEsIDUyXVxuICAgICAgICBSLnJhbmdlID0gXyhmdW5jdGlvbihmcm9tLCB0bykge1xuICAgICAgICAgICAgaWYgKGZyb20gPj0gdG8pIHtyZXR1cm4gRU1QVFk7fVxuICAgICAgICAgICAgdmFyIGlkeCwgcmVzdWx0ID0gbmV3IEFycmF5KHRvIC0gZnJvbSk7XG4gICAgICAgICAgICBmb3IgKGlkeCA9IDA7IGZyb20gPCB0bzsgaWR4KyssIGZyb20rKykge1xuICAgICAgICAgICAgICAgIHJlc3VsdFtpZHhdID0gZnJvbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gUmV0dXJucyB0aGUgZmlyc3QgemVyby1pbmRleGVkIHBvc2l0aW9uIG9mIGFuIG9iamVjdCBpbiBhIGZsYXQgbGlzdFxuICAgICAgICBSLmluZGV4T2YgPSBfKGZ1bmN0aW9uKG9iaiwgbGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuIGxpc3QuaW5kZXhPZihvYmopO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRoZSBsYXN0IHplcm8taW5kZXhlZCBwb3NpdGlvbiBvZiBhbiBvYmplY3QgaW4gYSBmbGF0IGxpc3RcbiAgICAgICAgUi5sYXN0SW5kZXhPZiA9IF8oZnVuY3Rpb24ob2JqLCBsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gbGlzdC5sYXN0SW5kZXhPZihvYmopO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRoZSBlbGVtZW50cyBvZiB0aGUgbGlzdCBhcyBhIHN0cmluZyBqb2luZWQgYnkgYSBzZXBhcmF0b3IuXG4gICAgICAgIFIuam9pbiA9IF8oZnVuY3Rpb24oc2VwLCBsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gbGlzdC5qb2luKHNlcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHJhbWRhLnNwbGljZSBoYXMgYSBkaWZmZXJlbnQgY29udHJhY3QgdGhhbiBBcnJheS5zcGxpY2UuIEFycmF5LnNwbGljZSBtdXRhdGVzIGl0cyBhcnJheVxuICAgICAgICAvLyBhbmQgcmV0dXJucyB0aGUgcmVtb3ZlZCBlbGVtZW50cy4gcmFtZGEuc3BsaWNlIGRvZXMgbm90IG11dGF0ZSB0aGUgcGFzc2VkIGluIGxpc3QgKHdlbGwsXG4gICAgICAgIC8vIGl0IG1ha2VzIGEgc2hhbGxvdyBjb3B5KSwgYW5kIHJldHVybnMgYSBuZXcgbGlzdCB3aXRoIHRoZSBzcGVjaWZpZWQgZWxlbWVudHMgcmVtb3ZlZC4gXG4gICAgICAgIFIuc3BsaWNlID0gXyhmdW5jdGlvbihzdGFydCwgbGVuLCBsaXN0KSB7XG4gICAgICAgICAgICB2YXIgbHMgPSBzbGljZShsaXN0LCAwKTtcbiAgICAgICAgICAgIGxzLnNwbGljZShzdGFydCwgbGVuKTtcbiAgICAgICAgICAgIHJldHVybiBscztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyB0aGUgbnRoIGVsZW1lbnQgb2YgYSBsaXN0ICh6ZXJvLWluZGV4ZWQpXG4gICAgICAgIFIubnRoID0gXyhmdW5jdGlvbihuLCBsaXN0KSB7XG4gICAgICAgICAgcmV0dXJuIChsaXN0W25dID09PSB1bmRlZikgPyBudWxsIDogbGlzdFtuXTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTWFrZXMgYSBjb21wYXJhdG9yIGZ1bmN0aW9uIG91dCBvZiBhIGZ1bmN0aW9uIHRoYXQgcmVwb3J0cyB3aGV0aGVyIHRoZSBmaXJzdCBlbGVtZW50IGlzIGxlc3MgdGhhbiB0aGUgc2Vjb25kLlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIGNtcCA9IGNvbXBhcmF0b3IoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAvLyAgICAgICAgIHJldHVybiBhLmFnZSA8IGIuYWdlO1xuICAgICAgICAvLyAgICAgfTtcbiAgICAgICAgLy8gICAgIHNvcnQoY21wLCBwZW9wbGUpO1xuICAgICAgICB2YXIgY29tcGFyYXRvciA9IFIuY29tcGFyYXRvciA9IGZ1bmN0aW9uKHByZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByZWQoYSwgYikgPyAtMSA6IHByZWQoYiwgYSkgPyAxIDogMDtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIGNvcHkgb2YgdGhlIGxpc3QsIHNvcnRlZCBhY2NvcmRpbmcgdG8gdGhlIGNvbXBhcmF0b3IgZnVuY3Rpb24sIHdoaWNoIHNob3VsZCBhY2NlcHQgdHdvIHZhbHVlcyBhdCBhXG4gICAgICAgIC8vIHRpbWUgYW5kIHJldHVybiBhIG5lZ2F0aXZlIG51bWJlciBpZiB0aGUgZmlyc3QgdmFsdWUgaXMgc21hbGxlciwgYSBwb3NpdGl2ZSBudW1iZXIgaWYgaXQncyBsYXJnZXIsIGFuZCB6ZXJvXG4gICAgICAgIC8vIGlmIHRoZXkgYXJlIGVxdWFsLiAgUGxlYXNlIG5vdGUgdGhhdCB0aGlzIGlzIGEgKipjb3B5Kiogb2YgdGhlIGxpc3QuICBJdCBkb2VzIG5vdCBtb2RpZnkgdGhlIG9yaWdpbmFsLlxuICAgICAgICB2YXIgc29ydCA9IFIuc29ydCA9IF8oZnVuY3Rpb24oY29tcGFyYXRvciwgbGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuIGNsb25lKGxpc3QpLnNvcnQoY29tcGFyYXRvcik7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZXNlIGZ1bmN0aW9ucyBvcGVyYXRlIG9uIHBsYWluIEphdmFzY3JpcHQgb2JqZWN0LCBhZGRpbmcgc2ltcGxlIGZ1bmN0aW9ucyB0byB0ZXN0IHByb3BlcnRpZXMgb24gdGhlc2VcbiAgICAgICAgLy8gb2JqZWN0cy4gIE1hbnkgb2YgdGhlc2UgYXJlIG9mIG1vc3QgdXNlIGluIGNvbmp1bmN0aW9uIHdpdGggdGhlIGxpc3QgZnVuY3Rpb25zLCBvcGVyYXRpbmcgb24gbGlzdHMgb2ZcbiAgICAgICAgLy8gb2JqZWN0cy5cblxuICAgICAgICAvLyAtLS0tLS0tLVxuXG4gICAgICAgIC8vIFJ1bnMgdGhlIGdpdmVuIGZ1bmN0aW9uIHdpdGggdGhlIHN1cHBsaWVkIG9iamVjdCwgdGhlbiByZXR1cm5zIHRoZSBvYmplY3QuXG4gICAgICAgIFIudGFwID0gXyhmdW5jdGlvbih4LCBmbikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgZm4oeCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfSk7XG4gICAgICAgIGFsaWFzRm9yKFwidGFwXCIpLmlzKFwiS1wiKTsgLy8gVE9ETzogYXJlIHdlIHN1cmU/IE5vdCBuZWNlc3NhcnksIGJ1dCBjb252ZW5pZW50LCBJTUhPLlxuXG4gICAgICAgIC8vIFRlc3RzIGlmIHR3byBpdGVtcyBhcmUgZXF1YWwuICBFcXVhbGl0eSBpcyBzdHJpY3QgaGVyZSwgbWVhbmluZyByZWZlcmVuY2UgZXF1YWxpdHkgZm9yIG9iamVjdHMgYW5kXG4gICAgICAgIC8vIG5vbi1jb2VyY2luZyBlcXVhbGl0eSBmb3IgcHJpbWl0aXZlcy5cbiAgICAgICAgUi5lcSA9IF8oZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIGEgPT09IGI7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdoZW4gc3VwcGxpZWQgYW4gb2JqZWN0IHJldHVybnMgdGhlIGluZGljYXRlZCBwcm9wZXJ0eSBvZiB0aGF0IG9iamVjdCwgaWYgaXQgZXhpc3RzLlxuICAgICAgICB2YXIgcHJvcCA9IFIucHJvcCA9IF8oZnVuY3Rpb24ocCwgb2JqKSB7cmV0dXJuIG9ialtwXTt9KTtcbiAgICAgICAgYWxpYXNGb3IoXCJwcm9wXCIpLmlzKFwiZ2V0XCIpOyAvLyBUT0RPOiBhcmUgd2Ugc3VyZT8gIE1hdGNoZXMgc29tZSBvdGhlciBsaWJzLCBidXQgbWlnaHQgd2FudCB0byByZXNlcnZlIGZvciBvdGhlciB1c2UuXG5cbiAgICAgICAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2hlbiBzdXBwbGllZCBhbiBvYmplY3QgcmV0dXJucyB0aGUgcmVzdWx0IG9mIHJ1bm5pbmcgdGhlIGluZGljYXRlZCBmdW5jdGlvbiBvblxuICAgICAgICAvLyB0aGF0IG9iamVjdCwgaWYgaXQgaGFzIHN1Y2ggYSBmdW5jdGlvbi5cbiAgICAgICAgUi5mdW5jID0gXyhmdW5jdGlvbihmbiwgb2JqKSB7cmV0dXJuIG9ialtmbl0uYXBwbHkob2JqLCBzbGljZShhcmd1bWVudHMsIDIpKTt9KTtcblxuXG4gICAgICAgIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdoZW4gc3VwcGxpZWQgYSBwcm9wZXJ0eSBuYW1lIHJldHVybnMgdGhhdCBwcm9wZXJ0eSBvbiB0aGUgaW5kaWNhdGVkIG9iamVjdCwgaWYgaXRcbiAgICAgICAgLy8gZXhpc3RzLlxuICAgICAgICBSLnByb3BzID0gXyhmdW5jdGlvbihvYmosIHByb3ApIHtyZXR1cm4gb2JqICYmIG9ialtwcm9wXTt9KTtcblxuXG4gICAgICAgIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGFsd2F5cyByZXR1cm5zIHRoZSBnaXZlbiB2YWx1ZS5cbiAgICAgICAgdmFyIGFsd2F5cyA9IFIuYWx3YXlzID0gZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7cmV0dXJuIHZhbDt9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBhbnlCbGFua3MgPSBhbnkoZnVuY3Rpb24odmFsKSB7cmV0dXJuIHZhbCA9PT0gbnVsbCB8fCB2YWwgPT09IHVuZGVmO30pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBjYWxsIHRoZSBpbmRpY2F0ZWQgZnVuY3Rpb24gaWYgdGhlIGNvcnJlY3QgbnVtYmVyIG9mIChkZWZpbmVkLCBub24tbnVsbClcbiAgICAgICAgLy8gYXJndW1lbnRzIGFyZSBzdXBwbGllZCwgcmV0dXJuaW5nIGB1bmRlZmluZWRgIG90aGVyd2lzZS5cbiAgICAgICAgUi5tYXliZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGFyZ3VtZW50cy5sZW5ndGggPT09IDAgfHwgYW55QmxhbmtzKGV4cGFuZChhcmd1bWVudHMsIGZuLmxlbmd0aCkpKSA/IHVuZGVmIDogZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIGxpc3QgY29udGFpbmluZyB0aGUgbmFtZXMgb2YgYWxsIHRoZSBlbnVtZXJhYmxlIG93blxuICAgICAgICAvLyBwcm9wZXJ0aWVzIG9mIHRoZSBzdXBwbGllZCBvYmplY3QuXG4gICAgICAgIHZhciBrZXlzID0gUi5rZXlzID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgdmFyIHByb3AsIGtzID0gW107XG4gICAgICAgICAgICBmb3IgKHByb3AgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgICAgICBrcy5wdXNoKHByb3ApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBrcztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbGlzdCBvZiBhbGwgdGhlIGVudW1lcmFibGUgb3duIHByb3BlcnRpZXMgb2YgdGhlIHN1cHBsaWVkIG9iamVjdC5cbiAgICAgICAgUi52YWx1ZXMgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICB2YXIgcHJvcCwgdnMgPSBbXTtcbiAgICAgICAgICAgIGZvciAocHJvcCBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIHZzLnB1c2gob2JqW3Byb3BdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdnM7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHBhcnRpYWxDb3B5ID0gZnVuY3Rpb24odGVzdCwgb2JqKSB7XG4gICAgICAgICAgICB2YXIgY29weSA9IHt9O1xuICAgICAgICAgICAgZWFjaChmdW5jdGlvbihrZXkpIHtpZiAodGVzdChrZXksIG9iaikpIHtjb3B5W2tleV0gPSBvYmpba2V5XTt9fSwga2V5cyhvYmopKTtcbiAgICAgICAgICAgIHJldHVybiBjb3B5O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBwYXJ0aWFsIGNvcHkgb2YgYW4gb2JqZWN0IGNvbnRhaW5pbmcgb25seSB0aGUga2V5cyBzcGVjaWZpZWQuICBJZiB0aGUga2V5IGRvZXMgbm90IGV4aXN0LCB0aGVcbiAgICAgICAgLy8gcHJvcGVydHkgaXMgaWdub3JlZFxuICAgICAgICBSLnBpY2sgPSBfKGZ1bmN0aW9uKG5hbWVzLCBvYmopIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJ0aWFsQ29weShmdW5jdGlvbihrZXkpIHtyZXR1cm4gY29udGFpbnMoa2V5LCBuYW1lcyk7fSwgb2JqKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2ltaWxhciB0byBgcGlja2AgZXhjZXB0IHRoYXQgdGhpcyBvbmUgaW5jbHVkZXMgYSBga2V5OiB1bmRlZmluZWRgIHBhaXIgZm9yIHByb3BlcnRpZXMgdGhhdCBkb24ndCBleGlzdC5cbiAgICAgICAgdmFyIHBpY2tBbGwgPSBSLnBpY2tBbGwgPSBfKGZ1bmN0aW9uKG5hbWVzLCBvYmopIHtcbiAgICAgICAgICAgIHZhciBjb3B5ID0ge307XG4gICAgICAgICAgICBlYWNoKGZ1bmN0aW9uKG5hbWUpIHsgY29weVtuYW1lXSA9IG9ialtuYW1lXTsgfSwgbmFtZXMpO1xuICAgICAgICAgICAgcmV0dXJuIGNvcHk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBwYXJ0aWFsIGNvcHkgb2YgYW4gb2JqZWN0IG9taXR0aW5nIHRoZSBrZXlzIHNwZWNpZmllZC5cbiAgICAgICAgUi5vbWl0ID0gXyhmdW5jdGlvbihuYW1lcywgb2JqKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFydGlhbENvcHkoZnVuY3Rpb24oa2V5KSB7cmV0dXJuICFjb250YWlucyhrZXksIG5hbWVzKTt9LCBvYmopO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFJlcG9ydHMgd2hldGhlciB0d28gZnVuY3Rpb25zIGhhdmUgdGhlIHNhbWUgdmFsdWUgZm9yIHRoZSBzcGVjaWZpZWQgcHJvcGVydHkuICBVc2VmdWwgYXMgYSBjdXJyaWVkIHByZWRpY2F0ZS5cbiAgICAgICAgUi5lcVByb3BzID0gXyhmdW5jdGlvbihwcm9wLCBvYmoxLCBvYmoyKSB7cmV0dXJuIG9iajFbcHJvcF0gPT09IG9iajJbcHJvcF07fSk7XG5cbiAgICAgICAgLy8gYHdoZXJlYCB0YWtlcyBhIHNwZWMgb2JqZWN0IGFuZCBhIHRlc3Qgb2JqZWN0IGFuZCByZXR1cm5zIHRydWUgaW9mIHRoZSB0ZXN0IHNhdGlzZmllcyB0aGUgc3BlYywgXG4gICAgICAgIC8vIGVsc2UgZmFsc2UuIEFueSBwcm9wZXJ0eSBvbiB0aGUgc3BlYyB0aGF0IGlzIG5vdCBhIGZ1bmN0aW9uIGlzIGludGVycHJldGVkIGFzIGFuIGVxdWFsaXR5IFxuICAgICAgICAvLyByZWxhdGlvbi4gRm9yIGV4YW1wbGU6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgc3BlYyA9IHt4OiAyfTtcbiAgICAgICAgLy8gICAgIHdoZXJlKHNwZWMsIHt3OiAxMCwgeDogMiwgeTogMzAwfSk7IC8vID0+IHRydWUsIHggPT09IDJcbiAgICAgICAgLy8gICAgIHdoZXJlKHNwZWMsIHt4OiAxLCB5OiAnbW9vJywgejogdHJ1ZX0pOyAvLyA9PiBmYWxzZSwgeCAhPT0gMlxuICAgICAgICAvL1xuICAgICAgICAvLyBJZiB0aGUgc3BlYyBoYXMgYSBwcm9wZXJ0eSBtYXBwZWQgdG8gYSBmdW5jdGlvbiwgdGhlbiBgd2hlcmVgIGV2YWx1YXRlcyB0aGUgZnVuY3Rpb24sIHBhc3NpbmcgaW4gXG4gICAgICAgIC8vIHRoZSB0ZXN0IG9iamVjdCdzIHZhbHVlIGZvciB0aGUgcHJvcGVydHkgaW4gcXVlc3Rpb24sIGFzIHdlbGwgYXMgdGhlIHdob2xlIHRlc3Qgb2JqZWN0LiBGb3IgZXhhbXBsZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBzcGVjID0ge3g6IGZ1bmN0aW9uKHZhbCwgb2JqKSB7IHJldHVybiAgdmFsICsgb2JqLnkgPiAxMDsgfTtcbiAgICAgICAgLy8gICAgIHdoZXJlKHNwZWMsIHt4OiAyLCB5OiA3fSk7IC8vID0+IGZhbHNlXG4gICAgICAgIC8vICAgICB3aGVyZShzcGVjLCB7eDogMywgeTogOH0pOyAvLyA9PiB0cnVlXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGB3aGVyZWAgaXMgd2VsbCBzdWl0ZWQgdG8gZGVjbGFyYXRpdmxleSBleHByZXNzaW5nIGNvbnN0cmFpbnRzIGZvciBvdGhlciBmdW5jdGlvbnMsIGUuZy4sIGBmaWx0ZXJgOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIHhzID0gW3t4OiAyLCB5OiAxfSwge3g6IDEwLCB5OiAyfSwgXG4gICAgICAgIC8vICAgICAgICAgICAgICAge3g6IDgsIHk6IDN9LCB7eDogMTAsIHk6IDR9XTtcbiAgICAgICAgLy8gICAgIHZhciBmeHMgPSBmaWx0ZXIod2hlcmUoe3g6IDEwfSksIHhzKTsgXG4gICAgICAgIC8vICAgICAvLyBmeHMgPT0+IFt7eDogMTAsIHk6IDJ9LCB7eDogMTAsIHk6IDR9XVxuICAgICAgICAvL1xuICAgICAgICBSLndoZXJlID0gXyhmdW5jdGlvbihzcGVjLCB0ZXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gYWxsKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBzcGVjW2tleV07XG4gICAgICAgICAgICAgICAgcmV0dXJuICh0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSA/IHZhbCh0ZXN0W2tleV0sIHRlc3QpIDogKHRlc3Rba2V5XSA9PT0gdmFsKTtcbiAgICAgICAgICAgIH0sIGtleXMoc3BlYykpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIE1pc2NlbGxhbmVvdXMgRnVuY3Rpb25zXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG4gICAgICAgIC8vIEEgZmV3IGZ1bmN0aW9ucyBpbiBuZWVkIG9mIGEgZ29vZCBob21lLlxuXG4gICAgICAgIC8vIC0tLS0tLS0tXG5cbiAgICAgICAgLy8gRXhwb3NlIHRoZSBmdW5jdGlvbnMgZnJvbSByYW1kYSBhcyBwcm9wZXJ0aWVzIG9uIGFub3RoZXIgb2JqZWN0LiAgSWYgdGhpcyBvYmplY3QgaXMgdGhlIGdsb2JhbCBvYmplY3QsIHRoZW5cbiAgICAgICAgLy8gaXQgd2lsbCBiZSBhcyB0aG91Z2ggdGhlIGV3ZWRhIGZ1bmN0aW9ucyBhcmUgZ2xvYmFsIGZ1bmN0aW9ucy5cbiAgICAgICAgUi5pbnN0YWxsVG8gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgICAgIGVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICAgICAgKG9iaiB8fCBnbG9iYWwpW2tleV0gPSBSW2tleV07XG4gICAgICAgICAgICB9KShrZXlzKFIpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBIGZ1bmN0aW9uIHRoYXQgYWx3YXlzIHJldHVybnMgYDBgLlxuICAgICAgICBSLmFsd2F5c1plcm8gPSBhbHdheXMoMCk7XG5cbiAgICAgICAgLy8gQSBmdW5jdGlvbiB0aGF0IGFsd2F5cyByZXR1cm5zIGBmYWxzZWAuXG4gICAgICAgIFIuYWx3YXlzRmFsc2UgPSBhbHdheXMoZmFsc2UpO1xuXG4gICAgICAgIC8vIEEgZnVuY3Rpb24gdGhhdCBhbHdheXMgcmV0dXJucyBgdHJ1ZWAuXG4gICAgICAgIFIuYWx3YXlzVHJ1ZSA9IGFsd2F5cyh0cnVlKTtcblxuXG5cbiAgICAgICAgLy8gTG9naWMgRnVuY3Rpb25zXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAvL1xuICAgICAgICAvLyBUaGVzZSBmdW5jdGlvbnMgYXJlIHZlcnkgc2ltcGxlIHdyYXBwZXJzIGFyb3VuZCB0aGUgYnVpbHQtaW4gbG9naWNhbCBvcGVyYXRvcnMsIHVzZWZ1bCBpbiBidWlsZGluZyB1cFxuICAgICAgICAvLyBtb3JlIGNvbXBsZXggZnVuY3Rpb25hbCBmb3Jtcy5cblxuICAgICAgICAvLyAtLS0tLS0tLVxuXG4gICAgICAgIC8vIEEgZnVuY3Rpb24gd3JhcHBpbmcgdGhlIGJvb2xlYW4gYCYmYCBvcGVyYXRvci4gIE5vdGUgdGhhdCB1bmxpa2UgdGhlIHVuZGVybHlpbmcgb3BlcmF0b3IsIHRob3VnaCwgaXRcbiAgICAgICAgLy8gYXdheXMgcmV0dXJucyBgdHJ1ZWAgb3IgYGZhbHNlYC5cbiAgICAgICAgUi5hbmQgPSBfKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gISEoYSAmJiBiKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQSBmdW5jdGlvbiB3cmFwcGluZyB0aGUgYm9vbGVhbiBgfHxgIG9wZXJhdG9yLiAgTm90ZSB0aGF0IHVubGlrZSB0aGUgdW5kZXJseWluZyBvcGVyYXRvciwgdGhvdWdoLCBpdFxuICAgICAgICAvLyBhd2F5cyByZXR1cm5zIGB0cnVlYCBvciBgZmFsc2VgLlxuICAgICAgICBSLm9yID0gXyhmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuICEhKGEgfHwgYik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEEgZnVuY3Rpb24gd3JhcHBpbmcgdGhlIGJvb2xlYW4gYCFgIG9wZXJhdG9yLiAgSXQgcmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHBhcmFtZXRlciBpcyBmYWxzZS15IGFuZCBgZmFsc2VgIGlmXG4gICAgICAgIC8vIHRoZSBwYXJhbWV0ZXIgaXMgdHJ1dGgteVxuICAgICAgICBSLm5vdCA9IGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICByZXR1cm4gIWE7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQSBmdW5jdGlvbiB3cmFwcGluZyBjYWxscyB0byB0aGUgdHdvIGZ1bmN0aW9ucyBpbiBhbiBgJiZgIG9wZXJhdGlvbiwgcmV0dXJuaW5nIGB0cnVlYCBvciBgZmFsc2VgLiAgTm90ZSB0aGF0XG4gICAgICAgIC8vIHRoaXMgaXMgc2hvcnQtY2lyY3VpdGVkLCBtZWFuaW5nIHRoYXQgdGhlIHNlY29uZCBmdW5jdGlvbiB3aWxsIG5vdCBiZSBpbnZva2VkIGlmIHRoZSBmaXJzdCByZXR1cm5zIGEgZmFsc2UteVxuICAgICAgICAvLyB2YWx1ZS5cbiAgICAgICAgUi5hbmRGbiA9IF8oZnVuY3Rpb24oZiwgZykgeyAvLyBUT0RPOiBhcml0eT9cbiAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge3JldHVybiAhIShmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgJiYgZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTt9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBIGZ1bmN0aW9uIHdyYXBwaW5nIGNhbGxzIHRvIHRoZSB0d28gZnVuY3Rpb25zIGluIGFuIGB8fGAgb3BlcmF0aW9uLCByZXR1cm5pbmcgYHRydWVgIG9yIGBmYWxzZWAuICBOb3RlIHRoYXRcbiAgICAgICAgLy8gdGhpcyBpcyBzaG9ydC1jaXJjdWl0ZWQsIG1lYW5pbmcgdGhhdCB0aGUgc2Vjb25kIGZ1bmN0aW9uIHdpbGwgbm90IGJlIGludm9rZWQgaWYgdGhlIGZpcnN0IHJldHVybnMgYSB0cnV0aC15XG4gICAgICAgIC8vIHZhbHVlLiAoTm90ZSBhbHNvIHRoYXQgYXQgbGVhc3QgT2xpdmVyIFR3aXN0IGNhbiBwcm9ub3VuY2UgdGhpcyBvbmUuLi4pXG4gICAgICAgIFIub3JGbiA9IF8oZnVuY3Rpb24oZiwgZykgeyAvLyBUT0RPOiBhcml0eT9cbiAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge3JldHVybiAhIShmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTt9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBIGZ1bmN0aW9uIHdyYXBwaW5nIGEgY2FsbCB0byB0aGUgZ2l2ZW4gZnVuY3Rpb24gaW4gYSBgIWAgb3BlcmF0aW9uLiAgSXQgd2lsbCByZXR1cm4gYHRydWVgIHdoZW4gdGhlXG4gICAgICAgIC8vIHVuZGVybHlpbmcgZnVuY3Rpb24gd291bGQgcmV0dXJuIGEgZmFsc2UteSB2YWx1ZSwgYW5kIGBmYWxzZWAgd2hlbiBpdCB3b3VsZCByZXR1cm4gYSB0cnV0aC15IG9uZS5cbiAgICAgICAgdmFyIG5vdEZuID0gUi5ub3RGbiA9IGZ1bmN0aW9uIChmKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7cmV0dXJuICFmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7fTtcbiAgICAgICAgfTtcblxuXG4gICAgICAgIC8vIFRPRE86IGlzIHRoZXJlIGEgd2F5IHRvIHVuaWZ5IGFsbFByZWRpY2F0ZXMgYW5kIGFueVByZWRpY2F0ZXM/IHRoZXkgYXJlIHNvb29vbyBzaW1pbGFyXG4gICAgICAgIC8vIEdpdmVuIGEgbGlzdCBvZiBwcmVkaWNhdGVzIHJldHVybnMgYSBuZXcgcHJlZGljYXRlIHRoYXQgd2lsbCBiZSB0cnVlIGV4YWN0bHkgd2hlbiBhbGwgb2YgdGhlbSBhcmUuXG4gICAgICAgIFIuYWxsUHJlZGljYXRlcyA9IGZ1bmN0aW9uKHByZWRzIC8qLCB2YWwxLCB2YWwxMiwgLi4uICovKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICB2YXIgbWF4QXJpdHkgPSBtYXgobWFwKGZ1bmN0aW9uKGYpIHsgcmV0dXJuIGYubGVuZ3RoOyB9LCBwcmVkcykpO1xuXG4gICAgICAgICAgICB2YXIgYW5kUHJlZHMgPSBhcml0eShtYXhBcml0eSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IC0xO1xuICAgICAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IHByZWRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXByZWRzW2lkeF0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiAoaXNFbXB0eShhcmdzKSkgPyBhbmRQcmVkcyA6IGFuZFByZWRzLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICB9O1xuXG5cbiAgICAgIC8vIEdpdmVuIGEgbGlzdCBvZiBwcmVkaWNhdGVzIHJldHVybnMgYSBuZXcgcHJlZGljYXRlIHRoYXQgd2lsbCBiZSB0cnVlIGV4YWN0bHkgd2hlbiBhbnkgb25lIG9mIHRoZW0gaXMuXG4gICAgICAgIFIuYW55UHJlZGljYXRlcyA9IGZ1bmN0aW9uKHByZWRzIC8qLCB2YWwxLCB2YWwxMiwgLi4uICovKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICB2YXIgbWF4QXJpdHkgPSBtYXgobWFwKGZ1bmN0aW9uKGYpIHsgcmV0dXJuIGYubGVuZ3RoOyB9LCBwcmVkcykpO1xuXG4gICAgICAgICAgICB2YXIgb3JQcmVkcyA9IGFyaXR5KG1heEFyaXR5LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgcHJlZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmVkc1tpZHhdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gKGlzRW1wdHkoYXJncykpID8gb3JQcmVkcyA6IG9yUHJlZHMuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgIH07XG5cblxuXG4gICAgICAgIC8vIEFyaXRobWV0aWMgRnVuY3Rpb25zXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZXNlIGZ1bmN0aW9ucyB3cmFwIHVwIHRoZSBjZXJ0YWluIGNvcmUgYXJpdGhtZXRpYyBvcGVyYXRvcnNcblxuICAgICAgICAvLyAtLS0tLS0tLVxuXG4gICAgICAgIC8vIEFkZHMgdHdvIG51bWJlcnMuICBBdXRvbWF0aWMgY3VycmllZDpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBhZGQ3ID0gYWRkKDcpO1xuICAgICAgICAvLyAgICAgYWRkNygxMCk7IC8vID0+IDE3XG4gICAgICAgIHZhciBhZGQgPSBSLmFkZCA9IF8oZnVuY3Rpb24oYSwgYikge3JldHVybiBhICsgYjt9KTtcblxuICAgICAgICAvLyBNdWx0aXBsaWVzIHR3byBudW1iZXJzLiAgQXV0b21hdGljYWxseSBjdXJyaWVkOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIG11bHQzID0gbXVsdGlwbHkoMyk7XG4gICAgICAgIC8vICAgICBtdWx0Myg3KTsgLy8gPT4gMjFcbiAgICAgICAgdmFyIG11bHRpcGx5ID0gUi5tdWx0aXBseSA9IF8oZnVuY3Rpb24oYSwgYikge3JldHVybiBhICogYjt9KTtcblxuICAgICAgICAvLyBTdWJ0cmFjdHMgdGhlIHNlY29uZCBwYXJhbWV0ZXIgZnJvbSB0aGUgZmlyc3QuICBUaGlzIGlzIGF1dG9tYXRpY2FsbHkgY3VycmllZCwgYW5kIHdoaWxlIGF0IHRpbWVzIHRoZSBjdXJyaWVkXG4gICAgICAgIC8vIHZlcnNpb24gbWlnaHQgYmUgdXNlZnVsLCBvZnRlbiB0aGUgY3VycmllZCB2ZXJzaW9uIG9mIGBzdWJ0cmFjdE5gIG1pZ2h0IGJlIHdoYXQncyB3YW50ZWQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgaHVuZHJlZE1pbnVzID0gc3VidHJhY3QoMTAwKTtcbiAgICAgICAgLy8gICAgIGh1bmRyZWRNaW51cygyMCkgOyAvLyA9PiA4MFxuICAgICAgICB2YXIgc3VidHJhY3QgPSBSLnN1YnRyYWN0ID0gXyhmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGEgLSBiO30pO1xuXG4gICAgICAgIC8vIFJldmVyc2VkIHZlcnNpb24gb2YgYHN1YnRyYWN0YCwgd2hlcmUgZmlyc3QgcGFyYW1ldGVyIGlzIHN1YnRyYWN0ZWQgZnJvbSB0aGUgc2Vjb25kLiAgVGhlIGN1cnJpZWQgdmVyc2lvbiBvZlxuICAgICAgICAvLyB0aGlzIG9uZSBtaWdodCBtZSBtb3JlIHVzZWZ1bCB0aGFuIHRoYXQgb2YgYHN1YnRyYWN0YC4gIEZvciBpbnN0YW5jZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBkZWNyZW1lbnQgPSBzdWJ0cmFjdE4oMSk7XG4gICAgICAgIC8vICAgICBkZWNyZW1lbnQoMTApOyAvLyA9PiA5O1xuICAgICAgICBSLnN1YnRyYWN0TiA9IGZsaXAoc3VidHJhY3QpO1xuXG4gICAgICAgIC8vIERpdmlkZXMgdGhlIGZpcnN0IHBhcmFtZXRlciBieSB0aGUgc2Vjb25kLiAgVGhpcyBpcyBhdXRvbWF0aWNhbGx5IGN1cnJpZWQsIGFuZCB3aGlsZSBhdCB0aW1lcyB0aGUgY3VycmllZFxuICAgICAgICAvLyB2ZXJzaW9uIG1pZ2h0IGJlIHVzZWZ1bCwgb2Z0ZW4gdGhlIGN1cnJpZWQgdmVyc2lvbiBvZiBgZGl2aWRlQnlgIG1pZ2h0IGJlIHdoYXQncyB3YW50ZWQuXG4gICAgICAgIHZhciBkaXZpZGUgPSBSLmRpdmlkZSA9IF8oZnVuY3Rpb24oYSwgYikge3JldHVybiBhIC8gYjt9KTtcblxuICAgICAgICAvLyBSZXZlcnNlZCB2ZXJzaW9uIG9mIGBkaXZpZGVgLCB3aGVyZSB0aGUgc2Vjb25kIHBhcmFtZXRlciBpcyBkaXZpZGVkIGJ5IHRoZSBmaXJzdC4gIFRoZSBjdXJyaWVkIHZlcnNpb24gb2ZcbiAgICAgICAgLy8gdGhpcyBvbmUgbWlnaHQgYmUgbW9yZSB1c2VmdWwgdGhhbiB0aGF0IG9mIGBkaXZpZGVgLiAgRm9yIGluc3RhbmNlOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIGhhbGYgPSBkaXZpZGVCeSgyKTtcbiAgICAgICAgLy8gICAgIGhhbGYoNDIpOyAvLyA9PiAyMVxuICAgICAgICBSLmRpdmlkZUJ5ID0gZmxpcChkaXZpZGUpO1xuXG4gICAgICAgIC8vIEFkZHMgdG9nZXRoZXIgYWxsIHRoZSBlbGVtZW50cyBvZiBhIGxpc3QuXG4gICAgICAgIFIuc3VtID0gZm9sZGwoYWRkLCAwKTtcblxuICAgICAgICAvLyBNdWx0aXBsaWVzIHRvZ2V0aGVyIGFsbCB0aGUgZWxlbWVudHMgb2YgYSBsaXN0LlxuICAgICAgICBSLnByb2R1Y3QgPSBmb2xkbChtdWx0aXBseSwgMSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBmaXJzdCBwYXJhbWV0ZXIgaXMgbGVzcyB0aGFuIHRoZSBzZWNvbmQuXG4gICAgICAgIFIubHQgPSBfKGZ1bmN0aW9uKGEsIGIpIHtyZXR1cm4gYSA8IGI7fSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBmaXJzdCBwYXJhbWV0ZXIgaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIHRoZSBzZWNvbmQuXG4gICAgICAgIFIubHRlID0gXyhmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGEgPD0gYjt9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRydWUgaWYgdGhlIGZpcnN0IHBhcmFtZXRlciBpcyBncmVhdGVyIHRoYW4gdGhlIHNlY29uZC5cbiAgICAgICAgUi5ndCA9IF8oZnVuY3Rpb24oYSwgYikge3JldHVybiBhID4gYjt9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRydWUgaWYgdGhlIGZpcnN0IHBhcmFtZXRlciBpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gdGhlIHNlY29uZC5cbiAgICAgICAgUi5ndGUgPSBfKGZ1bmN0aW9uKGEsIGIpIHtyZXR1cm4gYSA+PSBiO30pO1xuXG4gICAgICAgIC8vIERldGVybWluZXMgdGhlIGxhcmdlc3Qgb2YgYSBsaXN0IG9mIG51bWJlcnMgKG9yIGVsZW1lbnRzIHRoYXQgY2FuIGJlIGNhc3QgdG8gbnVtYmVycylcbiAgICAgICAgdmFyIG1heCA9IFIubWF4ID0gZnVuY3Rpb24obGlzdCkge3JldHVybiBNYXRoLm1heC5hcHBseShudWxsLCBsaXN0KTt9O1xuXG4gICAgICAgIC8vIERldGVybWluZXMgdGhlIGxhcmdlc3Qgb2YgYSBsaXN0IG9mIG51bWJlcnMgKG9yIGVsZW1lbnRzIHRoYXQgY2FuIGJlIGNhc3QgdG8gbnVtYmVycykgdXNpbmcgdGhlIHN1cHBsaWVkIGNvbXBhcmF0b3JcbiAgICAgICAgUi5tYXhXaXRoID0gXyhmdW5jdGlvbihjb21wYXJhdG9yLCBsaXN0KSB7XG4gICAgICAgICAgICBpZiAoIWlzQXJyYXkobGlzdCkgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlkeCA9IDAsIG1heCA9IGxpc3RbaWR4XTtcbiAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IGxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBhcmF0b3IobWF4LCBsaXN0W2lkeF0pIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBtYXggPSBsaXN0W2lkeF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1heDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVE9ETzogY29tYmluZSB0aGlzIHdpdGggbWF4V2l0aD9cbiAgICAgICAgLy8gRGV0ZXJtaW5lcyB0aGUgc21hbGxlc3Qgb2YgYSBsaXN0IG9mIG51bWJlcnMgKG9yIGVsZW1lbnRzIHRoYXQgY2FuIGJlIGNhc3QgdG8gbnVtYmVycykgdXNpbmcgdGhlIHN1cHBsaWVkIGNvbXBhcmF0b3JcbiAgICAgICAgUi5taW5XaXRoID0gXyhmdW5jdGlvbihjb21wYXJhdG9yLCBsaXN0KSB7XG4gICAgICAgICAgICBpZiAoIWlzQXJyYXkobGlzdCkgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlkeCA9IDAsIG1heCA9IGxpc3RbaWR4XTtcbiAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IGxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBhcmF0b3IobWF4LCBsaXN0W2lkeF0pID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBtYXggPSBsaXN0W2lkeF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1heDtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBEZXRlcm1pbmVzIHRoZSBzbWFsbGVzdCBvZiBhIGxpc3Qgb2YgbnVtYmVycyAob3IgZWxlbWVudHMgdGhhdCBjYW4gYmUgY2FzdCB0byBudW1iZXJzKVxuICAgICAgICBSLm1pbiA9IGZ1bmN0aW9uKGxpc3QpIHtyZXR1cm4gTWF0aC5taW4uYXBwbHkobnVsbCwgbGlzdCk7fTtcblxuXG4gICAgICAgIC8vIFN0cmluZyBGdW5jdGlvbnNcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAvL1xuICAgICAgICAvLyBNdWNoIG9mIHRoZSBTdHJpbmcucHJvdG90eXBlIEFQSSBleHBvc2VkIGFzIHNpbXBsZSBmdW5jdGlvbnMuXG5cbiAgICAgICAgLy8gLS0tLS0tLS1cblxuICAgICAgICAvLyBBIHN1YnN0cmluZyBvZiBhIFN0cmluZzpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHN1YnN0cmluZygyLCA1LCBcImFiY2RlZmdoaWprbG1cIik7IC8vPT4gXCJjZGVcIlxuICAgICAgICB2YXIgc3Vic3RyaW5nID0gUi5zdWJzdHJpbmcgPSBpbnZva2VyKFwic3Vic3RyaW5nXCIsIFN0cmluZy5wcm90b3R5cGUpO1xuXG4gICAgICAgIC8vIFRoZSB0cmFpbGluZyBzdWJzdHJpbmcgb2YgYSBTdHJpbmcgc3RhcnRpbmcgd2l0aCB0aGUgbnRoIGNoYXJhY3RlcjpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHN1YnN0cmluZ0Zyb20oOCwgXCJhYmNkZWZnaGlqa2xtXCIpOyAvLz0+IFwiaWprbG1cIlxuICAgICAgICBSLnN1YnN0cmluZ0Zyb20gPSBmbGlwKHN1YnN0cmluZykodW5kZWYpO1xuXG4gICAgICAgIC8vIFRoZSBsZWFkaW5nIHN1YnN0cmluZyBvZiBhIFN0cmluZyBlbmRpbmcgYmVmb3JlIHRoZSBudGggY2hhcmFjdGVyOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgc3Vic3RyaW5nVG8oOCwgXCJhYmNkZWZnaGlqa2xtXCIpOyAvLz0+IFwiYWJjZGVmZ2hcIlxuICAgICAgICBSLnN1YnN0cmluZ1RvID0gc3Vic3RyaW5nKDApO1xuXG4gICAgICAgIC8vIFRoZSBjaGFyYWN0ZXIgYXQgdGhlIG50aCBwb3NpdGlvbiBpbiBhIFN0cmluZzpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIGNoYXJBdCg4LCBcImFiY2RlZmdoaWprbG1cIik7IC8vPT4gXCJpXCJcbiAgICAgICAgUi5jaGFyQXQgPSBpbnZva2VyKFwiY2hhckF0XCIsIFN0cmluZy5wcm90b3R5cGUpO1xuXG4gICAgICAgIC8vIFRoZSBhc2NpaSBjb2RlIG9mIHRoZSBjaGFyYWN0ZXIgYXQgdGhlIG50aCBwb3NpdGlvbiBpbiBhIFN0cmluZzpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIGNoYXJDb2RlQXQoOCwgXCJhYmNkZWZnaGlqa2xtXCIpOyAvLz0+IDEwNVxuICAgICAgICAvLyAgICAgLy8gKC4uLiAnYScgfiA5NywgJ2InIH4gOTgsIC4uLiAnaScgfiAxMDUpXG4gICAgICAgIFIuY2hhckNvZGVBdCA9IGludm9rZXIoXCJjaGFyQ29kZUF0XCIsIFN0cmluZy5wcm90b3R5cGUpO1xuXG4gICAgICAgIC8vIFRlc3RzIGEgcmVndWxhciBleHByZXNzaW9uIGFnYWlucyBhIFN0cmluZ1xuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgbWF0Y2goLyhbYS16XWEpL2csIFwiYmFuYW5hc1wiKTsgLy89PiBbXCJiYVwiLCBcIm5hXCIsIFwibmFcIl1cbiAgICAgICAgUi5tYXRjaCA9IGludm9rZXIoXCJtYXRjaFwiLCBTdHJpbmcucHJvdG90eXBlKTtcblxuICAgICAgICAvLyBGaW5kcyB0aGUgaW5kZXggb2YgYSBzdWJzdHJpbmcgaW4gYSBzdHJpbmcsIHJldHVybmluZyAtMSBpZiBpdCdzIG5vdCBwcmVzZW50XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICBzdHJJbmRleE9mKCdjJywgJ2FiY2RlZmcpIC8vPT4gMlxuICAgICAgICBSLnN0ckluZGV4T2YgPSBpbnZva2VyKFwiaW5kZXhPZlwiLCBTdHJpbmcucHJvdG90eXBlKTtcblxuICAgICAgICAvLyBGaW5kcyB0aGUgbGFzdCBpbmRleCBvZiBhIHN1YnN0cmluZyBpbiBhIHN0cmluZywgcmV0dXJuaW5nIC0xIGlmIGl0J3Mgbm90IHByZXNlbnRcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHN0ckluZGV4T2YoJ2EnLCAnYmFuYW5hIHNwbGl0JykgLy89PiAyXG4gICAgICAgIFIuc3RyTGFzdEluZGV4T2YgPSBpbnZva2VyKFwibGFzdEluZGV4T2ZcIiwgU3RyaW5nLnByb3RvdHlwZSk7XG5cbiAgICAgICAgLy8gVGhlIHVwcGVyY2FzZSB2ZXJzaW9uIG9mIGEgc3RyaW5nLlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdG9VcHBlckNhc2UoJ2FiYycpIC8vPT4gJ0FCQydcbiAgICAgICAgUi50b1VwcGVyQ2FzZSA9IGludm9rZXIoXCJ0b1VwcGVyQ2FzZVwiLCBTdHJpbmcucHJvdG90eXBlKTtcblxuICAgICAgICAvLyBUaGUgbG93ZXJjYXNlIHZlcnNpb24gb2YgYSBzdHJpbmcuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB0b0xvd2VyQ2FzZSgnWFlaJykgLy89PiAneHl6J1xuICAgICAgICBSLnRvTG93ZXJDYXNlID0gaW52b2tlcihcInRvTG93ZXJDYXNlXCIsIFN0cmluZy5wcm90b3R5cGUpO1xuXG5cbiAgICAgICAgLy8gVGhlIHN0cmluZyBzcGxpdCBpbnRvIHN1YnN0cmluZyBhdCB0aGUgc3BlY2lmaWVkIHRva2VuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICBzcGxpdCgnLicsICdhLmIuYy54eXouZCcpIC8vPT5cbiAgICAgICAgLy8gICAgICAgICBbJ2EnLCAnYicsICdjJywgJ3h5eicsICdkJ11cbiAgICAgICAgUi5zcGxpdCA9IGludm9rZXIoXCJzcGxpdFwiLCBTdHJpbmcucHJvdG90eXBlLCAxKTtcblxuXG4gICAgICAgIC8vIERhdGEgQW5hbHlzaXMgYW5kIEdyb3VwaW5nIEZ1bmN0aW9uc1xuICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgLy9cbiAgICAgICAgLy8gRnVuY3Rpb25zIHBlcmZvcm1pbmcgU1FMLWxpa2UgYWN0aW9ucyBvbiBsaXN0cyBvZiBvYmplY3RzLiAgVGhlc2UgZG8gbm90IGhhdmUgYW55IFNRTC1saWtlIG9wdGltaXphdGlvbnNcbiAgICAgICAgLy8gcGVyZm9ybWVkIG9uIHRoZW0sIGhvd2V2ZXIuXG5cbiAgICAgICAgLy8gLS0tLS0tLS1cblxuICAgICAgICAvLyBSZWFzb25hYmxlIGFuYWxvZyB0byBTUUwgYHNlbGVjdGAgc3RhdGVtZW50LlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIGtpZHMgPSBbXG4gICAgICAgIC8vICAgICAgICAge25hbWU6ICdBYmJ5JywgYWdlOiA3LCBoYWlyOiAnYmxvbmQnLCBncmFkZTogMn0sXG4gICAgICAgIC8vICAgICAgICAge25hbWU6ICdGcmVkJywgYWdlOiAxMiwgaGFpcjogJ2Jyb3duJywgZ3JhZGU6IDd9XG4gICAgICAgIC8vICAgICBdO1xuICAgICAgICAvLyAgICAgcHJvamVjdChbJ25hbWUnLCAnZ3JhZGUnXSwga2lkcyk7XG4gICAgICAgIC8vICAgICAvLz0+IFt7bmFtZTogJ0FiYnknLCBncmFkZTogMn0sIHtuYW1lOiAnRnJlZCcsIGdyYWRlOiA3fV1cbiAgICAgICAgUi5wcm9qZWN0ID0gdXNlV2l0aChtYXAsIHBpY2tBbGwsIGlkZW50aXR5KTsgLy8gcGFzc2luZyBgaWRlbnRpdHlgIGdpdmVzIGNvcnJlY3QgYXJpdHlcblxuICAgICAgICAvLyBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIGdpdmVuIHByb3BlcnR5IG9mIGFuIG9iamVjdCBoYXMgYSBzcGVjaWZpYyB2YWx1ZVxuICAgICAgICAvLyBNb3N0IGxpa2VseSB1c2VkIHRvIGZpbHRlciBhIGxpc3Q6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIga2lkcyA9IFtcbiAgICAgICAgLy8gICAgICAge25hbWU6ICdBYmJ5JywgYWdlOiA3LCBoYWlyOiAnYmxvbmQnfSxcbiAgICAgICAgLy8gICAgICAge25hbWU6ICdGcmVkJywgYWdlOiAxMiwgaGFpcjogJ2Jyb3duJ30sXG4gICAgICAgIC8vICAgICAgIHtuYW1lOiAnUnVzdHknLCBhZ2U6IDEwLCBoYWlyOiAnYnJvd24nfSxcbiAgICAgICAgLy8gICAgICAge25hbWU6ICdBbG9pcycsIGFnZTogMTUsIGRpc3Bvc2l0aW9uOiAnc3VybHknfVxuICAgICAgICAvLyAgICAgXTtcbiAgICAgICAgLy8gICAgIGZpbHRlcihwcm9wRXEoXCJoYWlyXCIsIFwiYnJvd25cIiksIGtpZHMpO1xuICAgICAgICAvLyAgICAgLy89PiBGcmVkIGFuZCBSdXN0eVxuICAgICAgICBSLnByb3BFcSA9IF8oZnVuY3Rpb24obmFtZSwgdmFsLCBvYmopIHtcbiAgICAgICAgICAgIHJldHVybiBvYmpbbmFtZV0gPT09IHZhbDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29tYmluZXMgdHdvIGxpc3RzIGludG8gYSBzZXQgKGkuZS4gbm8gZHVwbGljYXRlcykgY29tcG9zZWQgb2YgdGhlIGVsZW1lbnRzIG9mIGVhY2ggbGlzdC5cbiAgICAgICAgUi51bmlvbiA9IGNvbXBvc2UodW5pcSwgbWVyZ2UpO1xuXG4gICAgICAgIC8vIENvbWJpbmVzIHR3byBsaXN0cyBpbnRvIGEgc2V0IChpLmUuIG5vIGR1cGxpY2F0ZXMpIGNvbXBvc2VkIG9mIHRoZSBlbGVtZW50cyBvZiBlYWNoIGxpc3QuICBEdXBsaWNhdGlvbiBpc1xuICAgICAgICAvLyBkZXRlcm1pbmVkIGFjY29yZGluZyB0byB0aGUgdmFsdWUgcmV0dXJuZWQgYnkgYXBwbHlpbmcgdGhlIHN1cHBsaWVkIHByZWRpY2F0ZSB0byB0d28gbGlzdCBlbGVtZW50cy5cbiAgICAgICAgUi51bmlvbldpdGggPSBmdW5jdGlvbihwcmVkLCBsaXN0MSwgbGlzdDIpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmlxV2l0aChwcmVkLCBtZXJnZShsaXN0MSwgbGlzdDIpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBGaW5kcyB0aGUgc2V0IChpLmUuIG5vIGR1cGxpY2F0ZXMpIG9mIGFsbCBlbGVtZW50cyBpbiB0aGUgZmlyc3QgbGlzdCBub3QgY29udGFpbmVkIGluIHRoZSBzZWNvbmQgbGlzdC5cbiAgICAgICAgUi5kaWZmZXJlbmNlID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge3JldHVybiB1bmlxKHJlamVjdChmbGlwKGNvbnRhaW5zKShzZWNvbmQpKShmaXJzdCkpO307XG5cbiAgICAgICAgLy8gRmluZHMgdGhlIHNldCAoaS5lLiBubyBkdXBsaWNhdGVzKSBvZiBhbGwgZWxlbWVudHMgaW4gdGhlIGZpcnN0IGxpc3Qgbm90IGNvbnRhaW5lZCBpbiB0aGUgc2Vjb25kIGxpc3QuXG4gICAgICAgIC8vIER1cGxpY2F0aW9uIGlzIGRldGVybWluZWQgYWNjb3JkaW5nIHRvIHRoZSB2YWx1ZSByZXR1cm5lZCBieSBhcHBseWluZyB0aGUgc3VwcGxpZWQgcHJlZGljYXRlIHRvIHR3byBsaXN0XG4gICAgICAgIC8vIGVsZW1lbnRzLlxuICAgICAgICBSLmRpZmZlcmVuY2VXaXRoID0gZnVuY3Rpb24ocHJlZCwgZmlyc3QsIHNlY29uZCkge1xuICAgICAgICAgICAgcmV0dXJuIHVuaXFXaXRoKHByZWQpKHJlamVjdChmbGlwKGNvbnRhaW5zV2l0aChwcmVkKSkoc2Vjb25kKSwgZmlyc3QpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDb21iaW5lcyB0d28gbGlzdHMgaW50byBhIHNldCAoaS5lLiBubyBkdXBsaWNhdGVzKSBjb21wb3NlZCBvZiB0aG9zZSBlbGVtZW50cyBjb21tb24gdG8gYm90aCBsaXN0cy5cbiAgICAgICAgUi5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbihsaXN0MSwgbGlzdDIpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmlxKGZpbHRlcihmbGlwKGNvbnRhaW5zKShsaXN0MSksIGxpc3QyKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQ29tYmluZXMgdHdvIGxpc3RzIGludG8gYSBzZXQgKGkuZS4gbm8gZHVwbGljYXRlcykgY29tcG9zZWQgb2YgdGhvc2UgZWxlbWVudHMgY29tbW9uIHRvIGJvdGggbGlzdHMuXG4gICAgICAgIC8vIER1cGxpY2F0aW9uIGlzIGRldGVybWluZWQgYWNjb3JkaW5nIHRvIHRoZSB2YWx1ZSByZXR1cm5lZCBieSBhcHBseWluZyB0aGUgc3VwcGxpZWQgcHJlZGljYXRlIHRvIHR3byBsaXN0XG4gICAgICAgIC8vIGVsZW1lbnRzLlxuICAgICAgICBSLmludGVyc2VjdGlvbldpdGggPSBmdW5jdGlvbihwcmVkLCBsaXN0MSwgbGlzdDIpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRzID0gW10sIGlkeCA9IC0xO1xuICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgbGlzdDEubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRhaW5zV2l0aChwcmVkLCBsaXN0MVtpZHhdLCBsaXN0MikpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1tyZXN1bHRzLmxlbmd0aF0gPSBsaXN0MVtpZHhdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB1bmlxV2l0aChwcmVkLCByZXN1bHRzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDcmVhdGVzIGEgbmV3IGxpc3Qgd2hvc2UgZWxlbWVudHMgZWFjaCBoYXZlIHR3byBwcm9wZXJ0aWVzOiBgdmFsYCBpcyB0aGUgdmFsdWUgb2YgdGhlIGNvcnJlc3BvbmRpbmdcbiAgICAgICAgLy8gaXRlbSBpbiB0aGUgbGlzdCBzdXBwbGllZCwgYW5kIGBrZXlgIGlzIHRoZSByZXN1bHQgb2YgYXBwbHlpbmcgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uIHRvIHRoYXQgaXRlbS5cbiAgICAgICAgdmFyIGtleVZhbHVlID0gXyhmdW5jdGlvbihmbiwgbGlzdCkgeyAvLyBUT0RPOiBTaG91bGQgdGhpcyBiZSBtYWRlIHB1YmxpYz9cbiAgICAgICAgICAgIHJldHVybiBtYXAoZnVuY3Rpb24oaXRlbSkge3JldHVybiB7a2V5OiBmbihpdGVtKSwgdmFsOiBpdGVtfTt9LCBsaXN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU29ydHMgdGhlIGxpc3QgYWNjb3JkaW5nIHRvIGEga2V5IGdlbmVyYXRlZCBieSB0aGUgc3VwcGxpZWQgZnVuY3Rpb24uXG4gICAgICAgIFIuc29ydEJ5ID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgcmV0dXJuIHNvcnQoY29tcGFyYXRvcihmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGZuKGEpIDwgZm4oYik7fSksIGxpc3QpOyAvLyBjbGVhbiwgYnV0IHRvbyB0aW1lLWluZWZmaWNpZW50XG4gICAgICAgICAgICAgIHJldHVybiBwbHVjayhcInZhbFwiLCBzb3J0KGNvbXBhcmF0b3IoZnVuY3Rpb24oYSwgYikge3JldHVybiBhLmtleSA8IGIua2V5O30pLCBrZXlWYWx1ZShmbiwgbGlzdCkpKTsgLy8gbmljZSwgYnV0IG5vIG5lZWQgdG8gY2xvbmUgcmVzdWx0IG9mIGtleVZhbHVlIGNhbGwsIHNvLi4uXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmV0dXJuIHBsdWNrKFwidmFsXCIsIGtleVZhbHVlKGZuLCBsaXN0KS5zb3J0KGNvbXBhcmF0b3IoZnVuY3Rpb24oYSwgYikge3JldHVybiBhLmtleSA8IGIua2V5O30pKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvdW50cyB0aGUgZWxlbWVudHMgb2YgYSBsaXN0IGFjY29yZGluZyB0byBob3cgbWFueSBtYXRjaCBlYWNoIHZhbHVlIG9mIGEga2V5IGdlbmVyYXRlZCBieSB0aGUgc3VwcGxpZWQgZnVuY3Rpb24uXG4gICAgICAgIFIuY291bnRCeSA9IF8oZnVuY3Rpb24oZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBmb2xkbChmdW5jdGlvbihjb3VudHMsIG9iaikge1xuICAgICAgICAgICAgICAgIGNvdW50c1tvYmoua2V5XSA9IChjb3VudHNbb2JqLmtleV0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgICAgIHJldHVybiBjb3VudHM7XG4gICAgICAgICAgICB9LCB7fSwga2V5VmFsdWUoZm4sIGxpc3QpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gR3JvdXBzIHRoZSBlbGVtZW50cyBvZiBhIGxpc3QgYnkgYSBrZXkgZ2VuZXJhdGVkIGJ5IHRoZSBzdXBwbGllZCBmdW5jdGlvbi5cbiAgICAgICAgUi5ncm91cEJ5ID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvbGRsKGZ1bmN0aW9uKGdyb3Vwcywgb2JqKSB7XG4gICAgICAgICAgICAgICAgKGdyb3Vwc1tvYmoua2V5XSB8fCAoZ3JvdXBzW29iai5rZXldID0gW10pKS5wdXNoKG9iai52YWwpO1xuICAgICAgICAgICAgICAgIHJldHVybiBncm91cHM7XG4gICAgICAgICAgICB9LCB7fSwga2V5VmFsdWUoZm4sIGxpc3QpKTtcbiAgICAgICAgfSk7XG5cblxuXG4gICAgICAgIC8vIEFsbCB0aGUgZnVuY3Rpb25hbCBnb29kbmVzcywgd3JhcHBlZCBpbiBhIG5pY2UgbGl0dGxlIHBhY2thZ2UsIGp1c3QgZm9yIHlvdSFcbiAgICAgICAgcmV0dXJuIFI7XG4gICAgfSgpKTtcbn0pKTtcbiIsInZhciBSID0gcmVxdWlyZSgncmFtZGEnKTtcbnZhciBFTVBUWSA9IDA7XG5cbmZ1bmN0aW9uIEdyaWQobSkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgR3JpZCkpIHtcbiAgICByZXR1cm4gbmV3IEdyaWQobSk7XG4gIH1cbiAgdGhpcy5tYXRyaXggPSBtO1xufTtcblxuR3JpZC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBHcmlkLFxuXG4gIGZpbmRFbXB0eUNlbGw6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjZWxsID0ge307XG4gICAgY2VsbC55ID0gUi5maW5kSW5kZXgoZnVuY3Rpb24ocikgeyByZXR1cm4gUi5jb250YWlucyhFTVBUWSwgcik7IH0sIHRoaXMubWF0cml4KTtcbiAgICBpZiAoY2VsbC55ICE9PSBmYWxzZSkge1xuICAgICAgY2VsbC54ID0gUi5maW5kSW5kZXgoZnVuY3Rpb24oYykgeyByZXR1cm4gYyA9PT0gRU1QVFk7IH0sIHRoaXMubWF0cml4W2NlbGwueV0pO1xuICAgIH1cbiAgICByZXR1cm4gKGNlbGwueSAhPT0gZmFsc2UgJiYgY2VsbC54ICE9PSBmYWxzZSkgPyBjZWxsIDogZmFsc2U7XG4gIH0sXG5cbiAgY29uc3RyYWluOiBmdW5jdGlvbihjZWxsKSB7XG4gICAgdmFyIHJvd1dpc2UgPSBSLmRpZmZlcmVuY2UoUi5yYW5nZSgxLDEwKSwgdGhpcy5tYXRyaXhbY2VsbC55XSk7XG4gICAgdmFyIGNvbFdpc2UgPSBSLmRpZmZlcmVuY2Uocm93V2lzZSwgdGhpcy5jb2xUb0FycmF5KGNlbGwueCkpO1xuICAgIHJldHVybiBSLmRpZmZlcmVuY2UoY29sV2lzZSwgdGhpcy5ib3hUb0FycmF5KGNlbGwpKTtcbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uKGNlbGwsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXRyaXhbY2VsbC55XVtjZWxsLnhdID0gdmFsdWU7XG4gIH0sXG5cbiAgY29sVG9BcnJheTogZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiBSLnBsdWNrKHgsIHRoaXMubWF0cml4KTtcbiAgfSxcblxuICBnZXRCb3g6IGZ1bmN0aW9uKGNlbGwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgeDogTWF0aC5mbG9vcihjZWxsLngvMykgKiAzLFxuICAgICAgeTogTWF0aC5mbG9vcihjZWxsLnkvMykgKiAzXG4gICAgfTtcbiAgfSxcblxuICBib3hUb0FycmF5OiBmdW5jdGlvbihjZWxsKSB7XG4gICAgdmFyIGJveCA9IHRoaXMuZ2V0Qm94KGNlbGwpOyBcbiAgICByZXR1cm4gUi5yZWR1Y2UoZnVuY3Rpb24oYWNjLCByb3cpIHsgIFxuICAgICAgcmV0dXJuIGFjYy5jb25jYXQoUi5tYXAoUi5JLCByb3cuc2xpY2UoYm94LngsIGJveC54ICsgMykpKTtcbiAgICB9LCBbXSwgdGhpcy5tYXRyaXguc2xpY2UoYm94LnksIGJveC55ICsgMykpO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR3JpZDtcblxuXG4iXX0=
(2)
});

!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),(f.app||(f.app={})).js=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
//     ramda.js 0.0.1
//     https://github.com/CrossEye/ramda
//     (c) 2013-2014 Scott Sauyet and Michael Hurley
//     Ramda may be freely distributed under the MIT license.

// Ramda
// -----
// A practical functional library for Javascript programmers.  This is a collection of tools to make it easier to
// use Javascript as a functional programming language.  (The name is just a silly play on `lambda`, even though we're
// not actually involved in the manipulation of lambda expressions.)

// Basic Setup
// -----------
// Uses a technique from the [Universal Module Definition][umd] to wrap this up for use in Node.js or in the browser,
// with or without an AMD-style loader.
//
//  [umd]: https://github.com/umdjs/umd/blob/master/returnExports.js

(function (root, factory) {if (typeof exports === 'object') {module.exports = factory(root);} else if (typeof define === 'function' && define.amd) {define(factory);} else {root.ramda = factory(root);}}(this, function (global) {

    return  (function() {

        // This object is what is actually returned, with all the exposed functions attached as properties.

        var R = {};

        // Internal Functions and Properties
        // ---------------------------------

        var undef = (function(){})(), EMPTY;

        // Makes a public alias for one of the public functions:
        var aliasFor = function(oldName) {
            var fn = function(newName) {R[newName] = R[oldName]; return fn;};
            fn.is = fn.are = fn.and = fn;
            return fn;
        };

        // `slice` implemented iteratively for performance
        var slice = function (args, from, to) {
            var i, arr = [];
            from = from || 0;
            to = to || args.length;
            for (i = from; i < to; i++) {
                arr[arr.length] = args[i];
            }
            return arr;
        };

        var isArray = function(val) {return Object.prototype.toString.call(val) === "[object Array]";};

        // Returns a curried version of the supplied function.  For example:
        //
        //      var discriminant = function(a, b, c) {
        //          return b * b - 4 * a * c;
        //      };
        //      var f = curry(discriminant);
        //      var g = f(3), h = f(3, 7) i = g(7);
        //      i(4) ≅ h(4) == g(7, 4) == f(3, 7, 4) == 1
        //
        //  Almost all exposed functions of more than one parameter already have curry applied to them.
        var _ = R.curry = function(fn) {
            var fnArity = fn.length;
            var f = function(args) {
                return arity(Math.max(fnArity - (args && args.length || 0), 0), function () {
                    var newArgs = (args || []).concat(slice(arguments, 0));
                    if (newArgs.length >= fnArity) {
                        return fn.apply(this, newArgs);
                    }
                    else {return f(newArgs);}
                });
            };

            return f([]);
        };

        var mkArgStr = function(n) {
            var arr = [], idx = -1;
            while(++idx < n) {
                arr[idx] = "arg" + idx;
            }
            return arr.join(", ");
        };

        // Wraps a function that may be nullary, or may take fewer than or more than `n` parameters, in a function that
        // specifically takes exactly `n` parameters.  Any extraneous parameters will not be passed on to the function
        // supplied
        var nAry = R.nAry = (function() {
            var cache = {};


            //     For example:
            //     cache[3] = function(func) {
            //         return function(arg0, arg1, arg2) {
            //             return func.call(this, arg0, arg1, arg2);
            //         }
            //     };

            var makeN = function(n) {
                var fnArgs = mkArgStr(n);
                var body = [
                    "    return function(" + fnArgs + ") {",
                    "        return func.call(this" + (fnArgs ? ", " + fnArgs : "") + ");",
                    "    }"
                ].join("\n");
                return new Function("func", body);
            };

            return function(n, fn) {
                return (cache[n] || (cache[n] = makeN(n)))(fn);
            };
        }());

        // Wraps a function that may be nullary, or may take fewer than or more than `n` parameters, in a function that
        // specifically takes exactly `n` parameters.  Note, though, that all parameters supplied will in fact be
        // passed along, in contrast with `nAry`, which only passes along the exact number specified.
        var arity = R.arity = (function() {
            var cache = {};

            //     For example:
            //     cache[3] = function(func) {
            //         return function(arg0, arg1, arg2) {
            //             return func.apply(this, arguments);
            //         }
            //     };

            var makeN = function(n) {
                var fnArgs = mkArgStr(n);
                var body = [
                    "    return function(" + fnArgs + ") {",
                    "        return func.apply(this, arguments);",
                    "    }"
                ].join("\n");
                return new Function("func", body);
            };

            return function(n, fn) {
                return (cache[n] || (cache[n] = makeN(n)))(fn);
            };
        }());

        // Turns a named method of an object (or object prototype) into a function that can be called directly.
        // The object becomes the last parameter to the function, and the function is automatically curried.
        // Passing the optional `len` parameter restricts the function to the initial `len` parameters of the method.
        var invoker = R.invoker = function(name, obj, len) {
            var method = obj[name];
            var length = len === undef ? method.length : len;
            return method && _(nAry(length + 1, function() {
                if(arguments.length) {
                    var target = Array.prototype.pop.call(arguments);
                    var targetMethod = target[name];
                    if (targetMethod == method) {
                        return targetMethod.apply(target, arguments);
                    }
                }
                return undef;
            }));
        };

        // Creates a new function that calls the function `fn` with parameters consisting of  the result of the
        // calling each supplied handler on successive arguments, followed by all unmatched arguments.
        //
        // If there are extra _expected_ arguments that don't need to be transformed, although you can ignore
        // them, it might be best to pass in and identity function so that the new function correctly reports arity.
        // See for example, the definition of `project`, below.
        var useWith = R.useWith = function(fn /*, transformers */) {
            var transformers = slice(arguments, 1);
            var tlen = transformers.length;
            return _(arity(tlen, function() {
                var args = [], idx = -1;
                while (++idx < tlen) {
                    args.push(transformers[idx](arguments[idx]));
                }
                return fn.apply(this, args.concat(slice(arguments, tlen)));
            }));
        };

        // A two-step version of the `useWith` function.  This would allow us to write `project`, currently written
        // as `useWith(map, pickAll, identity)`, as, instead, `use(map).over(pickAll, identity)`, which is a bit
        // more explicit.
        // TODO: One of these versions should be eliminated eventually.  So not worrying about the duplication for now.
        R.use = function(fn) {
            return {
                over: function(/*transformers*/) {
                    var transformers = slice(arguments, 0);
                    var tlen = transformers.length;
                    return _(arity(tlen, function() {
                        var args = [], idx = -1;
                        while (++idx < tlen) {
                            args.push(transformers[idx](arguments[idx]));
                        }
                        return fn.apply(this, args.concat(slice(arguments, tlen)));
                    }));
                }
            };
        };


        // Fills out an array to the specified length. Internal private function.
        var expand = function(a, len) {
            var arr = a ? isArray(a) ? a : slice(a) : [];
            while(arr.length < len) {arr[arr.length] = undef;}
            return arr;
        };

        // Internal version of `forEach`.  Possibly to be exposed later.
        var each = _(function(fn, arr) {
            for (var i = 0, len = arr.length; i < len; i++) {
                fn(arr[i]);
            }
        });

        // Shallow copy of an array.
        var clone = R.clone = function(list) {
            return list.concat();
        };


        // Core Functions
        // --------------
        //

        //   Prototypical (or only) empty list
        EMPTY = [];

        // Boolean function which reports whether a list is empty.
        var isEmpty = R.isEmpty = function(arr) {return !arr || !arr.length;};

        // Returns a new list with the new element at the front and the existing elements following
        var prepend = R.prepend = function(el, arr) {return [el].concat(arr);};
        aliasFor("prepend").is("cons");

        //  Returns the first element of a list
        var head = R.head = function(arr) {
            arr = arr || EMPTY;
            return (arr.length) ? arr[0] : null; 
        };
        aliasFor("head").is("car"); 

        // Returns the rest of the list after the first element.
        // If the passed-in list is a Generator, it will return the 
        // next iteration of the Generator.
        var tail = R.tail = function(arr) {
            arr = arr || EMPTY;
            if (arr.length === Infinity) {
                return arr.tail();
            }
            return (arr.length > 1) ? slice(arr, 1) : null;
        };
        aliasFor("tail").is("cdr");

        //   Boolean function which is `true` for non-list, `false` for a list.
        R.isAtom = function(x) {
            return (x !== null) && (x !== undef) && Object.prototype.toString.call(x) !== "[object Array]";
        };

        // Returns a new list with the new element at the end of a list following all the existing ones.
        R.append = function(el, list) {
            var newList = clone(list);
            newList.push(el);
            return newList;
        };
        aliasFor("append").is("push");

        // Returns a new list consisting of the elements of the first list followed by the elements of the second.
        var merge = R.merge = _(function(list1, list2) {
            if (isEmpty(list1)) {
                return clone(list2);
            } else {
                return list1.concat(list2);
            }
        });
        aliasFor("merge").is("concat");

        // A surprisingly useful function that does nothing but return the parameter supplied to it.
        var identity = R.identity = function(x) {return x;};
        aliasFor("identity").is("I");



        // Generators
        // ----------
        //

        // Support for infinite lists, using an initial seed, a function that calculates the head from the seed and
        // a function that creates a new seed from the current seed.  Generator objects have this structure:
        //
        //     {
        //        "0": someValue,
        //        tail: someFunction() {},
        //        length: Infinity
        //     }
        //
        // Generator objects also have such functions as `take`, `skip`, `map`, and `filter`, but the equivalent
        // functions from Ramda will work with them as well.
        //
        // ### Example ###
        //
        //     var fibonacci = generator(
        //         [0, 1],
        //         function(pair) {return pair[0];},
        //         function(pair) {return [pair[1], pair[0] + pair[1]];}
        //     );
        //     var even = function(n) {return (n % 2) === 0;};
        //
        //     take(5, filter(even, fibonacci)) //=> [0, 2, 8, 34, 144]
        //
        // Note that the `take(5)` call is necessary to get a finite list out of this.  Otherwise, this would still
        // be an infinite list.

        R.generator = (function() {
            // partial shim for Object.create
            var create = (function() {
                var F = function() {};
                return function(src) {
                    F.prototype = src;
                    return new F();
                };
            }());

            // Trampolining to support recursion in Generators
            var trampoline = function(fn) {
                var result = fn.apply(this, tail(arguments));
                while (typeof result === "function") {
                    result = result();
                }
                return result;
            };
            // Internal Generator constructor
            var  G = function(seed, current, step) {
                this["0"] = current(seed);
                this.tail = function() {
                    return new G(step(seed), current, step);
                };
            };
            // Generators can be used with OO techniques as well as our standard functional calls.  These are the
            // implementations of those methods and other properties.
            G.prototype = {
                 constructor: G,
                 // All generators are infinite.
                 length: Infinity,
                 // `take` implementation for generators.
                 take: function(n) {
                     var take = function(ctr, g, ret) {
                         return (ctr === 0) ? ret : take(ctr - 1, g.tail(), ret.concat([g[0]]));
                     };
                     return trampoline(take, n, this, []);
                 },
                 // `skip` implementation for generators.
                 skip: function(n) {
                     var skip = function(ctr, g) {
                         return (ctr <= 0) ? g : skip(ctr - 1, g.tail());
                     };
                     return trampoline(skip, n, this);
                 },
                 // `map` implementation for generators.
                 map: function(fn, gen) {
                     var g = create(G.prototype);
                     g[0] = fn(gen[0]);
                     g.tail = function() { return this.map(fn, gen.tail()); };
                     return g;
                 },
                 // `filter` implementation for generators.
                 filter: function(fn) {
                     var gen = this, head = gen[0];
                     while (!fn(head)) {
                         gen = gen.tail();
                         head = gen[0];
                     }
                     var g = create(G.prototype);
                     g[0] = head;
                     g.tail = function() {return filter(fn, gen.tail());};
                     return g;
                 }
            };

            // The actual public `generator` function.
            return function(seed, current, step) {
                return new G(seed, current, step);
            };
        }());


        // Function functions :-)
        // ----------------------
        //
        // These functions make new functions out of old ones.

        // --------

        // Creates a new function that runs each of the functions supplied as parameters in turn, passing the output
        // of each one to the next one, starting with whatever arguments were passed to the initial invocation.
        // Note that if `var h = compose(f, g)`, `h(x)` calls `g(x)` first, passing the result of that to `f()`.
        var compose = R.compose = function() {  // TODO: type check of arguments?
            var fns = slice(arguments);
            return function() {
                return foldr(function(args, fn) { return [fn.apply(this, args)]; }, slice(arguments), fns)[0];
            };
        };

        // Similar to `compose`, but processes the functions in the reverse order so that if if `var h = pipe(f, g)`,
        // `h(x)` calls `f(x)` first, passing the result of that to `g()`.
        R.pipe = function() { // TODO: type check of arguments?
            return compose.apply(this, slice(arguments).reverse());
        };
        aliasFor("pipe").is("sequence");

        // Returns a new function much like the supplied one except that the first two arguments are inverted.
        var flip = R.flip = function(fn) {
            return _(function(a, b) {
                return fn.apply(this, [b, a].concat(slice(arguments, 2)));
            });
        };

//        // Returns a new function much like the supplied one except that the first argument is cycled to the end.
//        R.cycle = function(fn) {
//            return nAry(fn.length, function() {
//                return fn.apply(this, slice(arguments, 1, fn.length).concat(arguments[0]));
//            });
//        };

        // Creates a new function that acts like the supplied function except that the left-most parameters are
        // pre-filled.
        R.lPartial = function (fn) {
            var args = slice(arguments, 1);
            return arity(Math.max(fn.length - args.length, 0), function() {
                return fn.apply(this, args.concat(slice(arguments)));
            });
        };
        aliasFor("lPartial").is("applyLeft");

        // Creates a new function that acts like the supplied function except that the right-most parameters are
        // pre-filled.
        R.rPartial =function (fn) {
            var args = slice(arguments, 1);
            return arity(Math.max(fn.length - args.length, 0), function() {
                return fn.apply(this, slice(arguments).concat(args));
            });
        };
        aliasFor("rPartial").is("applyRight");

        // Creates a new function that stores the results of running the supplied function and returns those
        // stored value when the same request is made.  **Note**: this really only handles string and number parameters.
        R.memoize = function(fn) {
            var cache = {};
            return function() {
                var position = foldl(function(cache, arg) {return cache[arg] || (cache[arg] = {});}, cache,
                        slice(arguments, 0, arguments.length - 1));
                var arg = arguments[arguments.length - 1];
                return (position[arg] || (position[arg] = fn.apply(this, arguments)));
            };
        };

        // Wraps a function up in one that will only call the internal one once, no matter how many times the outer one
        // is called.  ** Note**: this is not really pure; it's mostly meant to keep side-effects from repeating.
        R.once = function(fn) {
            var called = false, result;
            return function() {
                if (called) {return result;}
                called = true;
                result = fn.apply(this, arguments);
                return result;
            };
        };

        // Wrap a function inside another to allow you to make adjustments to the parameters or do other processing
        // either before the internal function is called or with its results.
        R.wrap = function(fn, wrapper) {
            return function() {
                return wrapper.apply(this, [fn].concat(slice(arguments)));
            };
        };

        // Wraps a constructor function inside a (curried) plain function that can be called with the same arguments
        // and returns the same type.  Allows, for instance,
        //
        //     var Widget = function(config) { /* ... */ }; // Constructor
        //     Widget.prototype = { /* ... */ }
        //     map(construct(Widget), allConfigs); //=> list of Widgets
        R.construct = function(fn) {
            var f = function() {
                var obj = new fn();
                fn.apply(obj, arguments);
                return obj;
            };
            return fn.length > 1 ? _(nAry(fn.length, f)) : f;
        };



        // List Functions
        // --------------
        //
        // These functions operate on logical lists, here plain arrays.  Almost all of these are curried, and the list
        // parameter comes last, so you can create a new function by supplying the preceding arguments, leaving the
        // list parameter off.  For instance:
        //
        //     // skip third parameter
        //     var checkAllPredicates = reduce(andFn, alwaysTrue);
        //     // ... given suitable definitions of odd, lt20, gt5
        //     var test = checkAllPredicates([odd, lt20, gt5]);
        //     // test(7) => true, test(9) => true, test(10) => false,
        //     // test(3) => false, test(21) => false,

        // --------

        // Returns a single item, by successively calling the function with the current element and the the next
        // element of the list, passing the result to the next call.  We start with the `acc` parameter to get
        // things going.  The function supplied should accept this running value and the latest element of the list,
        // and return an updated value.
        var foldl = R.foldl = _(function(fn, acc, list) {
            var idx = -1, len = list.length;
            while(++idx < len) {
                acc = fn(acc, list[idx]);
            }
            return acc;
        });
        aliasFor("foldl").is("reduce");

        // Much like `foldl`/`reduce`, except that this takes as its starting value the first element in the list.
        R.foldl1 = _(function (fn, list) {
            if (isEmpty(list)) {
                throw new Error("foldl1 does not work on empty lists");
            }
            return foldl(fn, head(list), tail(list));
        });

        // Similar to `foldl`/`reduce` except that it moves from right to left on the list.
        var foldr = R.foldr =_(function(fn, acc, list) {
            var idx = list.length;
            while(idx--) {
                acc = fn(acc, list[idx]);
            }
            return acc;

        });
        aliasFor("foldr").is("reduceRight");


        // Much like `foldr`/`reduceRight`, except that this takes as its starting value the last element in the list.
        R.foldr1 = _(function (fn, list) {
            if (isEmpty(list)) {
                throw new Error("foldr1 does not work on empty lists");
            }
            var newList = clone(list), acc = newList.pop();
            return foldr(fn, acc, newList);
        });

        // Builds a list from a seed value, using a function that returns falsy to quit and a pair otherwise,
        // consisting of the current value and the seed to be used for the next value.

        R.unfoldr = _(function(fn, seed) {
            var pair = fn(seed), result = [];
            while (pair && pair.length) {
                result.push(pair[0]);
                pair = fn(pair[1]);
            }
            return result;
        });


        // Returns a new list constructed by applying the function to every element of the list supplied.
        var map = R.map = _(function(fn, list) {
            if (list && list.length === Infinity) {
                return list.map(fn, list);
            }
            var idx = -1, len = list.length, result = new Array(len);
            while (++idx < len) {
                result[idx] = fn(list[idx]);
            }
            return result;
        });

        // Reports the number of elements in the list
        R.size = function(arr) {return arr.length;};

        // (Internal use only) The basic implementation of filter.
        var internalFilter = _(function(useIdx, fn, list) {
            if (list && list.length === Infinity) {
                return list.filter(fn); // TODO: figure out useIdx
            }
            var idx = -1, len = list.length, result = [];
            while (++idx < len) {
                if (!useIdx && fn(list[idx]) || fn(list[idx], idx, list)) {
                    result.push(list[idx]);
                }
            }
            return result;
        });

        // Returns a new list containing only those items that match a given predicate function.
        var filter = R.filter = internalFilter(false);

        // Like `filter`, but passes additional parameters to the predicate function.  Parameters are
        // `list item`, `index of item in list`, `entire list`.
        //
        // Example:
        //
        //     var lastTwo = function(val, idx, list) {
        //         return list.length - idx <= 2;
        //     };
        //     filter.idx(lastTwo, [8, 6, 7, 5, 3, 0 ,9]); //=> [0, 9]
        filter.idx = internalFilter(true);

        // Similar to `filter`, except that it keeps only those that **don't** match the given predicate functions.
        var reject = R.reject = _(function(fn, list) {
            return filter(notFn(fn), list);
        });

        // Like `reject`, but passes additional parameters to the predicate function.  Parameters are
        // `list item`, `index of item in list`, `entire list`.
        //
        // Example:
        //
        //     var lastTwo = function(val, idx, list) {
        //         return list.length - idx <= 2;
        //     };
        //     reject.idx(lastTwo, [8, 6, 7, 5, 3, 0 ,9]);
        //     //=> [8, 6, 7, 5, 3]
        reject.idx = _(function(fn, list) {
            return filter.idx(notFn(fn), list);
        });

        // Returns a new list containing the elements of the given list up until the first one where the function
        // supplied returns `false` when passed the element.
        R.takeWhile = _(function(fn, list) {
            var idx = -1, len = list.length, taking = true, result = [];
            while (taking) {
                ++idx;
                if (idx < len && fn(list[idx])) {
                    result.push(list[idx]);
                } else {
                    taking = false;
                }
            }
            return result;
        });

        // Returns a new list containing the first `n` elements of the given list.
        R.take = _(function(n, list) {
            if (list && list.length === Infinity) {
                return list.take(n);
            }
            var ls = clone(list);
            ls.length = n;
            return ls;
        });

        // Returns a new list containing the elements of the given list starting with the first one where the function
        // supplied returns `false` when passed the element.
        R.skipUntil = _(function(fn, list) {
            var idx = -1, len = list.length, taking = false, result = [];
            while (!taking) {
                ++idx;
                if (idx >= len || fn(list[idx])) {
                    taking = true;
                }
            }
            while (idx < len) {
                result.push(list[idx++]);
            }
            return result;
        });

        // Returns a new list containing all **but** the first `n` elements of the given list.
        R.skip = _(function(n, list) {
            if (list && list.length === Infinity) {
                return list.skip(n);
            }
            return slice(list, n);
        });
        aliasFor('skip').is('drop');

        // Returns the first element of the list which matches the predicate, or `false` if no element matches.
        R.find = _(function(fn, list) {
            var idx = -1, len = list.length;
            while (++idx < len) {
                if (fn(list[idx])) {
                    return list[idx];
                }
            }
            return false;
        });

        // Returns the index of first element of the list which matches the predicate, or `false` if no element matches.
        R.findIndex = _(function(fn, list) {
            var idx = -1, len = list.length;
            while (++idx < len) {
                if (fn(list[idx])) {
                    return idx;
                }
            }
            return false;
        });

        // Returns the last element of the list which matches the predicate, or `false` if no element matches.
        R.findLast = _(function(fn, list) {
            var idx = list.length;
            while (--idx) {
                if (fn(list[idx])) {
                    return list[idx];
                }
            }
            return false;
        });

        // Returns the index of last element of the list which matches the predicate, or `false` if no element matches.
        R.findLastIndex = _(function(fn, list) {
            var idx = list.length;
            while (--idx) {
                if (fn(list[idx])) {
                    return idx;
                }
            }
            return false;
        });

        // Returns `true` if all elements of the list match the predicate, `false` if there are any that don't.
        var all = R.all = _(function (fn, list) {
            var i = -1;
            while (++i < list.length) {
                if (!fn(list[i])) {
                    return false;
                }
            }
            return true;
        });
        aliasFor("all").is("every");


        // Returns `true` if any elements of the list match the predicate, `false` if none do.
        var any = R.any = _(function(fn, list) {
            var i = -1;
            while (++i < list.length) {
                if (fn(list[i])) {
                    return true;
                }
            }
            return false;
        });
        aliasFor("any").is("some");

        // Returns `true` if the list contains the sought element, `false` if it does not.  Equality is strict here,
        // meaning reference equality for objects and non-coercing equality for primitives.
        var contains = R.contains = _(function(a, list) {
            return list.indexOf(a) > -1;
        });

        // Returns `true` if the list contains the sought element, `false` if it does not, based upon the value
        // returned by applying the supplied predicated to two list elements.  Equality is strict here, meaning
        // reference equality for objects and non-coercing equality for primitives.  Probably inefficient.
        var containsWith = _(function(pred, x, list) {
            var idx = -1, len = list.length;
            while (++idx < len) {
                if (pred(x, list[idx])) {return true;}
            }
            return false;
        });

        // Returns a new list containing only one copy of each element in the original list.  Equality is strict here,
        // meaning reference equality for objects and non-coercing equality for primitives.
        var uniq = R.uniq = function(list) {
            return foldr(function(acc, x) { return (contains(x, acc)) ? acc : prepend(x, acc); }, EMPTY, list);
        };

        // Returns a new list containing only one copy of each element in the original list, based upon the value
        // returned by applying the supplied predicate to two list elements.   Equality is strict here,  meaning
        // reference equality for objects and non-coercing equality for primitives.
        var uniqWith = _(function(pred, list) {
            return foldr(function(acc, x) {return (containsWith(pred, x, acc)) ? acc : prepend(x, acc); }, EMPTY, list);
        });


        // Returns a new list by plucking the same named property off all objects in the list supplied.
        var pluck = R.pluck = _(function(p, list) {return map(prop(p), list);});

        // Returns a list that contains a flattened version of the supplied list.  For example:
        //
        //     flatten([1, 2, [3, 4], 5, [6, [7, 8, [9, [10, 11], 12]]]]);
        //     // => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        var flatten = R.flatten = function(list) {
            var idx = -1, len = list ? list.length : 0, result = [], push = result.push, val;
            while (++idx < len) {
                val = list[idx];
                push.apply(result, isArray(val) ? flatten(val) : [val]);
            }
            return result;
        };


        // Creates a new list out of the two supplied by applying the function to each equally-positioned pair in the
        // lists.  For example,
        //
        //     zipWith(f, [1, 2, 3], ['a', 'b', 'c'])
        //     //    => [f(1, 'a'), f(2, 'b'), f(3, 'c')];
        //
        // Note that the output list will only be as long as the length os the first list passed in.
        R.zipWith = _(function(fn, a, b) {
            var rv = [], i = -1, len = a.length;
            while(++i < len) {
                rv[i] = fn(a[i], b[i]);
            }
            return rv;
        });

        // Creates a new list out of the two supplied by yielding the pair of each equally-positioned pair in the
        // lists.  For example,
        //
        //     zip([1, 2, 3], ['a', 'b', 'c'])
        //     //    => [[1, 'a'], [2, 'b'], [3, 'c']];
        R.zip =  _(function(a, b) { // = zipWith(prepend);
            var rv = [], i = -1, len = a.length;
            while (++i < len) {
                rv[i] = [a[i], b[i]];
            }
            return rv;
        });

        // Creates a new list out of the two supplied by applying the function to each possible pair in the lists.
        //  For example,
        //
        //     xProdWith(f, [1, 2], ['a', 'b'])
        //     //    => [f(1, 'a'), f(1, 'b'), f(2, 'a'), f(2, 'b')];
        R.xprodWith = _(function(fn, a, b) {
            if (isEmpty(a) || isEmpty(b)) {return EMPTY;}
            var i = -1, ilen = a.length, j, jlen = b.length, result = []; // better to push them all or to do `new Array(ilen * jlen)` and calculate indices?
            while (++i < ilen) {
                j = -1;
                while (++j < jlen) {
                    result.push(fn(a[i], b[j]));
                }
            }
            return result;
        });

        // Creates a new list out of the two supplied by yielding the pair of each possible pair in the lists.
        // For example,
        //
        //     xProd([1, 2], ['a', 'b'])
        //     //    => [[1, 'a'], [1, 'b')], [2, 'a'], [2, 'b']];
        R.xprod = _(function(a, b) { // = xprodWith(prepend); (takes about 3 times as long...)
            if (isEmpty(a) || isEmpty(b)) {return EMPTY;}
            var i = -1, ilen = a.length, j, jlen = b.length, result = []; // better to push them all or to do `new Array(ilen * jlen)` and calculate indices?
            while (++i < ilen) {
                j = -1;
                while (++j < jlen) {
                    result.push([a[i], b[j]]);
                }
            }
            return result;
        });

        // Returns a new list with the same elements as the original list, just in the reverse order.
        R.reverse = function(list) {
            return clone(list || []).reverse();
        };

        // // Returns a list of numbers from `from` (inclusive) to `to` (exclusive).
        // For example, 
        //
        //     range(1, 5) // => [1, 2, 3, 4]
        //     range(50, 53) // => [50, 51, 52]
        R.range = _(function(from, to) {
            if (from >= to) {return EMPTY;}
            var idx, result = new Array(to - from);
            for (idx = 0; from < to; idx++, from++) {
                result[idx] = from;
            }
            return result;
        });


        // Returns the first zero-indexed position of an object in a flat list
        R.indexOf = _(function(obj, list) {
            return list.indexOf(obj);
        });

        // Returns the last zero-indexed position of an object in a flat list
        R.lastIndexOf = _(function(obj, list) {
            return list.lastIndexOf(obj);
        });

        // Returns the elements of the list as a string joined by a separator.
        R.join = _(function(sep, list) {
            return list.join(sep);
        });

        // ramda.splice has a different contract than Array.splice. Array.splice mutates its array
        // and returns the removed elements. ramda.splice does not mutate the passed in list (well,
        // it makes a shallow copy), and returns a new list with the specified elements removed. 
        R.splice = _(function(start, len, list) {
            var ls = slice(list, 0);
            ls.splice(start, len);
            return ls;
        });

        // Returns the nth element of a list (zero-indexed)
        R.nth = _(function(n, list) {
          return (list[n] === undef) ? null : list[n];
        });

        // Makes a comparator function out of a function that reports whether the first element is less than the second.
        //
        //     var cmp = comparator(function(a, b) {
        //         return a.age < b.age;
        //     };
        //     sort(cmp, people);
        var comparator = R.comparator = function(pred) {
            return function(a, b) {
                return pred(a, b) ? -1 : pred(b, a) ? 1 : 0;
            };
        };

        // Returns a copy of the list, sorted according to the comparator function, which should accept two values at a
        // time and return a negative number if the first value is smaller, a positive number if it's larger, and zero
        // if they are equal.  Please note that this is a **copy** of the list.  It does not modify the original.
        var sort = R.sort = _(function(comparator, list) {
            return clone(list).sort(comparator);
        });


        // Object Functions
        // ----------------
        //
        // These functions operate on plain Javascript object, adding simple functions to test properties on these
        // objects.  Many of these are of most use in conjunction with the list functions, operating on lists of
        // objects.

        // --------

        // Runs the given function with the supplied object, then returns the object.
        R.tap = _(function(x, fn) {
            if (typeof fn === "function") {
                fn(x);
            }
            return x;
        });
        aliasFor("tap").is("K"); // TODO: are we sure? Not necessary, but convenient, IMHO.

        // Tests if two items are equal.  Equality is strict here, meaning reference equality for objects and
        // non-coercing equality for primitives.
        R.eq = _(function(a, b) {
            return a === b;
        });

        // Returns a function that when supplied an object returns the indicated property of that object, if it exists.
        var prop = R.prop = _(function(p, obj) {return obj[p];});
        aliasFor("prop").is("get"); // TODO: are we sure?  Matches some other libs, but might want to reserve for other use.

        // Returns a function that when supplied an object returns the result of running the indicated function on
        // that object, if it has such a function.
        R.func = _(function(fn, obj) {return obj[fn].apply(obj, slice(arguments, 2));});


        // Returns a function that when supplied a property name returns that property on the indicated object, if it
        // exists.
        R.props = _(function(obj, prop) {return obj && obj[prop];});


        // Returns a function that always returns the given value.
        var always = R.always = function(val) {
            return function() {return val;};
        };

        var anyBlanks = any(function(val) {return val === null || val === undef;});

        // Returns a function that will only call the indicated function if the correct number of (defined, non-null)
        // arguments are supplied, returning `undefined` otherwise.
        R.maybe = function (fn) {
            return function () {
                return (arguments.length === 0 || anyBlanks(expand(arguments, fn.length))) ? undef : fn.apply(this, arguments);
            };
        };

        // Returns a list containing the names of all the enumerable own
        // properties of the supplied object.
        var keys = R.keys = function (obj) {
            var prop, ks = [];
            for (prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    ks.push(prop);
                }
            }
            return ks;
        };

        // Returns a list of all the enumerable own properties of the supplied object.
        R.values = function (obj) {
            var prop, vs = [];
            for (prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    vs.push(obj[prop]);
                }
            }
            return vs;
        };

        var partialCopy = function(test, obj) {
            var copy = {};
            each(function(key) {if (test(key, obj)) {copy[key] = obj[key];}}, keys(obj));
            return copy;
        };

        // Returns a partial copy of an object containing only the keys specified.  If the key does not exist, the
        // property is ignored
        R.pick = _(function(names, obj) {
            return partialCopy(function(key) {return contains(key, names);}, obj);
        });

        // Similar to `pick` except that this one includes a `key: undefined` pair for properties that don't exist.
        var pickAll = R.pickAll = _(function(names, obj) {
            var copy = {};
            each(function(name) { copy[name] = obj[name]; }, names);
            return copy;
        });

        // Returns a partial copy of an object omitting the keys specified.
        R.omit = _(function(names, obj) {
            return partialCopy(function(key) {return !contains(key, names);}, obj);
        });


        // Reports whether two functions have the same value for the specified property.  Useful as a curried predicate.
        R.eqProps = _(function(prop, obj1, obj2) {return obj1[prop] === obj2[prop];});

        // `where` takes a spec object and a test object and returns true iof the test satisfies the spec, 
        // else false. Any property on the spec that is not a function is interpreted as an equality 
        // relation. For example:
        //
        //     var spec = {x: 2};
        //     where(spec, {w: 10, x: 2, y: 300}); // => true, x === 2
        //     where(spec, {x: 1, y: 'moo', z: true}); // => false, x !== 2
        //
        // If the spec has a property mapped to a function, then `where` evaluates the function, passing in 
        // the test object's value for the property in question, as well as the whole test object. For example:
        //
        //     var spec = {x: function(val, obj) { return  val + obj.y > 10; };
        //     where(spec, {x: 2, y: 7}); // => false
        //     where(spec, {x: 3, y: 8}); // => true
        //
        // `where` is well suited to declarativley expressing constraints for other functions, e.g., `filter`:
        //
        //     var xs = [{x: 2, y: 1}, {x: 10, y: 2}, 
        //               {x: 8, y: 3}, {x: 10, y: 4}];
        //     var fxs = filter(where({x: 10}), xs); 
        //     // fxs ==> [{x: 10, y: 2}, {x: 10, y: 4}]
        //
        R.where = _(function(spec, test) {
            return all(function(key) {
                var val = spec[key];
                return (typeof val === 'function') ? val(test[key], test) : (test[key] === val);
            }, keys(spec));
        });


        // Miscellaneous Functions
        // -----------------------
        //
        // A few functions in need of a good home.

        // --------

        // Expose the functions from ramda as properties on another object.  If this object is the global object, then
        // it will be as though the eweda functions are global functions.
        R.installTo = function(obj) {
            each(function(key) {
                (obj || global)[key] = R[key];
            })(keys(R));
        };

        // A function that always returns `0`.
        R.alwaysZero = always(0);

        // A function that always returns `false`.
        R.alwaysFalse = always(false);

        // A function that always returns `true`.
        R.alwaysTrue = always(true);



        // Logic Functions
        // ---------------
        //
        // These functions are very simple wrappers around the built-in logical operators, useful in building up
        // more complex functional forms.

        // --------

        // A function wrapping the boolean `&&` operator.  Note that unlike the underlying operator, though, it
        // aways returns `true` or `false`.
        R.and = _(function (a, b) {
            return !!(a && b);
        });

        // A function wrapping the boolean `||` operator.  Note that unlike the underlying operator, though, it
        // aways returns `true` or `false`.
        R.or = _(function (a, b) {
            return !!(a || b);
        });

        // A function wrapping the boolean `!` operator.  It returns `true` if the parameter is false-y and `false` if
        // the parameter is truth-y
        R.not = function (a) {
            return !a;
        };

        // A function wrapping calls to the two functions in an `&&` operation, returning `true` or `false`.  Note that
        // this is short-circuited, meaning that the second function will not be invoked if the first returns a false-y
        // value.
        R.andFn = _(function(f, g) { // TODO: arity?
           return function() {return !!(f.apply(this, arguments) && g.apply(this, arguments));};
        });

        // A function wrapping calls to the two functions in an `||` operation, returning `true` or `false`.  Note that
        // this is short-circuited, meaning that the second function will not be invoked if the first returns a truth-y
        // value. (Note also that at least Oliver Twist can pronounce this one...)
        R.orFn = _(function(f, g) { // TODO: arity?
           return function() {return !!(f.apply(this, arguments) || g.apply(this, arguments));};
        });

        // A function wrapping a call to the given function in a `!` operation.  It will return `true` when the
        // underlying function would return a false-y value, and `false` when it would return a truth-y one.
        var notFn = R.notFn = function (f) {
            return function() {return !f.apply(this, arguments);};
        };


        // TODO: is there a way to unify allPredicates and anyPredicates? they are sooooo similar
        // Given a list of predicates returns a new predicate that will be true exactly when all of them are.
        R.allPredicates = function(preds /*, val1, val12, ... */) {
            var args = slice(arguments, 1);
            var maxArity = max(map(function(f) { return f.length; }, preds));

            var andPreds = arity(maxArity, function() {
                var idx = -1;
                while (++idx < preds.length) {
                    if (!preds[idx].apply(null, arguments)) { return false; }
                }
                return true;
            });
            return (isEmpty(args)) ? andPreds : andPreds.apply(null, args);
        };


      // Given a list of predicates returns a new predicate that will be true exactly when any one of them is.
        R.anyPredicates = function(preds /*, val1, val12, ... */) {
            var args = slice(arguments, 1);
            var maxArity = max(map(function(f) { return f.length; }, preds));

            var orPreds = arity(maxArity, function() {
                var idx = -1;
                while (++idx < preds.length) {
                    if (preds[idx].apply(null, arguments)) { return true; }
                }
                return false;
            });
            return (isEmpty(args)) ? orPreds : orPreds.apply(null, args);
        };



        // Arithmetic Functions
        // --------------------
        //
        // These functions wrap up the certain core arithmetic operators

        // --------

        // Adds two numbers.  Automatic curried:
        //
        //     var add7 = add(7);
        //     add7(10); // => 17
        var add = R.add = _(function(a, b) {return a + b;});

        // Multiplies two numbers.  Automatically curried:
        //
        //     var mult3 = multiply(3);
        //     mult3(7); // => 21
        var multiply = R.multiply = _(function(a, b) {return a * b;});

        // Subtracts the second parameter from the first.  This is automatically curried, and while at times the curried
        // version might be useful, often the curried version of `subtractN` might be what's wanted.
        //
        //     var hundredMinus = subtract(100);
        //     hundredMinus(20) ; // => 80
        var subtract = R.subtract = _(function(a, b) {return a - b;});

        // Reversed version of `subtract`, where first parameter is subtracted from the second.  The curried version of
        // this one might me more useful than that of `subtract`.  For instance:
        //
        //     var decrement = subtractN(1);
        //     decrement(10); // => 9;
        R.subtractN = flip(subtract);

        // Divides the first parameter by the second.  This is automatically curried, and while at times the curried
        // version might be useful, often the curried version of `divideBy` might be what's wanted.
        var divide = R.divide = _(function(a, b) {return a / b;});

        // Reversed version of `divide`, where the second parameter is divided by the first.  The curried version of
        // this one might be more useful than that of `divide`.  For instance:
        //
        //     var half = divideBy(2);
        //     half(42); // => 21
        R.divideBy = flip(divide);

        // Adds together all the elements of a list.
        R.sum = foldl(add, 0);

        // Multiplies together all the elements of a list.
        R.product = foldl(multiply, 1);

        // Returns true if the first parameter is less than the second.
        R.lt = _(function(a, b) {return a < b;});

        // Returns true if the first parameter is less than or equal to the second.
        R.lte = _(function(a, b) {return a <= b;});

        // Returns true if the first parameter is greater than the second.
        R.gt = _(function(a, b) {return a > b;});

        // Returns true if the first parameter is greater than or equal to the second.
        R.gte = _(function(a, b) {return a >= b;});

        // Determines the largest of a list of numbers (or elements that can be cast to numbers)
        var max = R.max = function(list) {return Math.max.apply(null, list);};

        // Determines the largest of a list of numbers (or elements that can be cast to numbers) using the supplied comparator
        R.maxWith = _(function(comparator, list) {
            if (!isArray(list) || !list.length) {
                return undef;
            }
            var idx = 0, max = list[idx];
            while (++idx < list.length) {
                if (comparator(max, list[idx]) < 0) {
                    max = list[idx];
                }
            }
            return max;
        });

        // TODO: combine this with maxWith?
        // Determines the smallest of a list of numbers (or elements that can be cast to numbers) using the supplied comparator
        R.minWith = _(function(comparator, list) {
            if (!isArray(list) || !list.length) {
                return undef;
            }
            var idx = 0, max = list[idx];
            while (++idx < list.length) {
                if (comparator(max, list[idx]) > 0) {
                    max = list[idx];
                }
            }
            return max;
        });


        // Determines the smallest of a list of numbers (or elements that can be cast to numbers)
        R.min = function(list) {return Math.min.apply(null, list);};


        // String Functions
        // ----------------
        //
        // Much of the String.prototype API exposed as simple functions.

        // --------

        // A substring of a String:
        //
        //     substring(2, 5, "abcdefghijklm"); //=> "cde"
        var substring = R.substring = invoker("substring", String.prototype);

        // The trailing substring of a String starting with the nth character:
        //
        //     substringFrom(8, "abcdefghijklm"); //=> "ijklm"
        R.substringFrom = flip(substring)(undef);

        // The leading substring of a String ending before the nth character:
        //
        //     substringTo(8, "abcdefghijklm"); //=> "abcdefgh"
        R.substringTo = substring(0);

        // The character at the nth position in a String:
        //
        //     charAt(8, "abcdefghijklm"); //=> "i"
        R.charAt = invoker("charAt", String.prototype);

        // The ascii code of the character at the nth position in a String:
        //
        //     charCodeAt(8, "abcdefghijklm"); //=> 105
        //     // (... 'a' ~ 97, 'b' ~ 98, ... 'i' ~ 105)
        R.charCodeAt = invoker("charCodeAt", String.prototype);

        // Tests a regular expression agains a String
        //
        //     match(/([a-z]a)/g, "bananas"); //=> ["ba", "na", "na"]
        R.match = invoker("match", String.prototype);

        // Finds the index of a substring in a string, returning -1 if it's not present
        //
        //     strIndexOf('c', 'abcdefg) //=> 2
        R.strIndexOf = invoker("indexOf", String.prototype);

        // Finds the last index of a substring in a string, returning -1 if it's not present
        //
        //     strIndexOf('a', 'banana split') //=> 2
        R.strLastIndexOf = invoker("lastIndexOf", String.prototype);

        // The uppercase version of a string.
        //
        //     toUpperCase('abc') //=> 'ABC'
        R.toUpperCase = invoker("toUpperCase", String.prototype);

        // The lowercase version of a string.
        //
        //     toLowerCase('XYZ') //=> 'xyz'
        R.toLowerCase = invoker("toLowerCase", String.prototype);


        // The string split into substring at the specified token
        //
        //     split('.', 'a.b.c.xyz.d') //=>
        //         ['a', 'b', 'c', 'xyz', 'd']
        R.split = invoker("split", String.prototype, 1);


        // Data Analysis and Grouping Functions
        // ------------------------------------
        //
        // Functions performing SQL-like actions on lists of objects.  These do not have any SQL-like optimizations
        // performed on them, however.

        // --------

        // Reasonable analog to SQL `select` statement.
        //
        //     var kids = [
        //         {name: 'Abby', age: 7, hair: 'blond', grade: 2},
        //         {name: 'Fred', age: 12, hair: 'brown', grade: 7}
        //     ];
        //     project(['name', 'grade'], kids);
        //     //=> [{name: 'Abby', grade: 2}, {name: 'Fred', grade: 7}]
        R.project = useWith(map, pickAll, identity); // passing `identity` gives correct arity

        // Determines whether the given property of an object has a specific value
        // Most likely used to filter a list:
        //
        //     var kids = [
        //       {name: 'Abby', age: 7, hair: 'blond'},
        //       {name: 'Fred', age: 12, hair: 'brown'},
        //       {name: 'Rusty', age: 10, hair: 'brown'},
        //       {name: 'Alois', age: 15, disposition: 'surly'}
        //     ];
        //     filter(propEq("hair", "brown"), kids);
        //     //=> Fred and Rusty
        R.propEq = _(function(name, val, obj) {
            return obj[name] === val;
        });

        // Combines two lists into a set (i.e. no duplicates) composed of the elements of each list.
        R.union = compose(uniq, merge);

        // Combines two lists into a set (i.e. no duplicates) composed of the elements of each list.  Duplication is
        // determined according to the value returned by applying the supplied predicate to two list elements.
        R.unionWith = function(pred, list1, list2) {
            return uniqWith(pred, merge(list1, list2));
        };

        // Finds the set (i.e. no duplicates) of all elements in the first list not contained in the second list.
        R.difference = function(first, second) {return uniq(reject(flip(contains)(second))(first));};

        // Finds the set (i.e. no duplicates) of all elements in the first list not contained in the second list.
        // Duplication is determined according to the value returned by applying the supplied predicate to two list
        // elements.
        R.differenceWith = function(pred, first, second) {
            return uniqWith(pred)(reject(flip(containsWith(pred))(second), first));
        };

        // Combines two lists into a set (i.e. no duplicates) composed of those elements common to both lists.
        R.intersection = function(list1, list2) {
            return uniq(filter(flip(contains)(list1), list2));
        };

        // Combines two lists into a set (i.e. no duplicates) composed of those elements common to both lists.
        // Duplication is determined according to the value returned by applying the supplied predicate to two list
        // elements.
        R.intersectionWith = function(pred, list1, list2) {
            var results = [], idx = -1;
            while (++idx < list1.length) {
                if (containsWith(pred, list1[idx], list2)) {
                    results[results.length] = list1[idx];
                }
            }
            return uniqWith(pred, results);
        };

        // Creates a new list whose elements each have two properties: `val` is the value of the corresponding
        // item in the list supplied, and `key` is the result of applying the supplied function to that item.
        var keyValue = _(function(fn, list) { // TODO: Should this be made public?
            return map(function(item) {return {key: fn(item), val: item};}, list);
        });

        // Sorts the list according to a key generated by the supplied function.
        R.sortBy = _(function(fn, list) {
            /*
              return sort(comparator(function(a, b) {return fn(a) < fn(b);}), list); // clean, but too time-inefficient
              return pluck("val", sort(comparator(function(a, b) {return a.key < b.key;}), keyValue(fn, list))); // nice, but no need to clone result of keyValue call, so...
            */
            return pluck("val", keyValue(fn, list).sort(comparator(function(a, b) {return a.key < b.key;})));
        });

        // Counts the elements of a list according to how many match each value of a key generated by the supplied function.
        R.countBy = _(function(fn, list) {
            return foldl(function(counts, obj) {
                counts[obj.key] = (counts[obj.key] || 0) + 1;
                return counts;
            }, {}, keyValue(fn, list));
        });

        // Groups the elements of a list by a key generated by the supplied function.
        R.groupBy = _(function(fn, list) {
            return foldl(function(groups, obj) {
                (groups[obj.key] || (groups[obj.key] = [])).push(obj.val);
                return groups;
            }, {}, keyValue(fn, list));
        });



        // All the functional goodness, wrapped in a nice little package, just for you!
        return R;
    }());
}));

},{}],2:[function(_dereq_,module,exports){
var R = _dereq_('ramda');
var EMPTY = 0;

function Grid(m) {
  if (!(this instanceof Grid)) {
    return new Grid(m);
  }
  this.matrix = m;
};

Grid.prototype = {
  constructor: Grid,

  findEmptyCell: function() {
    var cell = {};
    cell.y = R.findIndex(function(r) { return R.contains(EMPTY, r); }, this.matrix);
    if (cell.y !== false) {
      cell.x = R.findIndex(function(c) { return c === EMPTY; }, this.matrix[cell.y]);
    }
    return (cell.y !== false && cell.x !== false) ? cell : false;
  },

  constrain: function(cell) {
    var rowWise = R.difference(R.range(1,10), this.matrix[cell.y]);
    var colWise = R.difference(rowWise, this.colToArray(cell.x));
    return R.difference(colWise, this.boxToArray(cell));
  },

  update: function(cell, value) {
    this.matrix[cell.y][cell.x] = value;
  },

  colToArray: function(x) {
    return R.pluck(x, this.matrix);
  },

  getBox: function(cell) {
    return {
      x: Math.floor(cell.x/3) * 3,
      y: Math.floor(cell.y/3) * 3
    };
  },

  boxToArray: function(cell) {
    var box = this.getBox(cell); 
    return R.reduce(function(acc, row) {  
      return acc.concat(R.map(R.I, row.slice(box.x, box.x + 3)));
    }, [], this.matrix.slice(box.y, box.y + 3));
  }

};

module.exports = Grid;



},{"ramda":1}],3:[function(_dereq_,module,exports){
var solver = _dereq_('./solver.js');
var R = _dereq_('ramda');

var render = function(g) {
  var grid = document.getElementById('grid');
  var htmlStr = R.reduce(function(acc, row) {
    return acc += '<tr>' + 
           R.reduce(function(acc, cell) {
             return acc + '<td>' + (cell || '') + '</td>';
           }, '', row) +
           '</tr>';
  }, '', g.matrix);
 
  grid.innerHTML = htmlStr;
};

solver.setRenderer(render);
solver.load();

// attach to DOM
solveBtn = document.getElementById('solveBtn');
solveBtn.addEventListener('click', function() { solver.solve(); });

},{"./solver.js":4,"ramda":1}],4:[function(_dereq_,module,exports){
var R = _dereq_('ramda');
var Grid = _dereq_('./Grid.js');

var grid = new Grid([
  [5, 0, 0,   1, 0, 0,   9, 3, 0],
  [6, 4, 0,   0, 7, 3,   0, 8, 0],
  [0, 0, 1,   8, 0, 5,   0, 0, 0],

  [8, 0, 0,   3, 4, 0,   0, 1, 0],
  [0, 0, 0,   5, 2, 1,   0, 0, 0],
  [0, 2, 0,   0, 8, 9,   0, 0, 6],

  [0, 0, 0,   6, 0, 7,   8, 0, 0],
  [0, 8, 0,   9, 3, 0,   0, 7, 1],
  [0, 1, 3,   0, 0, 8,   0, 0, 9]
]);


function render(g) {
  console.log("solved");
  g.matrix.forEach(function(r) {
    console.log(r);
  });
}

function load(g) {
  grid = g || grid;
  render(grid);
}

function solve(g) {
  if (!g) {
    g = grid;
    load(g);
  }

  var cell = g.findEmptyCell();
  var i = 0;
  
  if (!cell) {
    render(g);
    return true;
  }

  var domain = g.constrain(cell);

  while (i < domain.length) {
    g.update(cell, domain[i]); 

    if (solve(g)) {               
      return true;
    }

    // mark cell as empty and backtrack    
    g.update(cell, 0);
    i += 1;
  }
  return false;
}

module.exports = {
  load: load,
  setRenderer: function(fn) { 
    render = fn; 
  },
  solve: solve
};   


 

},{"./Grid.js":2,"ramda":1}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9taWtlL2Rldi9zdWRva3Vzb2x2ZXIvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvbWlrZS9kZXYvc3Vkb2t1c29sdmVyL25vZGVfbW9kdWxlcy9yYW1kYS9yYW1kYS5qcyIsIi9ob21lL21pa2UvZGV2L3N1ZG9rdXNvbHZlci9zcmMvanMvR3JpZC5qcyIsIi9ob21lL21pa2UvZGV2L3N1ZG9rdXNvbHZlci9zcmMvanMvZmFrZV9hZjhlMmZkZi5qcyIsIi9ob21lL21pa2UvZGV2L3N1ZG9rdXNvbHZlci9zcmMvanMvc29sdmVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMTVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyAgICAgcmFtZGEuanMgMC4wLjFcbi8vICAgICBodHRwczovL2dpdGh1Yi5jb20vQ3Jvc3NFeWUvcmFtZGFcbi8vICAgICAoYykgMjAxMy0yMDE0IFNjb3R0IFNhdXlldCBhbmQgTWljaGFlbCBIdXJsZXlcbi8vICAgICBSYW1kYSBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cblxuLy8gUmFtZGFcbi8vIC0tLS0tXG4vLyBBIHByYWN0aWNhbCBmdW5jdGlvbmFsIGxpYnJhcnkgZm9yIEphdmFzY3JpcHQgcHJvZ3JhbW1lcnMuICBUaGlzIGlzIGEgY29sbGVjdGlvbiBvZiB0b29scyB0byBtYWtlIGl0IGVhc2llciB0b1xuLy8gdXNlIEphdmFzY3JpcHQgYXMgYSBmdW5jdGlvbmFsIHByb2dyYW1taW5nIGxhbmd1YWdlLiAgKFRoZSBuYW1lIGlzIGp1c3QgYSBzaWxseSBwbGF5IG9uIGBsYW1iZGFgLCBldmVuIHRob3VnaCB3ZSdyZVxuLy8gbm90IGFjdHVhbGx5IGludm9sdmVkIGluIHRoZSBtYW5pcHVsYXRpb24gb2YgbGFtYmRhIGV4cHJlc3Npb25zLilcblxuLy8gQmFzaWMgU2V0dXBcbi8vIC0tLS0tLS0tLS0tXG4vLyBVc2VzIGEgdGVjaG5pcXVlIGZyb20gdGhlIFtVbml2ZXJzYWwgTW9kdWxlIERlZmluaXRpb25dW3VtZF0gdG8gd3JhcCB0aGlzIHVwIGZvciB1c2UgaW4gTm9kZS5qcyBvciBpbiB0aGUgYnJvd3Nlcixcbi8vIHdpdGggb3Igd2l0aG91dCBhbiBBTUQtc3R5bGUgbG9hZGVyLlxuLy9cbi8vICBbdW1kXTogaHR0cHM6Ly9naXRodWIuY29tL3VtZGpzL3VtZC9ibG9iL21hc3Rlci9yZXR1cm5FeHBvcnRzLmpzXG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge2lmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHttb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnkocm9vdCk7fSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtkZWZpbmUoZmFjdG9yeSk7fSBlbHNlIHtyb290LnJhbWRhID0gZmFjdG9yeShyb290KTt9fSh0aGlzLCBmdW5jdGlvbiAoZ2xvYmFsKSB7XG5cbiAgICByZXR1cm4gIChmdW5jdGlvbigpIHtcblxuICAgICAgICAvLyBUaGlzIG9iamVjdCBpcyB3aGF0IGlzIGFjdHVhbGx5IHJldHVybmVkLCB3aXRoIGFsbCB0aGUgZXhwb3NlZCBmdW5jdGlvbnMgYXR0YWNoZWQgYXMgcHJvcGVydGllcy5cblxuICAgICAgICB2YXIgUiA9IHt9O1xuXG4gICAgICAgIC8vIEludGVybmFsIEZ1bmN0aW9ucyBhbmQgUHJvcGVydGllc1xuICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgICAgICB2YXIgdW5kZWYgPSAoZnVuY3Rpb24oKXt9KSgpLCBFTVBUWTtcblxuICAgICAgICAvLyBNYWtlcyBhIHB1YmxpYyBhbGlhcyBmb3Igb25lIG9mIHRoZSBwdWJsaWMgZnVuY3Rpb25zOlxuICAgICAgICB2YXIgYWxpYXNGb3IgPSBmdW5jdGlvbihvbGROYW1lKSB7XG4gICAgICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbihuZXdOYW1lKSB7UltuZXdOYW1lXSA9IFJbb2xkTmFtZV07IHJldHVybiBmbjt9O1xuICAgICAgICAgICAgZm4uaXMgPSBmbi5hcmUgPSBmbi5hbmQgPSBmbjtcbiAgICAgICAgICAgIHJldHVybiBmbjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBgc2xpY2VgIGltcGxlbWVudGVkIGl0ZXJhdGl2ZWx5IGZvciBwZXJmb3JtYW5jZVxuICAgICAgICB2YXIgc2xpY2UgPSBmdW5jdGlvbiAoYXJncywgZnJvbSwgdG8pIHtcbiAgICAgICAgICAgIHZhciBpLCBhcnIgPSBbXTtcbiAgICAgICAgICAgIGZyb20gPSBmcm9tIHx8IDA7XG4gICAgICAgICAgICB0byA9IHRvIHx8IGFyZ3MubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChpID0gZnJvbTsgaSA8IHRvOyBpKyspIHtcbiAgICAgICAgICAgICAgICBhcnJbYXJyLmxlbmd0aF0gPSBhcmdzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgaXNBcnJheSA9IGZ1bmN0aW9uKHZhbCkge3JldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO307XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIGN1cnJpZWQgdmVyc2lvbiBvZiB0aGUgc3VwcGxpZWQgZnVuY3Rpb24uICBGb3IgZXhhbXBsZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgICB2YXIgZGlzY3JpbWluYW50ID0gZnVuY3Rpb24oYSwgYiwgYykge1xuICAgICAgICAvLyAgICAgICAgICByZXR1cm4gYiAqIGIgLSA0ICogYSAqIGM7XG4gICAgICAgIC8vICAgICAgfTtcbiAgICAgICAgLy8gICAgICB2YXIgZiA9IGN1cnJ5KGRpc2NyaW1pbmFudCk7XG4gICAgICAgIC8vICAgICAgdmFyIGcgPSBmKDMpLCBoID0gZigzLCA3KSBpID0gZyg3KTtcbiAgICAgICAgLy8gICAgICBpKDQpIOKJhSBoKDQpID09IGcoNywgNCkgPT0gZigzLCA3LCA0KSA9PSAxXG4gICAgICAgIC8vXG4gICAgICAgIC8vICBBbG1vc3QgYWxsIGV4cG9zZWQgZnVuY3Rpb25zIG9mIG1vcmUgdGhhbiBvbmUgcGFyYW1ldGVyIGFscmVhZHkgaGF2ZSBjdXJyeSBhcHBsaWVkIHRvIHRoZW0uXG4gICAgICAgIHZhciBfID0gUi5jdXJyeSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgICAgICB2YXIgZm5Bcml0eSA9IGZuLmxlbmd0aDtcbiAgICAgICAgICAgIHZhciBmID0gZnVuY3Rpb24oYXJncykge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcml0eShNYXRoLm1heChmbkFyaXR5IC0gKGFyZ3MgJiYgYXJncy5sZW5ndGggfHwgMCksIDApLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdBcmdzID0gKGFyZ3MgfHwgW10pLmNvbmNhdChzbGljZShhcmd1bWVudHMsIDApKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0FyZ3MubGVuZ3RoID49IGZuQXJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBuZXdBcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtyZXR1cm4gZihuZXdBcmdzKTt9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gZihbXSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIG1rQXJnU3RyID0gZnVuY3Rpb24obikge1xuICAgICAgICAgICAgdmFyIGFyciA9IFtdLCBpZHggPSAtMTtcbiAgICAgICAgICAgIHdoaWxlKCsraWR4IDwgbikge1xuICAgICAgICAgICAgICAgIGFycltpZHhdID0gXCJhcmdcIiArIGlkeDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhcnIuam9pbihcIiwgXCIpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFdyYXBzIGEgZnVuY3Rpb24gdGhhdCBtYXkgYmUgbnVsbGFyeSwgb3IgbWF5IHRha2UgZmV3ZXIgdGhhbiBvciBtb3JlIHRoYW4gYG5gIHBhcmFtZXRlcnMsIGluIGEgZnVuY3Rpb24gdGhhdFxuICAgICAgICAvLyBzcGVjaWZpY2FsbHkgdGFrZXMgZXhhY3RseSBgbmAgcGFyYW1ldGVycy4gIEFueSBleHRyYW5lb3VzIHBhcmFtZXRlcnMgd2lsbCBub3QgYmUgcGFzc2VkIG9uIHRvIHRoZSBmdW5jdGlvblxuICAgICAgICAvLyBzdXBwbGllZFxuICAgICAgICB2YXIgbkFyeSA9IFIubkFyeSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBjYWNoZSA9IHt9O1xuXG5cbiAgICAgICAgICAgIC8vICAgICBGb3IgZXhhbXBsZTpcbiAgICAgICAgICAgIC8vICAgICBjYWNoZVszXSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGFyZzAsIGFyZzEsIGFyZzIpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpcywgYXJnMCwgYXJnMSwgYXJnMik7XG4gICAgICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgbWFrZU4gPSBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuQXJncyA9IG1rQXJnU3RyKG4pO1xuICAgICAgICAgICAgICAgIHZhciBib2R5ID0gW1xuICAgICAgICAgICAgICAgICAgICBcIiAgICByZXR1cm4gZnVuY3Rpb24oXCIgKyBmbkFyZ3MgKyBcIikge1wiLFxuICAgICAgICAgICAgICAgICAgICBcIiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzXCIgKyAoZm5BcmdzID8gXCIsIFwiICsgZm5BcmdzIDogXCJcIikgKyBcIik7XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiICAgIH1cIlxuICAgICAgICAgICAgICAgIF0uam9pbihcIlxcblwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKFwiZnVuY1wiLCBib2R5KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihuLCBmbikge1xuICAgICAgICAgICAgICAgIHJldHVybiAoY2FjaGVbbl0gfHwgKGNhY2hlW25dID0gbWFrZU4obikpKShmbik7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KCkpO1xuXG4gICAgICAgIC8vIFdyYXBzIGEgZnVuY3Rpb24gdGhhdCBtYXkgYmUgbnVsbGFyeSwgb3IgbWF5IHRha2UgZmV3ZXIgdGhhbiBvciBtb3JlIHRoYW4gYG5gIHBhcmFtZXRlcnMsIGluIGEgZnVuY3Rpb24gdGhhdFxuICAgICAgICAvLyBzcGVjaWZpY2FsbHkgdGFrZXMgZXhhY3RseSBgbmAgcGFyYW1ldGVycy4gIE5vdGUsIHRob3VnaCwgdGhhdCBhbGwgcGFyYW1ldGVycyBzdXBwbGllZCB3aWxsIGluIGZhY3QgYmVcbiAgICAgICAgLy8gcGFzc2VkIGFsb25nLCBpbiBjb250cmFzdCB3aXRoIGBuQXJ5YCwgd2hpY2ggb25seSBwYXNzZXMgYWxvbmcgdGhlIGV4YWN0IG51bWJlciBzcGVjaWZpZWQuXG4gICAgICAgIHZhciBhcml0eSA9IFIuYXJpdHkgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY2FjaGUgPSB7fTtcblxuICAgICAgICAgICAgLy8gICAgIEZvciBleGFtcGxlOlxuICAgICAgICAgICAgLy8gICAgIGNhY2hlWzNdID0gZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgICAgLy8gICAgICAgICByZXR1cm4gZnVuY3Rpb24oYXJnMCwgYXJnMSwgYXJnMikge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgIH07XG5cbiAgICAgICAgICAgIHZhciBtYWtlTiA9IGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgICAgICB2YXIgZm5BcmdzID0gbWtBcmdTdHIobik7XG4gICAgICAgICAgICAgICAgdmFyIGJvZHkgPSBbXG4gICAgICAgICAgICAgICAgICAgIFwiICAgIHJldHVybiBmdW5jdGlvbihcIiArIGZuQXJncyArIFwiKSB7XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1wiLFxuICAgICAgICAgICAgICAgICAgICBcIiAgICB9XCJcbiAgICAgICAgICAgICAgICBdLmpvaW4oXCJcXG5cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcImZ1bmNcIiwgYm9keSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24obiwgZm4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGNhY2hlW25dIHx8IChjYWNoZVtuXSA9IG1ha2VOKG4pKSkoZm4pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSgpKTtcblxuICAgICAgICAvLyBUdXJucyBhIG5hbWVkIG1ldGhvZCBvZiBhbiBvYmplY3QgKG9yIG9iamVjdCBwcm90b3R5cGUpIGludG8gYSBmdW5jdGlvbiB0aGF0IGNhbiBiZSBjYWxsZWQgZGlyZWN0bHkuXG4gICAgICAgIC8vIFRoZSBvYmplY3QgYmVjb21lcyB0aGUgbGFzdCBwYXJhbWV0ZXIgdG8gdGhlIGZ1bmN0aW9uLCBhbmQgdGhlIGZ1bmN0aW9uIGlzIGF1dG9tYXRpY2FsbHkgY3VycmllZC5cbiAgICAgICAgLy8gUGFzc2luZyB0aGUgb3B0aW9uYWwgYGxlbmAgcGFyYW1ldGVyIHJlc3RyaWN0cyB0aGUgZnVuY3Rpb24gdG8gdGhlIGluaXRpYWwgYGxlbmAgcGFyYW1ldGVycyBvZiB0aGUgbWV0aG9kLlxuICAgICAgICB2YXIgaW52b2tlciA9IFIuaW52b2tlciA9IGZ1bmN0aW9uKG5hbWUsIG9iaiwgbGVuKSB7XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gb2JqW25hbWVdO1xuICAgICAgICAgICAgdmFyIGxlbmd0aCA9IGxlbiA9PT0gdW5kZWYgPyBtZXRob2QubGVuZ3RoIDogbGVuO1xuICAgICAgICAgICAgcmV0dXJuIG1ldGhvZCAmJiBfKG5BcnkobGVuZ3RoICsgMSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gQXJyYXkucHJvdG90eXBlLnBvcC5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0YXJnZXRNZXRob2QgPSB0YXJnZXRbbmFtZV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXRNZXRob2QgPT0gbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0TWV0aG9kLmFwcGx5KHRhcmdldCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWY7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQ3JlYXRlcyBhIG5ldyBmdW5jdGlvbiB0aGF0IGNhbGxzIHRoZSBmdW5jdGlvbiBgZm5gIHdpdGggcGFyYW1ldGVycyBjb25zaXN0aW5nIG9mICB0aGUgcmVzdWx0IG9mIHRoZVxuICAgICAgICAvLyBjYWxsaW5nIGVhY2ggc3VwcGxpZWQgaGFuZGxlciBvbiBzdWNjZXNzaXZlIGFyZ3VtZW50cywgZm9sbG93ZWQgYnkgYWxsIHVubWF0Y2hlZCBhcmd1bWVudHMuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIElmIHRoZXJlIGFyZSBleHRyYSBfZXhwZWN0ZWRfIGFyZ3VtZW50cyB0aGF0IGRvbid0IG5lZWQgdG8gYmUgdHJhbnNmb3JtZWQsIGFsdGhvdWdoIHlvdSBjYW4gaWdub3JlXG4gICAgICAgIC8vIHRoZW0sIGl0IG1pZ2h0IGJlIGJlc3QgdG8gcGFzcyBpbiBhbmQgaWRlbnRpdHkgZnVuY3Rpb24gc28gdGhhdCB0aGUgbmV3IGZ1bmN0aW9uIGNvcnJlY3RseSByZXBvcnRzIGFyaXR5LlxuICAgICAgICAvLyBTZWUgZm9yIGV4YW1wbGUsIHRoZSBkZWZpbml0aW9uIG9mIGBwcm9qZWN0YCwgYmVsb3cuXG4gICAgICAgIHZhciB1c2VXaXRoID0gUi51c2VXaXRoID0gZnVuY3Rpb24oZm4gLyosIHRyYW5zZm9ybWVycyAqLykge1xuICAgICAgICAgICAgdmFyIHRyYW5zZm9ybWVycyA9IHNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICB2YXIgdGxlbiA9IHRyYW5zZm9ybWVycy5sZW5ndGg7XG4gICAgICAgICAgICByZXR1cm4gXyhhcml0eSh0bGVuLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IFtdLCBpZHggPSAtMTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoKytpZHggPCB0bGVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaCh0cmFuc2Zvcm1lcnNbaWR4XShhcmd1bWVudHNbaWR4XSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJncy5jb25jYXQoc2xpY2UoYXJndW1lbnRzLCB0bGVuKSkpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEEgdHdvLXN0ZXAgdmVyc2lvbiBvZiB0aGUgYHVzZVdpdGhgIGZ1bmN0aW9uLiAgVGhpcyB3b3VsZCBhbGxvdyB1cyB0byB3cml0ZSBgcHJvamVjdGAsIGN1cnJlbnRseSB3cml0dGVuXG4gICAgICAgIC8vIGFzIGB1c2VXaXRoKG1hcCwgcGlja0FsbCwgaWRlbnRpdHkpYCwgYXMsIGluc3RlYWQsIGB1c2UobWFwKS5vdmVyKHBpY2tBbGwsIGlkZW50aXR5KWAsIHdoaWNoIGlzIGEgYml0XG4gICAgICAgIC8vIG1vcmUgZXhwbGljaXQuXG4gICAgICAgIC8vIFRPRE86IE9uZSBvZiB0aGVzZSB2ZXJzaW9ucyBzaG91bGQgYmUgZWxpbWluYXRlZCBldmVudHVhbGx5LiAgU28gbm90IHdvcnJ5aW5nIGFib3V0IHRoZSBkdXBsaWNhdGlvbiBmb3Igbm93LlxuICAgICAgICBSLnVzZSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG92ZXI6IGZ1bmN0aW9uKC8qdHJhbnNmb3JtZXJzKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRyYW5zZm9ybWVycyA9IHNsaWNlKGFyZ3VtZW50cywgMCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0bGVuID0gdHJhbnNmb3JtZXJzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF8oYXJpdHkodGxlbiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IFtdLCBpZHggPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IHRsZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2godHJhbnNmb3JtZXJzW2lkeF0oYXJndW1lbnRzW2lkeF0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmdzLmNvbmNhdChzbGljZShhcmd1bWVudHMsIHRsZW4pKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG5cbiAgICAgICAgLy8gRmlsbHMgb3V0IGFuIGFycmF5IHRvIHRoZSBzcGVjaWZpZWQgbGVuZ3RoLiBJbnRlcm5hbCBwcml2YXRlIGZ1bmN0aW9uLlxuICAgICAgICB2YXIgZXhwYW5kID0gZnVuY3Rpb24oYSwgbGVuKSB7XG4gICAgICAgICAgICB2YXIgYXJyID0gYSA/IGlzQXJyYXkoYSkgPyBhIDogc2xpY2UoYSkgOiBbXTtcbiAgICAgICAgICAgIHdoaWxlKGFyci5sZW5ndGggPCBsZW4pIHthcnJbYXJyLmxlbmd0aF0gPSB1bmRlZjt9XG4gICAgICAgICAgICByZXR1cm4gYXJyO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsIHZlcnNpb24gb2YgYGZvckVhY2hgLiAgUG9zc2libHkgdG8gYmUgZXhwb3NlZCBsYXRlci5cbiAgICAgICAgdmFyIGVhY2ggPSBfKGZ1bmN0aW9uKGZuLCBhcnIpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBmbihhcnJbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTaGFsbG93IGNvcHkgb2YgYW4gYXJyYXkuXG4gICAgICAgIHZhciBjbG9uZSA9IFIuY2xvbmUgPSBmdW5jdGlvbihsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gbGlzdC5jb25jYXQoKTtcbiAgICAgICAgfTtcblxuXG4gICAgICAgIC8vIENvcmUgRnVuY3Rpb25zXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG5cbiAgICAgICAgLy8gICBQcm90b3R5cGljYWwgKG9yIG9ubHkpIGVtcHR5IGxpc3RcbiAgICAgICAgRU1QVFkgPSBbXTtcblxuICAgICAgICAvLyBCb29sZWFuIGZ1bmN0aW9uIHdoaWNoIHJlcG9ydHMgd2hldGhlciBhIGxpc3QgaXMgZW1wdHkuXG4gICAgICAgIHZhciBpc0VtcHR5ID0gUi5pc0VtcHR5ID0gZnVuY3Rpb24oYXJyKSB7cmV0dXJuICFhcnIgfHwgIWFyci5sZW5ndGg7fTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGxpc3Qgd2l0aCB0aGUgbmV3IGVsZW1lbnQgYXQgdGhlIGZyb250IGFuZCB0aGUgZXhpc3RpbmcgZWxlbWVudHMgZm9sbG93aW5nXG4gICAgICAgIHZhciBwcmVwZW5kID0gUi5wcmVwZW5kID0gZnVuY3Rpb24oZWwsIGFycikge3JldHVybiBbZWxdLmNvbmNhdChhcnIpO307XG4gICAgICAgIGFsaWFzRm9yKFwicHJlcGVuZFwiKS5pcyhcImNvbnNcIik7XG5cbiAgICAgICAgLy8gIFJldHVybnMgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYSBsaXN0XG4gICAgICAgIHZhciBoZWFkID0gUi5oZWFkID0gZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgICAgICBhcnIgPSBhcnIgfHwgRU1QVFk7XG4gICAgICAgICAgICByZXR1cm4gKGFyci5sZW5ndGgpID8gYXJyWzBdIDogbnVsbDsgXG4gICAgICAgIH07XG4gICAgICAgIGFsaWFzRm9yKFwiaGVhZFwiKS5pcyhcImNhclwiKTsgXG5cbiAgICAgICAgLy8gUmV0dXJucyB0aGUgcmVzdCBvZiB0aGUgbGlzdCBhZnRlciB0aGUgZmlyc3QgZWxlbWVudC5cbiAgICAgICAgLy8gSWYgdGhlIHBhc3NlZC1pbiBsaXN0IGlzIGEgR2VuZXJhdG9yLCBpdCB3aWxsIHJldHVybiB0aGUgXG4gICAgICAgIC8vIG5leHQgaXRlcmF0aW9uIG9mIHRoZSBHZW5lcmF0b3IuXG4gICAgICAgIHZhciB0YWlsID0gUi50YWlsID0gZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgICAgICBhcnIgPSBhcnIgfHwgRU1QVFk7XG4gICAgICAgICAgICBpZiAoYXJyLmxlbmd0aCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJyLnRhaWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAoYXJyLmxlbmd0aCA+IDEpID8gc2xpY2UoYXJyLCAxKSA6IG51bGw7XG4gICAgICAgIH07XG4gICAgICAgIGFsaWFzRm9yKFwidGFpbFwiKS5pcyhcImNkclwiKTtcblxuICAgICAgICAvLyAgIEJvb2xlYW4gZnVuY3Rpb24gd2hpY2ggaXMgYHRydWVgIGZvciBub24tbGlzdCwgYGZhbHNlYCBmb3IgYSBsaXN0LlxuICAgICAgICBSLmlzQXRvbSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoeCAhPT0gbnVsbCkgJiYgKHggIT09IHVuZGVmKSAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgIT09IFwiW29iamVjdCBBcnJheV1cIjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGxpc3Qgd2l0aCB0aGUgbmV3IGVsZW1lbnQgYXQgdGhlIGVuZCBvZiBhIGxpc3QgZm9sbG93aW5nIGFsbCB0aGUgZXhpc3Rpbmcgb25lcy5cbiAgICAgICAgUi5hcHBlbmQgPSBmdW5jdGlvbihlbCwgbGlzdCkge1xuICAgICAgICAgICAgdmFyIG5ld0xpc3QgPSBjbG9uZShsaXN0KTtcbiAgICAgICAgICAgIG5ld0xpc3QucHVzaChlbCk7XG4gICAgICAgICAgICByZXR1cm4gbmV3TGlzdDtcbiAgICAgICAgfTtcbiAgICAgICAgYWxpYXNGb3IoXCJhcHBlbmRcIikuaXMoXCJwdXNoXCIpO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCBjb25zaXN0aW5nIG9mIHRoZSBlbGVtZW50cyBvZiB0aGUgZmlyc3QgbGlzdCBmb2xsb3dlZCBieSB0aGUgZWxlbWVudHMgb2YgdGhlIHNlY29uZC5cbiAgICAgICAgdmFyIG1lcmdlID0gUi5tZXJnZSA9IF8oZnVuY3Rpb24obGlzdDEsIGxpc3QyKSB7XG4gICAgICAgICAgICBpZiAoaXNFbXB0eShsaXN0MSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2xvbmUobGlzdDIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlzdDEuY29uY2F0KGxpc3QyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGFsaWFzRm9yKFwibWVyZ2VcIikuaXMoXCJjb25jYXRcIik7XG5cbiAgICAgICAgLy8gQSBzdXJwcmlzaW5nbHkgdXNlZnVsIGZ1bmN0aW9uIHRoYXQgZG9lcyBub3RoaW5nIGJ1dCByZXR1cm4gdGhlIHBhcmFtZXRlciBzdXBwbGllZCB0byBpdC5cbiAgICAgICAgdmFyIGlkZW50aXR5ID0gUi5pZGVudGl0eSA9IGZ1bmN0aW9uKHgpIHtyZXR1cm4geDt9O1xuICAgICAgICBhbGlhc0ZvcihcImlkZW50aXR5XCIpLmlzKFwiSVwiKTtcblxuXG5cbiAgICAgICAgLy8gR2VuZXJhdG9yc1xuICAgICAgICAvLyAtLS0tLS0tLS0tXG4gICAgICAgIC8vXG5cbiAgICAgICAgLy8gU3VwcG9ydCBmb3IgaW5maW5pdGUgbGlzdHMsIHVzaW5nIGFuIGluaXRpYWwgc2VlZCwgYSBmdW5jdGlvbiB0aGF0IGNhbGN1bGF0ZXMgdGhlIGhlYWQgZnJvbSB0aGUgc2VlZCBhbmRcbiAgICAgICAgLy8gYSBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgYSBuZXcgc2VlZCBmcm9tIHRoZSBjdXJyZW50IHNlZWQuICBHZW5lcmF0b3Igb2JqZWN0cyBoYXZlIHRoaXMgc3RydWN0dXJlOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAge1xuICAgICAgICAvLyAgICAgICAgXCIwXCI6IHNvbWVWYWx1ZSxcbiAgICAgICAgLy8gICAgICAgIHRhaWw6IHNvbWVGdW5jdGlvbigpIHt9LFxuICAgICAgICAvLyAgICAgICAgbGVuZ3RoOiBJbmZpbml0eVxuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvL1xuICAgICAgICAvLyBHZW5lcmF0b3Igb2JqZWN0cyBhbHNvIGhhdmUgc3VjaCBmdW5jdGlvbnMgYXMgYHRha2VgLCBgc2tpcGAsIGBtYXBgLCBhbmQgYGZpbHRlcmAsIGJ1dCB0aGUgZXF1aXZhbGVudFxuICAgICAgICAvLyBmdW5jdGlvbnMgZnJvbSBSYW1kYSB3aWxsIHdvcmsgd2l0aCB0aGVtIGFzIHdlbGwuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICMjIyBFeGFtcGxlICMjI1xuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIGZpYm9uYWNjaSA9IGdlbmVyYXRvcihcbiAgICAgICAgLy8gICAgICAgICBbMCwgMV0sXG4gICAgICAgIC8vICAgICAgICAgZnVuY3Rpb24ocGFpcikge3JldHVybiBwYWlyWzBdO30sXG4gICAgICAgIC8vICAgICAgICAgZnVuY3Rpb24ocGFpcikge3JldHVybiBbcGFpclsxXSwgcGFpclswXSArIHBhaXJbMV1dO31cbiAgICAgICAgLy8gICAgICk7XG4gICAgICAgIC8vICAgICB2YXIgZXZlbiA9IGZ1bmN0aW9uKG4pIHtyZXR1cm4gKG4gJSAyKSA9PT0gMDt9O1xuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdGFrZSg1LCBmaWx0ZXIoZXZlbiwgZmlib25hY2NpKSkgLy89PiBbMCwgMiwgOCwgMzQsIDE0NF1cbiAgICAgICAgLy9cbiAgICAgICAgLy8gTm90ZSB0aGF0IHRoZSBgdGFrZSg1KWAgY2FsbCBpcyBuZWNlc3NhcnkgdG8gZ2V0IGEgZmluaXRlIGxpc3Qgb3V0IG9mIHRoaXMuICBPdGhlcndpc2UsIHRoaXMgd291bGQgc3RpbGxcbiAgICAgICAgLy8gYmUgYW4gaW5maW5pdGUgbGlzdC5cblxuICAgICAgICBSLmdlbmVyYXRvciA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIHBhcnRpYWwgc2hpbSBmb3IgT2JqZWN0LmNyZWF0ZVxuICAgICAgICAgICAgdmFyIGNyZWF0ZSA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgRiA9IGZ1bmN0aW9uKCkge307XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNyYykge1xuICAgICAgICAgICAgICAgICAgICBGLnByb3RvdHlwZSA9IHNyYztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBGKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0oKSk7XG5cbiAgICAgICAgICAgIC8vIFRyYW1wb2xpbmluZyB0byBzdXBwb3J0IHJlY3Vyc2lvbiBpbiBHZW5lcmF0b3JzXG4gICAgICAgICAgICB2YXIgdHJhbXBvbGluZSA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGZuLmFwcGx5KHRoaXMsIHRhaWwoYXJndW1lbnRzKSk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHR5cGVvZiByZXN1bHQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBJbnRlcm5hbCBHZW5lcmF0b3IgY29uc3RydWN0b3JcbiAgICAgICAgICAgIHZhciAgRyA9IGZ1bmN0aW9uKHNlZWQsIGN1cnJlbnQsIHN0ZXApIHtcbiAgICAgICAgICAgICAgICB0aGlzW1wiMFwiXSA9IGN1cnJlbnQoc2VlZCk7XG4gICAgICAgICAgICAgICAgdGhpcy50YWlsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRyhzdGVwKHNlZWQpLCBjdXJyZW50LCBzdGVwKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIEdlbmVyYXRvcnMgY2FuIGJlIHVzZWQgd2l0aCBPTyB0ZWNobmlxdWVzIGFzIHdlbGwgYXMgb3VyIHN0YW5kYXJkIGZ1bmN0aW9uYWwgY2FsbHMuICBUaGVzZSBhcmUgdGhlXG4gICAgICAgICAgICAvLyBpbXBsZW1lbnRhdGlvbnMgb2YgdGhvc2UgbWV0aG9kcyBhbmQgb3RoZXIgcHJvcGVydGllcy5cbiAgICAgICAgICAgIEcucHJvdG90eXBlID0ge1xuICAgICAgICAgICAgICAgICBjb25zdHJ1Y3RvcjogRyxcbiAgICAgICAgICAgICAgICAgLy8gQWxsIGdlbmVyYXRvcnMgYXJlIGluZmluaXRlLlxuICAgICAgICAgICAgICAgICBsZW5ndGg6IEluZmluaXR5LFxuICAgICAgICAgICAgICAgICAvLyBgdGFrZWAgaW1wbGVtZW50YXRpb24gZm9yIGdlbmVyYXRvcnMuXG4gICAgICAgICAgICAgICAgIHRha2U6IGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgICAgICAgICAgIHZhciB0YWtlID0gZnVuY3Rpb24oY3RyLCBnLCByZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGN0ciA9PT0gMCkgPyByZXQgOiB0YWtlKGN0ciAtIDEsIGcudGFpbCgpLCByZXQuY29uY2F0KFtnWzBdXSkpO1xuICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cmFtcG9saW5lKHRha2UsIG4sIHRoaXMsIFtdKTtcbiAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgLy8gYHNraXBgIGltcGxlbWVudGF0aW9uIGZvciBnZW5lcmF0b3JzLlxuICAgICAgICAgICAgICAgICBza2lwOiBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgICAgICAgICB2YXIgc2tpcCA9IGZ1bmN0aW9uKGN0ciwgZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoY3RyIDw9IDApID8gZyA6IHNraXAoY3RyIC0gMSwgZy50YWlsKCkpO1xuICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cmFtcG9saW5lKHNraXAsIG4sIHRoaXMpO1xuICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAvLyBgbWFwYCBpbXBsZW1lbnRhdGlvbiBmb3IgZ2VuZXJhdG9ycy5cbiAgICAgICAgICAgICAgICAgbWFwOiBmdW5jdGlvbihmbiwgZ2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICB2YXIgZyA9IGNyZWF0ZShHLnByb3RvdHlwZSk7XG4gICAgICAgICAgICAgICAgICAgICBnWzBdID0gZm4oZ2VuWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgIGcudGFpbCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5tYXAoZm4sIGdlbi50YWlsKCkpOyB9O1xuICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGc7XG4gICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgIC8vIGBmaWx0ZXJgIGltcGxlbWVudGF0aW9uIGZvciBnZW5lcmF0b3JzLlxuICAgICAgICAgICAgICAgICBmaWx0ZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgICAgICAgICAgICAgICB2YXIgZ2VuID0gdGhpcywgaGVhZCA9IGdlblswXTtcbiAgICAgICAgICAgICAgICAgICAgIHdoaWxlICghZm4oaGVhZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBnZW4gPSBnZW4udGFpbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWQgPSBnZW5bMF07XG4gICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB2YXIgZyA9IGNyZWF0ZShHLnByb3RvdHlwZSk7XG4gICAgICAgICAgICAgICAgICAgICBnWzBdID0gaGVhZDtcbiAgICAgICAgICAgICAgICAgICAgIGcudGFpbCA9IGZ1bmN0aW9uKCkge3JldHVybiBmaWx0ZXIoZm4sIGdlbi50YWlsKCkpO307XG4gICAgICAgICAgICAgICAgICAgICByZXR1cm4gZztcbiAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gVGhlIGFjdHVhbCBwdWJsaWMgYGdlbmVyYXRvcmAgZnVuY3Rpb24uXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oc2VlZCwgY3VycmVudCwgc3RlcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRyhzZWVkLCBjdXJyZW50LCBzdGVwKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0oKSk7XG5cblxuICAgICAgICAvLyBGdW5jdGlvbiBmdW5jdGlvbnMgOi0pXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGhlc2UgZnVuY3Rpb25zIG1ha2UgbmV3IGZ1bmN0aW9ucyBvdXQgb2Ygb2xkIG9uZXMuXG5cbiAgICAgICAgLy8gLS0tLS0tLS1cblxuICAgICAgICAvLyBDcmVhdGVzIGEgbmV3IGZ1bmN0aW9uIHRoYXQgcnVucyBlYWNoIG9mIHRoZSBmdW5jdGlvbnMgc3VwcGxpZWQgYXMgcGFyYW1ldGVycyBpbiB0dXJuLCBwYXNzaW5nIHRoZSBvdXRwdXRcbiAgICAgICAgLy8gb2YgZWFjaCBvbmUgdG8gdGhlIG5leHQgb25lLCBzdGFydGluZyB3aXRoIHdoYXRldmVyIGFyZ3VtZW50cyB3ZXJlIHBhc3NlZCB0byB0aGUgaW5pdGlhbCBpbnZvY2F0aW9uLlxuICAgICAgICAvLyBOb3RlIHRoYXQgaWYgYHZhciBoID0gY29tcG9zZShmLCBnKWAsIGBoKHgpYCBjYWxscyBgZyh4KWAgZmlyc3QsIHBhc3NpbmcgdGhlIHJlc3VsdCBvZiB0aGF0IHRvIGBmKClgLlxuICAgICAgICB2YXIgY29tcG9zZSA9IFIuY29tcG9zZSA9IGZ1bmN0aW9uKCkgeyAgLy8gVE9ETzogdHlwZSBjaGVjayBvZiBhcmd1bWVudHM/XG4gICAgICAgICAgICB2YXIgZm5zID0gc2xpY2UoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9sZHIoZnVuY3Rpb24oYXJncywgZm4pIHsgcmV0dXJuIFtmbi5hcHBseSh0aGlzLCBhcmdzKV07IH0sIHNsaWNlKGFyZ3VtZW50cyksIGZucylbMF07XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNpbWlsYXIgdG8gYGNvbXBvc2VgLCBidXQgcHJvY2Vzc2VzIHRoZSBmdW5jdGlvbnMgaW4gdGhlIHJldmVyc2Ugb3JkZXIgc28gdGhhdCBpZiBpZiBgdmFyIGggPSBwaXBlKGYsIGcpYCxcbiAgICAgICAgLy8gYGgoeClgIGNhbGxzIGBmKHgpYCBmaXJzdCwgcGFzc2luZyB0aGUgcmVzdWx0IG9mIHRoYXQgdG8gYGcoKWAuXG4gICAgICAgIFIucGlwZSA9IGZ1bmN0aW9uKCkgeyAvLyBUT0RPOiB0eXBlIGNoZWNrIG9mIGFyZ3VtZW50cz9cbiAgICAgICAgICAgIHJldHVybiBjb21wb3NlLmFwcGx5KHRoaXMsIHNsaWNlKGFyZ3VtZW50cykucmV2ZXJzZSgpKTtcbiAgICAgICAgfTtcbiAgICAgICAgYWxpYXNGb3IoXCJwaXBlXCIpLmlzKFwic2VxdWVuY2VcIik7XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBmdW5jdGlvbiBtdWNoIGxpa2UgdGhlIHN1cHBsaWVkIG9uZSBleGNlcHQgdGhhdCB0aGUgZmlyc3QgdHdvIGFyZ3VtZW50cyBhcmUgaW52ZXJ0ZWQuXG4gICAgICAgIHZhciBmbGlwID0gUi5mbGlwID0gZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgICAgIHJldHVybiBfKGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgW2IsIGFdLmNvbmNhdChzbGljZShhcmd1bWVudHMsIDIpKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuLy8gICAgICAgIC8vIFJldHVybnMgYSBuZXcgZnVuY3Rpb24gbXVjaCBsaWtlIHRoZSBzdXBwbGllZCBvbmUgZXhjZXB0IHRoYXQgdGhlIGZpcnN0IGFyZ3VtZW50IGlzIGN5Y2xlZCB0byB0aGUgZW5kLlxuLy8gICAgICAgIFIuY3ljbGUgPSBmdW5jdGlvbihmbikge1xuLy8gICAgICAgICAgICByZXR1cm4gbkFyeShmbi5sZW5ndGgsIGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIHNsaWNlKGFyZ3VtZW50cywgMSwgZm4ubGVuZ3RoKS5jb25jYXQoYXJndW1lbnRzWzBdKSk7XG4vLyAgICAgICAgICAgIH0pO1xuLy8gICAgICAgIH07XG5cbiAgICAgICAgLy8gQ3JlYXRlcyBhIG5ldyBmdW5jdGlvbiB0aGF0IGFjdHMgbGlrZSB0aGUgc3VwcGxpZWQgZnVuY3Rpb24gZXhjZXB0IHRoYXQgdGhlIGxlZnQtbW9zdCBwYXJhbWV0ZXJzIGFyZVxuICAgICAgICAvLyBwcmUtZmlsbGVkLlxuICAgICAgICBSLmxQYXJ0aWFsID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICByZXR1cm4gYXJpdHkoTWF0aC5tYXgoZm4ubGVuZ3RoIC0gYXJncy5sZW5ndGgsIDApLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJncy5jb25jYXQoc2xpY2UoYXJndW1lbnRzKSkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIGFsaWFzRm9yKFwibFBhcnRpYWxcIikuaXMoXCJhcHBseUxlZnRcIik7XG5cbiAgICAgICAgLy8gQ3JlYXRlcyBhIG5ldyBmdW5jdGlvbiB0aGF0IGFjdHMgbGlrZSB0aGUgc3VwcGxpZWQgZnVuY3Rpb24gZXhjZXB0IHRoYXQgdGhlIHJpZ2h0LW1vc3QgcGFyYW1ldGVycyBhcmVcbiAgICAgICAgLy8gcHJlLWZpbGxlZC5cbiAgICAgICAgUi5yUGFydGlhbCA9ZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICByZXR1cm4gYXJpdHkoTWF0aC5tYXgoZm4ubGVuZ3RoIC0gYXJncy5sZW5ndGgsIDApLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgc2xpY2UoYXJndW1lbnRzKS5jb25jYXQoYXJncykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIGFsaWFzRm9yKFwiclBhcnRpYWxcIikuaXMoXCJhcHBseVJpZ2h0XCIpO1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgZnVuY3Rpb24gdGhhdCBzdG9yZXMgdGhlIHJlc3VsdHMgb2YgcnVubmluZyB0aGUgc3VwcGxpZWQgZnVuY3Rpb24gYW5kIHJldHVybnMgdGhvc2VcbiAgICAgICAgLy8gc3RvcmVkIHZhbHVlIHdoZW4gdGhlIHNhbWUgcmVxdWVzdCBpcyBtYWRlLiAgKipOb3RlKio6IHRoaXMgcmVhbGx5IG9ubHkgaGFuZGxlcyBzdHJpbmcgYW5kIG51bWJlciBwYXJhbWV0ZXJzLlxuICAgICAgICBSLm1lbW9pemUgPSBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgdmFyIGNhY2hlID0ge307XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvc2l0aW9uID0gZm9sZGwoZnVuY3Rpb24oY2FjaGUsIGFyZykge3JldHVybiBjYWNoZVthcmddIHx8IChjYWNoZVthcmddID0ge30pO30sIGNhY2hlLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2xpY2UoYXJndW1lbnRzLCAwLCBhcmd1bWVudHMubGVuZ3RoIC0gMSkpO1xuICAgICAgICAgICAgICAgIHZhciBhcmcgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIHJldHVybiAocG9zaXRpb25bYXJnXSB8fCAocG9zaXRpb25bYXJnXSA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gV3JhcHMgYSBmdW5jdGlvbiB1cCBpbiBvbmUgdGhhdCB3aWxsIG9ubHkgY2FsbCB0aGUgaW50ZXJuYWwgb25lIG9uY2UsIG5vIG1hdHRlciBob3cgbWFueSB0aW1lcyB0aGUgb3V0ZXIgb25lXG4gICAgICAgIC8vIGlzIGNhbGxlZC4gICoqIE5vdGUqKjogdGhpcyBpcyBub3QgcmVhbGx5IHB1cmU7IGl0J3MgbW9zdGx5IG1lYW50IHRvIGtlZXAgc2lkZS1lZmZlY3RzIGZyb20gcmVwZWF0aW5nLlxuICAgICAgICBSLm9uY2UgPSBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgdmFyIGNhbGxlZCA9IGZhbHNlLCByZXN1bHQ7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxlZCkge3JldHVybiByZXN1bHQ7fVxuICAgICAgICAgICAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBXcmFwIGEgZnVuY3Rpb24gaW5zaWRlIGFub3RoZXIgdG8gYWxsb3cgeW91IHRvIG1ha2UgYWRqdXN0bWVudHMgdG8gdGhlIHBhcmFtZXRlcnMgb3IgZG8gb3RoZXIgcHJvY2Vzc2luZ1xuICAgICAgICAvLyBlaXRoZXIgYmVmb3JlIHRoZSBpbnRlcm5hbCBmdW5jdGlvbiBpcyBjYWxsZWQgb3Igd2l0aCBpdHMgcmVzdWx0cy5cbiAgICAgICAgUi53cmFwID0gZnVuY3Rpb24oZm4sIHdyYXBwZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd3JhcHBlci5hcHBseSh0aGlzLCBbZm5dLmNvbmNhdChzbGljZShhcmd1bWVudHMpKSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFdyYXBzIGEgY29uc3RydWN0b3IgZnVuY3Rpb24gaW5zaWRlIGEgKGN1cnJpZWQpIHBsYWluIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGNhbGxlZCB3aXRoIHRoZSBzYW1lIGFyZ3VtZW50c1xuICAgICAgICAvLyBhbmQgcmV0dXJucyB0aGUgc2FtZSB0eXBlLiAgQWxsb3dzLCBmb3IgaW5zdGFuY2UsXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgV2lkZ2V0ID0gZnVuY3Rpb24oY29uZmlnKSB7IC8qIC4uLiAqLyB9OyAvLyBDb25zdHJ1Y3RvclxuICAgICAgICAvLyAgICAgV2lkZ2V0LnByb3RvdHlwZSA9IHsgLyogLi4uICovIH1cbiAgICAgICAgLy8gICAgIG1hcChjb25zdHJ1Y3QoV2lkZ2V0KSwgYWxsQ29uZmlncyk7IC8vPT4gbGlzdCBvZiBXaWRnZXRzXG4gICAgICAgIFIuY29uc3RydWN0ID0gZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgICAgIHZhciBmID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9iaiA9IG5ldyBmbigpO1xuICAgICAgICAgICAgICAgIGZuLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBmbi5sZW5ndGggPiAxID8gXyhuQXJ5KGZuLmxlbmd0aCwgZikpIDogZjtcbiAgICAgICAgfTtcblxuXG5cbiAgICAgICAgLy8gTGlzdCBGdW5jdGlvbnNcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGhlc2UgZnVuY3Rpb25zIG9wZXJhdGUgb24gbG9naWNhbCBsaXN0cywgaGVyZSBwbGFpbiBhcnJheXMuICBBbG1vc3QgYWxsIG9mIHRoZXNlIGFyZSBjdXJyaWVkLCBhbmQgdGhlIGxpc3RcbiAgICAgICAgLy8gcGFyYW1ldGVyIGNvbWVzIGxhc3QsIHNvIHlvdSBjYW4gY3JlYXRlIGEgbmV3IGZ1bmN0aW9uIGJ5IHN1cHBseWluZyB0aGUgcHJlY2VkaW5nIGFyZ3VtZW50cywgbGVhdmluZyB0aGVcbiAgICAgICAgLy8gbGlzdCBwYXJhbWV0ZXIgb2ZmLiAgRm9yIGluc3RhbmNlOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgLy8gc2tpcCB0aGlyZCBwYXJhbWV0ZXJcbiAgICAgICAgLy8gICAgIHZhciBjaGVja0FsbFByZWRpY2F0ZXMgPSByZWR1Y2UoYW5kRm4sIGFsd2F5c1RydWUpO1xuICAgICAgICAvLyAgICAgLy8gLi4uIGdpdmVuIHN1aXRhYmxlIGRlZmluaXRpb25zIG9mIG9kZCwgbHQyMCwgZ3Q1XG4gICAgICAgIC8vICAgICB2YXIgdGVzdCA9IGNoZWNrQWxsUHJlZGljYXRlcyhbb2RkLCBsdDIwLCBndDVdKTtcbiAgICAgICAgLy8gICAgIC8vIHRlc3QoNykgPT4gdHJ1ZSwgdGVzdCg5KSA9PiB0cnVlLCB0ZXN0KDEwKSA9PiBmYWxzZSxcbiAgICAgICAgLy8gICAgIC8vIHRlc3QoMykgPT4gZmFsc2UsIHRlc3QoMjEpID0+IGZhbHNlLFxuXG4gICAgICAgIC8vIC0tLS0tLS0tXG5cbiAgICAgICAgLy8gUmV0dXJucyBhIHNpbmdsZSBpdGVtLCBieSBzdWNjZXNzaXZlbHkgY2FsbGluZyB0aGUgZnVuY3Rpb24gd2l0aCB0aGUgY3VycmVudCBlbGVtZW50IGFuZCB0aGUgdGhlIG5leHRcbiAgICAgICAgLy8gZWxlbWVudCBvZiB0aGUgbGlzdCwgcGFzc2luZyB0aGUgcmVzdWx0IHRvIHRoZSBuZXh0IGNhbGwuICBXZSBzdGFydCB3aXRoIHRoZSBgYWNjYCBwYXJhbWV0ZXIgdG8gZ2V0XG4gICAgICAgIC8vIHRoaW5ncyBnb2luZy4gIFRoZSBmdW5jdGlvbiBzdXBwbGllZCBzaG91bGQgYWNjZXB0IHRoaXMgcnVubmluZyB2YWx1ZSBhbmQgdGhlIGxhdGVzdCBlbGVtZW50IG9mIHRoZSBsaXN0LFxuICAgICAgICAvLyBhbmQgcmV0dXJuIGFuIHVwZGF0ZWQgdmFsdWUuXG4gICAgICAgIHZhciBmb2xkbCA9IFIuZm9sZGwgPSBfKGZ1bmN0aW9uKGZuLCBhY2MsIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpZHggPSAtMSwgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSgrK2lkeCA8IGxlbikge1xuICAgICAgICAgICAgICAgIGFjYyA9IGZuKGFjYywgbGlzdFtpZHhdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0pO1xuICAgICAgICBhbGlhc0ZvcihcImZvbGRsXCIpLmlzKFwicmVkdWNlXCIpO1xuXG4gICAgICAgIC8vIE11Y2ggbGlrZSBgZm9sZGxgL2ByZWR1Y2VgLCBleGNlcHQgdGhhdCB0aGlzIHRha2VzIGFzIGl0cyBzdGFydGluZyB2YWx1ZSB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGUgbGlzdC5cbiAgICAgICAgUi5mb2xkbDEgPSBfKGZ1bmN0aW9uIChmbiwgbGlzdCkge1xuICAgICAgICAgICAgaWYgKGlzRW1wdHkobGlzdCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmb2xkbDEgZG9lcyBub3Qgd29yayBvbiBlbXB0eSBsaXN0c1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmb2xkbChmbiwgaGVhZChsaXN0KSwgdGFpbChsaXN0KSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNpbWlsYXIgdG8gYGZvbGRsYC9gcmVkdWNlYCBleGNlcHQgdGhhdCBpdCBtb3ZlcyBmcm9tIHJpZ2h0IHRvIGxlZnQgb24gdGhlIGxpc3QuXG4gICAgICAgIHZhciBmb2xkciA9IFIuZm9sZHIgPV8oZnVuY3Rpb24oZm4sIGFjYywgbGlzdCkge1xuICAgICAgICAgICAgdmFyIGlkeCA9IGxpc3QubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUoaWR4LS0pIHtcbiAgICAgICAgICAgICAgICBhY2MgPSBmbihhY2MsIGxpc3RbaWR4XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYWNjO1xuXG4gICAgICAgIH0pO1xuICAgICAgICBhbGlhc0ZvcihcImZvbGRyXCIpLmlzKFwicmVkdWNlUmlnaHRcIik7XG5cblxuICAgICAgICAvLyBNdWNoIGxpa2UgYGZvbGRyYC9gcmVkdWNlUmlnaHRgLCBleGNlcHQgdGhhdCB0aGlzIHRha2VzIGFzIGl0cyBzdGFydGluZyB2YWx1ZSB0aGUgbGFzdCBlbGVtZW50IGluIHRoZSBsaXN0LlxuICAgICAgICBSLmZvbGRyMSA9IF8oZnVuY3Rpb24gKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICBpZiAoaXNFbXB0eShsaXN0KSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImZvbGRyMSBkb2VzIG5vdCB3b3JrIG9uIGVtcHR5IGxpc3RzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG5ld0xpc3QgPSBjbG9uZShsaXN0KSwgYWNjID0gbmV3TGlzdC5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiBmb2xkcihmbiwgYWNjLCBuZXdMaXN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQnVpbGRzIGEgbGlzdCBmcm9tIGEgc2VlZCB2YWx1ZSwgdXNpbmcgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgZmFsc3kgdG8gcXVpdCBhbmQgYSBwYWlyIG90aGVyd2lzZSxcbiAgICAgICAgLy8gY29uc2lzdGluZyBvZiB0aGUgY3VycmVudCB2YWx1ZSBhbmQgdGhlIHNlZWQgdG8gYmUgdXNlZCBmb3IgdGhlIG5leHQgdmFsdWUuXG5cbiAgICAgICAgUi51bmZvbGRyID0gXyhmdW5jdGlvbihmbiwgc2VlZCkge1xuICAgICAgICAgICAgdmFyIHBhaXIgPSBmbihzZWVkKSwgcmVzdWx0ID0gW107XG4gICAgICAgICAgICB3aGlsZSAocGFpciAmJiBwYWlyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHBhaXJbMF0pO1xuICAgICAgICAgICAgICAgIHBhaXIgPSBmbihwYWlyWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IGNvbnN0cnVjdGVkIGJ5IGFwcGx5aW5nIHRoZSBmdW5jdGlvbiB0byBldmVyeSBlbGVtZW50IG9mIHRoZSBsaXN0IHN1cHBsaWVkLlxuICAgICAgICB2YXIgbWFwID0gUi5tYXAgPSBfKGZ1bmN0aW9uKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICBpZiAobGlzdCAmJiBsaXN0Lmxlbmd0aCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlzdC5tYXAoZm4sIGxpc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlkeCA9IC0xLCBsZW4gPSBsaXN0Lmxlbmd0aCwgcmVzdWx0ID0gbmV3IEFycmF5KGxlbik7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICByZXN1bHRbaWR4XSA9IGZuKGxpc3RbaWR4XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXBvcnRzIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgaW4gdGhlIGxpc3RcbiAgICAgICAgUi5zaXplID0gZnVuY3Rpb24oYXJyKSB7cmV0dXJuIGFyci5sZW5ndGg7fTtcblxuICAgICAgICAvLyAoSW50ZXJuYWwgdXNlIG9ubHkpIFRoZSBiYXNpYyBpbXBsZW1lbnRhdGlvbiBvZiBmaWx0ZXIuXG4gICAgICAgIHZhciBpbnRlcm5hbEZpbHRlciA9IF8oZnVuY3Rpb24odXNlSWR4LCBmbiwgbGlzdCkge1xuICAgICAgICAgICAgaWYgKGxpc3QgJiYgbGlzdC5sZW5ndGggPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpc3QuZmlsdGVyKGZuKTsgLy8gVE9ETzogZmlndXJlIG91dCB1c2VJZHhcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpZHggPSAtMSwgbGVuID0gbGlzdC5sZW5ndGgsIHJlc3VsdCA9IFtdO1xuICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF1c2VJZHggJiYgZm4obGlzdFtpZHhdKSB8fCBmbihsaXN0W2lkeF0sIGlkeCwgbGlzdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gobGlzdFtpZHhdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGxpc3QgY29udGFpbmluZyBvbmx5IHRob3NlIGl0ZW1zIHRoYXQgbWF0Y2ggYSBnaXZlbiBwcmVkaWNhdGUgZnVuY3Rpb24uXG4gICAgICAgIHZhciBmaWx0ZXIgPSBSLmZpbHRlciA9IGludGVybmFsRmlsdGVyKGZhbHNlKTtcblxuICAgICAgICAvLyBMaWtlIGBmaWx0ZXJgLCBidXQgcGFzc2VzIGFkZGl0aW9uYWwgcGFyYW1ldGVycyB0byB0aGUgcHJlZGljYXRlIGZ1bmN0aW9uLiAgUGFyYW1ldGVycyBhcmVcbiAgICAgICAgLy8gYGxpc3QgaXRlbWAsIGBpbmRleCBvZiBpdGVtIGluIGxpc3RgLCBgZW50aXJlIGxpc3RgLlxuICAgICAgICAvL1xuICAgICAgICAvLyBFeGFtcGxlOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIGxhc3RUd28gPSBmdW5jdGlvbih2YWwsIGlkeCwgbGlzdCkge1xuICAgICAgICAvLyAgICAgICAgIHJldHVybiBsaXN0Lmxlbmd0aCAtIGlkeCA8PSAyO1xuICAgICAgICAvLyAgICAgfTtcbiAgICAgICAgLy8gICAgIGZpbHRlci5pZHgobGFzdFR3bywgWzgsIDYsIDcsIDUsIDMsIDAgLDldKTsgLy89PiBbMCwgOV1cbiAgICAgICAgZmlsdGVyLmlkeCA9IGludGVybmFsRmlsdGVyKHRydWUpO1xuXG4gICAgICAgIC8vIFNpbWlsYXIgdG8gYGZpbHRlcmAsIGV4Y2VwdCB0aGF0IGl0IGtlZXBzIG9ubHkgdGhvc2UgdGhhdCAqKmRvbid0KiogbWF0Y2ggdGhlIGdpdmVuIHByZWRpY2F0ZSBmdW5jdGlvbnMuXG4gICAgICAgIHZhciByZWplY3QgPSBSLnJlamVjdCA9IF8oZnVuY3Rpb24oZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXIobm90Rm4oZm4pLCBsaXN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTGlrZSBgcmVqZWN0YCwgYnV0IHBhc3NlcyBhZGRpdGlvbmFsIHBhcmFtZXRlcnMgdG8gdGhlIHByZWRpY2F0ZSBmdW5jdGlvbi4gIFBhcmFtZXRlcnMgYXJlXG4gICAgICAgIC8vIGBsaXN0IGl0ZW1gLCBgaW5kZXggb2YgaXRlbSBpbiBsaXN0YCwgYGVudGlyZSBsaXN0YC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gRXhhbXBsZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBsYXN0VHdvID0gZnVuY3Rpb24odmFsLCBpZHgsIGxpc3QpIHtcbiAgICAgICAgLy8gICAgICAgICByZXR1cm4gbGlzdC5sZW5ndGggLSBpZHggPD0gMjtcbiAgICAgICAgLy8gICAgIH07XG4gICAgICAgIC8vICAgICByZWplY3QuaWR4KGxhc3RUd28sIFs4LCA2LCA3LCA1LCAzLCAwICw5XSk7XG4gICAgICAgIC8vICAgICAvLz0+IFs4LCA2LCA3LCA1LCAzXVxuICAgICAgICByZWplY3QuaWR4ID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlci5pZHgobm90Rm4oZm4pLCBsaXN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IGNvbnRhaW5pbmcgdGhlIGVsZW1lbnRzIG9mIHRoZSBnaXZlbiBsaXN0IHVwIHVudGlsIHRoZSBmaXJzdCBvbmUgd2hlcmUgdGhlIGZ1bmN0aW9uXG4gICAgICAgIC8vIHN1cHBsaWVkIHJldHVybnMgYGZhbHNlYCB3aGVuIHBhc3NlZCB0aGUgZWxlbWVudC5cbiAgICAgICAgUi50YWtlV2hpbGUgPSBfKGZ1bmN0aW9uKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICB2YXIgaWR4ID0gLTEsIGxlbiA9IGxpc3QubGVuZ3RoLCB0YWtpbmcgPSB0cnVlLCByZXN1bHQgPSBbXTtcbiAgICAgICAgICAgIHdoaWxlICh0YWtpbmcpIHtcbiAgICAgICAgICAgICAgICArK2lkeDtcbiAgICAgICAgICAgICAgICBpZiAoaWR4IDwgbGVuICYmIGZuKGxpc3RbaWR4XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gobGlzdFtpZHhdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YWtpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGxpc3QgY29udGFpbmluZyB0aGUgZmlyc3QgYG5gIGVsZW1lbnRzIG9mIHRoZSBnaXZlbiBsaXN0LlxuICAgICAgICBSLnRha2UgPSBfKGZ1bmN0aW9uKG4sIGxpc3QpIHtcbiAgICAgICAgICAgIGlmIChsaXN0ICYmIGxpc3QubGVuZ3RoID09PSBJbmZpbml0eSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaXN0LnRha2Uobik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbHMgPSBjbG9uZShsaXN0KTtcbiAgICAgICAgICAgIGxzLmxlbmd0aCA9IG47XG4gICAgICAgICAgICByZXR1cm4gbHM7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCBjb250YWluaW5nIHRoZSBlbGVtZW50cyBvZiB0aGUgZ2l2ZW4gbGlzdCBzdGFydGluZyB3aXRoIHRoZSBmaXJzdCBvbmUgd2hlcmUgdGhlIGZ1bmN0aW9uXG4gICAgICAgIC8vIHN1cHBsaWVkIHJldHVybnMgYGZhbHNlYCB3aGVuIHBhc3NlZCB0aGUgZWxlbWVudC5cbiAgICAgICAgUi5za2lwVW50aWwgPSBfKGZ1bmN0aW9uKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICB2YXIgaWR4ID0gLTEsIGxlbiA9IGxpc3QubGVuZ3RoLCB0YWtpbmcgPSBmYWxzZSwgcmVzdWx0ID0gW107XG4gICAgICAgICAgICB3aGlsZSAoIXRha2luZykge1xuICAgICAgICAgICAgICAgICsraWR4O1xuICAgICAgICAgICAgICAgIGlmIChpZHggPj0gbGVuIHx8IGZuKGxpc3RbaWR4XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFraW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoaWR4IDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gobGlzdFtpZHgrK10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IGNvbnRhaW5pbmcgYWxsICoqYnV0KiogdGhlIGZpcnN0IGBuYCBlbGVtZW50cyBvZiB0aGUgZ2l2ZW4gbGlzdC5cbiAgICAgICAgUi5za2lwID0gXyhmdW5jdGlvbihuLCBsaXN0KSB7XG4gICAgICAgICAgICBpZiAobGlzdCAmJiBsaXN0Lmxlbmd0aCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlzdC5za2lwKG4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNsaWNlKGxpc3QsIG4pO1xuICAgICAgICB9KTtcbiAgICAgICAgYWxpYXNGb3IoJ3NraXAnKS5pcygnZHJvcCcpO1xuXG4gICAgICAgIC8vIFJldHVybnMgdGhlIGZpcnN0IGVsZW1lbnQgb2YgdGhlIGxpc3Qgd2hpY2ggbWF0Y2hlcyB0aGUgcHJlZGljYXRlLCBvciBgZmFsc2VgIGlmIG5vIGVsZW1lbnQgbWF0Y2hlcy5cbiAgICAgICAgUi5maW5kID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgdmFyIGlkeCA9IC0xLCBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IGxlbikge1xuICAgICAgICAgICAgICAgIGlmIChmbihsaXN0W2lkeF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaXN0W2lkeF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRoZSBpbmRleCBvZiBmaXJzdCBlbGVtZW50IG9mIHRoZSBsaXN0IHdoaWNoIG1hdGNoZXMgdGhlIHByZWRpY2F0ZSwgb3IgYGZhbHNlYCBpZiBubyBlbGVtZW50IG1hdGNoZXMuXG4gICAgICAgIFIuZmluZEluZGV4ID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgdmFyIGlkeCA9IC0xLCBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IGxlbikge1xuICAgICAgICAgICAgICAgIGlmIChmbihsaXN0W2lkeF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpZHg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRoZSBsYXN0IGVsZW1lbnQgb2YgdGhlIGxpc3Qgd2hpY2ggbWF0Y2hlcyB0aGUgcHJlZGljYXRlLCBvciBgZmFsc2VgIGlmIG5vIGVsZW1lbnQgbWF0Y2hlcy5cbiAgICAgICAgUi5maW5kTGFzdCA9IF8oZnVuY3Rpb24oZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpZHggPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgtLWlkeCkge1xuICAgICAgICAgICAgICAgIGlmIChmbihsaXN0W2lkeF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaXN0W2lkeF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRoZSBpbmRleCBvZiBsYXN0IGVsZW1lbnQgb2YgdGhlIGxpc3Qgd2hpY2ggbWF0Y2hlcyB0aGUgcHJlZGljYXRlLCBvciBgZmFsc2VgIGlmIG5vIGVsZW1lbnQgbWF0Y2hlcy5cbiAgICAgICAgUi5maW5kTGFzdEluZGV4ID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgdmFyIGlkeCA9IGxpc3QubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKC0taWR4KSB7XG4gICAgICAgICAgICAgICAgaWYgKGZuKGxpc3RbaWR4XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGlkeDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYHRydWVgIGlmIGFsbCBlbGVtZW50cyBvZiB0aGUgbGlzdCBtYXRjaCB0aGUgcHJlZGljYXRlLCBgZmFsc2VgIGlmIHRoZXJlIGFyZSBhbnkgdGhhdCBkb24ndC5cbiAgICAgICAgdmFyIGFsbCA9IFIuYWxsID0gXyhmdW5jdGlvbiAoZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgICAgICB3aGlsZSAoKytpIDwgbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWZuKGxpc3RbaV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGFsaWFzRm9yKFwiYWxsXCIpLmlzKFwiZXZlcnlcIik7XG5cblxuICAgICAgICAvLyBSZXR1cm5zIGB0cnVlYCBpZiBhbnkgZWxlbWVudHMgb2YgdGhlIGxpc3QgbWF0Y2ggdGhlIHByZWRpY2F0ZSwgYGZhbHNlYCBpZiBub25lIGRvLlxuICAgICAgICB2YXIgYW55ID0gUi5hbnkgPSBfKGZ1bmN0aW9uKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICAgICAgd2hpbGUgKCsraSA8IGxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZuKGxpc3RbaV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGFsaWFzRm9yKFwiYW55XCIpLmlzKFwic29tZVwiKTtcblxuICAgICAgICAvLyBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgbGlzdCBjb250YWlucyB0aGUgc291Z2h0IGVsZW1lbnQsIGBmYWxzZWAgaWYgaXQgZG9lcyBub3QuICBFcXVhbGl0eSBpcyBzdHJpY3QgaGVyZSxcbiAgICAgICAgLy8gbWVhbmluZyByZWZlcmVuY2UgZXF1YWxpdHkgZm9yIG9iamVjdHMgYW5kIG5vbi1jb2VyY2luZyBlcXVhbGl0eSBmb3IgcHJpbWl0aXZlcy5cbiAgICAgICAgdmFyIGNvbnRhaW5zID0gUi5jb250YWlucyA9IF8oZnVuY3Rpb24oYSwgbGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuIGxpc3QuaW5kZXhPZihhKSA+IC0xO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgbGlzdCBjb250YWlucyB0aGUgc291Z2h0IGVsZW1lbnQsIGBmYWxzZWAgaWYgaXQgZG9lcyBub3QsIGJhc2VkIHVwb24gdGhlIHZhbHVlXG4gICAgICAgIC8vIHJldHVybmVkIGJ5IGFwcGx5aW5nIHRoZSBzdXBwbGllZCBwcmVkaWNhdGVkIHRvIHR3byBsaXN0IGVsZW1lbnRzLiAgRXF1YWxpdHkgaXMgc3RyaWN0IGhlcmUsIG1lYW5pbmdcbiAgICAgICAgLy8gcmVmZXJlbmNlIGVxdWFsaXR5IGZvciBvYmplY3RzIGFuZCBub24tY29lcmNpbmcgZXF1YWxpdHkgZm9yIHByaW1pdGl2ZXMuICBQcm9iYWJseSBpbmVmZmljaWVudC5cbiAgICAgICAgdmFyIGNvbnRhaW5zV2l0aCA9IF8oZnVuY3Rpb24ocHJlZCwgeCwgbGlzdCkge1xuICAgICAgICAgICAgdmFyIGlkeCA9IC0xLCBsZW4gPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IGxlbikge1xuICAgICAgICAgICAgICAgIGlmIChwcmVkKHgsIGxpc3RbaWR4XSkpIHtyZXR1cm4gdHJ1ZTt9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCBjb250YWluaW5nIG9ubHkgb25lIGNvcHkgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBvcmlnaW5hbCBsaXN0LiAgRXF1YWxpdHkgaXMgc3RyaWN0IGhlcmUsXG4gICAgICAgIC8vIG1lYW5pbmcgcmVmZXJlbmNlIGVxdWFsaXR5IGZvciBvYmplY3RzIGFuZCBub24tY29lcmNpbmcgZXF1YWxpdHkgZm9yIHByaW1pdGl2ZXMuXG4gICAgICAgIHZhciB1bmlxID0gUi51bmlxID0gZnVuY3Rpb24obGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvbGRyKGZ1bmN0aW9uKGFjYywgeCkgeyByZXR1cm4gKGNvbnRhaW5zKHgsIGFjYykpID8gYWNjIDogcHJlcGVuZCh4LCBhY2MpOyB9LCBFTVBUWSwgbGlzdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IGNvbnRhaW5pbmcgb25seSBvbmUgY29weSBvZiBlYWNoIGVsZW1lbnQgaW4gdGhlIG9yaWdpbmFsIGxpc3QsIGJhc2VkIHVwb24gdGhlIHZhbHVlXG4gICAgICAgIC8vIHJldHVybmVkIGJ5IGFwcGx5aW5nIHRoZSBzdXBwbGllZCBwcmVkaWNhdGUgdG8gdHdvIGxpc3QgZWxlbWVudHMuICAgRXF1YWxpdHkgaXMgc3RyaWN0IGhlcmUsICBtZWFuaW5nXG4gICAgICAgIC8vIHJlZmVyZW5jZSBlcXVhbGl0eSBmb3Igb2JqZWN0cyBhbmQgbm9uLWNvZXJjaW5nIGVxdWFsaXR5IGZvciBwcmltaXRpdmVzLlxuICAgICAgICB2YXIgdW5pcVdpdGggPSBfKGZ1bmN0aW9uKHByZWQsIGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBmb2xkcihmdW5jdGlvbihhY2MsIHgpIHtyZXR1cm4gKGNvbnRhaW5zV2l0aChwcmVkLCB4LCBhY2MpKSA/IGFjYyA6IHByZXBlbmQoeCwgYWNjKTsgfSwgRU1QVFksIGxpc3QpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCBieSBwbHVja2luZyB0aGUgc2FtZSBuYW1lZCBwcm9wZXJ0eSBvZmYgYWxsIG9iamVjdHMgaW4gdGhlIGxpc3Qgc3VwcGxpZWQuXG4gICAgICAgIHZhciBwbHVjayA9IFIucGx1Y2sgPSBfKGZ1bmN0aW9uKHAsIGxpc3QpIHtyZXR1cm4gbWFwKHByb3AocCksIGxpc3QpO30pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBsaXN0IHRoYXQgY29udGFpbnMgYSBmbGF0dGVuZWQgdmVyc2lvbiBvZiB0aGUgc3VwcGxpZWQgbGlzdC4gIEZvciBleGFtcGxlOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgZmxhdHRlbihbMSwgMiwgWzMsIDRdLCA1LCBbNiwgWzcsIDgsIFs5LCBbMTAsIDExXSwgMTJdXV1dKTtcbiAgICAgICAgLy8gICAgIC8vID0+IFsxLCAyLCAzLCA0LCA1LCA2LCA3LCA4LCA5LCAxMCwgMTEsIDEyXTtcbiAgICAgICAgdmFyIGZsYXR0ZW4gPSBSLmZsYXR0ZW4gPSBmdW5jdGlvbihsaXN0KSB7XG4gICAgICAgICAgICB2YXIgaWR4ID0gLTEsIGxlbiA9IGxpc3QgPyBsaXN0Lmxlbmd0aCA6IDAsIHJlc3VsdCA9IFtdLCBwdXNoID0gcmVzdWx0LnB1c2gsIHZhbDtcbiAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IGxlbikge1xuICAgICAgICAgICAgICAgIHZhbCA9IGxpc3RbaWR4XTtcbiAgICAgICAgICAgICAgICBwdXNoLmFwcGx5KHJlc3VsdCwgaXNBcnJheSh2YWwpID8gZmxhdHRlbih2YWwpIDogW3ZhbF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfTtcblxuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgbGlzdCBvdXQgb2YgdGhlIHR3byBzdXBwbGllZCBieSBhcHBseWluZyB0aGUgZnVuY3Rpb24gdG8gZWFjaCBlcXVhbGx5LXBvc2l0aW9uZWQgcGFpciBpbiB0aGVcbiAgICAgICAgLy8gbGlzdHMuICBGb3IgZXhhbXBsZSxcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHppcFdpdGgoZiwgWzEsIDIsIDNdLCBbJ2EnLCAnYicsICdjJ10pXG4gICAgICAgIC8vICAgICAvLyAgICA9PiBbZigxLCAnYScpLCBmKDIsICdiJyksIGYoMywgJ2MnKV07XG4gICAgICAgIC8vXG4gICAgICAgIC8vIE5vdGUgdGhhdCB0aGUgb3V0cHV0IGxpc3Qgd2lsbCBvbmx5IGJlIGFzIGxvbmcgYXMgdGhlIGxlbmd0aCBvcyB0aGUgZmlyc3QgbGlzdCBwYXNzZWQgaW4uXG4gICAgICAgIFIuemlwV2l0aCA9IF8oZnVuY3Rpb24oZm4sIGEsIGIpIHtcbiAgICAgICAgICAgIHZhciBydiA9IFtdLCBpID0gLTEsIGxlbiA9IGEubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgcnZbaV0gPSBmbihhW2ldLCBiW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBydjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlcyBhIG5ldyBsaXN0IG91dCBvZiB0aGUgdHdvIHN1cHBsaWVkIGJ5IHlpZWxkaW5nIHRoZSBwYWlyIG9mIGVhY2ggZXF1YWxseS1wb3NpdGlvbmVkIHBhaXIgaW4gdGhlXG4gICAgICAgIC8vIGxpc3RzLiAgRm9yIGV4YW1wbGUsXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB6aXAoWzEsIDIsIDNdLCBbJ2EnLCAnYicsICdjJ10pXG4gICAgICAgIC8vICAgICAvLyAgICA9PiBbWzEsICdhJ10sIFsyLCAnYiddLCBbMywgJ2MnXV07XG4gICAgICAgIFIuemlwID0gIF8oZnVuY3Rpb24oYSwgYikgeyAvLyA9IHppcFdpdGgocHJlcGVuZCk7XG4gICAgICAgICAgICB2YXIgcnYgPSBbXSwgaSA9IC0xLCBsZW4gPSBhLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgICAgICBydltpXSA9IFthW2ldLCBiW2ldXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBydjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlcyBhIG5ldyBsaXN0IG91dCBvZiB0aGUgdHdvIHN1cHBsaWVkIGJ5IGFwcGx5aW5nIHRoZSBmdW5jdGlvbiB0byBlYWNoIHBvc3NpYmxlIHBhaXIgaW4gdGhlIGxpc3RzLlxuICAgICAgICAvLyAgRm9yIGV4YW1wbGUsXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB4UHJvZFdpdGgoZiwgWzEsIDJdLCBbJ2EnLCAnYiddKVxuICAgICAgICAvLyAgICAgLy8gICAgPT4gW2YoMSwgJ2EnKSwgZigxLCAnYicpLCBmKDIsICdhJyksIGYoMiwgJ2InKV07XG4gICAgICAgIFIueHByb2RXaXRoID0gXyhmdW5jdGlvbihmbiwgYSwgYikge1xuICAgICAgICAgICAgaWYgKGlzRW1wdHkoYSkgfHwgaXNFbXB0eShiKSkge3JldHVybiBFTVBUWTt9XG4gICAgICAgICAgICB2YXIgaSA9IC0xLCBpbGVuID0gYS5sZW5ndGgsIGosIGpsZW4gPSBiLmxlbmd0aCwgcmVzdWx0ID0gW107IC8vIGJldHRlciB0byBwdXNoIHRoZW0gYWxsIG9yIHRvIGRvIGBuZXcgQXJyYXkoaWxlbiAqIGpsZW4pYCBhbmQgY2FsY3VsYXRlIGluZGljZXM/XG4gICAgICAgICAgICB3aGlsZSAoKytpIDwgaWxlbikge1xuICAgICAgICAgICAgICAgIGogPSAtMTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoKytqIDwgamxlbikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChmbihhW2ldLCBiW2pdKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlcyBhIG5ldyBsaXN0IG91dCBvZiB0aGUgdHdvIHN1cHBsaWVkIGJ5IHlpZWxkaW5nIHRoZSBwYWlyIG9mIGVhY2ggcG9zc2libGUgcGFpciBpbiB0aGUgbGlzdHMuXG4gICAgICAgIC8vIEZvciBleGFtcGxlLFxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgeFByb2QoWzEsIDJdLCBbJ2EnLCAnYiddKVxuICAgICAgICAvLyAgICAgLy8gICAgPT4gW1sxLCAnYSddLCBbMSwgJ2InKV0sIFsyLCAnYSddLCBbMiwgJ2InXV07XG4gICAgICAgIFIueHByb2QgPSBfKGZ1bmN0aW9uKGEsIGIpIHsgLy8gPSB4cHJvZFdpdGgocHJlcGVuZCk7ICh0YWtlcyBhYm91dCAzIHRpbWVzIGFzIGxvbmcuLi4pXG4gICAgICAgICAgICBpZiAoaXNFbXB0eShhKSB8fCBpc0VtcHR5KGIpKSB7cmV0dXJuIEVNUFRZO31cbiAgICAgICAgICAgIHZhciBpID0gLTEsIGlsZW4gPSBhLmxlbmd0aCwgaiwgamxlbiA9IGIubGVuZ3RoLCByZXN1bHQgPSBbXTsgLy8gYmV0dGVyIHRvIHB1c2ggdGhlbSBhbGwgb3IgdG8gZG8gYG5ldyBBcnJheShpbGVuICogamxlbilgIGFuZCBjYWxjdWxhdGUgaW5kaWNlcz9cbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBpbGVuKSB7XG4gICAgICAgICAgICAgICAgaiA9IC0xO1xuICAgICAgICAgICAgICAgIHdoaWxlICgrK2ogPCBqbGVuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFthW2ldLCBiW2pdXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IHdpdGggdGhlIHNhbWUgZWxlbWVudHMgYXMgdGhlIG9yaWdpbmFsIGxpc3QsIGp1c3QgaW4gdGhlIHJldmVyc2Ugb3JkZXIuXG4gICAgICAgIFIucmV2ZXJzZSA9IGZ1bmN0aW9uKGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBjbG9uZShsaXN0IHx8IFtdKS5yZXZlcnNlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gLy8gUmV0dXJucyBhIGxpc3Qgb2YgbnVtYmVycyBmcm9tIGBmcm9tYCAoaW5jbHVzaXZlKSB0byBgdG9gIChleGNsdXNpdmUpLlxuICAgICAgICAvLyBGb3IgZXhhbXBsZSwgXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICByYW5nZSgxLCA1KSAvLyA9PiBbMSwgMiwgMywgNF1cbiAgICAgICAgLy8gICAgIHJhbmdlKDUwLCA1MykgLy8gPT4gWzUwLCA1MSwgNTJdXG4gICAgICAgIFIucmFuZ2UgPSBfKGZ1bmN0aW9uKGZyb20sIHRvKSB7XG4gICAgICAgICAgICBpZiAoZnJvbSA+PSB0bykge3JldHVybiBFTVBUWTt9XG4gICAgICAgICAgICB2YXIgaWR4LCByZXN1bHQgPSBuZXcgQXJyYXkodG8gLSBmcm9tKTtcbiAgICAgICAgICAgIGZvciAoaWR4ID0gMDsgZnJvbSA8IHRvOyBpZHgrKywgZnJvbSsrKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0W2lkeF0gPSBmcm9tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBSZXR1cm5zIHRoZSBmaXJzdCB6ZXJvLWluZGV4ZWQgcG9zaXRpb24gb2YgYW4gb2JqZWN0IGluIGEgZmxhdCBsaXN0XG4gICAgICAgIFIuaW5kZXhPZiA9IF8oZnVuY3Rpb24ob2JqLCBsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gbGlzdC5pbmRleE9mKG9iaik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgdGhlIGxhc3QgemVyby1pbmRleGVkIHBvc2l0aW9uIG9mIGFuIG9iamVjdCBpbiBhIGZsYXQgbGlzdFxuICAgICAgICBSLmxhc3RJbmRleE9mID0gXyhmdW5jdGlvbihvYmosIGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBsaXN0Lmxhc3RJbmRleE9mKG9iaik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgdGhlIGVsZW1lbnRzIG9mIHRoZSBsaXN0IGFzIGEgc3RyaW5nIGpvaW5lZCBieSBhIHNlcGFyYXRvci5cbiAgICAgICAgUi5qb2luID0gXyhmdW5jdGlvbihzZXAsIGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBsaXN0LmpvaW4oc2VwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gcmFtZGEuc3BsaWNlIGhhcyBhIGRpZmZlcmVudCBjb250cmFjdCB0aGFuIEFycmF5LnNwbGljZS4gQXJyYXkuc3BsaWNlIG11dGF0ZXMgaXRzIGFycmF5XG4gICAgICAgIC8vIGFuZCByZXR1cm5zIHRoZSByZW1vdmVkIGVsZW1lbnRzLiByYW1kYS5zcGxpY2UgZG9lcyBub3QgbXV0YXRlIHRoZSBwYXNzZWQgaW4gbGlzdCAod2VsbCxcbiAgICAgICAgLy8gaXQgbWFrZXMgYSBzaGFsbG93IGNvcHkpLCBhbmQgcmV0dXJucyBhIG5ldyBsaXN0IHdpdGggdGhlIHNwZWNpZmllZCBlbGVtZW50cyByZW1vdmVkLiBcbiAgICAgICAgUi5zcGxpY2UgPSBfKGZ1bmN0aW9uKHN0YXJ0LCBsZW4sIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBscyA9IHNsaWNlKGxpc3QsIDApO1xuICAgICAgICAgICAgbHMuc3BsaWNlKHN0YXJ0LCBsZW4pO1xuICAgICAgICAgICAgcmV0dXJuIGxzO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRoZSBudGggZWxlbWVudCBvZiBhIGxpc3QgKHplcm8taW5kZXhlZClcbiAgICAgICAgUi5udGggPSBfKGZ1bmN0aW9uKG4sIGxpc3QpIHtcbiAgICAgICAgICByZXR1cm4gKGxpc3Rbbl0gPT09IHVuZGVmKSA/IG51bGwgOiBsaXN0W25dO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBNYWtlcyBhIGNvbXBhcmF0b3IgZnVuY3Rpb24gb3V0IG9mIGEgZnVuY3Rpb24gdGhhdCByZXBvcnRzIHdoZXRoZXIgdGhlIGZpcnN0IGVsZW1lbnQgaXMgbGVzcyB0aGFuIHRoZSBzZWNvbmQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgY21wID0gY29tcGFyYXRvcihmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIC8vICAgICAgICAgcmV0dXJuIGEuYWdlIDwgYi5hZ2U7XG4gICAgICAgIC8vICAgICB9O1xuICAgICAgICAvLyAgICAgc29ydChjbXAsIHBlb3BsZSk7XG4gICAgICAgIHZhciBjb21wYXJhdG9yID0gUi5jb21wYXJhdG9yID0gZnVuY3Rpb24ocHJlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJlZChhLCBiKSA/IC0xIDogcHJlZChiLCBhKSA/IDEgOiAwO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgY29weSBvZiB0aGUgbGlzdCwgc29ydGVkIGFjY29yZGluZyB0byB0aGUgY29tcGFyYXRvciBmdW5jdGlvbiwgd2hpY2ggc2hvdWxkIGFjY2VwdCB0d28gdmFsdWVzIGF0IGFcbiAgICAgICAgLy8gdGltZSBhbmQgcmV0dXJuIGEgbmVnYXRpdmUgbnVtYmVyIGlmIHRoZSBmaXJzdCB2YWx1ZSBpcyBzbWFsbGVyLCBhIHBvc2l0aXZlIG51bWJlciBpZiBpdCdzIGxhcmdlciwgYW5kIHplcm9cbiAgICAgICAgLy8gaWYgdGhleSBhcmUgZXF1YWwuICBQbGVhc2Ugbm90ZSB0aGF0IHRoaXMgaXMgYSAqKmNvcHkqKiBvZiB0aGUgbGlzdC4gIEl0IGRvZXMgbm90IG1vZGlmeSB0aGUgb3JpZ2luYWwuXG4gICAgICAgIHZhciBzb3J0ID0gUi5zb3J0ID0gXyhmdW5jdGlvbihjb21wYXJhdG9yLCBsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gY2xvbmUobGlzdCkuc29ydChjb21wYXJhdG9yKTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGhlc2UgZnVuY3Rpb25zIG9wZXJhdGUgb24gcGxhaW4gSmF2YXNjcmlwdCBvYmplY3QsIGFkZGluZyBzaW1wbGUgZnVuY3Rpb25zIHRvIHRlc3QgcHJvcGVydGllcyBvbiB0aGVzZVxuICAgICAgICAvLyBvYmplY3RzLiAgTWFueSBvZiB0aGVzZSBhcmUgb2YgbW9zdCB1c2UgaW4gY29uanVuY3Rpb24gd2l0aCB0aGUgbGlzdCBmdW5jdGlvbnMsIG9wZXJhdGluZyBvbiBsaXN0cyBvZlxuICAgICAgICAvLyBvYmplY3RzLlxuXG4gICAgICAgIC8vIC0tLS0tLS0tXG5cbiAgICAgICAgLy8gUnVucyB0aGUgZ2l2ZW4gZnVuY3Rpb24gd2l0aCB0aGUgc3VwcGxpZWQgb2JqZWN0LCB0aGVuIHJldHVybnMgdGhlIG9iamVjdC5cbiAgICAgICAgUi50YXAgPSBfKGZ1bmN0aW9uKHgsIGZuKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBmbih4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICB9KTtcbiAgICAgICAgYWxpYXNGb3IoXCJ0YXBcIikuaXMoXCJLXCIpOyAvLyBUT0RPOiBhcmUgd2Ugc3VyZT8gTm90IG5lY2Vzc2FyeSwgYnV0IGNvbnZlbmllbnQsIElNSE8uXG5cbiAgICAgICAgLy8gVGVzdHMgaWYgdHdvIGl0ZW1zIGFyZSBlcXVhbC4gIEVxdWFsaXR5IGlzIHN0cmljdCBoZXJlLCBtZWFuaW5nIHJlZmVyZW5jZSBlcXVhbGl0eSBmb3Igb2JqZWN0cyBhbmRcbiAgICAgICAgLy8gbm9uLWNvZXJjaW5nIGVxdWFsaXR5IGZvciBwcmltaXRpdmVzLlxuICAgICAgICBSLmVxID0gXyhmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYSA9PT0gYjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2hlbiBzdXBwbGllZCBhbiBvYmplY3QgcmV0dXJucyB0aGUgaW5kaWNhdGVkIHByb3BlcnR5IG9mIHRoYXQgb2JqZWN0LCBpZiBpdCBleGlzdHMuXG4gICAgICAgIHZhciBwcm9wID0gUi5wcm9wID0gXyhmdW5jdGlvbihwLCBvYmopIHtyZXR1cm4gb2JqW3BdO30pO1xuICAgICAgICBhbGlhc0ZvcihcInByb3BcIikuaXMoXCJnZXRcIik7IC8vIFRPRE86IGFyZSB3ZSBzdXJlPyAgTWF0Y2hlcyBzb21lIG90aGVyIGxpYnMsIGJ1dCBtaWdodCB3YW50IHRvIHJlc2VydmUgZm9yIG90aGVyIHVzZS5cblxuICAgICAgICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aGVuIHN1cHBsaWVkIGFuIG9iamVjdCByZXR1cm5zIHRoZSByZXN1bHQgb2YgcnVubmluZyB0aGUgaW5kaWNhdGVkIGZ1bmN0aW9uIG9uXG4gICAgICAgIC8vIHRoYXQgb2JqZWN0LCBpZiBpdCBoYXMgc3VjaCBhIGZ1bmN0aW9uLlxuICAgICAgICBSLmZ1bmMgPSBfKGZ1bmN0aW9uKGZuLCBvYmopIHtyZXR1cm4gb2JqW2ZuXS5hcHBseShvYmosIHNsaWNlKGFyZ3VtZW50cywgMikpO30pO1xuXG5cbiAgICAgICAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2hlbiBzdXBwbGllZCBhIHByb3BlcnR5IG5hbWUgcmV0dXJucyB0aGF0IHByb3BlcnR5IG9uIHRoZSBpbmRpY2F0ZWQgb2JqZWN0LCBpZiBpdFxuICAgICAgICAvLyBleGlzdHMuXG4gICAgICAgIFIucHJvcHMgPSBfKGZ1bmN0aW9uKG9iaiwgcHJvcCkge3JldHVybiBvYmogJiYgb2JqW3Byb3BdO30pO1xuXG5cbiAgICAgICAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgYWx3YXlzIHJldHVybnMgdGhlIGdpdmVuIHZhbHVlLlxuICAgICAgICB2YXIgYWx3YXlzID0gUi5hbHdheXMgPSBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtyZXR1cm4gdmFsO307XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGFueUJsYW5rcyA9IGFueShmdW5jdGlvbih2YWwpIHtyZXR1cm4gdmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWY7fSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBvbmx5IGNhbGwgdGhlIGluZGljYXRlZCBmdW5jdGlvbiBpZiB0aGUgY29ycmVjdCBudW1iZXIgb2YgKGRlZmluZWQsIG5vbi1udWxsKVxuICAgICAgICAvLyBhcmd1bWVudHMgYXJlIHN1cHBsaWVkLCByZXR1cm5pbmcgYHVuZGVmaW5lZGAgb3RoZXJ3aXNlLlxuICAgICAgICBSLm1heWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCB8fCBhbnlCbGFua3MoZXhwYW5kKGFyZ3VtZW50cywgZm4ubGVuZ3RoKSkpID8gdW5kZWYgOiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbGlzdCBjb250YWluaW5nIHRoZSBuYW1lcyBvZiBhbGwgdGhlIGVudW1lcmFibGUgb3duXG4gICAgICAgIC8vIHByb3BlcnRpZXMgb2YgdGhlIHN1cHBsaWVkIG9iamVjdC5cbiAgICAgICAgdmFyIGtleXMgPSBSLmtleXMgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICB2YXIgcHJvcCwga3MgPSBbXTtcbiAgICAgICAgICAgIGZvciAocHJvcCBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIGtzLnB1c2gocHJvcCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGtzO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBsaXN0IG9mIGFsbCB0aGUgZW51bWVyYWJsZSBvd24gcHJvcGVydGllcyBvZiB0aGUgc3VwcGxpZWQgb2JqZWN0LlxuICAgICAgICBSLnZhbHVlcyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgIHZhciBwcm9wLCB2cyA9IFtdO1xuICAgICAgICAgICAgZm9yIChwcm9wIGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdnMucHVzaChvYmpbcHJvcF0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2cztcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcGFydGlhbENvcHkgPSBmdW5jdGlvbih0ZXN0LCBvYmopIHtcbiAgICAgICAgICAgIHZhciBjb3B5ID0ge307XG4gICAgICAgICAgICBlYWNoKGZ1bmN0aW9uKGtleSkge2lmICh0ZXN0KGtleSwgb2JqKSkge2NvcHlba2V5XSA9IG9ialtrZXldO319LCBrZXlzKG9iaikpO1xuICAgICAgICAgICAgcmV0dXJuIGNvcHk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIHBhcnRpYWwgY29weSBvZiBhbiBvYmplY3QgY29udGFpbmluZyBvbmx5IHRoZSBrZXlzIHNwZWNpZmllZC4gIElmIHRoZSBrZXkgZG9lcyBub3QgZXhpc3QsIHRoZVxuICAgICAgICAvLyBwcm9wZXJ0eSBpcyBpZ25vcmVkXG4gICAgICAgIFIucGljayA9IF8oZnVuY3Rpb24obmFtZXMsIG9iaikge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnRpYWxDb3B5KGZ1bmN0aW9uKGtleSkge3JldHVybiBjb250YWlucyhrZXksIG5hbWVzKTt9LCBvYmopO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTaW1pbGFyIHRvIGBwaWNrYCBleGNlcHQgdGhhdCB0aGlzIG9uZSBpbmNsdWRlcyBhIGBrZXk6IHVuZGVmaW5lZGAgcGFpciBmb3IgcHJvcGVydGllcyB0aGF0IGRvbid0IGV4aXN0LlxuICAgICAgICB2YXIgcGlja0FsbCA9IFIucGlja0FsbCA9IF8oZnVuY3Rpb24obmFtZXMsIG9iaikge1xuICAgICAgICAgICAgdmFyIGNvcHkgPSB7fTtcbiAgICAgICAgICAgIGVhY2goZnVuY3Rpb24obmFtZSkgeyBjb3B5W25hbWVdID0gb2JqW25hbWVdOyB9LCBuYW1lcyk7XG4gICAgICAgICAgICByZXR1cm4gY29weTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIHBhcnRpYWwgY29weSBvZiBhbiBvYmplY3Qgb21pdHRpbmcgdGhlIGtleXMgc3BlY2lmaWVkLlxuICAgICAgICBSLm9taXQgPSBfKGZ1bmN0aW9uKG5hbWVzLCBvYmopIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJ0aWFsQ29weShmdW5jdGlvbihrZXkpIHtyZXR1cm4gIWNvbnRhaW5zKGtleSwgbmFtZXMpO30sIG9iaik7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gUmVwb3J0cyB3aGV0aGVyIHR3byBmdW5jdGlvbnMgaGF2ZSB0aGUgc2FtZSB2YWx1ZSBmb3IgdGhlIHNwZWNpZmllZCBwcm9wZXJ0eS4gIFVzZWZ1bCBhcyBhIGN1cnJpZWQgcHJlZGljYXRlLlxuICAgICAgICBSLmVxUHJvcHMgPSBfKGZ1bmN0aW9uKHByb3AsIG9iajEsIG9iajIpIHtyZXR1cm4gb2JqMVtwcm9wXSA9PT0gb2JqMltwcm9wXTt9KTtcblxuICAgICAgICAvLyBgd2hlcmVgIHRha2VzIGEgc3BlYyBvYmplY3QgYW5kIGEgdGVzdCBvYmplY3QgYW5kIHJldHVybnMgdHJ1ZSBpb2YgdGhlIHRlc3Qgc2F0aXNmaWVzIHRoZSBzcGVjLCBcbiAgICAgICAgLy8gZWxzZSBmYWxzZS4gQW55IHByb3BlcnR5IG9uIHRoZSBzcGVjIHRoYXQgaXMgbm90IGEgZnVuY3Rpb24gaXMgaW50ZXJwcmV0ZWQgYXMgYW4gZXF1YWxpdHkgXG4gICAgICAgIC8vIHJlbGF0aW9uLiBGb3IgZXhhbXBsZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBzcGVjID0ge3g6IDJ9O1xuICAgICAgICAvLyAgICAgd2hlcmUoc3BlYywge3c6IDEwLCB4OiAyLCB5OiAzMDB9KTsgLy8gPT4gdHJ1ZSwgeCA9PT0gMlxuICAgICAgICAvLyAgICAgd2hlcmUoc3BlYywge3g6IDEsIHk6ICdtb28nLCB6OiB0cnVlfSk7IC8vID0+IGZhbHNlLCB4ICE9PSAyXG4gICAgICAgIC8vXG4gICAgICAgIC8vIElmIHRoZSBzcGVjIGhhcyBhIHByb3BlcnR5IG1hcHBlZCB0byBhIGZ1bmN0aW9uLCB0aGVuIGB3aGVyZWAgZXZhbHVhdGVzIHRoZSBmdW5jdGlvbiwgcGFzc2luZyBpbiBcbiAgICAgICAgLy8gdGhlIHRlc3Qgb2JqZWN0J3MgdmFsdWUgZm9yIHRoZSBwcm9wZXJ0eSBpbiBxdWVzdGlvbiwgYXMgd2VsbCBhcyB0aGUgd2hvbGUgdGVzdCBvYmplY3QuIEZvciBleGFtcGxlOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIHNwZWMgPSB7eDogZnVuY3Rpb24odmFsLCBvYmopIHsgcmV0dXJuICB2YWwgKyBvYmoueSA+IDEwOyB9O1xuICAgICAgICAvLyAgICAgd2hlcmUoc3BlYywge3g6IDIsIHk6IDd9KTsgLy8gPT4gZmFsc2VcbiAgICAgICAgLy8gICAgIHdoZXJlKHNwZWMsIHt4OiAzLCB5OiA4fSk7IC8vID0+IHRydWVcbiAgICAgICAgLy9cbiAgICAgICAgLy8gYHdoZXJlYCBpcyB3ZWxsIHN1aXRlZCB0byBkZWNsYXJhdGl2bGV5IGV4cHJlc3NpbmcgY29uc3RyYWludHMgZm9yIG90aGVyIGZ1bmN0aW9ucywgZS5nLiwgYGZpbHRlcmA6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgeHMgPSBbe3g6IDIsIHk6IDF9LCB7eDogMTAsIHk6IDJ9LCBcbiAgICAgICAgLy8gICAgICAgICAgICAgICB7eDogOCwgeTogM30sIHt4OiAxMCwgeTogNH1dO1xuICAgICAgICAvLyAgICAgdmFyIGZ4cyA9IGZpbHRlcih3aGVyZSh7eDogMTB9KSwgeHMpOyBcbiAgICAgICAgLy8gICAgIC8vIGZ4cyA9PT4gW3t4OiAxMCwgeTogMn0sIHt4OiAxMCwgeTogNH1dXG4gICAgICAgIC8vXG4gICAgICAgIFIud2hlcmUgPSBfKGZ1bmN0aW9uKHNwZWMsIHRlc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBhbGwoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbCA9IHNwZWNba2V5XTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpID8gdmFsKHRlc3Rba2V5XSwgdGVzdCkgOiAodGVzdFtrZXldID09PSB2YWwpO1xuICAgICAgICAgICAgfSwga2V5cyhzcGVjKSk7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gTWlzY2VsbGFuZW91cyBGdW5jdGlvbnNcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgLy9cbiAgICAgICAgLy8gQSBmZXcgZnVuY3Rpb25zIGluIG5lZWQgb2YgYSBnb29kIGhvbWUuXG5cbiAgICAgICAgLy8gLS0tLS0tLS1cblxuICAgICAgICAvLyBFeHBvc2UgdGhlIGZ1bmN0aW9ucyBmcm9tIHJhbWRhIGFzIHByb3BlcnRpZXMgb24gYW5vdGhlciBvYmplY3QuICBJZiB0aGlzIG9iamVjdCBpcyB0aGUgZ2xvYmFsIG9iamVjdCwgdGhlblxuICAgICAgICAvLyBpdCB3aWxsIGJlIGFzIHRob3VnaCB0aGUgZXdlZGEgZnVuY3Rpb25zIGFyZSBnbG9iYWwgZnVuY3Rpb25zLlxuICAgICAgICBSLmluc3RhbGxUbyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICAgICAgZWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgICAgICAob2JqIHx8IGdsb2JhbClba2V5XSA9IFJba2V5XTtcbiAgICAgICAgICAgIH0pKGtleXMoUikpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEEgZnVuY3Rpb24gdGhhdCBhbHdheXMgcmV0dXJucyBgMGAuXG4gICAgICAgIFIuYWx3YXlzWmVybyA9IGFsd2F5cygwKTtcblxuICAgICAgICAvLyBBIGZ1bmN0aW9uIHRoYXQgYWx3YXlzIHJldHVybnMgYGZhbHNlYC5cbiAgICAgICAgUi5hbHdheXNGYWxzZSA9IGFsd2F5cyhmYWxzZSk7XG5cbiAgICAgICAgLy8gQSBmdW5jdGlvbiB0aGF0IGFsd2F5cyByZXR1cm5zIGB0cnVlYC5cbiAgICAgICAgUi5hbHdheXNUcnVlID0gYWx3YXlzKHRydWUpO1xuXG5cblxuICAgICAgICAvLyBMb2dpYyBGdW5jdGlvbnNcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZXNlIGZ1bmN0aW9ucyBhcmUgdmVyeSBzaW1wbGUgd3JhcHBlcnMgYXJvdW5kIHRoZSBidWlsdC1pbiBsb2dpY2FsIG9wZXJhdG9ycywgdXNlZnVsIGluIGJ1aWxkaW5nIHVwXG4gICAgICAgIC8vIG1vcmUgY29tcGxleCBmdW5jdGlvbmFsIGZvcm1zLlxuXG4gICAgICAgIC8vIC0tLS0tLS0tXG5cbiAgICAgICAgLy8gQSBmdW5jdGlvbiB3cmFwcGluZyB0aGUgYm9vbGVhbiBgJiZgIG9wZXJhdG9yLiAgTm90ZSB0aGF0IHVubGlrZSB0aGUgdW5kZXJseWluZyBvcGVyYXRvciwgdGhvdWdoLCBpdFxuICAgICAgICAvLyBhd2F5cyByZXR1cm5zIGB0cnVlYCBvciBgZmFsc2VgLlxuICAgICAgICBSLmFuZCA9IF8oZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgIHJldHVybiAhIShhICYmIGIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBIGZ1bmN0aW9uIHdyYXBwaW5nIHRoZSBib29sZWFuIGB8fGAgb3BlcmF0b3IuICBOb3RlIHRoYXQgdW5saWtlIHRoZSB1bmRlcmx5aW5nIG9wZXJhdG9yLCB0aG91Z2gsIGl0XG4gICAgICAgIC8vIGF3YXlzIHJldHVybnMgYHRydWVgIG9yIGBmYWxzZWAuXG4gICAgICAgIFIub3IgPSBfKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gISEoYSB8fCBiKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQSBmdW5jdGlvbiB3cmFwcGluZyB0aGUgYm9vbGVhbiBgIWAgb3BlcmF0b3IuICBJdCByZXR1cm5zIGB0cnVlYCBpZiB0aGUgcGFyYW1ldGVyIGlzIGZhbHNlLXkgYW5kIGBmYWxzZWAgaWZcbiAgICAgICAgLy8gdGhlIHBhcmFtZXRlciBpcyB0cnV0aC15XG4gICAgICAgIFIubm90ID0gZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgIHJldHVybiAhYTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBIGZ1bmN0aW9uIHdyYXBwaW5nIGNhbGxzIHRvIHRoZSB0d28gZnVuY3Rpb25zIGluIGFuIGAmJmAgb3BlcmF0aW9uLCByZXR1cm5pbmcgYHRydWVgIG9yIGBmYWxzZWAuICBOb3RlIHRoYXRcbiAgICAgICAgLy8gdGhpcyBpcyBzaG9ydC1jaXJjdWl0ZWQsIG1lYW5pbmcgdGhhdCB0aGUgc2Vjb25kIGZ1bmN0aW9uIHdpbGwgbm90IGJlIGludm9rZWQgaWYgdGhlIGZpcnN0IHJldHVybnMgYSBmYWxzZS15XG4gICAgICAgIC8vIHZhbHVlLlxuICAgICAgICBSLmFuZEZuID0gXyhmdW5jdGlvbihmLCBnKSB7IC8vIFRPRE86IGFyaXR5P1xuICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7cmV0dXJuICEhKGYuYXBwbHkodGhpcywgYXJndW1lbnRzKSAmJiBnLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO307XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEEgZnVuY3Rpb24gd3JhcHBpbmcgY2FsbHMgdG8gdGhlIHR3byBmdW5jdGlvbnMgaW4gYW4gYHx8YCBvcGVyYXRpb24sIHJldHVybmluZyBgdHJ1ZWAgb3IgYGZhbHNlYC4gIE5vdGUgdGhhdFxuICAgICAgICAvLyB0aGlzIGlzIHNob3J0LWNpcmN1aXRlZCwgbWVhbmluZyB0aGF0IHRoZSBzZWNvbmQgZnVuY3Rpb24gd2lsbCBub3QgYmUgaW52b2tlZCBpZiB0aGUgZmlyc3QgcmV0dXJucyBhIHRydXRoLXlcbiAgICAgICAgLy8gdmFsdWUuIChOb3RlIGFsc28gdGhhdCBhdCBsZWFzdCBPbGl2ZXIgVHdpc3QgY2FuIHByb25vdW5jZSB0aGlzIG9uZS4uLilcbiAgICAgICAgUi5vckZuID0gXyhmdW5jdGlvbihmLCBnKSB7IC8vIFRPRE86IGFyaXR5P1xuICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7cmV0dXJuICEhKGYuYXBwbHkodGhpcywgYXJndW1lbnRzKSB8fCBnLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO307XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEEgZnVuY3Rpb24gd3JhcHBpbmcgYSBjYWxsIHRvIHRoZSBnaXZlbiBmdW5jdGlvbiBpbiBhIGAhYCBvcGVyYXRpb24uICBJdCB3aWxsIHJldHVybiBgdHJ1ZWAgd2hlbiB0aGVcbiAgICAgICAgLy8gdW5kZXJseWluZyBmdW5jdGlvbiB3b3VsZCByZXR1cm4gYSBmYWxzZS15IHZhbHVlLCBhbmQgYGZhbHNlYCB3aGVuIGl0IHdvdWxkIHJldHVybiBhIHRydXRoLXkgb25lLlxuICAgICAgICB2YXIgbm90Rm4gPSBSLm5vdEZuID0gZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtyZXR1cm4gIWYuYXBwbHkodGhpcywgYXJndW1lbnRzKTt9O1xuICAgICAgICB9O1xuXG5cbiAgICAgICAgLy8gVE9ETzogaXMgdGhlcmUgYSB3YXkgdG8gdW5pZnkgYWxsUHJlZGljYXRlcyBhbmQgYW55UHJlZGljYXRlcz8gdGhleSBhcmUgc29vb29vIHNpbWlsYXJcbiAgICAgICAgLy8gR2l2ZW4gYSBsaXN0IG9mIHByZWRpY2F0ZXMgcmV0dXJucyBhIG5ldyBwcmVkaWNhdGUgdGhhdCB3aWxsIGJlIHRydWUgZXhhY3RseSB3aGVuIGFsbCBvZiB0aGVtIGFyZS5cbiAgICAgICAgUi5hbGxQcmVkaWNhdGVzID0gZnVuY3Rpb24ocHJlZHMgLyosIHZhbDEsIHZhbDEyLCAuLi4gKi8pIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIHZhciBtYXhBcml0eSA9IG1heChtYXAoZnVuY3Rpb24oZikgeyByZXR1cm4gZi5sZW5ndGg7IH0sIHByZWRzKSk7XG5cbiAgICAgICAgICAgIHZhciBhbmRQcmVkcyA9IGFyaXR5KG1heEFyaXR5LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgcHJlZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcHJlZHNbaWR4XS5hcHBseShudWxsLCBhcmd1bWVudHMpKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIChpc0VtcHR5KGFyZ3MpKSA/IGFuZFByZWRzIDogYW5kUHJlZHMuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgIH07XG5cblxuICAgICAgLy8gR2l2ZW4gYSBsaXN0IG9mIHByZWRpY2F0ZXMgcmV0dXJucyBhIG5ldyBwcmVkaWNhdGUgdGhhdCB3aWxsIGJlIHRydWUgZXhhY3RseSB3aGVuIGFueSBvbmUgb2YgdGhlbSBpcy5cbiAgICAgICAgUi5hbnlQcmVkaWNhdGVzID0gZnVuY3Rpb24ocHJlZHMgLyosIHZhbDEsIHZhbDEyLCAuLi4gKi8pIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc2xpY2UoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIHZhciBtYXhBcml0eSA9IG1heChtYXAoZnVuY3Rpb24oZikgeyByZXR1cm4gZi5sZW5ndGg7IH0sIHByZWRzKSk7XG5cbiAgICAgICAgICAgIHZhciBvclByZWRzID0gYXJpdHkobWF4QXJpdHksIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSAtMTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoKytpZHggPCBwcmVkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByZWRzW2lkeF0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiAoaXNFbXB0eShhcmdzKSkgPyBvclByZWRzIDogb3JQcmVkcy5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgfTtcblxuXG5cbiAgICAgICAgLy8gQXJpdGhtZXRpYyBGdW5jdGlvbnNcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGhlc2UgZnVuY3Rpb25zIHdyYXAgdXAgdGhlIGNlcnRhaW4gY29yZSBhcml0aG1ldGljIG9wZXJhdG9yc1xuXG4gICAgICAgIC8vIC0tLS0tLS0tXG5cbiAgICAgICAgLy8gQWRkcyB0d28gbnVtYmVycy4gIEF1dG9tYXRpYyBjdXJyaWVkOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIGFkZDcgPSBhZGQoNyk7XG4gICAgICAgIC8vICAgICBhZGQ3KDEwKTsgLy8gPT4gMTdcbiAgICAgICAgdmFyIGFkZCA9IFIuYWRkID0gXyhmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGEgKyBiO30pO1xuXG4gICAgICAgIC8vIE11bHRpcGxpZXMgdHdvIG51bWJlcnMuICBBdXRvbWF0aWNhbGx5IGN1cnJpZWQ6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgbXVsdDMgPSBtdWx0aXBseSgzKTtcbiAgICAgICAgLy8gICAgIG11bHQzKDcpOyAvLyA9PiAyMVxuICAgICAgICB2YXIgbXVsdGlwbHkgPSBSLm11bHRpcGx5ID0gXyhmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGEgKiBiO30pO1xuXG4gICAgICAgIC8vIFN1YnRyYWN0cyB0aGUgc2Vjb25kIHBhcmFtZXRlciBmcm9tIHRoZSBmaXJzdC4gIFRoaXMgaXMgYXV0b21hdGljYWxseSBjdXJyaWVkLCBhbmQgd2hpbGUgYXQgdGltZXMgdGhlIGN1cnJpZWRcbiAgICAgICAgLy8gdmVyc2lvbiBtaWdodCBiZSB1c2VmdWwsIG9mdGVuIHRoZSBjdXJyaWVkIHZlcnNpb24gb2YgYHN1YnRyYWN0TmAgbWlnaHQgYmUgd2hhdCdzIHdhbnRlZC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBodW5kcmVkTWludXMgPSBzdWJ0cmFjdCgxMDApO1xuICAgICAgICAvLyAgICAgaHVuZHJlZE1pbnVzKDIwKSA7IC8vID0+IDgwXG4gICAgICAgIHZhciBzdWJ0cmFjdCA9IFIuc3VidHJhY3QgPSBfKGZ1bmN0aW9uKGEsIGIpIHtyZXR1cm4gYSAtIGI7fSk7XG5cbiAgICAgICAgLy8gUmV2ZXJzZWQgdmVyc2lvbiBvZiBgc3VidHJhY3RgLCB3aGVyZSBmaXJzdCBwYXJhbWV0ZXIgaXMgc3VidHJhY3RlZCBmcm9tIHRoZSBzZWNvbmQuICBUaGUgY3VycmllZCB2ZXJzaW9uIG9mXG4gICAgICAgIC8vIHRoaXMgb25lIG1pZ2h0IG1lIG1vcmUgdXNlZnVsIHRoYW4gdGhhdCBvZiBgc3VidHJhY3RgLiAgRm9yIGluc3RhbmNlOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIGRlY3JlbWVudCA9IHN1YnRyYWN0TigxKTtcbiAgICAgICAgLy8gICAgIGRlY3JlbWVudCgxMCk7IC8vID0+IDk7XG4gICAgICAgIFIuc3VidHJhY3ROID0gZmxpcChzdWJ0cmFjdCk7XG5cbiAgICAgICAgLy8gRGl2aWRlcyB0aGUgZmlyc3QgcGFyYW1ldGVyIGJ5IHRoZSBzZWNvbmQuICBUaGlzIGlzIGF1dG9tYXRpY2FsbHkgY3VycmllZCwgYW5kIHdoaWxlIGF0IHRpbWVzIHRoZSBjdXJyaWVkXG4gICAgICAgIC8vIHZlcnNpb24gbWlnaHQgYmUgdXNlZnVsLCBvZnRlbiB0aGUgY3VycmllZCB2ZXJzaW9uIG9mIGBkaXZpZGVCeWAgbWlnaHQgYmUgd2hhdCdzIHdhbnRlZC5cbiAgICAgICAgdmFyIGRpdmlkZSA9IFIuZGl2aWRlID0gXyhmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGEgLyBiO30pO1xuXG4gICAgICAgIC8vIFJldmVyc2VkIHZlcnNpb24gb2YgYGRpdmlkZWAsIHdoZXJlIHRoZSBzZWNvbmQgcGFyYW1ldGVyIGlzIGRpdmlkZWQgYnkgdGhlIGZpcnN0LiAgVGhlIGN1cnJpZWQgdmVyc2lvbiBvZlxuICAgICAgICAvLyB0aGlzIG9uZSBtaWdodCBiZSBtb3JlIHVzZWZ1bCB0aGFuIHRoYXQgb2YgYGRpdmlkZWAuICBGb3IgaW5zdGFuY2U6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgaGFsZiA9IGRpdmlkZUJ5KDIpO1xuICAgICAgICAvLyAgICAgaGFsZig0Mik7IC8vID0+IDIxXG4gICAgICAgIFIuZGl2aWRlQnkgPSBmbGlwKGRpdmlkZSk7XG5cbiAgICAgICAgLy8gQWRkcyB0b2dldGhlciBhbGwgdGhlIGVsZW1lbnRzIG9mIGEgbGlzdC5cbiAgICAgICAgUi5zdW0gPSBmb2xkbChhZGQsIDApO1xuXG4gICAgICAgIC8vIE11bHRpcGxpZXMgdG9nZXRoZXIgYWxsIHRoZSBlbGVtZW50cyBvZiBhIGxpc3QuXG4gICAgICAgIFIucHJvZHVjdCA9IGZvbGRsKG11bHRpcGx5LCAxKTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRydWUgaWYgdGhlIGZpcnN0IHBhcmFtZXRlciBpcyBsZXNzIHRoYW4gdGhlIHNlY29uZC5cbiAgICAgICAgUi5sdCA9IF8oZnVuY3Rpb24oYSwgYikge3JldHVybiBhIDwgYjt9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRydWUgaWYgdGhlIGZpcnN0IHBhcmFtZXRlciBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gdGhlIHNlY29uZC5cbiAgICAgICAgUi5sdGUgPSBfKGZ1bmN0aW9uKGEsIGIpIHtyZXR1cm4gYSA8PSBiO30pO1xuXG4gICAgICAgIC8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgZmlyc3QgcGFyYW1ldGVyIGlzIGdyZWF0ZXIgdGhhbiB0aGUgc2Vjb25kLlxuICAgICAgICBSLmd0ID0gXyhmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGEgPiBiO30pO1xuXG4gICAgICAgIC8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgZmlyc3QgcGFyYW1ldGVyIGlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byB0aGUgc2Vjb25kLlxuICAgICAgICBSLmd0ZSA9IF8oZnVuY3Rpb24oYSwgYikge3JldHVybiBhID49IGI7fSk7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lcyB0aGUgbGFyZ2VzdCBvZiBhIGxpc3Qgb2YgbnVtYmVycyAob3IgZWxlbWVudHMgdGhhdCBjYW4gYmUgY2FzdCB0byBudW1iZXJzKVxuICAgICAgICB2YXIgbWF4ID0gUi5tYXggPSBmdW5jdGlvbihsaXN0KSB7cmV0dXJuIE1hdGgubWF4LmFwcGx5KG51bGwsIGxpc3QpO307XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lcyB0aGUgbGFyZ2VzdCBvZiBhIGxpc3Qgb2YgbnVtYmVycyAob3IgZWxlbWVudHMgdGhhdCBjYW4gYmUgY2FzdCB0byBudW1iZXJzKSB1c2luZyB0aGUgc3VwcGxpZWQgY29tcGFyYXRvclxuICAgICAgICBSLm1heFdpdGggPSBfKGZ1bmN0aW9uKGNvbXBhcmF0b3IsIGxpc3QpIHtcbiAgICAgICAgICAgIGlmICghaXNBcnJheShsaXN0KSB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaWR4ID0gMCwgbWF4ID0gbGlzdFtpZHhdO1xuICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29tcGFyYXRvcihtYXgsIGxpc3RbaWR4XSkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heCA9IGxpc3RbaWR4XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWF4O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUT0RPOiBjb21iaW5lIHRoaXMgd2l0aCBtYXhXaXRoP1xuICAgICAgICAvLyBEZXRlcm1pbmVzIHRoZSBzbWFsbGVzdCBvZiBhIGxpc3Qgb2YgbnVtYmVycyAob3IgZWxlbWVudHMgdGhhdCBjYW4gYmUgY2FzdCB0byBudW1iZXJzKSB1c2luZyB0aGUgc3VwcGxpZWQgY29tcGFyYXRvclxuICAgICAgICBSLm1pbldpdGggPSBfKGZ1bmN0aW9uKGNvbXBhcmF0b3IsIGxpc3QpIHtcbiAgICAgICAgICAgIGlmICghaXNBcnJheShsaXN0KSB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaWR4ID0gMCwgbWF4ID0gbGlzdFtpZHhdO1xuICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29tcGFyYXRvcihtYXgsIGxpc3RbaWR4XSkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heCA9IGxpc3RbaWR4XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWF4O1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIERldGVybWluZXMgdGhlIHNtYWxsZXN0IG9mIGEgbGlzdCBvZiBudW1iZXJzIChvciBlbGVtZW50cyB0aGF0IGNhbiBiZSBjYXN0IHRvIG51bWJlcnMpXG4gICAgICAgIFIubWluID0gZnVuY3Rpb24obGlzdCkge3JldHVybiBNYXRoLm1pbi5hcHBseShudWxsLCBsaXN0KTt9O1xuXG5cbiAgICAgICAgLy8gU3RyaW5nIEZ1bmN0aW9uc1xuICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG4gICAgICAgIC8vIE11Y2ggb2YgdGhlIFN0cmluZy5wcm90b3R5cGUgQVBJIGV4cG9zZWQgYXMgc2ltcGxlIGZ1bmN0aW9ucy5cblxuICAgICAgICAvLyAtLS0tLS0tLVxuXG4gICAgICAgIC8vIEEgc3Vic3RyaW5nIG9mIGEgU3RyaW5nOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgc3Vic3RyaW5nKDIsIDUsIFwiYWJjZGVmZ2hpamtsbVwiKTsgLy89PiBcImNkZVwiXG4gICAgICAgIHZhciBzdWJzdHJpbmcgPSBSLnN1YnN0cmluZyA9IGludm9rZXIoXCJzdWJzdHJpbmdcIiwgU3RyaW5nLnByb3RvdHlwZSk7XG5cbiAgICAgICAgLy8gVGhlIHRyYWlsaW5nIHN1YnN0cmluZyBvZiBhIFN0cmluZyBzdGFydGluZyB3aXRoIHRoZSBudGggY2hhcmFjdGVyOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgc3Vic3RyaW5nRnJvbSg4LCBcImFiY2RlZmdoaWprbG1cIik7IC8vPT4gXCJpamtsbVwiXG4gICAgICAgIFIuc3Vic3RyaW5nRnJvbSA9IGZsaXAoc3Vic3RyaW5nKSh1bmRlZik7XG5cbiAgICAgICAgLy8gVGhlIGxlYWRpbmcgc3Vic3RyaW5nIG9mIGEgU3RyaW5nIGVuZGluZyBiZWZvcmUgdGhlIG50aCBjaGFyYWN0ZXI6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICBzdWJzdHJpbmdUbyg4LCBcImFiY2RlZmdoaWprbG1cIik7IC8vPT4gXCJhYmNkZWZnaFwiXG4gICAgICAgIFIuc3Vic3RyaW5nVG8gPSBzdWJzdHJpbmcoMCk7XG5cbiAgICAgICAgLy8gVGhlIGNoYXJhY3RlciBhdCB0aGUgbnRoIHBvc2l0aW9uIGluIGEgU3RyaW5nOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgY2hhckF0KDgsIFwiYWJjZGVmZ2hpamtsbVwiKTsgLy89PiBcImlcIlxuICAgICAgICBSLmNoYXJBdCA9IGludm9rZXIoXCJjaGFyQXRcIiwgU3RyaW5nLnByb3RvdHlwZSk7XG5cbiAgICAgICAgLy8gVGhlIGFzY2lpIGNvZGUgb2YgdGhlIGNoYXJhY3RlciBhdCB0aGUgbnRoIHBvc2l0aW9uIGluIGEgU3RyaW5nOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgY2hhckNvZGVBdCg4LCBcImFiY2RlZmdoaWprbG1cIik7IC8vPT4gMTA1XG4gICAgICAgIC8vICAgICAvLyAoLi4uICdhJyB+IDk3LCAnYicgfiA5OCwgLi4uICdpJyB+IDEwNSlcbiAgICAgICAgUi5jaGFyQ29kZUF0ID0gaW52b2tlcihcImNoYXJDb2RlQXRcIiwgU3RyaW5nLnByb3RvdHlwZSk7XG5cbiAgICAgICAgLy8gVGVzdHMgYSByZWd1bGFyIGV4cHJlc3Npb24gYWdhaW5zIGEgU3RyaW5nXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICBtYXRjaCgvKFthLXpdYSkvZywgXCJiYW5hbmFzXCIpOyAvLz0+IFtcImJhXCIsIFwibmFcIiwgXCJuYVwiXVxuICAgICAgICBSLm1hdGNoID0gaW52b2tlcihcIm1hdGNoXCIsIFN0cmluZy5wcm90b3R5cGUpO1xuXG4gICAgICAgIC8vIEZpbmRzIHRoZSBpbmRleCBvZiBhIHN1YnN0cmluZyBpbiBhIHN0cmluZywgcmV0dXJuaW5nIC0xIGlmIGl0J3Mgbm90IHByZXNlbnRcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHN0ckluZGV4T2YoJ2MnLCAnYWJjZGVmZykgLy89PiAyXG4gICAgICAgIFIuc3RySW5kZXhPZiA9IGludm9rZXIoXCJpbmRleE9mXCIsIFN0cmluZy5wcm90b3R5cGUpO1xuXG4gICAgICAgIC8vIEZpbmRzIHRoZSBsYXN0IGluZGV4IG9mIGEgc3Vic3RyaW5nIGluIGEgc3RyaW5nLCByZXR1cm5pbmcgLTEgaWYgaXQncyBub3QgcHJlc2VudFxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgc3RySW5kZXhPZignYScsICdiYW5hbmEgc3BsaXQnKSAvLz0+IDJcbiAgICAgICAgUi5zdHJMYXN0SW5kZXhPZiA9IGludm9rZXIoXCJsYXN0SW5kZXhPZlwiLCBTdHJpbmcucHJvdG90eXBlKTtcblxuICAgICAgICAvLyBUaGUgdXBwZXJjYXNlIHZlcnNpb24gb2YgYSBzdHJpbmcuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB0b1VwcGVyQ2FzZSgnYWJjJykgLy89PiAnQUJDJ1xuICAgICAgICBSLnRvVXBwZXJDYXNlID0gaW52b2tlcihcInRvVXBwZXJDYXNlXCIsIFN0cmluZy5wcm90b3R5cGUpO1xuXG4gICAgICAgIC8vIFRoZSBsb3dlcmNhc2UgdmVyc2lvbiBvZiBhIHN0cmluZy5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHRvTG93ZXJDYXNlKCdYWVonKSAvLz0+ICd4eXonXG4gICAgICAgIFIudG9Mb3dlckNhc2UgPSBpbnZva2VyKFwidG9Mb3dlckNhc2VcIiwgU3RyaW5nLnByb3RvdHlwZSk7XG5cblxuICAgICAgICAvLyBUaGUgc3RyaW5nIHNwbGl0IGludG8gc3Vic3RyaW5nIGF0IHRoZSBzcGVjaWZpZWQgdG9rZW5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHNwbGl0KCcuJywgJ2EuYi5jLnh5ei5kJykgLy89PlxuICAgICAgICAvLyAgICAgICAgIFsnYScsICdiJywgJ2MnLCAneHl6JywgJ2QnXVxuICAgICAgICBSLnNwbGl0ID0gaW52b2tlcihcInNwbGl0XCIsIFN0cmluZy5wcm90b3R5cGUsIDEpO1xuXG5cbiAgICAgICAgLy8gRGF0YSBBbmFseXNpcyBhbmQgR3JvdXBpbmcgRnVuY3Rpb25zXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAvL1xuICAgICAgICAvLyBGdW5jdGlvbnMgcGVyZm9ybWluZyBTUUwtbGlrZSBhY3Rpb25zIG9uIGxpc3RzIG9mIG9iamVjdHMuICBUaGVzZSBkbyBub3QgaGF2ZSBhbnkgU1FMLWxpa2Ugb3B0aW1pemF0aW9uc1xuICAgICAgICAvLyBwZXJmb3JtZWQgb24gdGhlbSwgaG93ZXZlci5cblxuICAgICAgICAvLyAtLS0tLS0tLVxuXG4gICAgICAgIC8vIFJlYXNvbmFibGUgYW5hbG9nIHRvIFNRTCBgc2VsZWN0YCBzdGF0ZW1lbnQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIga2lkcyA9IFtcbiAgICAgICAgLy8gICAgICAgICB7bmFtZTogJ0FiYnknLCBhZ2U6IDcsIGhhaXI6ICdibG9uZCcsIGdyYWRlOiAyfSxcbiAgICAgICAgLy8gICAgICAgICB7bmFtZTogJ0ZyZWQnLCBhZ2U6IDEyLCBoYWlyOiAnYnJvd24nLCBncmFkZTogN31cbiAgICAgICAgLy8gICAgIF07XG4gICAgICAgIC8vICAgICBwcm9qZWN0KFsnbmFtZScsICdncmFkZSddLCBraWRzKTtcbiAgICAgICAgLy8gICAgIC8vPT4gW3tuYW1lOiAnQWJieScsIGdyYWRlOiAyfSwge25hbWU6ICdGcmVkJywgZ3JhZGU6IDd9XVxuICAgICAgICBSLnByb2plY3QgPSB1c2VXaXRoKG1hcCwgcGlja0FsbCwgaWRlbnRpdHkpOyAvLyBwYXNzaW5nIGBpZGVudGl0eWAgZ2l2ZXMgY29ycmVjdCBhcml0eVxuXG4gICAgICAgIC8vIERldGVybWluZXMgd2hldGhlciB0aGUgZ2l2ZW4gcHJvcGVydHkgb2YgYW4gb2JqZWN0IGhhcyBhIHNwZWNpZmljIHZhbHVlXG4gICAgICAgIC8vIE1vc3QgbGlrZWx5IHVzZWQgdG8gZmlsdGVyIGEgbGlzdDpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBraWRzID0gW1xuICAgICAgICAvLyAgICAgICB7bmFtZTogJ0FiYnknLCBhZ2U6IDcsIGhhaXI6ICdibG9uZCd9LFxuICAgICAgICAvLyAgICAgICB7bmFtZTogJ0ZyZWQnLCBhZ2U6IDEyLCBoYWlyOiAnYnJvd24nfSxcbiAgICAgICAgLy8gICAgICAge25hbWU6ICdSdXN0eScsIGFnZTogMTAsIGhhaXI6ICdicm93bid9LFxuICAgICAgICAvLyAgICAgICB7bmFtZTogJ0Fsb2lzJywgYWdlOiAxNSwgZGlzcG9zaXRpb246ICdzdXJseSd9XG4gICAgICAgIC8vICAgICBdO1xuICAgICAgICAvLyAgICAgZmlsdGVyKHByb3BFcShcImhhaXJcIiwgXCJicm93blwiKSwga2lkcyk7XG4gICAgICAgIC8vICAgICAvLz0+IEZyZWQgYW5kIFJ1c3R5XG4gICAgICAgIFIucHJvcEVxID0gXyhmdW5jdGlvbihuYW1lLCB2YWwsIG9iaikge1xuICAgICAgICAgICAgcmV0dXJuIG9ialtuYW1lXSA9PT0gdmFsO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb21iaW5lcyB0d28gbGlzdHMgaW50byBhIHNldCAoaS5lLiBubyBkdXBsaWNhdGVzKSBjb21wb3NlZCBvZiB0aGUgZWxlbWVudHMgb2YgZWFjaCBsaXN0LlxuICAgICAgICBSLnVuaW9uID0gY29tcG9zZSh1bmlxLCBtZXJnZSk7XG5cbiAgICAgICAgLy8gQ29tYmluZXMgdHdvIGxpc3RzIGludG8gYSBzZXQgKGkuZS4gbm8gZHVwbGljYXRlcykgY29tcG9zZWQgb2YgdGhlIGVsZW1lbnRzIG9mIGVhY2ggbGlzdC4gIER1cGxpY2F0aW9uIGlzXG4gICAgICAgIC8vIGRldGVybWluZWQgYWNjb3JkaW5nIHRvIHRoZSB2YWx1ZSByZXR1cm5lZCBieSBhcHBseWluZyB0aGUgc3VwcGxpZWQgcHJlZGljYXRlIHRvIHR3byBsaXN0IGVsZW1lbnRzLlxuICAgICAgICBSLnVuaW9uV2l0aCA9IGZ1bmN0aW9uKHByZWQsIGxpc3QxLCBsaXN0Mikge1xuICAgICAgICAgICAgcmV0dXJuIHVuaXFXaXRoKHByZWQsIG1lcmdlKGxpc3QxLCBsaXN0MikpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEZpbmRzIHRoZSBzZXQgKGkuZS4gbm8gZHVwbGljYXRlcykgb2YgYWxsIGVsZW1lbnRzIGluIHRoZSBmaXJzdCBsaXN0IG5vdCBjb250YWluZWQgaW4gdGhlIHNlY29uZCBsaXN0LlxuICAgICAgICBSLmRpZmZlcmVuY2UgPSBmdW5jdGlvbihmaXJzdCwgc2Vjb25kKSB7cmV0dXJuIHVuaXEocmVqZWN0KGZsaXAoY29udGFpbnMpKHNlY29uZCkpKGZpcnN0KSk7fTtcblxuICAgICAgICAvLyBGaW5kcyB0aGUgc2V0IChpLmUuIG5vIGR1cGxpY2F0ZXMpIG9mIGFsbCBlbGVtZW50cyBpbiB0aGUgZmlyc3QgbGlzdCBub3QgY29udGFpbmVkIGluIHRoZSBzZWNvbmQgbGlzdC5cbiAgICAgICAgLy8gRHVwbGljYXRpb24gaXMgZGV0ZXJtaW5lZCBhY2NvcmRpbmcgdG8gdGhlIHZhbHVlIHJldHVybmVkIGJ5IGFwcGx5aW5nIHRoZSBzdXBwbGllZCBwcmVkaWNhdGUgdG8gdHdvIGxpc3RcbiAgICAgICAgLy8gZWxlbWVudHMuXG4gICAgICAgIFIuZGlmZmVyZW5jZVdpdGggPSBmdW5jdGlvbihwcmVkLCBmaXJzdCwgc2Vjb25kKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5pcVdpdGgocHJlZCkocmVqZWN0KGZsaXAoY29udGFpbnNXaXRoKHByZWQpKShzZWNvbmQpLCBmaXJzdCkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENvbWJpbmVzIHR3byBsaXN0cyBpbnRvIGEgc2V0IChpLmUuIG5vIGR1cGxpY2F0ZXMpIGNvbXBvc2VkIG9mIHRob3NlIGVsZW1lbnRzIGNvbW1vbiB0byBib3RoIGxpc3RzLlxuICAgICAgICBSLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uKGxpc3QxLCBsaXN0Mikge1xuICAgICAgICAgICAgcmV0dXJuIHVuaXEoZmlsdGVyKGZsaXAoY29udGFpbnMpKGxpc3QxKSwgbGlzdDIpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDb21iaW5lcyB0d28gbGlzdHMgaW50byBhIHNldCAoaS5lLiBubyBkdXBsaWNhdGVzKSBjb21wb3NlZCBvZiB0aG9zZSBlbGVtZW50cyBjb21tb24gdG8gYm90aCBsaXN0cy5cbiAgICAgICAgLy8gRHVwbGljYXRpb24gaXMgZGV0ZXJtaW5lZCBhY2NvcmRpbmcgdG8gdGhlIHZhbHVlIHJldHVybmVkIGJ5IGFwcGx5aW5nIHRoZSBzdXBwbGllZCBwcmVkaWNhdGUgdG8gdHdvIGxpc3RcbiAgICAgICAgLy8gZWxlbWVudHMuXG4gICAgICAgIFIuaW50ZXJzZWN0aW9uV2l0aCA9IGZ1bmN0aW9uKHByZWQsIGxpc3QxLCBsaXN0Mikge1xuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBbXSwgaWR4ID0gLTE7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsaXN0MS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29udGFpbnNXaXRoKHByZWQsIGxpc3QxW2lkeF0sIGxpc3QyKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW3Jlc3VsdHMubGVuZ3RoXSA9IGxpc3QxW2lkeF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHVuaXFXaXRoKHByZWQsIHJlc3VsdHMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgbGlzdCB3aG9zZSBlbGVtZW50cyBlYWNoIGhhdmUgdHdvIHByb3BlcnRpZXM6IGB2YWxgIGlzIHRoZSB2YWx1ZSBvZiB0aGUgY29ycmVzcG9uZGluZ1xuICAgICAgICAvLyBpdGVtIGluIHRoZSBsaXN0IHN1cHBsaWVkLCBhbmQgYGtleWAgaXMgdGhlIHJlc3VsdCBvZiBhcHBseWluZyB0aGUgc3VwcGxpZWQgZnVuY3Rpb24gdG8gdGhhdCBpdGVtLlxuICAgICAgICB2YXIga2V5VmFsdWUgPSBfKGZ1bmN0aW9uKGZuLCBsaXN0KSB7IC8vIFRPRE86IFNob3VsZCB0aGlzIGJlIG1hZGUgcHVibGljP1xuICAgICAgICAgICAgcmV0dXJuIG1hcChmdW5jdGlvbihpdGVtKSB7cmV0dXJuIHtrZXk6IGZuKGl0ZW0pLCB2YWw6IGl0ZW19O30sIGxpc3QpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTb3J0cyB0aGUgbGlzdCBhY2NvcmRpbmcgdG8gYSBrZXkgZ2VuZXJhdGVkIGJ5IHRoZSBzdXBwbGllZCBmdW5jdGlvbi5cbiAgICAgICAgUi5zb3J0QnkgPSBfKGZ1bmN0aW9uKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICByZXR1cm4gc29ydChjb21wYXJhdG9yKGZ1bmN0aW9uKGEsIGIpIHtyZXR1cm4gZm4oYSkgPCBmbihiKTt9KSwgbGlzdCk7IC8vIGNsZWFuLCBidXQgdG9vIHRpbWUtaW5lZmZpY2llbnRcbiAgICAgICAgICAgICAgcmV0dXJuIHBsdWNrKFwidmFsXCIsIHNvcnQoY29tcGFyYXRvcihmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGEua2V5IDwgYi5rZXk7fSksIGtleVZhbHVlKGZuLCBsaXN0KSkpOyAvLyBuaWNlLCBidXQgbm8gbmVlZCB0byBjbG9uZSByZXN1bHQgb2Yga2V5VmFsdWUgY2FsbCwgc28uLi5cbiAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXR1cm4gcGx1Y2soXCJ2YWxcIiwga2V5VmFsdWUoZm4sIGxpc3QpLnNvcnQoY29tcGFyYXRvcihmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGEua2V5IDwgYi5rZXk7fSkpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ291bnRzIHRoZSBlbGVtZW50cyBvZiBhIGxpc3QgYWNjb3JkaW5nIHRvIGhvdyBtYW55IG1hdGNoIGVhY2ggdmFsdWUgb2YgYSBrZXkgZ2VuZXJhdGVkIGJ5IHRoZSBzdXBwbGllZCBmdW5jdGlvbi5cbiAgICAgICAgUi5jb3VudEJ5ID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvbGRsKGZ1bmN0aW9uKGNvdW50cywgb2JqKSB7XG4gICAgICAgICAgICAgICAgY291bnRzW29iai5rZXldID0gKGNvdW50c1tvYmoua2V5XSB8fCAwKSArIDE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50cztcbiAgICAgICAgICAgIH0sIHt9LCBrZXlWYWx1ZShmbiwgbGlzdCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBHcm91cHMgdGhlIGVsZW1lbnRzIG9mIGEgbGlzdCBieSBhIGtleSBnZW5lcmF0ZWQgYnkgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uLlxuICAgICAgICBSLmdyb3VwQnkgPSBfKGZ1bmN0aW9uKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gZm9sZGwoZnVuY3Rpb24oZ3JvdXBzLCBvYmopIHtcbiAgICAgICAgICAgICAgICAoZ3JvdXBzW29iai5rZXldIHx8IChncm91cHNbb2JqLmtleV0gPSBbXSkpLnB1c2gob2JqLnZhbCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdyb3VwcztcbiAgICAgICAgICAgIH0sIHt9LCBrZXlWYWx1ZShmbiwgbGlzdCkpO1xuICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgLy8gQWxsIHRoZSBmdW5jdGlvbmFsIGdvb2RuZXNzLCB3cmFwcGVkIGluIGEgbmljZSBsaXR0bGUgcGFja2FnZSwganVzdCBmb3IgeW91IVxuICAgICAgICByZXR1cm4gUjtcbiAgICB9KCkpO1xufSkpO1xuIiwidmFyIFIgPSByZXF1aXJlKCdyYW1kYScpO1xudmFyIEVNUFRZID0gMDtcblxuZnVuY3Rpb24gR3JpZChtKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBHcmlkKSkge1xuICAgIHJldHVybiBuZXcgR3JpZChtKTtcbiAgfVxuICB0aGlzLm1hdHJpeCA9IG07XG59O1xuXG5HcmlkLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEdyaWQsXG5cbiAgZmluZEVtcHR5Q2VsbDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNlbGwgPSB7fTtcbiAgICBjZWxsLnkgPSBSLmZpbmRJbmRleChmdW5jdGlvbihyKSB7IHJldHVybiBSLmNvbnRhaW5zKEVNUFRZLCByKTsgfSwgdGhpcy5tYXRyaXgpO1xuICAgIGlmIChjZWxsLnkgIT09IGZhbHNlKSB7XG4gICAgICBjZWxsLnggPSBSLmZpbmRJbmRleChmdW5jdGlvbihjKSB7IHJldHVybiBjID09PSBFTVBUWTsgfSwgdGhpcy5tYXRyaXhbY2VsbC55XSk7XG4gICAgfVxuICAgIHJldHVybiAoY2VsbC55ICE9PSBmYWxzZSAmJiBjZWxsLnggIT09IGZhbHNlKSA/IGNlbGwgOiBmYWxzZTtcbiAgfSxcblxuICBjb25zdHJhaW46IGZ1bmN0aW9uKGNlbGwpIHtcbiAgICB2YXIgcm93V2lzZSA9IFIuZGlmZmVyZW5jZShSLnJhbmdlKDEsMTApLCB0aGlzLm1hdHJpeFtjZWxsLnldKTtcbiAgICB2YXIgY29sV2lzZSA9IFIuZGlmZmVyZW5jZShyb3dXaXNlLCB0aGlzLmNvbFRvQXJyYXkoY2VsbC54KSk7XG4gICAgcmV0dXJuIFIuZGlmZmVyZW5jZShjb2xXaXNlLCB0aGlzLmJveFRvQXJyYXkoY2VsbCkpO1xuICB9LFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24oY2VsbCwgdmFsdWUpIHtcbiAgICB0aGlzLm1hdHJpeFtjZWxsLnldW2NlbGwueF0gPSB2YWx1ZTtcbiAgfSxcblxuICBjb2xUb0FycmF5OiBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIFIucGx1Y2soeCwgdGhpcy5tYXRyaXgpO1xuICB9LFxuXG4gIGdldEJveDogZnVuY3Rpb24oY2VsbCkge1xuICAgIHJldHVybiB7XG4gICAgICB4OiBNYXRoLmZsb29yKGNlbGwueC8zKSAqIDMsXG4gICAgICB5OiBNYXRoLmZsb29yKGNlbGwueS8zKSAqIDNcbiAgICB9O1xuICB9LFxuXG4gIGJveFRvQXJyYXk6IGZ1bmN0aW9uKGNlbGwpIHtcbiAgICB2YXIgYm94ID0gdGhpcy5nZXRCb3goY2VsbCk7IFxuICAgIHJldHVybiBSLnJlZHVjZShmdW5jdGlvbihhY2MsIHJvdykgeyAgXG4gICAgICByZXR1cm4gYWNjLmNvbmNhdChSLm1hcChSLkksIHJvdy5zbGljZShib3gueCwgYm94LnggKyAzKSkpO1xuICAgIH0sIFtdLCB0aGlzLm1hdHJpeC5zbGljZShib3gueSwgYm94LnkgKyAzKSk7XG4gIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHcmlkO1xuXG5cbiIsInZhciBzb2x2ZXIgPSByZXF1aXJlKCcuL3NvbHZlci5qcycpO1xudmFyIFIgPSByZXF1aXJlKCdyYW1kYScpO1xuXG52YXIgcmVuZGVyID0gZnVuY3Rpb24oZykge1xuICB2YXIgZ3JpZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdncmlkJyk7XG4gIHZhciBodG1sU3RyID0gUi5yZWR1Y2UoZnVuY3Rpb24oYWNjLCByb3cpIHtcbiAgICByZXR1cm4gYWNjICs9ICc8dHI+JyArIFxuICAgICAgICAgICBSLnJlZHVjZShmdW5jdGlvbihhY2MsIGNlbGwpIHtcbiAgICAgICAgICAgICByZXR1cm4gYWNjICsgJzx0ZD4nICsgKGNlbGwgfHwgJycpICsgJzwvdGQ+JztcbiAgICAgICAgICAgfSwgJycsIHJvdykgK1xuICAgICAgICAgICAnPC90cj4nO1xuICB9LCAnJywgZy5tYXRyaXgpO1xuIFxuICBncmlkLmlubmVySFRNTCA9IGh0bWxTdHI7XG59O1xuXG5zb2x2ZXIuc2V0UmVuZGVyZXIocmVuZGVyKTtcbnNvbHZlci5sb2FkKCk7XG5cbi8vIGF0dGFjaCB0byBET01cbnNvbHZlQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NvbHZlQnRuJyk7XG5zb2x2ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkgeyBzb2x2ZXIuc29sdmUoKTsgfSk7XG4iLCJ2YXIgUiA9IHJlcXVpcmUoJ3JhbWRhJyk7XG52YXIgR3JpZCA9IHJlcXVpcmUoJy4vR3JpZC5qcycpO1xuXG52YXIgZ3JpZCA9IG5ldyBHcmlkKFtcbiAgWzUsIDAsIDAsICAgMSwgMCwgMCwgICA5LCAzLCAwXSxcbiAgWzYsIDQsIDAsICAgMCwgNywgMywgICAwLCA4LCAwXSxcbiAgWzAsIDAsIDEsICAgOCwgMCwgNSwgICAwLCAwLCAwXSxcblxuICBbOCwgMCwgMCwgICAzLCA0LCAwLCAgIDAsIDEsIDBdLFxuICBbMCwgMCwgMCwgICA1LCAyLCAxLCAgIDAsIDAsIDBdLFxuICBbMCwgMiwgMCwgICAwLCA4LCA5LCAgIDAsIDAsIDZdLFxuXG4gIFswLCAwLCAwLCAgIDYsIDAsIDcsICAgOCwgMCwgMF0sXG4gIFswLCA4LCAwLCAgIDksIDMsIDAsICAgMCwgNywgMV0sXG4gIFswLCAxLCAzLCAgIDAsIDAsIDgsICAgMCwgMCwgOV1cbl0pO1xuXG5cbmZ1bmN0aW9uIHJlbmRlcihnKSB7XG4gIGNvbnNvbGUubG9nKFwic29sdmVkXCIpO1xuICBnLm1hdHJpeC5mb3JFYWNoKGZ1bmN0aW9uKHIpIHtcbiAgICBjb25zb2xlLmxvZyhyKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGxvYWQoZykge1xuICBncmlkID0gZyB8fCBncmlkO1xuICByZW5kZXIoZ3JpZCk7XG59XG5cbmZ1bmN0aW9uIHNvbHZlKGcpIHtcbiAgaWYgKCFnKSB7XG4gICAgZyA9IGdyaWQ7XG4gICAgbG9hZChnKTtcbiAgfVxuXG4gIHZhciBjZWxsID0gZy5maW5kRW1wdHlDZWxsKCk7XG4gIHZhciBpID0gMDtcbiAgXG4gIGlmICghY2VsbCkge1xuICAgIHJlbmRlcihnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHZhciBkb21haW4gPSBnLmNvbnN0cmFpbihjZWxsKTtcblxuICB3aGlsZSAoaSA8IGRvbWFpbi5sZW5ndGgpIHtcbiAgICBnLnVwZGF0ZShjZWxsLCBkb21haW5baV0pOyBcblxuICAgIGlmIChzb2x2ZShnKSkgeyAgICAgICAgICAgICAgIFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gbWFyayBjZWxsIGFzIGVtcHR5IGFuZCBiYWNrdHJhY2sgICAgXG4gICAgZy51cGRhdGUoY2VsbCwgMCk7XG4gICAgaSArPSAxO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGxvYWQ6IGxvYWQsXG4gIHNldFJlbmRlcmVyOiBmdW5jdGlvbihmbikgeyBcbiAgICByZW5kZXIgPSBmbjsgXG4gIH0sXG4gIHNvbHZlOiBzb2x2ZVxufTsgICBcblxuXG4gXG4iXX0=
(3)
});

!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),(f.app||(f.app={})).js=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
//     ramda.js 0.0.1
//     https://github.com/CrossEye/ramda
//     (c) 2013-2014 Scott Sauyet and Michael Hurley
//     Ramda may be freely distributed under the MIT license.

// Ramda
// -----
// A practical functional library for Javascript programmers.  This is a collection of tools to make it easier to
// use Javascript as a functional programming language.  (The name is just a silly play on `lambda`, even though we're
// not actually involved in the manipulation of lambda expressions.)

// Basic Setup
// -----------
// Uses a technique from the [Universal Module Definition][umd] to wrap this up for use in Node.js or in the browser,
// with or without an AMD-style loader.
//
//  [umd]: https://github.com/umdjs/umd/blob/master/returnExports.js

(function (root, factory) {if (typeof exports === 'object') {module.exports = factory(root);} else if (typeof define === 'function' && define.amd) {define(factory);} else {root.ramda = factory(root);}}(this, function (global) {

    return  (function() {

        // This object is what is actually returned, with all the exposed functions attached as properties.

        var R = {};

        // Internal Functions and Properties
        // ---------------------------------

        var undef = (function(){})(), EMPTY;

        // Makes a public alias for one of the public functions:
        var aliasFor = function(oldName) {
            var fn = function(newName) {R[newName] = R[oldName]; return fn;};
            fn.is = fn.are = fn.and = fn;
            return fn;
        };

        // `slice` implemented iteratively for performance
        var slice = function (args, from, to) {
            var i, arr = [];
            from = from || 0;
            to = to || args.length;
            for (i = from; i < to; i++) {
                arr[arr.length] = args[i];
            }
            return arr;
        };

        var isArray = function(val) {return Object.prototype.toString.call(val) === "[object Array]";};

        // Returns a curried version of the supplied function.  For example:
        //
        //      var discriminant = function(a, b, c) {
        //          return b * b - 4 * a * c;
        //      };
        //      var f = curry(discriminant);
        //      var g = f(3), h = f(3, 7) i = g(7);
        //      i(4) ≅ h(4) == g(7, 4) == f(3, 7, 4) == 1
        //
        //  Almost all exposed functions of more than one parameter already have curry applied to them.
        var _ = R.curry = function(fn) {
            var fnArity = fn.length;
            var f = function(args) {
                return arity(Math.max(fnArity - (args && args.length || 0), 0), function () {
                    var newArgs = (args || []).concat(slice(arguments, 0));
                    if (newArgs.length >= fnArity) {
                        return fn.apply(this, newArgs);
                    }
                    else {return f(newArgs);}
                });
            };

            return f([]);
        };

        var mkArgStr = function(n) {
            var arr = [], idx = -1;
            while(++idx < n) {
                arr[idx] = "arg" + idx;
            }
            return arr.join(", ");
        };

        // Wraps a function that may be nullary, or may take fewer than or more than `n` parameters, in a function that
        // specifically takes exactly `n` parameters.  Any extraneous parameters will not be passed on to the function
        // supplied
        var nAry = R.nAry = (function() {
            var cache = {};


            //     For example:
            //     cache[3] = function(func) {
            //         return function(arg0, arg1, arg2) {
            //             return func.call(this, arg0, arg1, arg2);
            //         }
            //     };

            var makeN = function(n) {
                var fnArgs = mkArgStr(n);
                var body = [
                    "    return function(" + fnArgs + ") {",
                    "        return func.call(this" + (fnArgs ? ", " + fnArgs : "") + ");",
                    "    }"
                ].join("\n");
                return new Function("func", body);
            };

            return function(n, fn) {
                return (cache[n] || (cache[n] = makeN(n)))(fn);
            };
        }());

        // Wraps a function that may be nullary, or may take fewer than or more than `n` parameters, in a function that
        // specifically takes exactly `n` parameters.  Note, though, that all parameters supplied will in fact be
        // passed along, in contrast with `nAry`, which only passes along the exact number specified.
        var arity = R.arity = (function() {
            var cache = {};

            //     For example:
            //     cache[3] = function(func) {
            //         return function(arg0, arg1, arg2) {
            //             return func.apply(this, arguments);
            //         }
            //     };

            var makeN = function(n) {
                var fnArgs = mkArgStr(n);
                var body = [
                    "    return function(" + fnArgs + ") {",
                    "        return func.apply(this, arguments);",
                    "    }"
                ].join("\n");
                return new Function("func", body);
            };

            return function(n, fn) {
                return (cache[n] || (cache[n] = makeN(n)))(fn);
            };
        }());

        // Turns a named method of an object (or object prototype) into a function that can be called directly.
        // The object becomes the last parameter to the function, and the function is automatically curried.
        // Passing the optional `len` parameter restricts the function to the initial `len` parameters of the method.
        var invoker = R.invoker = function(name, obj, len) {
            var method = obj[name];
            var length = len === undef ? method.length : len;
            return method && _(nAry(length + 1, function() {
                if(arguments.length) {
                    var target = Array.prototype.pop.call(arguments);
                    var targetMethod = target[name];
                    if (targetMethod == method) {
                        return targetMethod.apply(target, arguments);
                    }
                }
                return undef;
            }));
        };

        // Creates a new function that calls the function `fn` with parameters consisting of  the result of the
        // calling each supplied handler on successive arguments, followed by all unmatched arguments.
        //
        // If there are extra _expected_ arguments that don't need to be transformed, although you can ignore
        // them, it might be best to pass in and identity function so that the new function correctly reports arity.
        // See for example, the definition of `project`, below.
        var useWith = R.useWith = function(fn /*, transformers */) {
            var transformers = slice(arguments, 1);
            var tlen = transformers.length;
            return _(arity(tlen, function() {
                var args = [], idx = -1;
                while (++idx < tlen) {
                    args.push(transformers[idx](arguments[idx]));
                }
                return fn.apply(this, args.concat(slice(arguments, tlen)));
            }));
        };

        // A two-step version of the `useWith` function.  This would allow us to write `project`, currently written
        // as `useWith(map, pickAll, identity)`, as, instead, `use(map).over(pickAll, identity)`, which is a bit
        // more explicit.
        // TODO: One of these versions should be eliminated eventually.  So not worrying about the duplication for now.
        R.use = function(fn) {
            return {
                over: function(/*transformers*/) {
                    var transformers = slice(arguments, 0);
                    var tlen = transformers.length;
                    return _(arity(tlen, function() {
                        var args = [], idx = -1;
                        while (++idx < tlen) {
                            args.push(transformers[idx](arguments[idx]));
                        }
                        return fn.apply(this, args.concat(slice(arguments, tlen)));
                    }));
                }
            };
        };


        // Fills out an array to the specified length. Internal private function.
        var expand = function(a, len) {
            var arr = a ? isArray(a) ? a : slice(a) : [];
            while(arr.length < len) {arr[arr.length] = undef;}
            return arr;
        };

        // Internal version of `forEach`.  Possibly to be exposed later.
        var each = _(function(fn, arr) {
            for (var i = 0, len = arr.length; i < len; i++) {
                fn(arr[i]);
            }
        });

        // Shallow copy of an array.
        var clone = R.clone = function(list) {
            return list.concat();
        };


        // Core Functions
        // --------------
        //

        //   Prototypical (or only) empty list
        EMPTY = [];

        // Boolean function which reports whether a list is empty.
        var isEmpty = R.isEmpty = function(arr) {return !arr || !arr.length;};

        // Returns a new list with the new element at the front and the existing elements following
        var prepend = R.prepend = function(el, arr) {return [el].concat(arr);};
        aliasFor("prepend").is("cons");

        //  Returns the first element of a list
        var head = R.head = function(arr) {
            arr = arr || EMPTY;
            return (arr.length) ? arr[0] : null; 
        };
        aliasFor("head").is("car"); 

        // Returns the rest of the list after the first element.
        // If the passed-in list is a Generator, it will return the 
        // next iteration of the Generator.
        var tail = R.tail = function(arr) {
            arr = arr || EMPTY;
            if (arr.length === Infinity) {
                return arr.tail();
            }
            return (arr.length > 1) ? slice(arr, 1) : null;
        };
        aliasFor("tail").is("cdr");

        //   Boolean function which is `true` for non-list, `false` for a list.
        R.isAtom = function(x) {
            return (x !== null) && (x !== undef) && Object.prototype.toString.call(x) !== "[object Array]";
        };

        // Returns a new list with the new element at the end of a list following all the existing ones.
        R.append = function(el, list) {
            var newList = clone(list);
            newList.push(el);
            return newList;
        };
        aliasFor("append").is("push");

        // Returns a new list consisting of the elements of the first list followed by the elements of the second.
        var merge = R.merge = _(function(list1, list2) {
            if (isEmpty(list1)) {
                return clone(list2);
            } else {
                return list1.concat(list2);
            }
        });
        aliasFor("merge").is("concat");

        // A surprisingly useful function that does nothing but return the parameter supplied to it.
        var identity = R.identity = function(x) {return x;};
        aliasFor("identity").is("I");



        // Generators
        // ----------
        //

        // Support for infinite lists, using an initial seed, a function that calculates the head from the seed and
        // a function that creates a new seed from the current seed.  Generator objects have this structure:
        //
        //     {
        //        "0": someValue,
        //        tail: someFunction() {},
        //        length: Infinity
        //     }
        //
        // Generator objects also have such functions as `take`, `skip`, `map`, and `filter`, but the equivalent
        // functions from Ramda will work with them as well.
        //
        // ### Example ###
        //
        //     var fibonacci = generator(
        //         [0, 1],
        //         function(pair) {return pair[0];},
        //         function(pair) {return [pair[1], pair[0] + pair[1]];}
        //     );
        //     var even = function(n) {return (n % 2) === 0;};
        //
        //     take(5, filter(even, fibonacci)) //=> [0, 2, 8, 34, 144]
        //
        // Note that the `take(5)` call is necessary to get a finite list out of this.  Otherwise, this would still
        // be an infinite list.

        R.generator = (function() {
            // partial shim for Object.create
            var create = (function() {
                var F = function() {};
                return function(src) {
                    F.prototype = src;
                    return new F();
                };
            }());

            // Trampolining to support recursion in Generators
            var trampoline = function(fn) {
                var result = fn.apply(this, tail(arguments));
                while (typeof result === "function") {
                    result = result();
                }
                return result;
            };
            // Internal Generator constructor
            var  G = function(seed, current, step) {
                this["0"] = current(seed);
                this.tail = function() {
                    return new G(step(seed), current, step);
                };
            };
            // Generators can be used with OO techniques as well as our standard functional calls.  These are the
            // implementations of those methods and other properties.
            G.prototype = {
                 constructor: G,
                 // All generators are infinite.
                 length: Infinity,
                 // `take` implementation for generators.
                 take: function(n) {
                     var take = function(ctr, g, ret) {
                         return (ctr === 0) ? ret : take(ctr - 1, g.tail(), ret.concat([g[0]]));
                     };
                     return trampoline(take, n, this, []);
                 },
                 // `skip` implementation for generators.
                 skip: function(n) {
                     var skip = function(ctr, g) {
                         return (ctr <= 0) ? g : skip(ctr - 1, g.tail());
                     };
                     return trampoline(skip, n, this);
                 },
                 // `map` implementation for generators.
                 map: function(fn, gen) {
                     var g = create(G.prototype);
                     g[0] = fn(gen[0]);
                     g.tail = function() { return this.map(fn, gen.tail()); };
                     return g;
                 },
                 // `filter` implementation for generators.
                 filter: function(fn) {
                     var gen = this, head = gen[0];
                     while (!fn(head)) {
                         gen = gen.tail();
                         head = gen[0];
                     }
                     var g = create(G.prototype);
                     g[0] = head;
                     g.tail = function() {return filter(fn, gen.tail());};
                     return g;
                 }
            };

            // The actual public `generator` function.
            return function(seed, current, step) {
                return new G(seed, current, step);
            };
        }());


        // Function functions :-)
        // ----------------------
        //
        // These functions make new functions out of old ones.

        // --------

        // Creates a new function that runs each of the functions supplied as parameters in turn, passing the output
        // of each one to the next one, starting with whatever arguments were passed to the initial invocation.
        // Note that if `var h = compose(f, g)`, `h(x)` calls `g(x)` first, passing the result of that to `f()`.
        var compose = R.compose = function() {  // TODO: type check of arguments?
            var fns = slice(arguments);
            return function() {
                return foldr(function(args, fn) { return [fn.apply(this, args)]; }, slice(arguments), fns)[0];
            };
        };

        // Similar to `compose`, but processes the functions in the reverse order so that if if `var h = pipe(f, g)`,
        // `h(x)` calls `f(x)` first, passing the result of that to `g()`.
        R.pipe = function() { // TODO: type check of arguments?
            return compose.apply(this, slice(arguments).reverse());
        };
        aliasFor("pipe").is("sequence");

        // Returns a new function much like the supplied one except that the first two arguments are inverted.
        var flip = R.flip = function(fn) {
            return _(function(a, b) {
                return fn.apply(this, [b, a].concat(slice(arguments, 2)));
            });
        };

//        // Returns a new function much like the supplied one except that the first argument is cycled to the end.
//        R.cycle = function(fn) {
//            return nAry(fn.length, function() {
//                return fn.apply(this, slice(arguments, 1, fn.length).concat(arguments[0]));
//            });
//        };

        // Creates a new function that acts like the supplied function except that the left-most parameters are
        // pre-filled.
        R.lPartial = function (fn) {
            var args = slice(arguments, 1);
            return arity(Math.max(fn.length - args.length, 0), function() {
                return fn.apply(this, args.concat(slice(arguments)));
            });
        };
        aliasFor("lPartial").is("applyLeft");

        // Creates a new function that acts like the supplied function except that the right-most parameters are
        // pre-filled.
        R.rPartial =function (fn) {
            var args = slice(arguments, 1);
            return arity(Math.max(fn.length - args.length, 0), function() {
                return fn.apply(this, slice(arguments).concat(args));
            });
        };
        aliasFor("rPartial").is("applyRight");

        // Creates a new function that stores the results of running the supplied function and returns those
        // stored value when the same request is made.  **Note**: this really only handles string and number parameters.
        R.memoize = function(fn) {
            var cache = {};
            return function() {
                var position = foldl(function(cache, arg) {return cache[arg] || (cache[arg] = {});}, cache,
                        slice(arguments, 0, arguments.length - 1));
                var arg = arguments[arguments.length - 1];
                return (position[arg] || (position[arg] = fn.apply(this, arguments)));
            };
        };

        // Wraps a function up in one that will only call the internal one once, no matter how many times the outer one
        // is called.  ** Note**: this is not really pure; it's mostly meant to keep side-effects from repeating.
        R.once = function(fn) {
            var called = false, result;
            return function() {
                if (called) {return result;}
                called = true;
                result = fn.apply(this, arguments);
                return result;
            };
        };

        // Wrap a function inside another to allow you to make adjustments to the parameters or do other processing
        // either before the internal function is called or with its results.
        R.wrap = function(fn, wrapper) {
            return function() {
                return wrapper.apply(this, [fn].concat(slice(arguments)));
            };
        };

        // Wraps a constructor function inside a (curried) plain function that can be called with the same arguments
        // and returns the same type.  Allows, for instance,
        //
        //     var Widget = function(config) { /* ... */ }; // Constructor
        //     Widget.prototype = { /* ... */ }
        //     map(construct(Widget), allConfigs); //=> list of Widgets
        R.construct = function(fn) {
            var f = function() {
                var obj = new fn();
                fn.apply(obj, arguments);
                return obj;
            };
            return fn.length > 1 ? _(nAry(fn.length, f)) : f;
        };



        // List Functions
        // --------------
        //
        // These functions operate on logical lists, here plain arrays.  Almost all of these are curried, and the list
        // parameter comes last, so you can create a new function by supplying the preceding arguments, leaving the
        // list parameter off.  For instance:
        //
        //     // skip third parameter
        //     var checkAllPredicates = reduce(andFn, alwaysTrue);
        //     // ... given suitable definitions of odd, lt20, gt5
        //     var test = checkAllPredicates([odd, lt20, gt5]);
        //     // test(7) => true, test(9) => true, test(10) => false,
        //     // test(3) => false, test(21) => false,

        // --------

        // Returns a single item, by successively calling the function with the current element and the the next
        // element of the list, passing the result to the next call.  We start with the `acc` parameter to get
        // things going.  The function supplied should accept this running value and the latest element of the list,
        // and return an updated value.
        var foldl = R.foldl = _(function(fn, acc, list) {
            var idx = -1, len = list.length;
            while(++idx < len) {
                acc = fn(acc, list[idx]);
            }
            return acc;
        });
        aliasFor("foldl").is("reduce");

        // Much like `foldl`/`reduce`, except that this takes as its starting value the first element in the list.
        R.foldl1 = _(function (fn, list) {
            if (isEmpty(list)) {
                throw new Error("foldl1 does not work on empty lists");
            }
            return foldl(fn, head(list), tail(list));
        });

        // Similar to `foldl`/`reduce` except that it moves from right to left on the list.
        var foldr = R.foldr =_(function(fn, acc, list) {
            var idx = list.length;
            while(idx--) {
                acc = fn(acc, list[idx]);
            }
            return acc;

        });
        aliasFor("foldr").is("reduceRight");


        // Much like `foldr`/`reduceRight`, except that this takes as its starting value the last element in the list.
        R.foldr1 = _(function (fn, list) {
            if (isEmpty(list)) {
                throw new Error("foldr1 does not work on empty lists");
            }
            var newList = clone(list), acc = newList.pop();
            return foldr(fn, acc, newList);
        });

        // Builds a list from a seed value, using a function that returns falsy to quit and a pair otherwise,
        // consisting of the current value and the seed to be used for the next value.

        R.unfoldr = _(function(fn, seed) {
            var pair = fn(seed), result = [];
            while (pair && pair.length) {
                result.push(pair[0]);
                pair = fn(pair[1]);
            }
            return result;
        });


        // Returns a new list constructed by applying the function to every element of the list supplied.
        var map = R.map = _(function(fn, list) {
            if (list && list.length === Infinity) {
                return list.map(fn, list);
            }
            var idx = -1, len = list.length, result = new Array(len);
            while (++idx < len) {
                result[idx] = fn(list[idx]);
            }
            return result;
        });

        // Reports the number of elements in the list
        R.size = function(arr) {return arr.length;};

        // (Internal use only) The basic implementation of filter.
        var internalFilter = _(function(useIdx, fn, list) {
            if (list && list.length === Infinity) {
                return list.filter(fn); // TODO: figure out useIdx
            }
            var idx = -1, len = list.length, result = [];
            while (++idx < len) {
                if (!useIdx && fn(list[idx]) || fn(list[idx], idx, list)) {
                    result.push(list[idx]);
                }
            }
            return result;
        });

        // Returns a new list containing only those items that match a given predicate function.
        var filter = R.filter = internalFilter(false);

        // Like `filter`, but passes additional parameters to the predicate function.  Parameters are
        // `list item`, `index of item in list`, `entire list`.
        //
        // Example:
        //
        //     var lastTwo = function(val, idx, list) {
        //         return list.length - idx <= 2;
        //     };
        //     filter.idx(lastTwo, [8, 6, 7, 5, 3, 0 ,9]); //=> [0, 9]
        filter.idx = internalFilter(true);

        // Similar to `filter`, except that it keeps only those that **don't** match the given predicate functions.
        var reject = R.reject = _(function(fn, list) {
            return filter(notFn(fn), list);
        });

        // Like `reject`, but passes additional parameters to the predicate function.  Parameters are
        // `list item`, `index of item in list`, `entire list`.
        //
        // Example:
        //
        //     var lastTwo = function(val, idx, list) {
        //         return list.length - idx <= 2;
        //     };
        //     reject.idx(lastTwo, [8, 6, 7, 5, 3, 0 ,9]);
        //     //=> [8, 6, 7, 5, 3]
        reject.idx = _(function(fn, list) {
            return filter.idx(notFn(fn), list);
        });

        // Returns a new list containing the elements of the given list up until the first one where the function
        // supplied returns `false` when passed the element.
        R.takeWhile = _(function(fn, list) {
            var idx = -1, len = list.length, taking = true, result = [];
            while (taking) {
                ++idx;
                if (idx < len && fn(list[idx])) {
                    result.push(list[idx]);
                } else {
                    taking = false;
                }
            }
            return result;
        });

        // Returns a new list containing the first `n` elements of the given list.
        R.take = _(function(n, list) {
            if (list && list.length === Infinity) {
                return list.take(n);
            }
            var ls = clone(list);
            ls.length = n;
            return ls;
        });

        // Returns a new list containing the elements of the given list starting with the first one where the function
        // supplied returns `false` when passed the element.
        R.skipUntil = _(function(fn, list) {
            var idx = -1, len = list.length, taking = false, result = [];
            while (!taking) {
                ++idx;
                if (idx >= len || fn(list[idx])) {
                    taking = true;
                }
            }
            while (idx < len) {
                result.push(list[idx++]);
            }
            return result;
        });

        // Returns a new list containing all **but** the first `n` elements of the given list.
        R.skip = _(function(n, list) {
            if (list && list.length === Infinity) {
                return list.skip(n);
            }
            return slice(list, n);
        });
        aliasFor('skip').is('drop');

        // Returns the first element of the list which matches the predicate, or `false` if no element matches.
        R.find = _(function(fn, list) {
            var idx = -1, len = list.length;
            while (++idx < len) {
                if (fn(list[idx])) {
                    return list[idx];
                }
            }
            return false;
        });

        // Returns the index of first element of the list which matches the predicate, or `false` if no element matches.
        R.findIndex = _(function(fn, list) {
            var idx = -1, len = list.length;
            while (++idx < len) {
                if (fn(list[idx])) {
                    return idx;
                }
            }
            return false;
        });

        // Returns the last element of the list which matches the predicate, or `false` if no element matches.
        R.findLast = _(function(fn, list) {
            var idx = list.length;
            while (--idx) {
                if (fn(list[idx])) {
                    return list[idx];
                }
            }
            return false;
        });

        // Returns the index of last element of the list which matches the predicate, or `false` if no element matches.
        R.findLastIndex = _(function(fn, list) {
            var idx = list.length;
            while (--idx) {
                if (fn(list[idx])) {
                    return idx;
                }
            }
            return false;
        });

        // Returns `true` if all elements of the list match the predicate, `false` if there are any that don't.
        var all = R.all = _(function (fn, list) {
            var i = -1;
            while (++i < list.length) {
                if (!fn(list[i])) {
                    return false;
                }
            }
            return true;
        });
        aliasFor("all").is("every");


        // Returns `true` if any elements of the list match the predicate, `false` if none do.
        var any = R.any = _(function(fn, list) {
            var i = -1;
            while (++i < list.length) {
                if (fn(list[i])) {
                    return true;
                }
            }
            return false;
        });
        aliasFor("any").is("some");

        // Returns `true` if the list contains the sought element, `false` if it does not.  Equality is strict here,
        // meaning reference equality for objects and non-coercing equality for primitives.
        var contains = R.contains = _(function(a, list) {
            return list.indexOf(a) > -1;
        });

        // Returns `true` if the list contains the sought element, `false` if it does not, based upon the value
        // returned by applying the supplied predicated to two list elements.  Equality is strict here, meaning
        // reference equality for objects and non-coercing equality for primitives.  Probably inefficient.
        var containsWith = _(function(pred, x, list) {
            var idx = -1, len = list.length;
            while (++idx < len) {
                if (pred(x, list[idx])) {return true;}
            }
            return false;
        });

        // Returns a new list containing only one copy of each element in the original list.  Equality is strict here,
        // meaning reference equality for objects and non-coercing equality for primitives.
        var uniq = R.uniq = function(list) {
            return foldr(function(acc, x) { return (contains(x, acc)) ? acc : prepend(x, acc); }, EMPTY, list);
        };

        // Returns a new list containing only one copy of each element in the original list, based upon the value
        // returned by applying the supplied predicate to two list elements.   Equality is strict here,  meaning
        // reference equality for objects and non-coercing equality for primitives.
        var uniqWith = _(function(pred, list) {
            return foldr(function(acc, x) {return (containsWith(pred, x, acc)) ? acc : prepend(x, acc); }, EMPTY, list);
        });


        // Returns a new list by plucking the same named property off all objects in the list supplied.
        var pluck = R.pluck = _(function(p, list) {return map(prop(p), list);});

        // Returns a list that contains a flattened version of the supplied list.  For example:
        //
        //     flatten([1, 2, [3, 4], 5, [6, [7, 8, [9, [10, 11], 12]]]]);
        //     // => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        var flatten = R.flatten = function(list) {
            var idx = -1, len = list ? list.length : 0, result = [], push = result.push, val;
            while (++idx < len) {
                val = list[idx];
                push.apply(result, isArray(val) ? flatten(val) : [val]);
            }
            return result;
        };


        // Creates a new list out of the two supplied by applying the function to each equally-positioned pair in the
        // lists.  For example,
        //
        //     zipWith(f, [1, 2, 3], ['a', 'b', 'c'])
        //     //    => [f(1, 'a'), f(2, 'b'), f(3, 'c')];
        //
        // Note that the output list will only be as long as the length os the first list passed in.
        R.zipWith = _(function(fn, a, b) {
            var rv = [], i = -1, len = a.length;
            while(++i < len) {
                rv[i] = fn(a[i], b[i]);
            }
            return rv;
        });

        // Creates a new list out of the two supplied by yielding the pair of each equally-positioned pair in the
        // lists.  For example,
        //
        //     zip([1, 2, 3], ['a', 'b', 'c'])
        //     //    => [[1, 'a'], [2, 'b'], [3, 'c']];
        R.zip =  _(function(a, b) { // = zipWith(prepend);
            var rv = [], i = -1, len = a.length;
            while (++i < len) {
                rv[i] = [a[i], b[i]];
            }
            return rv;
        });

        // Creates a new list out of the two supplied by applying the function to each possible pair in the lists.
        //  For example,
        //
        //     xProdWith(f, [1, 2], ['a', 'b'])
        //     //    => [f(1, 'a'), f(1, 'b'), f(2, 'a'), f(2, 'b')];
        R.xprodWith = _(function(fn, a, b) {
            if (isEmpty(a) || isEmpty(b)) {return EMPTY;}
            var i = -1, ilen = a.length, j, jlen = b.length, result = []; // better to push them all or to do `new Array(ilen * jlen)` and calculate indices?
            while (++i < ilen) {
                j = -1;
                while (++j < jlen) {
                    result.push(fn(a[i], b[j]));
                }
            }
            return result;
        });

        // Creates a new list out of the two supplied by yielding the pair of each possible pair in the lists.
        // For example,
        //
        //     xProd([1, 2], ['a', 'b'])
        //     //    => [[1, 'a'], [1, 'b')], [2, 'a'], [2, 'b']];
        R.xprod = _(function(a, b) { // = xprodWith(prepend); (takes about 3 times as long...)
            if (isEmpty(a) || isEmpty(b)) {return EMPTY;}
            var i = -1, ilen = a.length, j, jlen = b.length, result = []; // better to push them all or to do `new Array(ilen * jlen)` and calculate indices?
            while (++i < ilen) {
                j = -1;
                while (++j < jlen) {
                    result.push([a[i], b[j]]);
                }
            }
            return result;
        });

        // Returns a new list with the same elements as the original list, just in the reverse order.
        R.reverse = function(list) {
            return clone(list || []).reverse();
        };

        // // Returns a list of numbers from `from` (inclusive) to `to` (exclusive).
        // For example, 
        //
        //     range(1, 5) // => [1, 2, 3, 4]
        //     range(50, 53) // => [50, 51, 52]
        R.range = _(function(from, to) {
            if (from >= to) {return EMPTY;}
            var idx, result = new Array(to - from);
            for (idx = 0; from < to; idx++, from++) {
                result[idx] = from;
            }
            return result;
        });


        // Returns the first zero-indexed position of an object in a flat list
        R.indexOf = _(function(obj, list) {
            return list.indexOf(obj);
        });

        // Returns the last zero-indexed position of an object in a flat list
        R.lastIndexOf = _(function(obj, list) {
            return list.lastIndexOf(obj);
        });

        // Returns the elements of the list as a string joined by a separator.
        R.join = _(function(sep, list) {
            return list.join(sep);
        });

        // ramda.splice has a different contract than Array.splice. Array.splice mutates its array
        // and returns the removed elements. ramda.splice does not mutate the passed in list (well,
        // it makes a shallow copy), and returns a new list with the specified elements removed. 
        R.splice = _(function(start, len, list) {
            var ls = slice(list, 0);
            ls.splice(start, len);
            return ls;
        });

        // Returns the nth element of a list (zero-indexed)
        R.nth = _(function(n, list) {
          return (list[n] === undef) ? null : list[n];
        });

        // Makes a comparator function out of a function that reports whether the first element is less than the second.
        //
        //     var cmp = comparator(function(a, b) {
        //         return a.age < b.age;
        //     };
        //     sort(cmp, people);
        var comparator = R.comparator = function(pred) {
            return function(a, b) {
                return pred(a, b) ? -1 : pred(b, a) ? 1 : 0;
            };
        };

        // Returns a copy of the list, sorted according to the comparator function, which should accept two values at a
        // time and return a negative number if the first value is smaller, a positive number if it's larger, and zero
        // if they are equal.  Please note that this is a **copy** of the list.  It does not modify the original.
        var sort = R.sort = _(function(comparator, list) {
            return clone(list).sort(comparator);
        });


        // Object Functions
        // ----------------
        //
        // These functions operate on plain Javascript object, adding simple functions to test properties on these
        // objects.  Many of these are of most use in conjunction with the list functions, operating on lists of
        // objects.

        // --------

        // Runs the given function with the supplied object, then returns the object.
        R.tap = _(function(x, fn) {
            if (typeof fn === "function") {
                fn(x);
            }
            return x;
        });
        aliasFor("tap").is("K"); // TODO: are we sure? Not necessary, but convenient, IMHO.

        // Tests if two items are equal.  Equality is strict here, meaning reference equality for objects and
        // non-coercing equality for primitives.
        R.eq = _(function(a, b) {
            return a === b;
        });

        // Returns a function that when supplied an object returns the indicated property of that object, if it exists.
        var prop = R.prop = _(function(p, obj) {return obj[p];});
        aliasFor("prop").is("get"); // TODO: are we sure?  Matches some other libs, but might want to reserve for other use.

        // Returns a function that when supplied an object returns the result of running the indicated function on
        // that object, if it has such a function.
        R.func = _(function(fn, obj) {return obj[fn].apply(obj, slice(arguments, 2));});


        // Returns a function that when supplied a property name returns that property on the indicated object, if it
        // exists.
        R.props = _(function(obj, prop) {return obj && obj[prop];});


        // Returns a function that always returns the given value.
        var always = R.always = function(val) {
            return function() {return val;};
        };

        var anyBlanks = any(function(val) {return val === null || val === undef;});

        // Returns a function that will only call the indicated function if the correct number of (defined, non-null)
        // arguments are supplied, returning `undefined` otherwise.
        R.maybe = function (fn) {
            return function () {
                return (arguments.length === 0 || anyBlanks(expand(arguments, fn.length))) ? undef : fn.apply(this, arguments);
            };
        };

        // Returns a list containing the names of all the enumerable own
        // properties of the supplied object.
        var keys = R.keys = function (obj) {
            var prop, ks = [];
            for (prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    ks.push(prop);
                }
            }
            return ks;
        };

        // Returns a list of all the enumerable own properties of the supplied object.
        R.values = function (obj) {
            var prop, vs = [];
            for (prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    vs.push(obj[prop]);
                }
            }
            return vs;
        };

        var partialCopy = function(test, obj) {
            var copy = {};
            each(function(key) {if (test(key, obj)) {copy[key] = obj[key];}}, keys(obj));
            return copy;
        };

        // Returns a partial copy of an object containing only the keys specified.  If the key does not exist, the
        // property is ignored
        R.pick = _(function(names, obj) {
            return partialCopy(function(key) {return contains(key, names);}, obj);
        });

        // Similar to `pick` except that this one includes a `key: undefined` pair for properties that don't exist.
        var pickAll = R.pickAll = _(function(names, obj) {
            var copy = {};
            each(function(name) { copy[name] = obj[name]; }, names);
            return copy;
        });

        // Returns a partial copy of an object omitting the keys specified.
        R.omit = _(function(names, obj) {
            return partialCopy(function(key) {return !contains(key, names);}, obj);
        });


        // Reports whether two functions have the same value for the specified property.  Useful as a curried predicate.
        R.eqProps = _(function(prop, obj1, obj2) {return obj1[prop] === obj2[prop];});

        // `where` takes a spec object and a test object and returns true iof the test satisfies the spec, 
        // else false. Any property on the spec that is not a function is interpreted as an equality 
        // relation. For example:
        //
        //     var spec = {x: 2};
        //     where(spec, {w: 10, x: 2, y: 300}); // => true, x === 2
        //     where(spec, {x: 1, y: 'moo', z: true}); // => false, x !== 2
        //
        // If the spec has a property mapped to a function, then `where` evaluates the function, passing in 
        // the test object's value for the property in question, as well as the whole test object. For example:
        //
        //     var spec = {x: function(val, obj) { return  val + obj.y > 10; };
        //     where(spec, {x: 2, y: 7}); // => false
        //     where(spec, {x: 3, y: 8}); // => true
        //
        // `where` is well suited to declarativley expressing constraints for other functions, e.g., `filter`:
        //
        //     var xs = [{x: 2, y: 1}, {x: 10, y: 2}, 
        //               {x: 8, y: 3}, {x: 10, y: 4}];
        //     var fxs = filter(where({x: 10}), xs); 
        //     // fxs ==> [{x: 10, y: 2}, {x: 10, y: 4}]
        //
        R.where = _(function(spec, test) {
            return all(function(key) {
                var val = spec[key];
                return (typeof val === 'function') ? val(test[key], test) : (test[key] === val);
            }, keys(spec));
        });


        // Miscellaneous Functions
        // -----------------------
        //
        // A few functions in need of a good home.

        // --------

        // Expose the functions from ramda as properties on another object.  If this object is the global object, then
        // it will be as though the eweda functions are global functions.
        R.installTo = function(obj) {
            each(function(key) {
                (obj || global)[key] = R[key];
            })(keys(R));
        };

        // A function that always returns `0`.
        R.alwaysZero = always(0);

        // A function that always returns `false`.
        R.alwaysFalse = always(false);

        // A function that always returns `true`.
        R.alwaysTrue = always(true);



        // Logic Functions
        // ---------------
        //
        // These functions are very simple wrappers around the built-in logical operators, useful in building up
        // more complex functional forms.

        // --------

        // A function wrapping the boolean `&&` operator.  Note that unlike the underlying operator, though, it
        // aways returns `true` or `false`.
        R.and = _(function (a, b) {
            return !!(a && b);
        });

        // A function wrapping the boolean `||` operator.  Note that unlike the underlying operator, though, it
        // aways returns `true` or `false`.
        R.or = _(function (a, b) {
            return !!(a || b);
        });

        // A function wrapping the boolean `!` operator.  It returns `true` if the parameter is false-y and `false` if
        // the parameter is truth-y
        R.not = function (a) {
            return !a;
        };

        // A function wrapping calls to the two functions in an `&&` operation, returning `true` or `false`.  Note that
        // this is short-circuited, meaning that the second function will not be invoked if the first returns a false-y
        // value.
        R.andFn = _(function(f, g) { // TODO: arity?
           return function() {return !!(f.apply(this, arguments) && g.apply(this, arguments));};
        });

        // A function wrapping calls to the two functions in an `||` operation, returning `true` or `false`.  Note that
        // this is short-circuited, meaning that the second function will not be invoked if the first returns a truth-y
        // value. (Note also that at least Oliver Twist can pronounce this one...)
        R.orFn = _(function(f, g) { // TODO: arity?
           return function() {return !!(f.apply(this, arguments) || g.apply(this, arguments));};
        });

        // A function wrapping a call to the given function in a `!` operation.  It will return `true` when the
        // underlying function would return a false-y value, and `false` when it would return a truth-y one.
        var notFn = R.notFn = function (f) {
            return function() {return !f.apply(this, arguments);};
        };


        // TODO: is there a way to unify allPredicates and anyPredicates? they are sooooo similar
        // Given a list of predicates returns a new predicate that will be true exactly when all of them are.
        R.allPredicates = function(preds /*, val1, val12, ... */) {
            var args = slice(arguments, 1);
            var maxArity = max(map(function(f) { return f.length; }, preds));

            var andPreds = arity(maxArity, function() {
                var idx = -1;
                while (++idx < preds.length) {
                    if (!preds[idx].apply(null, arguments)) { return false; }
                }
                return true;
            });
            return (isEmpty(args)) ? andPreds : andPreds.apply(null, args);
        };


      // Given a list of predicates returns a new predicate that will be true exactly when any one of them is.
        R.anyPredicates = function(preds /*, val1, val12, ... */) {
            var args = slice(arguments, 1);
            var maxArity = max(map(function(f) { return f.length; }, preds));

            var orPreds = arity(maxArity, function() {
                var idx = -1;
                while (++idx < preds.length) {
                    if (preds[idx].apply(null, arguments)) { return true; }
                }
                return false;
            });
            return (isEmpty(args)) ? orPreds : orPreds.apply(null, args);
        };



        // Arithmetic Functions
        // --------------------
        //
        // These functions wrap up the certain core arithmetic operators

        // --------

        // Adds two numbers.  Automatic curried:
        //
        //     var add7 = add(7);
        //     add7(10); // => 17
        var add = R.add = _(function(a, b) {return a + b;});

        // Multiplies two numbers.  Automatically curried:
        //
        //     var mult3 = multiply(3);
        //     mult3(7); // => 21
        var multiply = R.multiply = _(function(a, b) {return a * b;});

        // Subtracts the second parameter from the first.  This is automatically curried, and while at times the curried
        // version might be useful, often the curried version of `subtractN` might be what's wanted.
        //
        //     var hundredMinus = subtract(100);
        //     hundredMinus(20) ; // => 80
        var subtract = R.subtract = _(function(a, b) {return a - b;});

        // Reversed version of `subtract`, where first parameter is subtracted from the second.  The curried version of
        // this one might me more useful than that of `subtract`.  For instance:
        //
        //     var decrement = subtractN(1);
        //     decrement(10); // => 9;
        R.subtractN = flip(subtract);

        // Divides the first parameter by the second.  This is automatically curried, and while at times the curried
        // version might be useful, often the curried version of `divideBy` might be what's wanted.
        var divide = R.divide = _(function(a, b) {return a / b;});

        // Reversed version of `divide`, where the second parameter is divided by the first.  The curried version of
        // this one might be more useful than that of `divide`.  For instance:
        //
        //     var half = divideBy(2);
        //     half(42); // => 21
        R.divideBy = flip(divide);

        // Adds together all the elements of a list.
        R.sum = foldl(add, 0);

        // Multiplies together all the elements of a list.
        R.product = foldl(multiply, 1);

        // Returns true if the first parameter is less than the second.
        R.lt = _(function(a, b) {return a < b;});

        // Returns true if the first parameter is less than or equal to the second.
        R.lte = _(function(a, b) {return a <= b;});

        // Returns true if the first parameter is greater than the second.
        R.gt = _(function(a, b) {return a > b;});

        // Returns true if the first parameter is greater than or equal to the second.
        R.gte = _(function(a, b) {return a >= b;});

        // Determines the largest of a list of numbers (or elements that can be cast to numbers)
        var max = R.max = function(list) {return Math.max.apply(null, list);};

        // Determines the largest of a list of numbers (or elements that can be cast to numbers) using the supplied comparator
        R.maxWith = _(function(comparator, list) {
            if (!isArray(list) || !list.length) {
                return undef;
            }
            var idx = 0, max = list[idx];
            while (++idx < list.length) {
                if (comparator(max, list[idx]) < 0) {
                    max = list[idx];
                }
            }
            return max;
        });

        // TODO: combine this with maxWith?
        // Determines the smallest of a list of numbers (or elements that can be cast to numbers) using the supplied comparator
        R.minWith = _(function(comparator, list) {
            if (!isArray(list) || !list.length) {
                return undef;
            }
            var idx = 0, max = list[idx];
            while (++idx < list.length) {
                if (comparator(max, list[idx]) > 0) {
                    max = list[idx];
                }
            }
            return max;
        });


        // Determines the smallest of a list of numbers (or elements that can be cast to numbers)
        R.min = function(list) {return Math.min.apply(null, list);};


        // String Functions
        // ----------------
        //
        // Much of the String.prototype API exposed as simple functions.

        // --------

        // A substring of a String:
        //
        //     substring(2, 5, "abcdefghijklm"); //=> "cde"
        var substring = R.substring = invoker("substring", String.prototype);

        // The trailing substring of a String starting with the nth character:
        //
        //     substringFrom(8, "abcdefghijklm"); //=> "ijklm"
        R.substringFrom = flip(substring)(undef);

        // The leading substring of a String ending before the nth character:
        //
        //     substringTo(8, "abcdefghijklm"); //=> "abcdefgh"
        R.substringTo = substring(0);

        // The character at the nth position in a String:
        //
        //     charAt(8, "abcdefghijklm"); //=> "i"
        R.charAt = invoker("charAt", String.prototype);

        // The ascii code of the character at the nth position in a String:
        //
        //     charCodeAt(8, "abcdefghijklm"); //=> 105
        //     // (... 'a' ~ 97, 'b' ~ 98, ... 'i' ~ 105)
        R.charCodeAt = invoker("charCodeAt", String.prototype);

        // Tests a regular expression agains a String
        //
        //     match(/([a-z]a)/g, "bananas"); //=> ["ba", "na", "na"]
        R.match = invoker("match", String.prototype);

        // Finds the index of a substring in a string, returning -1 if it's not present
        //
        //     strIndexOf('c', 'abcdefg) //=> 2
        R.strIndexOf = invoker("indexOf", String.prototype);

        // Finds the last index of a substring in a string, returning -1 if it's not present
        //
        //     strIndexOf('a', 'banana split') //=> 2
        R.strLastIndexOf = invoker("lastIndexOf", String.prototype);

        // The uppercase version of a string.
        //
        //     toUpperCase('abc') //=> 'ABC'
        R.toUpperCase = invoker("toUpperCase", String.prototype);

        // The lowercase version of a string.
        //
        //     toLowerCase('XYZ') //=> 'xyz'
        R.toLowerCase = invoker("toLowerCase", String.prototype);


        // The string split into substring at the specified token
        //
        //     split('.', 'a.b.c.xyz.d') //=>
        //         ['a', 'b', 'c', 'xyz', 'd']
        R.split = invoker("split", String.prototype, 1);


        // Data Analysis and Grouping Functions
        // ------------------------------------
        //
        // Functions performing SQL-like actions on lists of objects.  These do not have any SQL-like optimizations
        // performed on them, however.

        // --------

        // Reasonable analog to SQL `select` statement.
        //
        //     var kids = [
        //         {name: 'Abby', age: 7, hair: 'blond', grade: 2},
        //         {name: 'Fred', age: 12, hair: 'brown', grade: 7}
        //     ];
        //     project(['name', 'grade'], kids);
        //     //=> [{name: 'Abby', grade: 2}, {name: 'Fred', grade: 7}]
        R.project = useWith(map, pickAll, identity); // passing `identity` gives correct arity

        // Determines whether the given property of an object has a specific value
        // Most likely used to filter a list:
        //
        //     var kids = [
        //       {name: 'Abby', age: 7, hair: 'blond'},
        //       {name: 'Fred', age: 12, hair: 'brown'},
        //       {name: 'Rusty', age: 10, hair: 'brown'},
        //       {name: 'Alois', age: 15, disposition: 'surly'}
        //     ];
        //     filter(propEq("hair", "brown"), kids);
        //     //=> Fred and Rusty
        R.propEq = _(function(name, val, obj) {
            return obj[name] === val;
        });

        // Combines two lists into a set (i.e. no duplicates) composed of the elements of each list.
        R.union = compose(uniq, merge);

        // Combines two lists into a set (i.e. no duplicates) composed of the elements of each list.  Duplication is
        // determined according to the value returned by applying the supplied predicate to two list elements.
        R.unionWith = function(pred, list1, list2) {
            return uniqWith(pred, merge(list1, list2));
        };

        // Finds the set (i.e. no duplicates) of all elements in the first list not contained in the second list.
        R.difference = function(first, second) {return uniq(reject(flip(contains)(second))(first));};

        // Finds the set (i.e. no duplicates) of all elements in the first list not contained in the second list.
        // Duplication is determined according to the value returned by applying the supplied predicate to two list
        // elements.
        R.differenceWith = function(pred, first, second) {
            return uniqWith(pred)(reject(flip(containsWith(pred))(second), first));
        };

        // Combines two lists into a set (i.e. no duplicates) composed of those elements common to both lists.
        R.intersection = function(list1, list2) {
            return uniq(filter(flip(contains)(list1), list2));
        };

        // Combines two lists into a set (i.e. no duplicates) composed of those elements common to both lists.
        // Duplication is determined according to the value returned by applying the supplied predicate to two list
        // elements.
        R.intersectionWith = function(pred, list1, list2) {
            var results = [], idx = -1;
            while (++idx < list1.length) {
                if (containsWith(pred, list1[idx], list2)) {
                    results[results.length] = list1[idx];
                }
            }
            return uniqWith(pred, results);
        };

        // Creates a new list whose elements each have two properties: `val` is the value of the corresponding
        // item in the list supplied, and `key` is the result of applying the supplied function to that item.
        var keyValue = _(function(fn, list) { // TODO: Should this be made public?
            return map(function(item) {return {key: fn(item), val: item};}, list);
        });

        // Sorts the list according to a key generated by the supplied function.
        R.sortBy = _(function(fn, list) {
            /*
              return sort(comparator(function(a, b) {return fn(a) < fn(b);}), list); // clean, but too time-inefficient
              return pluck("val", sort(comparator(function(a, b) {return a.key < b.key;}), keyValue(fn, list))); // nice, but no need to clone result of keyValue call, so...
            */
            return pluck("val", keyValue(fn, list).sort(comparator(function(a, b) {return a.key < b.key;})));
        });

        // Counts the elements of a list according to how many match each value of a key generated by the supplied function.
        R.countBy = _(function(fn, list) {
            return foldl(function(counts, obj) {
                counts[obj.key] = (counts[obj.key] || 0) + 1;
                return counts;
            }, {}, keyValue(fn, list));
        });

        // Groups the elements of a list by a key generated by the supplied function.
        R.groupBy = _(function(fn, list) {
            return foldl(function(groups, obj) {
                (groups[obj.key] || (groups[obj.key] = [])).push(obj.val);
                return groups;
            }, {}, keyValue(fn, list));
        });



        // All the functional goodness, wrapped in a nice little package, just for you!
        return R;
    }());
}));

},{}],2:[function(_dereq_,module,exports){
var R = _dereq_('ramda');
var EMPTY = 0;

function Grid(m) {
  if (!(this instanceof Grid)) {
    return new Grid(m);
  }
  this.matrix = m;
};

Grid.prototype = {
  constructor: Grid,

  findEmptyCell: function() {
    var cell = {};
    cell.y = R.findIndex(function(r) { return R.contains(EMPTY, r); }, this.matrix);
    if (cell.y !== false) {
      cell.x = R.findIndex(function(c) { return c === EMPTY; }, this.matrix[cell.y]);
    }
    return (cell.y !== false && cell.x !== false) ? cell : false;
  },

  constrain: function(cell) {
    var rowWise = R.difference(R.range(1,10), this.matrix[cell.y]);
    var colWise = R.difference(rowWise, this.colToArray(cell.x));
    return R.difference(colWise, this.boxToArray(cell));
  },

  update: function(cell, value) {
    this.matrix[cell.y][cell.x] = value;
  },

  colToArray: function(x) {
    return R.pluck(x, this.matrix);
  },

  getBox: function(cell) {
    return {
      x: Math.floor(cell.x/3) * 3,
      y: Math.floor(cell.y/3) * 3
    };
  },

  boxToArray: function(cell) {
    var box = this.getBox(cell); 
    return R.reduce(function(acc, row) {  
      return acc.concat(R.map(R.I, row.slice(box.x, box.x + 3)));
    }, [], this.matrix.slice(box.y, box.y + 3));
  }

};

module.exports = Grid;



},{"ramda":1}],3:[function(_dereq_,module,exports){
var R = _dereq_('ramda');
var Grid = _dereq_('./Grid.js');

var grid = new Grid([
  [5, 0, 0,   1, 0, 0,   9, 3, 0],
  [6, 4, 0,   0, 7, 3,   0, 8, 0],
  [0, 0, 1,   8, 0, 5,   0, 0, 0],

  [8, 0, 0,   3, 4, 0,   0, 1, 0],
  [0, 0, 0,   5, 2, 1,   0, 0, 0],
  [0, 2, 0,   0, 8, 9,   0, 0, 6],

  [0, 0, 0,   6, 0, 7,   8, 0, 0],
  [0, 8, 0,   9, 3, 0,   0, 7, 1],
  [0, 1, 3,   0, 0, 8,   0, 0, 9]
]);


function render(g) {
  console.log("solved");
  g.matrix.forEach(function(r) {
    console.log(r);
  });
}

function load(g) {
  grid = g || grid;
  render(grid);
}

function solve(g) {
  if (!g) {
    g = grid;
    load(g);
  }

  var cell = g.findEmptyCell();
  var i = 0;
  
  if (!cell) {
    render(g);
    return true;
  }

  var domain = g.constrain(cell);

  while (i < domain.length) {
    g.update(cell, domain[i]); 

    if (solve(g)) {               
      return true;
    }

    // mark cell as empty and backtrack    
    g.update(cell, 0);
    i += 1;
  }
  return false;
}

module.exports = {
  load: load,
  setRenderer: function(fn) { 
    render = fn; 
  },
  solve: solve
};   


 

},{"./Grid.js":2,"ramda":1}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9taWtlL2Rldi9zdWRva3Vzb2x2ZXIvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvbWlrZS9kZXYvc3Vkb2t1c29sdmVyL25vZGVfbW9kdWxlcy9yYW1kYS9yYW1kYS5qcyIsIi9ob21lL21pa2UvZGV2L3N1ZG9rdXNvbHZlci9zcmMvanMvR3JpZC5qcyIsIi9ob21lL21pa2UvZGV2L3N1ZG9rdXNvbHZlci9zcmMvanMvZmFrZV82OTk4ZjM3My5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzE1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gICAgIHJhbWRhLmpzIDAuMC4xXG4vLyAgICAgaHR0cHM6Ly9naXRodWIuY29tL0Nyb3NzRXllL3JhbWRhXG4vLyAgICAgKGMpIDIwMTMtMjAxNCBTY290dCBTYXV5ZXQgYW5kIE1pY2hhZWwgSHVybGV5XG4vLyAgICAgUmFtZGEgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbi8vIFJhbWRhXG4vLyAtLS0tLVxuLy8gQSBwcmFjdGljYWwgZnVuY3Rpb25hbCBsaWJyYXJ5IGZvciBKYXZhc2NyaXB0IHByb2dyYW1tZXJzLiAgVGhpcyBpcyBhIGNvbGxlY3Rpb24gb2YgdG9vbHMgdG8gbWFrZSBpdCBlYXNpZXIgdG9cbi8vIHVzZSBKYXZhc2NyaXB0IGFzIGEgZnVuY3Rpb25hbCBwcm9ncmFtbWluZyBsYW5ndWFnZS4gIChUaGUgbmFtZSBpcyBqdXN0IGEgc2lsbHkgcGxheSBvbiBgbGFtYmRhYCwgZXZlbiB0aG91Z2ggd2UncmVcbi8vIG5vdCBhY3R1YWxseSBpbnZvbHZlZCBpbiB0aGUgbWFuaXB1bGF0aW9uIG9mIGxhbWJkYSBleHByZXNzaW9ucy4pXG5cbi8vIEJhc2ljIFNldHVwXG4vLyAtLS0tLS0tLS0tLVxuLy8gVXNlcyBhIHRlY2huaXF1ZSBmcm9tIHRoZSBbVW5pdmVyc2FsIE1vZHVsZSBEZWZpbml0aW9uXVt1bWRdIHRvIHdyYXAgdGhpcyB1cCBmb3IgdXNlIGluIE5vZGUuanMgb3IgaW4gdGhlIGJyb3dzZXIsXG4vLyB3aXRoIG9yIHdpdGhvdXQgYW4gQU1ELXN0eWxlIGxvYWRlci5cbi8vXG4vLyAgW3VtZF06IGh0dHBzOi8vZ2l0aHViLmNvbS91bWRqcy91bWQvYmxvYi9tYXN0ZXIvcmV0dXJuRXhwb3J0cy5qc1xuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJvb3QpO30gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7ZGVmaW5lKGZhY3RvcnkpO30gZWxzZSB7cm9vdC5yYW1kYSA9IGZhY3Rvcnkocm9vdCk7fX0odGhpcywgZnVuY3Rpb24gKGdsb2JhbCkge1xuXG4gICAgcmV0dXJuICAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgLy8gVGhpcyBvYmplY3QgaXMgd2hhdCBpcyBhY3R1YWxseSByZXR1cm5lZCwgd2l0aCBhbGwgdGhlIGV4cG9zZWQgZnVuY3Rpb25zIGF0dGFjaGVkIGFzIHByb3BlcnRpZXMuXG5cbiAgICAgICAgdmFyIFIgPSB7fTtcblxuICAgICAgICAvLyBJbnRlcm5hbCBGdW5jdGlvbnMgYW5kIFByb3BlcnRpZXNcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgICAgdmFyIHVuZGVmID0gKGZ1bmN0aW9uKCl7fSkoKSwgRU1QVFk7XG5cbiAgICAgICAgLy8gTWFrZXMgYSBwdWJsaWMgYWxpYXMgZm9yIG9uZSBvZiB0aGUgcHVibGljIGZ1bmN0aW9uczpcbiAgICAgICAgdmFyIGFsaWFzRm9yID0gZnVuY3Rpb24ob2xkTmFtZSkge1xuICAgICAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24obmV3TmFtZSkge1JbbmV3TmFtZV0gPSBSW29sZE5hbWVdOyByZXR1cm4gZm47fTtcbiAgICAgICAgICAgIGZuLmlzID0gZm4uYXJlID0gZm4uYW5kID0gZm47XG4gICAgICAgICAgICByZXR1cm4gZm47XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYHNsaWNlYCBpbXBsZW1lbnRlZCBpdGVyYXRpdmVseSBmb3IgcGVyZm9ybWFuY2VcbiAgICAgICAgdmFyIHNsaWNlID0gZnVuY3Rpb24gKGFyZ3MsIGZyb20sIHRvKSB7XG4gICAgICAgICAgICB2YXIgaSwgYXJyID0gW107XG4gICAgICAgICAgICBmcm9tID0gZnJvbSB8fCAwO1xuICAgICAgICAgICAgdG8gPSB0byB8fCBhcmdzLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAoaSA9IGZyb207IGkgPCB0bzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYXJyW2Fyci5sZW5ndGhdID0gYXJnc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGlzQXJyYXkgPSBmdW5jdGlvbih2YWwpIHtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbCkgPT09IFwiW29iamVjdCBBcnJheV1cIjt9O1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBjdXJyaWVkIHZlcnNpb24gb2YgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uLiAgRm9yIGV4YW1wbGU6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICAgdmFyIGRpc2NyaW1pbmFudCA9IGZ1bmN0aW9uKGEsIGIsIGMpIHtcbiAgICAgICAgLy8gICAgICAgICAgcmV0dXJuIGIgKiBiIC0gNCAqIGEgKiBjO1xuICAgICAgICAvLyAgICAgIH07XG4gICAgICAgIC8vICAgICAgdmFyIGYgPSBjdXJyeShkaXNjcmltaW5hbnQpO1xuICAgICAgICAvLyAgICAgIHZhciBnID0gZigzKSwgaCA9IGYoMywgNykgaSA9IGcoNyk7XG4gICAgICAgIC8vICAgICAgaSg0KSDiiYUgaCg0KSA9PSBnKDcsIDQpID09IGYoMywgNywgNCkgPT0gMVxuICAgICAgICAvL1xuICAgICAgICAvLyAgQWxtb3N0IGFsbCBleHBvc2VkIGZ1bmN0aW9ucyBvZiBtb3JlIHRoYW4gb25lIHBhcmFtZXRlciBhbHJlYWR5IGhhdmUgY3VycnkgYXBwbGllZCB0byB0aGVtLlxuICAgICAgICB2YXIgXyA9IFIuY3VycnkgPSBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgdmFyIGZuQXJpdHkgPSBmbi5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgZiA9IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJpdHkoTWF0aC5tYXgoZm5Bcml0eSAtIChhcmdzICYmIGFyZ3MubGVuZ3RoIHx8IDApLCAwKSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3QXJncyA9IChhcmdzIHx8IFtdKS5jb25jYXQoc2xpY2UoYXJndW1lbnRzLCAwKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXdBcmdzLmxlbmd0aCA+PSBmbkFyaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgbmV3QXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7cmV0dXJuIGYobmV3QXJncyk7fVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIGYoW10pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBta0FyZ1N0ciA9IGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIHZhciBhcnIgPSBbXSwgaWR4ID0gLTE7XG4gICAgICAgICAgICB3aGlsZSgrK2lkeCA8IG4pIHtcbiAgICAgICAgICAgICAgICBhcnJbaWR4XSA9IFwiYXJnXCIgKyBpZHg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXJyLmpvaW4oXCIsIFwiKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBXcmFwcyBhIGZ1bmN0aW9uIHRoYXQgbWF5IGJlIG51bGxhcnksIG9yIG1heSB0YWtlIGZld2VyIHRoYW4gb3IgbW9yZSB0aGFuIGBuYCBwYXJhbWV0ZXJzLCBpbiBhIGZ1bmN0aW9uIHRoYXRcbiAgICAgICAgLy8gc3BlY2lmaWNhbGx5IHRha2VzIGV4YWN0bHkgYG5gIHBhcmFtZXRlcnMuICBBbnkgZXh0cmFuZW91cyBwYXJhbWV0ZXJzIHdpbGwgbm90IGJlIHBhc3NlZCBvbiB0byB0aGUgZnVuY3Rpb25cbiAgICAgICAgLy8gc3VwcGxpZWRcbiAgICAgICAgdmFyIG5BcnkgPSBSLm5BcnkgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY2FjaGUgPSB7fTtcblxuXG4gICAgICAgICAgICAvLyAgICAgRm9yIGV4YW1wbGU6XG4gICAgICAgICAgICAvLyAgICAgY2FjaGVbM10gPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHJldHVybiBmdW5jdGlvbihhcmcwLCBhcmcxLCBhcmcyKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXMsIGFyZzAsIGFyZzEsIGFyZzIpO1xuICAgICAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgICAgICAvLyAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG1ha2VOID0gZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICAgIHZhciBmbkFyZ3MgPSBta0FyZ1N0cihuKTtcbiAgICAgICAgICAgICAgICB2YXIgYm9keSA9IFtcbiAgICAgICAgICAgICAgICAgICAgXCIgICAgcmV0dXJuIGZ1bmN0aW9uKFwiICsgZm5BcmdzICsgXCIpIHtcIixcbiAgICAgICAgICAgICAgICAgICAgXCIgICAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc1wiICsgKGZuQXJncyA/IFwiLCBcIiArIGZuQXJncyA6IFwiXCIpICsgXCIpO1wiLFxuICAgICAgICAgICAgICAgICAgICBcIiAgICB9XCJcbiAgICAgICAgICAgICAgICBdLmpvaW4oXCJcXG5cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcImZ1bmNcIiwgYm9keSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24obiwgZm4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGNhY2hlW25dIHx8IChjYWNoZVtuXSA9IG1ha2VOKG4pKSkoZm4pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSgpKTtcblxuICAgICAgICAvLyBXcmFwcyBhIGZ1bmN0aW9uIHRoYXQgbWF5IGJlIG51bGxhcnksIG9yIG1heSB0YWtlIGZld2VyIHRoYW4gb3IgbW9yZSB0aGFuIGBuYCBwYXJhbWV0ZXJzLCBpbiBhIGZ1bmN0aW9uIHRoYXRcbiAgICAgICAgLy8gc3BlY2lmaWNhbGx5IHRha2VzIGV4YWN0bHkgYG5gIHBhcmFtZXRlcnMuICBOb3RlLCB0aG91Z2gsIHRoYXQgYWxsIHBhcmFtZXRlcnMgc3VwcGxpZWQgd2lsbCBpbiBmYWN0IGJlXG4gICAgICAgIC8vIHBhc3NlZCBhbG9uZywgaW4gY29udHJhc3Qgd2l0aCBgbkFyeWAsIHdoaWNoIG9ubHkgcGFzc2VzIGFsb25nIHRoZSBleGFjdCBudW1iZXIgc3BlY2lmaWVkLlxuICAgICAgICB2YXIgYXJpdHkgPSBSLmFyaXR5ID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGNhY2hlID0ge307XG5cbiAgICAgICAgICAgIC8vICAgICBGb3IgZXhhbXBsZTpcbiAgICAgICAgICAgIC8vICAgICBjYWNoZVszXSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGFyZzAsIGFyZzEsIGFyZzIpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgbWFrZU4gPSBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuQXJncyA9IG1rQXJnU3RyKG4pO1xuICAgICAgICAgICAgICAgIHZhciBib2R5ID0gW1xuICAgICAgICAgICAgICAgICAgICBcIiAgICByZXR1cm4gZnVuY3Rpb24oXCIgKyBmbkFyZ3MgKyBcIikge1wiLFxuICAgICAgICAgICAgICAgICAgICBcIiAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcIixcbiAgICAgICAgICAgICAgICAgICAgXCIgICAgfVwiXG4gICAgICAgICAgICAgICAgXS5qb2luKFwiXFxuXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJmdW5jXCIsIGJvZHkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG4sIGZuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChjYWNoZVtuXSB8fCAoY2FjaGVbbl0gPSBtYWtlTihuKSkpKGZuKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0oKSk7XG5cbiAgICAgICAgLy8gVHVybnMgYSBuYW1lZCBtZXRob2Qgb2YgYW4gb2JqZWN0IChvciBvYmplY3QgcHJvdG90eXBlKSBpbnRvIGEgZnVuY3Rpb24gdGhhdCBjYW4gYmUgY2FsbGVkIGRpcmVjdGx5LlxuICAgICAgICAvLyBUaGUgb2JqZWN0IGJlY29tZXMgdGhlIGxhc3QgcGFyYW1ldGVyIHRvIHRoZSBmdW5jdGlvbiwgYW5kIHRoZSBmdW5jdGlvbiBpcyBhdXRvbWF0aWNhbGx5IGN1cnJpZWQuXG4gICAgICAgIC8vIFBhc3NpbmcgdGhlIG9wdGlvbmFsIGBsZW5gIHBhcmFtZXRlciByZXN0cmljdHMgdGhlIGZ1bmN0aW9uIHRvIHRoZSBpbml0aWFsIGBsZW5gIHBhcmFtZXRlcnMgb2YgdGhlIG1ldGhvZC5cbiAgICAgICAgdmFyIGludm9rZXIgPSBSLmludm9rZXIgPSBmdW5jdGlvbihuYW1lLCBvYmosIGxlbikge1xuICAgICAgICAgICAgdmFyIG1ldGhvZCA9IG9ialtuYW1lXTtcbiAgICAgICAgICAgIHZhciBsZW5ndGggPSBsZW4gPT09IHVuZGVmID8gbWV0aG9kLmxlbmd0aCA6IGxlbjtcbiAgICAgICAgICAgIHJldHVybiBtZXRob2QgJiYgXyhuQXJ5KGxlbmd0aCArIDEsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IEFycmF5LnByb3RvdHlwZS5wb3AuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0TWV0aG9kID0gdGFyZ2V0W25hbWVdO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0TWV0aG9kID09IG1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldE1ldGhvZC5hcHBseSh0YXJnZXQsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgZnVuY3Rpb24gdGhhdCBjYWxscyB0aGUgZnVuY3Rpb24gYGZuYCB3aXRoIHBhcmFtZXRlcnMgY29uc2lzdGluZyBvZiAgdGhlIHJlc3VsdCBvZiB0aGVcbiAgICAgICAgLy8gY2FsbGluZyBlYWNoIHN1cHBsaWVkIGhhbmRsZXIgb24gc3VjY2Vzc2l2ZSBhcmd1bWVudHMsIGZvbGxvd2VkIGJ5IGFsbCB1bm1hdGNoZWQgYXJndW1lbnRzLlxuICAgICAgICAvL1xuICAgICAgICAvLyBJZiB0aGVyZSBhcmUgZXh0cmEgX2V4cGVjdGVkXyBhcmd1bWVudHMgdGhhdCBkb24ndCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkLCBhbHRob3VnaCB5b3UgY2FuIGlnbm9yZVxuICAgICAgICAvLyB0aGVtLCBpdCBtaWdodCBiZSBiZXN0IHRvIHBhc3MgaW4gYW5kIGlkZW50aXR5IGZ1bmN0aW9uIHNvIHRoYXQgdGhlIG5ldyBmdW5jdGlvbiBjb3JyZWN0bHkgcmVwb3J0cyBhcml0eS5cbiAgICAgICAgLy8gU2VlIGZvciBleGFtcGxlLCB0aGUgZGVmaW5pdGlvbiBvZiBgcHJvamVjdGAsIGJlbG93LlxuICAgICAgICB2YXIgdXNlV2l0aCA9IFIudXNlV2l0aCA9IGZ1bmN0aW9uKGZuIC8qLCB0cmFuc2Zvcm1lcnMgKi8pIHtcbiAgICAgICAgICAgIHZhciB0cmFuc2Zvcm1lcnMgPSBzbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgdmFyIHRsZW4gPSB0cmFuc2Zvcm1lcnMubGVuZ3RoO1xuICAgICAgICAgICAgcmV0dXJuIF8oYXJpdHkodGxlbiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBbXSwgaWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgdGxlbikge1xuICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2godHJhbnNmb3JtZXJzW2lkeF0oYXJndW1lbnRzW2lkeF0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MuY29uY2F0KHNsaWNlKGFyZ3VtZW50cywgdGxlbikpKTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBIHR3by1zdGVwIHZlcnNpb24gb2YgdGhlIGB1c2VXaXRoYCBmdW5jdGlvbi4gIFRoaXMgd291bGQgYWxsb3cgdXMgdG8gd3JpdGUgYHByb2plY3RgLCBjdXJyZW50bHkgd3JpdHRlblxuICAgICAgICAvLyBhcyBgdXNlV2l0aChtYXAsIHBpY2tBbGwsIGlkZW50aXR5KWAsIGFzLCBpbnN0ZWFkLCBgdXNlKG1hcCkub3ZlcihwaWNrQWxsLCBpZGVudGl0eSlgLCB3aGljaCBpcyBhIGJpdFxuICAgICAgICAvLyBtb3JlIGV4cGxpY2l0LlxuICAgICAgICAvLyBUT0RPOiBPbmUgb2YgdGhlc2UgdmVyc2lvbnMgc2hvdWxkIGJlIGVsaW1pbmF0ZWQgZXZlbnR1YWxseS4gIFNvIG5vdCB3b3JyeWluZyBhYm91dCB0aGUgZHVwbGljYXRpb24gZm9yIG5vdy5cbiAgICAgICAgUi51c2UgPSBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvdmVyOiBmdW5jdGlvbigvKnRyYW5zZm9ybWVycyovKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0cmFuc2Zvcm1lcnMgPSBzbGljZShhcmd1bWVudHMsIDApO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGxlbiA9IHRyYW5zZm9ybWVycy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfKGFyaXR5KHRsZW4sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBbXSwgaWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoKytpZHggPCB0bGVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKHRyYW5zZm9ybWVyc1tpZHhdKGFyZ3VtZW50c1tpZHhdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJncy5jb25jYXQoc2xpY2UoYXJndW1lbnRzLCB0bGVuKSkpO1xuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuXG4gICAgICAgIC8vIEZpbGxzIG91dCBhbiBhcnJheSB0byB0aGUgc3BlY2lmaWVkIGxlbmd0aC4gSW50ZXJuYWwgcHJpdmF0ZSBmdW5jdGlvbi5cbiAgICAgICAgdmFyIGV4cGFuZCA9IGZ1bmN0aW9uKGEsIGxlbikge1xuICAgICAgICAgICAgdmFyIGFyciA9IGEgPyBpc0FycmF5KGEpID8gYSA6IHNsaWNlKGEpIDogW107XG4gICAgICAgICAgICB3aGlsZShhcnIubGVuZ3RoIDwgbGVuKSB7YXJyW2Fyci5sZW5ndGhdID0gdW5kZWY7fVxuICAgICAgICAgICAgcmV0dXJuIGFycjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbCB2ZXJzaW9uIG9mIGBmb3JFYWNoYC4gIFBvc3NpYmx5IHRvIGJlIGV4cG9zZWQgbGF0ZXIuXG4gICAgICAgIHZhciBlYWNoID0gXyhmdW5jdGlvbihmbiwgYXJyKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZm4oYXJyW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2hhbGxvdyBjb3B5IG9mIGFuIGFycmF5LlxuICAgICAgICB2YXIgY2xvbmUgPSBSLmNsb25lID0gZnVuY3Rpb24obGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuIGxpc3QuY29uY2F0KCk7XG4gICAgICAgIH07XG5cblxuICAgICAgICAvLyBDb3JlIEZ1bmN0aW9uc1xuICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLVxuICAgICAgICAvL1xuXG4gICAgICAgIC8vICAgUHJvdG90eXBpY2FsIChvciBvbmx5KSBlbXB0eSBsaXN0XG4gICAgICAgIEVNUFRZID0gW107XG5cbiAgICAgICAgLy8gQm9vbGVhbiBmdW5jdGlvbiB3aGljaCByZXBvcnRzIHdoZXRoZXIgYSBsaXN0IGlzIGVtcHR5LlxuICAgICAgICB2YXIgaXNFbXB0eSA9IFIuaXNFbXB0eSA9IGZ1bmN0aW9uKGFycikge3JldHVybiAhYXJyIHx8ICFhcnIubGVuZ3RoO307XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IHdpdGggdGhlIG5ldyBlbGVtZW50IGF0IHRoZSBmcm9udCBhbmQgdGhlIGV4aXN0aW5nIGVsZW1lbnRzIGZvbGxvd2luZ1xuICAgICAgICB2YXIgcHJlcGVuZCA9IFIucHJlcGVuZCA9IGZ1bmN0aW9uKGVsLCBhcnIpIHtyZXR1cm4gW2VsXS5jb25jYXQoYXJyKTt9O1xuICAgICAgICBhbGlhc0ZvcihcInByZXBlbmRcIikuaXMoXCJjb25zXCIpO1xuXG4gICAgICAgIC8vICBSZXR1cm5zIHRoZSBmaXJzdCBlbGVtZW50IG9mIGEgbGlzdFxuICAgICAgICB2YXIgaGVhZCA9IFIuaGVhZCA9IGZ1bmN0aW9uKGFycikge1xuICAgICAgICAgICAgYXJyID0gYXJyIHx8IEVNUFRZO1xuICAgICAgICAgICAgcmV0dXJuIChhcnIubGVuZ3RoKSA/IGFyclswXSA6IG51bGw7IFxuICAgICAgICB9O1xuICAgICAgICBhbGlhc0ZvcihcImhlYWRcIikuaXMoXCJjYXJcIik7IFxuXG4gICAgICAgIC8vIFJldHVybnMgdGhlIHJlc3Qgb2YgdGhlIGxpc3QgYWZ0ZXIgdGhlIGZpcnN0IGVsZW1lbnQuXG4gICAgICAgIC8vIElmIHRoZSBwYXNzZWQtaW4gbGlzdCBpcyBhIEdlbmVyYXRvciwgaXQgd2lsbCByZXR1cm4gdGhlIFxuICAgICAgICAvLyBuZXh0IGl0ZXJhdGlvbiBvZiB0aGUgR2VuZXJhdG9yLlxuICAgICAgICB2YXIgdGFpbCA9IFIudGFpbCA9IGZ1bmN0aW9uKGFycikge1xuICAgICAgICAgICAgYXJyID0gYXJyIHx8IEVNUFRZO1xuICAgICAgICAgICAgaWYgKGFyci5sZW5ndGggPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyci50YWlsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gKGFyci5sZW5ndGggPiAxKSA/IHNsaWNlKGFyciwgMSkgOiBudWxsO1xuICAgICAgICB9O1xuICAgICAgICBhbGlhc0ZvcihcInRhaWxcIikuaXMoXCJjZHJcIik7XG5cbiAgICAgICAgLy8gICBCb29sZWFuIGZ1bmN0aW9uIHdoaWNoIGlzIGB0cnVlYCBmb3Igbm9uLWxpc3QsIGBmYWxzZWAgZm9yIGEgbGlzdC5cbiAgICAgICAgUi5pc0F0b20gPSBmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHggIT09IG51bGwpICYmICh4ICE9PSB1bmRlZikgJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpICE9PSBcIltvYmplY3QgQXJyYXldXCI7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IHdpdGggdGhlIG5ldyBlbGVtZW50IGF0IHRoZSBlbmQgb2YgYSBsaXN0IGZvbGxvd2luZyBhbGwgdGhlIGV4aXN0aW5nIG9uZXMuXG4gICAgICAgIFIuYXBwZW5kID0gZnVuY3Rpb24oZWwsIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBuZXdMaXN0ID0gY2xvbmUobGlzdCk7XG4gICAgICAgICAgICBuZXdMaXN0LnB1c2goZWwpO1xuICAgICAgICAgICAgcmV0dXJuIG5ld0xpc3Q7XG4gICAgICAgIH07XG4gICAgICAgIGFsaWFzRm9yKFwiYXBwZW5kXCIpLmlzKFwicHVzaFwiKTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGxpc3QgY29uc2lzdGluZyBvZiB0aGUgZWxlbWVudHMgb2YgdGhlIGZpcnN0IGxpc3QgZm9sbG93ZWQgYnkgdGhlIGVsZW1lbnRzIG9mIHRoZSBzZWNvbmQuXG4gICAgICAgIHZhciBtZXJnZSA9IFIubWVyZ2UgPSBfKGZ1bmN0aW9uKGxpc3QxLCBsaXN0Mikge1xuICAgICAgICAgICAgaWYgKGlzRW1wdHkobGlzdDEpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNsb25lKGxpc3QyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpc3QxLmNvbmNhdChsaXN0Mik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBhbGlhc0ZvcihcIm1lcmdlXCIpLmlzKFwiY29uY2F0XCIpO1xuXG4gICAgICAgIC8vIEEgc3VycHJpc2luZ2x5IHVzZWZ1bCBmdW5jdGlvbiB0aGF0IGRvZXMgbm90aGluZyBidXQgcmV0dXJuIHRoZSBwYXJhbWV0ZXIgc3VwcGxpZWQgdG8gaXQuXG4gICAgICAgIHZhciBpZGVudGl0eSA9IFIuaWRlbnRpdHkgPSBmdW5jdGlvbih4KSB7cmV0dXJuIHg7fTtcbiAgICAgICAgYWxpYXNGb3IoXCJpZGVudGl0eVwiKS5pcyhcIklcIik7XG5cblxuXG4gICAgICAgIC8vIEdlbmVyYXRvcnNcbiAgICAgICAgLy8gLS0tLS0tLS0tLVxuICAgICAgICAvL1xuXG4gICAgICAgIC8vIFN1cHBvcnQgZm9yIGluZmluaXRlIGxpc3RzLCB1c2luZyBhbiBpbml0aWFsIHNlZWQsIGEgZnVuY3Rpb24gdGhhdCBjYWxjdWxhdGVzIHRoZSBoZWFkIGZyb20gdGhlIHNlZWQgYW5kXG4gICAgICAgIC8vIGEgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIGEgbmV3IHNlZWQgZnJvbSB0aGUgY3VycmVudCBzZWVkLiAgR2VuZXJhdG9yIG9iamVjdHMgaGF2ZSB0aGlzIHN0cnVjdHVyZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHtcbiAgICAgICAgLy8gICAgICAgIFwiMFwiOiBzb21lVmFsdWUsXG4gICAgICAgIC8vICAgICAgICB0YWlsOiBzb21lRnVuY3Rpb24oKSB7fSxcbiAgICAgICAgLy8gICAgICAgIGxlbmd0aDogSW5maW5pdHlcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy9cbiAgICAgICAgLy8gR2VuZXJhdG9yIG9iamVjdHMgYWxzbyBoYXZlIHN1Y2ggZnVuY3Rpb25zIGFzIGB0YWtlYCwgYHNraXBgLCBgbWFwYCwgYW5kIGBmaWx0ZXJgLCBidXQgdGhlIGVxdWl2YWxlbnRcbiAgICAgICAgLy8gZnVuY3Rpb25zIGZyb20gUmFtZGEgd2lsbCB3b3JrIHdpdGggdGhlbSBhcyB3ZWxsLlxuICAgICAgICAvL1xuICAgICAgICAvLyAjIyMgRXhhbXBsZSAjIyNcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBmaWJvbmFjY2kgPSBnZW5lcmF0b3IoXG4gICAgICAgIC8vICAgICAgICAgWzAsIDFdLFxuICAgICAgICAvLyAgICAgICAgIGZ1bmN0aW9uKHBhaXIpIHtyZXR1cm4gcGFpclswXTt9LFxuICAgICAgICAvLyAgICAgICAgIGZ1bmN0aW9uKHBhaXIpIHtyZXR1cm4gW3BhaXJbMV0sIHBhaXJbMF0gKyBwYWlyWzFdXTt9XG4gICAgICAgIC8vICAgICApO1xuICAgICAgICAvLyAgICAgdmFyIGV2ZW4gPSBmdW5jdGlvbihuKSB7cmV0dXJuIChuICUgMikgPT09IDA7fTtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHRha2UoNSwgZmlsdGVyKGV2ZW4sIGZpYm9uYWNjaSkpIC8vPT4gWzAsIDIsIDgsIDM0LCAxNDRdXG4gICAgICAgIC8vXG4gICAgICAgIC8vIE5vdGUgdGhhdCB0aGUgYHRha2UoNSlgIGNhbGwgaXMgbmVjZXNzYXJ5IHRvIGdldCBhIGZpbml0ZSBsaXN0IG91dCBvZiB0aGlzLiAgT3RoZXJ3aXNlLCB0aGlzIHdvdWxkIHN0aWxsXG4gICAgICAgIC8vIGJlIGFuIGluZmluaXRlIGxpc3QuXG5cbiAgICAgICAgUi5nZW5lcmF0b3IgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBwYXJ0aWFsIHNoaW0gZm9yIE9iamVjdC5jcmVhdGVcbiAgICAgICAgICAgIHZhciBjcmVhdGUgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIEYgPSBmdW5jdGlvbigpIHt9O1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgRi5wcm90b3R5cGUgPSBzcmM7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRigpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KCkpO1xuXG4gICAgICAgICAgICAvLyBUcmFtcG9saW5pbmcgdG8gc3VwcG9ydCByZWN1cnNpb24gaW4gR2VuZXJhdG9yc1xuICAgICAgICAgICAgdmFyIHRyYW1wb2xpbmUgPSBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBmbi5hcHBseSh0aGlzLCB0YWlsKGFyZ3VtZW50cykpO1xuICAgICAgICAgICAgICAgIHdoaWxlICh0eXBlb2YgcmVzdWx0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gSW50ZXJuYWwgR2VuZXJhdG9yIGNvbnN0cnVjdG9yXG4gICAgICAgICAgICB2YXIgIEcgPSBmdW5jdGlvbihzZWVkLCBjdXJyZW50LCBzdGVwKSB7XG4gICAgICAgICAgICAgICAgdGhpc1tcIjBcIl0gPSBjdXJyZW50KHNlZWQpO1xuICAgICAgICAgICAgICAgIHRoaXMudGFpbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEcoc3RlcChzZWVkKSwgY3VycmVudCwgc3RlcCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBHZW5lcmF0b3JzIGNhbiBiZSB1c2VkIHdpdGggT08gdGVjaG5pcXVlcyBhcyB3ZWxsIGFzIG91ciBzdGFuZGFyZCBmdW5jdGlvbmFsIGNhbGxzLiAgVGhlc2UgYXJlIHRoZVxuICAgICAgICAgICAgLy8gaW1wbGVtZW50YXRpb25zIG9mIHRob3NlIG1ldGhvZHMgYW5kIG90aGVyIHByb3BlcnRpZXMuXG4gICAgICAgICAgICBHLnByb3RvdHlwZSA9IHtcbiAgICAgICAgICAgICAgICAgY29uc3RydWN0b3I6IEcsXG4gICAgICAgICAgICAgICAgIC8vIEFsbCBnZW5lcmF0b3JzIGFyZSBpbmZpbml0ZS5cbiAgICAgICAgICAgICAgICAgbGVuZ3RoOiBJbmZpbml0eSxcbiAgICAgICAgICAgICAgICAgLy8gYHRha2VgIGltcGxlbWVudGF0aW9uIGZvciBnZW5lcmF0b3JzLlxuICAgICAgICAgICAgICAgICB0YWtlOiBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgICAgICAgICB2YXIgdGFrZSA9IGZ1bmN0aW9uKGN0ciwgZywgcmV0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChjdHIgPT09IDApID8gcmV0IDogdGFrZShjdHIgLSAxLCBnLnRhaWwoKSwgcmV0LmNvbmNhdChbZ1swXV0pKTtcbiAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJhbXBvbGluZSh0YWtlLCBuLCB0aGlzLCBbXSk7XG4gICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgIC8vIGBza2lwYCBpbXBsZW1lbnRhdGlvbiBmb3IgZ2VuZXJhdG9ycy5cbiAgICAgICAgICAgICAgICAgc2tpcDogZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICAgICAgICAgdmFyIHNraXAgPSBmdW5jdGlvbihjdHIsIGcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGN0ciA8PSAwKSA/IGcgOiBza2lwKGN0ciAtIDEsIGcudGFpbCgpKTtcbiAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJhbXBvbGluZShza2lwLCBuLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgLy8gYG1hcGAgaW1wbGVtZW50YXRpb24gZm9yIGdlbmVyYXRvcnMuXG4gICAgICAgICAgICAgICAgIG1hcDogZnVuY3Rpb24oZm4sIGdlbikge1xuICAgICAgICAgICAgICAgICAgICAgdmFyIGcgPSBjcmVhdGUoRy5wcm90b3R5cGUpO1xuICAgICAgICAgICAgICAgICAgICAgZ1swXSA9IGZuKGdlblswXSk7XG4gICAgICAgICAgICAgICAgICAgICBnLnRhaWwgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMubWFwKGZuLCBnZW4udGFpbCgpKTsgfTtcbiAgICAgICAgICAgICAgICAgICAgIHJldHVybiBnO1xuICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAvLyBgZmlsdGVyYCBpbXBsZW1lbnRhdGlvbiBmb3IgZ2VuZXJhdG9ycy5cbiAgICAgICAgICAgICAgICAgZmlsdGVyOiBmdW5jdGlvbihmbikge1xuICAgICAgICAgICAgICAgICAgICAgdmFyIGdlbiA9IHRoaXMsIGhlYWQgPSBnZW5bMF07XG4gICAgICAgICAgICAgICAgICAgICB3aGlsZSAoIWZuKGhlYWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZ2VuID0gZ2VuLnRhaWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkID0gZ2VuWzBdO1xuICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgdmFyIGcgPSBjcmVhdGUoRy5wcm90b3R5cGUpO1xuICAgICAgICAgICAgICAgICAgICAgZ1swXSA9IGhlYWQ7XG4gICAgICAgICAgICAgICAgICAgICBnLnRhaWwgPSBmdW5jdGlvbigpIHtyZXR1cm4gZmlsdGVyKGZuLCBnZW4udGFpbCgpKTt9O1xuICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGc7XG4gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFRoZSBhY3R1YWwgcHVibGljIGBnZW5lcmF0b3JgIGZ1bmN0aW9uLlxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNlZWQsIGN1cnJlbnQsIHN0ZXApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEcoc2VlZCwgY3VycmVudCwgc3RlcCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KCkpO1xuXG5cbiAgICAgICAgLy8gRnVuY3Rpb24gZnVuY3Rpb25zIDotKVxuICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZXNlIGZ1bmN0aW9ucyBtYWtlIG5ldyBmdW5jdGlvbnMgb3V0IG9mIG9sZCBvbmVzLlxuXG4gICAgICAgIC8vIC0tLS0tLS0tXG5cbiAgICAgICAgLy8gQ3JlYXRlcyBhIG5ldyBmdW5jdGlvbiB0aGF0IHJ1bnMgZWFjaCBvZiB0aGUgZnVuY3Rpb25zIHN1cHBsaWVkIGFzIHBhcmFtZXRlcnMgaW4gdHVybiwgcGFzc2luZyB0aGUgb3V0cHV0XG4gICAgICAgIC8vIG9mIGVhY2ggb25lIHRvIHRoZSBuZXh0IG9uZSwgc3RhcnRpbmcgd2l0aCB3aGF0ZXZlciBhcmd1bWVudHMgd2VyZSBwYXNzZWQgdG8gdGhlIGluaXRpYWwgaW52b2NhdGlvbi5cbiAgICAgICAgLy8gTm90ZSB0aGF0IGlmIGB2YXIgaCA9IGNvbXBvc2UoZiwgZylgLCBgaCh4KWAgY2FsbHMgYGcoeClgIGZpcnN0LCBwYXNzaW5nIHRoZSByZXN1bHQgb2YgdGhhdCB0byBgZigpYC5cbiAgICAgICAgdmFyIGNvbXBvc2UgPSBSLmNvbXBvc2UgPSBmdW5jdGlvbigpIHsgIC8vIFRPRE86IHR5cGUgY2hlY2sgb2YgYXJndW1lbnRzP1xuICAgICAgICAgICAgdmFyIGZucyA9IHNsaWNlKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvbGRyKGZ1bmN0aW9uKGFyZ3MsIGZuKSB7IHJldHVybiBbZm4uYXBwbHkodGhpcywgYXJncyldOyB9LCBzbGljZShhcmd1bWVudHMpLCBmbnMpWzBdO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTaW1pbGFyIHRvIGBjb21wb3NlYCwgYnV0IHByb2Nlc3NlcyB0aGUgZnVuY3Rpb25zIGluIHRoZSByZXZlcnNlIG9yZGVyIHNvIHRoYXQgaWYgaWYgYHZhciBoID0gcGlwZShmLCBnKWAsXG4gICAgICAgIC8vIGBoKHgpYCBjYWxscyBgZih4KWAgZmlyc3QsIHBhc3NpbmcgdGhlIHJlc3VsdCBvZiB0aGF0IHRvIGBnKClgLlxuICAgICAgICBSLnBpcGUgPSBmdW5jdGlvbigpIHsgLy8gVE9ETzogdHlwZSBjaGVjayBvZiBhcmd1bWVudHM/XG4gICAgICAgICAgICByZXR1cm4gY29tcG9zZS5hcHBseSh0aGlzLCBzbGljZShhcmd1bWVudHMpLnJldmVyc2UoKSk7XG4gICAgICAgIH07XG4gICAgICAgIGFsaWFzRm9yKFwicGlwZVwiKS5pcyhcInNlcXVlbmNlXCIpO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgZnVuY3Rpb24gbXVjaCBsaWtlIHRoZSBzdXBwbGllZCBvbmUgZXhjZXB0IHRoYXQgdGhlIGZpcnN0IHR3byBhcmd1bWVudHMgYXJlIGludmVydGVkLlxuICAgICAgICB2YXIgZmxpcCA9IFIuZmxpcCA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgICAgICByZXR1cm4gXyhmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIFtiLCBhXS5jb25jYXQoc2xpY2UoYXJndW1lbnRzLCAyKSkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbi8vICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGZ1bmN0aW9uIG11Y2ggbGlrZSB0aGUgc3VwcGxpZWQgb25lIGV4Y2VwdCB0aGF0IHRoZSBmaXJzdCBhcmd1bWVudCBpcyBjeWNsZWQgdG8gdGhlIGVuZC5cbi8vICAgICAgICBSLmN5Y2xlID0gZnVuY3Rpb24oZm4pIHtcbi8vICAgICAgICAgICAgcmV0dXJuIG5BcnkoZm4ubGVuZ3RoLCBmdW5jdGlvbigpIHtcbi8vICAgICAgICAgICAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBzbGljZShhcmd1bWVudHMsIDEsIGZuLmxlbmd0aCkuY29uY2F0KGFyZ3VtZW50c1swXSkpO1xuLy8gICAgICAgICAgICB9KTtcbi8vICAgICAgICB9O1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgZnVuY3Rpb24gdGhhdCBhY3RzIGxpa2UgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uIGV4Y2VwdCB0aGF0IHRoZSBsZWZ0LW1vc3QgcGFyYW1ldGVycyBhcmVcbiAgICAgICAgLy8gcHJlLWZpbGxlZC5cbiAgICAgICAgUi5sUGFydGlhbCA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIGFyaXR5KE1hdGgubWF4KGZuLmxlbmd0aCAtIGFyZ3MubGVuZ3RoLCAwKSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MuY29uY2F0KHNsaWNlKGFyZ3VtZW50cykpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBhbGlhc0ZvcihcImxQYXJ0aWFsXCIpLmlzKFwiYXBwbHlMZWZ0XCIpO1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgZnVuY3Rpb24gdGhhdCBhY3RzIGxpa2UgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uIGV4Y2VwdCB0aGF0IHRoZSByaWdodC1tb3N0IHBhcmFtZXRlcnMgYXJlXG4gICAgICAgIC8vIHByZS1maWxsZWQuXG4gICAgICAgIFIuclBhcnRpYWwgPWZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzbGljZShhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIGFyaXR5KE1hdGgubWF4KGZuLmxlbmd0aCAtIGFyZ3MubGVuZ3RoLCAwKSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIHNsaWNlKGFyZ3VtZW50cykuY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBhbGlhc0ZvcihcInJQYXJ0aWFsXCIpLmlzKFwiYXBwbHlSaWdodFwiKTtcblxuICAgICAgICAvLyBDcmVhdGVzIGEgbmV3IGZ1bmN0aW9uIHRoYXQgc3RvcmVzIHRoZSByZXN1bHRzIG9mIHJ1bm5pbmcgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uIGFuZCByZXR1cm5zIHRob3NlXG4gICAgICAgIC8vIHN0b3JlZCB2YWx1ZSB3aGVuIHRoZSBzYW1lIHJlcXVlc3QgaXMgbWFkZS4gICoqTm90ZSoqOiB0aGlzIHJlYWxseSBvbmx5IGhhbmRsZXMgc3RyaW5nIGFuZCBudW1iZXIgcGFyYW1ldGVycy5cbiAgICAgICAgUi5tZW1vaXplID0gZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgICAgIHZhciBjYWNoZSA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBwb3NpdGlvbiA9IGZvbGRsKGZ1bmN0aW9uKGNhY2hlLCBhcmcpIHtyZXR1cm4gY2FjaGVbYXJnXSB8fCAoY2FjaGVbYXJnXSA9IHt9KTt9LCBjYWNoZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNsaWNlKGFyZ3VtZW50cywgMCwgYXJndW1lbnRzLmxlbmd0aCAtIDEpKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHBvc2l0aW9uW2FyZ10gfHwgKHBvc2l0aW9uW2FyZ10gPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpKSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFdyYXBzIGEgZnVuY3Rpb24gdXAgaW4gb25lIHRoYXQgd2lsbCBvbmx5IGNhbGwgdGhlIGludGVybmFsIG9uZSBvbmNlLCBubyBtYXR0ZXIgaG93IG1hbnkgdGltZXMgdGhlIG91dGVyIG9uZVxuICAgICAgICAvLyBpcyBjYWxsZWQuICAqKiBOb3RlKio6IHRoaXMgaXMgbm90IHJlYWxseSBwdXJlOyBpdCdzIG1vc3RseSBtZWFudCB0byBrZWVwIHNpZGUtZWZmZWN0cyBmcm9tIHJlcGVhdGluZy5cbiAgICAgICAgUi5vbmNlID0gZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgICAgIHZhciBjYWxsZWQgPSBmYWxzZSwgcmVzdWx0O1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsZWQpIHtyZXR1cm4gcmVzdWx0O31cbiAgICAgICAgICAgICAgICBjYWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gV3JhcCBhIGZ1bmN0aW9uIGluc2lkZSBhbm90aGVyIHRvIGFsbG93IHlvdSB0byBtYWtlIGFkanVzdG1lbnRzIHRvIHRoZSBwYXJhbWV0ZXJzIG9yIGRvIG90aGVyIHByb2Nlc3NpbmdcbiAgICAgICAgLy8gZWl0aGVyIGJlZm9yZSB0aGUgaW50ZXJuYWwgZnVuY3Rpb24gaXMgY2FsbGVkIG9yIHdpdGggaXRzIHJlc3VsdHMuXG4gICAgICAgIFIud3JhcCA9IGZ1bmN0aW9uKGZuLCB3cmFwcGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdyYXBwZXIuYXBwbHkodGhpcywgW2ZuXS5jb25jYXQoc2xpY2UoYXJndW1lbnRzKSkpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBXcmFwcyBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGluc2lkZSBhIChjdXJyaWVkKSBwbGFpbiBmdW5jdGlvbiB0aGF0IGNhbiBiZSBjYWxsZWQgd2l0aCB0aGUgc2FtZSBhcmd1bWVudHNcbiAgICAgICAgLy8gYW5kIHJldHVybnMgdGhlIHNhbWUgdHlwZS4gIEFsbG93cywgZm9yIGluc3RhbmNlLFxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIFdpZGdldCA9IGZ1bmN0aW9uKGNvbmZpZykgeyAvKiAuLi4gKi8gfTsgLy8gQ29uc3RydWN0b3JcbiAgICAgICAgLy8gICAgIFdpZGdldC5wcm90b3R5cGUgPSB7IC8qIC4uLiAqLyB9XG4gICAgICAgIC8vICAgICBtYXAoY29uc3RydWN0KFdpZGdldCksIGFsbENvbmZpZ3MpOyAvLz0+IGxpc3Qgb2YgV2lkZ2V0c1xuICAgICAgICBSLmNvbnN0cnVjdCA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgICAgICB2YXIgZiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBvYmogPSBuZXcgZm4oKTtcbiAgICAgICAgICAgICAgICBmbi5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZm4ubGVuZ3RoID4gMSA/IF8obkFyeShmbi5sZW5ndGgsIGYpKSA6IGY7XG4gICAgICAgIH07XG5cblxuXG4gICAgICAgIC8vIExpc3QgRnVuY3Rpb25zXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZXNlIGZ1bmN0aW9ucyBvcGVyYXRlIG9uIGxvZ2ljYWwgbGlzdHMsIGhlcmUgcGxhaW4gYXJyYXlzLiAgQWxtb3N0IGFsbCBvZiB0aGVzZSBhcmUgY3VycmllZCwgYW5kIHRoZSBsaXN0XG4gICAgICAgIC8vIHBhcmFtZXRlciBjb21lcyBsYXN0LCBzbyB5b3UgY2FuIGNyZWF0ZSBhIG5ldyBmdW5jdGlvbiBieSBzdXBwbHlpbmcgdGhlIHByZWNlZGluZyBhcmd1bWVudHMsIGxlYXZpbmcgdGhlXG4gICAgICAgIC8vIGxpc3QgcGFyYW1ldGVyIG9mZi4gIEZvciBpbnN0YW5jZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIC8vIHNraXAgdGhpcmQgcGFyYW1ldGVyXG4gICAgICAgIC8vICAgICB2YXIgY2hlY2tBbGxQcmVkaWNhdGVzID0gcmVkdWNlKGFuZEZuLCBhbHdheXNUcnVlKTtcbiAgICAgICAgLy8gICAgIC8vIC4uLiBnaXZlbiBzdWl0YWJsZSBkZWZpbml0aW9ucyBvZiBvZGQsIGx0MjAsIGd0NVxuICAgICAgICAvLyAgICAgdmFyIHRlc3QgPSBjaGVja0FsbFByZWRpY2F0ZXMoW29kZCwgbHQyMCwgZ3Q1XSk7XG4gICAgICAgIC8vICAgICAvLyB0ZXN0KDcpID0+IHRydWUsIHRlc3QoOSkgPT4gdHJ1ZSwgdGVzdCgxMCkgPT4gZmFsc2UsXG4gICAgICAgIC8vICAgICAvLyB0ZXN0KDMpID0+IGZhbHNlLCB0ZXN0KDIxKSA9PiBmYWxzZSxcblxuICAgICAgICAvLyAtLS0tLS0tLVxuXG4gICAgICAgIC8vIFJldHVybnMgYSBzaW5nbGUgaXRlbSwgYnkgc3VjY2Vzc2l2ZWx5IGNhbGxpbmcgdGhlIGZ1bmN0aW9uIHdpdGggdGhlIGN1cnJlbnQgZWxlbWVudCBhbmQgdGhlIHRoZSBuZXh0XG4gICAgICAgIC8vIGVsZW1lbnQgb2YgdGhlIGxpc3QsIHBhc3NpbmcgdGhlIHJlc3VsdCB0byB0aGUgbmV4dCBjYWxsLiAgV2Ugc3RhcnQgd2l0aCB0aGUgYGFjY2AgcGFyYW1ldGVyIHRvIGdldFxuICAgICAgICAvLyB0aGluZ3MgZ29pbmcuICBUaGUgZnVuY3Rpb24gc3VwcGxpZWQgc2hvdWxkIGFjY2VwdCB0aGlzIHJ1bm5pbmcgdmFsdWUgYW5kIHRoZSBsYXRlc3QgZWxlbWVudCBvZiB0aGUgbGlzdCxcbiAgICAgICAgLy8gYW5kIHJldHVybiBhbiB1cGRhdGVkIHZhbHVlLlxuICAgICAgICB2YXIgZm9sZGwgPSBSLmZvbGRsID0gXyhmdW5jdGlvbihmbiwgYWNjLCBsaXN0KSB7XG4gICAgICAgICAgICB2YXIgaWR4ID0gLTEsIGxlbiA9IGxpc3QubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUoKytpZHggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICBhY2MgPSBmbihhY2MsIGxpc3RbaWR4XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9KTtcbiAgICAgICAgYWxpYXNGb3IoXCJmb2xkbFwiKS5pcyhcInJlZHVjZVwiKTtcblxuICAgICAgICAvLyBNdWNoIGxpa2UgYGZvbGRsYC9gcmVkdWNlYCwgZXhjZXB0IHRoYXQgdGhpcyB0YWtlcyBhcyBpdHMgc3RhcnRpbmcgdmFsdWUgdGhlIGZpcnN0IGVsZW1lbnQgaW4gdGhlIGxpc3QuXG4gICAgICAgIFIuZm9sZGwxID0gXyhmdW5jdGlvbiAoZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIGlmIChpc0VtcHR5KGxpc3QpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZm9sZGwxIGRvZXMgbm90IHdvcmsgb24gZW1wdHkgbGlzdHNcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZm9sZGwoZm4sIGhlYWQobGlzdCksIHRhaWwobGlzdCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTaW1pbGFyIHRvIGBmb2xkbGAvYHJlZHVjZWAgZXhjZXB0IHRoYXQgaXQgbW92ZXMgZnJvbSByaWdodCB0byBsZWZ0IG9uIHRoZSBsaXN0LlxuICAgICAgICB2YXIgZm9sZHIgPSBSLmZvbGRyID1fKGZ1bmN0aW9uKGZuLCBhY2MsIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpZHggPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlKGlkeC0tKSB7XG4gICAgICAgICAgICAgICAgYWNjID0gZm4oYWNjLCBsaXN0W2lkeF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFjYztcblxuICAgICAgICB9KTtcbiAgICAgICAgYWxpYXNGb3IoXCJmb2xkclwiKS5pcyhcInJlZHVjZVJpZ2h0XCIpO1xuXG5cbiAgICAgICAgLy8gTXVjaCBsaWtlIGBmb2xkcmAvYHJlZHVjZVJpZ2h0YCwgZXhjZXB0IHRoYXQgdGhpcyB0YWtlcyBhcyBpdHMgc3RhcnRpbmcgdmFsdWUgdGhlIGxhc3QgZWxlbWVudCBpbiB0aGUgbGlzdC5cbiAgICAgICAgUi5mb2xkcjEgPSBfKGZ1bmN0aW9uIChmbiwgbGlzdCkge1xuICAgICAgICAgICAgaWYgKGlzRW1wdHkobGlzdCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmb2xkcjEgZG9lcyBub3Qgd29yayBvbiBlbXB0eSBsaXN0c1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBuZXdMaXN0ID0gY2xvbmUobGlzdCksIGFjYyA9IG5ld0xpc3QucG9wKCk7XG4gICAgICAgICAgICByZXR1cm4gZm9sZHIoZm4sIGFjYywgbmV3TGlzdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJ1aWxkcyBhIGxpc3QgZnJvbSBhIHNlZWQgdmFsdWUsIHVzaW5nIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGZhbHN5IHRvIHF1aXQgYW5kIGEgcGFpciBvdGhlcndpc2UsXG4gICAgICAgIC8vIGNvbnNpc3Rpbmcgb2YgdGhlIGN1cnJlbnQgdmFsdWUgYW5kIHRoZSBzZWVkIHRvIGJlIHVzZWQgZm9yIHRoZSBuZXh0IHZhbHVlLlxuXG4gICAgICAgIFIudW5mb2xkciA9IF8oZnVuY3Rpb24oZm4sIHNlZWQpIHtcbiAgICAgICAgICAgIHZhciBwYWlyID0gZm4oc2VlZCksIHJlc3VsdCA9IFtdO1xuICAgICAgICAgICAgd2hpbGUgKHBhaXIgJiYgcGFpci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChwYWlyWzBdKTtcbiAgICAgICAgICAgICAgICBwYWlyID0gZm4ocGFpclsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCBjb25zdHJ1Y3RlZCBieSBhcHBseWluZyB0aGUgZnVuY3Rpb24gdG8gZXZlcnkgZWxlbWVudCBvZiB0aGUgbGlzdCBzdXBwbGllZC5cbiAgICAgICAgdmFyIG1hcCA9IFIubWFwID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgaWYgKGxpc3QgJiYgbGlzdC5sZW5ndGggPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpc3QubWFwKGZuLCBsaXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpZHggPSAtMSwgbGVuID0gbGlzdC5sZW5ndGgsIHJlc3VsdCA9IG5ldyBBcnJheShsZW4pO1xuICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0W2lkeF0gPSBmbihsaXN0W2lkeF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVwb3J0cyB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIHRoZSBsaXN0XG4gICAgICAgIFIuc2l6ZSA9IGZ1bmN0aW9uKGFycikge3JldHVybiBhcnIubGVuZ3RoO307XG5cbiAgICAgICAgLy8gKEludGVybmFsIHVzZSBvbmx5KSBUaGUgYmFzaWMgaW1wbGVtZW50YXRpb24gb2YgZmlsdGVyLlxuICAgICAgICB2YXIgaW50ZXJuYWxGaWx0ZXIgPSBfKGZ1bmN0aW9uKHVzZUlkeCwgZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIGlmIChsaXN0ICYmIGxpc3QubGVuZ3RoID09PSBJbmZpbml0eSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBsaXN0LmZpbHRlcihmbik7IC8vIFRPRE86IGZpZ3VyZSBvdXQgdXNlSWR4XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaWR4ID0gLTEsIGxlbiA9IGxpc3QubGVuZ3RoLCByZXN1bHQgPSBbXTtcbiAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IGxlbikge1xuICAgICAgICAgICAgICAgIGlmICghdXNlSWR4ICYmIGZuKGxpc3RbaWR4XSkgfHwgZm4obGlzdFtpZHhdLCBpZHgsIGxpc3QpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGxpc3RbaWR4XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IGNvbnRhaW5pbmcgb25seSB0aG9zZSBpdGVtcyB0aGF0IG1hdGNoIGEgZ2l2ZW4gcHJlZGljYXRlIGZ1bmN0aW9uLlxuICAgICAgICB2YXIgZmlsdGVyID0gUi5maWx0ZXIgPSBpbnRlcm5hbEZpbHRlcihmYWxzZSk7XG5cbiAgICAgICAgLy8gTGlrZSBgZmlsdGVyYCwgYnV0IHBhc3NlcyBhZGRpdGlvbmFsIHBhcmFtZXRlcnMgdG8gdGhlIHByZWRpY2F0ZSBmdW5jdGlvbi4gIFBhcmFtZXRlcnMgYXJlXG4gICAgICAgIC8vIGBsaXN0IGl0ZW1gLCBgaW5kZXggb2YgaXRlbSBpbiBsaXN0YCwgYGVudGlyZSBsaXN0YC5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gRXhhbXBsZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBsYXN0VHdvID0gZnVuY3Rpb24odmFsLCBpZHgsIGxpc3QpIHtcbiAgICAgICAgLy8gICAgICAgICByZXR1cm4gbGlzdC5sZW5ndGggLSBpZHggPD0gMjtcbiAgICAgICAgLy8gICAgIH07XG4gICAgICAgIC8vICAgICBmaWx0ZXIuaWR4KGxhc3RUd28sIFs4LCA2LCA3LCA1LCAzLCAwICw5XSk7IC8vPT4gWzAsIDldXG4gICAgICAgIGZpbHRlci5pZHggPSBpbnRlcm5hbEZpbHRlcih0cnVlKTtcblxuICAgICAgICAvLyBTaW1pbGFyIHRvIGBmaWx0ZXJgLCBleGNlcHQgdGhhdCBpdCBrZWVwcyBvbmx5IHRob3NlIHRoYXQgKipkb24ndCoqIG1hdGNoIHRoZSBnaXZlbiBwcmVkaWNhdGUgZnVuY3Rpb25zLlxuICAgICAgICB2YXIgcmVqZWN0ID0gUi5yZWplY3QgPSBfKGZ1bmN0aW9uKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyKG5vdEZuKGZuKSwgbGlzdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIExpa2UgYHJlamVjdGAsIGJ1dCBwYXNzZXMgYWRkaXRpb25hbCBwYXJhbWV0ZXJzIHRvIHRoZSBwcmVkaWNhdGUgZnVuY3Rpb24uICBQYXJhbWV0ZXJzIGFyZVxuICAgICAgICAvLyBgbGlzdCBpdGVtYCwgYGluZGV4IG9mIGl0ZW0gaW4gbGlzdGAsIGBlbnRpcmUgbGlzdGAuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIEV4YW1wbGU6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgbGFzdFR3byA9IGZ1bmN0aW9uKHZhbCwgaWR4LCBsaXN0KSB7XG4gICAgICAgIC8vICAgICAgICAgcmV0dXJuIGxpc3QubGVuZ3RoIC0gaWR4IDw9IDI7XG4gICAgICAgIC8vICAgICB9O1xuICAgICAgICAvLyAgICAgcmVqZWN0LmlkeChsYXN0VHdvLCBbOCwgNiwgNywgNSwgMywgMCAsOV0pO1xuICAgICAgICAvLyAgICAgLy89PiBbOCwgNiwgNywgNSwgM11cbiAgICAgICAgcmVqZWN0LmlkeCA9IF8oZnVuY3Rpb24oZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXIuaWR4KG5vdEZuKGZuKSwgbGlzdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCBjb250YWluaW5nIHRoZSBlbGVtZW50cyBvZiB0aGUgZ2l2ZW4gbGlzdCB1cCB1bnRpbCB0aGUgZmlyc3Qgb25lIHdoZXJlIHRoZSBmdW5jdGlvblxuICAgICAgICAvLyBzdXBwbGllZCByZXR1cm5zIGBmYWxzZWAgd2hlbiBwYXNzZWQgdGhlIGVsZW1lbnQuXG4gICAgICAgIFIudGFrZVdoaWxlID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgdmFyIGlkeCA9IC0xLCBsZW4gPSBsaXN0Lmxlbmd0aCwgdGFraW5nID0gdHJ1ZSwgcmVzdWx0ID0gW107XG4gICAgICAgICAgICB3aGlsZSAodGFraW5nKSB7XG4gICAgICAgICAgICAgICAgKytpZHg7XG4gICAgICAgICAgICAgICAgaWYgKGlkeCA8IGxlbiAmJiBmbihsaXN0W2lkeF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGxpc3RbaWR4XSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFraW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIG5ldyBsaXN0IGNvbnRhaW5pbmcgdGhlIGZpcnN0IGBuYCBlbGVtZW50cyBvZiB0aGUgZ2l2ZW4gbGlzdC5cbiAgICAgICAgUi50YWtlID0gXyhmdW5jdGlvbihuLCBsaXN0KSB7XG4gICAgICAgICAgICBpZiAobGlzdCAmJiBsaXN0Lmxlbmd0aCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlzdC50YWtlKG4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGxzID0gY2xvbmUobGlzdCk7XG4gICAgICAgICAgICBscy5sZW5ndGggPSBuO1xuICAgICAgICAgICAgcmV0dXJuIGxzO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGxpc3QgY29udGFpbmluZyB0aGUgZWxlbWVudHMgb2YgdGhlIGdpdmVuIGxpc3Qgc3RhcnRpbmcgd2l0aCB0aGUgZmlyc3Qgb25lIHdoZXJlIHRoZSBmdW5jdGlvblxuICAgICAgICAvLyBzdXBwbGllZCByZXR1cm5zIGBmYWxzZWAgd2hlbiBwYXNzZWQgdGhlIGVsZW1lbnQuXG4gICAgICAgIFIuc2tpcFVudGlsID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgdmFyIGlkeCA9IC0xLCBsZW4gPSBsaXN0Lmxlbmd0aCwgdGFraW5nID0gZmFsc2UsIHJlc3VsdCA9IFtdO1xuICAgICAgICAgICAgd2hpbGUgKCF0YWtpbmcpIHtcbiAgICAgICAgICAgICAgICArK2lkeDtcbiAgICAgICAgICAgICAgICBpZiAoaWR4ID49IGxlbiB8fCBmbihsaXN0W2lkeF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHRha2luZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKGlkeCA8IGxlbikge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGxpc3RbaWR4KytdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCBjb250YWluaW5nIGFsbCAqKmJ1dCoqIHRoZSBmaXJzdCBgbmAgZWxlbWVudHMgb2YgdGhlIGdpdmVuIGxpc3QuXG4gICAgICAgIFIuc2tpcCA9IF8oZnVuY3Rpb24obiwgbGlzdCkge1xuICAgICAgICAgICAgaWYgKGxpc3QgJiYgbGlzdC5sZW5ndGggPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpc3Quc2tpcChuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzbGljZShsaXN0LCBuKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGFsaWFzRm9yKCdza2lwJykuaXMoJ2Ryb3AnKTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBlbGVtZW50IG9mIHRoZSBsaXN0IHdoaWNoIG1hdGNoZXMgdGhlIHByZWRpY2F0ZSwgb3IgYGZhbHNlYCBpZiBubyBlbGVtZW50IG1hdGNoZXMuXG4gICAgICAgIFIuZmluZCA9IF8oZnVuY3Rpb24oZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpZHggPSAtMSwgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICBpZiAoZm4obGlzdFtpZHhdKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlzdFtpZHhdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyB0aGUgaW5kZXggb2YgZmlyc3QgZWxlbWVudCBvZiB0aGUgbGlzdCB3aGljaCBtYXRjaGVzIHRoZSBwcmVkaWNhdGUsIG9yIGBmYWxzZWAgaWYgbm8gZWxlbWVudCBtYXRjaGVzLlxuICAgICAgICBSLmZpbmRJbmRleCA9IF8oZnVuY3Rpb24oZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpZHggPSAtMSwgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICBpZiAoZm4obGlzdFtpZHhdKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaWR4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyB0aGUgbGFzdCBlbGVtZW50IG9mIHRoZSBsaXN0IHdoaWNoIG1hdGNoZXMgdGhlIHByZWRpY2F0ZSwgb3IgYGZhbHNlYCBpZiBubyBlbGVtZW50IG1hdGNoZXMuXG4gICAgICAgIFIuZmluZExhc3QgPSBfKGZ1bmN0aW9uKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICB2YXIgaWR4ID0gbGlzdC5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoLS1pZHgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZm4obGlzdFtpZHhdKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlzdFtpZHhdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyB0aGUgaW5kZXggb2YgbGFzdCBlbGVtZW50IG9mIHRoZSBsaXN0IHdoaWNoIG1hdGNoZXMgdGhlIHByZWRpY2F0ZSwgb3IgYGZhbHNlYCBpZiBubyBlbGVtZW50IG1hdGNoZXMuXG4gICAgICAgIFIuZmluZExhc3RJbmRleCA9IF8oZnVuY3Rpb24oZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpZHggPSBsaXN0Lmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgtLWlkeCkge1xuICAgICAgICAgICAgICAgIGlmIChmbihsaXN0W2lkeF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpZHg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIGB0cnVlYCBpZiBhbGwgZWxlbWVudHMgb2YgdGhlIGxpc3QgbWF0Y2ggdGhlIHByZWRpY2F0ZSwgYGZhbHNlYCBpZiB0aGVyZSBhcmUgYW55IHRoYXQgZG9uJ3QuXG4gICAgICAgIHZhciBhbGwgPSBSLmFsbCA9IF8oZnVuY3Rpb24gKGZuLCBsaXN0KSB7XG4gICAgICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICAgICAgd2hpbGUgKCsraSA8IGxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFmbihsaXN0W2ldKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICBhbGlhc0ZvcihcImFsbFwiKS5pcyhcImV2ZXJ5XCIpO1xuXG5cbiAgICAgICAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgYW55IGVsZW1lbnRzIG9mIHRoZSBsaXN0IG1hdGNoIHRoZSBwcmVkaWNhdGUsIGBmYWxzZWAgaWYgbm9uZSBkby5cbiAgICAgICAgdmFyIGFueSA9IFIuYW55ID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBsaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChmbihsaXN0W2ldKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICBhbGlhc0ZvcihcImFueVwiKS5pcyhcInNvbWVcIik7XG5cbiAgICAgICAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGxpc3QgY29udGFpbnMgdGhlIHNvdWdodCBlbGVtZW50LCBgZmFsc2VgIGlmIGl0IGRvZXMgbm90LiAgRXF1YWxpdHkgaXMgc3RyaWN0IGhlcmUsXG4gICAgICAgIC8vIG1lYW5pbmcgcmVmZXJlbmNlIGVxdWFsaXR5IGZvciBvYmplY3RzIGFuZCBub24tY29lcmNpbmcgZXF1YWxpdHkgZm9yIHByaW1pdGl2ZXMuXG4gICAgICAgIHZhciBjb250YWlucyA9IFIuY29udGFpbnMgPSBfKGZ1bmN0aW9uKGEsIGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBsaXN0LmluZGV4T2YoYSkgPiAtMTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGxpc3QgY29udGFpbnMgdGhlIHNvdWdodCBlbGVtZW50LCBgZmFsc2VgIGlmIGl0IGRvZXMgbm90LCBiYXNlZCB1cG9uIHRoZSB2YWx1ZVxuICAgICAgICAvLyByZXR1cm5lZCBieSBhcHBseWluZyB0aGUgc3VwcGxpZWQgcHJlZGljYXRlZCB0byB0d28gbGlzdCBlbGVtZW50cy4gIEVxdWFsaXR5IGlzIHN0cmljdCBoZXJlLCBtZWFuaW5nXG4gICAgICAgIC8vIHJlZmVyZW5jZSBlcXVhbGl0eSBmb3Igb2JqZWN0cyBhbmQgbm9uLWNvZXJjaW5nIGVxdWFsaXR5IGZvciBwcmltaXRpdmVzLiAgUHJvYmFibHkgaW5lZmZpY2llbnQuXG4gICAgICAgIHZhciBjb250YWluc1dpdGggPSBfKGZ1bmN0aW9uKHByZWQsIHgsIGxpc3QpIHtcbiAgICAgICAgICAgIHZhciBpZHggPSAtMSwgbGVuID0gbGlzdC5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICBpZiAocHJlZCh4LCBsaXN0W2lkeF0pKSB7cmV0dXJuIHRydWU7fVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGxpc3QgY29udGFpbmluZyBvbmx5IG9uZSBjb3B5IG9mIGVhY2ggZWxlbWVudCBpbiB0aGUgb3JpZ2luYWwgbGlzdC4gIEVxdWFsaXR5IGlzIHN0cmljdCBoZXJlLFxuICAgICAgICAvLyBtZWFuaW5nIHJlZmVyZW5jZSBlcXVhbGl0eSBmb3Igb2JqZWN0cyBhbmQgbm9uLWNvZXJjaW5nIGVxdWFsaXR5IGZvciBwcmltaXRpdmVzLlxuICAgICAgICB2YXIgdW5pcSA9IFIudW5pcSA9IGZ1bmN0aW9uKGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBmb2xkcihmdW5jdGlvbihhY2MsIHgpIHsgcmV0dXJuIChjb250YWlucyh4LCBhY2MpKSA/IGFjYyA6IHByZXBlbmQoeCwgYWNjKTsgfSwgRU1QVFksIGxpc3QpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCBjb250YWluaW5nIG9ubHkgb25lIGNvcHkgb2YgZWFjaCBlbGVtZW50IGluIHRoZSBvcmlnaW5hbCBsaXN0LCBiYXNlZCB1cG9uIHRoZSB2YWx1ZVxuICAgICAgICAvLyByZXR1cm5lZCBieSBhcHBseWluZyB0aGUgc3VwcGxpZWQgcHJlZGljYXRlIHRvIHR3byBsaXN0IGVsZW1lbnRzLiAgIEVxdWFsaXR5IGlzIHN0cmljdCBoZXJlLCAgbWVhbmluZ1xuICAgICAgICAvLyByZWZlcmVuY2UgZXF1YWxpdHkgZm9yIG9iamVjdHMgYW5kIG5vbi1jb2VyY2luZyBlcXVhbGl0eSBmb3IgcHJpbWl0aXZlcy5cbiAgICAgICAgdmFyIHVuaXFXaXRoID0gXyhmdW5jdGlvbihwcmVkLCBsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gZm9sZHIoZnVuY3Rpb24oYWNjLCB4KSB7cmV0dXJuIChjb250YWluc1dpdGgocHJlZCwgeCwgYWNjKSkgPyBhY2MgOiBwcmVwZW5kKHgsIGFjYyk7IH0sIEVNUFRZLCBsaXN0KTtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBSZXR1cm5zIGEgbmV3IGxpc3QgYnkgcGx1Y2tpbmcgdGhlIHNhbWUgbmFtZWQgcHJvcGVydHkgb2ZmIGFsbCBvYmplY3RzIGluIHRoZSBsaXN0IHN1cHBsaWVkLlxuICAgICAgICB2YXIgcGx1Y2sgPSBSLnBsdWNrID0gXyhmdW5jdGlvbihwLCBsaXN0KSB7cmV0dXJuIG1hcChwcm9wKHApLCBsaXN0KTt9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbGlzdCB0aGF0IGNvbnRhaW5zIGEgZmxhdHRlbmVkIHZlcnNpb24gb2YgdGhlIHN1cHBsaWVkIGxpc3QuICBGb3IgZXhhbXBsZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIGZsYXR0ZW4oWzEsIDIsIFszLCA0XSwgNSwgWzYsIFs3LCA4LCBbOSwgWzEwLCAxMV0sIDEyXV1dXSk7XG4gICAgICAgIC8vICAgICAvLyA9PiBbMSwgMiwgMywgNCwgNSwgNiwgNywgOCwgOSwgMTAsIDExLCAxMl07XG4gICAgICAgIHZhciBmbGF0dGVuID0gUi5mbGF0dGVuID0gZnVuY3Rpb24obGlzdCkge1xuICAgICAgICAgICAgdmFyIGlkeCA9IC0xLCBsZW4gPSBsaXN0ID8gbGlzdC5sZW5ndGggOiAwLCByZXN1bHQgPSBbXSwgcHVzaCA9IHJlc3VsdC5wdXNoLCB2YWw7XG4gICAgICAgICAgICB3aGlsZSAoKytpZHggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICB2YWwgPSBsaXN0W2lkeF07XG4gICAgICAgICAgICAgICAgcHVzaC5hcHBseShyZXN1bHQsIGlzQXJyYXkodmFsKSA/IGZsYXR0ZW4odmFsKSA6IFt2YWxdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH07XG5cblxuICAgICAgICAvLyBDcmVhdGVzIGEgbmV3IGxpc3Qgb3V0IG9mIHRoZSB0d28gc3VwcGxpZWQgYnkgYXBwbHlpbmcgdGhlIGZ1bmN0aW9uIHRvIGVhY2ggZXF1YWxseS1wb3NpdGlvbmVkIHBhaXIgaW4gdGhlXG4gICAgICAgIC8vIGxpc3RzLiAgRm9yIGV4YW1wbGUsXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB6aXBXaXRoKGYsIFsxLCAyLCAzXSwgWydhJywgJ2InLCAnYyddKVxuICAgICAgICAvLyAgICAgLy8gICAgPT4gW2YoMSwgJ2EnKSwgZigyLCAnYicpLCBmKDMsICdjJyldO1xuICAgICAgICAvL1xuICAgICAgICAvLyBOb3RlIHRoYXQgdGhlIG91dHB1dCBsaXN0IHdpbGwgb25seSBiZSBhcyBsb25nIGFzIHRoZSBsZW5ndGggb3MgdGhlIGZpcnN0IGxpc3QgcGFzc2VkIGluLlxuICAgICAgICBSLnppcFdpdGggPSBfKGZ1bmN0aW9uKGZuLCBhLCBiKSB7XG4gICAgICAgICAgICB2YXIgcnYgPSBbXSwgaSA9IC0xLCBsZW4gPSBhLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlKCsraSA8IGxlbikge1xuICAgICAgICAgICAgICAgIHJ2W2ldID0gZm4oYVtpXSwgYltpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcnY7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgbGlzdCBvdXQgb2YgdGhlIHR3byBzdXBwbGllZCBieSB5aWVsZGluZyB0aGUgcGFpciBvZiBlYWNoIGVxdWFsbHktcG9zaXRpb25lZCBwYWlyIGluIHRoZVxuICAgICAgICAvLyBsaXN0cy4gIEZvciBleGFtcGxlLFxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgemlwKFsxLCAyLCAzXSwgWydhJywgJ2InLCAnYyddKVxuICAgICAgICAvLyAgICAgLy8gICAgPT4gW1sxLCAnYSddLCBbMiwgJ2InXSwgWzMsICdjJ11dO1xuICAgICAgICBSLnppcCA9ICBfKGZ1bmN0aW9uKGEsIGIpIHsgLy8gPSB6aXBXaXRoKHByZXBlbmQpO1xuICAgICAgICAgICAgdmFyIHJ2ID0gW10sIGkgPSAtMSwgbGVuID0gYS5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgcnZbaV0gPSBbYVtpXSwgYltpXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcnY7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgbGlzdCBvdXQgb2YgdGhlIHR3byBzdXBwbGllZCBieSBhcHBseWluZyB0aGUgZnVuY3Rpb24gdG8gZWFjaCBwb3NzaWJsZSBwYWlyIGluIHRoZSBsaXN0cy5cbiAgICAgICAgLy8gIEZvciBleGFtcGxlLFxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgeFByb2RXaXRoKGYsIFsxLCAyXSwgWydhJywgJ2InXSlcbiAgICAgICAgLy8gICAgIC8vICAgID0+IFtmKDEsICdhJyksIGYoMSwgJ2InKSwgZigyLCAnYScpLCBmKDIsICdiJyldO1xuICAgICAgICBSLnhwcm9kV2l0aCA9IF8oZnVuY3Rpb24oZm4sIGEsIGIpIHtcbiAgICAgICAgICAgIGlmIChpc0VtcHR5KGEpIHx8IGlzRW1wdHkoYikpIHtyZXR1cm4gRU1QVFk7fVxuICAgICAgICAgICAgdmFyIGkgPSAtMSwgaWxlbiA9IGEubGVuZ3RoLCBqLCBqbGVuID0gYi5sZW5ndGgsIHJlc3VsdCA9IFtdOyAvLyBiZXR0ZXIgdG8gcHVzaCB0aGVtIGFsbCBvciB0byBkbyBgbmV3IEFycmF5KGlsZW4gKiBqbGVuKWAgYW5kIGNhbGN1bGF0ZSBpbmRpY2VzP1xuICAgICAgICAgICAgd2hpbGUgKCsraSA8IGlsZW4pIHtcbiAgICAgICAgICAgICAgICBqID0gLTE7XG4gICAgICAgICAgICAgICAgd2hpbGUgKCsraiA8IGpsZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goZm4oYVtpXSwgYltqXSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZXMgYSBuZXcgbGlzdCBvdXQgb2YgdGhlIHR3byBzdXBwbGllZCBieSB5aWVsZGluZyB0aGUgcGFpciBvZiBlYWNoIHBvc3NpYmxlIHBhaXIgaW4gdGhlIGxpc3RzLlxuICAgICAgICAvLyBGb3IgZXhhbXBsZSxcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHhQcm9kKFsxLCAyXSwgWydhJywgJ2InXSlcbiAgICAgICAgLy8gICAgIC8vICAgID0+IFtbMSwgJ2EnXSwgWzEsICdiJyldLCBbMiwgJ2EnXSwgWzIsICdiJ11dO1xuICAgICAgICBSLnhwcm9kID0gXyhmdW5jdGlvbihhLCBiKSB7IC8vID0geHByb2RXaXRoKHByZXBlbmQpOyAodGFrZXMgYWJvdXQgMyB0aW1lcyBhcyBsb25nLi4uKVxuICAgICAgICAgICAgaWYgKGlzRW1wdHkoYSkgfHwgaXNFbXB0eShiKSkge3JldHVybiBFTVBUWTt9XG4gICAgICAgICAgICB2YXIgaSA9IC0xLCBpbGVuID0gYS5sZW5ndGgsIGosIGpsZW4gPSBiLmxlbmd0aCwgcmVzdWx0ID0gW107IC8vIGJldHRlciB0byBwdXNoIHRoZW0gYWxsIG9yIHRvIGRvIGBuZXcgQXJyYXkoaWxlbiAqIGpsZW4pYCBhbmQgY2FsY3VsYXRlIGluZGljZXM/XG4gICAgICAgICAgICB3aGlsZSAoKytpIDwgaWxlbikge1xuICAgICAgICAgICAgICAgIGogPSAtMTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoKytqIDwgamxlbikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChbYVtpXSwgYltqXV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBuZXcgbGlzdCB3aXRoIHRoZSBzYW1lIGVsZW1lbnRzIGFzIHRoZSBvcmlnaW5hbCBsaXN0LCBqdXN0IGluIHRoZSByZXZlcnNlIG9yZGVyLlxuICAgICAgICBSLnJldmVyc2UgPSBmdW5jdGlvbihsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gY2xvbmUobGlzdCB8fCBbXSkucmV2ZXJzZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIC8vIFJldHVybnMgYSBsaXN0IG9mIG51bWJlcnMgZnJvbSBgZnJvbWAgKGluY2x1c2l2ZSkgdG8gYHRvYCAoZXhjbHVzaXZlKS5cbiAgICAgICAgLy8gRm9yIGV4YW1wbGUsIFxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgcmFuZ2UoMSwgNSkgLy8gPT4gWzEsIDIsIDMsIDRdXG4gICAgICAgIC8vICAgICByYW5nZSg1MCwgNTMpIC8vID0+IFs1MCwgNTEsIDUyXVxuICAgICAgICBSLnJhbmdlID0gXyhmdW5jdGlvbihmcm9tLCB0bykge1xuICAgICAgICAgICAgaWYgKGZyb20gPj0gdG8pIHtyZXR1cm4gRU1QVFk7fVxuICAgICAgICAgICAgdmFyIGlkeCwgcmVzdWx0ID0gbmV3IEFycmF5KHRvIC0gZnJvbSk7XG4gICAgICAgICAgICBmb3IgKGlkeCA9IDA7IGZyb20gPCB0bzsgaWR4KyssIGZyb20rKykge1xuICAgICAgICAgICAgICAgIHJlc3VsdFtpZHhdID0gZnJvbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gUmV0dXJucyB0aGUgZmlyc3QgemVyby1pbmRleGVkIHBvc2l0aW9uIG9mIGFuIG9iamVjdCBpbiBhIGZsYXQgbGlzdFxuICAgICAgICBSLmluZGV4T2YgPSBfKGZ1bmN0aW9uKG9iaiwgbGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuIGxpc3QuaW5kZXhPZihvYmopO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRoZSBsYXN0IHplcm8taW5kZXhlZCBwb3NpdGlvbiBvZiBhbiBvYmplY3QgaW4gYSBmbGF0IGxpc3RcbiAgICAgICAgUi5sYXN0SW5kZXhPZiA9IF8oZnVuY3Rpb24ob2JqLCBsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gbGlzdC5sYXN0SW5kZXhPZihvYmopO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRoZSBlbGVtZW50cyBvZiB0aGUgbGlzdCBhcyBhIHN0cmluZyBqb2luZWQgYnkgYSBzZXBhcmF0b3IuXG4gICAgICAgIFIuam9pbiA9IF8oZnVuY3Rpb24oc2VwLCBsaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gbGlzdC5qb2luKHNlcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHJhbWRhLnNwbGljZSBoYXMgYSBkaWZmZXJlbnQgY29udHJhY3QgdGhhbiBBcnJheS5zcGxpY2UuIEFycmF5LnNwbGljZSBtdXRhdGVzIGl0cyBhcnJheVxuICAgICAgICAvLyBhbmQgcmV0dXJucyB0aGUgcmVtb3ZlZCBlbGVtZW50cy4gcmFtZGEuc3BsaWNlIGRvZXMgbm90IG11dGF0ZSB0aGUgcGFzc2VkIGluIGxpc3QgKHdlbGwsXG4gICAgICAgIC8vIGl0IG1ha2VzIGEgc2hhbGxvdyBjb3B5KSwgYW5kIHJldHVybnMgYSBuZXcgbGlzdCB3aXRoIHRoZSBzcGVjaWZpZWQgZWxlbWVudHMgcmVtb3ZlZC4gXG4gICAgICAgIFIuc3BsaWNlID0gXyhmdW5jdGlvbihzdGFydCwgbGVuLCBsaXN0KSB7XG4gICAgICAgICAgICB2YXIgbHMgPSBzbGljZShsaXN0LCAwKTtcbiAgICAgICAgICAgIGxzLnNwbGljZShzdGFydCwgbGVuKTtcbiAgICAgICAgICAgIHJldHVybiBscztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyB0aGUgbnRoIGVsZW1lbnQgb2YgYSBsaXN0ICh6ZXJvLWluZGV4ZWQpXG4gICAgICAgIFIubnRoID0gXyhmdW5jdGlvbihuLCBsaXN0KSB7XG4gICAgICAgICAgcmV0dXJuIChsaXN0W25dID09PSB1bmRlZikgPyBudWxsIDogbGlzdFtuXTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTWFrZXMgYSBjb21wYXJhdG9yIGZ1bmN0aW9uIG91dCBvZiBhIGZ1bmN0aW9uIHRoYXQgcmVwb3J0cyB3aGV0aGVyIHRoZSBmaXJzdCBlbGVtZW50IGlzIGxlc3MgdGhhbiB0aGUgc2Vjb25kLlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIGNtcCA9IGNvbXBhcmF0b3IoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAvLyAgICAgICAgIHJldHVybiBhLmFnZSA8IGIuYWdlO1xuICAgICAgICAvLyAgICAgfTtcbiAgICAgICAgLy8gICAgIHNvcnQoY21wLCBwZW9wbGUpO1xuICAgICAgICB2YXIgY29tcGFyYXRvciA9IFIuY29tcGFyYXRvciA9IGZ1bmN0aW9uKHByZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByZWQoYSwgYikgPyAtMSA6IHByZWQoYiwgYSkgPyAxIDogMDtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIGNvcHkgb2YgdGhlIGxpc3QsIHNvcnRlZCBhY2NvcmRpbmcgdG8gdGhlIGNvbXBhcmF0b3IgZnVuY3Rpb24sIHdoaWNoIHNob3VsZCBhY2NlcHQgdHdvIHZhbHVlcyBhdCBhXG4gICAgICAgIC8vIHRpbWUgYW5kIHJldHVybiBhIG5lZ2F0aXZlIG51bWJlciBpZiB0aGUgZmlyc3QgdmFsdWUgaXMgc21hbGxlciwgYSBwb3NpdGl2ZSBudW1iZXIgaWYgaXQncyBsYXJnZXIsIGFuZCB6ZXJvXG4gICAgICAgIC8vIGlmIHRoZXkgYXJlIGVxdWFsLiAgUGxlYXNlIG5vdGUgdGhhdCB0aGlzIGlzIGEgKipjb3B5Kiogb2YgdGhlIGxpc3QuICBJdCBkb2VzIG5vdCBtb2RpZnkgdGhlIG9yaWdpbmFsLlxuICAgICAgICB2YXIgc29ydCA9IFIuc29ydCA9IF8oZnVuY3Rpb24oY29tcGFyYXRvciwgbGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuIGNsb25lKGxpc3QpLnNvcnQoY29tcGFyYXRvcik7XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZXNlIGZ1bmN0aW9ucyBvcGVyYXRlIG9uIHBsYWluIEphdmFzY3JpcHQgb2JqZWN0LCBhZGRpbmcgc2ltcGxlIGZ1bmN0aW9ucyB0byB0ZXN0IHByb3BlcnRpZXMgb24gdGhlc2VcbiAgICAgICAgLy8gb2JqZWN0cy4gIE1hbnkgb2YgdGhlc2UgYXJlIG9mIG1vc3QgdXNlIGluIGNvbmp1bmN0aW9uIHdpdGggdGhlIGxpc3QgZnVuY3Rpb25zLCBvcGVyYXRpbmcgb24gbGlzdHMgb2ZcbiAgICAgICAgLy8gb2JqZWN0cy5cblxuICAgICAgICAvLyAtLS0tLS0tLVxuXG4gICAgICAgIC8vIFJ1bnMgdGhlIGdpdmVuIGZ1bmN0aW9uIHdpdGggdGhlIHN1cHBsaWVkIG9iamVjdCwgdGhlbiByZXR1cm5zIHRoZSBvYmplY3QuXG4gICAgICAgIFIudGFwID0gXyhmdW5jdGlvbih4LCBmbikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgZm4oeCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfSk7XG4gICAgICAgIGFsaWFzRm9yKFwidGFwXCIpLmlzKFwiS1wiKTsgLy8gVE9ETzogYXJlIHdlIHN1cmU/IE5vdCBuZWNlc3NhcnksIGJ1dCBjb252ZW5pZW50LCBJTUhPLlxuXG4gICAgICAgIC8vIFRlc3RzIGlmIHR3byBpdGVtcyBhcmUgZXF1YWwuICBFcXVhbGl0eSBpcyBzdHJpY3QgaGVyZSwgbWVhbmluZyByZWZlcmVuY2UgZXF1YWxpdHkgZm9yIG9iamVjdHMgYW5kXG4gICAgICAgIC8vIG5vbi1jb2VyY2luZyBlcXVhbGl0eSBmb3IgcHJpbWl0aXZlcy5cbiAgICAgICAgUi5lcSA9IF8oZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIGEgPT09IGI7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdoZW4gc3VwcGxpZWQgYW4gb2JqZWN0IHJldHVybnMgdGhlIGluZGljYXRlZCBwcm9wZXJ0eSBvZiB0aGF0IG9iamVjdCwgaWYgaXQgZXhpc3RzLlxuICAgICAgICB2YXIgcHJvcCA9IFIucHJvcCA9IF8oZnVuY3Rpb24ocCwgb2JqKSB7cmV0dXJuIG9ialtwXTt9KTtcbiAgICAgICAgYWxpYXNGb3IoXCJwcm9wXCIpLmlzKFwiZ2V0XCIpOyAvLyBUT0RPOiBhcmUgd2Ugc3VyZT8gIE1hdGNoZXMgc29tZSBvdGhlciBsaWJzLCBidXQgbWlnaHQgd2FudCB0byByZXNlcnZlIGZvciBvdGhlciB1c2UuXG5cbiAgICAgICAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2hlbiBzdXBwbGllZCBhbiBvYmplY3QgcmV0dXJucyB0aGUgcmVzdWx0IG9mIHJ1bm5pbmcgdGhlIGluZGljYXRlZCBmdW5jdGlvbiBvblxuICAgICAgICAvLyB0aGF0IG9iamVjdCwgaWYgaXQgaGFzIHN1Y2ggYSBmdW5jdGlvbi5cbiAgICAgICAgUi5mdW5jID0gXyhmdW5jdGlvbihmbiwgb2JqKSB7cmV0dXJuIG9ialtmbl0uYXBwbHkob2JqLCBzbGljZShhcmd1bWVudHMsIDIpKTt9KTtcblxuXG4gICAgICAgIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdoZW4gc3VwcGxpZWQgYSBwcm9wZXJ0eSBuYW1lIHJldHVybnMgdGhhdCBwcm9wZXJ0eSBvbiB0aGUgaW5kaWNhdGVkIG9iamVjdCwgaWYgaXRcbiAgICAgICAgLy8gZXhpc3RzLlxuICAgICAgICBSLnByb3BzID0gXyhmdW5jdGlvbihvYmosIHByb3ApIHtyZXR1cm4gb2JqICYmIG9ialtwcm9wXTt9KTtcblxuXG4gICAgICAgIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGFsd2F5cyByZXR1cm5zIHRoZSBnaXZlbiB2YWx1ZS5cbiAgICAgICAgdmFyIGFsd2F5cyA9IFIuYWx3YXlzID0gZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7cmV0dXJuIHZhbDt9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBhbnlCbGFua3MgPSBhbnkoZnVuY3Rpb24odmFsKSB7cmV0dXJuIHZhbCA9PT0gbnVsbCB8fCB2YWwgPT09IHVuZGVmO30pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBjYWxsIHRoZSBpbmRpY2F0ZWQgZnVuY3Rpb24gaWYgdGhlIGNvcnJlY3QgbnVtYmVyIG9mIChkZWZpbmVkLCBub24tbnVsbClcbiAgICAgICAgLy8gYXJndW1lbnRzIGFyZSBzdXBwbGllZCwgcmV0dXJuaW5nIGB1bmRlZmluZWRgIG90aGVyd2lzZS5cbiAgICAgICAgUi5tYXliZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGFyZ3VtZW50cy5sZW5ndGggPT09IDAgfHwgYW55QmxhbmtzKGV4cGFuZChhcmd1bWVudHMsIGZuLmxlbmd0aCkpKSA/IHVuZGVmIDogZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmV0dXJucyBhIGxpc3QgY29udGFpbmluZyB0aGUgbmFtZXMgb2YgYWxsIHRoZSBlbnVtZXJhYmxlIG93blxuICAgICAgICAvLyBwcm9wZXJ0aWVzIG9mIHRoZSBzdXBwbGllZCBvYmplY3QuXG4gICAgICAgIHZhciBrZXlzID0gUi5rZXlzID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgdmFyIHByb3AsIGtzID0gW107XG4gICAgICAgICAgICBmb3IgKHByb3AgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgICAgICBrcy5wdXNoKHByb3ApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBrcztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZXR1cm5zIGEgbGlzdCBvZiBhbGwgdGhlIGVudW1lcmFibGUgb3duIHByb3BlcnRpZXMgb2YgdGhlIHN1cHBsaWVkIG9iamVjdC5cbiAgICAgICAgUi52YWx1ZXMgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICB2YXIgcHJvcCwgdnMgPSBbXTtcbiAgICAgICAgICAgIGZvciAocHJvcCBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIHZzLnB1c2gob2JqW3Byb3BdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdnM7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHBhcnRpYWxDb3B5ID0gZnVuY3Rpb24odGVzdCwgb2JqKSB7XG4gICAgICAgICAgICB2YXIgY29weSA9IHt9O1xuICAgICAgICAgICAgZWFjaChmdW5jdGlvbihrZXkpIHtpZiAodGVzdChrZXksIG9iaikpIHtjb3B5W2tleV0gPSBvYmpba2V5XTt9fSwga2V5cyhvYmopKTtcbiAgICAgICAgICAgIHJldHVybiBjb3B5O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBwYXJ0aWFsIGNvcHkgb2YgYW4gb2JqZWN0IGNvbnRhaW5pbmcgb25seSB0aGUga2V5cyBzcGVjaWZpZWQuICBJZiB0aGUga2V5IGRvZXMgbm90IGV4aXN0LCB0aGVcbiAgICAgICAgLy8gcHJvcGVydHkgaXMgaWdub3JlZFxuICAgICAgICBSLnBpY2sgPSBfKGZ1bmN0aW9uKG5hbWVzLCBvYmopIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJ0aWFsQ29weShmdW5jdGlvbihrZXkpIHtyZXR1cm4gY29udGFpbnMoa2V5LCBuYW1lcyk7fSwgb2JqKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2ltaWxhciB0byBgcGlja2AgZXhjZXB0IHRoYXQgdGhpcyBvbmUgaW5jbHVkZXMgYSBga2V5OiB1bmRlZmluZWRgIHBhaXIgZm9yIHByb3BlcnRpZXMgdGhhdCBkb24ndCBleGlzdC5cbiAgICAgICAgdmFyIHBpY2tBbGwgPSBSLnBpY2tBbGwgPSBfKGZ1bmN0aW9uKG5hbWVzLCBvYmopIHtcbiAgICAgICAgICAgIHZhciBjb3B5ID0ge307XG4gICAgICAgICAgICBlYWNoKGZ1bmN0aW9uKG5hbWUpIHsgY29weVtuYW1lXSA9IG9ialtuYW1lXTsgfSwgbmFtZXMpO1xuICAgICAgICAgICAgcmV0dXJuIGNvcHk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJldHVybnMgYSBwYXJ0aWFsIGNvcHkgb2YgYW4gb2JqZWN0IG9taXR0aW5nIHRoZSBrZXlzIHNwZWNpZmllZC5cbiAgICAgICAgUi5vbWl0ID0gXyhmdW5jdGlvbihuYW1lcywgb2JqKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFydGlhbENvcHkoZnVuY3Rpb24oa2V5KSB7cmV0dXJuICFjb250YWlucyhrZXksIG5hbWVzKTt9LCBvYmopO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFJlcG9ydHMgd2hldGhlciB0d28gZnVuY3Rpb25zIGhhdmUgdGhlIHNhbWUgdmFsdWUgZm9yIHRoZSBzcGVjaWZpZWQgcHJvcGVydHkuICBVc2VmdWwgYXMgYSBjdXJyaWVkIHByZWRpY2F0ZS5cbiAgICAgICAgUi5lcVByb3BzID0gXyhmdW5jdGlvbihwcm9wLCBvYmoxLCBvYmoyKSB7cmV0dXJuIG9iajFbcHJvcF0gPT09IG9iajJbcHJvcF07fSk7XG5cbiAgICAgICAgLy8gYHdoZXJlYCB0YWtlcyBhIHNwZWMgb2JqZWN0IGFuZCBhIHRlc3Qgb2JqZWN0IGFuZCByZXR1cm5zIHRydWUgaW9mIHRoZSB0ZXN0IHNhdGlzZmllcyB0aGUgc3BlYywgXG4gICAgICAgIC8vIGVsc2UgZmFsc2UuIEFueSBwcm9wZXJ0eSBvbiB0aGUgc3BlYyB0aGF0IGlzIG5vdCBhIGZ1bmN0aW9uIGlzIGludGVycHJldGVkIGFzIGFuIGVxdWFsaXR5IFxuICAgICAgICAvLyByZWxhdGlvbi4gRm9yIGV4YW1wbGU6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgc3BlYyA9IHt4OiAyfTtcbiAgICAgICAgLy8gICAgIHdoZXJlKHNwZWMsIHt3OiAxMCwgeDogMiwgeTogMzAwfSk7IC8vID0+IHRydWUsIHggPT09IDJcbiAgICAgICAgLy8gICAgIHdoZXJlKHNwZWMsIHt4OiAxLCB5OiAnbW9vJywgejogdHJ1ZX0pOyAvLyA9PiBmYWxzZSwgeCAhPT0gMlxuICAgICAgICAvL1xuICAgICAgICAvLyBJZiB0aGUgc3BlYyBoYXMgYSBwcm9wZXJ0eSBtYXBwZWQgdG8gYSBmdW5jdGlvbiwgdGhlbiBgd2hlcmVgIGV2YWx1YXRlcyB0aGUgZnVuY3Rpb24sIHBhc3NpbmcgaW4gXG4gICAgICAgIC8vIHRoZSB0ZXN0IG9iamVjdCdzIHZhbHVlIGZvciB0aGUgcHJvcGVydHkgaW4gcXVlc3Rpb24sIGFzIHdlbGwgYXMgdGhlIHdob2xlIHRlc3Qgb2JqZWN0LiBGb3IgZXhhbXBsZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBzcGVjID0ge3g6IGZ1bmN0aW9uKHZhbCwgb2JqKSB7IHJldHVybiAgdmFsICsgb2JqLnkgPiAxMDsgfTtcbiAgICAgICAgLy8gICAgIHdoZXJlKHNwZWMsIHt4OiAyLCB5OiA3fSk7IC8vID0+IGZhbHNlXG4gICAgICAgIC8vICAgICB3aGVyZShzcGVjLCB7eDogMywgeTogOH0pOyAvLyA9PiB0cnVlXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGB3aGVyZWAgaXMgd2VsbCBzdWl0ZWQgdG8gZGVjbGFyYXRpdmxleSBleHByZXNzaW5nIGNvbnN0cmFpbnRzIGZvciBvdGhlciBmdW5jdGlvbnMsIGUuZy4sIGBmaWx0ZXJgOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIHhzID0gW3t4OiAyLCB5OiAxfSwge3g6IDEwLCB5OiAyfSwgXG4gICAgICAgIC8vICAgICAgICAgICAgICAge3g6IDgsIHk6IDN9LCB7eDogMTAsIHk6IDR9XTtcbiAgICAgICAgLy8gICAgIHZhciBmeHMgPSBmaWx0ZXIod2hlcmUoe3g6IDEwfSksIHhzKTsgXG4gICAgICAgIC8vICAgICAvLyBmeHMgPT0+IFt7eDogMTAsIHk6IDJ9LCB7eDogMTAsIHk6IDR9XVxuICAgICAgICAvL1xuICAgICAgICBSLndoZXJlID0gXyhmdW5jdGlvbihzcGVjLCB0ZXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gYWxsKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBzcGVjW2tleV07XG4gICAgICAgICAgICAgICAgcmV0dXJuICh0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSA/IHZhbCh0ZXN0W2tleV0sIHRlc3QpIDogKHRlc3Rba2V5XSA9PT0gdmFsKTtcbiAgICAgICAgICAgIH0sIGtleXMoc3BlYykpO1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIE1pc2NlbGxhbmVvdXMgRnVuY3Rpb25zXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG4gICAgICAgIC8vIEEgZmV3IGZ1bmN0aW9ucyBpbiBuZWVkIG9mIGEgZ29vZCBob21lLlxuXG4gICAgICAgIC8vIC0tLS0tLS0tXG5cbiAgICAgICAgLy8gRXhwb3NlIHRoZSBmdW5jdGlvbnMgZnJvbSByYW1kYSBhcyBwcm9wZXJ0aWVzIG9uIGFub3RoZXIgb2JqZWN0LiAgSWYgdGhpcyBvYmplY3QgaXMgdGhlIGdsb2JhbCBvYmplY3QsIHRoZW5cbiAgICAgICAgLy8gaXQgd2lsbCBiZSBhcyB0aG91Z2ggdGhlIGV3ZWRhIGZ1bmN0aW9ucyBhcmUgZ2xvYmFsIGZ1bmN0aW9ucy5cbiAgICAgICAgUi5pbnN0YWxsVG8gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgICAgIGVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICAgICAgKG9iaiB8fCBnbG9iYWwpW2tleV0gPSBSW2tleV07XG4gICAgICAgICAgICB9KShrZXlzKFIpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBIGZ1bmN0aW9uIHRoYXQgYWx3YXlzIHJldHVybnMgYDBgLlxuICAgICAgICBSLmFsd2F5c1plcm8gPSBhbHdheXMoMCk7XG5cbiAgICAgICAgLy8gQSBmdW5jdGlvbiB0aGF0IGFsd2F5cyByZXR1cm5zIGBmYWxzZWAuXG4gICAgICAgIFIuYWx3YXlzRmFsc2UgPSBhbHdheXMoZmFsc2UpO1xuXG4gICAgICAgIC8vIEEgZnVuY3Rpb24gdGhhdCBhbHdheXMgcmV0dXJucyBgdHJ1ZWAuXG4gICAgICAgIFIuYWx3YXlzVHJ1ZSA9IGFsd2F5cyh0cnVlKTtcblxuXG5cbiAgICAgICAgLy8gTG9naWMgRnVuY3Rpb25zXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAvL1xuICAgICAgICAvLyBUaGVzZSBmdW5jdGlvbnMgYXJlIHZlcnkgc2ltcGxlIHdyYXBwZXJzIGFyb3VuZCB0aGUgYnVpbHQtaW4gbG9naWNhbCBvcGVyYXRvcnMsIHVzZWZ1bCBpbiBidWlsZGluZyB1cFxuICAgICAgICAvLyBtb3JlIGNvbXBsZXggZnVuY3Rpb25hbCBmb3Jtcy5cblxuICAgICAgICAvLyAtLS0tLS0tLVxuXG4gICAgICAgIC8vIEEgZnVuY3Rpb24gd3JhcHBpbmcgdGhlIGJvb2xlYW4gYCYmYCBvcGVyYXRvci4gIE5vdGUgdGhhdCB1bmxpa2UgdGhlIHVuZGVybHlpbmcgb3BlcmF0b3IsIHRob3VnaCwgaXRcbiAgICAgICAgLy8gYXdheXMgcmV0dXJucyBgdHJ1ZWAgb3IgYGZhbHNlYC5cbiAgICAgICAgUi5hbmQgPSBfKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gISEoYSAmJiBiKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQSBmdW5jdGlvbiB3cmFwcGluZyB0aGUgYm9vbGVhbiBgfHxgIG9wZXJhdG9yLiAgTm90ZSB0aGF0IHVubGlrZSB0aGUgdW5kZXJseWluZyBvcGVyYXRvciwgdGhvdWdoLCBpdFxuICAgICAgICAvLyBhd2F5cyByZXR1cm5zIGB0cnVlYCBvciBgZmFsc2VgLlxuICAgICAgICBSLm9yID0gXyhmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuICEhKGEgfHwgYik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEEgZnVuY3Rpb24gd3JhcHBpbmcgdGhlIGJvb2xlYW4gYCFgIG9wZXJhdG9yLiAgSXQgcmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHBhcmFtZXRlciBpcyBmYWxzZS15IGFuZCBgZmFsc2VgIGlmXG4gICAgICAgIC8vIHRoZSBwYXJhbWV0ZXIgaXMgdHJ1dGgteVxuICAgICAgICBSLm5vdCA9IGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICByZXR1cm4gIWE7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQSBmdW5jdGlvbiB3cmFwcGluZyBjYWxscyB0byB0aGUgdHdvIGZ1bmN0aW9ucyBpbiBhbiBgJiZgIG9wZXJhdGlvbiwgcmV0dXJuaW5nIGB0cnVlYCBvciBgZmFsc2VgLiAgTm90ZSB0aGF0XG4gICAgICAgIC8vIHRoaXMgaXMgc2hvcnQtY2lyY3VpdGVkLCBtZWFuaW5nIHRoYXQgdGhlIHNlY29uZCBmdW5jdGlvbiB3aWxsIG5vdCBiZSBpbnZva2VkIGlmIHRoZSBmaXJzdCByZXR1cm5zIGEgZmFsc2UteVxuICAgICAgICAvLyB2YWx1ZS5cbiAgICAgICAgUi5hbmRGbiA9IF8oZnVuY3Rpb24oZiwgZykgeyAvLyBUT0RPOiBhcml0eT9cbiAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge3JldHVybiAhIShmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgJiYgZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTt9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBIGZ1bmN0aW9uIHdyYXBwaW5nIGNhbGxzIHRvIHRoZSB0d28gZnVuY3Rpb25zIGluIGFuIGB8fGAgb3BlcmF0aW9uLCByZXR1cm5pbmcgYHRydWVgIG9yIGBmYWxzZWAuICBOb3RlIHRoYXRcbiAgICAgICAgLy8gdGhpcyBpcyBzaG9ydC1jaXJjdWl0ZWQsIG1lYW5pbmcgdGhhdCB0aGUgc2Vjb25kIGZ1bmN0aW9uIHdpbGwgbm90IGJlIGludm9rZWQgaWYgdGhlIGZpcnN0IHJldHVybnMgYSB0cnV0aC15XG4gICAgICAgIC8vIHZhbHVlLiAoTm90ZSBhbHNvIHRoYXQgYXQgbGVhc3QgT2xpdmVyIFR3aXN0IGNhbiBwcm9ub3VuY2UgdGhpcyBvbmUuLi4pXG4gICAgICAgIFIub3JGbiA9IF8oZnVuY3Rpb24oZiwgZykgeyAvLyBUT0RPOiBhcml0eT9cbiAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge3JldHVybiAhIShmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTt9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBIGZ1bmN0aW9uIHdyYXBwaW5nIGEgY2FsbCB0byB0aGUgZ2l2ZW4gZnVuY3Rpb24gaW4gYSBgIWAgb3BlcmF0aW9uLiAgSXQgd2lsbCByZXR1cm4gYHRydWVgIHdoZW4gdGhlXG4gICAgICAgIC8vIHVuZGVybHlpbmcgZnVuY3Rpb24gd291bGQgcmV0dXJuIGEgZmFsc2UteSB2YWx1ZSwgYW5kIGBmYWxzZWAgd2hlbiBpdCB3b3VsZCByZXR1cm4gYSB0cnV0aC15IG9uZS5cbiAgICAgICAgdmFyIG5vdEZuID0gUi5ub3RGbiA9IGZ1bmN0aW9uIChmKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7cmV0dXJuICFmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7fTtcbiAgICAgICAgfTtcblxuXG4gICAgICAgIC8vIFRPRE86IGlzIHRoZXJlIGEgd2F5IHRvIHVuaWZ5IGFsbFByZWRpY2F0ZXMgYW5kIGFueVByZWRpY2F0ZXM/IHRoZXkgYXJlIHNvb29vbyBzaW1pbGFyXG4gICAgICAgIC8vIEdpdmVuIGEgbGlzdCBvZiBwcmVkaWNhdGVzIHJldHVybnMgYSBuZXcgcHJlZGljYXRlIHRoYXQgd2lsbCBiZSB0cnVlIGV4YWN0bHkgd2hlbiBhbGwgb2YgdGhlbSBhcmUuXG4gICAgICAgIFIuYWxsUHJlZGljYXRlcyA9IGZ1bmN0aW9uKHByZWRzIC8qLCB2YWwxLCB2YWwxMiwgLi4uICovKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICB2YXIgbWF4QXJpdHkgPSBtYXgobWFwKGZ1bmN0aW9uKGYpIHsgcmV0dXJuIGYubGVuZ3RoOyB9LCBwcmVkcykpO1xuXG4gICAgICAgICAgICB2YXIgYW5kUHJlZHMgPSBhcml0eShtYXhBcml0eSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IC0xO1xuICAgICAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IHByZWRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXByZWRzW2lkeF0uYXBwbHkobnVsbCwgYXJndW1lbnRzKSkgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiAoaXNFbXB0eShhcmdzKSkgPyBhbmRQcmVkcyA6IGFuZFByZWRzLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICB9O1xuXG5cbiAgICAgIC8vIEdpdmVuIGEgbGlzdCBvZiBwcmVkaWNhdGVzIHJldHVybnMgYSBuZXcgcHJlZGljYXRlIHRoYXQgd2lsbCBiZSB0cnVlIGV4YWN0bHkgd2hlbiBhbnkgb25lIG9mIHRoZW0gaXMuXG4gICAgICAgIFIuYW55UHJlZGljYXRlcyA9IGZ1bmN0aW9uKHByZWRzIC8qLCB2YWwxLCB2YWwxMiwgLi4uICovKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICB2YXIgbWF4QXJpdHkgPSBtYXgobWFwKGZ1bmN0aW9uKGYpIHsgcmV0dXJuIGYubGVuZ3RoOyB9LCBwcmVkcykpO1xuXG4gICAgICAgICAgICB2YXIgb3JQcmVkcyA9IGFyaXR5KG1heEFyaXR5LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gLTE7XG4gICAgICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgcHJlZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmVkc1tpZHhdLmFwcGx5KG51bGwsIGFyZ3VtZW50cykpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gKGlzRW1wdHkoYXJncykpID8gb3JQcmVkcyA6IG9yUHJlZHMuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgIH07XG5cblxuXG4gICAgICAgIC8vIEFyaXRobWV0aWMgRnVuY3Rpb25zXG4gICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZXNlIGZ1bmN0aW9ucyB3cmFwIHVwIHRoZSBjZXJ0YWluIGNvcmUgYXJpdGhtZXRpYyBvcGVyYXRvcnNcblxuICAgICAgICAvLyAtLS0tLS0tLVxuXG4gICAgICAgIC8vIEFkZHMgdHdvIG51bWJlcnMuICBBdXRvbWF0aWMgY3VycmllZDpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBhZGQ3ID0gYWRkKDcpO1xuICAgICAgICAvLyAgICAgYWRkNygxMCk7IC8vID0+IDE3XG4gICAgICAgIHZhciBhZGQgPSBSLmFkZCA9IF8oZnVuY3Rpb24oYSwgYikge3JldHVybiBhICsgYjt9KTtcblxuICAgICAgICAvLyBNdWx0aXBsaWVzIHR3byBudW1iZXJzLiAgQXV0b21hdGljYWxseSBjdXJyaWVkOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIG11bHQzID0gbXVsdGlwbHkoMyk7XG4gICAgICAgIC8vICAgICBtdWx0Myg3KTsgLy8gPT4gMjFcbiAgICAgICAgdmFyIG11bHRpcGx5ID0gUi5tdWx0aXBseSA9IF8oZnVuY3Rpb24oYSwgYikge3JldHVybiBhICogYjt9KTtcblxuICAgICAgICAvLyBTdWJ0cmFjdHMgdGhlIHNlY29uZCBwYXJhbWV0ZXIgZnJvbSB0aGUgZmlyc3QuICBUaGlzIGlzIGF1dG9tYXRpY2FsbHkgY3VycmllZCwgYW5kIHdoaWxlIGF0IHRpbWVzIHRoZSBjdXJyaWVkXG4gICAgICAgIC8vIHZlcnNpb24gbWlnaHQgYmUgdXNlZnVsLCBvZnRlbiB0aGUgY3VycmllZCB2ZXJzaW9uIG9mIGBzdWJ0cmFjdE5gIG1pZ2h0IGJlIHdoYXQncyB3YW50ZWQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIgaHVuZHJlZE1pbnVzID0gc3VidHJhY3QoMTAwKTtcbiAgICAgICAgLy8gICAgIGh1bmRyZWRNaW51cygyMCkgOyAvLyA9PiA4MFxuICAgICAgICB2YXIgc3VidHJhY3QgPSBSLnN1YnRyYWN0ID0gXyhmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGEgLSBiO30pO1xuXG4gICAgICAgIC8vIFJldmVyc2VkIHZlcnNpb24gb2YgYHN1YnRyYWN0YCwgd2hlcmUgZmlyc3QgcGFyYW1ldGVyIGlzIHN1YnRyYWN0ZWQgZnJvbSB0aGUgc2Vjb25kLiAgVGhlIGN1cnJpZWQgdmVyc2lvbiBvZlxuICAgICAgICAvLyB0aGlzIG9uZSBtaWdodCBtZSBtb3JlIHVzZWZ1bCB0aGFuIHRoYXQgb2YgYHN1YnRyYWN0YC4gIEZvciBpbnN0YW5jZTpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHZhciBkZWNyZW1lbnQgPSBzdWJ0cmFjdE4oMSk7XG4gICAgICAgIC8vICAgICBkZWNyZW1lbnQoMTApOyAvLyA9PiA5O1xuICAgICAgICBSLnN1YnRyYWN0TiA9IGZsaXAoc3VidHJhY3QpO1xuXG4gICAgICAgIC8vIERpdmlkZXMgdGhlIGZpcnN0IHBhcmFtZXRlciBieSB0aGUgc2Vjb25kLiAgVGhpcyBpcyBhdXRvbWF0aWNhbGx5IGN1cnJpZWQsIGFuZCB3aGlsZSBhdCB0aW1lcyB0aGUgY3VycmllZFxuICAgICAgICAvLyB2ZXJzaW9uIG1pZ2h0IGJlIHVzZWZ1bCwgb2Z0ZW4gdGhlIGN1cnJpZWQgdmVyc2lvbiBvZiBgZGl2aWRlQnlgIG1pZ2h0IGJlIHdoYXQncyB3YW50ZWQuXG4gICAgICAgIHZhciBkaXZpZGUgPSBSLmRpdmlkZSA9IF8oZnVuY3Rpb24oYSwgYikge3JldHVybiBhIC8gYjt9KTtcblxuICAgICAgICAvLyBSZXZlcnNlZCB2ZXJzaW9uIG9mIGBkaXZpZGVgLCB3aGVyZSB0aGUgc2Vjb25kIHBhcmFtZXRlciBpcyBkaXZpZGVkIGJ5IHRoZSBmaXJzdC4gIFRoZSBjdXJyaWVkIHZlcnNpb24gb2ZcbiAgICAgICAgLy8gdGhpcyBvbmUgbWlnaHQgYmUgbW9yZSB1c2VmdWwgdGhhbiB0aGF0IG9mIGBkaXZpZGVgLiAgRm9yIGluc3RhbmNlOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIGhhbGYgPSBkaXZpZGVCeSgyKTtcbiAgICAgICAgLy8gICAgIGhhbGYoNDIpOyAvLyA9PiAyMVxuICAgICAgICBSLmRpdmlkZUJ5ID0gZmxpcChkaXZpZGUpO1xuXG4gICAgICAgIC8vIEFkZHMgdG9nZXRoZXIgYWxsIHRoZSBlbGVtZW50cyBvZiBhIGxpc3QuXG4gICAgICAgIFIuc3VtID0gZm9sZGwoYWRkLCAwKTtcblxuICAgICAgICAvLyBNdWx0aXBsaWVzIHRvZ2V0aGVyIGFsbCB0aGUgZWxlbWVudHMgb2YgYSBsaXN0LlxuICAgICAgICBSLnByb2R1Y3QgPSBmb2xkbChtdWx0aXBseSwgMSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBmaXJzdCBwYXJhbWV0ZXIgaXMgbGVzcyB0aGFuIHRoZSBzZWNvbmQuXG4gICAgICAgIFIubHQgPSBfKGZ1bmN0aW9uKGEsIGIpIHtyZXR1cm4gYSA8IGI7fSk7XG5cbiAgICAgICAgLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBmaXJzdCBwYXJhbWV0ZXIgaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIHRoZSBzZWNvbmQuXG4gICAgICAgIFIubHRlID0gXyhmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGEgPD0gYjt9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRydWUgaWYgdGhlIGZpcnN0IHBhcmFtZXRlciBpcyBncmVhdGVyIHRoYW4gdGhlIHNlY29uZC5cbiAgICAgICAgUi5ndCA9IF8oZnVuY3Rpb24oYSwgYikge3JldHVybiBhID4gYjt9KTtcblxuICAgICAgICAvLyBSZXR1cm5zIHRydWUgaWYgdGhlIGZpcnN0IHBhcmFtZXRlciBpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gdGhlIHNlY29uZC5cbiAgICAgICAgUi5ndGUgPSBfKGZ1bmN0aW9uKGEsIGIpIHtyZXR1cm4gYSA+PSBiO30pO1xuXG4gICAgICAgIC8vIERldGVybWluZXMgdGhlIGxhcmdlc3Qgb2YgYSBsaXN0IG9mIG51bWJlcnMgKG9yIGVsZW1lbnRzIHRoYXQgY2FuIGJlIGNhc3QgdG8gbnVtYmVycylcbiAgICAgICAgdmFyIG1heCA9IFIubWF4ID0gZnVuY3Rpb24obGlzdCkge3JldHVybiBNYXRoLm1heC5hcHBseShudWxsLCBsaXN0KTt9O1xuXG4gICAgICAgIC8vIERldGVybWluZXMgdGhlIGxhcmdlc3Qgb2YgYSBsaXN0IG9mIG51bWJlcnMgKG9yIGVsZW1lbnRzIHRoYXQgY2FuIGJlIGNhc3QgdG8gbnVtYmVycykgdXNpbmcgdGhlIHN1cHBsaWVkIGNvbXBhcmF0b3JcbiAgICAgICAgUi5tYXhXaXRoID0gXyhmdW5jdGlvbihjb21wYXJhdG9yLCBsaXN0KSB7XG4gICAgICAgICAgICBpZiAoIWlzQXJyYXkobGlzdCkgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlkeCA9IDAsIG1heCA9IGxpc3RbaWR4XTtcbiAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IGxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBhcmF0b3IobWF4LCBsaXN0W2lkeF0pIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBtYXggPSBsaXN0W2lkeF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1heDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVE9ETzogY29tYmluZSB0aGlzIHdpdGggbWF4V2l0aD9cbiAgICAgICAgLy8gRGV0ZXJtaW5lcyB0aGUgc21hbGxlc3Qgb2YgYSBsaXN0IG9mIG51bWJlcnMgKG9yIGVsZW1lbnRzIHRoYXQgY2FuIGJlIGNhc3QgdG8gbnVtYmVycykgdXNpbmcgdGhlIHN1cHBsaWVkIGNvbXBhcmF0b3JcbiAgICAgICAgUi5taW5XaXRoID0gXyhmdW5jdGlvbihjb21wYXJhdG9yLCBsaXN0KSB7XG4gICAgICAgICAgICBpZiAoIWlzQXJyYXkobGlzdCkgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlkeCA9IDAsIG1heCA9IGxpc3RbaWR4XTtcbiAgICAgICAgICAgIHdoaWxlICgrK2lkeCA8IGxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBhcmF0b3IobWF4LCBsaXN0W2lkeF0pID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBtYXggPSBsaXN0W2lkeF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1heDtcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBEZXRlcm1pbmVzIHRoZSBzbWFsbGVzdCBvZiBhIGxpc3Qgb2YgbnVtYmVycyAob3IgZWxlbWVudHMgdGhhdCBjYW4gYmUgY2FzdCB0byBudW1iZXJzKVxuICAgICAgICBSLm1pbiA9IGZ1bmN0aW9uKGxpc3QpIHtyZXR1cm4gTWF0aC5taW4uYXBwbHkobnVsbCwgbGlzdCk7fTtcblxuXG4gICAgICAgIC8vIFN0cmluZyBGdW5jdGlvbnNcbiAgICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAvL1xuICAgICAgICAvLyBNdWNoIG9mIHRoZSBTdHJpbmcucHJvdG90eXBlIEFQSSBleHBvc2VkIGFzIHNpbXBsZSBmdW5jdGlvbnMuXG5cbiAgICAgICAgLy8gLS0tLS0tLS1cblxuICAgICAgICAvLyBBIHN1YnN0cmluZyBvZiBhIFN0cmluZzpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHN1YnN0cmluZygyLCA1LCBcImFiY2RlZmdoaWprbG1cIik7IC8vPT4gXCJjZGVcIlxuICAgICAgICB2YXIgc3Vic3RyaW5nID0gUi5zdWJzdHJpbmcgPSBpbnZva2VyKFwic3Vic3RyaW5nXCIsIFN0cmluZy5wcm90b3R5cGUpO1xuXG4gICAgICAgIC8vIFRoZSB0cmFpbGluZyBzdWJzdHJpbmcgb2YgYSBTdHJpbmcgc3RhcnRpbmcgd2l0aCB0aGUgbnRoIGNoYXJhY3RlcjpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHN1YnN0cmluZ0Zyb20oOCwgXCJhYmNkZWZnaGlqa2xtXCIpOyAvLz0+IFwiaWprbG1cIlxuICAgICAgICBSLnN1YnN0cmluZ0Zyb20gPSBmbGlwKHN1YnN0cmluZykodW5kZWYpO1xuXG4gICAgICAgIC8vIFRoZSBsZWFkaW5nIHN1YnN0cmluZyBvZiBhIFN0cmluZyBlbmRpbmcgYmVmb3JlIHRoZSBudGggY2hhcmFjdGVyOlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgc3Vic3RyaW5nVG8oOCwgXCJhYmNkZWZnaGlqa2xtXCIpOyAvLz0+IFwiYWJjZGVmZ2hcIlxuICAgICAgICBSLnN1YnN0cmluZ1RvID0gc3Vic3RyaW5nKDApO1xuXG4gICAgICAgIC8vIFRoZSBjaGFyYWN0ZXIgYXQgdGhlIG50aCBwb3NpdGlvbiBpbiBhIFN0cmluZzpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIGNoYXJBdCg4LCBcImFiY2RlZmdoaWprbG1cIik7IC8vPT4gXCJpXCJcbiAgICAgICAgUi5jaGFyQXQgPSBpbnZva2VyKFwiY2hhckF0XCIsIFN0cmluZy5wcm90b3R5cGUpO1xuXG4gICAgICAgIC8vIFRoZSBhc2NpaSBjb2RlIG9mIHRoZSBjaGFyYWN0ZXIgYXQgdGhlIG50aCBwb3NpdGlvbiBpbiBhIFN0cmluZzpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIGNoYXJDb2RlQXQoOCwgXCJhYmNkZWZnaGlqa2xtXCIpOyAvLz0+IDEwNVxuICAgICAgICAvLyAgICAgLy8gKC4uLiAnYScgfiA5NywgJ2InIH4gOTgsIC4uLiAnaScgfiAxMDUpXG4gICAgICAgIFIuY2hhckNvZGVBdCA9IGludm9rZXIoXCJjaGFyQ29kZUF0XCIsIFN0cmluZy5wcm90b3R5cGUpO1xuXG4gICAgICAgIC8vIFRlc3RzIGEgcmVndWxhciBleHByZXNzaW9uIGFnYWlucyBhIFN0cmluZ1xuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgbWF0Y2goLyhbYS16XWEpL2csIFwiYmFuYW5hc1wiKTsgLy89PiBbXCJiYVwiLCBcIm5hXCIsIFwibmFcIl1cbiAgICAgICAgUi5tYXRjaCA9IGludm9rZXIoXCJtYXRjaFwiLCBTdHJpbmcucHJvdG90eXBlKTtcblxuICAgICAgICAvLyBGaW5kcyB0aGUgaW5kZXggb2YgYSBzdWJzdHJpbmcgaW4gYSBzdHJpbmcsIHJldHVybmluZyAtMSBpZiBpdCdzIG5vdCBwcmVzZW50XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICBzdHJJbmRleE9mKCdjJywgJ2FiY2RlZmcpIC8vPT4gMlxuICAgICAgICBSLnN0ckluZGV4T2YgPSBpbnZva2VyKFwiaW5kZXhPZlwiLCBTdHJpbmcucHJvdG90eXBlKTtcblxuICAgICAgICAvLyBGaW5kcyB0aGUgbGFzdCBpbmRleCBvZiBhIHN1YnN0cmluZyBpbiBhIHN0cmluZywgcmV0dXJuaW5nIC0xIGlmIGl0J3Mgbm90IHByZXNlbnRcbiAgICAgICAgLy9cbiAgICAgICAgLy8gICAgIHN0ckluZGV4T2YoJ2EnLCAnYmFuYW5hIHNwbGl0JykgLy89PiAyXG4gICAgICAgIFIuc3RyTGFzdEluZGV4T2YgPSBpbnZva2VyKFwibGFzdEluZGV4T2ZcIiwgU3RyaW5nLnByb3RvdHlwZSk7XG5cbiAgICAgICAgLy8gVGhlIHVwcGVyY2FzZSB2ZXJzaW9uIG9mIGEgc3RyaW5nLlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdG9VcHBlckNhc2UoJ2FiYycpIC8vPT4gJ0FCQydcbiAgICAgICAgUi50b1VwcGVyQ2FzZSA9IGludm9rZXIoXCJ0b1VwcGVyQ2FzZVwiLCBTdHJpbmcucHJvdG90eXBlKTtcblxuICAgICAgICAvLyBUaGUgbG93ZXJjYXNlIHZlcnNpb24gb2YgYSBzdHJpbmcuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB0b0xvd2VyQ2FzZSgnWFlaJykgLy89PiAneHl6J1xuICAgICAgICBSLnRvTG93ZXJDYXNlID0gaW52b2tlcihcInRvTG93ZXJDYXNlXCIsIFN0cmluZy5wcm90b3R5cGUpO1xuXG5cbiAgICAgICAgLy8gVGhlIHN0cmluZyBzcGxpdCBpbnRvIHN1YnN0cmluZyBhdCB0aGUgc3BlY2lmaWVkIHRva2VuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICBzcGxpdCgnLicsICdhLmIuYy54eXouZCcpIC8vPT5cbiAgICAgICAgLy8gICAgICAgICBbJ2EnLCAnYicsICdjJywgJ3h5eicsICdkJ11cbiAgICAgICAgUi5zcGxpdCA9IGludm9rZXIoXCJzcGxpdFwiLCBTdHJpbmcucHJvdG90eXBlLCAxKTtcblxuXG4gICAgICAgIC8vIERhdGEgQW5hbHlzaXMgYW5kIEdyb3VwaW5nIEZ1bmN0aW9uc1xuICAgICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgLy9cbiAgICAgICAgLy8gRnVuY3Rpb25zIHBlcmZvcm1pbmcgU1FMLWxpa2UgYWN0aW9ucyBvbiBsaXN0cyBvZiBvYmplY3RzLiAgVGhlc2UgZG8gbm90IGhhdmUgYW55IFNRTC1saWtlIG9wdGltaXphdGlvbnNcbiAgICAgICAgLy8gcGVyZm9ybWVkIG9uIHRoZW0sIGhvd2V2ZXIuXG5cbiAgICAgICAgLy8gLS0tLS0tLS1cblxuICAgICAgICAvLyBSZWFzb25hYmxlIGFuYWxvZyB0byBTUUwgYHNlbGVjdGAgc3RhdGVtZW50LlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgdmFyIGtpZHMgPSBbXG4gICAgICAgIC8vICAgICAgICAge25hbWU6ICdBYmJ5JywgYWdlOiA3LCBoYWlyOiAnYmxvbmQnLCBncmFkZTogMn0sXG4gICAgICAgIC8vICAgICAgICAge25hbWU6ICdGcmVkJywgYWdlOiAxMiwgaGFpcjogJ2Jyb3duJywgZ3JhZGU6IDd9XG4gICAgICAgIC8vICAgICBdO1xuICAgICAgICAvLyAgICAgcHJvamVjdChbJ25hbWUnLCAnZ3JhZGUnXSwga2lkcyk7XG4gICAgICAgIC8vICAgICAvLz0+IFt7bmFtZTogJ0FiYnknLCBncmFkZTogMn0sIHtuYW1lOiAnRnJlZCcsIGdyYWRlOiA3fV1cbiAgICAgICAgUi5wcm9qZWN0ID0gdXNlV2l0aChtYXAsIHBpY2tBbGwsIGlkZW50aXR5KTsgLy8gcGFzc2luZyBgaWRlbnRpdHlgIGdpdmVzIGNvcnJlY3QgYXJpdHlcblxuICAgICAgICAvLyBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIGdpdmVuIHByb3BlcnR5IG9mIGFuIG9iamVjdCBoYXMgYSBzcGVjaWZpYyB2YWx1ZVxuICAgICAgICAvLyBNb3N0IGxpa2VseSB1c2VkIHRvIGZpbHRlciBhIGxpc3Q6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICB2YXIga2lkcyA9IFtcbiAgICAgICAgLy8gICAgICAge25hbWU6ICdBYmJ5JywgYWdlOiA3LCBoYWlyOiAnYmxvbmQnfSxcbiAgICAgICAgLy8gICAgICAge25hbWU6ICdGcmVkJywgYWdlOiAxMiwgaGFpcjogJ2Jyb3duJ30sXG4gICAgICAgIC8vICAgICAgIHtuYW1lOiAnUnVzdHknLCBhZ2U6IDEwLCBoYWlyOiAnYnJvd24nfSxcbiAgICAgICAgLy8gICAgICAge25hbWU6ICdBbG9pcycsIGFnZTogMTUsIGRpc3Bvc2l0aW9uOiAnc3VybHknfVxuICAgICAgICAvLyAgICAgXTtcbiAgICAgICAgLy8gICAgIGZpbHRlcihwcm9wRXEoXCJoYWlyXCIsIFwiYnJvd25cIiksIGtpZHMpO1xuICAgICAgICAvLyAgICAgLy89PiBGcmVkIGFuZCBSdXN0eVxuICAgICAgICBSLnByb3BFcSA9IF8oZnVuY3Rpb24obmFtZSwgdmFsLCBvYmopIHtcbiAgICAgICAgICAgIHJldHVybiBvYmpbbmFtZV0gPT09IHZhbDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29tYmluZXMgdHdvIGxpc3RzIGludG8gYSBzZXQgKGkuZS4gbm8gZHVwbGljYXRlcykgY29tcG9zZWQgb2YgdGhlIGVsZW1lbnRzIG9mIGVhY2ggbGlzdC5cbiAgICAgICAgUi51bmlvbiA9IGNvbXBvc2UodW5pcSwgbWVyZ2UpO1xuXG4gICAgICAgIC8vIENvbWJpbmVzIHR3byBsaXN0cyBpbnRvIGEgc2V0IChpLmUuIG5vIGR1cGxpY2F0ZXMpIGNvbXBvc2VkIG9mIHRoZSBlbGVtZW50cyBvZiBlYWNoIGxpc3QuICBEdXBsaWNhdGlvbiBpc1xuICAgICAgICAvLyBkZXRlcm1pbmVkIGFjY29yZGluZyB0byB0aGUgdmFsdWUgcmV0dXJuZWQgYnkgYXBwbHlpbmcgdGhlIHN1cHBsaWVkIHByZWRpY2F0ZSB0byB0d28gbGlzdCBlbGVtZW50cy5cbiAgICAgICAgUi51bmlvbldpdGggPSBmdW5jdGlvbihwcmVkLCBsaXN0MSwgbGlzdDIpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmlxV2l0aChwcmVkLCBtZXJnZShsaXN0MSwgbGlzdDIpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBGaW5kcyB0aGUgc2V0IChpLmUuIG5vIGR1cGxpY2F0ZXMpIG9mIGFsbCBlbGVtZW50cyBpbiB0aGUgZmlyc3QgbGlzdCBub3QgY29udGFpbmVkIGluIHRoZSBzZWNvbmQgbGlzdC5cbiAgICAgICAgUi5kaWZmZXJlbmNlID0gZnVuY3Rpb24oZmlyc3QsIHNlY29uZCkge3JldHVybiB1bmlxKHJlamVjdChmbGlwKGNvbnRhaW5zKShzZWNvbmQpKShmaXJzdCkpO307XG5cbiAgICAgICAgLy8gRmluZHMgdGhlIHNldCAoaS5lLiBubyBkdXBsaWNhdGVzKSBvZiBhbGwgZWxlbWVudHMgaW4gdGhlIGZpcnN0IGxpc3Qgbm90IGNvbnRhaW5lZCBpbiB0aGUgc2Vjb25kIGxpc3QuXG4gICAgICAgIC8vIER1cGxpY2F0aW9uIGlzIGRldGVybWluZWQgYWNjb3JkaW5nIHRvIHRoZSB2YWx1ZSByZXR1cm5lZCBieSBhcHBseWluZyB0aGUgc3VwcGxpZWQgcHJlZGljYXRlIHRvIHR3byBsaXN0XG4gICAgICAgIC8vIGVsZW1lbnRzLlxuICAgICAgICBSLmRpZmZlcmVuY2VXaXRoID0gZnVuY3Rpb24ocHJlZCwgZmlyc3QsIHNlY29uZCkge1xuICAgICAgICAgICAgcmV0dXJuIHVuaXFXaXRoKHByZWQpKHJlamVjdChmbGlwKGNvbnRhaW5zV2l0aChwcmVkKSkoc2Vjb25kKSwgZmlyc3QpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDb21iaW5lcyB0d28gbGlzdHMgaW50byBhIHNldCAoaS5lLiBubyBkdXBsaWNhdGVzKSBjb21wb3NlZCBvZiB0aG9zZSBlbGVtZW50cyBjb21tb24gdG8gYm90aCBsaXN0cy5cbiAgICAgICAgUi5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbihsaXN0MSwgbGlzdDIpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmlxKGZpbHRlcihmbGlwKGNvbnRhaW5zKShsaXN0MSksIGxpc3QyKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQ29tYmluZXMgdHdvIGxpc3RzIGludG8gYSBzZXQgKGkuZS4gbm8gZHVwbGljYXRlcykgY29tcG9zZWQgb2YgdGhvc2UgZWxlbWVudHMgY29tbW9uIHRvIGJvdGggbGlzdHMuXG4gICAgICAgIC8vIER1cGxpY2F0aW9uIGlzIGRldGVybWluZWQgYWNjb3JkaW5nIHRvIHRoZSB2YWx1ZSByZXR1cm5lZCBieSBhcHBseWluZyB0aGUgc3VwcGxpZWQgcHJlZGljYXRlIHRvIHR3byBsaXN0XG4gICAgICAgIC8vIGVsZW1lbnRzLlxuICAgICAgICBSLmludGVyc2VjdGlvbldpdGggPSBmdW5jdGlvbihwcmVkLCBsaXN0MSwgbGlzdDIpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRzID0gW10sIGlkeCA9IC0xO1xuICAgICAgICAgICAgd2hpbGUgKCsraWR4IDwgbGlzdDEubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRhaW5zV2l0aChwcmVkLCBsaXN0MVtpZHhdLCBsaXN0MikpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1tyZXN1bHRzLmxlbmd0aF0gPSBsaXN0MVtpZHhdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB1bmlxV2l0aChwcmVkLCByZXN1bHRzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDcmVhdGVzIGEgbmV3IGxpc3Qgd2hvc2UgZWxlbWVudHMgZWFjaCBoYXZlIHR3byBwcm9wZXJ0aWVzOiBgdmFsYCBpcyB0aGUgdmFsdWUgb2YgdGhlIGNvcnJlc3BvbmRpbmdcbiAgICAgICAgLy8gaXRlbSBpbiB0aGUgbGlzdCBzdXBwbGllZCwgYW5kIGBrZXlgIGlzIHRoZSByZXN1bHQgb2YgYXBwbHlpbmcgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uIHRvIHRoYXQgaXRlbS5cbiAgICAgICAgdmFyIGtleVZhbHVlID0gXyhmdW5jdGlvbihmbiwgbGlzdCkgeyAvLyBUT0RPOiBTaG91bGQgdGhpcyBiZSBtYWRlIHB1YmxpYz9cbiAgICAgICAgICAgIHJldHVybiBtYXAoZnVuY3Rpb24oaXRlbSkge3JldHVybiB7a2V5OiBmbihpdGVtKSwgdmFsOiBpdGVtfTt9LCBsaXN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU29ydHMgdGhlIGxpc3QgYWNjb3JkaW5nIHRvIGEga2V5IGdlbmVyYXRlZCBieSB0aGUgc3VwcGxpZWQgZnVuY3Rpb24uXG4gICAgICAgIFIuc29ydEJ5ID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgcmV0dXJuIHNvcnQoY29tcGFyYXRvcihmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGZuKGEpIDwgZm4oYik7fSksIGxpc3QpOyAvLyBjbGVhbiwgYnV0IHRvbyB0aW1lLWluZWZmaWNpZW50XG4gICAgICAgICAgICAgIHJldHVybiBwbHVjayhcInZhbFwiLCBzb3J0KGNvbXBhcmF0b3IoZnVuY3Rpb24oYSwgYikge3JldHVybiBhLmtleSA8IGIua2V5O30pLCBrZXlWYWx1ZShmbiwgbGlzdCkpKTsgLy8gbmljZSwgYnV0IG5vIG5lZWQgdG8gY2xvbmUgcmVzdWx0IG9mIGtleVZhbHVlIGNhbGwsIHNvLi4uXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmV0dXJuIHBsdWNrKFwidmFsXCIsIGtleVZhbHVlKGZuLCBsaXN0KS5zb3J0KGNvbXBhcmF0b3IoZnVuY3Rpb24oYSwgYikge3JldHVybiBhLmtleSA8IGIua2V5O30pKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvdW50cyB0aGUgZWxlbWVudHMgb2YgYSBsaXN0IGFjY29yZGluZyB0byBob3cgbWFueSBtYXRjaCBlYWNoIHZhbHVlIG9mIGEga2V5IGdlbmVyYXRlZCBieSB0aGUgc3VwcGxpZWQgZnVuY3Rpb24uXG4gICAgICAgIFIuY291bnRCeSA9IF8oZnVuY3Rpb24oZm4sIGxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBmb2xkbChmdW5jdGlvbihjb3VudHMsIG9iaikge1xuICAgICAgICAgICAgICAgIGNvdW50c1tvYmoua2V5XSA9IChjb3VudHNbb2JqLmtleV0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgICAgIHJldHVybiBjb3VudHM7XG4gICAgICAgICAgICB9LCB7fSwga2V5VmFsdWUoZm4sIGxpc3QpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gR3JvdXBzIHRoZSBlbGVtZW50cyBvZiBhIGxpc3QgYnkgYSBrZXkgZ2VuZXJhdGVkIGJ5IHRoZSBzdXBwbGllZCBmdW5jdGlvbi5cbiAgICAgICAgUi5ncm91cEJ5ID0gXyhmdW5jdGlvbihmbiwgbGlzdCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvbGRsKGZ1bmN0aW9uKGdyb3Vwcywgb2JqKSB7XG4gICAgICAgICAgICAgICAgKGdyb3Vwc1tvYmoua2V5XSB8fCAoZ3JvdXBzW29iai5rZXldID0gW10pKS5wdXNoKG9iai52YWwpO1xuICAgICAgICAgICAgICAgIHJldHVybiBncm91cHM7XG4gICAgICAgICAgICB9LCB7fSwga2V5VmFsdWUoZm4sIGxpc3QpKTtcbiAgICAgICAgfSk7XG5cblxuXG4gICAgICAgIC8vIEFsbCB0aGUgZnVuY3Rpb25hbCBnb29kbmVzcywgd3JhcHBlZCBpbiBhIG5pY2UgbGl0dGxlIHBhY2thZ2UsIGp1c3QgZm9yIHlvdSFcbiAgICAgICAgcmV0dXJuIFI7XG4gICAgfSgpKTtcbn0pKTtcbiIsInZhciBSID0gcmVxdWlyZSgncmFtZGEnKTtcbnZhciBFTVBUWSA9IDA7XG5cbmZ1bmN0aW9uIEdyaWQobSkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgR3JpZCkpIHtcbiAgICByZXR1cm4gbmV3IEdyaWQobSk7XG4gIH1cbiAgdGhpcy5tYXRyaXggPSBtO1xufTtcblxuR3JpZC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBHcmlkLFxuXG4gIGZpbmRFbXB0eUNlbGw6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjZWxsID0ge307XG4gICAgY2VsbC55ID0gUi5maW5kSW5kZXgoZnVuY3Rpb24ocikgeyByZXR1cm4gUi5jb250YWlucyhFTVBUWSwgcik7IH0sIHRoaXMubWF0cml4KTtcbiAgICBpZiAoY2VsbC55ICE9PSBmYWxzZSkge1xuICAgICAgY2VsbC54ID0gUi5maW5kSW5kZXgoZnVuY3Rpb24oYykgeyByZXR1cm4gYyA9PT0gRU1QVFk7IH0sIHRoaXMubWF0cml4W2NlbGwueV0pO1xuICAgIH1cbiAgICByZXR1cm4gKGNlbGwueSAhPT0gZmFsc2UgJiYgY2VsbC54ICE9PSBmYWxzZSkgPyBjZWxsIDogZmFsc2U7XG4gIH0sXG5cbiAgY29uc3RyYWluOiBmdW5jdGlvbihjZWxsKSB7XG4gICAgdmFyIHJvd1dpc2UgPSBSLmRpZmZlcmVuY2UoUi5yYW5nZSgxLDEwKSwgdGhpcy5tYXRyaXhbY2VsbC55XSk7XG4gICAgdmFyIGNvbFdpc2UgPSBSLmRpZmZlcmVuY2Uocm93V2lzZSwgdGhpcy5jb2xUb0FycmF5KGNlbGwueCkpO1xuICAgIHJldHVybiBSLmRpZmZlcmVuY2UoY29sV2lzZSwgdGhpcy5ib3hUb0FycmF5KGNlbGwpKTtcbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uKGNlbGwsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXRyaXhbY2VsbC55XVtjZWxsLnhdID0gdmFsdWU7XG4gIH0sXG5cbiAgY29sVG9BcnJheTogZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiBSLnBsdWNrKHgsIHRoaXMubWF0cml4KTtcbiAgfSxcblxuICBnZXRCb3g6IGZ1bmN0aW9uKGNlbGwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgeDogTWF0aC5mbG9vcihjZWxsLngvMykgKiAzLFxuICAgICAgeTogTWF0aC5mbG9vcihjZWxsLnkvMykgKiAzXG4gICAgfTtcbiAgfSxcblxuICBib3hUb0FycmF5OiBmdW5jdGlvbihjZWxsKSB7XG4gICAgdmFyIGJveCA9IHRoaXMuZ2V0Qm94KGNlbGwpOyBcbiAgICByZXR1cm4gUi5yZWR1Y2UoZnVuY3Rpb24oYWNjLCByb3cpIHsgIFxuICAgICAgcmV0dXJuIGFjYy5jb25jYXQoUi5tYXAoUi5JLCByb3cuc2xpY2UoYm94LngsIGJveC54ICsgMykpKTtcbiAgICB9LCBbXSwgdGhpcy5tYXRyaXguc2xpY2UoYm94LnksIGJveC55ICsgMykpO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR3JpZDtcblxuXG4iLCJ2YXIgUiA9IHJlcXVpcmUoJ3JhbWRhJyk7XG52YXIgR3JpZCA9IHJlcXVpcmUoJy4vR3JpZC5qcycpO1xuXG52YXIgZ3JpZCA9IG5ldyBHcmlkKFtcbiAgWzUsIDAsIDAsICAgMSwgMCwgMCwgICA5LCAzLCAwXSxcbiAgWzYsIDQsIDAsICAgMCwgNywgMywgICAwLCA4LCAwXSxcbiAgWzAsIDAsIDEsICAgOCwgMCwgNSwgICAwLCAwLCAwXSxcblxuICBbOCwgMCwgMCwgICAzLCA0LCAwLCAgIDAsIDEsIDBdLFxuICBbMCwgMCwgMCwgICA1LCAyLCAxLCAgIDAsIDAsIDBdLFxuICBbMCwgMiwgMCwgICAwLCA4LCA5LCAgIDAsIDAsIDZdLFxuXG4gIFswLCAwLCAwLCAgIDYsIDAsIDcsICAgOCwgMCwgMF0sXG4gIFswLCA4LCAwLCAgIDksIDMsIDAsICAgMCwgNywgMV0sXG4gIFswLCAxLCAzLCAgIDAsIDAsIDgsICAgMCwgMCwgOV1cbl0pO1xuXG5cbmZ1bmN0aW9uIHJlbmRlcihnKSB7XG4gIGNvbnNvbGUubG9nKFwic29sdmVkXCIpO1xuICBnLm1hdHJpeC5mb3JFYWNoKGZ1bmN0aW9uKHIpIHtcbiAgICBjb25zb2xlLmxvZyhyKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGxvYWQoZykge1xuICBncmlkID0gZyB8fCBncmlkO1xuICByZW5kZXIoZ3JpZCk7XG59XG5cbmZ1bmN0aW9uIHNvbHZlKGcpIHtcbiAgaWYgKCFnKSB7XG4gICAgZyA9IGdyaWQ7XG4gICAgbG9hZChnKTtcbiAgfVxuXG4gIHZhciBjZWxsID0gZy5maW5kRW1wdHlDZWxsKCk7XG4gIHZhciBpID0gMDtcbiAgXG4gIGlmICghY2VsbCkge1xuICAgIHJlbmRlcihnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHZhciBkb21haW4gPSBnLmNvbnN0cmFpbihjZWxsKTtcblxuICB3aGlsZSAoaSA8IGRvbWFpbi5sZW5ndGgpIHtcbiAgICBnLnVwZGF0ZShjZWxsLCBkb21haW5baV0pOyBcblxuICAgIGlmIChzb2x2ZShnKSkgeyAgICAgICAgICAgICAgIFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gbWFyayBjZWxsIGFzIGVtcHR5IGFuZCBiYWNrdHJhY2sgICAgXG4gICAgZy51cGRhdGUoY2VsbCwgMCk7XG4gICAgaSArPSAxO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGxvYWQ6IGxvYWQsXG4gIHNldFJlbmRlcmVyOiBmdW5jdGlvbihmbikgeyBcbiAgICByZW5kZXIgPSBmbjsgXG4gIH0sXG4gIHNvbHZlOiBzb2x2ZVxufTsgICBcblxuXG4gXG4iXX0=
(3)
});
