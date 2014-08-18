define(['objects', 'res', 'gfx', 'input'], function(objects, res, gfx, input) {

    var GameObject = objects.GameObject;

    var UiObject = function() {
        GameObject.call(this);
        this._relativeX = 0;
        this._relativeY = 0;
    };
        UiObject.prototype = Object.create(GameObject.prototype);
        UiObject.prototype.constructor = UiObject;

        UiObject.prototype.init = function(state) {
            GameObject.prototype.init.call(this, state);
            this.updateUiExclusionArea();
        };

        UiObject.prototype.destroy = function(state) {
            GameObject.prototype.destroy.call(this, state);
            input.mouse.removeUiExclusionArea(this.excludeRect);
        };

        UiObject.prototype.update = function(delta) {
            GameObject.prototype.update.call(this, delta);

            if (this.disabled) return;

            // Disable exclusion areas while ui uses input methods. Enable at the end of update.
            input.mouse.disableUi = false;

            this.inputUpdate(delta);

            input.mouse.disableUi = true;
        };

        // Called during update when exclusion areas are disabled. This is where input handling should go.
        UiObject.prototype.inputUpdate = function(delta) {};

        // Sets positions relative to parent
        UiObject.prototype.setUiPos = function(x, y) {
            var parentX = 0, parentY = 0;
            if (this.parent) {
                var parentPos = this.parent.getScreenPos();
                parentX = parentPos.x;
                parentY = parentPos.y;
            }

            this.x = parentX + x;
            this.y = parentY + y;
            this._relativeX = x;
            this._relativeY = y;

            for (var i=0; i<this.children.length; ++i) {
                this.children[i].updateUiPos();
            }

            this.updateUiExclusionArea();
        };

        // Gets position relative to parent.
        UiObject.prototype.getRelativePos = function() {
            return {
                x: this._relativeX,
                y: this._relativeY,
            };
        };

        // Gets the position this object should appear on screen. (parent pos + relative pos)
        UiObject.prototype.getScreenPos = function() {
            var parentX = 0, parentY = 0;
            if (this.parent) {
                var parentPos = this.parent.getScreenPos();
                parentX = parentPos.x;
                parentY = parentPos.y;
            }

            return {
                x: parentX + this._relativeX,
                y: parentY + this._relativeY,
            };
        };

        // Updates screen position (x, y). Used when a parent's position has changed.
        UiObject.prototype.updateUiPos = function() {
            this.setUiPos(this._relativeX, this._relativeY);
        };

        UiObject.prototype.addChild = function(object) {
            objects.BasicObject.prototype.addChild.call(this, object);
            object.updateUiPos();
        };

        // Removes current exclusion rectangle then adds a new one with the current x,y and width, height.
        UiObject.prototype.updateUiExclusionArea = function(object) {
            if (this.excludeRect) {
                input.mouse.removeUiExclusionArea(this.excludeRect);
            }
            this.excludeRect = input.mouse.addUiExclusionArea(this.x, this.y, this.width, this.height);
        };

    var BasicButton = function(x, y, w, h) {
        GameObject.call(this);
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.status = 'up';
    };
        BasicButton.prototype = Object.create(GameObject.prototype);
        BasicButton.prototype.constructor = BasicButton;

        BasicButton.prototype.init = function(state) {
            GameObject.prototype.init.call(this, state);
            this.excludeRect = input.mouse.addUiExclusionArea(this.x, this.y, this.width, this.height);
        };

        BasicButton.prototype.destroy = function(state) {
            GameObject.prototype.destroy.call(this, state);
            input.mouse.removeUiExclusionArea(this.excludeRect);
        };

        BasicButton.prototype.update = function(delta) {
            GameObject.prototype.update.call(this, delta);

            if (this.disabled) return;

            // Disable exclusion areas while ui uses input methods. Enable at the end of update.
            input.mouse.disableUi = false;

            var isHovering = input.mouse.isColliding(this.x, this.y, this.x+this.width, this.y+this.height);

            if (isHovering) {
                if (input.mouse.isPressed(input.MOUSE_LEFT)) {
                    this.status = 'down';
                }

                if (this.status === 'upactive') {
                    this.status = 'down';
                }

                if (this.status !== 'down') {
                    this.status = 'hover';
                }
            } else {
                if (this.status === 'down' || this.status === 'upactive') {
                    this.status = 'upactive';
                } else {
                    this.status = 'up';
                }
            }

            if (input.mouse.isReleased(input.MOUSE_LEFT)) {
                if (this.status === 'down') {
                    if (this.onRelease) {
                        this.onRelease();
                    }
                }
                this.status = isHovering ? 'hover' : 'up';
            }

            input.mouse.disableUi = true;
        };

        BasicButton.prototype.enable = function() {
            this.disabled = false;
        };

        BasicButton.prototype.disable = function() {
            this.disabled = true;
        };

    var Button = function(text, style, onRelease, context) {
        BasicButton.call(this, 0, 0, 0, 0);

        this.onRelease = context ? _.bind(onRelease, context) : onRelease;

        // Text
        this.text = text;
        this.textIndent = 5; // How much the text should indent when clicked.
        this.padding = 5;

        this.displayText = new gfx.pixi.Text(this.text, _.defaults(style, {
            stroke: 'black',
            strokeThickness: 3,
            fill: 'white',
            align: 'center',
            font: 'bold 16px arial',
        }));
        this.displayText.depth = gfx.layers.gui;

        // Dimensions
        this.width = this.displayText.width + this.padding;
        this.height = this.displayText.height + this.padding;

        // Nineslices
        this.up = new gfx.NineSlice(res.slices.buttonUp);
        this.up.width = this.width;
        this.up.height = this.height;
        this.up.update();
        this.up.depth = gfx.layers.gui + 1;

        this.down = new gfx.NineSlice(res.slices.buttonDown);
        this.down.width = this.width;
        this.down.height = this.height;
        this.down.update();
        this.down.depth = this.up.depth;
        this.down.visible = false;

        this.disabledSlice = new gfx.NineSlice(res.slices.buttonDisabled);
        this.disabledSlice.width = this.width;
        this.disabledSlice.height = this.height;
        this.disabledSlice.update();
        this.disabledSlice.depth = this.up.depth;
        this.disabledSlice.visible = false;
    };
        Button.prototype = Object.create(BasicButton.prototype);
        Button.prototype.constructor = Button;

        Button.prototype.init = function(state) {
            BasicButton.prototype.init.call(this, state);

            this.addDisplay(this.displayText);
            this.addDisplay(this.up);
            this.addDisplay(this.down);
            this.addDisplay(this.disabledSlice);

            this.current = this.up;

            this.updateDisplayProperties([this.up, this.down, this.disabledSlice]);
            this.syncDisplayProperties = false;
        };

        Button.prototype.update = function(delta) {
            BasicButton.prototype.update.call(this, delta);

            this.displayText.x = this.x + this.padding/2;
            this.displayText.y = this.y + this.padding/2;

            if (this.disabled) {
                if (this.current !== this.disabledSlice) {
                    this.setCurrent(this.disabledSlice);
                }
                return;
            }

            switch (this.status) {
                case 'up':
                case 'upactive':
                case 'hover': {
                    if (this.current !== this.up) {
                        this.setCurrent(this.up);
                    }
                    break;
                }
                case 'down': {
                    if (this.current !== this.down) {
                        this.setCurrent(this.down);
                    }
                    break;
                }
            }
        };

        Button.prototype.setCurrent = function(obj) {
            this.current.visible = false;
            obj.visible = true;
            this.current = obj;
        };

        Button.prototype.setPos = function(x, y) {
            this.x = x;
            this.y = y;
        };

    // w, h optional. If w is specified then word wrap will be enabled to that length.
    var TextField = function(text, x, y, w, h) {
        GameObject.call(this);
        this._text = text;
        this.x = x;
        this.y = y;

        this.width = w;
        this.height = h;

        this.padding = 5;

        var wordWrapWidth = w;
        this.textStyle = {
            stroke: 'black',
            strokeThickness: 3,
            fill: 'white',
            align: 'left',
            font: 'bold 18px arial',
            wordWrap: (wordWrapWidth !== undefined),
            wordWrapWidth: wordWrapWidth,
        };

        this.displayText = new gfx.pixi.Text(text, this.textStyle);

        Object.defineProperty(this, 'text', {
            get: function() { return this._text; },
            set: function(val) {
                this._text = val;
                this.displayText.setText(val);
            },
        });
    };
        TextField.prototype = Object.create(GameObject.prototype);
        TextField.prototype.constructor = TextField;

        TextField.prototype.init = function(state) {
            GameObject.prototype.init.call(this, state);

            this.displayText.depth = -10;
            this.displayText.x = this.x + this.padding/2;
            this.displayText.y = this.y + this.padding/2;

            this.width = (this.width || this.displayText.width) + this.padding;
            this.height = (this.height || this.displayText.height) + this.padding;

            this.back = new gfx.NineSlice(res.slices.textBox);
            this.back.width = this.width;
            this.back.height = this.height;
            this.back.update();
            this.back.depth = -9;

            this.addDisplay(this.back);
            this.addDisplay(this.displayText);

            this.updateDisplayProperties([this.back]);
            this.syncDisplayProperties = false;
        };

    var FloatText = function(text, textOptions) {
        GameObject.call(this);
        this.displayText = new gfx.pixi.Text(text, _.defaults(textOptions || {}, {
            stroke: 'black',
            strokeThickness: 3,
            fill: 'white',
            align: 'left',
            font: 'bold 18px arial',
        }));
        this.displayText.depth = gfx.layers.gui;
    };
        FloatText.prototype = Object.create(GameObject.prototype);
        FloatText.prototype.constructor = FloatText;

        FloatText.prototype.init = function(state) {
            GameObject.prototype.init.call(this, state);

            this.addDisplay(this.displayText);

            var timer = new objects.Timer(1000, 'oneshot', _.bind(function() {
                this.state.remove(this);
            }, this));
            timer.onTick = _.bind(function(ratio) {
                this.y -= 0.1;
                this.displayText.alpha = Math.sqrt(1-ratio) * 1.5;
            }, this);
            this.state.add(timer);
        };

    var StatusBar = function StatusBar(back, front, width, height) {
        GameObject.call(this);
        this.backSliceTextures = back;
        this.frontSliceTextures = front;
        this.width = width;
        this.height = height;

        Object.defineProperty(this, 'depth', {
            get: function() { return this._depth },
            set: function(val) {
                this._depth = val;
                this.updateDepth = true;
            },
        });
    };
        StatusBar.prototype = Object.create(GameObject.prototype);
        StatusBar.prototype.constructor = StatusBar;

        StatusBar.prototype.init = function(state) {
            GameObject.prototype.init.call(this, state);
            this.backSlice = new gfx.NineSlice(this.backSliceTextures);
            this.frontSlice = new gfx.NineSlice(this.frontSliceTextures);

            this.backSlice.depth = this.depth+1;
            this.frontSlice.depth = this.depth;

            this.backSlice.width = this.width;
            this.backSlice.height = this.height;

            this.frontSlice.width = this.width;
            this.frontSlice.height = this.height;

            this.addDisplay(this.backSlice);
            this.addDisplay(this.frontSlice);

            this.frontSlice.update();
            this.backSlice.update();
        };

        StatusBar.prototype.setRatio = function(ratio) {
            this.ratio = ratio;
            this.updateRatio = true;
        };

        StatusBar.prototype.update = function(delta) {
            GameObject.prototype.update.call(this, delta);

            if (this.updateDepth) {
                this.backSlice.depth = this.depth+1;
                this.frontSlice.depth = this.depth;
                this.updateDepth = false;
            }

            if (this.updateRatio) {
                this.frontSlice.width = this.ratio * this.width;

                this.frontSlice.update();
                this.backSlice.update();

                if (this.ratio <= 0.05) { // A slight offset, when the ratio is too small it gets ugly.
                    this.frontSlice.visible = false;
                } else if (!this.frontSlice.visible) {
                    this.frontSlice.visible = true;
                }
                this.updateRatio = false;
            }
        };

    return {
        UiObject: UiObject,
        Button: Button,
        TextField: TextField,
        FloatText: FloatText,
        StatusBar: StatusBar
    };
});
